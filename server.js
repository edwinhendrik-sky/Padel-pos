const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;

// Connection String Supabase
const SUPABASE_URL = "postgresql://postgres.xrhqmjwddcmgyzkudvvg:@Laviola71017@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }));

const sessions = new Map();

function parseCookies(req) {
  return (req.headers.cookie || '').split(';').reduce((cookies, item) => {
    const separator = item.indexOf('=');
    if (separator > -1) cookies[item.slice(0, separator).trim()] = decodeURIComponent(item.slice(separator + 1));
    return cookies;
  }, {});
}

function requireAuth(req, res, next) {
  const session = sessions.get(parseCookies(req).padel_session);
  if (!session) return res.status(401).json({ error: 'Sesi login tidak valid atau sudah berakhir.' });
  req.user = session;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Akses khusus admin.' });
  next();
}

// Supporting public / Public folder
const PUBLIC_DIR = fs.existsSync(path.join(__dirname, 'public')) 
  ? path.join(__dirname, 'public') 
  : path.join(__dirname, 'Public');

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
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

// Inisialisasi Skema Database Supabase
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS karyawan (
        id_karyawan VARCHAR(50) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        no_hp VARCHAR(30) NOT NULL,
        tgl_join DATE NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'karyawan'
      );

      ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'karyawan';

      CREATE TABLE IF NOT EXISTS rekening_karyawan (
        id SERIAL PRIMARY KEY,
        id_karyawan VARCHAR(50) UNIQUE NOT NULL,
        nama_bank VARCHAR(50) DEFAULT '',
        no_rekening VARCHAR(50) DEFAULT '',
        nama_pemilik VARCHAR(100) DEFAULT '',
        FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS komponen_gaji (
        id SERIAL PRIMARY KEY,
        id_karyawan VARCHAR(50) UNIQUE NOT NULL,
        gaji_pokok NUMERIC DEFAULT 0,
        tunjangan_shift NUMERIC DEFAULT 0,
        tunjangan_weekend NUMERIC DEFAULT 0,
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

    // AKUN ADMIN
    await pool.query(`
      INSERT INTO karyawan (id_karyawan, nama, no_hp, tgl_join, role) 
      VALUES ('ADMIN', 'Admin', '081111111111', '2026-01-01', 'admin')
      ON CONFLICT (id_karyawan) DO UPDATE SET role = 'admin';
    `);

    console.log("Database Supabase PostgreSQL Terkoneksi & Siap!");
  } catch (err) {
    console.error("Gagal koneksi Supabase:", err);
  }
}

initDB();

// LOGIN, LOGOUT, DAN IDENTITAS USER
app.post('/api/login', async (req, res) => {
  const input = String(req.body.identifier || '').trim();
  if (!input) return res.status(400).json({ error: 'ID karyawan atau nomor HP wajib diisi.' });

  try {
    const normalizedPhone = input.replace(/\D/g, '');
    const result = await pool.query(`
      SELECT id_karyawan, nama, no_hp, role FROM karyawan
      WHERE LOWER(id_karyawan) = LOWER($1) OR regexp_replace(no_hp, '[^0-9]', '', 'g') = $2
      LIMIT 1
    `, [input, normalizedPhone]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'ID karyawan atau nomor HP tidak terdaftar.' });

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { id_karyawan: user.id_karyawan, nama: user.nama, role: user.role });
    res.cookie('padel_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/' });
    res.json({ user: sessions.get(token) });
  } catch (err) { res.status(500).json({ error: 'Login gagal diproses.' }); }
});

app.post('/api/logout', (req, res) => {
  const cookies = parseCookies(req);
  sessions.delete(cookies.padel_session);
  res.clearCookie('padel_session', { httpOnly: true, sameSite: 'lax', path: '/' });
  res.json({ message: 'Logout berhasil.' });
});

app.get('/api/session', requireAuth, (req, res) => res.json({ user: req.user }));

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id_karyawan, nama, no_hp, tgl_join, role
      FROM karyawan
      WHERE id_karyawan = $1
      LIMIT 1
    `, [req.user.id_karyawan]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profil karyawan tidak ditemukan.' });
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Profil karyawan gagal dimuat.' });
  }
});

app.use('/api', (req, res, next) => {
  if (req.path === '/login') return next();
  requireAuth(req, res, next);
});

// API AUTO GENERATE ID KARYAWAN
app.get('/api/karyawan/next-id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id_karyawan FROM karyawan 
      WHERE id_karyawan LIKE 'PDL-%' 
      ORDER BY id_karyawan DESC LIMIT 1
    `);

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastId = result.rows[0].id_karyawan;
      const numberPart = parseInt(lastId.replace('PDL-', ''), 10);
      if (!isNaN(numberPart)) {
        nextNumber = numberPart + 1;
      }
    }

    const nextId = `PDL-${String(nextNumber).padStart(3, '0')}`;
    res.json({ nextId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT AMBIL DATA GAJI LENGKAP
app.get('/api/gaji-lengkap', requireAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        k.id_karyawan, 
        k.nama, 
        k.no_hp, 
        k.tgl_join, 
        COALESCE(r.nama_bank, '') as nama_bank, 
        COALESCE(r.no_rekening, '') as no_rekening, 
        COALESCE(r.nama_pemilik, '') as nama_pemilik, 
        COALESCE(g.gaji_pokok, 0) as gaji_pokok, 
        COALESCE(g.tunjangan_shift, 0) as tunjangan_shift, 
        COALESCE(g.tunjangan_weekend, 0) as tunjangan_weekend, 
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
  } catch (err) { 
    console.error("Error /api/gaji-lengkap:", err);
    res.status(500).json({ error: err.message }); 
  }
});

// API KARYAWAN BASIC
app.get('/api/karyawan', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM karyawan ORDER BY id_karyawan ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/karyawan', requireAdmin, async (req, res) => {
  const { id_karyawan, nama, no_hp, tgl_join, role } = req.body;
  try {
    await pool.query(`
      INSERT INTO karyawan (id_karyawan, nama, no_hp, tgl_join, role) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id_karyawan) DO UPDATE SET nama = $2, no_hp = $3, tgl_join = $4, role = $5;
    `, [id_karyawan, nama, no_hp || '-', tgl_join || new Date().toISOString().split('T')[0], role === 'admin' ? 'admin' : 'karyawan']);
    res.json({ message: 'Data karyawan berhasil disimpan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/karyawan/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM karyawan WHERE id_karyawan = $1', [req.params.id]);
    res.json({ message: 'Karyawan dihapus!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gaji-rekening', requireAdmin, async (req, res) => {
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
    `, [id_karyawan, parseFloat(gaji_pokok)||0, parseFloat(tunjangan_shift)||0, parseFloat(tunjangan_weekend)||0, parseFloat(tunjangan_makan_transport)||0, parseFloat(bonus_kehadiran)||0, parseFloat(lembur_jam)||0, parseFloat(tambahan_lain)||0, parseFloat(potongan_lain)||0]);

    res.json({ message: 'Data gaji berhasil disimpan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clock-in', async (req, res) => {
  const { kode_lokasi, shift, user_lat, user_lng, foto } = req.body;
  const id_karyawan = req.user.id_karyawan;
  const targetLokasi = LOKASI_PADEL[kode_lokasi || 'del_luna'];
  if (!targetLokasi) return res.status(400).json({ error: 'Lokasi kerja tidak valid.' });

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
  const { foto } = req.body;
  const id_karyawan = req.user.id_karyawan;
  const today = new Date().toISOString().split('T')[0];

  try {
    const check = await pool.query('SELECT * FROM absensi WHERE id_karyawan = $1 AND tanggal = $2 AND clock_out IS NULL', [id_karyawan, today]);
    if (check.rows.length === 0) return res.status(400).json({ error: 'Tidak ada sesi Check-In aktif hari ini!' });

    await pool.query('UPDATE absensi SET clock_out = CURRENT_TIMESTAMP, foto_out = $1 WHERE id = $2', [foto || '', check.rows[0].id]);
    res.json({ message: 'Clock Out Berhasil!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/riwayat', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.id_karyawan, k.nama, a.lokasi, a.shift, a.clock_in, a.foto_in, a.clock_out, a.foto_out, a.tanggal, a.waktu 
      FROM absensi a JOIN karyawan k ON a.id_karyawan = k.id_karyawan ORDER BY a.id DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/lokasi', (req, res) => res.json(LOKASI_PADEL));

// ==========================================
// STATIC ROUTES & PAGE REDIRECTS (FIXED)
// ==========================================

// Route Khusus Admin
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

// Route Login Admin
app.get('/login-admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login-admin.html')));
app.get('/login-admin.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login-admin.html')));

// Route Khusus Presensi & Login Karyawan
app.get('/index.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

// Route Default Root (http://localhost:10000/)
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

// Jalankan Server
app.listen(PORT, '0.0.0.0', () => console.log(`Server Absensi Padel berjalan pada port ${PORT}`));

// RUTE KARYAWAN KEMBALI KE LOGIN
app.get('/login.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));


app.listen(PORT, '0.0.0.0', () => console.log(`Server Absensi Padel berjalan pada port ${PORT}`));