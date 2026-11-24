const { cmd } = require('../command');
const axios = require('axios');

let canvasLib = null;
try {
    canvasLib = require('@napi-rs/canvas');
} catch (e) {
    try {
        canvasLib = require('canvas');
    } catch (e2) {
        // Will inform user when command is run if canvas is not installed
    }
}

const LOGO_TYPES = {
    "3dchristmas": { query: ["christmas snow", "xmas lights", "winter holiday", "christmas tree glow"] },
    "3dneon": { query: ["neon cyberpunk", "neon lights city", "cyberpunk glow", "neon sign dark"] },
    "3dspace": { query: ["galaxy space", "stars universe", "cosmic nebula", "deep space"] },
    "3dstone": { query: ["stone texture", "rock wall", "dark stone", "granite texture"] },
    "bear": { query: ["bear wild", "grizzly forest", "animal bear", "wildlife bear"] },
    "blackpink": { query: ["pink aesthetic", "kpop style", "blackpink vibe", "pink neon"] },
    "blood": { query: ["blood red", "horror blood", "dark red splash", "bloody texture"] },
    "bokeh": { query: ["bokeh lights", "blur lights", "night lights blur", "colorful blur"] },
    "candy": { query: ["candy sweet", "colorful candy", "sweets background", "sugar texture"] },
    "carbon": { query: ["carbon fiber", "dark fiber", "carbon texture", "tech fiber"] },
    "chocolate": { query: ["chocolate texture", "dark chocolate", "sweet cocoa", "choco melt"] },
    "christmas": { query: ["christmas winter", "snow holiday", "xmas glow", "festive lights"] },
    "circuit": { query: ["circuit board", "tech motherboard", "electronic chip", "digital circuit"] },
    "cloud": { query: ["cloud sky", "blue sky clouds", "heaven sky", "soft clouds"] },
    "deepsea": { query: ["deep sea", "underwater ocean", "sea blue", "ocean dark"] },
    "demon": { query: ["demon dark", "devil fire", "hell flames", "evil shadow"] },
    "dropwater": { query: ["water drops", "rain drops", "liquid splash", "water glass"] },
    "glitch": { query: ["glitch effect", "rgb error", "digital distortion", "screen glitch"] },
    "glitch2": { query: ["glitch rgb", "error signal", "broken pixels", "tv glitch"] },
    "glitch3": { query: ["rgb glitch", "cyber glitch", "matrix error", "distortion"] },
    "graffiti": { query: ["graffiti wall", "street art", "urban spray", "hiphop wall"] },
    "holographic": { query: ["holographic rainbow", "holo shine", "rainbow foil", "holo effect"] },
    "joker": { query: ["joker dark", "clown evil", "joker smile", "dark face"] },
    "lion": { query: ["lion king", "wild lion", "animal king", "lion roar"] },
    "magma": { query: ["lava magma", "fire lava", "volcano heat", "molten rock"] },
    "matrix": { query: ["matrix code", "green code rain", "hacker code", "digital matrix"] },
    "neon": { query: ["neon light", "neon sign", "color neon", "night neon"] },
    "neondevil": { query: ["neon devil", "dark neon red", "devil glow", "evil neon"] },
    "neongreen": { query: ["green neon", "matrix green", "neon green glow", "laser green"] },
    "neonlight": { query: ["neon lights", "color glow", "night city neon", "led light"] },
    "papercut": { query: ["paper cut art", "paper layers", "cut design", "paper craft"] },
    "pencil": { query: ["pencil sketch", "drawing sketch", "graphite art", "hand sketch"] },
    "pornhub": { query: ["black orange", "dark orange theme", "contrast black orange"] },
    "scifi": { query: ["sci fi future", "space tech", "futuristic neon", "alien tech"] },
    "sparklechristmas": { query: ["christmas sparkle", "xmas glitter", "holiday shine", "snow sparkle"] },
    "thunder": { query: ["thunder lightning", "storm sky", "electric spark", "dark thunder"] },
    "thunder2": { query: ["lightning storm", "electric sky", "flash thunder", "storm energy"] },
    "transformer": { query: ["robot transformer", "metal robot", "futuristic robot", "ai robot"] },
    "wall": { query: ["wall texture", "concrete wall", "grunge wall", "dark wall"] },
    "wolf": { query: ["wolf wild", "dark wolf", "night wolf", "alpha wolf"] },
    "fire": { query: ["fire flames", "burning fire", "heat flames", "red fire"] },
    "ice": { query: ["ice blue", "frozen texture", "snow ice", "cold frost"] },
    "gold": { query: ["gold texture", "luxury gold", "gold shine", "gold metal"] },
    "silver": { query: ["silver metal", "chrome texture", "metal shine", "silver light"] },
    "galaxy": { query: ["galaxy stars", "cosmic sky", "space nebula", "deep galaxy"] },
    "rainbow": { query: ["rainbow colors", "color gradient", "multicolor light", "rainbow glow"] },
    "cyber": { query: ["cyberpunk city", "futuristic tech", "neon cyber", "dark cyber"] },
    "hacker": { query: ["hacker code", "dark coding", "green terminal", "matrix hacker"] },
    "dragon": { query: ["dragon fire", "fantasy dragon", "myth dragon", "dragon dark"] },
    "angel": { query: ["angel light", "heaven glow", "white wings", "holy light"] },
    "devil": { query: ["devil fire", "hell red", "dark demon", "evil fire"] },
    "metal": { query: ["metal texture", "steel dark", "industrial metal", "iron texture"] },
    "wood": { query: ["wood texture", "brown wood", "tree texture", "natural wood"] },
    "retro": { query: ["retro neon", "80s style", "vintage neon", "retro wave"] },
    "pixel": { query: ["pixel art", "8bit style", "retro pixel", "game pixel"] },
    "anime": { query: ["anime background", "anime sky", "anime light", "anime art"] },
    "gaming": { query: ["gaming setup", "rgb lights", "gamer neon", "esports vibe"] },
    "dark": { query: ["dark black", "shadow background", "black texture", "night dark"] },
    "light": { query: ["bright light", "white glow", "light rays", "soft light"] },
    "abstract": { query: ["abstract art", "color waves", "fluid art", "abstract glow"] }
};

const fonts = ["Arial", "Impact", "Georgia", "Verdana", "Trebuchet MS"];

const gradients = [
    ["#ff00cc", "#3333ff", "#00ffff"],
    ["#ff512f", "#dd2476", "#ff9966"],
    ["#00ff87", "#60efff", "#00c9ff"],
    ["#ff0000", "#ff7300", "#ffdd00"],
    ["#7928ca", "#ff0080", "#00dfd8"]
];

async function generateCanvasLogo(typeKey, rawText, botName) {
    if (!canvasLib) {
        throw new Error("CANVAS_NOT_INSTALLED");
    }

    const { createCanvas, loadImage } = canvasLib;
    const config = LOGO_TYPES[typeKey];
    if (!config) throw new Error("Invalid logo style");

    let [mainText, subText] = rawText.split("|");
    if (!subText) subText = "";
    mainText = mainText.trim();
    subText = subText.trim();

    const width = 1200;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    const api = "54164246-c83b8dee398b874d43650c040";
    const q = config.query[Math.floor(Math.random() * config.query.length)];

    const res = await axios.get(
        `https://pixabay.com/api/?key=${api}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&per_page=50`,
        { timeout: 15000 }
    );

    const hits = res.data?.hits || [];
    if (hits.length > 0) {
        const randomImg = hits[Math.floor(Math.random() * hits.length)];
        const bg = await loadImage(randomImg.largeImageURL);
        ctx.drawImage(bg, 0, 0, width, height);
    } else {
        // Gradient fallback background
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#0f2027");
        bgGrad.addColorStop(0.5, "#203a43");
        bgGrad.addColorStop(1, "#2c5364");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, width, height);

    // Star / particle glitter
    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }

    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fill();
    }

    const font = fonts[Math.floor(Math.random() * fonts.length)];
    const gradColors = gradients[Math.floor(Math.random() * gradients.length)];
    const gradient = ctx.createLinearGradient(0, 0, width, 0);

    gradient.addColorStop(0, gradColors[0]);
    gradient.addColorStop(0.5, gradColors[1]);
    gradient.addColorStop(1, gradColors[2]);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let fontSize = 110;
    if (mainText.length > 15) fontSize = 75;
    if (mainText.length > 25) fontSize = 55;

    ctx.font = `bold ${fontSize}px ${font}`;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 10;
    ctx.strokeText(mainText, width / 2, height / 2 - (subText ? 20 : 0));

    ctx.shadowColor = gradColors[0];
    ctx.shadowBlur = 45;
    ctx.fillStyle = gradient;
    ctx.fillText(mainText, width / 2, height / 2 - (subText ? 20 : 0));
    ctx.shadowBlur = 0;

    if (subText) {
        ctx.font = `bold 38px ${font}`;
        ctx.fillStyle = "#ffffffdd";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.strokeText(subText, width / 2, height / 2 + 80);
        ctx.fillText(subText, width / 2, height / 2 + 80);
    }

    // Border and footer
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.font = "22px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`${botName}`, width - 120, height - 35);

    return canvas.toBuffer ? canvas.toBuffer("image/png") : canvas.toBuffer();
}

// 1. Main Logo Hub Command (.logo)
cmd({
    pattern: "logo",
    alias: ["logomaker", ...Object.keys(LOGO_TYPES)],
    react: "🎨",
    desc: "Generate Ultra HD Canvas & AI text logos (50+ styles)",
    category: "canvas",
    filename: __filename
}, async (conn, mek, m, { from, command, q, args, reply }) => {
    const prefix = global.PREFIX || '.';
    const botName = global.botName || 'XYMBOT';

    let style = '';
    let text = '';

    if (command === 'logo' || command === 'logomaker') {
        if (!q) {
            const styles = Object.keys(LOGO_TYPES);
            let list = `🎨 *XYMBOT LOGO MAKER (50+ STYLES)*\n\n`;
            list += `*Usage:* \`${prefix}logo <style> <Name|Tagline>\`\n`;
            list += `*Or direct:* \`${prefix}neon <Name|Tagline>\`\n\n`;
            list += `*Available Styles:*\n`;
            for (let i = 0; i < styles.length; i += 4) {
                list += styles.slice(i, i + 4).map(s => `• ${s}`).join('  |  ') + '\n';
            }
            list += `\n*Example:* \`${prefix}logo fire King|VIP\` or \`${prefix}neon Cyber\``;
            return reply(list);
        }

        const parts = q.trim().split(' ');
        const firstArg = parts[0].toLowerCase();
        if (LOGO_TYPES[firstArg]) {
            style = firstArg;
            text = parts.slice(1).join(' ').trim();
        } else {
            style = 'neon'; // Default style
            text = q.trim();
        }
    } else {
        // Direct command like .neon or .fire
        style = command.toLowerCase();
        text = q?.trim() || '';
    }

    if (!text) {
        return reply(`⚠️ Please provide text for the logo!\n\n*Usage:* \`${prefix}${style} Name|Tagline\`\n*Example:* \`${prefix}${style} ${botName}|Official\``);
    }

    reply(`🎨 *Generating ${style.toUpperCase()} logo...*`);

    try {
        const buffer = await generateCanvasLogo(style, text, botName);
        await conn.sendMessage(from, {
            image: buffer,
            caption: `✨ *${style.toUpperCase()} LOGO GENERATED*\n\n🎨 Style: ${style}\n⚡ Quality: Ultra HD Canvas\n\n> Powered by ${botName}`
        }, { quoted: mek });
    } catch (e) {
        if (e.message === "CANVAS_NOT_INSTALLED") {
            // Online API Fallback if canvas native module is not installed!
            try {
                const cleanName = text.split('|')[0].trim();
                const fallbackUrl = `https://api.siputzx.my.id/api/maker/carbon?text=${encodeURIComponent(cleanName)}`;
                await conn.sendMessage(from, {
                    image: { url: fallbackUrl },
                    caption: `✨ *${style.toUpperCase()} LOGO GENERATED*\n\n> Powered by ${botName}`
                }, { quoted: mek });
            } catch (fallbackErr) {
                reply(`❌ Logo generation requires @napi-rs/canvas.\nPlease install it: npm install @napi-rs/canvas`);
            }
        } else {
            console.error("Logo generation error:", e);
            reply(`❌ Error generating logo: ${e.message}`);
        }
    }
});
