const fs = require('fs');
const path = require('path');
const { Image } = require('node-webpmux');
const crypto = require('crypto');

async function addExif(webpBuffer, packname, author) {
    const img = new Image();
    await img.load(webpBuffer);

    const json = {
        'sticker-pack-id': 'com.snowcorp.stickerly.android.stickercontentprovider b5e7275f-f1de-4137-961f-57becfad34f2',
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        'emojis': ['❤️']
    };

    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    img.exif = exif;

    const tmpPath = path.join(__dirname, '../tmp', `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    await img.save(tmpPath);
    const modifiedBuffer = fs.readFileSync(tmpPath);
    fs.unlinkSync(tmpPath);
    return modifiedBuffer;
}

let handler = async (m, { conn, args, reply }) => {
    if (!m.quoted || (m.quoted.type !== 'stickerMessage' && m.quoted.type !== 'audioMessage')) {
        return reply('❌ Please reply to a sticker or an audio file to steal it!');
    }

    // Default pack and author
    let packname = 'My pack';
    let author = global.ownerName;

    if (args.length > 0) {
        let text = args.join(' ');
        if (text.includes('|')) {
            let parts = text.split('|');
            packname = parts[0].trim();
            author = parts[1].trim();
        } else {
            packname = text;
            author = '';
        }
    }

    try {
        if (m.quoted.type === 'stickerMessage') {
            reply('🎨 *Stealing sticker...*');
            const buffer = await m.quoted.download();
            const modifiedSticker = await addExif(buffer, packname, author);
            await conn.sendMessage(m.chat, { sticker: modifiedSticker }, { quoted: m });
        } else if (m.quoted.type === 'audioMessage') {
            reply('🎵 *Stealing audio...*');
            const filePath = await m.quoted.download();
            const audioBuffer = fs.readFileSync(filePath);
            
            const thumbPath = path.join(__dirname, '../assets/mention/thumb.jpg');
            let thumb = null;
            if (fs.existsSync(thumbPath)) {
                thumb = fs.readFileSync(thumbPath);
            }

            const { tagAudio } = require('./audioUtil.js');
            let taggedMp3 = await tagAudio(audioBuffer, packname, author, thumb || Buffer.alloc(0));

            await conn.sendMessage(m.chat, {
                audio: taggedMp3,
                mimetype: 'audio/mpeg',
                ptt: false, // Ensure it's sent as a regular audio track
                id3Tagged: true // Bypass the global interceptor in index.js
            }, { quoted: m });
            
            // Cleanup the temporary file
            try { fs.unlinkSync(filePath); } catch (e) {}
        }
    } catch (e) {
        console.error(e);
        reply('❌ Failed to steal media.');
    }
};

handler.help = ['take <name> | <author>'];
handler.tags = ['fun'];
handler.command = /^(take)$/i;

module.exports = handler;
