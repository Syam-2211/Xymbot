const { cmd } = require('../command');
const yts = require('yt-search'); 
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "play",
    alias: ["song", "music", "ytmp3"],
    react: "🎶",
    desc: global.LANG.scrapers.SONG_DESC || "Download a song",
    category: "scrapers",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!q) return reply(global.LANG.scrapers.NEED_TEXT_SONG || "Please provide a song name!");

        reply(global.LANG.scrapers.SEARCHING || "🔍 Searching...");

        const search = await yts(q);
        const data = search.all[0];
        if (!data) return reply("❌ No results found for your query.");
        const url = data.url;

        let caption = `
*${global.LANG.scrapers.YTS_RESULTS || "YOUTUBE DOWNLOADER"}*

*Title:* ${data.title}
*Duration:* ${data.timestamp}
*Views:* ${data.views}
*URL:* ${data.url}

*${global.LANG.scrapers.UPLOADING_SONG || "Downloading audio..."}*
`;

        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: caption 
        }, { quoted: mek });

        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        let tmpFile = path.join(__dirname, '../tmp', `${Date.now()}.mp3`);
        
        // Ensure tmp folder exists
        if (!fs.existsSync(path.join(__dirname, '../tmp'))) {
            fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
        }

        const writeStream = fs.createWriteStream(tmpFile);
        stream.pipe(writeStream);

        writeStream.on('finish', async () => {
            try {
                // Send Audio
                await conn.sendMessage(from, { 
                    audio: fs.readFileSync(tmpFile), 
                    mimetype: "audio/mpeg" 
                }, { quoted: mek });

                // Cleanup
                fs.unlinkSync(tmpFile);
            } catch (err) {
                reply("❌ Failed to send audio.");
            }
        });

        writeStream.on('error', (err) => {
            console.error(err);
            reply("❌ Error writing the audio file.");
        });

    } catch (e) {
        console.error(e);
        reply("❌ Error processing request. YouTube may be blocking downloads right now.");
    }
});
