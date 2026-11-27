const { cmd } = require('../command');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getVideoApi(url) {
    const apis = [
        `https://api.vreden.web.id/api/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.nexray.web.id/downloader/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.giftedtech.my.id/api/download/dlmp4?apikey=gifted&url=${encodeURIComponent(url)}`
    ];
    for (const api of apis) {
        try {
            const { data } = await axios.get(api, { timeout: 20000 });
            const dl = data?.result?.download?.url || data?.result?.downloadUrl || data?.result?.url || data?.result?.download_url || data?.data?.download || data?.data?.dl || data?.result?.download;
            if (dl) return dl;
        } catch (_) {}
    }
    return null;
}

cmd({
    pattern: "video",
    alias: ["mp4", "v", "ytv"],
    react: "🎥",
    desc: global.LANG?.scrapers?.VIDEO_DESC || "Download a video",
    category: "scrapers",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!q) return reply(global.LANG?.scrapers?.NEED_VIDEO || "Please provide a video name!");

        reply(global.LANG?.scrapers?.SEARCHING || "🔍 Searching...");

        const search = await yts(q);
        const data = search.all[0];
        if (!data) return reply("❌ No results found for your query.");
        const url = data.url;

        let caption = `
*${global.LANG?.scrapers?.YTS_RESULTS || "YOUTUBE VIDEO DOWNLOADER"}*

*Title:* ${data.title}
*Duration:* ${data.timestamp}
*Views:* ${data.views}
*URL:* ${data.url}

*${global.LANG?.scrapers?.UPLOADING_SONG || "Downloading video..."}*
`.trim();

        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: caption 
        }, { quoted: mek });

        let downloaded = false;

        // Attempt 1: Direct ytdl stream
        try {
            const stream = ytdl(url, { filter: (format) => format.container === 'mp4' && format.hasAudio && format.hasVideo });
            let tmpFile = path.join(__dirname, '../tmp', `${Date.now()}.mp4`);
            
            if (!fs.existsSync(path.join(__dirname, '../tmp'))) {
                fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
            }

            const writeStream = fs.createWriteStream(tmpFile);

            await new Promise((resolve, reject) => {
                stream.pipe(writeStream);
                stream.on('error', reject);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            if (fs.existsSync(tmpFile) && fs.statSync(tmpFile).size > 1024) {
                await conn.sendMessage(from, { 
                    video: fs.readFileSync(tmpFile), 
                    caption: `🎥 *${data.title}*\n> Powered by ${global.botName || 'XYMBOT'}`,
                    mimetype: "video/mp4" 
                }, { quoted: mek });
                try { fs.unlinkSync(tmpFile); } catch (_) {}
                downloaded = true;
            }
        } catch (streamErr) {
            console.warn('ytdl video stream failed, attempting fallback API:', streamErr.message);
        }

        // Attempt 2: Fallback API if ytdl is blocked by YouTube
        if (!downloaded) {
            const fallbackVideoUrl = await getVideoApi(url);
            if (fallbackVideoUrl) {
                await conn.sendMessage(from, { 
                    video: { url: fallbackVideoUrl }, 
                    caption: `🎥 *${data.title}*\n> Powered by ${global.botName || 'XYMBOT'}`,
                    mimetype: "video/mp4" 
                }, { quoted: mek });
                downloaded = true;
            }
        }

        if (!downloaded) {
            reply("❌ Failed to download video. YouTube is currently rate-limiting this request. Please try again in a few moments.");
        }

    } catch (e) {
        console.error(e);
        reply("❌ Error processing request. YouTube may be blocking downloads right now.");
    }
});
