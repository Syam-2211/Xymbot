const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 1. Brat Aesthetic Sticker (.brat)
cmd({
    pattern: "brat",
    react: "🟢",
    desc: "Generate Brat aesthetic green sticker",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let text = q?.trim() || m.quoted?.text?.trim();
    if (!text) return reply("⚠️ Please provide text for the Brat sticker!\nExample: .brat party girl");
    reply("🟢 *Generating Brat sticker...*");
    try {
        const url = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}`;
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
        await conn.sendMessage(from, { sticker: Buffer.from(res.data) }, { quoted: mek });
    } catch (e) {
        // Fallback to text banner
        reply(`🟩 *[ BRAT ]*\n\n*${text.toLowerCase()}*`);
    }
});

// 2. Brat Video (.bratvid)
cmd({
    pattern: "bratvid",
    alias: ["bratvideo"],
    react: "🟢",
    desc: "Generate Brat kinetic typography video",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let text = q?.trim() || m.quoted?.text?.trim();
    if (!text) return reply("⚠️ Please provide text for the Brat video!\nExample: .bratvid club classics");
    reply("🟢 *Rendering Brat video...*");
    try {
        const url = `https://api.siputzx.my.id/api/m/bratvid?text=${encodeURIComponent(text)}`;
        await conn.sendMessage(from, { video: { url }, mimetype: 'video/mp4' }, { quoted: mek });
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 3. Quote Card Sticker (.qc)
cmd({
    pattern: "qc",
    alias: ["quotely"],
    react: "💬",
    desc: "Create Quotely chat sticker card",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, q, sender, pushname, reply }) => {
    let text = q?.trim() || (m.quoted ? m.quoted.text : '');
    if (!text) return reply("⚠️ Please provide text or reply to a message with *.qc*!");
    reply("💬 *Creating Quote Card...*");
    try {
        let avatarUrl = "https://i.ibb.co/2WzLyGk/profile.jpg";
        try {
            avatarUrl = await conn.profilePictureUrl(m.quoted ? m.quoted.sender : sender, 'image');
        } catch (_) {}

        const obj = {
            type: "quote",
            format: "png",
            backgroundColor: "#1b1429",
            width: 512,
            height: 768,
            scale: 2,
            messages: [{
                entities: [],
                avatar: true,
                from: {
                    id: 1,
                    name: (m.quoted ? m.quoted.pushName : pushname) || "User",
                    photo: { url: avatarUrl }
                },
                text: text,
                replyMessage: {}
            }]
        };

        const { data } = await axios.post('https://quotly.netorare.codes/generate', obj, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
        });

        const buffer = Buffer.from(data.result.image, 'base64');
        await conn.sendMessage(from, { sticker: buffer }, { quoted: mek });
    } catch (e) {
        reply(`❌ QC error: ${e.message}`);
    }
});

// 4. IG Story Banner (.storyig)
cmd({
    pattern: "storyig",
    alias: ["igstorymaker"],
    react: "📸",
    desc: "Create aesthetic Instagram story card",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, q, pushname, reply }) => {
    let text = q?.trim() || "Live Life Fully";
    reply("📸 *Generating IG Story Banner...*");
    try {
        const url = `https://api.siputzx.my.id/api/maker/story-ig?text=${encodeURIComponent(text)}&username=${encodeURIComponent(pushname || 'User')}`;
        await conn.sendMessage(from, { image: { url }, caption: `📸 *IG STORY BANNER*\n> Powered by ${global.botName || 'XYMBOT'}` }, { quoted: mek });
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 5. Blue Archive Logo (.balogo)
cmd({
    pattern: "balogo",
    alias: ["bluearchive"],
    react: "🔷",
    desc: "Generate Blue Archive style dual logo",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q || !q.includes('|')) return reply("⚠️ Format: `.balogo LeftText|RightText`\nExample: `.balogo Blue|Archive`");
    const [left, right] = q.split('|').map(s => s.trim());
    reply("🔷 *Generating Blue Archive Logo...*");
    try {
        const url = `https://api.siputzx.my.id/api/maker/ba-logo?textL=${encodeURIComponent(left)}&textR=${encodeURIComponent(right)}`;
        await conn.sendMessage(from, { image: { url }, caption: `🔷 *BLUE ARCHIVE LOGO*\n> Powered by ${global.botName || 'XYMBOT'}` }, { quoted: mek });
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 6. Fake WhatsApp Story (.fakestory)
cmd({
    pattern: "fakestory",
    alias: ["fakequote"],
    react: "📱",
    desc: "Generate fake status card",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, q, pushname, reply }) => {
    let text = q?.trim() || "Offline for reality.";
    reply("📱 *Generating Fake Story...*");
    try {
        const url = `https://api.siputzx.my.id/api/maker/quote?text=${encodeURIComponent(text)}&author=${encodeURIComponent(pushname || 'Anonymous')}`;
        await conn.sendMessage(from, { image: { url }, caption: `📱 *STATUS CARD*\n> Powered by ${global.botName || 'XYMBOT'}` }, { quoted: mek });
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 7. Fake Tweet (.faketweet)
cmd({
    pattern: "faketweet",
    alias: ["tweetfake"],
    react: "🐦",
    desc: "Generate realistic Twitter tweet banner",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, q, pushname, reply }) => {
    let text = q?.trim() || "Hello world from WhatsApp bot!";
    reply("🐦 *Generating Fake Tweet...*");
    try {
        const name = pushname || "User";
        const url = `https://api.siputzx.my.id/api/maker/tweet?text=${encodeURIComponent(text)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]/g, ''))}`;
        await conn.sendMessage(from, { image: { url }, caption: `🐦 *TWEET BANNER*\n> Powered by ${global.botName || 'XYMBOT'}` }, { quoted: mek });
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 8. Math Solver (.math)
cmd({
    pattern: "math",
    alias: ["calc", "hitung"],
    react: "🧮",
    desc: "Calculate mathematical expressions",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("⚠️ Please provide a math expression to solve!\nExample: .math 25 * 4 + 10 / 2 or .math sqrt(144)");
    try {
        // Sanitize mathematical expression safely
        const sanitized = q.replace(/[^0-9+\-*/().%^eEpiPIsqrtcstanglro ]/g, '')
            .replace(/\bpi\b/gi, 'Math.PI')
            .replace(/\bsqrt\b/gi, 'Math.sqrt')
            .replace(/\bsin\b/gi, 'Math.sin')
            .replace(/\bcos\b/gi, 'Math.cos')
            .replace(/\btan\b/gi, 'Math.tan');

        const result = Function(`"use strict"; return (${sanitized})`)();
        reply(`🧮 *MATH CALCULATOR*\n\n*Expression:* \`${q}\`\n*Result:* *${result}*\n\n> Powered by ${global.botName || 'XYMBOT'}`);
    } catch (e) {
        reply(`❌ Invalid math expression: ${q}`);
    }
});
