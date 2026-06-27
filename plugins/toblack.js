const { cmd, commands } = require('../command');
const { getRandom } = require('../lib/functions');
const fs = require('fs');
const { exec } = require('child_process');

cmd({
    pattern: "toblack",
    alias: ["blackvideo", "hidevideo"],
    react: "⬛",
    desc: "Keep audio but make video black",
    category: "converter",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!m.quoted || m.quoted.type !== 'videoMessage') {
            return reply("⚠️ Please *reply* to a video with *.toblack*");
        }

        reply("⬛ *Creating Black Screen Video...*");

        let media = await m.quoted.download();
        let output = getRandom('.mp4');

        exec(`ffmpeg -i "${media}" -vf "drawbox=t=fill:c=black" -c:a copy "${output}"`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error processing video. Make sure ffmpeg is installed.");

            conn.sendMessage(from, {
                video: fs.readFileSync(output),
                caption: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *BLACK MODE*",
                mimetype: "video/mp4"
            }, { quoted: mek }).finally(() => {
                try { fs.unlinkSync(output); } catch(_) {}
            });
        });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e.message);
    }
});
