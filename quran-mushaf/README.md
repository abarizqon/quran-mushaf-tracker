# Quran Mushaf Module (Standalone & Offline-First)

Modul mandiri Al-Qur'an (604 Halaman Mushaf Madinah Rasm Utsmani) berbasis ES Modules modern tanpa dependensi framework. Dirancang khusus agar dapat diintegrasikan dengan mudah ke aplikasi web manapun (Vue, React, Svelte, Angular, atau Vanilla HTML/JS) dengan dukungan **penyimpanan offline 100% menggunakan CacheStorage API**, **bilah progres Juz 5-tier dinamis**, dan **mode layar penuh imersif via ketukan layar**.

---

## 🌟 Fitur Unggulan

1. **Bilah Progres Juz Interaktif (5-Tier Dynamic Progression)**:
   - Menghitung persentase lembaran dalam Juz secara otomatis (`0%` hingga `100%`) dan sisa halaman (`Sisa X hal`).
   - Efek transisi warna dinamis bertingkat:
     - **Tier 1 (1–25%)**: *Emerald Green* segar (`#10b981` ➡️ `#006b3f`).
     - **Tier 2 (26–50%)**: *Ocean Teal & Cyan* (`#06b6d4` ➡️ `#0891b2`).
     - **Tier 3 (51–75%)**: *Royal Indigo & Sapphire* (`#6366f1` ➡️ `#4f46e5`).
     - **Tier 4 (76–99%)**: *Sunset Amber & Coral* (`#f59e0b` ➡️ `#ea580c`).
     - **Tier 5 (100%)**: *Solid Royal Gold* (`#f59e0b` ➡️ `#d97706`) dengan kilau emas bercahaya dan badge piala perayaan: **`100% 🏆 Juz Selesai!`**.
   - Dilengkapi *ambient background tint* dan efek kilau animasi (*shimmer line*).

2. **Mode Layar Penuh Imersif Murni via Ketukan (Pure Tap Gesture)**:
   - **Ketuk sekali pada area mushaf**: Menyembunyikan header dan footer secara mulus untuk memaksimalkan area baca mushaf.
   - **Ketuk sekali lagi**: Memunculkan kembali header dan navigasi menu.
   - **Layout Tetap Presisi di Tengah (*Center*)**: Unit card judul juz dan mushaf tetap seimbang secara horizontal dan vertikal di layar tanpa tertarik ke atas.
   - Bersih tanpa tombol melayang (*floating toggle buttons*) yang menghalangi teks suci Al-Qur'an.
   - Dilengkapi *toast notification pill* elegan di bagian bawah layar.

3. **Modal Pemilih Surat & Juz Terintegrasi (Built-in Index Modal)**:
   - Cukup ketuk card judul juz di bagian atas untuk membuka dialog pemilih.
   - Tab ganda: **Daftar Surat** (114 surat lengkap dengan nama Arab & nomor halaman) dan **Daftar Juz** (30 Juz dengan rincian halaman).
   - Dilengkapi kolom pencarian instan (*instant search filter*).

4. **100% True Offline Storage**:
   - Menggunakan browser **`CacheStorage` API**.
   - Lembaran yang sudah diunduh (per Juz atau seluruh 604 halaman) tersimpan secara fisik di disk browser pengguna dan dapat dibuka secepat kilat **tanpa koneksi internet (Airplane Mode)**.

5. **Multi-Tier CDN & Zero-Downtime Fallback**:
   - jsDelivr Edge CDN Anycast Singapura/Jakarta.
   - King Saud University Ayat CDN.
   - GitHub Raw Direct CDN.
   - files.quran.app High-Res Vector/PNG CDN.

6. **Pilihan Gaya Mushaf Fleksibel (Multi-Edition)**:
   - **Mushaf Madinah HD (`madani`) [Default]**: Tulisan Rasm Utsmani resmi Kompleks Percetakan Raja Fahd Madinah super jernih (1260px) & tajam di semua layar.
   - **Tajwid Dar Al-Ma'rifah (`tajweed_dar`)**: Rujukan populer tajwid berwarna klasik dilengkapi blok panduan hukum tajwid di kaki halaman.

---

## 🚀 Cara Penggunaan di Aplikasi Lain

### 1. Struktur File Modul
Salin folder `modules/quran-mushaf` ke proyek web Anda:
```text
modules/quran-mushaf/
├── index.js          # Entry point utama (ES Modules)
├── mushaf-engine.js  # Mesin offline CacheStorage, preloader, & CDN resolver
├── mushaf-viewer.js  # Komponen UI viewer interaktif & gesture controller
├── quran-data.js     # Database statis 114 surah, 30 juz, & 604 lembar
├── package.json      # Metadata paket npm
├── LICENSE           # Lisensi MIT
└── example/
    └── index.html    # Demo interaktif offline mandiri
```

### 2. Implementasi Cepat (Vanilla JS)
```html
<div id="mushafContainer" style="width:100%; height:100vh;"></div>

<script type="module">
  import { MushafEngine, MushafViewer } from './modules/quran-mushaf/index.js';

  // 1. Inisialisasi engine offline
  const engine = new MushafEngine({
    cacheName: 'app-mushaf-cache-v1'
  });

  // 2. Inisialisasi viewer UI
  const viewer = new MushafViewer('#mushafContainer', {
    engine: engine,
    initialPage: 1,
    enableTapFullscreen: true,
    onPageChange: (page, details) => {
      console.log('Sedang membaca halaman:', page, details);
    },
    onJuzCompleted: (juz) => {
      console.log('🏆 Alhamdulillah, Juz selesai:', juz);
    }
  });
</script>
```

### 3. Implementasi di React / Next.js
```jsx
import React, { useEffect, useRef } from 'react';
import { MushafEngine, MushafViewer } from './modules/quran-mushaf/index.js';

export default function QuranReader() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new MushafEngine({ cacheName: 'my-react-quran-cache' });
    viewerRef.current = new MushafViewer(containerRef.current, {
      engine,
      initialPage: 1,
      enableTapFullscreen: true,
      onPageChange: (page, details) => {
        // Simpan bookmark atau update state
      }
    });

    return () => {
      // Cleanup jika diperlukan
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
```

### 4. Implementasi di Vue 3
```vue
<template>
  <div ref="container" style="width: 100%; height: 100vh;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { MushafEngine, MushafViewer } from './modules/quran-mushaf/index.js';

const container = ref(null);

onMounted(() => {
  const engine = new MushafEngine();
  new MushafViewer(container.value, {
    engine,
    initialPage: 1,
    enableTapFullscreen: true
  });
});
</script>
```

### 5. Mengunduh & Manajemen Offline Cache
```javascript
// Unduh 1 Juz tertentu (misal Juz 1: hal 1-21)
await engine.cacheJuz(1, (curr, total, pct, page) => {
  console.log(`Mengunduh lembar ${page} (${pct}%)...`);
});

// Atau unduh seluruh 604 halaman mushaf
await engine.cacheAll((curr, total, pct) => {
  console.log(`Progres unduh seluruh mushaf: ${pct}%`);
});

// Cek status penyimpanan offline
const status = await engine.getStorageStatus();
console.log(`Tersimpan: ${status.cachedCount} / 604 hal (${status.percentage}%)`);

// Bersihkan cache jika pengguna ingin menghemat ruang disk
await engine.clearCache();
```

---

## 📚 API Reference

### `MushafViewer`
* `constructor(container, options)`:
  * `container`: Selector string (`'#app'`) atau `HTMLElement`.
  * `options.engine`: Instance `MushafEngine`.
  * `options.initialPage`: Nomor halaman awal (1-604, default: `1`).
  * `options.enableTapFullscreen`: Mengaktifkan tap to fullscreen (default: `true`).
  * `options.onPageChange`: Callback `(pageNumber, details) => void`.
  * `options.onJuzCompleted`: Callback `(juzNumber) => void`.
* `renderPage(pageNumber)`: Membuka dan menampilkan nomor halaman tertentu.
* `nextPage()`: Buka halaman berikutnya (RTL).
* `prevPage()`: Buka halaman sebelumnya (RTL).
* `toggleImmersive(forceState?)`: Mengaktifkan / menonaktifkan mode layar penuh.
* `openPickerModal()`: Membuka modal pemilih Surat & Juz.
* `closePickerModal()`: Menutup modal pemilih Surat & Juz.

### `MushafEngine`
* `constructor(options)`:
  * `cacheName`: Nama cache CacheStorage browser (default: `quran-mushaf-tajweed-v1`).
  * `storageKey`: Nama key localStorage index (default: `quran_mushaf_offline_pages_v1`).
* `getPageSourceUrl(pageNumber)`: Mengembalikan URL gambar (Object URL lokal jika ada di cache, atau CDN).
* `cachePage(pageNumber)`: Menyimpan 1 lembar ke memori offline.
* `cacheJuz(juzNumber, onProgress)`: Menyimpan 1 Juz ke memori offline.
* `cacheAll(onProgress)`: Menyimpan 604 lembar sekaligus.
* `cancelDownload()`: Membatalkan proses pengunduhan yang sedang berjalan.
* `getStorageStatus()`: `{ cachedCount, totalPages, percentage, isComplete }`.
* `clearCache()`: Menghapus seluruh lembaran dari memori perangkat.

### `quran-data.js` Helpers
* `getPageDetails(pageNumber)`: Info surat, nomor ayat awal-akhir, dan juz.
* `getJuzProgress(pageNumber)`: Info progres juz (`{ juz, pageInJuz, totalPages, percent, isLastPage, remainPages }`).
* `getAllSurahs()`: Daftar seluruh 114 surat.
* `getAllJuz()`: Daftar seluruh 30 juz.
* `getSurahStartPage(surahNumber)`: Halaman pertama surat.
* `getJuzStartPage(juzNumber)`: Halaman pertama juz.

---

## 📄 Lisensi
Open-source di bawah lisensi [MIT](LICENSE). Bebas digunakan, dimodifikasi, dan didistribusikan untuk kemaslahatan umat Islam.
