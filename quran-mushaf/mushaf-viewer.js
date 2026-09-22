/**
 * mushaf-viewer.js
 * 
 * Standalone UI Viewer Component untuk Mushaf Al-Qur'an (604 Halaman Rasm Utsmani).
 * Fitur:
 * - Header Interaktif Bilah Progres Juz 5-Tier Dinamis (Emerald, Teal, Indigo, Amber, Radiant Gold 100%)
 * - Mode Layar Penuh Imersif Murni via Ketukan Layar (Tap Gesture, Mushaf & Card Judul Tetap Center)
 * - Modal Pemilih Surat & Juz Terintegrasi (Tanpa dependensi eksternal)
 * - Touch swipe RTL (gesture membuka mushaf kanan ke kiri)
 * - 3D Page Curl animation
 * - Multi-tier offline caching (CacheStorage & multi-CDN fallback)
 * - Modal panduan tajwid berwarna
 */

import MushafEngine from './mushaf-engine.js';
import { 
    getPageDetails, 
    getJuzProgress, 
    getAllSurahs, 
    getAllJuz, 
    getSurahStartPage, 
    getJuzStartPage, 
    TOTAL_PAGES 
} from './quran-data.js';

export default class MushafViewer {
    /**
     * @param {HTMLElement|string} container - Element DOM atau selector container
     * @param {Object} options 
     * @param {MushafEngine} [options.engine]
     * @param {number} [options.initialPage=1]
     * @param {boolean} [options.enableTapFullscreen=true]
     * @param {Function} [options.onPageChange]
     * @param {Function} [options.onJuzCompleted]
     */
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) throw new Error('Container element tidak ditemukan.');

        this.engine = options.engine || new MushafEngine();
        this.currentPage = options.initialPage || this.engine.getLastReadPage() || 1;
        this.enableTapFullscreen = options.enableTapFullscreen !== false;
        this.onPageChange = options.onPageChange || null;
        this.onJuzCompleted = options.onJuzCompleted || null;

        this.isImmersive = false;
        this._lastToggleTime = 0;
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._touchStartTime = 0;

        this._initUI();
        this._attachEvents();
        this.renderPage(this.currentPage);
    }

    _initUI() {
        this.container.innerHTML = `
            <div class="qm-container" id="qmRoot">
                
                <!-- TOP HEADER BAR (COLLAPSIBLE IN IMMERSIVE MODE) -->
                <div class="qm-top-header" id="qmTopHeader">
                    <div class="qm-header-left">
                        <div class="qm-brand-title">Al-Qur'anul Karim</div>
                        <div class="qm-brand-sub" id="qmAyahHeaderInfo">Mushaf Madinah Utsmani</div>
                    </div>
                    <div class="qm-header-right">
                        <button type="button" class="qm-btn-tool" id="qmBtnPicker" title="Pilih Surat / Juz">
                            <span>Buka Indeks</span>
                        </button>
                        <button type="button" class="qm-btn-tool" id="qmBtnTajweed" title="Panduan Tajwid">
                            <span>Tajwid</span>
                        </button>
                    </div>
                </div>

                <!-- VIEWPORT AREA (CENTERED CONTENT) -->
                <div class="qm-viewport" id="qmViewport">
                    
                    <!-- INTERACTIVE JUZ PROGRESS CARD / TITLE BADGE -->
                    <div class="qm-juz-card" id="qmJuzCard" title="Klik untuk memilih Surat atau Juz">
                        <div class="qm-juz-ambient-tint" id="qmJuzTint" style="width: 0%;"></div>
                        <div class="qm-juz-content">
                            <div class="qm-juz-left">
                                <span class="qm-surah-name" id="qmSurahName">Memuat...</span>
                                <span class="qm-juz-badge-pill" id="qmJuzTag">Juz -</span>
                                <span class="qm-caret-icon">▾</span>
                            </div>
                            <div class="qm-juz-right">
                                <span class="qm-pct-pill" id="qmPctPill">0%</span>
                                <span class="qm-remain-pill" id="qmRemainPill">Sisa - hal</span>
                            </div>
                        </div>
                        <div class="qm-progress-track">
                            <div class="qm-progress-fill" id="qmProgressFill" style="width: 0%;">
                                <div class="qm-progress-shimmer"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 3D PERSPECTIVE FLIP STAGE -->
                    <div class="qm-flip-stage" id="qmFlipStage">
                        <div class="qm-img-frame" id="qmImgFrame">
                            
                            <!-- Loading Spinner -->
                            <div class="qm-loader" id="qmLoader">
                                <div class="qm-spinner"></div>
                                <div class="qm-loader-text" id="qmLoaderText">Memuat Halaman...</div>
                            </div>

                            <!-- Error Card -->
                            <div class="qm-error" id="qmError" style="display:none;">
                                <div style="font-size:2rem; margin-bottom:8px;">⚠️</div>
                                <div style="font-weight:700; color:#1e293b; margin-bottom:4px;">Gagal memuat halaman</div>
                                <div style="font-size:0.75rem; color:#64748b; margin-bottom:12px;">Periksa koneksi internet Anda</div>
                                <button type="button" class="qm-btn-retry" id="qmBtnRetry">Coba Lagi</button>
                            </div>

                            <!-- Mushaf Image Element -->
                            <img class="qm-mushaf-img" id="qmMushafImg" src="" alt="Halaman Mushaf" draggable="false" style="display:none;" />
                        </div>
                    </div>
                </div>

                <!-- NAVIGATION FOOTER (COLLAPSIBLE IN IMMERSIVE MODE) -->
                <div class="qm-nav-footer" id="qmNavFooter">
                    <div class="qm-nav-row">
                        <!-- NEXT BUTTON (RTL: MEMBUKA KE KIRI) -->
                        <button type="button" class="qm-btn-nav qm-btn-next" id="qmBtnNext" title="Halaman Berikutnya">
                            <span>Berikutnya</span>
                            <span class="qm-nav-arrow">←</span>
                        </button>

                        <div class="qm-page-indicator" id="qmPageIndicator">
                            Hal 1 / 604
                        </div>

                        <!-- PREV BUTTON (RTL: MEMBUKA KE KANAN) -->
                        <button type="button" class="qm-btn-nav qm-btn-prev" id="qmBtnPrev" title="Halaman Sebelumnya">
                            <span class="qm-nav-arrow">→</span>
                            <span>Sebelumnya</span>
                        </button>
                    </div>
                </div>

                <!-- IMMERSIVE FULLSCREEN TOAST -->
                <div class="qm-immersive-toast" id="qmImmersiveToast">
                    ✨ Mode Layar Penuh (Ketuk layar untuk menampilkan menu)
                </div>

                <!-- MODAL SURAT & JUZ PICKER -->
                <div class="qm-modal-overlay" id="qmPickerModal" style="display:none;">
                    <div class="qm-modal-dialog">
                        <div class="qm-modal-header">
                            <div class="qm-modal-tabs">
                                <button type="button" class="qm-tab-btn active" id="qmTabSurah">Daftar Surat</button>
                                <button type="button" class="qm-tab-btn" id="qmTabJuz">Daftar Juz</button>
                            </div>
                            <button type="button" class="qm-modal-close" id="qmClosePicker">✕</button>
                        </div>
                        
                        <div class="qm-modal-search-wrap" id="qmSearchWrap">
                            <input type="text" class="qm-modal-search" id="qmSearchInput" placeholder="Cari nama surat atau juz..." />
                        </div>

                        <div class="qm-modal-body" id="qmModalBody">
                            <div class="qm-picker-grid" id="qmPickerList"></div>
                        </div>
                    </div>
                </div>

                <!-- MODAL TAJWEED GUIDE -->
                <div class="qm-modal-overlay" id="qmTajweedModal" style="display:none;">
                    <div class="qm-modal-dialog" style="max-width: 420px;">
                        <div class="qm-modal-header">
                            <h3 style="margin:0; font-size:1.05rem; color:#0f172a;">Panduan Tajwid Warna</h3>
                            <button type="button" class="qm-modal-close" id="qmCloseTajweed">✕</button>
                        </div>
                        <div class="qm-modal-body" style="padding:16px 20px;">
                            <div class="qm-tajweed-list">
                                <div class="qm-tajweed-item">
                                    <span class="qm-tajweed-color" style="background:#dc2626;"></span>
                                    <div><b>Merah:</b> Mad Wajib / Lazim (4 - 6 harakat)</div>
                                </div>
                                <div class="qm-tajweed-item">
                                    <span class="qm-tajweed-color" style="background:#16a34a;"></span>
                                    <div><b>Hijau:</b> Ghunnah, Ikhfa, Idgham Bighunnah</div>
                                </div>
                                <div class="qm-tajweed-item">
                                    <span class="qm-tajweed-color" style="background:#2563eb;"></span>
                                    <div><b>Biru:</b> Qalqalah & Tafkhim (Tebal)</div>
                                </div>
                                <div class="qm-tajweed-item">
                                    <span class="qm-tajweed-color" style="background:#94a3b8;"></span>
                                    <div><b>Abu-abu:</b> Huruf tidak dibaca (Idgham Bila Ghunnah)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .qm-container {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: 680px;
                    height: 100vh;
                    height: 100dvh;
                    margin: 0 auto;
                    background: #fffbf2;
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }

                /* HEADER */
                .qm-top-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #ffffff;
                    padding: 10px 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                    z-index: 40;
                    flex-shrink: 0;
                    width: 100%;
                    box-sizing: border-box;
                    max-height: 80px;
                    overflow: hidden;
                    transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1), padding 0.32s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .qm-brand-title {
                    font-weight: 800;
                    font-size: 0.95rem;
                    color: #006b3f;
                    line-height: 1.2;
                }
                .qm-brand-sub {
                    font-size: 0.72rem;
                    color: #64748b;
                    font-weight: 600;
                }
                .qm-header-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .qm-btn-tool {
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    color: #334155;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.76rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .qm-btn-tool:hover {
                    background: #f1f5f9;
                    border-color: #94a3b8;
                    color: #006b3f;
                }

                /* VIEWPORT AREA */
                .qm-viewport {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 10px 14px 14px;
                    position: relative;
                    width: 100%;
                    box-sizing: border-box;
                    touch-action: pan-y;
                    transition: padding 0.32s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* INTERACTIVE JUZ CARD */
                .qm-juz-card {
                    position: relative;
                    width: 100%;
                    max-width: 600px;
                    box-sizing: border-box;
                    background: #ffffff;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 7px 12px 10px 12px;
                    margin: auto auto 8px auto;
                    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
                    flex-shrink: 0;
                    cursor: pointer;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .qm-juz-card:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
                    transform: translateY(-1px);
                }
                .qm-juz-card:active {
                    transform: scale(0.985);
                }

                .qm-juz-ambient-tint {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    background: linear-gradient(90deg, rgba(16, 185, 129, 0.06) 0%, rgba(5, 150, 105, 0.12) 100%);
                    border-radius: 12px 0 0 12px;
                    pointer-events: none;
                    transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                    z-index: 1;
                }

                .qm-juz-content {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    width: 100%;
                }
                .qm-juz-left {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    min-width: 0;
                    flex: 1;
                }
                .qm-surah-name {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .qm-juz-badge-pill {
                    font-size: 0.68rem;
                    font-weight: 800;
                    color: #047857;
                    background: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    padding: 1.5px 6px;
                    border-radius: 6px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .qm-caret-icon {
                    font-size: 0.68rem;
                    color: #94a3b8;
                    flex-shrink: 0;
                }
                .qm-juz-right {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    flex-shrink: 0;
                }
                .qm-pct-pill {
                    font-size: 0.76rem;
                    font-weight: 800;
                    color: #006b3f;
                    background: #dcfce7;
                    padding: 1.5px 6px;
                    border-radius: 6px;
                    border: 1px solid #bbf7d0;
                    white-space: nowrap;
                }
                .qm-remain-pill {
                    font-size: 0.66rem;
                    font-weight: 600;
                    color: #64748b;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 2px 6px;
                    border-radius: 6px;
                    white-space: nowrap;
                }

                .qm-progress-track {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 3.5px;
                    background: #f1f5f9;
                    border-bottom-left-radius: 13px;
                    border-bottom-right-radius: 13px;
                    overflow: hidden;
                    z-index: 2;
                }
                .qm-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #10b981 0%, #006b3f 100%);
                    border-radius: 2px;
                    position: relative;
                    overflow: hidden;
                    transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
                }
                .qm-progress-shimmer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.7) 50%, transparent 100%);
                    animation: qmShine 2.2s infinite ease-in-out;
                }
                @keyframes qmShine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }

                /* 3D PERSPECTIVE FLIP STAGE */
                .qm-flip-stage {
                    width: 100%;
                    max-width: 600px;
                    position: relative;
                    perspective: 1400px;
                    display: flex;
                    justify-content: center;
                    margin: 0 auto auto auto;
                }
                .qm-img-frame {
                    width: 100%;
                    position: relative;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.09);
                    min-height: 480px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    transform-style: preserve-3d;
                    transition: transform 0.15s ease;
                    overflow: hidden;
                }
                .qm-mushaf-img {
                    width: 100%;
                    height: auto;
                    display: block;
                    border-radius: 8px;
                    user-select: none;
                    -webkit-user-drag: none;
                    transition: opacity 0.2s ease;
                }

                /* LOADER & ERROR */
                .qm-loader {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 80px 20px;
                    gap: 14px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .qm-spinner {
                    width: 38px;
                    height: 38px;
                    border: 3.5px solid #e2e8f0;
                    border-top-color: #006b3f;
                    border-radius: 50%;
                    animation: qmSpin 0.75s linear infinite;
                }
                @keyframes qmSpin { 100% { transform: rotate(360deg); } }
                .qm-loader-text {
                    font-size: 0.8rem;
                    color: #64748b;
                    font-weight: 600;
                }
                .qm-error {
                    text-align: center;
                    padding: 60px 20px;
                }
                .qm-btn-retry {
                    background: #006b3f;
                    color: white;
                    border: none;
                    padding: 7px 16px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                }

                /* NAVIGATION FOOTER */
                .qm-nav-footer {
                    position: relative;
                    z-index: 40;
                    flex-shrink: 0;
                    background: #ffffff;
                    border-top: 1px solid #e2e8f0;
                    box-shadow: 0 -4px 15px rgba(0,0,0,0.06);
                    padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 10px));
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: 100%;
                    box-sizing: border-box;
                    max-height: 120px;
                    overflow: hidden;
                    transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1), padding 0.32s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .qm-nav-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    gap: 10px;
                }
                .qm-btn-nav {
                    flex: 1;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px 14px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 0.85rem;
                    cursor: pointer;
                    border: none;
                    transition: all 0.15s ease;
                }
                .qm-btn-next {
                    background: #006b3f;
                    color: white;
                    box-shadow: 0 2px 8px rgba(0, 107, 63, 0.25);
                }
                .qm-btn-next:active { transform: scale(0.97); }
                .qm-btn-prev {
                    background: #f1f5f9;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                }
                .qm-btn-prev:active { transform: scale(0.97); }
                .qm-btn-nav:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }
                .qm-page-indicator {
                    font-size: 0.78rem;
                    font-weight: 800;
                    color: #64748b;
                    white-space: nowrap;
                    padding: 6px 10px;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }

                /* ============================================================
                   IMMERSIVE FULLSCREEN MODE
                   ============================================================ */
                .qm-container.qm-immersive-mode .qm-top-header {
                    transform: translateY(-100%);
                    opacity: 0;
                    pointer-events: none;
                    max-height: 0 !important;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                }
                .qm-container.qm-immersive-mode .qm-nav-footer {
                    transform: translateY(100%);
                    opacity: 0;
                    pointer-events: none;
                    max-height: 0 !important;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                }
                .qm-container.qm-immersive-mode .qm-viewport {
                    padding-top: calc(env(safe-area-inset-top, 0px) + 10px);
                    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
                }

                /* IMMERSIVE TOAST PILL */
                .qm-immersive-toast {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%) translateY(30px);
                    background: rgba(15, 23, 42, 0.9);
                    color: #ffffff;
                    font-size: 0.74rem;
                    font-weight: 700;
                    padding: 7px 16px;
                    border-radius: 20px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.28);
                    z-index: 100010;
                    pointer-events: none;
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    backdrop-filter: blur(6px);
                    white-space: nowrap;
                }
                .qm-immersive-toast.show {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }

                /* MODAL OVERLAY & DIALOG */
                .qm-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    box-sizing: border-box;
                }
                .qm-modal-dialog {
                    background: #ffffff;
                    border-radius: 18px;
                    width: 100%;
                    max-width: 520px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.22);
                    overflow: hidden;
                    box-sizing: border-box;
                }
                .qm-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 18px;
                    border-bottom: 1px solid #e2e8f0;
                    flex-shrink: 0;
                }
                .qm-modal-tabs {
                    display: flex;
                    gap: 6px;
                }
                .qm-tab-btn {
                    padding: 6px 14px;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                    background: #f8fafc;
                    font-weight: 700;
                    font-size: 0.8rem;
                    color: #475569;
                    cursor: pointer;
                }
                .qm-tab-btn.active {
                    background: #006b3f;
                    color: white;
                    border-color: #006b3f;
                }
                .qm-modal-close {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px;
                }
                .qm-modal-close:hover { color: #334155; }
                .qm-modal-search-wrap {
                    padding: 10px 18px;
                    border-bottom: 1px solid #f1f5f9;
                    flex-shrink: 0;
                }
                .qm-modal-search {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    box-sizing: border-box;
                    outline: none;
                }
                .qm-modal-search:focus {
                    border-color: #006b3f;
                }
                .qm-modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px 18px 20px;
                }
                .qm-picker-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 8px;
                }
                .qm-picker-card {
                    padding: 10px 14px;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    background: #ffffff;
                }
                .qm-picker-card:hover {
                    border-color: #006b3f;
                    background: #f0fdf4;
                }
                .qm-picker-card.active {
                    border-color: #006b3f;
                    background: #ecfdf5;
                    font-weight: 700;
                }

                .qm-tajweed-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    font-size: 0.85rem;
                }
                .qm-tajweed-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .qm-tajweed-color {
                    width: 18px;
                    height: 18px;
                    border-radius: 4px;
                    flex-shrink: 0;
                }
            </style>
        `;

        this.rootEl = this.container.querySelector('#qmRoot');
        this.viewportEl = this.container.querySelector('#qmViewport');
        this.imgEl = this.container.querySelector('#qmMushafImg');
        this.loaderEl = this.container.querySelector('#qmLoader');
        this.loaderTextEl = this.container.querySelector('#qmLoaderText');
        this.errorEl = this.container.querySelector('#qmError');
        this.btnRetry = this.container.querySelector('#qmBtnRetry');

        this.juzCardEl = this.container.querySelector('#qmJuzCard');
        this.juzTintEl = this.container.querySelector('#qmJuzTint');
        this.surahNameEl = this.container.querySelector('#qmSurahName');
        this.juzTagEl = this.container.querySelector('#qmJuzTag');
        this.pctPillEl = this.container.querySelector('#qmPctPill');
        this.remainPillEl = this.container.querySelector('#qmRemainPill');
        this.progressFillEl = this.container.querySelector('#qmProgressFill');

        this.btnNext = this.container.querySelector('#qmBtnNext');
        this.btnPrev = this.container.querySelector('#qmBtnPrev');
        this.pageIndicatorEl = this.container.querySelector('#qmPageIndicator');
        this.ayahHeaderInfoEl = this.container.querySelector('#qmAyahHeaderInfo');

        this.pickerModal = this.container.querySelector('#qmPickerModal');
        this.tajweedModal = this.container.querySelector('#qmTajweedModal');
        this.pickerList = this.container.querySelector('#qmPickerList');
        this.searchInput = this.container.querySelector('#qmSearchInput');
        this.tabSurah = this.container.querySelector('#qmTabSurah');
        this.tabJuz = this.container.querySelector('#qmTabJuz');

        this.currentPickerTab = 'surah';
    }

    _attachEvents() {
        this.btnNext.addEventListener('click', (e) => {
            e.stopPropagation();
            this.nextPage();
        });
        this.btnPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            this.prevPage();
        });
        this.btnRetry.addEventListener('click', (e) => {
            e.stopPropagation();
            this.renderPage(this.currentPage);
        });

        // Open Picker Modal via Juz Card or Top Header Button
        this.juzCardEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPickerModal();
        });
        this.container.querySelector('#qmBtnPicker').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPickerModal();
        });
        this.container.querySelector('#qmClosePicker').addEventListener('click', () => {
            this.closePickerModal();
        });

        // Tajweed Modal
        this.container.querySelector('#qmBtnTajweed').addEventListener('click', (e) => {
            e.stopPropagation();
            this.tajweedModal.style.display = 'flex';
        });
        this.container.querySelector('#qmCloseTajweed').addEventListener('click', () => {
            this.tajweedModal.style.display = 'none';
        });

        // Tabs in Picker Modal
        this.tabSurah.addEventListener('click', () => this._switchPickerTab('surah'));
        this.tabJuz.addEventListener('click', () => this._switchPickerTab('juz'));

        // Search in Picker Modal
        this.searchInput.addEventListener('input', () => this._renderPickerList());

        // Keyboard Navigation (RTL: Panah Kiri = Next, Panah Kanan = Prev)
        window.addEventListener('keydown', (e) => {
            if (e.target && e.target.tagName === 'INPUT') return;
            if (e.key === 'ArrowLeft') this.nextPage();
            if (e.key === 'ArrowRight') this.prevPage();
        });

        // Touch & Tap Navigation in Viewport
        if (this.viewportEl) {
            this.viewportEl.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) return;
                this._touchStartX = e.touches[0].clientX;
                this._touchStartY = e.touches[0].clientY;
                this._touchStartTime = Date.now();
            }, { passive: true });

            this.viewportEl.addEventListener('touchend', (e) => {
                const diffX = e.changedTouches[0].clientX - this._touchStartX;
                const diffY = e.changedTouches[0].clientY - this._touchStartY;
                const elapsed = Date.now() - this._touchStartTime;

                // Swipe Gesture (Horizontal RTL)
                if (Math.abs(diffX) >= 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5 && elapsed <= 500) {
                    if (diffX > 0) this.nextPage(); // geser kanan -> hal berikutnya (RTL)
                    else this.prevPage();           // geser kiri -> hal sebelumnya (RTL)
                    return;
                }

                // Pure Tap Gesture -> Toggle Fullscreen Immersive Mode
                if (this.enableTapFullscreen && Math.abs(diffX) < 15 && Math.abs(diffY) < 15 && elapsed < 350) {
                    if (e.target && e.target.closest('button, .qm-juz-card, a, input, .qm-modal-overlay')) {
                        return;
                    }
                    this.toggleImmersive();
                }
            }, { passive: true });

            // Desktop Mouse Click for Immersive Toggle
            this.viewportEl.addEventListener('click', (e) => {
                if (!this.enableTapFullscreen) return;
                if (e.target && e.target.closest('button, .qm-juz-card, a, input, .qm-modal-overlay')) {
                    return;
                }
                this.toggleImmersive();
            });
        }
    }

    /**
     * Toggle Immersive Fullscreen Reader Mode (Murni via Tap Layar)
     * @param {boolean|null} forceState 
     */
    toggleImmersive(forceState = null) {
        const now = Date.now();
        if (now - this._lastToggleTime < 380) return;
        this._lastToggleTime = now;

        if (forceState !== null) {
            this.isImmersive = !!forceState;
        } else {
            this.isImmersive = !this.isImmersive;
        }

        if (this.isImmersive) {
            this.rootEl.classList.add('qm-immersive-mode');
            this._showToast("✨ Mode Layar Penuh (Ketuk layar untuk menampilkan menu)");
        } else {
            this.rootEl.classList.remove('qm-immersive-mode');
        }
    }

    _showToast(msg) {
        const toast = this.container.querySelector('#qmImmersiveToast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }

    /**
     * Hitung tema warna 5-tier progres Juz
     * @param {number} percent 
     * @param {boolean} isCompleted 
     */
    _getJuzProgressTheme(percent, isCompleted) {
        if (isCompleted || percent >= 100) {
            return {
                barBg: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                barShadow: '0 0 14px rgba(245, 158, 11, 0.7)',
                tintBg: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.22) 100%)',
                badgeBorder: '#f59e0b',
                badgeShadow: '0 4px 18px rgba(245, 158, 11, 0.35)',
                pctBg: '#fef3c7',
                pctColor: '#b45309',
                pctBorder: '#fde68a',
                pctLabel: '100% 🏆'
            };
        }
        if (percent <= 25) {
            return {
                barBg: 'linear-gradient(90deg, #10b981 0%, #006b3f 100%)',
                barShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                tintBg: 'linear-gradient(90deg, rgba(16, 185, 129, 0.06) 0%, rgba(5, 150, 105, 0.12) 100%)',
                badgeBorder: '#e2e8f0',
                badgeShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                pctBg: '#dcfce7',
                pctColor: '#006b3f',
                pctBorder: '#bbf7d0',
                pctLabel: `${percent}%`
            };
        }
        if (percent <= 50) {
            return {
                barBg: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)',
                barShadow: '0 0 8px rgba(6, 182, 212, 0.5)',
                tintBg: 'linear-gradient(90deg, rgba(6, 182, 212, 0.06) 0%, rgba(8, 145, 178, 0.13) 100%)',
                badgeBorder: '#a5f3fc',
                badgeShadow: '0 2px 10px rgba(6, 182, 212, 0.12)',
                pctBg: '#cffafe',
                pctColor: '#0e7490',
                pctBorder: '#a5f3fc',
                pctLabel: `${percent}%`
            };
        }
        if (percent <= 75) {
            return {
                barBg: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
                barShadow: '0 0 8px rgba(99, 102, 241, 0.5)',
                tintBg: 'linear-gradient(90deg, rgba(99, 102, 241, 0.06) 0%, rgba(79, 70, 229, 0.13) 100%)',
                badgeBorder: '#c7d2fe',
                badgeShadow: '0 2px 10px rgba(99, 102, 241, 0.12)',
                pctBg: '#e0e7ff',
                pctColor: '#4338ca',
                pctBorder: '#c7d2fe',
                pctLabel: `${percent}%`
            };
        }
        return {
            barBg: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)',
            barShadow: '0 0 10px rgba(245, 158, 11, 0.6)',
            tintBg: 'linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, rgba(234, 88, 12, 0.15) 100%)',
            badgeBorder: '#fde68a',
            badgeShadow: '0 2px 12px rgba(245, 158, 11, 0.16)',
            pctBg: '#fef3c7',
            pctColor: '#b45309',
            pctBorder: '#fde68a',
            pctLabel: `${percent}%`
        };
    }

    _updateJuzProgress(pageNumber) {
        const prog = getJuzProgress(pageNumber);
        if (!prog) return;

        const isCompleted = (prog.percent === 100);
        const theme = this._getJuzProgressTheme(prog.percent, isCompleted);

        this.progressFillEl.style.width = `${prog.percent}%`;
        this.progressFillEl.style.background = theme.barBg;
        this.progressFillEl.style.boxShadow = theme.barShadow;

        this.juzTintEl.style.width = `${prog.percent}%`;
        this.juzTintEl.style.background = theme.tintBg;

        this.juzCardEl.style.borderColor = theme.badgeBorder;
        this.juzCardEl.style.boxShadow = theme.badgeShadow;

        this.pctPillEl.textContent = theme.pctLabel;
        this.pctPillEl.style.background = theme.pctBg;
        this.pctPillEl.style.color = theme.pctColor;
        this.pctPillEl.style.borderColor = theme.pctBorder;

        this.juzTagEl.textContent = `Juz ${prog.juz}`;
        this.remainPillEl.textContent = (prog.remainPages === 0) ? '🏆 Juz Selesai' : `Sisa ${prog.remainPages} hal`;

        if (isCompleted && typeof this.onJuzCompleted === 'function') {
            this.onJuzCompleted(prog.juz);
        }
    }

    async renderPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > TOTAL_PAGES) return;
        this.currentPage = pageNumber;
        this.engine.setLastReadPage(pageNumber);

        const details = getPageDetails(pageNumber);
        if (details) {
            this.surahNameEl.textContent = `${details.surahNumber}. ${details.surahName}`;
            this.ayahHeaderInfoEl.textContent = `Surat ${details.surahName} • Ayat ${details.startAyah}-${details.endAyah}`;
        }

        this.pageIndicatorEl.textContent = `Hal ${pageNumber} / ${TOTAL_PAGES}`;
        this.btnPrev.disabled = (pageNumber <= 1);
        this.btnNext.disabled = (pageNumber >= TOTAL_PAGES);

        this._updateJuzProgress(pageNumber);

        this.errorEl.style.display = 'none';
        this.loaderEl.style.display = 'flex';
        this.loaderTextEl.textContent = `Memuat Halaman ${pageNumber}...`;
        this.imgEl.style.display = 'none';

        const urls = this.engine.getCandidateUrls(pageNumber);
        let idx = 0;

        const tryLoad = async () => {
            if (idx >= urls.length) {
                this.loaderEl.style.display = 'none';
                this.errorEl.style.display = 'block';
                return;
            }

            const currentUrl = await (idx === 0 ? this.engine.getPageSourceUrl(pageNumber) : Promise.resolve(urls[idx]));
            idx++;

            this.imgEl.onload = () => {
                this.loaderEl.style.display = 'none';
                this.errorEl.style.display = 'none';
                this.imgEl.style.display = 'block';
            };
            this.imgEl.onerror = () => tryLoad();
            this.imgEl.src = currentUrl;
        };

        tryLoad();

        if (typeof this.onPageChange === 'function') {
            this.onPageChange(pageNumber, details);
        }
    }

    nextPage() {
        if (this.currentPage < TOTAL_PAGES) {
            this.renderPage(this.currentPage + 1);
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.renderPage(this.currentPage - 1);
        }
    }

    openPickerModal() {
        this.pickerModal.style.display = 'flex';
        this.searchInput.value = '';
        this._renderPickerList();
    }

    closePickerModal() {
        this.pickerModal.style.display = 'none';
    }

    _switchPickerTab(tab) {
        this.currentPickerTab = tab;
        this.tabSurah.classList.toggle('active', tab === 'surah');
        this.tabJuz.classList.toggle('active', tab === 'juz');
        this.searchInput.placeholder = (tab === 'surah') ? 'Cari nama surat...' : 'Cari nomor juz...';
        this._renderPickerList();
    }

    _renderPickerList() {
        const query = (this.searchInput.value || '').trim().toLowerCase();
        this.pickerList.innerHTML = '';

        if (this.currentPickerTab === 'surah') {
            const surahs = getAllSurahs().filter(s => 
                !query || s.name.toLowerCase().includes(query) || s.arabic.includes(query) || s.id.toString() === query
            );

            surahs.forEach(s => {
                const card = document.createElement('div');
                card.className = 'qm-picker-card';
                card.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:800; color:#006b3f; font-size:0.85rem; width:26px;">${s.id}</span>
                        <div>
                            <div style="font-weight:700; font-size:0.88rem; color:#0f172a;">${s.name}</div>
                            <div style="font-size:0.72rem; color:#64748b;">Mulai Hal ${s.startPage}</div>
                        </div>
                    </div>
                    <div style="font-size:1.1rem; color:#047857; font-family:'Amiri', serif;">${s.arabic}</div>
                `;
                card.onclick = () => {
                    this.renderPage(s.startPage);
                    this.closePickerModal();
                };
                this.pickerList.appendChild(card);
            });
        } else {
            const allJuz = getAllJuz().filter(j => 
                !query || j.juz.toString() === query || j.displayText.toLowerCase().includes(query)
            );

            allJuz.forEach(j => {
                const card = document.createElement('div');
                card.className = 'qm-picker-card';
                card.innerHTML = `
                    <div>
                        <div style="font-weight:800; font-size:0.9rem; color:#006b3f;">Juz ${j.juz}</div>
                        <div style="font-size:0.75rem; color:#64748b;">Halaman ${j.startPage} - ${j.endPage} (${j.totalPages} hal)</div>
                    </div>
                    <div style="font-size:0.8rem; font-weight:700; color:#475569;">Buka Juz →</div>
                `;
                card.onclick = () => {
                    this.renderPage(j.startPage);
                    this.closePickerModal();
                };
                this.pickerList.appendChild(card);
            });
        }
    }
}
