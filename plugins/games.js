const { cmd } = require('../command');
const axios = require('axios');

// Game state in-memory
const activeGames = new Map();

// 1. Tic-Tac-Toe (.tictactoe)
cmd({
    pattern: "tictactoe",
    alias: ["ttt"],
    react: "🎮",
    desc: "Play Tic-Tac-Toe in chat",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
    let game = activeGames.get(from);
    if (!game || game.type !== 'ttt') {
        game = {
            type: 'ttt',
            board: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            turn: sender,
            playerX: sender,
            playerO: null,
            started: false
        };
        activeGames.set(from, game);
        return reply(`🎮 *TIC-TAC-TOE STARTED!*\n\n${renderTTT(game.board)}\n\n• Player 1: @${sender.split('@')[0]} (X)\n• Type \`.tictactoe join\` for Player 2 to join!\n• Or reply \`.tictactoe <1-9>\` to play!`);
    }

    if (q === 'join') {
        if (game.playerO) return reply("⚠️ Game already has 2 players!");
        if (game.playerX === sender) return reply("⚠️ You cannot play against yourself!");
        game.playerO = sender;
        game.started = true;
        return reply(`✅ @${sender.split('@')[0]} joined as Player O!\n\nIt is now @${game.turn.split('@')[0]}'s turn!\n${renderTTT(game.board)}`);
    }

    if (q === 'reset' || q === 'stop') {
        activeGames.delete(from);
        return reply("🛑 Tic-Tac-Toe game has been reset.");
    }

    const pos = parseInt(q);
    if (!pos || pos < 1 || pos > 9) {
        return reply(`Current Board:\n${renderTTT(game.board)}\n\nType \`.tictactoe <1-9>\` to place your mark, or \`.tictactoe reset\` to exit.`);
    }

    if (game.board[pos - 1] === '❌' || game.board[pos - 1] === '⭕') {
        return reply("❌ That spot is already taken!");
    }

    const mark = (game.turn === game.playerX) ? '❌' : '⭕';
    game.board[pos - 1] = mark;

    // Check winner
    if (checkTTTWinner(game.board, mark)) {
        activeGames.delete(from);
        return reply(`🎉 *GAME OVER! WINNER:* @${game.turn.split('@')[0]} (${mark})!\n\n${renderTTT(game.board)}`);
    }

    // Check draw
    if (game.board.every(cell => cell === '❌' || cell === '⭕')) {
        activeGames.delete(from);
        return reply(`🤝 *GAME OVER! IT'S A DRAW!*\n\n${renderTTT(game.board)}`);
    }

    // Switch turn
    game.turn = (game.turn === game.playerX && game.playerO) ? game.playerO : game.playerX;
    reply(`Next Turn: ${renderTTT(game.board)}\n\nTurn: @${game.turn.split('@')[0]}`);
});

function renderTTT(b) {
    return `╭───┬───┬───╮\n│ ${b[0]} │ ${b[1]} │ ${b[2]} │\n├───┼───┼───┤\n│ ${b[3]} │ ${b[4]} │ ${b[5]} │\n├───┼───┼───┤\n│ ${b[6]} │ ${b[7]} │ ${b[8]} │\n╰───┴───┴───╯`;
}

function checkTTTWinner(b, m) {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    return wins.some(([x, y, z]) => b[x] === m && b[y] === m && b[z] === m);
}

// 2. Werewolf Village Game (.werewolf)
cmd({
    pattern: "werewolf",
    alias: ["ww"],
    react: "🐺",
    desc: "Werewolf roleplay game setup & instructions",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const text = `🐺 *WEREWOLF VILLAGE GAME*\n\n` +
        `*Roles Available:*\n` +
        `• 🐺 *Werewolf:* Hunts villagers at night\n` +
        `• 🔮 *Seer:* Inspects one player's role per night\n` +
        `• 🛡️ *Guardian:* Protects one player from attack\n` +
        `• 👨‍🌾 *Villager:* Discusses and lynches suspects by day\n\n` +
        `*How to play:* Gather at least 4 friends in the group.\nType \`.werewolf start\` to begin recruitment lobby!`;
    reply(text);
});

// 3. Dungeon RPG Raid (.dungeon)
cmd({
    pattern: "dungeon",
    alias: ["rpg", "adventure"],
    react: "⚔️",
    desc: "Enter the monster dungeon raid",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { pushname, reply }) => {
    const monsters = [
        { name: "Goblin Raider", hp: 120, loot: "🗡️ Rusty Dagger & 250 Coins" },
        { name: "Shadow Wyrm", hp: 350, loot: "🔮 Mystic Gem & 800 Coins" },
        { name: "Demon Lord Infernal", hp: 700, loot: "👑 Obsidian Crown & 2,500 Coins" }
    ];
    const m_idx = Math.floor(Math.random() * monsters.length);
    const monster = monsters[m_idx];
    const userDmg = Math.floor(Math.random() * 200) + 150;
    const isVictory = userDmg >= monster.hp * 0.4;

    let text = `⚔️ *DUNGEON RAID: ${monster.name.toUpperCase()}*\n\n`;
    text += `👤 *Hero:* ${pushname || 'Warrior'}\n`;
    text += `👾 *Monster HP:* ${monster.hp}\n`;
    text += `💥 *Hero Strike:* ${userDmg} Damage!\n\n`;

    if (isVictory) {
        text += `🏆 *VICTORY!* You defeated the ${monster.name}!\n`;
        text += `🎁 *Loot Gained:* ${monster.loot}\n`;
    } else {
        text += `💀 *DEFEAT!* The monster overpowered you! Retreat and gear up!\n`;
    }
    text += `\n> Powered by ${global.botName || 'XYMBOT'}`;
    reply(text);
});

// 4. Text Minecraft Sandbox (.minecraft)
cmd({
    pattern: "minecraft",
    alias: ["mc", "mine"],
    react: "⛏️",
    desc: "Text Minecraft sandbox mining and crafting",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const ores = ["💎 Diamond", "🥇 Gold Ore", "🥈 Iron Ingot", "🪨 Coal", "🧱 Ancient Debris", "🟩 Emerald"];
    const found = ores[Math.floor(Math.random() * ores.length)];
    const depth = Math.floor(Math.random() * 50) + 10;

    let text = `⛏️ *MINECRAFT EXPEDITION*\n\n`;
    text += `⛏️ You dug down to layer *Y: -${depth}*...\n`;
    text += `✨ *Discovered:* **${found}**!\n`;
    text += `🎒 Stashed in your inventory box.\n\n> Powered by ${global.botName || 'XYMBOT'}`;
    reply(text);
});

// 5. Fishing Game (.fishing)
cmd({
    pattern: "fishing",
    alias: ["fish", "mancing"],
    react: "🎣",
    desc: "Cast your fishing rod and catch rare fish",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const catches = [
        "🐟 Common Salmon (Worth 50 Coins)",
        "🐠 Golden Clownfish (Worth 180 Coins)",
        "🦈 Great White Shark (Worth 1,200 Coins)",
        "🦑 Giant Kraken Tentacle (Worth 3,000 Coins)",
        "👢 Old Leather Boot (Worth 1 Coin)",
        "👑 Sunken Treasure Chest (Worth 5,000 Coins)"
    ];
    const res = catches[Math.floor(Math.random() * catches.length)];
    reply(`🎣 *Splash! You cast your line into the deep waters...*\n\n🎣 *You hooked:* **${res}**!\n\n> Powered by ${global.botName || 'XYMBOT'}`);
});

// 6. Family 100 Quiz (.family100)
cmd({
    pattern: "family100",
    alias: ["survey"],
    react: "🎯",
    desc: "Family 100 survey game",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const questions = [
        { q: "What is something people do right after waking up?", a: "Check phone (42%), Drink water (25%), Stretch (18%), Brush teeth (15%)" },
        { q: "What do people forget when leaving home?", a: "Keys (38%), Phone (31%), Wallet (20%), Umbrella (11%)" },
        { q: "What is the most popular midnight snack?", a: "Instant Noodles (45%), Chips (25%), Ice Cream (20%), Cookies (10%)" }
    ];
    const pick = questions[Math.floor(Math.random() * questions.length)];
    reply(`🎯 *FAMILY 100 SURVEY*\n\n*Question:* _${pick.q}_\n\n*Top Answers:*\n${pick.a}\n\n> Powered by ${global.botName || 'XYMBOT'}`);
});

// 7. Tebak Gambar (.tebakgambar)
cmd({
    pattern: "tebakgambar",
    alias: ["guesspic"],
    react: "🖼️",
    desc: "Picture guessing riddle quiz",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const { data } = await axios.get('https://api.siputzx.my.id/api/games/tebakgambar', { timeout: 15000 }).catch(() => ({ data: {} }));
        if (data.status && data.data?.img) {
            await conn.sendMessage(from, {
                image: { url: data.data.img },
                caption: `🖼️ *TEBAK GAMBAR*\n\n*Hint:* ${data.data.deskripsi || 'Guess the phrase'}\n\nType your answer in the chat!`
            }, { quoted: mek });
        } else {
            reply(`🖼️ *RIDDLE QUIZ*\n\nWhat has keys but no locks, space but no room, and you can enter but can't go outside?\n\n*Answer:* A keyboard ⌨️`);
        }
    } catch (e) {
        reply(`🖼️ *RIDDLE QUIZ*\n\nI speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?\n\n*Answer:* An echo 🗣️`);
    }
});

// 8. Tebak Bendera (.tebakbendera)
cmd({
    pattern: "tebakbendera",
    alias: ["flagquiz"],
    react: "🚩",
    desc: "Guess the country by its flag",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const flags = [
        { flag: "🇯🇵", country: "Japan" },
        { flag: "🇧🇷", country: "Brazil" },
        { flag: "🇨🇦", country: "Canada" },
        { flag: "🇩🇪", country: "Germany" },
        { flag: "🇮🇳", country: "India" },
        { flag: "🇰🇷", country: "South Korea" }
    ];
    const pick = flags[Math.floor(Math.random() * flags.length)];
    reply(`🚩 *FLAG GUESSING QUIZ*\n\nWhich country has this flag?\n\n#️⃣ **${pick.flag}**\n\n*Answer:* ||${pick.country}||\n\n> Powered by ${global.botName || 'XYMBOT'}`);
});

// 9. Riddle (.riddle)
cmd({
    pattern: "riddle",
    alias: ["tebaktebakan"],
    react: "🧠",
    desc: "Mind riddle question and answer",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const riddles = [
        { q: "What has to be broken before you can use it?", a: "An egg 🥚" },
        { q: "I’m tall when I’m young, and I’m short when I’m old. What am I?", a: "A candle 🕯️" },
        { q: "What month of the year has 28 days?", a: "All of them! 📅" },
        { q: "What can you catch, but not throw?", a: "A cold 🤧" },
        { q: "What goes up but never comes down?", a: "Your age 🎂" }
    ];
    const r = riddles[Math.floor(Math.random() * riddles.length)];
    reply(`🧠 *MIND RIDDLE*\n\n*Question:* ${r.q}\n\n*Answer:* ||${r.a}||\n\n> Powered by ${global.botName || 'XYMBOT'}`);
});

// 10. Joke (.joke)
cmd({
    pattern: "joke",
    alias: ["kadi", "lelucon"],
    react: "😂",
    desc: "Random funny comedy joke",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    try {
        const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 10000 });
        reply(`😂 *RANDOM JOKE*\n\n*Setup:* ${data.setup}\n\n*Punchline:* **${data.punchline}** 🤣\n\n> Powered by ${global.botName || 'XYMBOT'}`);
    } catch (e) {
        reply(`😂 Why don't scientists trust atoms?\nBecause they make up everything! 🤣`);
    }
});

// 11. Quote (.quote)
cmd({
    pattern: "quote",
    alias: ["kata"],
    react: "✨",
    desc: "Get an inspiring, motivational quote",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    try {
        const { data } = await axios.get('https://dummyjson.com/quotes/random', { timeout: 10000 });
        reply(`✨ *INSPIRING QUOTE*\n\n"${data.quote}"\n\n— *${data.author}*\n\n> Powered by ${global.botName || 'XYMBOT'}`);
    } catch (e) {
        reply(`✨ "The only way to do great work is to love what you do."\n— *Steve Jobs*`);
    }
});

// 12. Meme (.meme)
cmd({
    pattern: "meme",
    react: "🤡",
    desc: "Get a random comedy meme image",
    category: "game",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const { data } = await axios.get('https://meme-api.com/gimme', { timeout: 15000 });
        if (data.url) {
            await conn.sendMessage(from, {
                image: { url: data.url },
                caption: `🤡 *${data.title}*\n\n> Subreddit: r/${data.subreddit} • Powered by ${global.botName || 'XYMBOT'}`
            }, { quoted: mek });
        } else {
            reply("❌ Could not load meme at this moment.");
        }
    } catch (e) {
        reply(`❌ Meme Error: ${e.message}`);
    }
});
