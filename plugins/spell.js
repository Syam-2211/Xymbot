const { cmd, commands } = require('../command');
const fs = require('fs');
const path = require('path');

function getLevenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

cmd({
    on: 'text',
    desc: 'Detects typos in commands and suggests the correct one in Manglish.'
}, async (m, { conn, isCmd, command, body, reply, from }) => {
    // 1. Never trigger on bot's own messages or status
    if (m.key?.fromMe) return;

    // 2. Only check if the message actually started with a command prefix (e.g., . or /)
    const configPrefix = (require('../config').getPrefix() || '.').trim();
    if (!body || !body.startsWith(configPrefix)) return;

    // 3. Must be an intentional command attempt with at least 2 letters
    if (!isCmd || !command || command.length < 2) return;

    let matched = false;
    let allCommands = [];

    // Gather all registered commands and check if the user's input matched one perfectly
    for (const c of commands) {
        if (c.pattern) allCommands.push(c.pattern);
        if (c.alias) allCommands.push(...c.alias);

        // If it perfectly matched, then it's not a typo, it's a real command
        if (c.pattern === command || (c.alias && c.alias.includes(command))) {
            matched = true;
        }
    }

    // If it's a valid command, let the actual command plugin handle it
    if (matched) return;

    // It's an unrecognized command. Let's find the closest match.
    let closestCmd = null;
    let minDistance = 3; // Maximum allowed typos (e.g., 2 letters wrong)

    for (const validCmd of allCommands) {
        if (!validCmd || typeof validCmd !== 'string') continue;
        const dist = getLevenshteinDistance(command, validCmd);
        if (dist < minDistance) {
            minDistance = dist;
            closestCmd = validCmd;
        }
    }

    const prefix = body.charAt(0); // Extract the prefix they used

    // Play the spelling audio (if set) AND send the text reply together
    const spellingAudioPath = global.cmdAudio && global.cmdAudio['spelling'];
    if (spellingAudioPath && fs.existsSync(spellingAudioPath)) {
        try {
            await conn.sendMessage(from || m.chat, {
                audio: fs.readFileSync(spellingAudioPath),
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: m });
        } catch (e) {
            console.error('[Spell] Failed to send spelling audio:', e.message);
        }
    }

    // Send the text suggestion (if a close match was found)
    if (closestCmd) {
        await reply(`❓ Ningal udeshichath (Did you mean) *${prefix}${closestCmd}* aano?`);
    } else {
        // Unknown command with no close match - still let them know
        await reply(`❓ *${prefix}${command}* oru valid command alla. Type *${prefix}menu* to see all commands.`);
    }
});
