'use strict';

const { cmd } = require('../command');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');

const execFileAsync = promisify(execFile);

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

let baileys = null;
try {
    baileys = require('@whiskeysockets/baileys');
} catch (_) {
    baileys = null;
}

const MAX_VIDEO_SECONDS = 6;
const MAX_AUDIO_SECONDS = 10;

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'avif', 'heic']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', '3gp', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac', 'flac', 'wma', 'amr']);

async function ffmpeg(args) {
    await execFileAsync(ffmpegPath, [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        ...args
    ]);
}

/**
 * Classify incoming or quoted WhatsApp media into image, gif, video, audio, or sticker.
 */
function classifyMedia(msgType, msgObj) {
    if (!msgType || !msgObj) return null;
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

    await ffmpeg([
        '-i', inputPath,
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1',
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-q:v', '80',
        outputPath
    ]);
    return await fs.promises.readFile(outputPath);
}

async function createAnimatedSticker(inputPath, outputPath) {
    await ffmpeg([
        '-i', inputPath,
        '-t', String(MAX_VIDEO_SECONDS),
        '-an',
        '-vf',
        'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1',
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-q:v', '60',
        '-loop', '0',
        '-preset', 'default',
        '-vsync', '0',
        outputPath
    ]);
    return await fs.promises.readFile(outputPath);
}

async function createAudioVisualizerSticker(audioInputPath, outputPath) {
    try {
        await ffmpeg([
            '-i', audioInputPath,
            '-t', String(MAX_VIDEO_SECONDS),
            '-filter_complex',
            '[0:a]aformat=channel_layouts=mono,showwaves=s=460x220:mode=cline:rate=15:colors=0x25D366|0x34B7F1,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x111B21FF,format=rgba[v]',
            '-map', '[v]',
            '-an',
            '-vcodec', 'libwebp',
            '-lossless', '0',
            '-q:v', '65',
            '-loop', '0',
            '-vsync', '0',
            outputPath
        ]);
        const buf = await fs.promises.readFile(outputPath);
        if (buf.length > 0) return buf;
    } catch (err) {
        console.log('[STICKER] Audio visualizer fallback:', err.message);
    }

    // Fallback: static sound-sticker badge via sharp SVG
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
        return await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer();
    }

    throw new Error('Failed to generate visual sticker for audio.');
}

async function extractAudio(inputPath, outputPath) {
    await ffmpeg([
        '-i', inputPath,
        '-t', String(MAX_AUDIO_SECONDS),
        '-vn',
        '-ac', '1',
        '-ar', '48000',
        '-c:a', 'libopus',
        '-b:a', '64k',
        '-f', 'ogg',
        outputPath
    ]);
}

async function addStickerExif(buffer, packname, author) {
    try {
        const { Image } = require('node-webpmux');
        const img = new Image();
        await img.load(buffer);

        const metadata = {
            'sticker-pack-id': 'com.snowcorp.stickerly.android.stickercontentprovider',
            'sticker-pack-name': packname || global.packname || 'SYAM STICKERS',
            'sticker-pack-publisher': author || global.author || 'SYAM',
            emojis: ['❤️']
        };

        const json = Buffer.from(JSON.stringify(metadata), 'utf8');
        const header = Buffer.from([
            0x49, 0x49, 0x2A, 0x00,
            0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57,
            0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00,
            0x00, 0x00
        ]);

        const exif = Buffer.concat([header, json]);
        exif.writeUIntLE(json.length, 14, 4);
        img.exif = exif;

        return await img.saveBuffer();
    } catch (error) {
        console.log('[STICKER] EXIF skipped:', error.message);
        return buffer;
    }
}

/**
 * Detect whether the installed Baileys WAProto StickerMessage supports embedded audio.
 */
function getStickerAudioProtoField() {
    const fields = baileys?.proto?.Message?.StickerMessage?.$type?.fields;
    if (!fields) return null;
    for (const candidate of ['audioMessage', 'audio', 'stickerAudio', 'sound']) {
        if (fields[candidate]) return candidate;
    }
    return null;
}

/**
 * Ensure `Message.audioStickerMessage` (field 134, FutureProofMessage) exists on
 * Baileys WAProto at runtime so older WAProto builds don't drop it during encode.
 */
function ensureAudioStickerProtoField() {
    const MessageType = baileys?.proto?.Message?.$type;
    if (!MessageType) return false;
    if (MessageType.fields?.audioStickerMessage) return true;

    try {
        const FieldCtor = MessageType.fieldsArray?.[0]?.constructor;
        const hasFutureProof = Boolean(
            baileys?.proto?.Message?.FutureProofMessage ||
            MessageType.parent?.lookupTypeOrEnum?.('FutureProofMessage')
        );
        if (!FieldCtor || !hasFutureProof) return false;

        MessageType.add(new FieldCtor('audioStickerMessage', 134, 'FutureProofMessage'));
        return Boolean(MessageType.fields?.audioStickerMessage);
    } catch (err) {
        console.log('[STICKER] Could not register audioStickerMessage proto field:', err.message);
        return false;
    }
}

/**
 * Send a WhatsApp sound sticker (animated WebP + embedded Opus audio track)
 * using WAProto's `audioStickerMessage` (field 134) / `StickerMessage` audio field.
 * Never sends a separate standalone audio message.
 */
async function sendSoundSticker(conn, from, stickerBuffer, audioBuffer, mek, isAnimated) {
    const audioProtoField = getStickerAudioProtoField();
    const hasAudioStickerWrapper = ensureAudioStickerProtoField();

    if (
        (hasAudioStickerWrapper || audioProtoField) &&
        baileys?.prepareWAMessageMedia &&
        baileys?.generateWAMessageFromContent
    ) {
        const stickerMedia = await baileys.prepareWAMessageMedia(
            { sticker: stickerBuffer },
            { upload: conn.waUploadToServer }
        );
        const audioMedia = await baileys.prepareWAMessageMedia(
            { audio: audioBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: false },
            { upload: conn.waUploadToServer }
        );

        if (stickerMedia?.stickerMessage && audioMedia?.audioMessage) {
            stickerMedia.stickerMessage.isAnimated = Boolean(isAnimated);

            if (audioProtoField) {
                stickerMedia.stickerMessage[audioProtoField] = audioMedia.audioMessage;
            }

            const payload = hasAudioStickerWrapper
                ? {
                    audioStickerMessage: {
                        message: {
                            stickerMessage: stickerMedia.stickerMessage,
                            ...(audioProtoField ? {} : { audioMessage: audioMedia.audioMessage })
                        }
                    }
                }
                : { stickerMessage: stickerMedia.stickerMessage };

            const waMsg = baileys.generateWAMessageFromContent(
                from,
                payload,
                { userJid: conn.user?.id, quoted: mek }
            );
            await conn.relayMessage(from, waMsg.message, { messageId: waMsg.key.id });
            return { mode: 'sound-sticker' };
        }
    }

    // If WAProto/Baileys does not support sound sticker encoding at all, send sticker only
    await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });
    return { mode: 'sticker-only' };
}

cmd({
    pattern: 'sticker',
    alias: ['s', 'stic', 'soundsticker'],
    desc: global.LANG?.converters?.STICKER_DESC || 'Convert image, video, GIF, or audio to sticker',
    category: 'converters',
    react: '🎨',
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sticker-'));
    let mediaPath = null;

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

        await reply('🎨 Creating sticker...');

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

        // Optional custom packname | author via command text: `.s Pack | Author`
        let packname = global.packname || 'SYAM STICKERS';
        let author = global.author || 'SYAM';
        if (q && q.trim()) {
            if (q.includes('|')) {
                const parts = q.split('|');
                packname = parts[0].trim() || packname;
                author = parts[1].trim();
            } else {
                packname = q.trim();
            }
        }

        let stickerBuffer;
        let audioBuffer = null;
        let isAnimated = false;

        if (target.kind === 'image') {
            const outPath = path.join(tempDir, 'static.webp');
            stickerBuffer = await createStaticSticker(mediaPath, outPath);
        } else if (target.kind === 'gif' || target.kind === 'video') {
            isAnimated = true;
            const webpPath = path.join(tempDir, 'animated.webp');
            stickerBuffer = await createAnimatedSticker(mediaPath, webpPath);

            if (target.kind === 'video') {
                const audioPath = path.join(tempDir, 'audio.ogg');
                try {
                    await extractAudio(mediaPath, audioPath);
                    const extracted = await fs.promises.readFile(audioPath);
                    if (extracted.length > 0) audioBuffer = extracted;
                } catch (err) {
                    console.log('[STICKER] No audio track in video:', err.message);
                }
            }
        } else if (target.kind === 'audio') {
            isAnimated = true;
            const audioPath = path.join(tempDir, 'audio.ogg');
            const webpPath = path.join(tempDir, 'audio_vis.webp');

            await extractAudio(mediaPath, audioPath);
            audioBuffer = await fs.promises.readFile(audioPath);
            if (!audioBuffer.length) {
                throw new Error('Audio track is empty.');
            }
            stickerBuffer = await createAudioVisualizerSticker(mediaPath, webpPath);
        } else if (target.kind === 'sticker') {
            isAnimated = Boolean(target.isAnimated);
            stickerBuffer = await fs.promises.readFile(mediaPath);
        }

        stickerBuffer = await addStickerExif(stickerBuffer, packname, author);

        if (audioBuffer) {
            const result = await sendSoundSticker(conn, from, stickerBuffer, audioBuffer, mek, isAnimated);
            if (result.mode === 'sound-sticker') {
                return reply('✅ Sound sticker sent!');
            }
            return reply('✅ Sticker sent! (Your Baileys WAProto build does not support embedded sound stickers yet.)');
        }

        await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });
        return reply(isAnimated ? '✅ Animated sticker sent!' : '✅ Sticker created successfully!');
    } catch (error) {
        console.error('[STICKER ERROR]', error);
        return reply('❌ Sticker Error: ' + error.message);
    } finally {
        if (mediaPath) {
            try {
                await fs.promises.unlink(mediaPath);
            } catch (_) {}
        }
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (_) {}
    }
});
