const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Database Connection
const SUPABASE_URL = "postgresql://postgres.xrhqmjwddcmgyzkudvvg:@Laviola71017@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middlewares
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }));

const PUBLIC_DIR = fs.existsSync(path.join(__dirname, 'public')) 
  ? path.join(__dirname, 'public') 
  : path.join(__dirname, 'Public');

app.use(express.static(PUBLIC_DIR));

// Master Lokasi Padel (Radius 100 Meter)
const LOKASI_PADEL = {
  "del_luna": {
    nama: "Padel Del Luna",
    lat: -6.918133332267737,
    lng: 107.58425180908361,
    radius_meter: 100,
    shifts: ["Shift 1 (07:00 - 15:00)", "Shift 2 (14:00 - 22:00)", "Shift Custom"]
  },
  "boss_mengger": {
    nama: "Padel Boss Mengger",
    lat: -6.966117949983328,
    lng: 107.62140225511331,
    radius_meter: 100,
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

// Helper untuk mendapatkan tanggal lokal Indonesia (WIB / Asia/Jakarta)
function getTanggalLokal() {
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(new Date());
}

// Inisialisasi Otomatis Tabel Database
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

      CREATE TABLE IF NOT EXISTS rekening_karyawan (
        id SERIAL PRIMARY KEY,
        id_karyawan VARCHAR(50) UNIQUE NOT NULL REFERENCES karyawan(id_karyawan) ON DELETE CASCADE,
        nama_bank VARCHAR(50) DEFAULT '',
        no_rekening VARCHAR(50) DEFAULT '',
        nama_pemilik VARCHAR(100) DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS komponen_gaji (
        id SERIAL PRIMARY KEY,
        id_karyawan VARCHAR(50) UNIQUE NOT NULL REFERENCES karyawan(id_karyawan) ON DELETE CASCADE,
        gaji_pokok NUMERIC DEFAULT 0,
        tunjangan_shift NUMERIC DEFAULT 0,
        tunjangan_weekend NUMERIC DEFAULT 0,
        tunjangan_makan_transport NUMERIC DEFAULT 0,
        bonus_kehadiran NUMERIC DEFAULT 0,
        lembur_jam NUMERIC DEFAULT 0,
        tambahan_lain NUMERIC DEFAULT 0,
        potongan_lain NUMERIC DEFAULT 0
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

      CREATE TABLE IF NOT EXISTS booking_lapangan (
        id SERIAL PRIMARY KEY,
        id_booking VARCHAR(50) UNIQUE NOT NULL,
        nama VARCHAR(100) NOT NULL,
        no_hp VARCHAR(30) NOT NULL,
        lokasi TEXT NOT NULL,
        tanggal DATE NOT NULL,
        detail_jam TEXT NOT NULL,
        total_bayar NUMERIC DEFAULT 0,
        poin_didapat INTEGER DEFAULT 0,
        bukti_transfer TEXT,
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS member_poin (
        no_hp VARCHAR(30) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        total_poin INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO karyawan (id_karyawan, nama, no_hp, tgl_join, role) 
      VALUES ('ADMIN', 'Administrator', '081111111111', '2026-01-01', 'admin')
      ON CONFLICT (id_karyawan) DO UPDATE SET role = 'admin';
    `);
    console.log("✅ Database Supabase Siap & Terkoneksi!");
  } catch (err) {
    console.error("⚠️ Koneksi DB Terkendala:", err.message);
  }
}
initDB();

// ================= API ENDPOINTS =================

// Karyawan & Payroll
app.get('/api/karyawan', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM karyawan ORDER BY id_karyawan ASC');
    res.json(result.rows || []);
  } catch (err) {
    res.json([{ id_karyawan: 'ADMIN', nama: 'Administrator', no_hp: '081111111111', role: 'admin' }]);
  }
});

app.get('/api/karyawan/next-id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_karyawan FROM karyawan WHERE id_karyawan LIKE 'PDL-%' ORDER BY id_karyawan DESC LIMIT 1`);
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const num = parseInt(result.rows[0].id_karyawan.replace('PDL-', ''), 10);
      if (!isNaN(num)) nextNumber = num + 1;
    }
    res.json({ nextId: `PDL-${String(nextNumber).padStart(3, '0')}` });
  } catch (err) {
    res.json({ nextId: 'PDL-001' });
  }
});

app.get('/api/gaji-lengkap', async (req, res) => {
  try {
    const sql = `
      SELECT 
        k.id_karyawan, k.nama, k.no_hp, k.tgl_join, k.role,
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
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/karyawan', async (req, res) => {
  const { id_karyawan, nama, no_hp, tgl_join, role } = req.body;
  try {
    await pool.query(`
      INSERT INTO karyawan (id_karyawan, nama, no_hp, tgl_join, role) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id_karyawan) DO UPDATE SET nama = $2, no_hp = $3, tgl_join = $4, role = $5;
    `, [id_karyawan, nama, no_hp || '-', tgl_join || getTanggalLokal(), role || 'karyawan']);
    res.json({ message: 'Data karyawan berhasil disimpan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/karyawan/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM karyawan WHERE id_karyawan = $1', [req.params.id]);
    res.json({ message: 'Karyawan berhasil dihapus!' });
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
    `, [id_karyawan, parseFloat(gaji_pokok)||0, parseFloat(tunjangan_shift)||0, parseFloat(tunjangan_weekend)||0, parseFloat(tunjangan_makan_transport)||0, parseFloat(bonus_kehadiran)||0, parseFloat(lembur_jam)||0, parseFloat(tambahan_lain)||0, parseFloat(potongan_lain)||0]);

    res.json({ message: 'Data rekening & gaji berhasil diperbarui!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Absen Clock In (Real-time & Tanggal Hari Ini, Radius 100m)
app.post('/api/clock-in', async (req, res) => {
  const { id_karyawan, kode_lokasi, shift, user_lat, user_lng, foto } = req.body;
  const targetLokasi = LOKASI_PADEL[kode_lokasi || 'del_luna'];
  
  if (user_lat !== undefined && user_lng !== undefined && targetLokasi) {
    const jarak = hitungJarak(targetLokasi.lat, targetLokasi.lng, user_lat, user_lng);
    if (jarak > targetLokasi.radius_meter) {
      return res.status(403).json({ error: `Gagal Absen! Jarak Anda ${Math.round(jarak)}m dari lokasi (Maksimal 100m).` });
    }
  }

  const today = getTanggalLokal();
  const timeNow = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

  try {
    const check = await pool.query('SELECT * FROM absensi WHERE id_karyawan = $1 AND tanggal = $2 AND clock_out IS NULL', [id_karyawan, today]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Anda sudah Clock-In hari ini!' });

    await pool.query(`
      INSERT INTO absensi (id_karyawan, kode_lokasi, lokasi, shift, clock_in, foto_in, tanggal, waktu) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7)
    `, [id_karyawan, kode_lokasi, targetLokasi ? targetLokasi.nama : 'Padel Club', shift || 'Shift 1', foto || '', today, timeNow]);

    res.json({ message: 'Clock-In Berhasil!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Absen Clock Out (Real-time Update Sesi Aktif Terakhir)
app.post('/api/clock-out', async (req, res) => {
  const { id_karyawan, foto } = req.body;
  const today = getTanggalLokal();

  try {
    const check = await pool.query('SELECT * FROM absensi WHERE id_karyawan = $1 AND tanggal = $2 AND clock_out IS NULL ORDER BY id DESC LIMIT 1', [id_karyawan, today]);
    if (check.rows.length === 0) return res.status(400).json({ error: 'Tidak ada sesi Clock-In aktif hari ini!' });

    await pool.query('UPDATE absensi SET clock_out = CURRENT_TIMESTAMP, foto_out = $1 WHERE id = $2', [foto || '', check.rows[0].id]);
    res.json({ message: 'Clock Out Berhasil!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// API Booking Customer & Poin Member (Multi-Court & Multi-Hour)
app.get('/api/booking/next-id', async (req, res) => {
  try {
    const todayStr = getTanggalLokal().replace(/-/g, '');
    const result = await pool.query(`SELECT id_booking FROM booking_lapangan WHERE id_booking LIKE 'BKG-${todayStr}-%' ORDER BY id DESC LIMIT 1`);
    let nextNum = 1;
    if (result.rows.length > 0) {
      const parts = result.rows[0].id_booking.split('-');
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    res.json({ id_booking: `BKG-${todayStr}-${String(nextNum).padStart(3, '0')}` });
  } catch (err) {
    res.json({ id_booking: `BKG-GENERAL-001` });
  }
});

app.post('/api/booking', async (req, res) => {
  const { id_booking, nama, no_hp, lokasi, tanggal, detail_jam, total_bayar, poin_didapat, bukti_transfer } = req.body;
  try {
    await pool.query(`
      INSERT INTO booking_lapangan (id_booking, nama, no_hp, lokasi, tanggal, detail_jam, total_bayar, poin_didapat, bukti_transfer) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id_booking || 'BKG-GENERAL', nama, no_hp, lokasi, tanggal, detail_jam, total_bayar || 0, poin_didapat || 0, bukti_transfer || '']);

    await pool.query(`
      INSERT INTO member_poin (no_hp, nama, total_poin, updated_at) 
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (no_hp) DO UPDATE SET 
        nama = EXCLUDED.nama,
        total_poin = member_poin.total_poin + EXCLUDED.total_poin,
        updated_at = CURRENT_TIMESTAMP;
    `, [no_hp, nama, poin_didapat || 0]);

    res.json({ message: 'Booking berhasil disimpan & Poin berhasil ditambahkan!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM booking_lapangan ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/member-poin/:hp', async (req, res) => {
  try {
    const { hp } = req.params;
    const result = await pool.query('SELECT * FROM member_poin WHERE no_hp = $1', [hp]);
    if (result.rows.length === 0) {
      return res.json({ total_poin: 0 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/riwayat', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.id_karyawan, k.nama, a.lokasi, a.shift, a.clock_in, a.foto_in, a.clock_out, a.foto_out, a.tanggal, a.waktu 
      FROM absensi a 
      LEFT JOIN karyawan k ON a.id_karyawan = k.id_karyawan 
      ORDER BY a.id DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/lokasi', (req, res) => res.json(LOKASI_PADEL));

// ================= PAGE ROUTING =================
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/index', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/login-member', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login-member.html')));
app.get('/login-member.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login-member.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'booking.html')));
app.get('/booking.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'booking.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server Absensi & Booking Padel Aktif di Port ${PORT}`);
});