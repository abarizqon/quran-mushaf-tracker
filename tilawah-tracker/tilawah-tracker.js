/**
 * Core class for Tilawah Tracker.
 * Modul untuk melacak kemajuan membaca Al-Qur'an (604 halaman Mushaf Madinah).
 */
export default class TilawahTracker {
  /**
   * Membuat instance TilawahTracker baru.
   * @param {Object} options Konfigurasi untuk tracker.
   * @param {Object} options.adapter Instance dari adapter penyimpanan (Firebase, LocalStorage, atau API).
   * @param {string} options.userId ID unik pengguna.
   * @param {number} [options.autoDetectThreshold=30] Ambang batas waktu minimum (dalam detik) untuk mendeteksi bacaan otomatis.
   * @param {number} [options.totalPages=604] Total halaman Al-Qur'an (default 604 untuk Mushaf Madinah).
   * @param {Function} [options.onPageRead] Callback yang dipanggil ketika sebuah halaman berhasil dibaca.
   */
  constructor({ adapter, userId, autoDetectThreshold = 30, totalPages = 604, onPageRead = null }) {
    if (!adapter) throw new Error("Adapter penyimpanan harus disediakan.");
    if (!userId) throw new Error("ID Pengguna harus disediakan.");

    this.adapter = adapter;
    this.userId = userId;
    this.autoDetectThreshold = autoDetectThreshold;
    this.totalPages = totalPages;
    this.onPageRead = onPageRead;

    this.currentSession = null;
  }

  /**
   * Memulai pengatur waktu untuk deteksi bacaan otomatis pada halaman tertentu.
   * @param {number} pageNumber Nomor halaman yang sedang dibaca.
   */
  startReading(pageNumber) {
    if (pageNumber < 1 || pageNumber > this.totalPages) {
      throw new Error(`Nomor halaman harus antara 1 dan ${this.totalPages}`);
    }

    this.currentSession = {
      page: pageNumber,
      startTime: Date.now(),
      timerId: null,
    };
  }

  /**
   * Memulai sesi membaca real-time dengan interval timer detik (anti-skip).
   * @param {number} pageNumber Nomor halaman yang dibaca.
   * @param {Object} [options]
   * @param {Function} [options.onTick] Callback setiap detik: (remainSeconds, elapsedSeconds)
   * @param {Function} [options.onComplete] Callback saat countdown mencapai 0 detik (sah selesai): (pageNumber)
   */
  startReadingSession(pageNumber, options = {}) {
    this.stopReadingSession();

    this.currentSession = {
      page: pageNumber,
      startTime: Date.now(),
      timerId: null,
    };

    const threshold = this.autoDetectThreshold;
    let elapsed = 0;

    this.currentSession.timerId = setInterval(async () => {
      elapsed++;
      const remain = Math.max(0, threshold - elapsed);

      if (typeof options.onTick === 'function') {
        options.onTick(remain, elapsed);
      }

      if (remain === 0) {
        this.stopReadingSession();
        await this.reportPages(pageNumber, pageNumber, new Date(), "Bacaan tuntas terdeteksi otomatis", "auto", threshold);
        if (typeof options.onComplete === 'function') {
          options.onComplete(pageNumber);
        }
      }
    }, 1000);
  }

  /**
   * Menghentikan interval timer sesi membaca real-time.
   */
  stopReadingSession() {
    if (this.currentSession && this.currentSession.timerId) {
      clearInterval(this.currentSession.timerId);
      this.currentSession.timerId = null;
    }
  }

  /**
   * Menghentikan pengatur waktu dan mencatat bacaan jika durasi memenuhi ambang batas.
   * @returns {Promise<boolean>} Mengembalikan true jika bacaan berhasil dicatat, false jika tidak.
   */
  async stopReading() {
    this.stopReadingSession();
    if (!this.currentSession) return false;

    const duration = (Date.now() - this.currentSession.startTime) / 1000;
    const page = this.currentSession.page;
    this.currentSession = null;

    if (duration >= this.autoDetectThreshold) {
      return await this.reportPages(page, page, new Date(), "Bacaan terdeteksi otomatis", "auto", duration);
    }
    return false;
  }

  /**
   * Mencatat bacaan halaman secara manual.
   * @param {number} fromPage Halaman awal.
   * @param {number} toPage Halaman akhir.
   * @param {Date} [date=new Date()] Tanggal bacaan.
   * @param {string} [note=""] Catatan tambahan.
   * @param {string} [source="manual"] Sumber log ("manual" atau "auto").
   * @param {number} [duration=0] Durasi membaca dalam detik.
   * @returns {Promise<boolean>} Status keberhasilan pencatatan.
   */
  async reportPages(fromPage, toPage, date = new Date(), note = "", source = "manual", duration = 0) {
    if (fromPage < 1 || toPage > this.totalPages || fromPage > toPage) {
      throw new Error("Rentang halaman tidak valid.");
    }

    const pages = [];
    for (let i = fromPage; i <= toPage; i++) {
      pages.push(i);
    }

    const dt = date instanceof Date ? date : new Date(date);
    const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    const log = {
      userId: this.userId,
      timestamp: dt.getTime(),
      date: dateStr,
      pageFrom: fromPage,
      pageTo: toPage,
      pages,
      duration,
      source,
      note,
    };

    const success = await this.adapter.saveLog(this.userId, log);
    
    if (success) {
      await this.adapter.updateStats(this.userId, pages, date);
      if (this.onPageRead) {
        pages.forEach(p => this.onPageRead(p));
      }
    }

    return success;
  }

  /**
   * Mengambil statistik bacaan pengguna.
   * @returns {Promise<Object>} Data statistik pengguna.
   */
  async getStats() {
    const stats = await this.adapter.getStats(this.userId);
    const defaultStats = {
      totalPages: this.totalPages,
      totalReads: 0,
      streak: 0,
      lastReadDate: null,
      lastReadPage: null,
      progress: 0,
      khatamCount: 0,
      pagesRead: [],
    };
    
    if (!stats) return defaultStats;
    
    const progress = Math.round((stats.pagesRead.length / this.totalPages) * 100);
    return { ...defaultStats, ...stats, progress, pagesRead: new Set(stats.pagesRead) };
  }

  /**
   * Mengambil log bacaan pengguna berdasarkan opsi pencarian.
   * @param {Object} options Opsi filter log.
   * @param {number} [options.limit] Batas jumlah log yang diambil.
   * @param {string} [options.startDate] Tanggal mulai (YYYY-MM-DD).
   * @param {string} [options.endDate] Tanggal akhir (YYYY-MM-DD).
   * @param {string} [options.source] Sumber log ("manual" atau "auto").
   * @returns {Promise<Array>} Daftar log bacaan.
   */
  async getLogs(options = {}) {
    return await this.adapter.getLogs(this.userId, options);
  }

  /**
   * Mendapatkan array boolean yang merepresentasikan progres dari seluruh halaman Al-Qur'an.
   * @returns {Promise<boolean[]>} Array sepanjang 604 dengan nilai true (sudah dibaca) atau false (belum).
   */
  async getProgress() {
    const stats = await this.getStats();
    const pagesReadSet = stats.pagesRead instanceof Set ? stats.pagesRead : new Set(stats.pagesRead || []);
    
    const progressArray = new Array(this.totalPages).fill(false);
    for (let i = 1; i <= this.totalPages; i++) {
      progressArray[i - 1] = pagesReadSet.has(i);
    }
    
    return progressArray;
  }

  /**
   * Mengekspor seluruh data bacaan (statistik dan log) sebagai objek JSON.
   * @returns {Promise<Object>} Data lengkap tilawah.
   */
  async exportData() {
    const stats = await this.getStats();
    const logs = await this.getLogs({});
    return { stats, logs };
  }

  /**
   * Mereset progres bacaan saat ini untuk memulai siklus khatam yang baru.
   * @returns {Promise<boolean>} True jika berhasil di-reset.
   */
  async resetKhatam() {
    return await this.adapter.resetKhatam(this.userId);
  }

  /**
   * Membersihkan instans dari memori dan menghentikan proses latar belakang yang berjalan.
   */
  destroy() {
    this.stopReadingSession();
    this.currentSession = null;
  }
}
