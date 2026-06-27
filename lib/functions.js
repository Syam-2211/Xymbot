async function fetchJson(url, options = {}) {
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
                ...options.headers
            },
            ...options
        });
        const data = await res.json();
        return data;
    } catch (err) {
        throw err;
    }
}

function runtime(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + (d == 1 ? " d, " : " d, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " h, " : " h, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " m, " : " m, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " s" : " s") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

function getRandom(ext) {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
}

module.exports = {
    fetchJson,
    runtime,
    getRandom
};
