/**
 * LocalStorage Adapter for Tilawah Tracker
 * Cocok untuk penggunaan offline, demo, atau aplikasi klien sederhana tanpa backend.
 */
export default class LocalStorageAdapter {
    constructor() {
        this.prefix = "tilawah_";
    }

    _getKey(userId) {
        return `${this.prefix}stats_${userId}`;
    }

    _getLogsKey(userId) {
        return `${this.prefix}logs_${userId}`;
    }

    async saveLog(userId, logData) {
        const logsKey = this._getLogsKey(userId);
        const logs = JSON.parse(localStorage.getItem(logsKey) || "[]");
        logData.id = Date.now().toString();
        logs.push(logData);
        localStorage.setItem(logsKey, JSON.stringify(logs));
        return true;
    }

    async updateStats(userId, newPages, date) {
        const statsKey = this._getKey(userId);
        let stats = JSON.parse(localStorage.getItem(statsKey));

        const dt = date instanceof Date ? date : new Date(date);
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        const maxPage = Math.max(...newPages);

        if (stats) {
            let newStreak = stats.streak || 0;
            if (stats.lastReadDate) {
                const lastDate = new Date(stats.lastReadDate);
                const diffTime = Math.abs(date - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    newStreak += 1;
                } else if (diffDays > 1) {
                    newStreak = 1;
                }
            } else {
                newStreak = 1;
            }

            // Gabungkan array unik
            const pagesSet = new Set([...(stats.pagesRead || []), ...newPages]);

            stats.totalReads = (stats.totalReads || 0) + 1;
            stats.streak = newStreak;
            stats.lastReadDate = dateStr;
            stats.lastReadPage = maxPage;
            stats.pagesRead = Array.from(pagesSet);
        } else {
            stats = {
                totalPages: 604,
                totalReads: 1,
                currentKhatam: 0,
                streak: 1,
                lastReadDate: dateStr,
                lastReadPage: maxPage,
                pagesRead: newPages,
                role: "user",
                nama: "Pengguna"
            };
        }

        localStorage.setItem(statsKey, JSON.stringify(stats));
        return true;
    }

    async getStats(userId) {
        const statsKey = this._getKey(userId);
        const stats = localStorage.getItem(statsKey);
        return stats ? JSON.parse(stats) : null;
    }

    async getLogs(userId, options = {}) {
        const logsKey = this._getLogsKey(userId);
        let logs = JSON.parse(localStorage.getItem(logsKey) || "[]");

        // Sort descending by timestamp
        logs.sort((a, b) => b.timestamp - a.timestamp);

        if (options.startDate) {
            logs = logs.filter(log => log.date >= options.startDate);
        }
        if (options.endDate) {
            logs = logs.filter(log => log.date <= options.endDate);
        }
        if (options.source) {
            logs = logs.filter(log => log.source === options.source);
        }
        if (options.limit) {
            logs = logs.slice(0, options.limit);
        }

        return logs;
    }

    async resetKhatam(userId) {
        const statsKey = this._getKey(userId);
        let stats = JSON.parse(localStorage.getItem(statsKey));
        if (stats) {
            stats.currentKhatam = (stats.currentKhatam || 0) + 1;
            stats.pagesRead = [];
            localStorage.setItem(statsKey, JSON.stringify(stats));
            return true;
        }
        return false;
    }
}
