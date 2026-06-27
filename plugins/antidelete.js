let handler = async (m, { conn }) => {
    if (!global.db.data.chats[m.chat].antidelete) return;
    if (m.mtype === 'protocolMessage') {
        let key = m.message.protocolMessage.key;
        let msg = conn.serializeM(await conn.loadMessage(key.id));
        if (!msg) return;
        
        await conn.sendMessage(m.chat, { text: `🛡️ *Anti-Delete Detected*\n\n*Sender:* @${msg.sender.split('@')[0]}\n*Type:* ${msg.mtype}`, mentions: [msg.sender] }, { quoted: msg });
        await conn.copyNForward(m.chat, msg, false);
    }
};
module.exports = handler;

