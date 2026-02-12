let handler = async (m, { conn, participants, action, isBotAdmin }) => {
    // Your verified owner number
    const ownerNumber = '919947121619@s.whatsapp.net';

    if (action === 'add' && participants.includes(ownerNumber)) {
        if (!isBotAdmin) return; // Bot needs to be admin to promote others

        await conn.groupParticipantsUpdate(m.chat, [ownerNumber], 'promote');
        await conn.reply(m.chat, `👑 *Owner Detected:* @${ownerNumber.split('@')[0]} has been automatically promoted to Admin.\n\n_Greetings from 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊_`, m, { mentions: [ownerNumber] });
    }
};

handler.group = true;
module.exports = handler;

