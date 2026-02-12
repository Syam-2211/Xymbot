let handler = async (m, { conn }) => {
    const ownerNumber = '919947121619'; // Your number
    const ownerName = '🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓'; // Your name
    
    // Rotating images for the Ad-style VCard
    const images = [
        'https://telegra.ph/file/your-image1.jpg',
        'https://telegra.ph/file/your-image2.jpg',
        'https://telegra.ph/file/your-image3.jpg'
    ];
    const randomImage = images[Math.floor(Math.random() * images.length)];

    // VCard Details
    const vcard = 'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                `FN:${ownerName}\n` +
                `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` +
                'END:VCARD';

    // Main message body with Donate/Social info
    let ownerMsg = `
👑 *OWNER & DEVELOPER* 👑
┠─👤 *Name:* ${ownerName}
┠─🤖 *Bot:* 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊
┕━━━━━━━━━━━━━━━━━━━

✨ *DONATE / SUPPORT* ✨
If you'd like to support the project, please reach out or follow me here:
┠─📸 *Instagram:* instagram.com/_mr.fro_ud_
┠─🐙 *GitHub:* github.com/143syam
┠─💬 *WhatsApp:* wa.me/${ownerNumber}
┕━━━━━━━━━━━━━━━━━━━

_Thank you for using my bot!_ ❤️
`.trim();

    // Send the VCard with the Ad-Style interface and text
    await conn.sendMessage(m.chat, {
        contacts: {
            displayName: ownerName,
            contacts: [{ vcard }]
        },
        text: ownerMsg,
        contextInfo: {
            externalAdReply: {
                title: `Contact & Support: ${ownerName}`,
                body: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 Official Developer",
                thumbnailUrl: randomImage,
                sourceUrl: `https://wa.me/${ownerNumber}`,
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: true
            }
        }
    }, { quoted: m });
};

handler.help = ['owner', 'donate'];
handler.tags = ['main'];
handler.command = /^(owner|creator|donate)$/i;

module.exports = handler;

