/**
 * dzikir-widget.js
 * Renderer UI mandiri untuk Dzikir Tracker.
 */

import DzikirEngine from './dzikir-engine.js';

export default class DzikirWidget {
    /**
     * @param {Object} config
     * @param {string|HTMLElement} config.container
     * @param {DzikirEngine} [config.engine]
     */
    constructor(config = {}) {
        this.container = typeof config.container === 'string'
            ? document.querySelector(config.container)
            : config.container;

        if (!this.container) {
            throw new Error("Container elemen untuk DzikirWidget tidak ditemukan.");
        }

        this.engine = config.engine || new DzikirEngine();
        this.activeCategory = null;

        this.init();
    }

    init() {
        const rec = this.engine.getRecommendedCategory();
        this.renderCategoryMenu(rec.key);
    }

    renderCategoryMenu(recommendedKey = 'pagi') {
        const categories = this.engine.getCategories();
        const rec = this.engine.getRecommendedCategory();

        this.container.innerHTML = `
            <div class="dzikir-container">
                <div class="dzikir-hero-card">
                    <div style="font-size:0.75rem; font-weight:700; opacity:0.85; margin-bottom:4px; text-transform:uppercase;">
                        Rekomendasi Saat Ini
                    </div>
                    <h2 class="dzikir-hero-title">${rec.title}</h2>
                    <p class="dzikir-hero-desc">${rec.reason}</p>
                    <button type="button" class="dzikir-btn-primary" id="btnOpenRecommended">
                        <span>Buka Sekarang</span>
                    </button>
                </div>

                <h3 style="font-size:1.05rem; font-weight:800; margin:0 0 12px;">Pilihan Kategori Dzikir</h3>
                <div style="display:grid; grid-template-columns:1fr; gap:10px;" id="categoryListWrap"></div>
            </div>
        `;

        document.getElementById('btnOpenRecommended').onclick = () => {
            this.renderReader(recommendedKey);
        };

        const listWrap = document.getElementById('categoryListWrap');
        categories.forEach(cat => {
            const progress = this.engine.getProgress(cat.key);
            const card = document.createElement('div');
            card.style.cssText = `
                background: #ffffff;
                border: 1.5px solid #e2e8f0;
                border-radius: 14px;
                padding: 14px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                transition: transform 0.15s ease, border-color 0.15s ease;
            `;
            card.onmouseenter = () => card.style.borderColor = '#10b981';
            card.onmouseleave = () => card.style.borderColor = '#e2e8f0';
            card.onclick = () => this.renderReader(cat.key);

            card.innerHTML = `
                <div>
                    <h4 style="margin:0 0 3px; font-size:0.95rem; font-weight:700; color:#0f172a;">${cat.title}</h4>
                    <p style="margin:0; font-size:0.75rem; color:#64748b;">${cat.desc}</p>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:0.74rem; font-weight:700; color:#006b3f; background:#ecfdf5; padding:4px 8px; border-radius:8px;">
                        ${cat.count} Doa
                    </span>
                    ${progress.percent > 0 ? `<div style="font-size:0.68rem; color:#059669; font-weight:700; margin-top:4px;">${progress.percent}% Selesai</div>` : ''}
                </div>
            `;
            listWrap.appendChild(card);
        });
    }

    renderReader(categoryKey) {
        this.activeCategory = categoryKey;
        const { items } = this.engine.openCategory(categoryKey);
        const catInfo = this.engine.getCategories().find(c => c.key === categoryKey);
        const title = catInfo ? catInfo.title : 'Doa & Dzikir';

        this.container.innerHTML = `
            <div class="dzikir-container">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                    <button type="button" id="btnBackToMenu" style="background:#f1f5f9; border:none; border-radius:10px; padding:8px 14px; font-weight:700; cursor:pointer; font-size:0.84rem; color:#475569;">
                        ← Kembali
                    </button>
                    <div style="font-weight:800; font-size:1rem; color:#0f172a;">${title}</div>
                    <button type="button" id="btnResetCounters" style="background:none; border:none; font-size:0.78rem; font-weight:700; color:#ef4444; cursor:pointer;">
                        Reset
                    </button>
                </div>

                <div id="dzikirCardsWrap"></div>
            </div>
        `;

        document.getElementById('btnBackToMenu').onclick = () => {
            this.renderCategoryMenu();
        };

        document.getElementById('btnResetCounters').onclick = () => {
            if (confirm("Reset seluruh hitungan dzikir pada kategori ini?")) {
                this.engine.resetCounter();
                this.renderReader(categoryKey);
            }
        };

        const wrap = document.getElementById('dzikirCardsWrap');
        items.forEach(item => {
            const current = this.engine.counterState[item.id] || 0;
            const completed = current >= item.target;

            const card = document.createElement('div');
            card.id = `card_${item.id}`;
            card.className = `dzikir-card ${completed ? 'completed' : ''}`;

            card.innerHTML = `
                <div class="dzikir-title">${item.title}</div>
                <div class="dzikir-source">${item.source}</div>
                <div class="dzikir-arabic">${item.arabic}</div>
                <div class="dzikir-latin">${item.latin}</div>
                <div class="dzikir-arti">${item.arti}</div>
                <div class="dzikir-counter-bar">
                    <span class="dzikir-target-badge" id="badge_${item.id}">
                        Target: ${item.target}x
                    </span>
                    <button type="button" class="dzikir-count-btn" id="btnCount_${item.id}">
                        ${completed ? '✓ Selesai' : `${current} / ${item.target}`}
                    </button>
                </div>
            `;

            const btn = card.querySelector(`#btnCount_${item.id}`);
            btn.onclick = () => {
                const res = this.engine.incrementCounter(item.id);
                if (res) {
                    btn.textContent = res.completed ? '✓ Selesai' : `${res.current} / ${res.target}`;
                    if (res.completed) {
                        card.classList.add('completed');
                    }
                    if (res.collectionCompleted) {
                        this.engine.saveSessionRecord(categoryKey);
                        setTimeout(() => {
                            alert(`Alhamdulillah! Seluruh dzikir pada "${title}" telah tuntas dibaca.`);
                        }, 250);
                    }
                }
            };

            wrap.appendChild(card);
        });
    }
}
