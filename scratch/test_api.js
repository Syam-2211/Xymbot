const { fetchJson } = require('../lib/functions');
async function test() {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const endpoints = [
        'ytmp3',
        'ytmp4',
        'ytdl',
        'yt',
        'youtube',
        'ytplay'
    ];
    for (const ep of endpoints) {
        try {
            const data = await fetchJson(`https://api.siputzx.my.id/api/d/${ep}?url=${url}`);
            console.log(`Endpoint ${ep}:`, data.status ? 'SUCCESS' : 'FAILED', JSON.stringify(data).substring(0, 100));
        } catch (e) {
            console.log(`Endpoint ${ep}: ERROR`, e.message);
        }
    }
}
test();
