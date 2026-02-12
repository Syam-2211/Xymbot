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
        // 1. Check if user replied to a video
        if (!m.quoted || m.quoted.type !== 'videoMessage') {
            return reply("⚠️ Please reply to a video!");
        }

        reply("⬛ *Creating Black Screen Video...*");

        // 2. Download the video
        let media = await conn.downloadAndSaveMediaMessage(m.quoted);
        let output = getRandom('.mp4');

        // 3. Convert using FFmpeg (Draw black box over everything)
        // -vf "drawbox=t=fill:c=black" -> This draws a filled black box
        // -c:a copy -> This copies the audio without changing quality
        exec(`ffmpeg -i ${media} -vf "drawbox=t=fill:c=black" -c:a copy ${output}`, (err) => {
            fs.unlinkSync(media); // Delete original file

            if (err) return reply("❌ Error processing video.");

            // 4. Send the Result
            conn.sendMessage(from, { 
                video: { url: output }, 
                caption: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *BLACK MODE*",
                mimetype: "video/mp4"
            }, { quoted: mek }).then(() => {
                fs.unlinkSync(output); // Clean up
            });
        });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});

