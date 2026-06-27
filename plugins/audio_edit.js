const { cmd, commands } = require('../command');
const { getRandom } = require('../lib/functions');
const fs = require('fs');
const { exec } = require('child_process');

// ============================
// 🎧 AUDIO EDITOR TOOL
// ============================

// 1. BASS BOOST
cmd({
    pattern: "bass",
    alias: ["bassboost", "boost"],
    react: "🔊",
    desc: "Add Bass Boost to audio",
    category: "audio",
    filename: __filename
},
async(conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted || (m.quoted.type !== 'audioMessage' && m.quoted.type !== 'videoMessage')) return reply("⚠️ Reply to an audio/voice note with .bass!");
        reply("🔊 *Boosting Bass...*");
        let media = await m.quoted.download();
        let output = getRandom('.mp3');
        exec(`ffmpeg -i "${media}" -af equalizer=f=54:width_type=o:width=2:g=20 "${output}"`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio. Make sure ffmpeg is installed.");
            conn.sendMessage(from, { audio: fs.readFileSync(output), mimetype: "audio/mpeg", ptt: true }, { quoted: mek })
                .finally(() => { try { fs.unlinkSync(output); } catch(_) {} });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e.message); }
});

// 2. UNDERWATER EFFECT
cmd({
    pattern: "underwater",
    alias: ["deep", "water"],
    react: "🌊",
    desc: "Make audio sound underwater",
    category: "audio",
    filename: __filename
},
async(conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted) return reply("⚠️ Reply to an audio with .underwater!");
        reply("🌊 *Going Underwater...*");
        let media = await m.quoted.download();
        let output = getRandom('.mp3');
        exec(`ffmpeg -i "${media}" -af "lowpass=f=300" "${output}"`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");
            conn.sendMessage(from, { audio: fs.readFileSync(output), mimetype: "audio/mpeg", ptt: true }, { quoted: mek })
                .finally(() => { try { fs.unlinkSync(output); } catch(_) {} });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e.message); }
});

// 3. CHIPMUNK
cmd({
    pattern: "chipmunk",
    alias: ["squirrel", "high"],
    react: "🐿️",
    desc: "Make audio sound like a chipmunk",
    category: "audio",
    filename: __filename
},
async(conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted) return reply("⚠️ Reply to an audio with .chipmunk!");
        reply("🐿️ *Chipmunk Mode...*");
        let media = await m.quoted.download();
        let output = getRandom('.mp3');
        exec(`ffmpeg -i "${media}" -af "asetrate=44100*1.5,atempo=1.5,atempo=1/1.5" "${output}"`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");
            conn.sendMessage(from, { audio: fs.readFileSync(output), mimetype: "audio/mpeg", ptt: true }, { quoted: mek })
                .finally(() => { try { fs.unlinkSync(output); } catch(_) {} });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e.message); }
});

// 4. ROBOT
cmd({
    pattern: "robot",
    alias: ["botvoice"],
    react: "🤖",
    desc: "Make audio sound like a robot",
    category: "audio",
    filename: __filename
},
async(conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted) return reply("⚠️ Reply to an audio with .robot!");
        reply("🤖 *Robotizing...*");
        let media = await m.quoted.download();
        let output = getRandom('.mp3');
        exec(`ffmpeg -i "${media}" -filter_complex "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75" "${output}"`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");
            conn.sendMessage(from, { audio: fs.readFileSync(output), mimetype: "audio/mpeg", ptt: true }, { quoted: mek })
                .finally(() => { try { fs.unlinkSync(output); } catch(_) {} });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e.message); }
});

// 5. SLOW MOTION
cmd({
    pattern: "slow",
    alias: ["slowmo"],
    react: "🐢",
    desc: "Slow down audio",
    category: "audio",
    filename: __filename
},
async(conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted) return reply("⚠️ Reply to an audio with .slow!");
        reply("🐢 *Slowing Down...*");
        let media = await m.quoted.download();
        let output = getRandom('.mp3');
        exec(`ffmpeg -i "${media}" -filter:a "atempo=0.7" "${output}"`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");
            conn.sendMessage(from, { audio: fs.readFileSync(output), mimetype: "audio/mpeg", ptt: true }, { quoted: mek })
                .finally(() => { try { fs.unlinkSync(output); } catch(_) {} });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e.message); }
});
