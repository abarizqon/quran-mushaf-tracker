/**
 * REST API Adapter for Tilawah Tracker
 * Menghubungkan tilawah tracker dengan RESTful backend eksternal.
 */
export default class ApiAdapter {
    /**
     * @param {Object} config Konfigurasi API
     * @param {string} config.baseUrl Base URL untuk API endpoint.
     * @param {Object} [config.headers] Header tambahan untuk autentikasi (misal: Authorization).
     */
    constructor({ baseUrl, headers = {} }) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
            ...headers
        };
    }

    async saveLog(userId, logData) {
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}/logs`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(logData)
            });
            return response.ok;
        } catch (error) {
            console.error("API saveLog error:", error);
            return false;
        }
    }

    async updateStats(userId, newPages, date) {
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}/stats`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify({ newPages, date: date.toISOString() })
            });
            return response.ok;
        } catch (error) {
            console.error("API updateStats error:", error);
            return false;
        }
    }

    async getStats(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}/stats`, {
                headers: this.headers
            });
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("API getStats error:", error);
            return null;
        }
    }

    async getLogs(userId, options = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (options.limit) queryParams.append('limit', options.limit);
            if (options.startDate) queryParams.append('startDate', options.startDate);
            if (options.endDate) queryParams.append('endDate', options.endDate);
            if (options.source) queryParams.append('source', options.source);

            const url = `${this.baseUrl}/users/${userId}/logs?${queryParams.toString()}`;
            const response = await fetch(url, { headers: this.headers });
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error("API getLogs error:", error);
            return [];
        }
    }

    async resetKhatam(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}/khatam/reset`, {
                method: 'POST',
                headers: this.headers
            });
            return response.ok;
        } catch (error) {
            console.error("API resetKhatam error:", error);
            return false;
        }
    }
}
