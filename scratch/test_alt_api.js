const { fetchJson } = require('../lib/functions');
async function test() {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    // Test AEMT
    try {
        const data = await fetchJson(`https://aemt.me/youtube?url=${url}`);
        console.log('AEMT youtube:', data.status ? 'SUCCESS' : 'FAILED', JSON.stringify(data).substring(0, 150));
    } catch (e) {
        console.log('AEMT youtube: ERROR', e.message);
    }
    
    try {
        const data = await fetchJson(`https://aemt.me/ytmp4?url=${url}`);
        console.log('AEMT ytmp4:', data.status ? 'SUCCESS' : 'FAILED', JSON.stringify(data).substring(0, 150));
    } catch (e) {
        console.log('AEMT ytmp4: ERROR', e.message);
    }

    try {
        const data = await fetchJson(`https://aemt.me/ytmp3?url=${url}`);
        console.log('AEMT ytmp3:', data.status ? 'SUCCESS' : 'FAILED', JSON.stringify(data).substring(0, 150));
    } catch (e) {
        console.log('AEMT ytmp3: ERROR', e.message);
    }
}
test();
