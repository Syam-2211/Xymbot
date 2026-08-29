const { cmd } = require('../command');
let translate;
try {
    translate = require('@vitalets/google-translate-api').translate;
} catch (e) {
    // For ESM compatibility in some older node versions
    translate = async (text, opts) => {
        const { translate } = await import('@vitalets/google-translate-api');
        return translate(text, opts);
    };
}

cmd({
    pattern: "trt",
    alias: ["tr", "translate"],
    react: "🌍",
    desc: "Translate text to a specified language.",
    category: "utilities",
    filename: __filename
},
async (conn, mek, m, { from, q, args, quoted, reply }) => {
    try {
        let text = q;
        let lang = 'ml'; // Default target language is Malayalam

        // Check if there is a quoted message
        if (quoted && quoted.text) {
            text = quoted.text;
            if (args[0]) lang = args[0]; // E.g., .trt en
        } else {
            // E.g., .trt en Hello world OR .trt Hello world (defaulting to ml)
            if (args[0] && args[0].length === 2) {
                lang = args[0];
                text = args.slice(1).join(' ');
            }
        }

        if (!text) return reply("⚠️ Please provide text or reply to a message to translate!\nExample: *.trt en Hello* or reply to a message with *.trt ml*");

        reply("🌍 *Translating...*");

        const res = await translate(text, { to: lang });
        reply(`*Translation (${lang}):*\n\n${res.text}`);
        
    } catch (e) {
        console.error(e);
        reply("❌ Failed to translate! Please check the language code or try again later.");
    }
});
