'use strict';

const { cmd } = require('../command');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

let ffmpegPath = 'ffmpeg';
try {
    const staticPath = require('ffmpeg-static');
    if (staticPath) ffmpegPath = staticPath;
} catch (_) {
    ffmpegPath = 'ffmpeg';
}

let sharp = null;
try {
    sharp = require('sharp');
} catch (_) {
    sharp = null;
}

let webp = null;
try {
    webp = require('node-webpmux');
} catch (_) {
    webp = null;
}

const { prepareWAMessageMedia, proto } = require('@whiskeysockets/baileys');

const MAX_STICKER_BYTES = 900 * 1024;
const MENU_TIMEOUT_MS = 60 * 1000;

const audioStickerPatchKey = Symbol.for('xymbot.audioStickerProtoPatch');
const audioStickerMessagePatchKey = Symbol.for('xymbot.audioStickerMessageProtoPatch');

const stickerProfiles = [
    { duration: 5, fps: 15, quality: 60 },
    { duration: 4, fps: 10, quality: 35 },
    { duration: 3, fps: 8, quality: 20 },
    { duration: 2, fps: 6, quality: 15 }
];

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'avif', 'heic']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', '3gp', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac', 'flac', 'wma', 'amr']);

// Track active number menus per chat+user so new commands cleanly replace old pending menus
const activeStickerMenus = new Map();

// ============================================================================
// WAProto Patch for Native WhatsApp Sound Stickers (Field 26 & Field 134)
// ============================================================================

function encodeVarint(value) {
    const bytes = [];
    while (value > 0x7f) {
        bytes.push((value & 0x7f) | 0x80);
        value = Math.floor(value / 128);
    }
    bytes.push(value);
    return Buffer.from(bytes);
}

function encodeBytesField(fieldNumber, value) {
    return Buffer.concat([
        encodeVarint((fieldNumber << 3) | 2),
        encodeVarint(value.length),
        value
    ]);
}

if (proto?.Message?.StickerMessage && !proto.Message.StickerMessage[audioStickerPatchKey]) {
    const originalStickerEncode = proto.Message.StickerMessage.encode;
    const originalStickerFromObject = proto.Message.StickerMessage.fromObject;

    proto.Message.StickerMessage.encode = function (sticker, writer) {
        const outputWriter = originalStickerEncode.call(this, sticker, writer);
        if (sticker?.audioMessage) {
            proto.Message.AudioMessage.encode(
                sticker.audioMessage,
                outputWriter.uint32((26 << 3) | 2).fork()
            ).ldelim();
        }
        return outputWriter;
    };

    proto.Message.StickerMessage.fromObject = function (object) {
        const sticker = originalStickerFromObject.call(this, object);
        if (object?.audioMessage) {
            sticker.audioMessage = proto.Message.AudioMessage.fromObject(object.audioMessage);
        }
        return sticker;
    };

    Object.defineProperty(proto.Message.StickerMessage, audioStickerPatchKey, {
        value: true,
        configurable: true
    });
}

if (proto?.Message && !proto.Message[audioStickerMessagePatchKey]) {
    const originalMessageEncode = proto.Message.encode;

    proto.Message.encode = function (message, writer) {
        const sticker = message?.stickerMessage;
        if (!sticker?.audioMessage) {
            return originalMessageEncode.call(this, message, writer);
        }

        const encodedSticker = proto.Message.StickerMessage.encode(sticker).finish();
        const futureProofMessage = encodeBytesField(
            1,
            encodeBytesField(26, encodedSticker)
        );
        const outputWriter = writer || originalMessageEncode.call(this, {}, undefined);

        // Keep stickerMessage visible to Baileys relayMessage so it sets mediatype="sticker"
        outputWriter.uint32((134 << 3) | 2).bytes(futureProofMessage);

        const remainingMessage = { ...message };
        delete remainingMessage.stickerMessage;
        return originalMessageEncode.call(this, remainingMessage, outputWriter);
    };

    Object.defineProperty(proto.Message, audioStickerMessagePatchKey, {
        value: true,
        configurable: true
    });
}

// ============================================================================
// FFmpeg & Media Helpers
// ============================================================================

function runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        let stderr = '';
        const child = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
            stdio: ['ignore', 'ignore', 'pipe'],
            windowsHide: true
        });

        child.stderr.on('data', chunk => {
            stderr = (stderr + chunk.toString()).slice(-4000);
        });
        child.once('error', reject);
        child.once('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg failed with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
        });
    });
}

async function hasAudioStream(inputPath) {
    try {
        await runFfmpeg([
            '-i', inputPath,
            '-map', '0:a:0',
            '-t', '0.1',
            '-f', 'null',
            '-'
        ]);
        return true;
    } catch (_) {
        return false;
    }
}

function unwrapMessage(message) {
    let content = message;
    while (content) {
        if (content.ephemeralMessage?.message) content = content.ephemeralMessage.message;
        else if (content.viewOnceMessage?.message) content = content.viewOnceMessage.message;
        else if (content.viewOnceMessageV2?.message) content = content.viewOnceMessageV2.message;
        else break;
    }
    return content;
}

function classifyMedia(msgType, msgObj) {
    const unwrapped = unwrapMessage(msgObj);
    if (!unwrapped) return null;

    const resolvedType = (msgType && unwrapped[msgType])
        ? msgType
        : Object.keys(unwrapped).find(k =>
            ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(k)
        );

    if (!resolvedType) return null;
    const content = unwrapped[resolvedType] || {};
    const mimetype = (content.mimetype || '').toLowerCase();
    const fileName = (content.fileName || '').toLowerCase();
    const ext = fileName.includes('.') ? fileName.split('.').pop() : '';

    if (resolvedType === 'imageMessage') {
        return { kind: mimetype.includes('gif') ? 'gif' : 'image', mimetype };
    }
    if (resolvedType === 'videoMessage') {
        const isGif = Boolean(content.gifPlayback) || mimetype.includes('gif');
        return { kind: isGif ? 'gif' : 'video', mimetype };
    }
    if (resolvedType === 'audioMessage') {
        return { kind: 'audio', mimetype, ptt: Boolean(content.ptt) };
    }
    if (resolvedType === 'stickerMessage') {
        return { kind: 'sticker', mimetype, isAnimated: Boolean(content.isAnimated) };
    }
    if (resolvedType === 'documentMessage') {
        if (mimetype.includes('gif') || ext === 'gif') {
            return { kind: 'gif', mimetype };
        }
        if (mimetype.startsWith('image/') || IMAGE_EXTS.has(ext)) {
            return { kind: 'image', mimetype };
        }
        if (mimetype.startsWith('video/') || VIDEO_EXTS.has(ext)) {
            return { kind: 'video', mimetype };
        }
        if (mimetype.startsWith('audio/') || AUDIO_EXTS.has(ext)) {
            return { kind: 'audio', mimetype };
        }
    }
    return null;
}

// ============================================================================
// Sticker & Audio Converters
// ============================================================================

async function createStaticSticker(inputPath, outputPath) {
    if (sharp) {
        const inputBuffer = await fs.promises.readFile(inputPath);
        return await sharp(inputBuffer)
            .rotate()
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 85 })
            .toBuffer();
    }

    await runFfmpeg([
        '-i', inputPath,
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1',
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-q:v', '80',
        outputPath
    ]);
    return await fs.promises.readFile(outputPath);
}

async function createAnimatedSticker(videoPath, tempDir) {
    for (let index = 0; index < stickerProfiles.length; index += 1) {
        const profile = stickerProfiles[index];
        const outputPath = path.join(tempDir, `sticker-${index}.webp`);
        await runFfmpeg([
            '-i', videoPath,
            '-t', String(profile.duration),
            '-vf', `fps=${profile.fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba`,
            '-vcodec', 'libwebp',
            '-lossless', '0',
            '-compression_level', '6',
            '-q:v', String(profile.quality),
            '-loop', '0',
            '-preset', 'picture',
            '-an',
            '-fps_mode', 'passthrough',
            outputPath
        ]);

        const stat = await fs.promises.stat(outputPath);
        if (stat.size <= MAX_STICKER_BYTES) {
            return {
                buffer: await fs.promises.readFile(outputPath),
                profile
            };
        }
    }

    throw new Error('The video is too complex to fit WhatsApp sticker size limits.');
}

async function createAudioVisualizerSticker(audioInputPath, tempDir) {
    for (let index = 0; index < stickerProfiles.length; index += 1) {
        const profile = stickerProfiles[index];
        const outputPath = path.join(tempDir, `audio-vis-${index}.webp`);
        try {
            await runFfmpeg([
                '-i', audioInputPath,
                '-t', String(profile.duration),
                '-filter_complex',
                `[0:a]aformat=channel_layouts=mono,showwaves=s=460x220:mode=cline:rate=${profile.fps}:colors=0x25D366|0x34B7F1,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x111B21FF,format=rgba[v]`,
                '-map', '[v]',
                '-an',
                '-vcodec', 'libwebp',
                '-lossless', '0',
                '-q:v', String(profile.quality),
                '-loop', '0',
                '-fps_mode', 'passthrough',
                outputPath
            ]);
            const stat = await fs.promises.stat(outputPath);
            if (stat.size > 0 && stat.size <= MAX_STICKER_BYTES) {
                return {
                    buffer: await fs.promises.readFile(outputPath),
                    profile
                };
            }
        } catch (err) {
            console.log('[STICKER] Audio visualizer attempt fallback:', err.message);
            break;
        }
    }

    if (sharp) {
        const svg = `
        <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <rect x="24" y="24" width="464" height="464" rx="96" fill="#111B21" stroke="#25D366" stroke-width="12"/>
            <rect x="128" y="216" width="24" height="80" rx="12" fill="#25D366"/>
            <rect x="176" y="166" width="24" height="180" rx="12" fill="#25D366"/>
            <rect x="224" y="126" width="24" height="260" rx="12" fill="#34B7F1"/>
            <rect x="272" y="156" width="24" height="200" rx="12" fill="#25D366"/>
            <rect x="320" y="186" width="24" height="140" rx="12" fill="#34B7F1"/>
            <rect x="368" y="226" width="24" height="60" rx="12" fill="#25D366"/>
        </svg>`;
        return {
            buffer: await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer(),
            profile: stickerProfiles[0]
        };
    }

    throw new Error('Failed to generate visual sticker for audio.');
}

async function createAudioTrack(inputPath, outputPath, duration) {
    await runFfmpeg([
        '-i', inputPath,
        '-map', '0:a:0',
        '-vn',
        '-t', String(duration),
        '-ac', '1',
        '-ar', '48000',
        '-c:a', 'libopus',
        '-b:a', '64k',
        '-application', 'audio',
        '-vbr', 'on',
        '-compression_level', '10',
        '-frame_duration', '20',
        '-avoid_negative_ts', 'make_zero',
        '-f', 'ogg',
        outputPath
    ]);
}

async function createAudioWaveform(audioPath, pcmOutputPath) {
    await runFfmpeg([
        '-i', audioPath,
        '-map', '0:a:0',
        '-ac', '1',
        '-ar', '8000',
        '-f', 's16le',
        pcmOutputPath
    ]);

    const pcm = await fs.promises.readFile(pcmOutputPath);
    const sampleCount = Math.floor(pcm.length / 2);
    if (!sampleCount) {
        throw new Error('FFmpeg produced no audio samples for the waveform.');
    }

    const amplitudes = new Float64Array(64);
    let peak = 0;
    for (let index = 0; index < amplitudes.length; index += 1) {
        const start = Math.floor(index * sampleCount / amplitudes.length);
        const end = Math.max(start + 1, Math.floor((index + 1) * sampleCount / amplitudes.length));
        let total = 0;
        let count = 0;
        for (let sample = start; sample < Math.min(end, sampleCount); sample += 1) {
            total += Math.abs(pcm.readInt16LE(sample * 2));
            count += 1;
        }
        amplitudes[index] = count ? total / count : 0;
        peak = Math.max(peak, amplitudes[index]);
    }

    return Uint8Array.from(amplitudes, amplitude => (peak ? Math.round(amplitude * 100 / peak) : 0));
}

async function addStickerExif(stickerBuffer, packname, author, audioHash = null) {
    if (!webp) return stickerBuffer;

    try {
        const image = new webp.Image();
        await image.load(stickerBuffer);

        const metadata = {
            'sticker-pack-id': audioHash
                ? crypto.randomBytes(16).toString('hex')
                : 'com.snowcorp.stickerly.android.stickercontentprovider',
            'sticker-pack-name': packname || global.packname || 'SYAM STICKERS',
            'sticker-pack-publisher': author || global.author || 'SYAM',
            emojis: audioHash ? ['🔊'] : ['❤️'],
            ...(audioHash ? { 'sound-sha256': audioHash } : {})
        };

        const exifHeader = Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ]);
        const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf8');
        const exif = Buffer.concat([exifHeader, metadataBuffer]);
        exif.writeUIntLE(metadataBuffer.length, 14, 4);
        image.exif = exif;

        const stickerWithMetadata = await image.save(null);
        if (audioHash && stickerWithMetadata.length > 1024 * 1024) {
            throw new Error('The sticker exceeds WhatsApp’s 1 MB size limit.');
        }
        return stickerWithMetadata;
    } catch (error) {
        if (audioHash) throw error;
        console.log('[STICKER] EXIF skipped:', error.message);
        return stickerBuffer;
    }
}

// ============================================================================
// Sound Sticker Sender & Unified Pipeline Builders
// ============================================================================

async function sendSoundSticker(conn, from, stickerBuffer, audioBuffer, waveform, duration) {
    if (typeof conn.waUploadToServer !== 'function') {
        throw new Error('Baileys media upload is unavailable on this socket.');
    }

    const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('base64');

    const [preparedSticker, preparedAudio] = await Promise.all([
        prepareWAMessageMedia(
            { sticker: stickerBuffer, isAnimated: true },
            { upload: conn.waUploadToServer }
        ),
        prepareWAMessageMedia(
            {
                audio: audioBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: false,
                seconds: duration
            },
            { upload: conn.waUploadToServer }
        )
    ]);

    const sticker = preparedSticker?.stickerMessage;
    const audio = preparedAudio?.audioMessage;

    if (!sticker?.fileSha256 || !audio?.fileSha256 || !audio?.mediaKey || !audio?.directPath) {
        throw new Error('WhatsApp media upload returned incomplete sticker or audio data.');
    }
    if (!Buffer.from(audio.fileSha256).equals(Buffer.from(audioHash, 'base64'))) {
        throw new Error('The uploaded audio hash does not match the sticker sound metadata.');
    }

    audio.waveform = waveform;
    audio.mimetype = 'audio/ogg; codecs=opus';
    audio.ptt = false;
    audio.seconds = audio.seconds || duration;

    sticker.width = 512;
    sticker.height = 512;
    sticker.isAnimated = true;
    sticker.stickerSentTs = Date.now();
    sticker.isAvatar = false;
    sticker.isAiSticker = false;
    sticker.isLottie = false;
    sticker.audioMessage = audio;

    await conn.relayMessage(from, { stickerMessage: sticker }, {});
}

async function processAndSendSticker({
    conn,
    from,
    mek,
    mediaPath,
    tempDir,
    target,
    packname,
    author,
    withAudio
}) {
    let stickerBuffer;
    let isAnimated = false;
    let duration = stickerProfiles[0].duration;

    if (target.kind === 'image') {
        const outPath = path.join(tempDir, 'static.webp');
        stickerBuffer = await createStaticSticker(mediaPath, outPath);
    } else if (target.kind === 'gif' || target.kind === 'video') {
        isAnimated = true;
        const result = await createAnimatedSticker(mediaPath, tempDir);
        stickerBuffer = result.buffer;
        duration = result.profile.duration;
    } else if (target.kind === 'audio') {
        isAnimated = true;
        const result = await createAudioVisualizerSticker(mediaPath, tempDir);
        stickerBuffer = result.buffer;
        duration = result.profile.duration;
    } else if (target.kind === 'sticker') {
        isAnimated = Boolean(target.isAnimated);
        stickerBuffer = await fs.promises.readFile(mediaPath);
    }

    if (withAudio && (target.kind === 'video' || target.kind === 'audio')) {
        const audioPath = path.join(tempDir, 'sticker-audio.ogg');
        const pcmPath = path.join(tempDir, 'sticker-audio.pcm');

        await createAudioTrack(mediaPath, audioPath, duration);
        const audioBuffer = await fs.promises.readFile(audioPath);
        if (!audioBuffer.length) {
            throw new Error('FFmpeg produced an empty audio track.');
        }

        const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('base64');
        const waveform = await createAudioWaveform(audioPath, pcmPath);
        const taggedSticker = await addStickerExif(stickerBuffer, packname, author, audioHash);

        await sendSoundSticker(conn, from, taggedSticker, audioBuffer, waveform, duration);
        return { mode: 'audio-sticker', isAnimated: true };
    }

    const taggedSticker = await addStickerExif(stickerBuffer, packname, author, null);
    await conn.sendMessage(from, { sticker: taggedSticker }, { quoted: mek });
    return { mode: 'normal-sticker', isAnimated };
}

// ============================================================================
// Interactive Number Menu Helper
// ============================================================================

function normalizeJidUser(jid) {
    if (!jid) return '';
    return String(jid).split('@')[0].split(':')[0];
}

function extractIncomingText(rawMessage) {
    const msg = unwrapMessage(rawMessage);
    if (!msg) return '';
    return (
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.buttonsResponseMessage?.selectedButtonId ||
        msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
        ''
    ).trim();
}

function waitForMenuChoice({ conn, from, senderUser, menuMessageId, onCleanup }) {
    const sessionKey = `${from}:${senderUser}`;

    // Cancel any existing pending menu for this user in this chat
    const existing = activeStickerMenus.get(sessionKey);
    if (existing) {
        existing.cancel();
    }

    return new Promise((resolve) => {
        let settled = false;

        const finish = (choice) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            conn.ev.off('messages.upsert', onUpsert);
            activeStickerMenus.delete(sessionKey);
            resolve(choice);
        };

        const cancel = () => {
            finish(null);
            if (onCleanup) onCleanup();
        };

        const onUpsert = (upsert) => {
            const messages = upsert?.messages || [];
            for (const msg of messages) {
                if (!msg?.message || msg.key?.fromMe) continue;
                if (msg.key?.remoteJid !== from) continue;

                const incomingSender = normalizeJidUser(
                    msg.key?.participant || msg.participant || msg.key?.remoteJid
                );
                if (senderUser && incomingSender !== senderUser) continue;

                const unwrapped = unwrapMessage(msg.message);
                const quotedId = unwrapped?.extendedTextMessage?.contextInfo?.stanzaId;

                // Accept either a direct reply to the menu message OR an unquoted 1/2 in the same chat
                if (quotedId && quotedId !== menuMessageId) continue;

                const text = extractIncomingText(msg.message);
                if (/^1(?:\s*\.?|\b)/.test(text)) {
                    finish({ choice: '1', replyMsg: msg });
                    return;
                }
                if (/^2(?:\s*\.?|\b)/.test(text)) {
                    finish({ choice: '2', replyMsg: msg });
                    return;
                }
            }
        };

        const timer = setTimeout(() => {
            finish(null);
        }, MENU_TIMEOUT_MS);

        activeStickerMenus.set(sessionKey, { cancel });
        conn.ev.on('messages.upsert', onUpsert);
    });
}

// ============================================================================
// Main Command Definition (.s / .sticker / .stic / .soundsticker)
// ============================================================================

cmd({
    pattern: 'sticker',
    alias: ['s', 'stic', 'soundsticker'],
    desc: global.LANG?.converters?.STICKER_DESC || 'Convert image, video, GIF, or audio to sticker',
    category: 'converters',
    react: '🎨',
    filename: __filename
}, async (conn, mek, m, { from, reply, q, command }) => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sticker-'));
    let mediaPath = null;
    let handedOffToMenu = false;

    const cleanupFiles = async () => {
        if (mediaPath) {
            try {
                await fs.promises.unlink(mediaPath);
            } catch (_) { }
        }
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (_) { }
    };

    try {
        const messageType = m.type || Object.keys(m.message || {})[0];
        const directMedia = classifyMedia(messageType, m.message);
        const quotedMedia = m.quoted ? classifyMedia(m.quoted.type, m.quoted.message) : null;

        const target = directMedia
            ? { isDirect: true, ...directMedia }
            : quotedMedia
                ? { isDirect: false, ...quotedMedia }
                : null;

        if (!target) {
            return reply('❌ Send or reply to an *image, video, GIF, audio/voice note, or sticker* with `.s`');
        }

        if (target.isDirect) {
            mediaPath = await conn.downloadAndSaveMediaMessage({
                key: m.key,
                message: m.message
            });
        } else {
            mediaPath = await m.quoted.download();
        }

        if (!mediaPath || !fs.existsSync(mediaPath)) {
            throw new Error('Media download failed.');
        }

        // Resolve custom packname | author via `.s Pack | Author` or saved user preference
        let savedPack = null;
        try {
            const { getUserPack } = require('../lib/stickerPrefs');
            savedPack = getUserPack(m.senderNumber || m.sender);
        } catch (_) {
            savedPack = null;
        }

        let packname = savedPack?.packname || global.packname || 'SYAM STICKERS';
        let author = (savedPack && savedPack.author !== undefined)
            ? savedPack.author
            : (global.author || 'SYAM');

        if (q && q.trim()) {
            if (q.includes('|')) {
                const parts = q.split('|');
                packname = parts[0].trim() || packname;
                author = parts[1].trim();
            } else {
                packname = q.trim();
            }
        }

        // Determine whether this media supports both Audio Sticker & Normal Sticker
        const canHaveAudio =
            target.kind === 'audio' ||
            (target.kind === 'video' && await hasAudioStream(mediaPath));

        const invokedCmd = (command || '').toLowerCase();

        // Direct shortcut: `.soundsticker` skips the menu when audio is present
        if (canHaveAudio && invokedCmd === 'soundsticker') {
            await reply('🔊 Creating your audio sticker...');
            await processAndSendSticker({
                conn,
                from,
                mek,
                mediaPath,
                tempDir,
                target,
                packname,
                author,
                withAudio: true
            });
            return reply('✅ Audio sticker sent!');
        }

        // Show Number Menu for `.s` / `.sticker` / `.stic` when media has audio
        if (canHaveAudio) {
            const menuText =
                `🎨 *Sticker Maker*\n\n` +
                `Reply with a number to choose:\n` +
                `*1.* Audio Sticker 🔊\n` +
                `*2.* Normal Sticker 🎁\n\n` +
                `_Reply 1 or 2 within 60 seconds_`;

            const sentMenu = await conn.sendMessage(from, { text: menuText }, { quoted: mek });
            const senderUser = normalizeJidUser(m.sender || m.senderNumber || m.key?.participant || from);

            handedOffToMenu = true;

            waitForMenuChoice({
                conn,
                from,
                senderUser,
                menuMessageId: sentMenu?.key?.id,
                onCleanup: cleanupFiles
            }).then(async (selection) => {
                try {
                    if (!selection) return; // Timed out or superseded by a newer `.s` command

                    const withAudio = selection.choice === '1';
                    await conn.sendMessage(
                        from,
                        { text: withAudio ? '🔊 Creating your audio sticker...' : '🎁 Creating your normal sticker...' },
                        { quoted: selection.replyMsg }
                    );

                    const result = await processAndSendSticker({
                        conn,
                        from,
                        mek: selection.replyMsg,
                        mediaPath,
                        tempDir,
                        target,
                        packname,
                        author,
                        withAudio
                    });

                    await conn.sendMessage(
                        from,
                        {
                            text: result.mode === 'audio-sticker'
                                ? '✅ Audio sticker sent!'
                                : '✅ Normal sticker sent!'
                        },
                        { quoted: selection.replyMsg }
                    );
                } catch (err) {
                    console.error('[STICKER MENU ERROR]', err);
                    await conn.sendMessage(
                        from,
                        { text: '❌ Sticker Error: ' + err.message },
                        { quoted: mek }
                    );
                } finally {
                    await cleanupFiles();
                }
            });

            return;
        }

        // Media without audio (image, GIF, silent video, sticker) -> convert directly
        await reply('🎨 Creating sticker...');
        const result = await processAndSendSticker({
            conn,
            from,
            mek,
            mediaPath,
            tempDir,
            target,
            packname,
            author,
            withAudio: false
        });

        return reply(result.isAnimated ? '✅ Animated sticker sent!' : '✅ Sticker created successfully!');
    } catch (error) {
        console.error('[STICKER ERROR]', error);
        return reply('❌ Sticker Error: ' + error.message);
    } finally {
        if (!handedOffToMenu) {
            await cleanupFiles();
        }
    }
});
