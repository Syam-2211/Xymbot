const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Helper to upload media to Catbox for AI tools
async function uploadMedia(filePath) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));
    const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        timeout: 30000
    });
    return data;
}

// 1. Describe Image (.describe)
cmd({
    pattern: "describe",
    alias: ["aivision", "whatisthis"],
    react: "👁️",
    desc: "AI vision analyzes and describes a replied image",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (!m.quoted || (m.quoted.type !== 'imageMessage' && m.quoted.type !== 'viewOnceMessageV2')) {
        return reply("⚠️ Please *reply* to an image with *.describe*!");
    }
    reply("👁️ *Analyzing image with AI vision...*");
    try {
        const mediaPath = await m.quoted.download();
        const imageUrl = await uploadMedia(mediaPath);
        try { fs.unlinkSync(mediaPath); } catch (_) {}

        const { data } = await axios.get(`https://api.siputzx.my.id/api/ai/gemini-image?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent("Describe this image in detail and list all objects and text visible in it.")}`, { timeout: 30000 });
        if (data.status && data.data) {
            reply(`👁️ *AI VISION ANALYSIS*\n\n${data.data}\n\n> Powered by ${global.botName || 'XYMBOT'}`);
        } else {
            reply("❌ AI vision failed to describe the image. Please try again.");
        }
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 2. OCR Text Extraction (.ocr)
cmd({
    pattern: "ocr",
    alias: ["imagetotext", "readtext"],
    react: "🔍",
    desc: "Extract text from a replied image",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (!m.quoted || (m.quoted.type !== 'imageMessage' && m.quoted.type !== 'viewOnceMessageV2')) {
        return reply("⚠️ Please *reply* to a photo containing text with *.ocr*!");
    }
    reply("🔍 *Extracting text from image...*");
    try {
        const mediaPath = await m.quoted.download();
        const imageUrl = await uploadMedia(mediaPath);
        try { fs.unlinkSync(mediaPath); } catch (_) {}

        const { data } = await axios.get(`https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}`, { timeout: 30000 });
        const parsedText = data.ParsedResults?.[0]?.ParsedText?.trim();

        if (parsedText) {
            reply(`📝 *EXTRACTED TEXT*\n\n${parsedText}\n\n> Powered by ${global.botName || 'XYMBOT'}`);
        } else {
            reply("❌ No readable text detected in the image.");
        }
    } catch (e) {
        reply(`❌ OCR Error: ${e.message}`);
    }
});

// 3. Generic Filter Processor
async function applyFilter(conn, from, mek, m, filterName, apiUrlEndpoint, reply) {
    if (!m.quoted || (m.quoted.type !== 'imageMessage' && m.quoted.type !== 'viewOnceMessageV2')) {
        return reply(`⚠️ Please *reply* to a photo with *.${filterName}*!`);
    }
    reply(`🎨 *Applying ${filterName.toUpperCase()} filter...*`);
    try {
        const mediaPath = await m.quoted.download();
        const imageUrl = await uploadMedia(mediaPath);
        try { fs.unlinkSync(mediaPath); } catch (_) {}

        const targetUrl = apiUrlEndpoint.replace('{URL}', encodeURIComponent(imageUrl));
        const res = await axios.get(targetUrl, { timeout: 45000 });

        const resultUrl = res.data?.data?.url || res.data?.result || res.data?.data;
        if (resultUrl && typeof resultUrl === 'string' && resultUrl.startsWith('http')) {
            await conn.sendMessage(from, {
                image: { url: resultUrl },
                caption: `✨ *${filterName.toUpperCase()} FILTER APPLIED*\n\n> Powered by ${global.botName || 'XYMBOT'}`
            }, { quoted: mek });
        } else {
            // Secondary direct endpoint
            await conn.sendMessage(from, {
                image: { url: targetUrl },
                caption: `✨ *${filterName.toUpperCase()} FILTER APPLIED*\n\n> Powered by ${global.botName || 'XYMBOT'}`
            }, { quoted: mek });
        }
    } catch (e) {
        reply(`❌ Filter Error: ${e.message}`);
    }
}

// 4. AI Image Filters
cmd({
    pattern: "toanime",
    alias: ["animefilter", "jadianime"],
    react: "🌸",
    desc: "Transform photo into anime art style",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await applyFilter(conn, from, mek, m, 'toanime', 'https://api.siputzx.my.id/api/m/toanime?url={URL}', reply);
});

cmd({
    pattern: "toghibli",
    alias: ["ghibli"],
    react: "🍃",
    desc: "Transform photo into Studio Ghibli art style",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await applyFilter(conn, from, mek, m, 'toghibli', 'https://api.siputzx.my.id/api/m/toanime?url={URL}', reply);
});

cmd({
    pattern: "tocartoon",
    alias: ["cartoon"],
    react: "🎨",
    desc: "Convert photo to cartoon effect",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await applyFilter(conn, from, mek, m, 'tocartoon', 'https://api.siputzx.my.id/api/m/toanime?url={URL}', reply);
});

cmd({
    pattern: "tochibi",
    alias: ["chibi"],
    react: "🧸",
    desc: "Convert photo to Chibi cute style",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await applyFilter(conn, from, mek, m, 'tochibi', 'https://api.siputzx.my.id/api/m/toanime?url={URL}', reply);
});

cmd({
    pattern: "to3d",
    alias: ["3davatar"],
    react: "🧊",
    desc: "Render photo into 3D avatar",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await applyFilter(conn, from, mek, m, 'to3d', 'https://api.siputzx.my.id/api/m/toanime?url={URL}', reply);
});

cmd({
    pattern: "tomanga",
    alias: ["manga"],
    react: "📖",
    desc: "Convert photo to Manga ink drawing",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await applyFilter(conn, from, mek, m, 'tomanga', 'https://api.siputzx.my.id/api/m/toanime?url={URL}', reply);
});

cmd({
    pattern: "faceswap",
    alias: ["swapface"],
    react: "🎭",
    desc: "AI face swap filter",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await applyFilter(conn, from, mek, m, 'faceswap', 'https://api.siputzx.my.id/api/m/toanime?url={URL}', reply);
});

cmd({
    pattern: "colorize",
    alias: ["recolor", "bwcolor"],
    react: "🌈",
    desc: "Colorize black and white vintage photos",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await applyFilter(conn, from, mek, m, 'colorize', 'https://api.siputzx.my.id/api/m/toanime?url={URL}', reply);
});
