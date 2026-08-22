const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Koneksi ke Supabase PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }));

// Supporting public / Public folder (Case-Sensitive Safe)
const PUBLIC_DIR = fs.existsSync(path.join(__dirname, 'public')) 
  ? path.join(__dirname, 'public') 
  : path.join(__dirname, 'Public');

app.use(express.static(PUBLIC_DIR));

// Master Lokasi Padel
const LOKASI_PADEL = {
  "del_luna": {
    nama: "Padel Del Luna",
    lat: -6.918133332267737,
    lng: 107.58425180908361,
    radius_meter: 50,
    shifts: ["Shift 1 (07:00 - 15:00)", "Shift 2 (14:00 - 22:00)", "Shift Custom"]
  },
  "boss_mengger": {
    nama: "Padel Boss Mengger",
    lat: -6.966117949983328,
    lng: 107.62140225511331,
    radius_meter: 50,
    shifts: ["Shift 1 (08:00 - 16:00)", "Shift 2 (13:00 - 23:00)", "Shift Custom"]
  }
};

function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Inisialisasi Skema Database Supabase (PostgreSQL)
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS karyawan (
        id_karyawan VARCHAR(50) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        no_hp VARCHAR(30) NOT NULL,
        tgl_join DATE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rekening_karyawan (
        id SERIAL PRIMARY KEY,
        id_karyawan VARCHAR(50) UNIQUE NOT NULL,
        nama_bank VARCHAR(50) NOT NULL,
        no_rekening VARCHAR(50) NOT NULL,
        nama_pemilik VARCHAR(100) NOT NULL,
        FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS komponen_gaji (
        id SERIAL PRIMARY KEY,
        id_karyawan VARCHAR(50) UNIQUE NOT NULL,
        gaji_pokok NUMERIC DEFAULT 0,
        tunjangan_shift NUMERIC DEFAULT 0,
        tunjangan_weekend NUMERIC DEFAULT 25000,
        tunjangan_makan_transport NUMERIC DEFAULT 0,
        bonus_kehadiran NUMERIC DEFAULT 0,
        lembur_jam NUMERIC DEFAULT 0,
        tambahan_lain NUMERIC DEFAULT 0,
        potongan_lain NUMERIC DEFAULT 0,
        FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS absensi (
        id SERIAL PRIMARY KEY,
        id_karyawan VARCHAR(50) NOT NULL,
        kode_lokasi VARCHAR(50),
        lokasi VARCHAR(100),
        shift VARCHAR(50),
        clock_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        foto_in TEXT,
        clock_out TIMESTAMP,
        foto_out TEXT,
        tanggal DATE NOT NULL,
        waktu VARCHAR(20)
      );
    `);

    // Seed Data Default Karyawan & Komponen Gaji
    await pool.query(`
      INSERT INTO karyawan (id_karyawan, nama, no_hp, tgl_join) 
      VALUES ('ADMIN', 'Admin', '081111111111', '2026-01-01'),
             ('PDL-001', 'Nazwa Verylta', '08813099162', '2026-01-15')
      ON CONFLICT (id_karyawan) DO NOTHING;

      INSERT INTO komponen_gaji (id_karyawan, gaji_pokok, tunjangan_weekend, tunjangan_makan_transport, bonus_kehadiran)
      VALUES ('PDL-001', 1500000, 25000, 10000, 300000)
      ON CONFLICT (id_karyawan) DO NOTHING;

      INSERT INTO rekening_karyawan (id_karyawan, nama_bank, no_rekening, nama_pemilik)
      VALUES ('PDL-001', 'Seabank', '901153058318', 'Nazwa Verylta')
      ON CONFLICT (id_karyawan) DO NOTHING;
    `);

    console.log("Database Supabase PostgreSQL Terkoneksi & Siap!");
  } catch (err) {
    console.error("Gagal koneksi Supabase:", err);
  }
}

initDB();

// Endpoints API
app.get('/api/lokasi', (req, res) => res.json(LOKASI_PADEL));

app.get('/api/karyawan', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM karyawan ORDER BY id_karyawan ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/karyawan', async (req, res) => {
  const { id_karyawan, nama, no_hp, tgl_join } = req.body;
  try {
    await pool.query(`
      INSERT INTO karyawan (id_karyawan, nama, no_hp, tgl_join) VALUES ($1, $2, $3, $4)
      ON CONFLICT (id_karyawan) DO UPDATE SET nama = $2, no_hp = $3;
    `, [id_karyawan, nama, no_hp || '-', tgl_join || new Date().toISOString().split('T')[0]]);
    res.json({ message: 'Data karyawan tersimpan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/karyawan/:id', async (req, res) => {
  const { nama, no_hp } = req.body;
  try {
    await pool.query('UPDATE karyawan SET nama = $1, no_hp = $2 WHERE id_karyawan = $3', [nama, no_hp, req.params.id]);
    res.json({ message: 'Data karyawan diperbarui!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/karyawan/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM karyawan WHERE id_karyawan = $1', [req.params.id]);
    res.json({ message: 'Karyawan dihapus!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/gaji-lengkap', async (req, res) => {
  try {
    const sql = `
      SELECT k.id_karyawan, k.nama, k.no_hp, k.tgl_join, 
             r.nama_bank, r.no_rekening, r.nama_pemilik, 
             COALESCE(g.gaji_pokok, 0) as gaji_pokok, 
             COALESCE(g.tunjangan_shift, 0) as tunjangan_shift, 
             COALESCE(g.tunjangan_weekend, 25000) as tunjangan_weekend, 
             COALESCE(g.tunjangan_makan_transport, 0) as tunjangan_makan_transport, 
             COALESCE(g.bonus_kehadiran, 0) as bonus_kehadiran, 
             COALESCE(g.lembur_jam, 0) as lembur_jam, 
             COALESCE(g.tambahan_lain, 0) as tambahan_lain, 
             COALESCE(g.potongan_lain, 0) as potongan_lain
      FROM karyawan k
      LEFT JOIN rekening_karyawan r ON k.id_karyawan = r.id_karyawan
      LEFT JOIN komponen_gaji g ON k.id_karyawan = g.id_karyawan
      ORDER BY k.id_karyawan ASC`;
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gaji-rekening', async (req, res) => {
  const { id_karyawan, nama_bank, no_rekening, nama_pemilik, gaji_pokok, tunjangan_shift, tunjangan_weekend, tunjangan_makan_transport, bonus_kehadiran, lembur_jam, tambahan_lain, potongan_lain } = req.body;

  try {
    await pool.query(`
      INSERT INTO rekening_karyawan (id_karyawan, nama_bank, no_rekening, nama_pemilik) VALUES ($1, $2, $3, $4)
      ON CONFLICT(id_karyawan) DO UPDATE SET nama_bank=EXCLUDED.nama_bank, no_rekening=EXCLUDED.no_rekening, nama_pemilik=EXCLUDED.nama_pemilik;
    `, [id_karyawan, nama_bank || "", no_rekening || "", nama_pemilik || ""]);

    await pool.query(`
      INSERT INTO komponen_gaji (id_karyawan, gaji_pokok, tunjangan_shift, tunjangan_weekend, tunjangan_makan_transport, bonus_kehadiran, lembur_jam, tambahan_lain, potongan_lain) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT(id_karyawan) DO UPDATE SET 
        gaji_pokok=EXCLUDED.gaji_pokok, tunjangan_shift=EXCLUDED.tunjangan_shift, 
        tunjangan_weekend=EXCLUDED.tunjangan_weekend, tunjangan_makan_transport=EXCLUDED.tunjangan_makan_transport, 
        bonus_kehadiran=EXCLUDED.bonus_kehadiran, lembur_jam=EXCLUDED.lembur_jam, 
        tambahan_lain=EXCLUDED.tambahan_lain, potongan_lain=EXCLUDED.potongan_lain;
    `, [id_karyawan, parseFloat(gaji_pokok)||0, parseFloat(tunjangan_shift)||0, parseFloat(tunjangan_weekend)||25000, parseFloat(tunjangan_makan_transport)||0, parseFloat(bonus_kehadiran)||0, parseFloat(lembur_jam)||0, parseFloat(tambahan_lain)||0, parseFloat(potongan_lain)||0]);

    res.json({ message: 'Data gaji berhasil disimpan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clock-in', async (req, res) => {
  const { id_karyawan, kode_lokasi, shift, user_lat, user_lng, foto } = req.body;
  const targetLokasi = LOKASI_PADEL[kode_lokasi || 'del_luna'];

  if (user_lat !== undefined && user_lng !== undefined) {
    const jarak = hitungJarak(targetLokasi.lat, targetLokasi.lng, user_lat, user_lng);
    if (jarak > targetLokasi.radius_meter) {
      return res.status(403).json({ error: `Gagal Absen! Jarak Anda ${Math.round(jarak)}m dari lokasi.` });
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const timeNow = new Date().toLocaleTimeString('id-ID');

  try {
    const check = await pool.query('SELECT * FROM absensi WHERE id_karyawan = $1 AND tanggal = $2 AND clock_out IS NULL', [id_karyawan, today]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Anda sudah Check-In hari ini!' });

    await pool.query(`
      INSERT INTO absensi (id_karyawan, kode_lokasi, lokasi, shift, foto_in, tanggal, waktu) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id_karyawan, kode_lokasi, targetLokasi.nama, shift || 'Shift 1', foto || '', today, timeNow]);

    res.json({ message: 'Check-In Berhasil!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clock-out', async (req, res) => {
  const { id_karyawan, foto } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    const check = await pool.query('SELECT * FROM absensi WHERE id_karyawan = $1 AND tanggal = $2 AND clock_out IS NULL', [id_karyawan, today]);
    if (check.rows.length === 0) return res.status(400).json({ error: 'Tidak ada sesi Check-In aktif hari ini!' });

    await pool.query('UPDATE absensi SET clock_out = CURRENT_TIMESTAMP, foto_out = $1 WHERE id = $2', [foto || '', check.rows[0].id]);
    res.json({ message: 'Clock Out Berhasil!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/riwayat', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.id_karyawan, k.nama, a.lokasi, a.shift, a.clock_in, a.foto_in, a.clock_out, a.foto_out, a.tanggal, a.waktu 
      FROM absensi a JOIN karyawan k ON a.id_karyawan = k.id_karyawan ORDER BY a.id DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Server Absensi Padel berjalan pada port ${PORT}`));