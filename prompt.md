Saya punya project React + Vite yang sudah jadi sebagai base app. Saya juga punya file JavaScript GLG / Genlogic (SCADA/HMI) yang ingin saya gunakan untuk membuat demo monitoring SCADA mirip referensi ini:
https://www.genlogic.com/react_demos/?page=SCADAViewer

Tugas Anda WAJIB dikerjakan dengan urutan berikut, jangan lompat langkah:

1. AUDIT KEAMANAN FILE JS DULU
- Baca seluruh file JS GLG yang saya berikan.
- Lakukan security review menyeluruh sebelum file dipakai.
- Cari dan laporkan semua hal berikut:
  - fetch(...)
  - XMLHttpRequest
  - WebSocket
  - EventSource / SSE
  - navigator.sendBeacon
  - import/require dari URL eksternal
  - script injection
  - iframe eksternal
  - image / pixel tracking
  - redirect ke domain lain
  - eval, new Function, Function constructor
  - obfuscated code
  - base64-encoded script yang dieksekusi
  - akses cookie, localStorage, sessionStorage yang mencurigakan
  - endpoint analytics / telemetry / ads / tracker
  - domain eksternal apa pun yang dihubungi
- Tampilkan daftar temuan dalam format:
  - lokasi file
  - nomor baris
  - potongan kode singkat
  - tingkat risiko: aman / perlu review / berbahaya
  - alasan teknis

2. BERSIHKAN SEMUA HAL BERISIKO
- Hapus atau nonaktifkan semua koneksi ke website / domain lain yang tidak wajib untuk demo lokal.
- Hapus tracking, analytics, beacon, telemetry, remote script loader, dan semua external hit yang tidak diperlukan.
- Hapus kode yang berpotensi phishing, exfiltration, dynamic remote loading, atau eksekusi kode tersembunyi.
- Jika ada kode yang wajib untuk runtime tetapi memanggil host eksternal, ubah menjadi stub/mock lokal bila memungkinkan.
- Jangan biarkan ada request keluar selain yang benar-benar dibutuhkan untuk asset lokal project.
- Jika ada bagian yang tidak bisa dipastikan aman, tandai dan jangan dipakai.

3. VALIDASI HASIL CLEANSING
- Setelah dibersihkan, lakukan audit ulang terhadap hasil akhir.
- Pastikan tidak ada lagi network call eksternal yang tidak perlu.
- Pastikan tidak ada script berbahaya, loader tersembunyi, atau callback mencurigakan.
- Berikan ringkasan “AMAN DIPAKAI” atau “BELUM AMAN” dengan alasan jelas.

4. INTEGRASIKAN KE REACT + VITE
- Adaptasikan kode yang sudah bersih ke struktur React + Vite.
- Jangan pakai CDN eksternal untuk library GLG jika saya sudah punya file lokalnya.
- Tempatkan asset/library secara rapi, misalnya:
  - src/
  - public/
  - src/components/scada/
  - src/lib/glg/
- Jika library GLG lebih cocok dimuat dari public folder, jelaskan alasannya dan implementasikan dengan aman.
- Hindari penggunaan pola lama yang merusak React lifecycle.
- Bungkus integrasi GLG dalam komponen React yang rapi, misalnya:
  - ScadaViewer.jsx / ScadaViewer.tsx
- Gunakan useEffect, useRef, cleanup destroy/unmount, dan pastikan tidak memory leak.

5. BUAT DEMO MONITORING SCADA
- Buat demo monitoring yang terinspirasi dari:
  https://www.genlogic.com/react_demos/?page=SCADAViewer
- Bukan menyalin mentah tampilan web tersebut, tetapi membuat demo serupa di project React saya menggunakan file GLG yang sudah dibersihkan.
- Demo minimal memiliki:
  - header judul plant/dashboard
  - area SCADA viewer
  - beberapa indikator status
  - nilai suhu / tekanan / flow / level
  - warna status normal / warning / alarm
  - update data simulasi realtime dengan mock data lokal
  - tombol start / stop simulation
  - daftar alarm sederhana
- Semua data demo harus lokal/mock, jangan konek ke server luar.

6. OUTPUT YANG SAYA MAU
- Berikan:
  - hasil audit keamanan
  - daftar kode yang dihapus/diubah
  - alasan setiap perubahan penting
  - struktur folder final
  - isi file yang dibuat/diubah
  - langkah menjalankan project
- Jika ada bagian file GLG yang minified/obfuscated, formatkan dulu lalu audit.
- Jangan menyembunyikan temuan. Jika ada risiko, jelaskan apa adanya.

7. BATASAN KERAS
- Jangan gunakan network call ke domain eksternal apa pun kecuali saya setujui.
- Jangan pakai analytics, tracking, atau telemetry.
- Jangan pakai script dari website luar.
- Jangan menganggap file aman hanya karena berasal dari vendor.
- Jangan mulai integrasi sebelum audit keamanan selesai.
- Fokus utama adalah keamanan dulu, baru demo jalan.

Mulai dengan:
A. ringkasan isi file JS
B. audit semua koneksi/eksekusi mencurigakan
C. cleansing
D. integrasi ke React + Vite
E. demo monitoring SCADA lokal yang aman
