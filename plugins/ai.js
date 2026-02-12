const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "ai",
    alias: ["gpt", "gemini", "bot"],
    react: "🧠",
    desc: "Chat with AI (GPT/Gemini)",
    category: "ai",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // 1. Check if the user typed a question
        if (!q) return reply("Hey User! 👋 What do you want to ask me? \n\nExample: *.ai Who is the richest person in the world?*");

        // 2. Notify the user that the bot is "thinking"
        reply("Thinking... 🤔");

        // 3. Fetch response from a Free AI API (Using Hercai or similar)
        // This API is free and very popular for WhatsApp bots
        let data = await fetchJson(`https://api.hercai.tech/v3/hercai?question=${q}`);
        
        // 4. Send the answer
        return reply(`🤖 *𝑆𝑌𝛥𝛭.3𝐹𝛸 Ai:*\n\n${data.reply}`);

    } catch (e) {
        console.log(e);
        // Fallback: If the first API fails, try a backup (Simple GPT)
        try {
            let backupData = await fetchJson(`https://widipe.com/openai?text=${q}`);
            return reply(`🤖 *𝑆𝑌𝛥𝛭.3𝐹𝛸 Ai:*\n\n${backupData.result}`);
        } catch (e2) {
            reply("⚠️ Sorry, my brain is offline right now. Try again later!");
        }
    }
});

