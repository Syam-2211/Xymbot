const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

const blockedChatsFile = path.join(__dirname, '../database/blocked_chats.json');

function saveBlockedChats() {
    try {
        const dir = path.dirname(blockedChatsFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(blockedChatsFile, JSON.stringify(global.blockedChats, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save blocked chats:', error);
        return false;
    }
}

cmd({
    pattern: "blockchat",
    alias: ["bchat"],
    react: "🚫",
    desc: "Block the bot from running commands in this chat (except for mentions).",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply, args }) => {
    if (!isOwner) return reply("❌ Only the owner can use this command.");
    
    let targetChat = from;
    if (args[0]) {
        targetChat = args[0];
        if (!targetChat.includes('@')) {
            targetChat += targetChat.length > 15 ? '@g.us' : '@s.whatsapp.net';
        }
    }

    if (!global.blockedChats) global.blockedChats = [];

    if (global.blockedChats.includes(targetChat)) {
        return reply(`⚠️ This chat (${targetChat}) is already blocked!`);
    }

    global.blockedChats.push(targetChat);
    if (saveBlockedChats()) {
        reply(`✅ *Chat Blocked!*\n\nThe bot will now ignore all commands in ${targetChat}, except for mentions or commands from the owner.`);
    } else {
        reply("❌ Failed to save blocked chats to database.");
    }
});

cmd({
    pattern: "unblockchat",
    alias: ["ubchat"],
    react: "✅",
    desc: "Unblock the bot in this chat.",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply, args }) => {
    if (!isOwner) return reply("❌ Only the owner can use this command.");
    
    let targetChat = from;
    if (args[0]) {
        targetChat = args[0];
        if (!targetChat.includes('@')) {
            targetChat += targetChat.length > 15 ? '@g.us' : '@s.whatsapp.net';
        }
    }

    if (!global.blockedChats) global.blockedChats = [];

    if (!global.blockedChats.includes(targetChat)) {
        return reply(`⚠️ This chat (${targetChat}) is not currently blocked!`);
    }

    global.blockedChats = global.blockedChats.filter(chat => chat !== targetChat);
    
    if (saveBlockedChats()) {
        reply(`✅ *Chat Unblocked!*\n\nThe bot will now respond to commands in ${targetChat} normally.`);
    } else {
        reply("❌ Failed to save blocked chats to database.");
    }
});
