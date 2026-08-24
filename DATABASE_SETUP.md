# Koneksi Database Online Gratis

Aplikasi ini menggunakan PostgreSQL. Supabase menyediakan database PostgreSQL gratis yang cocok untuk aplikasi ini.

## 1. Buat database Supabase

1. Buka https://supabase.com dan buat project baru.
2. Tunggu project selesai dibuat.
3. Buka `Project Settings > Database`.
4. Pada bagian `Connection string`, pilih `Session pooler` dan salin URI PostgreSQL.
5. Ganti `[YOUR-PASSWORD]` dengan password database project.

## 2. Jalankan secara lokal

Salin `.env.example` menjadi `.env`, kemudian isi:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres
PORT=10000
```

Jalankan aplikasi:

```bash
npm install
npm start
```

Saat pertama kali server menyala, tabel dan data awal dibuat otomatis. Periksa koneksi di `http://localhost:10000/api/health`.

## 3. Deploy ke hosting

Pada hosting Node.js pilihan Anda, tambahkan environment variable berikut pada pengaturan service:

- `DATABASE_URL`: URI dari Supabase
- `PORT`: biasanya disediakan otomatis oleh hosting

Jangan commit file `.env` atau membagikan `DATABASE_URL` karena URI tersebut berisi password database.
