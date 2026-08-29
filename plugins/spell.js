const { cmd, commands } = require('../command');

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
}, async (conn, m, msg, { isCmd, command, body, reply }) => {
    // Only check if it looks like a command (e.g. starts with . or /) but has a valid word
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

    if (closestCmd) {
        const prefix = body.charAt(0); // Extract the prefix they used
        await reply(`❓ Ningal udeshichath (Did you mean) *${prefix}${closestCmd}* aano?`);
    }
});
