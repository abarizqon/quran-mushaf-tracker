/**
 * mushaf-engine.js
 * 
 * Standalone Offline & Multi-CDN Mushaf Engine.
 * Mendukung penyimpanan CacheStorage offline 100% (bisa berjalan di airplane mode/tanpa internet),
 * multi-tier fallback CDN (Tajwid Berwarna Dar Al-Ma'rifah, GitHub Raw, Madani, KSU),
 * pengunduhan offline per-juz atau seluruh 604 halaman, serta manajemen bookmark / last read.
 */

import { TOTAL_PAGES, getJuzInfo, getPageDetails } from './quran-data.js';

export const MUSHAF_EDITIONS = {
    madani: {
        id: 'madani',
        name: 'Mushaf Madinah HD',
        subtitle: 'Super Jernih Cetakan Raja Fahd (Default Utama)',
        cacheName: 'quran-mushaf-madani-v2',
        storageKey: 'quran_mushaf_offline_madani_v2',
        candidateResolvers: [
            (p) => `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/kfgqpc/hafs-wasat/${p}.jpg`,
            (p) => `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/hafs-wasat/${p}.jpg`,
            (p) => `https://files.quran.app/hafs/madani/width_1260/page${String(p).padStart(3, '0')}.png`
        ]
    },
    tajweed_dar: {
        id: 'tajweed_dar',
        name: 'Tajwid Dar Al-Ma\'rifah',
        subtitle: 'Tajwid Berwarna Klasik + Panduan',
        cacheName: 'quran-mushaf-tajweed-v2',
        storageKey: 'quran_mushaf_offline_tajweed_v2',
        candidateResolvers: [
            (p) => `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/easyquran.com/hafs-tajweed/${p}.jpg`,
            (p) => `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/easyquran.com/hafs-tajweed/${p}.jpg`
        ]
    }
};

export default class MushafEngine {
    constructor(options = {}) {
        this.currentEdition = options.edition || 'madani';
        if (!MUSHAF_EDITIONS[this.currentEdition]) this.currentEdition = 'madani';

        const defaultEdition = MUSHAF_EDITIONS[this.currentEdition];
        this.cacheName = options.cacheName || defaultEdition.cacheName;
        this.storageKey = options.storageKey || defaultEdition.storageKey;
        this.lastReadKey = options.lastReadKey || 'quran_mushaf_last_read_v1';
        this.totalPages = options.totalPages || TOTAL_PAGES;
        this.candidateResolvers = options.candidateResolvers || defaultEdition.candidateResolvers;
        this.isDownloading = false;
        this.cancelFlag = false;
    }

    /**
     * Ganti gaya tampilan mushaf.
     * @param {'madani' | 'tajweed_dar' | 'tajweed_ksu'} editionId 
     * @returns {boolean}
     */
    setEdition(editionId) {
        if (!MUSHAF_EDITIONS[editionId]) return false;
        this.currentEdition = editionId;
        const ed = MUSHAF_EDITIONS[editionId];
        this.cacheName = ed.cacheName;
        this.storageKey = ed.storageKey;
        this.candidateResolvers = ed.candidateResolvers;
        return true;
    }

    /**
     * Dapatkan daftar edisi yang tersedia.
     */
    getEditions() {
        return MUSHAF_EDITIONS;
    }

    /**
     * Dapatkan daftar candidate URL untuk nomor halaman tertentu.
     * @param {number} pageNumber (1-604)
     * @returns {string[]}
     */
    getCandidateUrls(pageNumber) {
        return this.candidateResolvers.map(fn => fn(pageNumber));
    }

    /**
     * Cek apakah CacheStorage didukung di browser ini.
     */
    hasCacheSupport() {
        return typeof window !== 'undefined' && 'caches' in window;
    }

    /**
     * Dapatkan set nomor halaman yang sudah tersimpan offline.
     * @returns {Set<number>}
     */
    getOfflinePagesSet() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return new Set(raw ? JSON.parse(raw) : []);
        } catch (e) {
            return new Set();
        }
    }

    /**
     * Simpan set nomor halaman offline ke localStorage.
     */
    saveOfflinePagesSet(set) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(Array.from(set)));
        } catch (e) {}
    }

    /**
     * Ambil URL siap pakai untuk halaman tertentu.
     * Jika tersimpan di CacheStorage lokal, mengembalikan ObjectURL (offline 100%).
     * Jika tidak, mengembalikan CDN candidate pertama.
     * @param {number} pageNumber 
     * @returns {Promise<string>}
     */
    async getPageSourceUrl(pageNumber) {
        if (this.hasCacheSupport()) {
            try {
                const cache = await caches.open(this.cacheName);
                const urls = this.getCandidateUrls(pageNumber);
                for (const u of urls) {
                    const match = await cache.match(u);
                    if (match) {
                        const blob = await match.blob();
                        return URL.createObjectURL(blob);
                    }
                }
            } catch (e) {}
        }
        return this.getCandidateUrls(pageNumber)[0];
    }

    /**
     * Unduh dan simpan 1 halaman ke CacheStorage offline.
     * @param {number} pageNumber 
     * @returns {Promise<boolean>}
     */
    async cachePage(pageNumber) {
        const urls = this.getCandidateUrls(pageNumber);
        if (this.hasCacheSupport()) {
            try {
                const cache = await caches.open(this.cacheName);
                for (const u of urls) {
                    try {
                        const res = await fetch(u, { mode: 'cors' });
                        if (res && res.ok) {
                            await cache.put(u, res);
                            const set = this.getOfflinePagesSet();
                            set.add(pageNumber);
                            this.saveOfflinePagesSet(set);
                            return true;
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        }

        // Fallback preloader gambar biasa
        for (const u of urls) {
            const ok = await new Promise((res) => {
                const im = new Image();
                im.onload = () => res(true);
                im.onerror = () => res(false);
                im.src = u;
            });
            if (ok) {
                const set = this.getOfflinePagesSet();
                set.add(pageNumber);
                this.saveOfflinePagesSet(set);
                return true;
            }
        }
        return false;
    }

    /**
     * Unduh seluruh halaman dalam suatu Juz.
     * @param {number} juzNumber (1-30)
     * @param {Function} [onProgress] callback(current, total, pct, page)
     * @returns {Promise<{successCount: number, total: number, cancelled: boolean}>}
     */
    async cacheJuz(juzNumber, onProgress = null) {
        const jInfo = getJuzInfo(juzNumber);
        if (!jInfo) throw new Error(`Juz ${juzNumber} tidak ditemukan.`);
        return await this.cacheRange(jInfo.startPage, jInfo.endPage, onProgress);
    }

    /**
     * Unduh seluruh 604 halaman mushaf untuk offline penuh.
     * @param {Function} [onProgress] callback(current, total, pct, page)
     */
    async cacheAll(onProgress = null) {
        return await this.cacheRange(1, this.totalPages, onProgress);
    }

    /**
     * Unduh rentang halaman tertentu.
     */
    async cacheRange(startPage, endPage, onProgress = null) {
        this.isDownloading = true;
        this.cancelFlag = false;

        const pages = [];
        for (let p = startPage; p <= endPage; p++) pages.push(p);

        let successCount = 0;
        const set = this.getOfflinePagesSet();

        for (let i = 0; i < pages.length; i++) {
            if (this.cancelFlag) break;
            const p = pages[i];
            const pct = Math.round(((i + 1) / pages.length) * 100);

            if (set.has(p)) {
                successCount++;
            } else {
                const ok = await this.cachePage(p);
                if (ok) successCount++;
            }

            if (typeof onProgress === 'function') {
                onProgress(i + 1, pages.length, pct, p);
            }
        }

        this.isDownloading = false;
        return {
            successCount,
            total: pages.length,
            cancelled: this.cancelFlag
        };
    }

    cancelDownload() {
        this.cancelFlag = true;
    }

    /**
     * Ambil status penyimpanan offline.
     */
    async getStorageStatus() {
        const set = this.getOfflinePagesSet();
        return {
            cachedCount: set.size,
            totalPages: this.totalPages,
            percentage: Math.round((set.size / this.totalPages) * 100),
            isComplete: set.size >= this.totalPages
        };
    }

    /**
     * Bersihkan seluruh cache halaman offline.
     */
    async clearCache() {
        if (this.hasCacheSupport()) {
            try {
                await caches.delete(this.cacheName);
            } catch (e) {}
        }
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Simpan / baca penanda halaman terakhir dibaca.
     */
    getLastReadPage() {
        try {
            const val = parseInt(localStorage.getItem(this.lastReadKey) || '1', 10);
            return (val >= 1 && val <= this.totalPages) ? val : 1;
        } catch (e) {
            return 1;
        }
    }

    setLastReadPage(pageNumber) {
        try {
            localStorage.setItem(this.lastReadKey, String(pageNumber));
        } catch (e) {}
    }
}
