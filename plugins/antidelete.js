let handler = async (m, { conn }) => {
    if (!global.db.data.chats[m.chat].antidelete) return;
    if (m.mtype === 'protocolMessage') {
        let key = m.message.protocolMessage.key;
        let msg = conn.serializeM(await conn.loadMessage(key.id));
        if (!msg) return;
        
        await conn.reply(m.chat, `🛡️ *Anti-Delete Detected*\n\n*Sender:* @${msg.sender.split('@')[0]}\n*Type:* ${msg.mtype}`, msg, { mentions: [msg.sender] });
        await conn.copyNForward(m.chat, msg, false);
    }
};
module.exports = handler;

