let handler = async (m, { conn, participants, action }) => {
    let chat = global.db.data.chats[m.chat];
    if (!chat) return;

    for (let user of participants) {
        let pp = 'https://telegra.ph/file/default.jpg';
        try { pp = await conn.profilePictureUrl(user, 'image'); } catch (e) {}

        if (action === 'add' && chat.welcome) {
            let txt = chat.sWelcome || 'Welcome @user to @group!';
            txt = txt.replace('@user', `@${user.split('@')[0]}`).replace('@group', m.metadata.subject);
            await conn.sendMessage(m.chat, { image: { url: pp }, caption: txt, mentions: [user] });
        } else if (action === 'remove' && chat.goodbye) {
            let txt = chat.sGoodbye || 'Goodbye @user, we will miss you!';
            txt = txt.replace('@user', `@${user.split('@')[0]}`);
            await conn.sendMessage(m.chat, { text: txt, mentions: [user] });
        }
    }
};
module.exports = handler;

