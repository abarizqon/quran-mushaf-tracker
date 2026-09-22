/**
 * dzikir-engine.js
 * 
 * Standalone Offline Dzikir Engine.
 * Mendukung pencatatan dzikir mandiri, counter interaktif per-doa,
 * penyimpanan riwayat offline (LocalStorage), kalkulasi target mingguan,
 * serta rekomendasi dinamis sesuai waktu (Pagi, Petang, Ba'da Shalat).
 */

import { DZIKIR_DB, CATEGORIES } from './dzikir-data.js';

export default class DzikirEngine {
    /**
     * @param {Object} options
     * @param {string} [options.storagePrefix='dzikir_tracker_']
     * @param {Object} [options.database=DZIKIR_DB]
     * @param {Array} [options.categories=CATEGORIES]
     */
    constructor(options = {}) {
        this.storagePrefix = options.storagePrefix || 'dzikir_tracker_';
        this.db = options.database || DZIKIR_DB;
        this.categories = options.categories || CATEGORIES;
        
        this.currentCategory = null;
        this.counterState = {};
        this.onCounterChange = options.onCounterChange || null;
        this.onItemCompleted = options.onItemCompleted || null;
        this.onCollectionCompleted = options.onCollectionCompleted || null;

        this._loadSavedState();
    }

    /**
     * Format tanggal lokal YYYY-MM-DD (WIB / zona lokal, bebas bug UTC)
     * @param {Date} [d=new Date()]
     * @returns {string}
     */
    static getLocalDateStr(d = new Date()) {
        const dt = d instanceof Date ? d : new Date(d);
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Dapatkan daftar kategori dzikir yang tersedia.
     */
    getCategories() {
        return this.categories;
    }

    /**
     * Dapatkan daftar doa untuk kategori tertentu.
     * @param {string} categoryKey 
     * @returns {Array}
     */
    getItems(categoryKey) {
        return this.db[categoryKey] || [];
    }

    /**
     * Dapatkan rekomendasi kategori dzikir dinamis berdasarkan waktu saat ini.
     * @returns {{ key: string, title: string, reason: string }}
     */
    getRecommendedCategory() {
        const hour = new Date().getHours();
        if (hour >= 4 && hour < 11) {
            return {
                key: 'pagi',
                title: 'Dzikir Pagi',
                reason: 'Waktu utama dzikir pagi (setelah Subuh hingga terbit matahari)'
            };
        } else if (hour >= 15 && hour < 21) {
            return {
                key: 'petang',
                title: 'Dzikir Petang',
                reason: 'Waktu utama dzikir petang (setelah Ashar hingga Isya)'
            };
        } else {
            return {
                key: 'bada_shalat',
                title: 'Dzikir Ba\'da Shalat',
                reason: 'Wirid agung pelengkap shalat fardhu'
            };
        }
    }

    /**
     * Buka kategori dzikir tertentu dan inisialisasi counter.
     * @param {string} categoryKey 
     */
    openCategory(categoryKey) {
        let key = categoryKey;
        if (key === 'pagi_petang') {
            const hour = new Date().getHours();
            key = (hour >= 4 && hour < 15) ? 'pagi' : 'petang';
        }

        this.currentCategory = key;
        const items = this.getItems(key);

        items.forEach(item => {
            if (typeof this.counterState[item.id] === 'undefined') {
                this.counterState[item.id] = 0;
            }
        });

        return {
            categoryKey: key,
            items,
            progress: this.getProgress(key)
        };
    }

    /**
     * Tambah hitungan counter untuk item doa tertentu.
     * @param {string} itemId 
     * @returns {{ current: number, target: number, completed: boolean, collectionCompleted: boolean }}
     */
    incrementCounter(itemId) {
        const items = this.getItems(this.currentCategory);
        const item = items.find(i => i.id === itemId);
        if (!item) return null;

        const prevCount = this.counterState[itemId] || 0;
        if (prevCount >= item.target) {
            return {
                current: prevCount,
                target: item.target,
                completed: true,
                collectionCompleted: this.isCollectionCompleted(this.currentCategory)
            };
        }

        const newCount = prevCount + 1;
        this.counterState[itemId] = newCount;
        this._saveState();

        const completed = newCount >= item.target;

        if (this.onCounterChange) {
            this.onCounterChange(itemId, newCount, item.target);
        }

        if (completed && this.onItemCompleted) {
            this.onItemCompleted(item);
        }

        const collectionCompleted = this.isCollectionCompleted(this.currentCategory);
        if (collectionCompleted && this.onCollectionCompleted) {
            this.onCollectionCompleted(this.currentCategory);
        }

        return {
            current: newCount,
            target: item.target,
            completed,
            collectionCompleted
        };
    }

    /**
     * Reset counter untuk satu item atau seluruh kategori yang aktif.
     * @param {string} [itemId=null]
     */
    resetCounter(itemId = null) {
        if (itemId) {
            this.counterState[itemId] = 0;
        } else if (this.currentCategory) {
            const items = this.getItems(this.currentCategory);
            items.forEach(item => {
                this.counterState[item.id] = 0;
            });
        }
        this._saveState();
    }

    /**
     * Cek apakah seluruh doa dalam kategori telah tuntas dibaca.
     * @param {string} categoryKey 
     * @returns {boolean}
     */
    isCollectionCompleted(categoryKey) {
        const items = this.getItems(categoryKey);
        if (!items || items.length === 0) return false;
        return items.every(item => (this.counterState[item.id] || 0) >= item.target);
    }

    /**
     * Hitung progres kategori saat ini.
     * @param {string} categoryKey 
     * @returns {{ completedItems: number, totalItems: number, percent: number }}
     */
    getProgress(categoryKey) {
        const items = this.getItems(categoryKey);
        if (!items || items.length === 0) return { completedItems: 0, totalItems: 0, percent: 0 };

        let completedItems = 0;
        items.forEach(item => {
            if ((this.counterState[item.id] || 0) >= item.target) {
                completedItems++;
            }
        });

        const percent = Math.round((completedItems / items.length) * 100);
        return {
            completedItems,
            totalItems: items.length,
            percent
        };
    }

    /**
     * Catat sesi dzikir yang telah tuntas ke riwayat offline (LocalStorage).
     * @param {string} categoryKey 
     * @param {number} [durationSeconds=0]
     * @returns {Object} Data rekaman yang disimpan
     */
    saveSessionRecord(categoryKey, durationSeconds = 0) {
        const items = this.getItems(categoryKey);
        const catInfo = this.categories.find(c => c.key === categoryKey);
        const title = catInfo ? catInfo.title : categoryKey;

        const now = new Date();
        const dateStr = DzikirEngine.getLocalDateStr(now);
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const record = {
            id: `dzikir_${Date.now()}`,
            collectionKey: categoryKey,
            collectionTitle: title,
            totalDoa: items.length,
            date: dateStr,
            time: timeStr,
            durationSeconds,
            timestamp: now.getTime()
        };

        const records = this.getHistoryRecords();
        records.unshift(record);
        
        try {
            localStorage.setItem(this.storagePrefix + 'records', JSON.stringify(records.slice(0, 100)));
            localStorage.setItem(this.storagePrefix + 'last_session', JSON.stringify(record));
        } catch (e) {
            console.warn('Gagal menyimpan riwayat dzikir:', e);
        }

        return record;
    }

    /**
     * Ambil riwayat rekaman dzikir offline.
     * @returns {Array}
     */
    getHistoryRecords() {
        try {
            const raw = localStorage.getItem(this.storagePrefix + 'records');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    _saveState() {
        try {
            localStorage.setItem(this.storagePrefix + 'counter_state', JSON.stringify(this.counterState));
        } catch (e) {}
    }

    _loadSavedState() {
        try {
            const raw = localStorage.getItem(this.storagePrefix + 'counter_state');
            if (raw) this.counterState = JSON.parse(raw);
        } catch (e) {}
    }
}
