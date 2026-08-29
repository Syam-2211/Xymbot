const { cmd } = require('../command');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "video",
    alias: ["mp4", "v", "ytv"],
    react: "🎥",
    desc: global.LANG.scrapers.VIDEO_DESC || "Download a video",
    category: "scrapers",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!q) return reply(global.LANG.scrapers.NEED_VIDEO || "Please provide a video name!");

        reply(global.LANG.scrapers.SEARCHING || "🔍 Searching...");

        const search = await yts(q);
        const data = search.all[0];
        if (!data) return reply("❌ No results found for your query.");
        const url = data.url;

        let caption = `
*${global.LANG.scrapers.YTS_RESULTS || "YOUTUBE VIDEO DOWNLOADER"}*

*Title:* ${data.title}
*Duration:* ${data.timestamp}
*Views:* ${data.views}
*URL:* ${data.url}

*${global.LANG.scrapers.UPLOADING_SONG || "Downloading video..."}*
`;

        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: caption 
        }, { quoted: mek });

        // Filter for MP4 formats with audio and video
        const stream = ytdl(url, { filter: (format) => format.container === 'mp4' && format.hasAudio && format.hasVideo });
        let tmpFile = path.join(__dirname, '../tmp', `${Date.now()}.mp4`);
        
        if (!fs.existsSync(path.join(__dirname, '../tmp'))) {
            fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
        }

        const writeStream = fs.createWriteStream(tmpFile);
        stream.pipe(writeStream);

        writeStream.on('finish', async () => {
            try {
                // Send Video
                await conn.sendMessage(from, { 
                    video: fs.readFileSync(tmpFile), 
                    caption: `🎥 *${data.title}*`,
                    mimetype: "video/mp4" 
                }, { quoted: mek });

                // Cleanup
                fs.unlinkSync(tmpFile);
            } catch (err) {
                reply("❌ Failed to send video.");
            }
        });

        writeStream.on('error', (err) => {
            console.error(err);
            reply("❌ Error writing the video file.");
        });

    } catch (e) {
        console.error(e);
        reply("❌ Error processing request. YouTube may be blocking downloads right now.");
    }
});
