const { cmd } = require('../command');
const axios = require('axios');

// 1. Wikipedia Search (.wiki)
cmd({
    pattern: "wiki",
    alias: ["wikipedia"],
    react: "📚",
    desc: "Search Wikipedia summary",
    category: "search",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("⚠️ What do you want to search on Wikipedia?\nExample: .wiki Quantum Computing");
    reply("🔍 *Searching Wikipedia...*");
    try {
        const { data } = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`, { timeout: 15000 });
        if (data.type === "disambiguation") {
            return reply(`⚠️ Multiple results found for *${q}*. Please be more specific.\n\n${data.extract || ''}`);
        }
        if (!data.extract) return reply(`❌ No Wikipedia article found for *${q}*.`);

        let text = `📚 *WIKIPEDIA SUMMARY: ${data.title}*\n\n`;
        text += `${data.extract}\n\n`;
        if (data.content_urls?.desktop?.page) text += `🔗 *Read more:* ${data.content_urls.desktop.page}\n`;
        text += `\n> Powered by ${global.botName || 'XYMBOT'}`;

        if (data.thumbnail?.source) {
            await conn.sendMessage(from, { image: { url: data.thumbnail.source }, caption: text }, { quoted: mek });
        } else {
            await conn.sendMessage(from, { text }, { quoted: mek });
        }
    } catch (e) {
        reply(`❌ Wikipedia search error: ${e.message}`);
    }
});

// 2. Weather Report (.weather)
cmd({
    pattern: "weather",
    alias: ["cuaca"],
    react: "🌦️",
    desc: "Live weather report for any city",
    category: "search",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("⚠️ Please provide a city name!\nExample: .weather London");
    reply(`🌦️ *Fetching weather for ${q}...*`);
    try {
        const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=j1`, { timeout: 15000 });
        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0];

        if (!current) return reply(`❌ Weather data not found for *${q}*.`);

        const cityName = area?.areaName?.[0]?.value || q;
        const country = area?.country?.[0]?.value || '';

        let text = `🌦️ *WEATHER REPORT: ${cityName.toUpperCase()}, ${country.toUpperCase()}*\n\n`;
        text += `🌡️ *Temperature:* ${current.temp_C}°C (${current.temp_F}°F)\n`;
        text += `🤒 *Feels Like:* ${current.FeelsLikeC}°C\n`;
        text += `☁️ *Condition:* ${current.weatherDesc?.[0]?.value || 'Normal'}\n`;
        text += `💧 *Humidity:* ${current.humidity}%\n`;
        text += `💨 *Wind:* ${current.windspeedKmph} km/h\n`;
        text += `👁️ *Visibility:* ${current.visibility} km\n`;
        text += `\n> Powered by ${global.botName || 'XYMBOT'}`;

        reply(text);
    } catch (e) {
        // Fallback to text format
        try {
            const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=%C+%t+(feels+like+%f)+Humidity:+%h+Wind:+%w`);
            reply(`🌦️ *Weather for ${q}:*\n${data}\n\n> Powered by ${global.botName || 'XYMBOT'}`);
        } catch (_) {
            reply(`❌ Could not fetch weather for *${q}*. Please check the spelling.`);
        }
    }
});

// 3. News Headlines (.news)
cmd({
    pattern: "news",
    alias: ["berita"],
    react: "📰",
    desc: "Get latest world/regional news headlines",
    category: "search",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    reply("📰 *Fetching latest news headlines...*");
    try {
        const topic = q ? encodeURIComponent(q) : "world";
        const { data } = await axios.get(`https://newsdata.io/api/1/news?apikey=pub_36733b8a1c9053ef30588656cbdfef8993f35&q=${topic}&language=en`, { timeout: 15000 }).catch(() => ({ data: {} }));

        let results = data.results;
        if (!results || results.length === 0) {
            // Fallback public news feed
            const rss = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=5`, { timeout: 15000 }).catch(() => ({ data: {} }));
            results = rss.data?.results?.map(r => ({ title: r.title, description: r.summary, link: r.url })) || [];
        }

        if (results.length === 0) return reply("❌ No current news found. Please try again later.");

        let text = `📰 *LATEST HEADLINES (${q || 'WORLD'})*\n\n`;
        for (let i = 0; i < Math.min(results.length, 5); i++) {
            const n = results[i];
            text += `*${i + 1}. ${n.title}*\n`;
            if (n.description) text += `${n.description.slice(0, 150)}...\n`;
            if (n.link) text += `🔗 ${n.link}\n\n`;
        }
        text += `> Powered by ${global.botName || 'XYMBOT'}`;
        reply(text);
    } catch (e) {
        reply(`❌ News error: ${e.message}`);
    }
});

// 4. Lyrics Finder (.lyrics)
cmd({
    pattern: "lyrics",
    alias: ["lirik"],
    react: "🎤",
    desc: "Search lyrics for any song",
    category: "search",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("⚠️ What song lyrics are you looking for?\nExample: .lyrics Faded Alan Walker");
    reply(`🎤 *Searching lyrics for "${q}"...*`);
    try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/s/lyrics?query=${encodeURIComponent(q)}`, { timeout: 15000 }).catch(() => ({ data: {} }));
        if (data.status && data.data?.lyrics) {
            const song = data.data;
            let text = `🎤 *${song.title || q}* - *${song.artist || ''}*\n\n`;
            text += `${song.lyrics}\n\n`;
            text += `> Powered by ${global.botName || 'XYMBOT'}`;
            return reply(text);
        }

        // Secondary fallback API
        const fallback = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, { timeout: 15000 }).catch(() => ({ data: [] }));
        if (fallback.data && fallback.data.length > 0) {
            const item = fallback.data[0];
            const lyrics = item.plainLyrics || item.syncedLyrics;
            if (lyrics) {
                let text = `🎤 *${item.trackName}* - *${item.artistName}*\n\n`;
                text += `${lyrics}\n\n`;
                text += `> Powered by ${global.botName || 'XYMBOT'}`;
                return reply(text);
            }
        }

        reply(`❌ Lyrics not found for: *${q}*`);
    } catch (e) {
        reply(`❌ Lyrics error: ${e.message}`);
    }
});

// 5. Dictionary Meaning (.define)
cmd({
    pattern: "define",
    alias: ["meaning", "dictionary", "dict"],
    react: "📖",
    desc: "Get English dictionary definition & pronunciation",
    category: "search",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    const word = q?.trim().split(' ')[0];
    if (!word) return reply("⚠️ Please specify a word to define!\nExample: .define seraphic");
    reply(`📖 *Looking up definition for "${word}"...*`);
    try {
        const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 15000 });
        if (!data || data.length === 0) return reply(`❌ No definition found for *${word}*.`);

        const entry = data[0];
        let text = `📖 *DICTIONARY: ${entry.word.toUpperCase()}*\n`;
        if (entry.phonetic) text += `🗣️ *Phonetic:* ${entry.phonetic}\n\n`;

        for (const meaning of entry.meanings.slice(0, 3)) {
            text += `*Part of Speech:* _${meaning.partOfSpeech}_\n`;
            for (let i = 0; i < Math.min(meaning.definitions.length, 2); i++) {
                const def = meaning.definitions[i];
                text += `• ${def.definition}\n`;
                if (def.example) text += `  _Example: "${def.example}"_\n`;
            }
            text += `\n`;
        }
        text += `> Powered by ${global.botName || 'XYMBOT'}`;
        reply(text);
    } catch (e) {
        reply(`❌ Word *${word}* not found in dictionary.`);
    }
});
