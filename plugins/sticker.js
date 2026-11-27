'use strict';

const { cmd } = require('../command');
const {
    downloadMediaMessage,
    prepareWAMessageMedia,
    proto,
    getContentType
} = require('@whiskeysockets/baileys');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

let webp = null;
try {
    webp = require('node-webpmux');
} catch (_) {
    webp = null;
}

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

let settings = {};
try {
    settings = require('../settings');
} catch (_) {
    try {
        settings = require('../config');
    } catch (__) {
        settings = {};
    }
}

const MAX_STICKER_BYTES = 900 * 1024;
const MAX_VIDEO_SECONDS = 6;
const MENU_TIMEOUT_MS = 60 * 1000;

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'avif', 'heic']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', '3gp', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac', 'flac', 'wma', 'amr']);

const audioStickerPatchKey = Symbol.for('donixbot.audioStickerProtoPatch');
const audioStickerMessagePatchKey = Symbol.for('donixbot.audioStickerMessageProtoPatch');

// Tracks active sticker menu prompts per chat+user so re-running .s replaces old prompts cleanly
const activeStickerMenus = new Map();

const stickerProfiles = [
    { duration: 5, fps: 15, quality: 60 },
    { duration: 4, fps: 10, quality: 35 },
    { duration: 3, fps: 8, quality: 20 },
    { duration: 2, fps: 6, quality: 15 }
];

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

// Patch WAProto once for native WhatsApp audio stickers (StickerMessage field 26 + Message field 134)
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

        // Keep stickerMessage visible to Baileys' relay code so it sets mediatype="sticker"
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

function unwrapMessage(message) {
    let content = message;
    for (let i = 0; i < 6 && content; i++) {
        if (content.ephemeralMessage?.message) content = content.ephemeralMessage.message;
        else if (content.viewOnceMessage?.message) content = content.viewOnceMessage.message;
        else if (content.viewOnceMessageV2?.message) content = content.viewOnceMessageV2.message;
        else if (content.viewOnceMessageV2Extension?.message) content = content.viewOnceMessageV2Extension.message;
        else if (content.documentWithCaptionMessage?.message) content = content.documentWithCaptionMessage.message;
        else break;
    }
    return content || {};
}

function resolveMessageType(preferredType, msgObj) {
    if (preferredType && msgObj?.[preferredType]) return preferredType;
    if (typeof getContentType === 'function') {
        const detected = getContentType(msgObj);
        if (detected && msgObj?.[detected]) return detected;
    }
    const ignored = new Set(['senderKeyDistributionMessage', 'messageContextInfo']);
    return Object.keys(msgObj || {}).find((k) => !ignored.has(k)) || null;
}

function classifyMedia(preferredType, rawMsgObj) {
    const msgObj = unwrapMessage(rawMsgObj);
    const msgType = resolveMessageType(preferredType, msgObj);
    if (!msgType || !msgObj[msgType]) return null;

    const content = msgObj[msgType] || {};
    const mimetype = (content.mimetype || '').toLowerCase();
    const fileName = (content.fileName || '').toLowerCase();
    const ext = fileName.includes('.') ? fileName.split('.').pop() : '';

    if (msgType === 'imageMessage') {
        return { kind: mimetype.includes('gif') ? 'gif' : 'image', mimetype };
    }
    if (msgType === 'videoMessage') {
        const isGif = Boolean(content.gifPlayback) || mimetype.includes('gif');
        return { kind: isGif ? 'gif' : 'video', mimetype };
    }
    if (msgType === 'audioMessage') {
        return { kind: 'audio', mimetype, ptt: Boolean(content.ptt) };
    }
    if (msgType === 'stickerMessage') {
        return { kind: 'sticker', mimetype, isAnimated: Boolean(content.isAnimated) };
    }
    if (msgType === 'documentMessage') {
        if (mimetype.includes('gif') || ext === 'gif') return { kind: 'gif', mimetype };
        if (mimetype.startsWith('image/') || IMAGE_EXTS.has(ext)) return { kind: 'image', mimetype };
        if (mimetype.startsWith('video/') || VIDEO_EXTS.has(ext)) return { kind: 'video', mimetype };
        if (mimetype.startsWith('audio/') || AUDIO_EXTS.has(ext)) return { kind: 'audio', mimetype };
    }
    return null;
}

function extractTargetMedia(mek, m) {
    const directMsg = unwrapMessage(m.message || mek.message);
    const directMedia = classifyMedia(m.type, directMsg);
    if (directMedia) {
        return {
            isDirect: true,
            ...directMedia,
            source: { key: m.key || mek.key, message: directMsg }
        };
    }

    const contextInfo = directMsg?.extendedTextMessage?.contextInfo
        || directMsg?.imageMessage?.contextInfo
        || directMsg?.videoMessage?.contextInfo;
    const rawQuoted = m.quoted?.message || contextInfo?.quotedMessage;

    if (rawQuoted) {
        const unwrappedQuoted = unwrapMessage(rawQuoted);
        const quotedMedia = classifyMedia(m.quoted?.type, unwrappedQuoted);
        if (quotedMedia) {
            return {
                isDirect: false,
                ...quotedMedia,
                source: {
                    key: m.quoted?.key || {
                        remoteJid: m.chat || mek.key?.remoteJid,
                        id: contextInfo?.stanzaId,
                        participant: contextInfo?.participant
                    },
                    message: unwrappedQuoted
                }
            };
        }
    }

    return null;
}

function runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        let stderr = '';
        const child = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
            stdio: ['ignore', 'ignore', 'pipe'],
            windowsHide: true
        });

        child.stderr.on('data', (chunk) => {
            stderr = (stderr + chunk.toString()).slice(-4000);
        });
        child.once('error', reject);
        child.once('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg failed with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
        });
    });
}

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

async function createNormalAnimatedSticker(inputPath, outputPath) {
    await runFfmpeg([
        '-i', inputPath,
        '-t', String(MAX_VIDEO_SECONDS),
        '-an',
        '-vf', 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1',
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-q:v', '60',
        '-loop', '0',
        '-preset', 'picture',
        outputPath
    ]);
    return await fs.promises.readFile(outputPath);
}

async function createAdaptiveVideoSticker(videoPath, tempDir) {
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

        if (fs.statSync(outputPath).size <= MAX_STICKER_BYTES) {
            return { outputPath, profile };
        }
    }

    throw new Error('The video is too complex to fit WhatsApp sticker limits.');
}

async function createAudioVisualizerSticker(audioInputPath, outputPath, duration = 5) {
    try {
        await runFfmpeg([
            '-i', audioInputPath,
            '-t', String(duration),
            '-filter_complex',
            '[0:a]aformat=channel_layouts=mono,showwaves=s=460x220:mode=cline:rate=15:colors=0x25D366|0x34B7F1,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x111B21FF,format=rgba[v]',
            '-map', '[v]',
            '-an',
            '-vcodec', 'libwebp',
            '-lossless', '0',
            '-q:v', '65',
            '-loop', '0',
            outputPath
        ]);
        const buf = await fs.promises.readFile(outputPath);
        if (buf.length > 0 && buf.length <= MAX_STICKER_BYTES) {
            return { outputPath, profile: { duration, fps: 15, quality: 65 } };
        }
    } catch (err) {
        console.log('[STICKER] Audio visualizer fallback:', err.message);
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
        const fallbackBuf = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer();
        await fs.promises.writeFile(outputPath, fallbackBuf);
        return { outputPath, profile: { duration, fps: 1, quality: 85 } };
    }

    throw new Error('Failed to generate visual sticker for audio.');
}

async function createAudioTrack(mediaPath, outputPath, duration) {
    await runFfmpeg([
        '-i', mediaPath,
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

async function createAudioWaveform(audioPath, outputPath) {
    await runFfmpeg([
        '-i', audioPath,
        '-map', '0:a:0',
        '-ac', '1',
        '-ar', '8000',
        '-f', 's16le',
        outputPath
    ]);

    const pcm = fs.readFileSync(outputPath);
    const sampleCount = Math.floor(pcm.length / 2);
    if (!sampleCount) {
        throw new Error('FFmpeg produced no audio samples for the waveform.');
    }

    const amplitudes = new Float64Array(64);
    let peak = 0;
    for (let index = 0; index < amplitudes.length; index += 1) {
        const start = Math.floor((index * sampleCount) / amplitudes.length);
        const end = Math.max(start + 1, Math.floor(((index + 1) * sampleCount) / amplitudes.length));
        let total = 0;
        let count = 0;
        for (let sample = start; sample < Math.min(end, sampleCount); sample += 1) {
            total += Math.abs(pcm.readInt16LE(sample * 2));
            count += 1;
        }
        amplitudes[index] = count ? total / count : 0;
        peak = Math.max(peak, amplitudes[index]);
    }

    return Uint8Array.from(amplitudes, (amplitude) => (peak ? Math.round((amplitude * 100) / peak) : 0));
}

async function addStickerMetadata(stickerBuffer, { packname, author, emojis = ['❤️'], audioHash = null }) {
    if (!webp?.Image) {
        if (audioHash) throw new Error('node-webpmux is required for audio stickers.');
        return stickerBuffer;
    }

    try {
        const image = new webp.Image();
        await image.load(stickerBuffer);

        const metadata = {
            'sticker-pack-id': crypto.randomBytes(16).toString('hex'),
            'sticker-pack-name': packname || global.packname || settings.packname || 'SYAM STICKERS',
            'sticker-pack-publisher': author || global.author || settings.author || 'SYAM',
            emojis
        };
        if (audioHash) {
            metadata['sound-sha256'] = audioHash;
        }

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
        if (stickerWithMetadata.length > 1024 * 1024) {
            throw new Error('The sticker exceeds WhatsApp’s 1 MB size limit.');
        }
        return stickerWithMetadata;
    } catch (error) {
        if (audioHash) throw error;
        console.log('[STICKER] EXIF skipped:', error.message);
        return stickerBuffer;
    }
}

async function sendNativeAudioSticker(conn, from, mediaPath, targetKind, tempDir, packOpts) {
    const audioPath = path.join(tempDir, 'sticker-audio.ogg');
    const waveformPath = path.join(tempDir, 'sticker-audio.pcm');

    const { outputPath: stickerPath, profile } = targetKind === 'audio'
        ? await createAudioVisualizerSticker(mediaPath, path.join(tempDir, 'audio-vis.webp'), 5)
        : await createAdaptiveVideoSticker(mediaPath, tempDir);

    await createAudioTrack(mediaPath, audioPath, profile.duration);
    const audioBuffer = fs.readFileSync(audioPath);
    if (!audioBuffer.length) {
        throw new Error('FFmpeg produced an empty audio track.');
    }

    const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('base64');
    const waveform = await createAudioWaveform(audioPath, waveformPath);

    const stickerBuffer = await addStickerMetadata(fs.readFileSync(stickerPath), {
        ...packOpts,
        emojis: ['🔊'],
        audioHash
    });

    if (typeof conn.waUploadToServer !== 'function') {
        throw new Error('Baileys media upload is unavailable on this socket.');
    }

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
                seconds: profile.duration
            },
            { upload: conn.waUploadToServer }
        )
    ]);

    const sticker = preparedSticker.stickerMessage;
    const audio = preparedAudio.audioMessage;

    if (!sticker?.fileSha256 || !audio?.fileSha256 || !audio?.mediaKey || !audio?.directPath) {
        throw new Error('WhatsApp media upload returned incomplete sticker or audio data.');
    }
    if (!Buffer.from(audio.fileSha256).equals(Buffer.from(audioHash, 'base64'))) {
        throw new Error('The uploaded audio hash does not match the sticker sound metadata.');
    }

    audio.waveform = waveform;
    audio.mimetype = 'audio/ogg; codecs=opus';
    audio.ptt = false;
    audio.seconds = audio.seconds || profile.duration;

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

function normalizeJidUser(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function extractIncomingText(msgObj) {
    const unwrapped = unwrapMessage(msgObj);
    return (
        unwrapped.conversation
        || unwrapped.extendedTextMessage?.text
        || unwrapped.imageMessage?.caption
        || unwrapped.videoMessage?.caption
        || ''
    ).trim();
}

function waitForStickerMenuReply(conn, from, senderJid, menuMsgId, isOwnerSender, timeoutMs = MENU_TIMEOUT_MS) {
    return new Promise((resolve) => {
        if (!conn?.ev?.on) return resolve(null);

        const expectedUser = normalizeJidUser(senderJid);
        const stateKey = `${from}:${expectedUser}`;

        if (activeStickerMenus.has(stateKey)) {
            activeStickerMenus.get(stateKey).cancel();
        }

        let settled = false;

        const cleanup = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (activeStickerMenus.get(stateKey)?.cleanup === cleanup) {
                activeStickerMenus.delete(stateKey);
            }
            if (typeof conn.ev.off === 'function') {
                conn.ev.off('messages.upsert', onUpsert);
            } else if (typeof conn.ev.removeListener === 'function') {
                conn.ev.removeListener('messages.upsert', onUpsert);
            }
        };

        const cancel = () => {
            cleanup();
            resolve(null);
        };

        const timer = setTimeout(cancel, timeoutMs);
        activeStickerMenus.set(stateKey, { cleanup, cancel });

        const onUpsert = ({ type, messages }) => {
            if (type === 'append' || !Array.isArray(messages)) return;
            for (const msg of messages) {
                if (!msg?.message) continue;
                if (menuMsgId && msg.key?.id === menuMsgId) continue;
                if (msg.key?.remoteJid !== from) continue;
                if (msg.key?.fromMe && !isOwnerSender) continue;

                const unwrapped = unwrapMessage(msg.message);
                const quotedStanzaId = unwrapped?.extendedTextMessage?.contextInfo?.stanzaId;
                const isDirectReplyToMenu = Boolean(menuMsgId && quotedStanzaId === menuMsgId);

                const incomingSender = msg.key?.fromMe
                    ? (conn.user?.id || senderJid)
                    : (msg.key?.participant || msg.key?.remoteJid);

                if (!isDirectReplyToMenu && expectedUser && normalizeJidUser(incomingSender) !== expectedUser) {
                    continue;
                }

                const text = extractIncomingText(msg.message).toLowerCase();
                if (
                    text === '1'
                    || text === '1.'
                    || text === 'audio-sticker'
                    || text === 'audio sticker'
                ) {
                    cleanup();
                    return resolve({ choice: '1', replyMsg: msg });
                }
                if (
                    text === '2'
                    || text === '2.'
                    || text === 'normal-sticker'
                    || text === 'normal sticker'
                ) {
                    cleanup();
                    return resolve({ choice: '2', replyMsg: msg });
                }
            }
        };

        conn.ev.on('messages.upsert', onUpsert);
    });
}

cmd({
    pattern: 'sticker',
    alias: ['s', 'stic', 'as', 'soundsticker'],
    desc: global.LANG?.converters?.STICKER_DESC || 'Convert media to audio-sticker or normal-sticker',
    category: 'converters',
    react: '🎨',
    filename: __filename
}, async (conn, mek, m, { from, reply, q, command, isChannel }) => {
    const sendText = (text, quoted = mek) => {
        const opts = !isChannel && quoted ? { quoted } : {};
        return conn.sendMessage(from, { text }, opts);
    };

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sticker-'));
    let downloadedFile = null;

    try {
        const target = extractTargetMedia(mek, m);
        if (!target) {
            return sendText('❌ Send or reply to an *image, video, GIF, audio/voice note, or sticker* with `.s`');
        }

        let rawQuery = (q || '').trim();
        const usedCommand = String(command || '').toLowerCase();
        let selectedChoice = null;

        if (usedCommand === 'as' || usedCommand === 'soundsticker') {
            selectedChoice = '1';
        } else if (/^(1|audio)\b/i.test(rawQuery)) {
            selectedChoice = '1';
            rawQuery = rawQuery.replace(/^(1|audio)\b\s*/i, '').trim();
        } else if (/^(2|normal)\b/i.test(rawQuery)) {
            selectedChoice = '2';
            rawQuery = rawQuery.replace(/^(2|normal)\b\s*/i, '').trim();
        }

        let savedPack = null;
        try {
            const { getUserPack } = require('../lib/stickerPrefs');
            savedPack = getUserPack(m.senderNumber || m.sender);
        } catch (_) {
            savedPack = null;
        }

        let packname = savedPack?.packname || global.packname || settings.packname || 'SYAM STICKERS';
        let author = (savedPack && savedPack.author !== undefined)
            ? savedPack.author
            : (global.author || settings.author || 'SYAM');

        if (rawQuery) {
            if (rawQuery.includes('|')) {
                const parts = rawQuery.split('|');
                packname = parts[0].trim() || packname;
                author = parts[1].trim();
            } else {
                packname = rawQuery;
            }
        }

        const mediaPath = path.join(tempDir, 'source-media');
        if (typeof m.quoted?.download === 'function' && !target.isDirect) {
            const res = await m.quoted.download();
            if (Buffer.isBuffer(res)) {
                await fs.promises.writeFile(mediaPath, res);
            } else if (typeof res === 'string' && fs.existsSync(res)) {
                downloadedFile = res;
                await fs.promises.copyFile(res, mediaPath);
            }
        } else {
            const buf = await downloadMediaMessage(target.source, 'buffer', {}, {
                logger: undefined,
                reuploadRequest: conn.updateMediaMessage
            });
            await fs.promises.writeFile(mediaPath, buf);
        }

        if (!fs.existsSync(mediaPath) || fs.statSync(mediaPath).size === 0) {
            throw new Error('Media download failed.');
        }

        let replyAnchor = mek;

        if (!selectedChoice) {
            const isOwnerSender = Boolean(mek.key?.fromMe);
            const senderJid = isOwnerSender
                ? (conn.user?.id || m.sender || from)
                : (m.sender || mek.key?.participant || from);

            const menuText =
                '🎨 *STICKER MENU*\n\n' +
                '1. audio-sticker🔊\n' +
                '2. normal-sticker🎁\n\n' +
                '_Reply with *1* or *2* (60s)_';

            const sentMenu = await sendText(menuText, mek);

            const menuReply = await waitForStickerMenuReply(
                conn,
                from,
                senderJid,
                sentMenu?.key?.id,
                isOwnerSender,
                MENU_TIMEOUT_MS
            );

            if (!menuReply) {
                return;
            }
            selectedChoice = menuReply.choice;
            replyAnchor = menuReply.replyMsg || mek;
        }

        if (selectedChoice === '1') {
            if (target.kind === 'video' || target.kind === 'audio') {
                await sendText('🔊 Creating your audio sticker…', replyAnchor);
                await sendNativeAudioSticker(conn, from, mediaPath, target.kind, tempDir, {
                    packname,
                    author
                });
                return;
            }

            await sendText('⚠️ Images/GIFs have no audio track — creating a normal sticker instead…', replyAnchor);
            selectedChoice = '2';
        }

        let stickerBuffer;
        if (target.kind === 'image') {
            stickerBuffer = await createStaticSticker(mediaPath, path.join(tempDir, 'static.webp'));
        } else if (target.kind === 'gif' || target.kind === 'video') {
            stickerBuffer = await createNormalAnimatedSticker(mediaPath, path.join(tempDir, 'animated.webp'));
        } else if (target.kind === 'audio') {
            const { outputPath } = await createAudioVisualizerSticker(mediaPath, path.join(tempDir, 'vis.webp'), MAX_VIDEO_SECONDS);
            stickerBuffer = await fs.promises.readFile(outputPath);
        } else if (target.kind === 'sticker') {
            stickerBuffer = await fs.promises.readFile(mediaPath);
        }

        stickerBuffer = await addStickerMetadata(stickerBuffer, {
            packname,
            author,
            emojis: ['🎁']
        });

        await conn.sendMessage(
            from,
            { sticker: stickerBuffer },
            !isChannel ? { quoted: replyAnchor } : {}
        );
    } catch (error) {
        console.error('[STICKER ERROR]', error);
        return typeof reply === 'function'
            ? reply('❌ Sticker Error: ' + error.message)
            : sendText('❌ Sticker Error: ' + error.message);
    } finally {
        if (downloadedFile) {
            try {
                await fs.promises.unlink(downloadedFile);
            } catch (_) { }
        }
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (_) { }
    }
});

console.log('🎨 [Plugin] sticker.js loaded successfully!');
