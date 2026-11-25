'use strict';

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../database');
const DB_FILE = path.join(DB_DIR, 'sticker_packs.json');

let cache = null;

function ensureLoaded() {
    if (cache) return cache;
    try {
        if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
        if (fs.existsSync(DB_FILE)) {
            cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) || {};
        } else {
            cache = {};
        }
    } catch (err) {
        console.error('[STICKER PREFS] Load failed:', err.message);
        cache = {};
    }
    return cache;
}

function persist() {
    try {
        if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
        fs.writeFileSync(DB_FILE, JSON.stringify(cache || {}, null, 2));
    } catch (err) {
        console.error('[STICKER PREFS] Save failed:', err.message);
    }
}

function normalizeUserKey(userId) {
    return String(userId || '').split('@')[0].split(':')[0].trim();
}

function getUserPack(userId) {
    const db = ensureLoaded();
    const key = normalizeUserKey(userId);
    return key && db[key] ? db[key] : null;
}

function setUserPack(userId, packname, author) {
    const db = ensureLoaded();
    const key = normalizeUserKey(userId);
    if (!key) return null;
    db[key] = {
        packname: String(packname || '').trim(),
        author: String(author || '').trim()
    };
    persist();
    return db[key];
}

function deleteUserPack(userId) {
    const db = ensureLoaded();
    const key = normalizeUserKey(userId);
    if (!key || !db[key]) return false;
    delete db[key];
    persist();
    return true;
}

module.exports = {
    getUserPack,
    setUserPack,
    deleteUserPack
};
