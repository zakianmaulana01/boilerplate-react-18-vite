<h1 align="center">Ultimate React Boilerplate</h1>

<p align="center">
  <img src="https://cdn.simpleicons.org/react/61DAFB" alt="React" width="36" height="36" />
  <img src="https://cdn.simpleicons.org/vite/646CFF" alt="Vite" width="36" height="36" />
  <img src="https://cdn.simpleicons.org/reactrouter/CA4245" alt="React Router" width="36" height="36" />
  <img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" alt="Tailwind CSS" width="36" height="36" />
  <img src="https://cdn.simpleicons.org/framer/0055FF" alt="Framer Motion" width="36" height="36" />
</p>

<p align="center">
  <strong>React 18</strong> · <strong>Vite 8</strong> · <strong>Router Ready</strong> · <strong>Motion Enabled</strong>
</p>

<p align="center">
  Boilerplate React 18 + Vite yang rapi, ringan, dan siap dikembangkan.
</p>

<p align="center">
  <strong>by Jek</strong>
</p>

## Tentang Project

Project ini dibuat sebagai pondasi frontend modern dengan fokus ke struktur yang bersih, routing yang siap scale, styling fleksibel, dan animasi halaman yang sudah terpasang dari awal.

Cocok dipakai untuk:

- landing page
- dashboard internal
- company profile
- web app yang butuh setup cepat tapi tetap enak dirawat

## Highlight

- React 18 dengan Vite untuk development yang cepat
- React Router dengan layout terpisah dan nested route
- Framer Motion untuk page transition
- Tailwind CSS dengan design token berbasis CSS variable
- alias import `@` ke folder `src`
- utility `cn()` untuk merge class Tailwind yang lebih rapi
- struktur project simpel dan gampang dibesarkan

## Stack

- React 18
- Vite 8
- React Router DOM 6
- Framer Motion
- Tailwind CSS 3
- ESLint 9

## Struktur Singkat

```text
src/
|- layouts/
|  |- MainLayout.jsx
|- lib/
|  |- utils.js
|- pages/
|  |- About.jsx
|  |- Home.jsx
|- App.jsx
|- index.css
|- main.jsx
```

## Fitur yang Sudah Ada

- halaman `Home`
- halaman `About`
- shared layout dengan navbar dan footer
- animasi transisi antar halaman
- styling dasar dengan komponen visual yang sudah enak dipakai sebagai starting point

## Menjalankan Project

Pastikan Node.js sudah terpasang, lalu jalankan:

```bash
npm install
npm run dev
```

App akan jalan di server Vite lokal, biasanya di `http://localhost:5173`.

## Script

```bash
npm run dev      # jalankan mode development
npm run build    # build production
npm run preview  # preview hasil build
npm run lint     # lint code
```

## Kenapa Boilerplate Ini Enak Dipakai

- tidak terlalu rame, jadi gampang dipahami
- fondasi routing dan layout sudah siap
- visual awal sudah proper, bukan halaman kosong polos
- gampang ditambah komponen, page baru, atau integrasi API

## Catatan

Project ini sudah punya fondasi yang cocok untuk dilanjutkan ke setup komponen reusable, autentikasi, konsumsi API, atau integrasi UI kit sesuai kebutuhan.

## Author

Built with care by **Jek**.
