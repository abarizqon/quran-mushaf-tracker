# Modul Offline & Standalone Masjid Bilal Ecosystem

Koleksi modul web mandiri (*standalone*) open-source untuk aplikasi Islami, Al-Qur'an, Tilawah, dan Dzikir. Seluruh modul didesain agar dapat berjalan **100% offline**, bebas CORS, tanpa ketergantungan library eksternal, dan siap di-publish atau dijadikan repositori GitHub terpisah.

---

## 📦 Daftar Modul

### 1. [`quran-mushaf`](./quran-mushaf/) (`@masjidbilal/quran-mushaf`)
Komponen Mushaf Al-Qur'an Utsmani 604 Halaman Offline-First:
- **Bilah Progres Juz 5-Tier Dinamis**: Menghitung progres juz secara otomatis dengan gradasi 5 warna (Emerald ➡️ Teal ➡️ Indigo ➡️ Sunset Amber ➡️ Solid Royal Gold 100% 🏆).
- **Mode Layar Penuh Imersif Murni via Ketukan (Tap)**: Menyembunyikan header/footer tanpa tombol melayang. Posisi mushaf dan card judul juz tetap presisi di tengah (*centered*).
- **Modal Pemilih Surat & Juz Terintegrasi**: Dialog pencarian dan navigasi surat/juz tanpa ketergantungan framework.
- **Mushaf Madinah HD & Tajwid Berwarna**: Tulisan Rasm Utsmani resmi KFGQPC Madinah dan Tajwid Dar Al-Ma'rifah.
- **Penyimpanan Fisik Offline via CacheStorage API**: Unduh per-juz atau 30 juz penuh untuk dibaca tanpa koneksi internet (Airplane Mode).
- **Demo Interaktif**: Buka [`modules/quran-mushaf/example/index.html`](./quran-mushaf/example/index.html).

### 2. [`tilawah-tracker`](./tilawah-tracker/) (`@masjidbilal/tilawah-tracker`)
Pelacak Target dan Progres Tilawah Al-Qur'an 30 Juz:
- **Peta Khatam 30 Juz Interaktif**: Memetakan status 30 Juz (Belum dibaca, Sedang berjalan, dan Selesai 100% berbadge piala 🏆).
- **Sesi Membaca Real-Time (Anti-Skip Timer)**: Interval timer per-detik (`startReadingSession`) dengan callback penyelesaian tuntas saat 0 detik.
- **Perhitungan Statistik Otomatis**: Streak harian, persentase khatam, dan siklus khatam bertahap.
- **Sistem Adapter Pluggable**: Mendukung penyimpanan `LocalStorage`, `Firebase Firestore`, maupun `REST API`.
- **Demo Interaktif**: Buka [`modules/tilawah-tracker/example/index.html`](./tilawah-tracker/example/index.html).

### 3. [`dzikir-tracker`](./dzikir-tracker/) (`@masjidbilal/dzikir-tracker`)
Pelacak dan Penghitung Wirid Doa & Dzikir Harian berlandaskan **Hisnul Muslim**:
- **Koleksi Doa Lengkap**: Dzikir Ba'da Shalat, Dzikir Pagi, Dzikir Petang, Doa Rezeki/Utang, Kesehatan, dll.
- **Counter Interaktif**: Target bacaan otomatis (1x, 3x, 7x, 10x, 33x, 100x) dengan *auto-lock* saat selesai.
- **Rekomendasi Waktu Dinamis**: Menyesuaikan waktu otomatis (Pagi: 04.00-11.00 WIB, Petang: 15.00-21.00 WIB).

---

## 🌐 Cara Mengunggah sebagai Repositori GitHub Terpisah

Setiap folder di dalam `modules/` sudah dilengkapi dengan file `package.json`, `LICENSE`, `README.md`, dan folder `example/`. Jika Anda ingin mempublikasikan modul ke repositori GitHub terpisah:

1. **Masuk ke folder modul**:
   ```bash
   cd modules/quran-mushaf
   # atau
   cd modules/tilawah-tracker
   ```
2. **Inisialisasi Git & hubungkan ke GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: v1.1.0 release"
   git branch -M main
   git remote add origin https://github.com/USERNAME/quran-mushaf.git
   git push -u origin main
   ```
3. **Mengaktifkan GitHub Pages (Opsional untuk Demo Live)**:
   - Masuk ke Settings Repo > Pages > Deploy from branch `main` folder `/ (root)` atau buat symlink `index.html` ke folder `example/index.html`.

---

## 💎 Standar & Kualitas Kode

1. **ES Modules Murni (Zero Build Step)**: Menggunakan `import`/`export` ES6 standar, dapat langsung dibuka di browser tanpa npm install / bundler.
2. **Zero-CORS**: Gambar dan data lolos uji akses lintas domain.
3. **Framework Agnostic**: Siap dipakai di React, Vue, Svelte, Angular, Maupun Vanilla HTML.
4. **Offline Ready**: Dilengkapi CacheStorage PWA untuk keandalan maksimal tanpa internet.

---

## 📄 Lisensi
Seluruh modul dirilis di bawah lisensi [MIT](LICENSE). Bebas digunakan untuk aplikasi dakwah, masjid, maupun komersial demi kemaslahatan umat Islam.
