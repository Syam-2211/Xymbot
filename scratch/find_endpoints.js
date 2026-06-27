const { fetchJson } = require('../lib/functions');
async function run() {
    try {
        const jsUrl = 'https://app.siputzx.my.id/assets/index-ChoGKc8-.js';
        const res = await fetch(jsUrl);
        const text = await res.text();
        console.log('JS Bundle length:', text.length);
        
        // Find all strings starting with /api/
        const regex = /\/api\/[a-zA-Z0-9_\-\/]+/g;
        const matches = text.match(regex) || [];
        const unique = [...new Set(matches)];
        console.log('Found /api/ paths:', unique.filter(p => p.includes('dl') || p.includes('download') || p.includes('yt') || p.includes('tik') || p.includes('ig') || p.includes('fb')));
    } catch (e) {
        console.log('Error:', e.message);
    }
}
run();
