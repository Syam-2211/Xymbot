let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin, isOwner, reply }) => {
    if (!m.isGroup) return reply('This command only works in groups!');
    if (!isAdmin && !isOwner) return reply('❌ This is for Admins/Owner only.');

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];
    let user = m.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[@\s]/g, '') + '@s.whatsapp.net' : null);

    switch (command) {
        case 'kick':
            if (!isBotAdmin) return reply('I need Admin to kick! 🛡️');
            if (!user) return reply('❌ Reply to or mention a user to kick!');
            try {
                await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
                await conn.sendMessage(m.chat, { text: `✅ Kicked @${user.split('@')[0]}`, mentions: [user] }, { quoted: m });
            } catch (err) {
                reply('❌ Failed to kick user. They might already be removed, or I lack permissions.');
            }
            break;

        case 'add':
            if (!isBotAdmin) return reply('I need Admin to add users! 🛡️');
            if (!user) return reply('❌ Reply to a message or type the number to add!\nExample: .add 919876543210');
            try {
                const response = await conn.groupParticipantsUpdate(m.chat, [user], 'add');
                if (response[0]?.status === '403') {
                    reply('❌ Failed to add user. Their privacy settings prevent them from being added by me! (Error 403)');
                } else if (response[0]?.status === '409') {
                    reply('❌ User is already in the group! (Error 409)');
                } else {
                    await conn.sendMessage(m.chat, { text: `✅ Added @${user.split('@')[0]}`, mentions: [user] }, { quoted: m });
                }
            } catch (err) {
                reply('❌ Failed to add user. Check the number and try again.');
            }
            break;

        case 'promote':
            if (!isBotAdmin) return reply('I need Admin to promote! 🔼');
            if (!user) return reply('❌ Reply to or mention a user to promote!');
            await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
            await conn.sendMessage(m.chat, { text: `✅ Promoted @${user.split('@')[0]}`, mentions: [user] }, { quoted: m });
            break;

        case 'demote':
            if (!isBotAdmin) return reply('I need Admin to demote! 🔽');
            if (!user) return reply('❌ Reply to or mention a user to demote!');
            await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
            await conn.sendMessage(m.chat, { text: `✅ Demoted @${user.split('@')[0]}`, mentions: [user] }, { quoted: m });
            break;

        case 'antilink':
        case 'antidelete':
        case 'welcome':
        case 'goodbye': {
            let status = args[0] ? args[0].toLowerCase() : '';
            if (status === 'on') {
                chat[command] = true;
                reply(`✅ ${command.toUpperCase()} is now ON.`);
            } else if (status === 'off') {
                chat[command] = false;
                reply(`❌ ${command.toUpperCase()} is now OFF.`);
            } else {
                reply(`Usage: ${usedPrefix + command} on/off`);
            }
            break;
        }

        case 'setwelcome':
            chat.sWelcome = args.join(' ');
            reply('✅ Custom Welcome message updated.');
            break;

        case 'setgoodbye':
            chat.sGoodbye = args.join(' ');
            reply('✅ Custom Goodbye message updated.');
            break;

        case 'ginfo': {
            let info = `📊 *BOT GROUP SETTINGS*
┠─🛡 *Anti-Link:* ${chat.antilink ? '✅' : '❌'}
┠─🛡 *Anti-Delete:* ${chat.antidelete ? '✅' : '❌'}
┠─👋 *Welcome:* ${chat.welcome ? '✅' : '❌'}
┠─📤 *Goodbye:* ${chat.goodbye ? '✅' : '❌'}
┕━━━━━━━━━━━━━━━━━━━
👑 *Dev:* ${global.ownerName || 'Owner'}`.trim();
            reply(info);
            break;
        }
    }
};

handler.help = ['add', 'kick', 'promote', 'demote', 'antilink', 'antidelete', 'welcome', 'goodbye', 'ginfo'];
handler.tags = ['admin'];
handler.command = /^(add|kick|promote|demote|antilink|antidelete|welcome|goodbye|setwelcome|setgoodbye|ginfo)$/i;
handler.group = true;

module.exports = handler;
