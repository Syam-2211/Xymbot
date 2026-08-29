let handler = async (m, { conn, args, isOwner }) => {
    if (!isOwner) {
        return await conn.sendMessage(m.chat, { text: '❌ *Only the owner can use this command!*' }, { quoted: m });
    }

    if (args[0] === 'add') {
        let target = m.message?.extendedTextMessage?.contextInfo?.participant;
        if (!target) return await conn.sendMessage(m.chat, { text: '❌ *Please reply to a user to add them as sudo!*\n\n_Example: Reply to someone with .sudo add_' }, { quoted: m });
        
        let num = target.split('@')[0];
        if (!global.owner.includes(num)) {
            global.owner.push(num);
            return await conn.sendMessage(m.chat, { text: `✅ *@${num} has been added as a Sudo User!*`, mentions: [target] }, { quoted: m });
        } else {
            return await conn.sendMessage(m.chat, { text: '⚠️ *User is already a Sudo User!*' }, { quoted: m });
        }
    } else if (args[0] === 'del') {
        let target = m.message?.extendedTextMessage?.contextInfo?.participant;
        if (!target) return await conn.sendMessage(m.chat, { text: '❌ *Please reply to a user to remove them from sudo!*\n\n_Example: Reply to someone with .sudo del_' }, { quoted: m });
        
        let num = target.split('@')[0];
        if (num === '919947121619') return await conn.sendMessage(m.chat, { text: '❌ *Cannot remove the main owner!*' }, { quoted: m });

        if (global.owner.includes(num)) {
            global.owner = global.owner.filter(n => n !== num);
            return await conn.sendMessage(m.chat, { text: `✅ *@${num} has been removed from Sudo Users!*`, mentions: [target] }, { quoted: m });
        } else {
            return await conn.sendMessage(m.chat, { text: '⚠️ *User is not a Sudo User!*' }, { quoted: m });
        }
    } else if (args[0] === 'list') {
        let text = '👑 *Sudo Users List* 👑\n\n';
        global.owner.forEach((num, i) => {
            text += `${i + 1}. @${num}\n`;
        });
        return await conn.sendMessage(m.chat, { text, mentions: global.owner.map(n => n + '@s.whatsapp.net') }, { quoted: m });
    }

    // Send a formatted text menu instead of a poll
    let menuText = `👑 *Sudo User Management* 👑\n\n` +
                   `Reply with one of the following commands:\n\n` +
                   `📋 \`.sudo list\` - List all Sudo Users\n` +
                   `🟢 \`.sudo add\` - Add a user (reply to them)\n` +
                   `🔴 \`.sudo del\` - Remove a user (reply to them)`;

    await conn.sendMessage(m.chat, { text: menuText }, { quoted: m });
};

handler.help = ['sudo'];
handler.tags = ['owner'];
handler.command = /^(sudo|addsudo|delsudo)$/i;

module.exports = handler;
