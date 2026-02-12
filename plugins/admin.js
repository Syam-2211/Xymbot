let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin, isOwner }) => {
    if (!m.isGroup) return m.reply('This command only works in groups!');
    if (!isAdmin && !isOwner) return m.reply('❌ This is for Admins/Owner only.');
    
    let chat = global.db.data.chats[m.chat];
    let user = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : (args[1] ? args[1].replace(/[@\s]/g, '') + '@s.whatsapp.net' : null));

    switch (command) {
        // --- MANUAL MODERATION ---
        case 'kick':
            if (!isBotAdmin) return m.reply('I need Admin to kick! 🛡️');
            await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
            break;

        case 'promote':
            if (!isBotAdmin) return m.reply('I need Admin to promote! 🔼');
            await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
            break;

        case 'demote':
            if (!isBotAdmin) return m.reply('I need Admin to demote! 🔽');
            await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
            break;

        // --- SECURITY & GREETING TOGGLES ---
        case 'antilink':
        case 'antidelete':
        case 'welcome':
        case 'goodbye':
            let feature = command;
            let status = args[0] ? args[0].toLowerCase() : '';
            if (status === 'on') {
                chat[feature] = true;
                m.reply(`✅ ${feature.toUpperCase()} is now ON.`);
            } else if (status === 'off') {
                chat[feature] = false;
                m.reply(`❌ ${feature.toUpperCase()} is now OFF.`);
            } else {
                m.reply(`Usage: ${usedPrefix + command} on/off`);
            }
            break;

        // --- CUSTOM TEXT CONFIG ---
        case 'setwelcome':
            chat.sWelcome = args.join(' ');
            m.reply('✅ Custom Welcome message updated.');
            break;

        case 'setgoodbye':
            chat.sGoodbye = args.join(' ');
            m.reply('✅ Custom Goodbye message updated.');
            break;

        // --- GROUP DASHBOARD ---
        case 'ginfo':
            let info = `
📊 *🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 SETTINGS*
┠─🛡 *Anti-Link:* ${chat.antilink ? '✅' : '❌'}
┠─🛡 *Anti-Delete:* ${chat.antidelete ? '✅' : '❌'}
┠─👋 *Welcome:* ${chat.welcome ? '✅' : '❌'}
┠─📤 *Goodbye:* ${chat.goodbye ? '✅' : '❌'}
┕━━━━━━━━━━━━━━━━━━━
👑 *Dev:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
`.trim();
            await conn.reply(m.chat, info, m);
            break;
    }
};

handler.help = ['kick', 'promote', 'demote', 'antilink', 'antidelete', 'welcome', 'goodbye', 'ginfo'];
handler.tags = ['admin'];
handler.command = /^(kick|promote|demote|antilink|antidelete|welcome|goodbye|setwelcome|setgoodbye|ginfo)$/i;
handler.group = true;

module.exports = handler;

