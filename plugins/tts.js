const { cmd } = require('../command');
const axios = require('axios');

const voices = {
    'ghostface': 'en_us_ghostface',
    'chewbacca': 'en_us_chewbacca',
    'c3po': 'en_us_c3po',
    'stitch': 'en_us_stitch',
    'stormtrooper': 'en_us_stormtrooper',
    'rocket': 'en_us_rocket',
    'female': 'en_us_001',
    'male': 'en_us_006',
    'narrator': 'en_male_narration',
    'funny': 'en_male_funny',
    'peaceful': 'en_female_emotional',
    'ukmale': 'en_uk_001'
};

cmd({
    pattern: "tts",
    alias: ["say", "voice"],
    react: "🔊",
    desc: "AI Text to Speech (Character Voices)",
    category: "converters",
    filename: __filename
},
async (conn, mek, m, { from, q, args, reply }) => {
    try {
        if (!q) return reply("⚠️ Give me text to say!\nExample: *.tts hello*\n\nType *.tts list* for all available character voices!");

        if (q.toLowerCase() === 'list') {
            let listTxt = "🎭 *AVAILABLE AI VOICES* 🎭\n\n";
            for (let v in voices) {
                listTxt += `• ${v}\n`;
            }
            listTxt += "\n*Usage:* `.tts <voice> <text>`\n*Example:* `.tts ghostface Hello there!`";
            return reply(listTxt);
        }

        let requestedFirstArg = args[0].toLowerCase();
        let text = q;
        let useTikTok = false;
        let selectedTikTokVoice = 'en_us_001';
        let googleLang = 'ml'; // default to Malayalam as requested

        if (voices[requestedFirstArg]) {
            // User requested a TikTok character voice
            useTikTok = true;
            selectedTikTokVoice = voices[requestedFirstArg];
            text = args.slice(1).join(' ');
        } else if (requestedFirstArg.length === 2) {
            // User requested a 2-letter language code (e.g. en, hi, ml)
            googleLang = requestedFirstArg;
            text = args.slice(1).join(' ');
        }
        
        if (!text) return reply("⚠️ Give me text to say!");

        reply("🎙️ *Generating voice...*");

        if (useTikTok) {
            // TikTok TTS
            const res = await axios.post('https://tiktok-tts.weilnet.workers.dev/api/generation', {
                text: text,
                voice: selectedTikTokVoice
            });

            if (res.data && res.data.data) {
                const audioBuffer = Buffer.from(res.data.data, 'base64');
                await conn.sendMessage(from, { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: false, id3Tagged: true }, { quoted: mek });
            } else {
                reply("❌ Failed to generate character voice. Please try again later.");
            }
        } else {
            // Google TTS
            const googleTTS = require('google-tts-api');
            const url = googleTTS.getAudioUrl(text, {
                lang: googleLang,
                slow: false,
                host: 'https://translate.google.com',
            });
            
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const audioBuffer = Buffer.from(response.data, 'binary');
            
            await conn.sendMessage(from, { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: false, id3Tagged: true }, { quoted: mek });
        }
        
    } catch (e) {
        console.error(e);
        reply("❌ An error occurred! Please try again.");
    }
});
