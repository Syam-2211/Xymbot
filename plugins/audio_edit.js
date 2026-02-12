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
        if (!quoted || (quoted.type !== 'audioMessage' && quoted.type !== 'videoMessage')) return reply("⚠️ Reply to an audio!");
        
        reply("🔊 *Boosting Bass...*");
        let media = await conn.downloadAndSaveMediaMessage(quoted);
        let output = getRandom('.mp3');

        // FFmpeg: Increase low frequencies (Bass)
        exec(`ffmpeg -i ${media} -af equalizer=f=54:width_type=o:width=2:g=20 ${output}`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");

            conn.sendMessage(from, { audio: { url: output }, mimetype: "audio/mpeg", ptt: true }, { quoted: mek });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e); }
});

// 2. UNDERWATER EFFECT (Deep & Muffled)
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
        if (!quoted) return reply("⚠️ Reply to an audio!");

        reply("🌊 *Going Underwater...*");
        let media = await conn.downloadAndSaveMediaMessage(quoted);
        let output = getRandom('.mp3');

        // FFmpeg: Lowpass filter (Muffles high sounds)
        exec(`ffmpeg -i ${media} -af "lowpass=f=300" ${output}`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");

            conn.sendMessage(from, { audio: { url: output }, mimetype: "audio/mpeg", ptt: true }, { quoted: mek });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e); }
});

// 3. CHIPMUNK (High Pitch)
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
        if (!quoted) return reply("⚠️ Reply to an audio!");

        reply("🐿️ *Chipmunk Mode...*");
        let media = await conn.downloadAndSaveMediaMessage(quoted);
        let output = getRandom('.mp3');

        // FFmpeg: Increase sample rate (Pitch Up)
        exec(`ffmpeg -i ${media} -af "asetrate=44100*1.5,atempo=1.5,atempo=1/1.5" ${output}`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");

            conn.sendMessage(from, { audio: { url: output }, mimetype: "audio/mpeg", ptt: true }, { quoted: mek });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e); }
});

// 4. ROBOT (Metallic Voice)
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
        if (!quoted) return reply("⚠️ Reply to an audio!");

        reply("🤖 *Robotizing...*");
        let media = await conn.downloadAndSaveMediaMessage(quoted);
        let output = getRandom('.mp3');

        // FFmpeg: Flanger + Distortion
        exec(`ffmpeg -i ${media} -filter_complex "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75" ${output}`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");

            conn.sendMessage(from, { audio: { url: output }, mimetype: "audio/mpeg", ptt: true }, { quoted: mek });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e); }
});

// 5. SLOW MOTION (Deep & Slow)
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
        if (!quoted) return reply("⚠️ Reply to an audio!");

        reply("🐢 *Slowing Down...*");
        let media = await conn.downloadAndSaveMediaMessage(quoted);
        let output = getRandom('.mp3');

        // FFmpeg: Decrease tempo (Speed Down)
        exec(`ffmpeg -i ${media} -filter:a "atempo=0.7" ${output}`, (err) => {
            fs.unlinkSync(media);
            if (err) return reply("❌ Error editing audio.");

            conn.sendMessage(from, { audio: { url: output }, mimetype: "audio/mpeg", ptt: true }, { quoted: mek });
        });
    } catch (e) { console.log(e); reply("❌ Error: " + e); }
});
      
