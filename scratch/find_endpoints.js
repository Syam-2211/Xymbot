const { fetchJson } = require('../lib/functions');
async function run() {
    try {
        const jsUrl = 'https://app.siputzx.my.id/assets/index-ChoGKc8-.js';
        const res = await fetch(jsUrl);
        const text = await res.text();
        console.log('JS Bundle length:', text.length);
        
        // Find all strings starting with https://
        const regex = /https?:\/\/[^\s"'`]+/g;
        const matches = text.match(regex) || [];
        const unique = [...new Set(matches)];
        console.log('Found URLs:', unique.filter(u => u.includes('siputzx') || u.includes('api')));
    } catch (e) {
        console.log('Error:', e.message);
    }
}
run();
