# Tilawah Tracker Module (Standalone & Pluggable)

Modul pelacak tilawah Al-Qur'an (604 halaman Mushaf Madinah Rasm Utsmani) open-source berbasis ES Modules tanpa dependensi eksternal. Dirancang dengan pola adapter penyimpanan yang fleksibel sehingga dapat dihubungkan dengan **LocalStorage** (offline/browser murni), **Firebase Firestore**, atau **REST API** backend kustom Anda.

---

## 🌟 Fitur Unggulan

- 📖 **Pelacakan 604 Halaman Al-Qur'an**: Memetakan pembacaan per-halaman secara akurat dan anti-duplikasi.
- ⏱️ **Sesi Membaca Real-Time (Anti-Skip Timer)**: Dilengkapi metode `startReadingSession()` dengan callback per-detik (`onTick`) dan pemicu selesai sah saat countdown mencapai 0 detik (`onComplete`).
- 🗺️ **Peta Khatam 30 Juz Interaktif**: Visualisasi status khatam per-Juz (Belum dibaca, Sedang berjalan, dan Tuntas 100% dengan badge piala emas 🏆).
- 📊 **Statistik Komprehensif**: Menghitung persentase khatam, streak harian beruntun, total halaman unik, dan siklus khatam bertahap.
- 🧩 **Sistem Adapter Pluggable**:
  - `LocalStorageAdapter`: 100% offline di perangkat tanpa server.
  - `FirebaseAdapter`: Sinkronisasi cloud Firestore multi-perangkat.
  - `ApiAdapter`: Integrasi dengan REST API backend Node.js, Laravel, Django, dll.
- 🎨 **Widget UI Responsif (`TilawahWidget`)**: Komponen antarmuka siap pakai dengan diagram cincin progres (*SVG ring*), grid 30 juz, dan riwayat aktivitas terakhir.

---

## 🚀 Instalasi & Penggunaan

### 1. Struktur File Modul
Salin folder `modules/tilawah-tracker` ke proyek Anda:
```text
modules/tilawah-tracker/
├── tilawah-tracker.js    # Logika inti pelacak tilawah & sesi timer
├── tilawah-widget.js     # Komponen widget antarmuka (SVG ring & peta 30 juz)
├── tilawah-widget.css    # Styling widget responsif & tema hijau Islami
├── package.json          # Metadata paket npm (@masjidbilal/tilawah-tracker)
├── LICENSE               # Lisensi MIT
├── adapters/
│   ├── localstorage-adapter.js  # Penyimpanan lokal offline
│   ├── firebase-adapter.js      # Penyimpanan cloud Firestore
│   └── api-adapter.js           # Penyimpanan REST API kustom
└── example/
    └── index.html        # Demo interaktif & simulator sesi
```

### 2. Implementasi Cepat dengan LocalStorage (Vanilla JS)
```html
<link rel="stylesheet" href="./modules/tilawah-tracker/tilawah-widget.css">
<div id="tilawahWidgetApp"></div>

<script type="module">
  import TilawahTracker from './modules/tilawah-tracker/tilawah-tracker.js';
  import LocalStorageAdapter from './modules/tilawah-tracker/adapters/localstorage-adapter.js';
  import TilawahWidget from './modules/tilawah-tracker/tilawah-widget.js';

  // 1. Inisialisasi adapter penyimpanan
  const adapter = new LocalStorageAdapter();

  // 2. Inisialisasi tracker
  const tracker = new TilawahTracker({
    adapter: adapter,
    userId: 'user_jamaah_01',
    autoDetectThreshold: 30 // Waktu minimal membaca (30 detik per halaman)
  });

  // 3. Render widget UI
  const widget = new TilawahWidget(tracker, {
    onJuzClick: (juz) => console.log('Juz diklik:', juz)
  });
  widget.render('tilawahWidgetApp');
</script>
```

### 3. Memulai Sesi Membaca Terpantau (Timer)
```javascript
// Memulai timer pembacaan halaman tertentu
tracker.startReadingSession(pageNumber, {
  onTick: (remainSeconds, elapsedSeconds) => {
    console.log(`Sisa waktu membaca: ${remainSeconds} detik`);
  },
  onComplete: (pageNumber) => {
    console.log(`✅ Halaman ${pageNumber} sah tuntas dibaca!`);
    widget.update(); // Perbarui tampilan widget
  }
});

// Menghentikan timer jika pengguna keluar sebelum selesai
tracker.stopReadingSession();
```

### 4. Mencatat Bacaan Manual (Rentang Halaman)
```javascript
// Pengguna membaca hal 1 s.d. 20 secara manual
await tracker.reportPages(1, 20, new Date(), "Khataman mandiri", "manual");
widget.update();
```

---

## 📚 API Reference

### `TilawahTracker`
* `constructor(options)`:
  * `options.adapter`: Instance adapter (`LocalStorageAdapter`, dsb).
  * `options.userId`: ID unik pengguna (string).
  * `options.autoDetectThreshold`: Ambang batas waktu detik per lembar (default: `30`).
  * `options.totalPages`: Total halaman (default: `604`).
  * `options.onPageRead`: Callback `(pageNumber) => void`.
* `startReadingSession(pageNumber, { onTick, onComplete })`: Memulai timer real-time membaca.
* `stopReadingSession()`: Membatalkan timer sesi membaca yang sedang berjalan.
* `reportPages(fromPage, toPage, date?, note?, source?, duration?)`: Mencatat rentang halaman.
* `getStats()`: Mengambil statistik lengkap (`{ totalPages, streak, progress, khatamCount, pagesRead }`).
* `getProgress()`: Mengembalikan array boolean sepanjang 604 lembar (`true` jika sudah dibaca).
* `getLogs(options)`: Mengambil daftar riwayat aktivitas tilawah.
* `resetKhatam()`: Mengarsipkan capaian, menambah jumlah khatam (+1), dan memulai putaran baru.
* `destroy()`: Membersihkan timer dan memori.

### `TilawahWidget`
* `constructor(tracker, options)`:
  * `tracker`: Instance `TilawahTracker`.
  * `options.onJuzClick`: Callback `(juzNumber) => void`.
* `render(containerElement)`: Render widget ke dalam DOM.
* `update()`: Refresh visual widget dengan data terbaru.
* `destroy()`: Bersihkan widget dari DOM.

---

## 📄 Lisensi
Open-source di bawah lisensi [MIT](LICENSE). Bebas digunakan untuk aplikasi dakwah, masjid, maupun komersial.
