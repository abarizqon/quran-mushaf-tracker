/**
 * Optional UI Widget for Tilawah Tracker.
 * Menampilkan ringkasan kemajuan tilawah, peta 30 Juz interaktif, statistik, dan log terakhir.
 */
export default class TilawahWidget {
    /**
     * @param {Object} tracker Instance dari TilawahTracker.
     * @param {Object} [options]
     * @param {Function} [options.onJuzClick] Callback ketika item Juz pada peta khatam diklik: (juzNumber)
     */
    constructor(tracker, options = {}) {
        this.tracker = tracker;
        this.options = options;
        this.container = null;
    }

    /**
     * Render widget ke dalam elemen HTML yang dituju.
     * @param {string|HTMLElement} containerId ID elemen atau instance HTMLElement.
     */
    async render(containerId) {
        this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!this.container) throw new Error("Container tidak ditemukan.");

        this.container.classList.add('tilawah-widget');
        await this.update();
    }

    /**
     * Hitung status 30 Juz berdasarkan kumpulan halaman yang telah dibaca.
     * @param {Set<number>} pagesReadSet 
     */
    _calculate30JuzStatus(pagesReadSet) {
        // Rentang halaman per Juz standar Mushaf Madinah 604 hal
        const juzRanges = [
            [1, 21], [22, 41], [42, 61], [62, 81], [82, 101],
            [102, 121], [122, 141], [142, 161], [162, 181], [182, 201],
            [202, 221], [222, 241], [242, 261], [262, 281], [282, 301],
            [302, 321], [322, 341], [342, 361], [362, 381], [382, 401],
            [402, 421], [422, 441], [442, 461], [462, 481], [482, 501],
            [502, 521], [522, 541], [542, 561], [562, 581], [582, 604]
        ];

        return juzRanges.map(([start, end], idx) => {
            const juzNum = idx + 1;
            const totalInJuz = end - start + 1;
            let readInJuz = 0;
            for (let p = start; p <= end; p++) {
                if (pagesReadSet.has(p)) readInJuz++;
            }
            const pct = Math.round((readInJuz / totalInJuz) * 100);
            return {
                juz: juzNum,
                startPage: start,
                endPage: end,
                readCount: readInJuz,
                totalPages: totalInJuz,
                percent: pct,
                isCompleted: readInJuz === totalInJuz,
                isStarted: readInJuz > 0 && readInJuz < totalInJuz
            };
        });
    }

    /**
     * Memperbarui tampilan widget dengan data terbaru.
     */
    async update() {
        if (!this.container) return;
        
        this.container.innerHTML = '<div class="tw-loading">Memuat data tilawah...</div>';

        const stats = await this.tracker.getStats();
        const logs = await this.tracker.getLogs({ limit: 5 });
        const pagesReadSet = stats.pagesRead instanceof Set ? stats.pagesRead : new Set(stats.pagesRead || []);
        const juzList = this._calculate30JuzStatus(pagesReadSet);

        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (stats.progress / 100) * circumference;

        const html = `
            <div class="tw-header">
                <h3>Kemajuan Tilawah Al-Qur'an</h3>
            </div>
            
            <div class="tw-progress-container">
                <svg class="tw-progress-ring" width="120" height="120">
                    <circle class="tw-ring-bg" stroke-width="8" fill="transparent" r="${radius}" cx="60" cy="60" />
                    <circle class="tw-ring-value" stroke-width="8" fill="transparent" r="${radius}" cx="60" cy="60" 
                            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};" />
                </svg>
                <div class="tw-progress-text">
                    <span class="tw-percent">${stats.progress}%</span>
                </div>
            </div>

            <div class="tw-stats-grid">
                <div class="tw-stat-card">
                    <div class="tw-stat-title">Halaman</div>
                    <div class="tw-stat-val">${pagesReadSet.size} / ${stats.totalPages}</div>
                </div>
                <div class="tw-stat-card">
                    <div class="tw-stat-title">Streak Hari</div>
                    <div class="tw-stat-val">${stats.streak}</div>
                </div>
                <div class="tw-stat-card">
                    <div class="tw-stat-title">Khatam</div>
                    <div class="tw-stat-val">${stats.khatamCount || (stats.currentKhatam || 0)}x</div>
                </div>
            </div>

            <!-- PETA KHATAM 30 JUZ -->
            <div class="tw-juz-map-section">
                <div class="tw-sub-title">Peta Khatam 30 Juz</div>
                <div class="tw-juz-grid" id="twJuzGrid">
                    ${juzList.map(j => {
                        let badgeClass = 'tw-juz-item';
                        if (j.isCompleted) badgeClass += ' completed';
                        else if (j.isStarted) badgeClass += ' started';

                        return `
                            <button type="button" class="${badgeClass}" data-juz="${j.juz}" title="Juz ${j.juz} (${j.percent}%): ${j.readCount}/${j.totalPages} hal">
                                <span>${j.juz}</span>
                                ${j.isCompleted ? '<span class="tw-juz-trophy">🏆</span>' : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="tw-recent-logs">
                <div class="tw-sub-title">Aktivitas Terakhir</div>
                ${logs.length === 0 ? '<p class="tw-no-logs">Belum ada aktivitas tercatat.</p>' : ''}
                <ul class="tw-log-list">
                    ${logs.map(log => `
                        <li>
                            <div class="tw-log-date">${log.date}</div>
                            <div class="tw-log-detail">Hal. ${log.pageFrom} - ${log.pageTo} 
                                <span class="tw-badge ${log.source === 'auto' ? 'auto' : 'manual'}">${log.source === 'auto' ? 'Otomatis' : 'Manual'}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        this.container.innerHTML = html;

        // Attach event listeners for Juz items
        const juzButtons = this.container.querySelectorAll('.tw-juz-item');
        juzButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const juzNum = parseInt(btn.getAttribute('data-juz'));
                if (typeof this.options.onJuzClick === 'function') {
                    this.options.onJuzClick(juzNum);
                }
            });
        });
    }

    /**
     * Membersihkan widget.
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container = null;
        }
    }
}
