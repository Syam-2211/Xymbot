const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Helper function to download to tmp
async function downloadToTmp(url, extension) {
    if (!fs.existsSync(path.join(__dirname, '../tmp'))) {
        fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
    }
    const tmpFile = path.join(__dirname, '../tmp', `${Date.now()}.${extension}`);
    const writer = fs.createWriteStream(tmpFile);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tmpFile));
        writer.on('error', reject);
    });
}

// ============================
// 📸 INSTAGRAM DOWNLOADER POLL
// ============================
cmd({
    pattern: "instagram",
    alias: ["insta", "ig"],
    react: "📸",
    desc: "Download Instagram reels/posts/stories via Poll Menu",
    category: "download",
    filename: __filename
},
    async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
        try {
            let link = q;
            if (!link && m.quoted) {
                let quotedText = m.quoted.message?.conversation || m.quoted.message?.extendedTextMessage?.text || m.quoted.message?.imageMessage?.caption || m.quoted.message?.videoMessage?.caption || "";
                let match = quotedText.match(/(https?:\/\/[^\s]+)/);
                if (match) link = match[0];
            }

            if (!link) return reply("Please give me an Instagram link or reply to a message containing a link! \nExample: .insta https://www.instagram.com/p/...");

            let menuMsg = `📸 *INSTA DOWNLOAD MENU*\n\nSelect a download server by replying to this message with a number (1-5):\n\n1️⃣ Server 1 (Recommended)\n2️⃣ Server 2 (Fast)\n3️⃣ Server 3 (Alternative)\n4️⃣ Insta Story Download\n5️⃣ Manual Download (Scraper Fallback)\n\n(Link: ${link})`;
            await conn.sendMessage(from, { text: menuMsg }, { quoted: mek });

        } catch (e) {
            console.log(e);
            reply("🚫 Error fetching Instagram. Try again later.");
        }
    });

// Listener for numerical replies to the Insta menu
cmd({
    on: 'text',
    filename: __filename
},
    async (conn, mek, m, { from, body, reply }) => {
        try {
            if (!m.quoted) return;
            let quotedText = m.quoted.message?.conversation || m.quoted.message?.extendedTextMessage?.text || m.quoted.message?.imageMessage?.caption || m.quoted.message?.videoMessage?.caption || "";

            if (quotedText.includes("📸 *INSTA DOWNLOAD MENU*") && quotedText.includes("Select a download server")) {
                let match = quotedText.match(/\(Link: (https?:\/\/[^\s]+)\)/);
                if (!match) return;
                let url = match[1];
                let num = body.trim();

                let cmdText = "";
                if (num === '1') cmdText = `.igdlv1xym ${url}`;
                else if (num === '2') cmdText = `.igdlv1sneha ${url}`;
                else if (num === '3') cmdText = `.igdlv2 ${url}`;
                else if (num === '4') cmdText = `.igdlstory ${url}`;
                else if (num === '5') cmdText = `.igdlmanual ${url}`;

                if (cmdText) {
                    const participant = mek.key.participant || mek.key.remoteJid;
                    const mockMsg = {
                        key: {
                            remoteJid: mek.key.remoteJid,
                            fromMe: false,
                            id: mek.key.id + "_mock",
                            participant: participant
                        },
                        message: { conversation: cmdText },
                        messageTimestamp: Math.floor(Date.now() / 1000)
                    };
                    conn.ev.emit('messages.upsert', { messages: [mockMsg], type: 'notify' });
                } else {
                    reply("🚫 Invalid selection. Please reply with a number between 1 and 5.");
                }
            }
        } catch (e) { }
    });

// ============================
// 📸 HIDDEN INSTA COMMANDS
// ============================
const LOLHUMAN_API_KEY = "1d909ad2c4e08c28a6024982";

// Helper function to send all media items (used by all hidden commands)
async function sendInstaMedia(conn, from, mek, mediaUrls, caption) {
    if (!mediaUrls || mediaUrls.length === 0) {
        return await conn.sendMessage(from, { text: "🚫 Error: Could not fetch media. The content might be private or unavailable." }, { quoted: mek });
    }

    for (let url of mediaUrls) {
        let isVideo = url.includes('.mp4');
        let ext = isVideo ? 'mp4' : 'jpg';
        try {
            const tmpPath = await downloadToTmp(url, ext);
            if (isVideo) {
                await conn.sendMessage(from, { video: fs.readFileSync(tmpPath), caption: caption }, { quoted: mek });
            } else {
                await conn.sendMessage(from, { image: fs.readFileSync(tmpPath), caption: caption }, { quoted: mek });
            }
            fs.unlinkSync(tmpPath);
        } catch (e) {
            console.log(`Error downloading ${ext} to tmp:`, e.message);
            try {
                if (isVideo) {
                    await conn.sendMessage(from, { video: { url: url }, caption: caption }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, { image: { url: url }, caption: caption }, { quoted: mek });
                }
            } catch (fallbackErr) {
                console.log("Direct URL fallback failed:", fallbackErr.message);
            }
        }
    }
}

// 1. Insta download v1-xym (Betabotz)
cmd({ pattern: "igdlv1xym", filename: __filename },
    async (conn, mek, m, { from, q, reply }) => {
        reply("⏳ *Downloading via v1-xym...*");
        let mediaUrls = [];
        try {
            let data = await fetchJson(`https://api.betabotz.eu.org/api/download/igdowloader?apikey=Btz-aBimG&url=${encodeURIComponent(q)}`);
            if (data && data.status && data.message && Array.isArray(data.message)) {
                mediaUrls = data.message.map(v => v.url || v._url || v);
            } else if (data && data.result) {
                if (Array.isArray(data.result)) {
                    mediaUrls = data.result.map(v => v.url);
                } else if (data.result.url) {
                    mediaUrls = [data.result.url];
                }
            }
        } catch (err) {
            console.log("v1-xym (Betabotz) error:", err.message);
        }
        await sendInstaMedia(conn, from, mek, mediaUrls, "📸 *INSTA DOWNLOAD (Server 1)*");
    });

// 2. Insta download v1-sneha-bot (Betabotz v2)
cmd({ pattern: "igdlv1sneha", filename: __filename },
    async (conn, mek, m, { from, q, reply }) => {
        reply("⏳ *Downloading via Server 2...*");
        let mediaUrls = [];
        try {
            let data = await fetchJson(`https://api.betabotz.eu.org/api/download/igdowloader-v2?apikey=Btz-aBimG&url=${encodeURIComponent(q)}`);
            if (data && data.status && data.message && Array.isArray(data.message)) {
                mediaUrls = data.message.map(v => v.url || v._url || v);
            } else if (data && data.result) {
                if (Array.isArray(data.result)) {
                    mediaUrls = data.result.map(v => v.url || v._url || v);
                } else if (data.result.url) {
                    mediaUrls = [data.result.url];
                } else if (data.result._url) {
                    mediaUrls = [data.result._url];
                }
            }
        } catch (err) {
            console.log("v1-sneha-bot (Betabotz v2) error:", err.message);
        }
        await sendInstaMedia(conn, from, mek, mediaUrls, "📸 *INSTA DOWNLOAD (Server 2)*");
    });

// 3. Insta download v2 (Lolhuman v2)
cmd({ pattern: "igdlv2", filename: __filename },
    async (conn, mek, m, { from, q, reply }) => {
        reply("⏳ *Downloading via v2...*");
        let mediaUrls = [];
        if (LOLHUMAN_API_KEY && LOLHUMAN_API_KEY !== "YOUR_API_KEY_HERE") {
            try {
                let data = await fetchJson(`https://api.lolhuman.xyz/api/instagram2?apikey=${LOLHUMAN_API_KEY}&url=${encodeURIComponent(q)}`);
                if (data && data.status === 200 && data.result) {
                    if (Array.isArray(data.result)) mediaUrls = data.result;
                    else if (typeof data.result === 'string') mediaUrls = [data.result];
                }
            } catch (err) {
                console.log("v2 error:", err.message);
            }
        } else {
            return reply("🚫 Error: API Key is missing or invalid. Please check configuration.");
        }
        await sendInstaMedia(conn, from, mek, mediaUrls, "📸 *INSTA DOWNLOAD (Server 3)*");
    });

// 4. Insta Story Download (Lolhuman Story)
cmd({ pattern: "igdlstory", filename: __filename },
    async (conn, mek, m, { from, q, reply }) => {
        reply("⏳ *Downloading Story...*");
        let mediaUrls = [];

        // Attempt to extract username from story link (e.g., instagram.com/stories/username/123)
        let username = "";
        try {
            let match = q.match(/stories\/([^\/\?]+)/);
            if (match && match[1]) username = match[1];
        } catch (e) { }

        if (!username) {
            return reply("🚫 Please provide a valid Instagram Story link (must contain /stories/username).");
        }

        if (LOLHUMAN_API_KEY && LOLHUMAN_API_KEY !== "YOUR_API_KEY_HERE") {
            try {
                let data = await fetchJson(`https://api.lolhuman.xyz/api/igstory/${username}?apikey=${LOLHUMAN_API_KEY}`);
                if (data && data.status === 200 && data.result) {
                    if (Array.isArray(data.result)) mediaUrls = data.result;
                    else if (typeof data.result === 'string') mediaUrls = [data.result];
                }
            } catch (err) {
                console.log("story error:", err.message);
            }
        } else {
            return reply("🚫 Error: API Key is missing or invalid. Please check configuration.");
        }
        await sendInstaMedia(conn, from, mek, mediaUrls, "📸 *INSTA STORY DOWNLOAD*");
    });

// 5. Insta download Manual (ruhend-scraper)
cmd({ pattern: "igdlmanual", filename: __filename },
    async (conn, mek, m, { from, q, reply }) => {
        reply("⏳ *Downloading via Manual Scraper...*");
        let mediaUrls = [];
        try {
            const { igdl } = require('ruhend-scraper');
            let data = await igdl(q);
            if (data && Array.isArray(data)) {
                mediaUrls = data;
            } else if (data && data.url) {
                mediaUrls = [data.url];
            }
        } catch (err) {
            console.log("Manual Scraper Error:", err.message);
        }
        await sendInstaMedia(conn, from, mek, mediaUrls, "📸 *INSTA DOWNLOAD (Manual Scraper)*");
    });

// ============================
// 📘 FACEBOOK DOWNLOADER
// ============================
cmd({
    pattern: "facebook",
    alias: ["fb", "fbdl"],
    react: "📘",
    desc: "Download Facebook videos",
    category: "download",
    filename: __filename
},
    async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
        try {
            if (!q) return reply("Please give me a FB link! \nExample: .fb https://www.facebook.com/...");

            reply("⏳ *Downloading from Facebook...*");

            let videoUrl = "";

            // Method 1: @bochilteam/scraper
            try {
                const scraper = require('@bochilteam/scraper');
                let res = await scraper.facebookdl(q);
                if (res && res.length > 0) {
                    // Try to get HD, fallback to first available
                    videoUrl = res.find(v => v.quality === 'hd')?.url || res[0].url;
                }
            } catch (err) {
                console.log("bochilteam FB scraper error:", err.message);
            }

            // Method 2: ruhend-scraper
            if (!videoUrl) {
                try {
                    const ruhendScraper = require('ruhend-scraper');
                    let res = await ruhendScraper.fbdl(q);
                    if (res && res.data && res.data.length > 0) {
                        videoUrl = res.data.find(v => v.resolution === 'HD')?.url || res.data[0].url;
                    }
                } catch (err) {
                    console.log("Ruhend FB API error:", err.message);
                }
            }

            // Method 3: Siputzx Fallback API
            if (!videoUrl) {
                try {
                    let data = await fetchJson(`https://api.siputzx.my.id/api/d/facebook?url=${q}`);
                    if (data && data.data && data.data.downloads) {
                        const downloads = data.data.downloads;
                        videoUrl = downloads.find(u => u.quality.includes('HD'))?.url
                            || downloads.find(u => u.quality.includes('SD'))?.url
                            || downloads[0].url;
                    }
                } catch (err) {
                    console.log("FB Siputzx error:", err.message);
                }
            }

            if (!videoUrl) return reply("🚫 Error: Video not found, private, or Facebook blocked the server.");

            let caption = `
📘 *FB DOWNLOADER* 📘

👨‍💻 *Owner:* 👑 Sʏᴀᴍ ꜱᴇʀ ッ👑
`;

            // Download to TMP folder before sending
            try {
                const tmpPath = await downloadToTmp(videoUrl, 'mp4');

                await conn.sendMessage(from, {
                    video: fs.readFileSync(tmpPath),
                    caption: caption
                }, { quoted: mek });

                fs.unlinkSync(tmpPath); // Delete after sending
            } catch (e) {
                console.log("Error downloading FB to tmp:", e.message);
                // Ultimate Fallback wrapped in safe try/catch
                try {
                    await conn.sendMessage(from, {
                        video: { url: videoUrl },
                        caption: caption
                    }, { quoted: mek });
                } catch (fallbackErr) {
                    console.log("Direct FB URL fallback failed:", fallbackErr.message);
                    reply("🚫 Failed to send Facebook video. File might be too large.");
                }
            }

        } catch (e) {
            console.log(e);
            reply("🚫 Error fetching Facebook. Try again later.");
        }
    });
