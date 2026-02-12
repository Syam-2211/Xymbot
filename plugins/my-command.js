const { cmd } = require('../lib'); // This loads the command handler

// COMMAND: .catalogue
cmd({
    pattern: "catalogue",        // The command name
    desc: "Show my products",    // Description for menu
    category: "general",         // Section in menu
    react: "🛒",                 // Emoji reaction
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        // --- 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓 ---
        const text = `
🛒 *MY PRODUCT CATALOG* 🛒
══════════════════
1. 📚 *Azeva Education*
2. 🔐 *Base64 Decoder*
3. 🤖 *Custom Bot Setup*

*Reply with a number to buy!*
        `;

        // Send the image + text (Caption)
        await conn.sendMessage(from, { 
            image: { url: "https://files.catbox.moe/mev5cq.jpeg" }, // Put your image link here
            caption: text 
        }, { quoted: mek });

    } catch (e) {
        reply('*Error:* ' + e);
        console.log(e);
    }
})

