const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "menu",
    react: "🦅", // Eagle for Aquila
    desc: "Shows the main menu",
    category: "main",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // --- CONFIGURATION ---
        const botName = "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊";
        const ownerName = "🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓"; // Change to your name
        const version = "9.9.9.9.9";
        
        // --- MENU DESIGN ---
        let menu = `
╔═══════ ✧ *${botName}* ✧ ═══════╗
║ *Créateur* : ${ownerName}
║ *Version* : ${version}
║ *Uptime* : ${runtime(process.uptime())}
╚═══════════════════════════════════╝

📞 *Contact* : wa.me/${ownerName.replace(/\D/g,'')}
✨ *Bienvenue ${pushname}!*

═══════════════════════════════════════
🌟 *Commandes Générales* 🌟
═══════════════════════════════════════
│ *.help* 📜 Afficher ce menu
│ *.ping* 🏓 Vérifier la vitesse
│ *.alive* ✅ Le bot est-il en ligne?
╰──────────────────────────────────────╯

═══════════════════════════════════════
🎨 *Multimédia* 🎨
═══════════════════════════════════════
│ *.sticker* 🖼️ Créer un sticker
│ *.img* 🖼️ Sticker vers image
│ *.tiktok* 📹 Télécharger TikTok
│ *.song* 🎵 Télécharger musique
╰──────────────────────────────────────╯

═══════════════════════════════════════
👑 *Gestion Groupe* 👑
═══════════════════════════════════════
│ *.kick* 🚪 Expulser membre
│ *.add* ➕ Ajouter membre
│ *.promote* ⬆️ Promouvoir admin
│ *.demote* ⬇️ Rétrograder admin
│ *.hidetag* 🔔 Taguer tout le monde
╰──────────────────────────────────────╯

═══════════════════════════════════════
🤖 *IA & Outils* 🤖
═══════════════════════════════════════
│ *.ai* 💬 Parler avec l'IA
│ *.gpt* 🧠 ChatGPT
│ *.img* 🎨 Créer image IA
╰──────────────────────────────────────╯

╔═══════════════════════════════════╗
║ *🚀 Plongez dans l'aventure !* 😎
╚═══════════════════════════════════╝
`;

        // --- SENDING THE MENU ---
        // You can change 'image' to 'video' if you have a video link!
        await conn.sendMessage(from, { 
            image: { url: "https://files.catbox.moe/mev5cq.jpeg" }, // Your Bot's Image Link
            caption: menu 
        }, { quoted: mek });

    } catch (e) {
        reply('*Error:* ' + e);
        console.log(e);
    }
});

