const { cmd, commands } = require('../command');
const { getRandom } = require('../lib/functions');
const fs = require('fs');
const { exec } = require('child_process');

cmd({
    pattern: "tomp3",
    alias: ["mp3", "audio"],
    react: "🎵",
    desc: "Convert video/voice note to MP3 audio",
    category: "converter",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        // 1. Check if user replied to media
        if (!m.quoted || (m.quoted.type !== 'videoMessage' && m.quoted.type !== 'audioMessage')) {
            return reply("⚠️ Please reply to a video or voice note!");
        }

        reply("🎵 *Converting to Audio...*");

        // 2. Download the media
        let media = await conn.downloadAndSaveMediaMessage(m.quoted);
        let output = getRandom('.mp3');

        // 3. Convert using FFmpeg
        exec(`ffmpeg -i ${media} -vn -acodec libmp3lame -q:a 2 ${output}`, (err) => {
            fs.unlinkSync(media); // Delete original file to save space

            if (err) return reply("❌ Error converting media.");

            // 4. Send the Audio File
            conn.sendMessage(from, { 
                audio: { url: output }, 
                mimetype: "audio/mpeg", 
                ptt: false // Set to true if you want it sent as a Voice Note (blue microphone)
            }, { quoted: mek }).then(() => {
                fs.unlinkSync(output); // Clean up the output file
            });
        });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});

