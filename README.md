# Teluk Cahaya

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/firlifirrizqi/make-gta6-makefun/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/firlifirrizqi/make-gta6-makefun/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Teluk Cahaya** adalah game kota terbuka 2D top-down orisinal untuk bounty
Make.fun "Make GTA 6" (gta6-01). Semua kota, tokoh, cerita, kendaraan, dan
musiknya buatan sendiri — bukan GTA dan bukan Rockstar.

## Cerita

Raka baru sebulan tinggal di Teluk Cahaya. Uangnya tinggal $50, dan Nadia —
pemilik warung mi di dermaga — punya pekerjaan untuknya. Tiga misi, satu
kota, dan polisi di setiap sudut jalan.

1. **Kurir Kilat** — ambil paket di Warung Kopi Senja, antar ke Gedung Pelangi. (+$150)
2. **Mobil Pesanan** — curi mobil oranye di Parkir Dermaga, lewati preman yang
   menjaganya, bawa ke Bengkel Jaya. Nadia memberimu pistol. (+$300)
3. **Jalan Pulang** — polisi sudah mengendusmu. Kabur ke Rumah Lentera, jangan
   sampai ketangkap. (+$500)

Setelah cerita selesai, kota tetap bisa dijelajahi bebas.

## Yang ada di game

- **Kota yang bisa dijelajahi** — jalan grid, gedung, taman, trotoar, lampu
  jalan, pantai dan teluk di sisi timur; dijelajahi jalan kaki dan naik mobil.
- **Lalu lintas & pejalan kaki** — mobil AI mengikuti jalan dan berbelok di
  persimpangan; pejalan kaki berjalan di trotoar dan lari dari mobil ngebut.
- **Mobil bisa dicuri** — mobil parkir dan mobil lalu lintas bisa diambil
  (tombol E); mencuri menaikkan wanted level.
- **Wanted level & polisi** — bintang 1–5; mobil polisi mengejar, menabrak,
  dan menangkap Raka kalau ia terkepung jalan kaki.
- **Misi & cerita** — 3 misi berurutan dengan dialog, marker di peta dan
  minimap, dan hadiah uang.
- **Combat** — pukul (F) dan tembak dengan pistol (klik mouse); preman
  menjaga mobil pesanan; health yang pulih perlahan.
- **HUD lengkap** — health, uang, bintang wanted, jam, objektif misi, dan
  minimap hidup (kota, pemain, polisi, marker misi).
- **Start, jeda, game over & save** — layar judul, jeda (P), tertangkap /
  tewas dengan respawn di Rumah Lentera, dan simpan (G) + lanjutkan.
- **Polish** — musik chiptune dan semua suara disintesis WebAudio (tanpa file
  audio), partikel tabrakan dan pukulan, lampu polisi berkedip, bekas selip
  ban, kamera mengikuti pemain.

## Kontrol

| Tombol | Fungsi |
| --- | --- |
| WASD / Panah | Jalan kaki & mengemudi |
| E | Masuk / keluar mobil |
| F | Pukul |
| Klik mouse | Tembak (setelah dapat pistol) |
| P / Esc | Jeda |
| G | Simpan progres |
| M | Bisu / nyalakan suara |
| Spasi / Enter | Mulai / lanjut |

## Cara main

Tidak ada build step. Jalankan server statis dari folder repo, lalu buka
`http://localhost:8080`:

```sh
node serve.ts
```

Atau server statis apa pun yang melayani folder `game/`. Game berjalan
offline dari file statis, tanpa network request.

## Struktur kode

Semua kode game ditulis sendiri, satu file satu tugas, di `game/src/`:

- `config.js` — semua angka tuning, warna, dan ukuran dunia
- `random.js` — RNG bersuku (mulberry32) untuk kota yang bisa diulang
- `input.js` — keyboard + mouse
- `city.js` — bangun kota: jalan, gedung, taman, pantai, tabrakan
- `traffic.js` — mobil AI yang mengikuti jalan
- `pedestrians.js` — pejalan kaki
- `vehicles.js` — bentuk mobil, fisika mengemudi, masuk/keluar mobil
- `player.js` — Raka jalan kaki, health
- `police.js` — wanted level, mobil polisi, tertangkap
- `missions.js` — cerita & tiga misi
- `combat.js` — pukul, tembak, preman, partikel
- `audio.js` — musik & suara sintetis WebAudio
- `hud.js` — HUD: health, uang, bintang, jam, objektif, dialog
- `minimap.js` — minimap hidup
- `render.js` — menggambar dunia & layar-layar game
- `world.js` — keadaan dunia & satu langkah simulasi
- `shots.js` — adegan screenshot deterministik (`?shot=`)
- `main.js` — boot & loop utama

`main.ts` di root menyerahkan entry: menyalin `game/` dan `screenshots/`
ke `/output` dan menulis `/output/dossier.json`.

## Lisensi

MIT — lihat `LICENSE`.

---
<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
