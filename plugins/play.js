const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');
const yts = require('yt-search'); 

cmd({
    pattern: "play",
    alias: ["song", "music", "ytmp3"],
    react: "🎧",
    desc: "Download song from YouTube",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!q) return reply("Please give me a song name! \nExample: .play Despacito");

        reply("🔎 *Searching for your song...*");

        const search = await yts(q);
        if (!search.all || search.all.length === 0) return reply("❌ Song not found!");
        
        const data = search.all[0];
        const url = data.url;

        let caption = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *MUSIC PLAYER*

🎵 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
👁️ *Views:* ${data.views}
📅 *Uploaded:* ${data.ago}
🔗 *Link:* ${url}

👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
Downloading audio... Please wait! 🎧
`;

        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: caption 
        }, { quoted: mek });

        // Using Siputzx Free API (widipe is dead)
        let down = await fetchJson(`https://api.siputzx.my.id/api/d/ytmp3?url=${url}`);
        
        if (!down.data || !down.data.dl) return reply("❌ Error: Could not download audio. Try another song.");

        await conn.sendMessage(from, { 
            audio: { url: down.data.dl }, 
            mimetype: "audio/mpeg" 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e.message);
    }
});
