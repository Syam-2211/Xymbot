const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const dbPath = path.join(__dirname, '../database/cmdaudio.json');
const audioDir = path.join(__dirname, '../database/cmdaudio');

// Load DB
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
if (!global.cmdAudio) {
    try {
        global.cmdAudio = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        global.cmdAudio = {};
    }
}

function saveDb() {
    fs.writeFileSync(dbPath, JSON.stringify(global.cmdAudio, null, 2));
}

const { exec } = require('child_process');

cmd({
    pattern: "setcmdaudio",
    react: "🎙️",
    desc: "Set a custom audio/voice note for a specific command.",
    category: "owner",
    use: ".setcmdaudio <command_name>",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, isOwner }) => {
    if (!isOwner) return reply("🚫 This command is for the owner only.");
    
    let cmdName = q.trim().toLowerCase();
    if (cmdName.startsWith('.')) cmdName = cmdName.slice(1);
    
    if (!cmdName) return reply("Please provide a command name. Example: .setcmdaudio ping (replying to an audio)");
    
    if (!m.quoted) return reply("Please reply to an audio/voice note with this command.");
    const type = m.quoted.type;
    
    if (type !== 'audioMessage' && type !== 'documentMessage' && type !== 'videoMessage') {
        return reply(`Please reply to an audio/voice note.`);
    }
    
    try {
        reply("⏳ Saving custom audio format...");
        let mediaPath = await m.quoted.download();
        
        const fileName = `${cmdName}.ogg`;
        const filePath = path.join(audioDir, fileName);
        
        // Convert to proper opus ogg for WhatsApp voice notes
        exec(`ffmpeg -i "${mediaPath}" -c:a libopus -b:a 48k -vbr on -compression_level 10 "${filePath}" -y`, (err) => {
            try { fs.unlinkSync(mediaPath); } catch (e) {}
            if (err) return reply("❌ Error converting audio. Please try again.");
            
            global.cmdAudio[cmdName] = filePath;
            saveDb();
            
            reply(`✅ Successfully set custom voice note for command: *${cmdName}*`);
        });
        
    } catch (e) {
        console.error(e);
        reply("🚫 Failed to save audio.");
    }
});

cmd({
    pattern: "delcmdaudio",
    react: "🗑️",
    desc: "Delete a custom audio for a specific command.",
    category: "owner",
    use: ".delcmdaudio <command_name>",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, isOwner }) => {
    if (!isOwner) return reply("🚫 This command is for the owner only.");
    
    let cmdName = q.trim().toLowerCase();
    if (cmdName.startsWith('.')) cmdName = cmdName.slice(1);
    
    if (!cmdName) return reply("Please provide a command name. Example: .delcmdaudio ping");
    
    if (global.cmdAudio[cmdName]) {
        try {
            if (fs.existsSync(global.cmdAudio[cmdName])) {
                fs.unlinkSync(global.cmdAudio[cmdName]);
            }
        } catch (e) {
            console.error(e);
        }
        delete global.cmdAudio[cmdName];
        saveDb();
        reply(`✅ Successfully deleted custom audio for command: *${cmdName}*`);
    } else {
        reply(`🚫 No custom audio found for command: *${cmdName}*`);
    }
});
