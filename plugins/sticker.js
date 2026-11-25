
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');

const execFileAsync = promisify(execFile);

let sharp;
try {
    sharp = require('sharp');
} catch (_) {
    sharp = null;
}

const MAX_VIDEO_SECONDS = 5;

async function ffmpeg(args) {
    await execFileAsync('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        ...args
    ]);
}

async function createAnimatedSticker(input, output) {
    await ffmpeg([
        '-i', input,
        '-t', String(MAX_VIDEO_SECONDS),
        '-an',
        '-vf',
        'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-loop', '0',
        '-vsync', '0',
        output
    ]);
}

async function extractAudio(input, output) {
    await ffmpeg([
        '-i', input,
        '-t', '10',
        '-vn',
        '-ac', '1',
        '-ar', '48000',
        '-c:a', 'libopus',
        '-b:a', '64k',
        '-f', 'ogg',
        output
    ]);
}

async function addStickerExif(buffer) {
    try {
        const { Image } = require('node-webpmux');

        const img = new Image();
        await img.load(buffer);

        const metadata = {
            'sticker-pack-id':
                'com.snowcorp.stickerly.android.stickercontentprovider',
            'sticker-pack-name':
                global.packname || 'SYAM STICKERS',
            'sticker-pack-publisher':
                global.author || 'SYAM',
            emojis: ['❤️']
        };

        const json = Buffer.from(
            JSON.stringify(metadata),
            'utf8'
        );

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

cmd({
    pattern: 'sticker',
    alias: ['s', 'stic'],
    desc: global.LANG.sticker.STICKER_DESC,
    category: 'converters',
    react: '🎨',
    filename: __filename

}, async (conn, mek, m, { from, reply }) => {

    const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'sticker-')
    );

    let mediaPath;

    try {
        const messageType =
            m.type || Object.keys(m.message || {})[0];

        const quotedType =
            m.quoted && m.quoted.type;

        const directImage = messageType === 'imageMessage';
        const directVideo = messageType === 'videoMessage';

        const quotedImage = quotedType === 'imageMessage';
        const quotedVideo = quotedType === 'videoMessage';

        if (
            !directImage &&
            !directVideo &&
            !quotedImage &&
            !quotedVideo
        ) {
            return reply(
                '❌ Reply to an image or video with .s'
            );
        }

        await reply('🎨 Creating sticker...');

        // Download media
        if (directImage || directVideo) {
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

        const isVideo = directVideo || quotedVideo;

        let stickerBuffer;
        let audioBuffer = null;

        // VIDEO STICKER
        if (isVideo) {

            const webpPath = path.join(
                tempDir,
                'animated.webp'
            );

            const audioPath = path.join(
                tempDir,
                'audio.ogg'
            );

            // Convert video to animated WebP
            await createAnimatedSticker(
                mediaPath,
                webpPath
            );

            stickerBuffer = await fs.promises.readFile(
                webpPath
            );

            // Extract video audio if available
            try {
                await extractAudio(mediaPath, audioPath);

                audioBuffer = await fs.promises.readFile(
                    audioPath
                );

                if (!audioBuffer.length) {
                    audioBuffer = null;
                }

            } catch (error) {
                console.log(
                    '[STICKER] No audio track:',
                    error.message
                );
            }

        } else {

            // IMAGE STICKER
            if (!sharp) {
                throw new Error(
                    'Install sharp: npm install sharp'
                );
            }

            const inputBuffer = await fs.promises.readFile(
                mediaPath
            );

            stickerBuffer = await sharp(inputBuffer)
                .rotate()
                .resize(512, 512, {
                    fit: 'contain',
                    background: {
                        r: 0,
                        g: 0,
                        b: 0,
                        alpha: 0
                    }
                })
                .webp({
                    quality: 80
                })
                .toBuffer();
        }

        // Add sticker metadata
        stickerBuffer = await addStickerExif(
            stickerBuffer
        );

        // SOUND STICKER ATTEMPT
        if (isVideo && audioBuffer) {
            try {
                await conn.sendMessage(
                    from,
                    {
                        sticker: stickerBuffer
                    },
                    {
                        quoted: mek,

                        // Requires a Baileys implementation
                        // that explicitly supports sound stickers.
                        stickerAudio: {
                            audio: audioBuffer,
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt: false
                        }
                    }
                );

                return reply(
                    '✅ Animated sound sticker sent!'
                );

            } catch (error) {
                console.log(
                    '[STICKER] Sound sticker unsupported:',
                    error.message
                );
            }
        }

        // NORMAL STICKER FALLBACK
        await conn.sendMessage(
            from,
            {
                sticker: stickerBuffer
            },
            {
                quoted: mek
            }
        );

        if (isVideo) {
            return reply(
                audioBuffer
                    ? '✅ Animated sticker sent. Sound integration is not supported by your current Baileys version.'
                    : '✅ Animated sticker sent!'
            );
        }

        return reply('✅ Sticker created successfully!');

    } catch (error) {

        console.error('[STICKER ERROR]', error);

        return reply(
            '❌ Sticker Error: ' + error.message
        );

    } finally {

        if (mediaPath) {
            try {
                await fs.promises.unlink(mediaPath);
            } catch (_) {}
        }

        try {
            await fs.promises.rm(
                tempDir,
                {
                    recursive: true,
                    force: true
                }
            );
        } catch (_) {}
    }
});
