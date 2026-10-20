const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "ai",
    alias: ["gpt", "gemini", "bot", "chat"],
    react: "🧠",
    desc: "Chat with AI using official Gemini and OpenAI fallback",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("Hey! 👋 Ask me anything!\n\nExample: *.ai What is the capital of France?*");

        reply("🤔 *Thinking...*");

        const config = require('../config');
        const geminiKey = process.env.GEMINI_API_KEY || global.GEMINI_API_KEY;
        const openAiKey = process.env.OPENAI_API_KEY || global.OPENAI_API_KEY;

        // ── 1. PRIMARY ENGINE: Google Gemini (Fast & High Quality) ──────────
        if (geminiKey && !geminiKey.includes('your_gemini')) {
            const models = ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.5-flash-lite', 'gemini-3.8-flash'];
            for (const model of models) {
                try {
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
                    const res = await axios.post(endpoint, {
                        contents: [
                            {
                                role: 'user',
                                parts: [{ text: q }]
                            }
                        ]
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 25000
                    });

                    const replyText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (replyText) {
                        return reply(`🤖 *XYMBOT AI* — 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊\n\n${replyText.trim()}\n\n> © 𝑆𝑌𝛥𝛭.3𝐹𝛸 • 複| xʏᴀᴍツ • 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓`);
                    }
                } catch (err) {
                    console.log(`[Gemini - ${model}] failed:`, err.response?.data?.error?.message || err.message);
                }
            }
        }

        // ── 2. SECONDARY ENGINE: OpenAI GPT ──────────────────────────────────
        if (openAiKey && !openAiKey.includes('your_openai')) {
            try {
                const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: q }]
                }, {
                    headers: {
                        'Authorization': `Bearer ${openAiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 25000
                });

                const replyText = res.data?.choices?.[0]?.message?.content;
                if (replyText) {
                    return reply(`🤖 *XYMBOT GPT* — ✪⃝⸸ꜛꪶ͢𝐒𝐘͔𝐀𝐌 𝐒𝐄𝐑͢ꫂꜜ™\n\n${replyText.trim()}\n\n> © 𝑆𝑌𝛥𝛭.3𝐹𝛸 • 複| xʏᴀᴍツ • 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓`);
                }
            } catch (err) {
                console.log('[OpenAI] failed:', err.response?.data?.error?.message || err.message);
            }
        }

        // ── 3. TERTIARY FALLBACK: Pollinations AI ─────────────────────────────
        try {
            const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(q)}?model=openai`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000
            });
            if (res.data && typeof res.data === 'string' && !res.data.includes('error')) {
                return reply(`🤖 *XYMBOT AI* — 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊\n\n${res.data.trim()}\n\n> © 𝑆𝑌𝛥𝛭.3𝐹𝛸 • 複| xʏᴀᴍツ • 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓`);
            }
        } catch (err) {
            console.log('[Pollinations] failed:', err.message);
        }

        return reply("⚠️ Sorry, unable to process your request at this moment. Please try again shortly!");

    } catch (e) {
        console.error('AI Error:', e.message);
        reply("⚠️ An unexpected error occurred while communicating with AI.");
    }
});
