const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TT = /(?<!\S)https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/[^\s]+(?=\s|$)/gi;
const IG = /https?:\/\/(www\.)?instagram\.com\/[^\s]+/gi;
const MF = /(?<!\S)https?:\/\/(www\.)?mediafire\.com\/\S+(?=\s|$)/gi;
const PIN = /https?:\/\/(www\.)?(pinterest\.(com|fr|de|co\.uk|jp|ru|ca|it|com\.au|com\.mx|com\.br|es|pl)|pin\.it)\/[^\s]+/gi;
const FB = /(?<!\S)https?:\/\/(www\.|m\.|web\.)?facebook\.com\/[^\s]+(?=\s|$)/gi;
const TW = /(?<!\S)https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s]+(?=\s|$)/gi;
const VD = /https?:\/\/(www\.)?videy\.co\/[^\s]+/gi;
const TH = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/gi;
const MG = /https?:\/\/mega\.nz\/[^\s]+/gi;
const SC = /(?<!\S)https?:\/\/(www\.|on\.)?soundcloud\.com\/[^\s]+(?=\s|$)/gi;
const SP = /https?:\/\/open\.spotify\.com\/[^\s]+/gi;
const YT = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+/gi;
const SF = /https?:\/\/sfile\.co\/[^\s]+/gi;

/**
 * Extract URL text, return { type, url } or null
 */
const ext = (txt) => {
    if (!txt) return null;
    const clean = (m) => m?.[0]?.replace(/[.,!?]$/, "");
    let m = txt.match(TT);
    if (m) return { type: "tt", url: clean(m) };
    m = txt.match(IG);
    if (m && !clean(m).includes("/stories/")) return { type: "ig", url: clean(m) };
    m = txt.match(PIN);
    if (m) return { type: "pin", url: clean(m) };
    m = txt.match(FB);
    if (m) {
        const u = clean(m);
        if (!u.includes("/login") && !u.includes("/dialog") && !u.includes("/plugins/")) {
            return { type: "fb", url: u };
        }
    }
    m = txt.match(TW);
    if (m) return { type: "tw", url: clean(m) };
    m = txt.match(VD);
    if (m) return { type: "vd", url: clean(m) };
    m = txt.match(TH);
    if (m) return { type: "th", url: clean(m) };
    m = txt.match(MG);
    if (m) return { type: "mg", url: clean(m) };
    m = txt.match(SC);
    if (m) return { type: "sc", url: clean(m) };
    m = txt.match(SP);
    if (m) return { type: "sp", url: clean(m) };
    m = txt.match(YT);
    if (m) return { type: "yt", url: clean(m) };
    m = txt.match(SF);
    if (m) return { type: "sf", url: clean(m) };
    m = txt.match(MF);
    if (m) return { type: "mf", url: clean(m) };
    return null;
};

const tt = async (url) => {
    const { data: d } = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (d.code !== 0 || !d.data) throw new Error(d.msg || "TikTok API error");
    const r = d.data.images?.length
        ? { type: "image", data: d.data.images }
        : { type: "video", data: d.data.play };
    return { type: r.type, data: r.data, title: d.data.title || "TikTok Video" };
};

const ig = async (url) => {
    const { data: d } = await axios.get(`https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || "Instagram API error");
    return { urls: d.result.url, isVideo: d.result.metadata?.isVideo };
};

const pin = async (url) => {
    // If not a URL, search pinterest via api
    if (!url.startsWith('http')) {
        const { data: d } = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(url)}`, { timeout: 20000 }).catch(() => ({ data: {} }));
        if (d.status && d.data && d.data.length > 0) {
            return [{ type: 'image', url: d.data[0] }];
        }
    }
    const { data: d } = await axios.get(`https://api-faa.my.id/faa/pin-down?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result || !d.result.medias) throw new Error(d.message || "Pinterest API error");
    return d.result.medias;
};

const fb = async (url) => {
    const { data: d } = await axios.get(`https://api-faa.my.id/faa/fbdownload?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result || !d.result.media) throw new Error(d.message || "Facebook API error");
    return d.result.media;
};

const tw = async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/twitter?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result) throw new Error(d.message || "Twitter/X API error");
    return { type: d.result.type, data: d.result.download_url };
};

const vd = async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/videy?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result) throw new Error(d.message || "Videy API error");
    return d.result;
};

const mf = async (url) => {
    const { data: d } = await axios.get(`https://api-faa.my.id/faa/mediafire?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result) throw new Error(d.message || "MediaFire API error");
    return d.result;
};

const th = async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/threads?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result || !d.result.media) throw new Error(d.message || "Threads API error");
    return d.result.media;
};

const mg = async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/mega?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result) throw new Error(d.message || "Mega API error");
    return d.result;
};

const sc = async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/soundcloud?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || "SoundCloud API error");
    return d.result;
};

const sp = async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/spotify?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || "Spotify API error");
    return d.result;
};

const yt = async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || "YouTube API error");
    return d.result;
};

const sf = async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/sfile?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || "Sfile API error");
    return d.result;
};

async function handleDownload(conn, from, mek, parsedUrl, reply) {
    const botName = global.botName || 'XYMBOT';
    try {
        switch (parsedUrl.type) {
            case "tt": {
                const r = await tt(parsedUrl.url);
                if (r.type === "video") {
                    await conn.sendMessage(from, { video: { url: r.data }, mimetype: "video/mp4", caption: `🎬 *TikTok Download*\n${r.title ? `_${r.title}_\n\n` : ''}> Powered by ${botName}` }, { quoted: mek });
                } else if (r.type === "image") {
                    if (!r.data || r.data.length === 0) throw new Error("No image data found");
                    for (let img of r.data) {
                        await conn.sendMessage(from, { image: { url: img }, caption: `📸 *TikTok Photo*\n> Powered by ${botName}` }, { quoted: mek });
                    }
                }
                break;
            }

            case "ig": {
                const { urls, isVideo } = await ig(parsedUrl.url);
                if (!urls || urls.length === 0) throw new Error("No media found");
                for (let link of urls) {
                    if (isVideo || link.includes('.mp4')) {
                        await conn.sendMessage(from, { video: { url: link }, mimetype: "video/mp4", caption: `📸 *Instagram Reel/Video*\n> Powered by ${botName}` }, { quoted: mek });
                    } else {
                        await conn.sendMessage(from, { image: { url: link }, caption: `📸 *Instagram Photo*\n> Powered by ${botName}` }, { quoted: mek });
                    }
                }
                break;
            }

            case "pin": {
                const meds = await pin(parsedUrl.url);
                if (!meds || meds.length === 0) throw new Error("No media found");
                const imgs = meds.filter((m) => m.type === "image");
                if (imgs.length > 0) {
                    for (let img of imgs) {
                        await conn.sendMessage(from, { image: { url: img.url }, caption: `📌 *Pinterest Image*\n> Powered by ${botName}` }, { quoted: mek });
                    }
                } else {
                    const vid = meds.find((m) => m.type === "video");
                    const gif = meds.find((m) => m.type === "gif");
                    if (vid) {
                        await conn.sendMessage(from, { video: { url: vid.url }, mimetype: "video/mp4", caption: `📌 *Pinterest Video*\n> Powered by ${botName}` }, { quoted: mek });
                    } else if (gif) {
                        await conn.sendMessage(from, { video: { url: gif.url }, gifPlayback: true }, { quoted: mek });
                    }
                }
                break;
            }

            case "fb": {
                const med = await fb(parsedUrl.url);
                if (med.video_hd || med.video_sd) {
                    const vu = med.video_hd || med.video_sd;
                    await conn.sendMessage(from, { video: { url: vu }, mimetype: "video/mp4", caption: `📘 *Facebook Video*\n> Powered by ${botName}` }, { quoted: mek });
                } else if (med.photo_image) {
                    await conn.sendMessage(from, { image: { url: med.photo_image }, caption: `📘 *Facebook Photo*\n> Powered by ${botName}` }, { quoted: mek });
                } else {
                    throw new Error("No downloadable media found in this Facebook post");
                }
                break;
            }

            case "tw": {
                const r = await tw(parsedUrl.url);
                if (r.type === "image") {
                    for (let img of r.data) {
                        await conn.sendMessage(from, { image: { url: img.url }, caption: `🐦 *Twitter/X Image*\n> Powered by ${botName}` }, { quoted: mek });
                    }
                } else if (r.type === "video") {
                    const vqs = r.data.filter((item) => item.type === "mp4");
                    let best = vqs.find((v) => v.resolusi === "768p") || vqs.find((v) => v.resolusi === "640p") || vqs[0];
                    if (best) {
                        await conn.sendMessage(from, { video: { url: best.url }, mimetype: "video/mp4", caption: `🐦 *Twitter/X Video*\n> Powered by ${botName}` }, { quoted: mek });
                    } else {
                        throw new Error("No video URL found");
                    }
                }
                break;
            }

            case "vd": {
                const vu = await vd(parsedUrl.url);
                await conn.sendMessage(from, { video: { url: vu }, mimetype: "video/mp4", caption: `🎬 *Videy Download*\n> Powered by ${botName}` }, { quoted: mek });
                break;
            }

            case "mf": {
                const r = await mf(parsedUrl.url);
                await conn.sendMessage(from, {
                    document: { url: r.download_url },
                    fileName: r.filename,
                    mimetype: r.mime ? `application/${r.mime}` : "application/octet-stream",
                    caption: `📄 *MediaFire Download*\n\n📄 *Filename:* ${r.filename}\n📦 *Size:* ${r.size}\n\n> Powered by ${botName}`
                }, { quoted: mek });
                break;
            }

            case "th": {
                const meds = await th(parsedUrl.url);
                if (!meds || meds.length === 0) throw new Error("No media found");
                const vids = meds.filter((m) => m.thumbnail && m.thumbnail !== "-");
                const imgs = meds.filter((m) => !m.thumbnail || m.thumbnail === "-");
                if (vids.length > 0) {
                    await conn.sendMessage(from, { video: { url: vids[0].url }, mimetype: "video/mp4", caption: `🧵 *Threads Video*\n> Powered by ${botName}` }, { quoted: mek });
                } else if (imgs.length > 0) {
                    for (let img of imgs) {
                        await conn.sendMessage(from, { image: { url: img.url }, caption: `🧵 *Threads Photo*\n> Powered by ${botName}` }, { quoted: mek });
                    }
                }
                break;
            }

            case "mg": {
                const r = await mg(parsedUrl.url);
                const durl = Array.isArray(r.download_url) ? r.download_url[0] : r.download_url;
                await conn.sendMessage(from, {
                    document: { url: durl },
                    fileName: r.filename,
                    mimetype: r.mimetype || "application/octet-stream",
                    caption: `☁️ *Mega Download*\n\n📄 *Filename:* ${r.filename}\n📦 *Size:* ${r.filesize}\n\n> Powered by ${botName}`
                }, { quoted: mek });
                break;
            }

            case "sc": {
                const r = await sc(parsedUrl.url);
                await conn.sendMessage(from, {
                    audio: { url: r.url },
                    mimetype: "audio/mpeg",
                    fileName: r.fileName || "soundcloud.mp3"
                }, { quoted: mek });
                break;
            }

            case "sp": {
                const r = await sp(parsedUrl.url);
                await conn.sendMessage(from, {
                    audio: { url: r.url },
                    mimetype: "audio/mpeg",
                    fileName: `${r.title} - ${r.artist}.mp3`
                }, { quoted: mek });
                break;
            }

            case "yt": {
                const r = await yt(parsedUrl.url);
                await conn.sendMessage(from, {
                    audio: { url: r.url },
                    mimetype: "audio/mpeg",
                    fileName: `${r.title || 'audio'}.mp3`
                }, { quoted: mek });
                break;
            }

            case "sf": {
                const r = await sf(parsedUrl.url);
                await conn.sendMessage(from, {
                    document: { url: r.url },
                    fileName: r.file_name,
                    mimetype: r.mimetype === "7ZIP" ? "application/x-7z-compressed" : "application/octet-stream",
                    caption: `📁 *Sfile Download*\n\n📄 *Filename:* ${r.file_name}\n📦 *Size:* ${r.size}\n\n> Powered by ${botName}`
                }, { quoted: mek });
                break;
            }
        }
    } catch (e) {
        reply(`❌ Download Error: ${e.message}`);
    }
}

// 1. Universal Downloader Command (.dl / .download)
cmd({
    pattern: "dl",
    alias: ["download", "universaldownloader"],
    react: "📥",
    desc: "Multi-platform media downloader (TikTok, IG, FB, Twitter, Pin, Spotify, Mediafire, Mega, etc.)",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim();
    if (!raw && m.quoted?.text) raw = m.quoted.text;

    const prefix = global.PREFIX || '.';

    if (!raw) {
        return reply(`*Universal Downloader* 📥\n\n*Supported Platforms:*\nTikTok • Instagram • Pinterest • Facebook\nTwitter/X • Threads • Videy • Mega\nSoundCloud • Spotify • YouTube • Sfile\nMediaFire\n\n*Usage:* ${prefix}dl <url>\n*Note:* You can also reply to a link.`);
    }

    const parsed = ext(raw);
    if (!parsed) {
        return reply("❌ Invalid or unsupported URL. Please provide a valid link from a supported platform.");
    }

    reply("⏳ *Fetching and downloading media...*");
    await handleDownload(conn, from, mek, parsed, reply);
});

// 2. Twitter / X Downloader (.twitter / .tw)
cmd({
    pattern: "twitter",
    alias: ["tw", "twdl", "x", "xdl"],
    react: "🐦",
    desc: "Download Twitter/X video or image",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a Twitter/X link!\nExample: .twitter https://x.com/user/status/123");
    reply("⏳ *Downloading Twitter/X media...*");
    await handleDownload(conn, from, mek, { type: "tw", url: raw }, reply);
});

// 3. Pinterest Downloader (.pinterest / .pin)
cmd({
    pattern: "pinterest",
    alias: ["pin", "pindl"],
    react: "📌",
    desc: "Download Pinterest image/video or search Pinterest pins",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a Pinterest link or search query!\nExample: .pinterest anime wallpaper");
    reply("⏳ *Fetching Pinterest media...*");
    await handleDownload(conn, from, mek, { type: "pin", url: raw }, reply);
});

// 4. MediaFire Downloader (.mediafire / .mf)
cmd({
    pattern: "mediafire",
    alias: ["mf", "mfdl"],
    react: "📄",
    desc: "Download files from MediaFire link",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a MediaFire link!\nExample: .mediafire https://www.mediafire.com/file/...");
    reply("⏳ *Downloading MediaFire file...*");
    await handleDownload(conn, from, mek, { type: "mf", url: raw }, reply);
});

// 5. Spotify Downloader (.spotify / .spotifydl)
cmd({
    pattern: "spotify",
    alias: ["spotifydl"],
    react: "🎵",
    desc: "Download Spotify track audio",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a Spotify song link!\nExample: .spotify https://open.spotify.com/track/...");
    reply("⏳ *Downloading Spotify audio...*");
    await handleDownload(conn, from, mek, { type: "sp", url: raw }, reply);
});

// 6. TikTok MP3 (.ttmp3)
cmd({
    pattern: "ttmp3",
    alias: ["tiktokaudio"],
    react: "🎵",
    desc: "Extract MP3 audio from TikTok link",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a TikTok link!\nExample: .ttmp3 https://vt.tiktok.com/...");
    try {
        reply("⏳ *Extracting TikTok audio...*");
        const { data: d } = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(raw)}`);
        if (d.data?.music) {
            await conn.sendMessage(from, {
                audio: { url: d.data.music },
                mimetype: "audio/mpeg",
                fileName: `${d.data.title || "tiktok"}.mp3`
            }, { quoted: mek });
        } else {
            reply("❌ Audio not found in TikTok link.");
        }
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 7. CapCut Downloader (.capcut)
cmd({
    pattern: "capcut",
    alias: ["capcutdl"],
    react: "✂️",
    desc: "Download CapCut template video",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a CapCut link!\nExample: .capcut https://www.capcut.com/template-detail/...");
    try {
        reply("⏳ *Downloading CapCut video...*");
        const { data: d } = await axios.get(`https://api.siputzx.my.id/api/d/capcut?url=${encodeURIComponent(raw)}`);
        if (d.status && d.data?.video_url) {
            await conn.sendMessage(from, {
                video: { url: d.data.video_url },
                mimetype: "video/mp4",
                caption: `✂️ *CapCut Template Download*\n*Title:* ${d.data.title || "CapCut"}\n> Powered by ${global.botName || 'XYMBOT'}`
            }, { quoted: mek });
        } else {
            reply("❌ Failed to fetch CapCut video. The link may be private or invalid.");
        }
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 8. Reddit Downloader (.reddit)
cmd({
    pattern: "reddit",
    alias: ["redditdl"],
    react: "🤖",
    desc: "Download Reddit video or post",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a Reddit link!\nExample: .reddit https://www.reddit.com/r/...");
    try {
        reply("⏳ *Downloading Reddit media...*");
        const { data: d } = await axios.get(`https://api.siputzx.my.id/api/d/reddit?url=${encodeURIComponent(raw)}`);
        if (d.status && d.data) {
            const vid = d.data.video || d.data.url;
            if (vid) {
                await conn.sendMessage(from, {
                    video: { url: vid },
                    mimetype: "video/mp4",
                    caption: `🤖 *Reddit Video*\n${d.data.title ? `*Title:* ${d.data.title}\n` : ''}> Powered by ${global.botName || 'XYMBOT'}`
                }, { quoted: mek });
            } else if (d.data.image) {
                await conn.sendMessage(from, {
                    image: { url: d.data.image },
                    caption: `🤖 *Reddit Photo*\n> Powered by ${global.botName || 'XYMBOT'}`
                }, { quoted: mek });
            }
        } else {
            reply("❌ Failed to fetch Reddit post. The link may be private or invalid.");
        }
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 9. GitClone Downloader (.gitclone)
cmd({
    pattern: "gitclone",
    alias: ["githubdl"],
    react: "🐙",
    desc: "Download a GitHub repository as ZIP",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a GitHub repo URL!\nExample: .gitclone https://github.com/user/repo");
    const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
    const match = raw.match(regex);
    if (!match) return reply("❌ Invalid GitHub URL. Please provide a link like: https://github.com/user/repo");
    const [, user, repoRaw] = match;
    const repo = repoRaw.replace(/.git$/, "");
    const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;
    reply(`⏳ *Cloning repository ${user}/${repo}...*`);
    try {
        await conn.sendMessage(from, {
            document: { url: zipUrl },
            fileName: `${repo}.zip`,
            mimetype: "application/zip",
            caption: `🐙 *GitHub Repository Clone*\n\n📁 *Repo:* ${user}/${repo}\n🔗 *URL:* https://github.com/${user}/${repo}\n\n> Powered by ${global.botName || 'XYMBOT'}`
        }, { quoted: mek });
    } catch (e) {
        reply(`❌ Failed to clone repository: ${e.message}`);
    }
});

// 10. YouTube MP4 Video (.ytmp4)
cmd({
    pattern: "ytmp4",
    alias: ["ytv", "youtubevideo"],
    react: "🎬",
    desc: "Download YouTube HD Video MP4",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    let raw = q?.trim() || m.quoted?.text?.trim();
    if (!raw) return reply("⚠️ Please provide a YouTube link!\nExample: .ytmp4 https://youtube.com/watch?v=...");
    reply("⏳ *Downloading YouTube video...*");
    try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(raw)}`, { timeout: 25000 });
        if (data.status && data.data?.dl) {
            await conn.sendMessage(from, {
                video: { url: data.data.dl },
                mimetype: "video/mp4",
                caption: `🎬 *YouTube Video*\n*Title:* ${data.data.title || "Video"}\n\n> Powered by ${global.botName || 'XYMBOT'}`
            }, { quoted: mek });
        } else {
            // Fallback via ytmp3 endpoint or video plugin
            reply("❌ Failed to fetch video. The video may be region restricted or private.");
        }
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});
