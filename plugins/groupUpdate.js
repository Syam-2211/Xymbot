const axios = require('axios');

// Random quotes for welcome/goodbye
const quotes = [
    "Every new friend is a new adventure! 🌟",
    "Welcome to the club! We are happy to have you here! 🎉",
    "A journey of a thousand miles begins with a single step. 🚶‍♂️",
    "Glad you made it! Let's make some great memories! 🎈",
    "The more the merrier! 🎊",
    "Good friends, good times, good vibes! ✨",
    "You belong here! Welcome to the family! 🏡"
];
const byeQuotes = [
    "Farewell! We will miss you! 😢",
    "Every parting is a form of death, as every reunion is a type of heaven. 🕊️",
    "Goodbye, my friend. May the force be with you! 🌌",
    "It's sad to see you go! Take care! 👋",
    "Parting is such sweet sorrow! 💔",
    "Hope our paths cross again soon! 🌟"
];

const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 🌅';
    if (hour < 17) return 'Good Afternoon ☀️';
    if (hour < 21) return 'Good Evening 🌇';
    return 'Good Night 🌙';
};

let handler = async (m, { conn, participants, action }) => {
    console.log(`🔔 [GROUP_UPDATE] Processing action '${action}' for ${participants.length} users in group ${m.chat}`);
    // If chat doesn't exist in DB, default to having welcome/goodbye enabled
    if (!global.db.data.chats[m.chat]) {
        global.db.data.chats[m.chat] = {
            welcome: true,
            goodbye: true,
            antidelete: false,
            antilink: false,
            autoadmin: false,
            autochat: false,
            sWelcome: '',
            sGoodbye: ''
        };
    }

    let chat = global.db.data.chats[m.chat];
    if (!chat) return;

    const groupName = m.metadata?.subject || 'the group';
    const totalMembers = m.metadata?.participants?.length || 0;
    const timeGreeting = getTimeGreeting();

    for (let rawUser of participants) {
        // Normalize user (in some Baileys versions it's an object with id or phoneNumber)
        let user = typeof rawUser === 'object' ? (rawUser.phoneNumber || rawUser.id) : rawUser;
        if (!user) continue;

        let pp = 'https://files.catbox.moe/nbn8w8.jpeg'; // Working fallback image
        try {
            pp = await conn.profilePictureUrl(user, 'image');
        } catch (e) { }

        const userTag = `@${user.split('@')[0]}`;

        const isWelcomeEnabled = chat.welcome !== false;
        const isGoodbyeEnabled = chat.goodbye !== false;
        const pushName = user.split('@')[0];

        if (action === 'add' && isWelcomeEnabled) {
            let txt = chat.sWelcome;

            if (txt) {
                txt = txt.replace('@user', userTag).replace('@group', groupName);
                await conn.sendMessage(m.chat, {
                    image: { url: pp },
                    caption: txt,
                    mentions: [user]
                });
            } else {
                const welcomeUrl = `https://api.siputzx.my.id/api/canvas/welcomev5?username=${pushName}&guildName=${encodeURIComponent(groupName)}&memberCount=${totalMembers}&avatar=${encodeURIComponent(pp)}&background=${encodeURIComponent('https://raw.githubusercontent.com/yuusuke1101/Yuugames/refs/heads/main/Alisa%20Mikahilovna%20Kujou%20(Alya).jpg')}&quality=50`;

                await conn.sendMessage(m.chat, {
                    text: (global.LANG?.greetings?.WELCOME_TEXT || `╭─❖ 「 *WELCOME* 」 ❖\n│ 👋 Hello @user\n│\n│ *@group* -ilekk Swaagatham!\n│\n│ 📊 Nee aanu member no : @count\n│\n│ Group description vaayikko\n│ Rules ellam follow cheyyane!\n╰───────────────`).replace('@user', `@${pushName}`).replace('@group', groupName).replace('@count', totalMembers),
                    contextInfo: {
                        mentionedJid: [user],
                        externalAdReply: {
                            title: `Welcome To ${groupName}`,
                            body: `Member ke ${totalMembers}`,
                            thumbnailUrl: welcomeUrl,
                            sourceUrl: "https://whatsapp.com/channel/0029Vb6rCGN1iUxVlXtqp707",
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                });
            }

        } else if (action === 'remove' && isGoodbyeEnabled) {
            let txt = chat.sGoodbye;

            if (txt) {
                txt = txt.replace('@user', userTag).replace('@group', groupName);
                await conn.sendMessage(m.chat, {
                    text: txt,
                    mentions: [user]
                });
            } else {
                const goodbyeUrl = `https://api.siputzx.my.id/api/canvas/goodbyev2?username=${pushName}&guildName=${encodeURIComponent(groupName)}&memberCount=${totalMembers}&avatar=${encodeURIComponent(pp)}&background=${encodeURIComponent('https://raw.githubusercontent.com/yuusuke1101/Yuugames/refs/heads/main/Alisa%20Mikahilovna%20Kujou%20(Alya).jpg')}`;

                await conn.sendMessage(m.chat, {
                    text: (global.LANG?.greetings?.GOODBYE_TEXT || `╭─❖ 「 *GOODBYE* 」 ❖\n│ 👋 Poyit vaa\n│ @user\n│\n│ Ivarem kaalam\n│ *@group* il\n│ Ninnathinu oru thanks!\n╰───────────────`).replace('@user', `@${pushName}`).replace('@group', groupName),
                    contextInfo: {
                        mentionedJid: [user],
                        externalAdReply: {
                            title: `See yaa Dari ${groupName}`,
                            body: `Member tersisa ${totalMembers}`,
                            thumbnailUrl: goodbyeUrl,
                            sourceUrl: "https://whatsapp.com/channel/0029Vb6rCGN1iUxVlXtqp707",
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                });
            }
        }
    }
};

module.exports = handler;
