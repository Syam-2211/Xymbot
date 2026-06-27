const { fetchJson } = require('../lib/functions');
async function test() {
    const igUrl = 'https://www.instagram.com/reels/C5pW28_vxqP/'; // dummy or general ig reel link if they check syntax
    try {
        const d = await fetchJson(`https://api.siputzx.my.id/api/d/igram?url=${igUrl}`);
        console.log('--- INSTAGRAM (igram) ---');
        console.log('Main Keys:', Object.keys(d));
        if (d.data) {
            console.log('data Keys:', Object.keys(d.data));
            console.log('data details:', JSON.stringify(d.data, null, 2).substring(0, 400));
        }
    } catch (e) {
        console.log('Instagram failed:', e.message);
    }
}
test();
