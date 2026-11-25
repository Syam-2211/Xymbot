'use strict';

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../database');
const DB_FILE = path.join(DB_DIR, 'group_settings.json');

function ensureDir() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
}

function loadGroupSettings() {
    ensureDir();
    if (!global.db) global.db = { data: { chats: {}, users: {} } };
    if (!global.db.data) global.db.data = { chats: {}, users: {} };
    if (!global.db.data.chats) global.db.data.chats = {};

    try {
        if (fs.existsSync(DB_FILE)) {
            const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            if (raw && typeof raw === 'object') {
                Object.assign(global.db.data.chats, raw);
            }
        }
    } catch (err) {
        console.error('[GROUP DB] Failed to load group settings:', err.message);
    }
    return global.db.data.chats;
}

function saveGroupSettings() {
    try {
        ensureDir();
        const chats = global.db?.data?.chats || {};
        fs.writeFileSync(DB_FILE, JSON.stringify(chats, null, 2));
    } catch (err) {
        console.error('[GROUP DB] Failed to save group settings:', err.message);
    }
}

function getChatSettings(chatId) {
    if (!global.db?.data?.chats) loadGroupSettings();
    if (!global.db.data.chats[chatId]) {
        global.db.data.chats[chatId] = {
            antilink: false,
            antilinkAction: 'warn', // 'delete' | 'warn' | 'kick'
            antidelete: false,
            welcome: true,
            goodbye: true,
            warns: {}
        };
    }
    return global.db.data.chats[chatId];
}

module.exports = {
    loadGroupSettings,
    saveGroupSettings,
    getChatSettings
};
