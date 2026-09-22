# Dzikir Tracker (Hisnul Muslim Standalone Module)

Modul mandiri pelacak bacaan doa dan dzikir harian umat Islam berlandaskan kitab **Hisnul Muslim** (Perisai Seorang Muslim). Berjalan **100% offline** tanpa ketergantungan framework maupun koneksi internet.

## Fitur Utama

- **Koleksi Doa Lengkap & Shahih**:
  - Dzikir Ba'da Shalat Maktubah (11 doa wirid)
  - Dzikir Pagi Al-Matsurat (26 doa)
  - Dzikir Petang Al-Matsurat (24 doa)
  - Doa Rezeki, Bebas Utang & Hajat
  - Doa Kesehatan & Kesembuhan Sakit
  - Doa Perlindungan Bahaya, Gangguan Setan & Sihir
  - Doa Penenang Hati, Anti Cemas, Sedih & Gelisah
  - Doa Adab Tidur & Bangun Tidur
  - Doa Safar & Perjalanan
- **Interactive Counter Engine**: Penghitung dzikir per doa dengan ambang batas target bacaan (1x, 3x, 7x, 10x, 33x, 100x), auto-lock saat selesai, dan getaran/audio opsional.
- **Rekomendasi Waktu Dinamis**: Otomatis mendeteksi waktu saat ini untuk merekomendasikan Dzikir Pagi (04:00 - 11:00 WIB), Ba'da Shalat, atau Dzikir Petang (15:00 - 21:00 WIB).
- **Offline Persistence**: Menyimpan status hitungan dan riwayat bacaan harian ke `LocalStorage`.
- **Zero CORS & Zero External Dependency**: Mandiri murni, bisa di-bundle atau dijalankan di web browser, PWA, Cordova, Capacitor, maupun Electron.

## Struktur Direktori

```
dzikir-tracker/
├── dzikir-data.js      # Database teks arab, latin, terjemah, target & faedah sumber hadits
├── dzikir-engine.js    # Logika counter, kalkulasi waktu, dan riwayat offline
├── dzikir-widget.js    # Komponen renderer UI
├── dzikir-widget.css   # Desain styling responsif
├── index.js            # Entry point ES Module
├── README.md           # Dokumentasi ini
└── example/
    └── index.html      # Contoh aplikasi interaktif siap pakai
```

## Cara Penggunaan

### 1. Menggunakan UI Widget
```html
<link rel="stylesheet" href="./dzikir-widget.css">
<div id="dzikirContainer"></div>

<script type="module">
    import DzikirWidget from './dzikir-widget.js';

    new DzikirWidget({
        container: '#dzikirContainer'
    });
</script>
```

### 2. Menggunakan Engine Saja (Headless)
```javascript
import DzikirEngine from './dzikir-engine.js';

const engine = new DzikirEngine();

// Buka Dzikir Pagi
const { items } = engine.openCategory('pagi');

// Klik counter doa pertama
engine.incrementCounter(items[0].id);

// Periksa progres
console.log(engine.getProgress('pagi'));
```

## Lisensi
MIT License - Bebas digunakan dan didistribusikan untuk kemaslahatan umat.
