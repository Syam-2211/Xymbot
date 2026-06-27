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
        if (!m.quoted || (m.quoted.type !== 'videoMessage' && m.quoted.type !== 'audioMessage')) {
            return reply("⚠️ Please *reply* to a video or voice note with *.tomp3*");
        }

        reply("🎵 *Converting to Audio...*");

        let media = await m.quoted.download();
        let output = getRandom('.mp3');

        exec(`ffmpeg -i "${media}" -vn -acodec libmp3lame -q:a 2 "${output}"`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error converting media. Make sure ffmpeg is installed.");

            conn.sendMessage(from, {
                audio: fs.readFileSync(output),
                mimetype: "audio/mpeg",
                ptt: false
            }, { quoted: mek }).finally(() => {
                try { fs.unlinkSync(output); } catch(_) {}
            });
        });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e.message);
    }
});
