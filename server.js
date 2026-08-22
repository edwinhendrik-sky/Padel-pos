const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DB_PATH = './absensi_padel.db';

// Inisialisasi Database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Middleware
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }));

// Serving Folder Statis (Folder 'public')
app.use(express.static(path.join(__dirname, 'public')));

// Master Lokasi Padel
const LOKASI_PADEL = {
  "del_luna": {
    nama: "Padel Del Luna",
    lat: -6.918133332267737,
    lng: 107.58425180908361,
    radius_meter: 10,
    shifts: [
      { id: "L1", nama: "Shift 1 (07:00 - 15:00)" },
      { id: "L2", nama: "Shift 2 (14:00 - 22:00)" },
      { id: "L3", nama: "Shift 3 (Custom)" }
    ]
  },
  "boss_mengger": {
    nama: "Padel Boss Mengger",
    lat: -6.966117949983328,
    lng: 107.62140225511331,
    radius_meter: 10,
    shifts: [
      { id: "M1", nama: "Shift 1 (08:00 - 16:00)" },
      { id: "M2", nama: "Shift 2 (13:00 - 23:00)" },
      { id: "M3", nama: "Shift 3 (Custom)" }
    ]
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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Inisialisasi Skema Tabel Database (Sinkron)
db.exec(`
  CREATE TABLE IF NOT EXISTS karyawan (
    id_karyawan TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    no_hp TEXT NOT NULL,
    tgl_join DATE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rekening_karyawan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_karyawan TEXT UNIQUE NOT NULL,
    nama_bank TEXT NOT NULL,
    no_rekening TEXT NOT NULL,
    nama_pemilik TEXT NOT NULL,
    FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS komponen_gaji (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_karyawan TEXT UNIQUE NOT NULL,
    gaji_pokok REAL NOT NULL DEFAULT 0,
    tunjangan_shift REAL NOT NULL DEFAULT 0,
    tunjangan_weekend REAL NOT NULL DEFAULT 25000,
    tunjangan_makan_transport REAL NOT NULL DEFAULT 0,
    bonus_kehadiran REAL NOT NULL DEFAULT 0,
    lembur_jam REAL NOT NULL DEFAULT 0,
    tambahan_lain REAL NOT NULL DEFAULT 0,
    potongan_lain REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS absensi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_karyawan TEXT NOT NULL,
    kode_lokasi TEXT,
    lokasi TEXT,
    shift TEXT,
    clock_in DATETIME,
    foto_in TEXT,
    clock_out DATETIME,
    foto_out TEXT,
    tanggal DATE NOT NULL,
    waktu TIME,
    FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan)
  );
`);

// Auto-seed Data Admin & Karyawan PDL-001
const stmtKaryawan = db.prepare(`INSERT OR REPLACE INTO karyawan (id_karyawan, nama, no_hp, tgl_join) VALUES (?, ?, ?, ?)`);
stmtKaryawan.run('ADMIN', 'Admin', '081111111111', '2026-01-01');
stmtKaryawan.run('PDL-001', 'Nazwa Verylta', '08813099162', '2026-01-15');

db.prepare(`INSERT OR IGNORE INTO komponen_gaji (id_karyawan, gaji_pokok, tunjangan_shift, tunjangan_weekend, tunjangan_makan_transport, bonus_kehadiran, lembur_jam, tambahan_lain, potongan_lain) 
        VALUES ('PDL-001', 1500000, 0, 25000, 10000, 300000, 0, 0, 0)`).run();

db.prepare(`INSERT OR IGNORE INTO rekening_karyawan (id_karyawan, nama_bank, no_rekening, nama_pemilik) 
        VALUES ('PDL-001', 'Seabank', '901153058318', 'Nazwa Verylta')`).run();

// =========================================================================
// === RUTE HALAMAN UTAMA (FIX CANNOT GET /) ================================
// =========================================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =========================================================================
// === ENDPOINTS API =======================================================
// =========================================================================

app.get('/api/lokasi', (req, res) => res.json(LOKASI_PADEL));

app.get('/api/karyawan', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM karyawan ORDER BY id_karyawan ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/karyawan', (req, res) => {
  const { id_karyawan, nama, no_hp, tgl_join } = req.body;
  if (!id_karyawan || !nama) return res.status(400).json({ error: 'ID dan Nama Karyawan wajib diisi!' });

  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO karyawan (id_karyawan, nama, no_hp, tgl_join) VALUES (?, ?, ?, ?)');
    stmt.run(id_karyawan, nama, no_hp || '-', tgl_join || new Date().toISOString().split('T')[0]);
    res.json({ message: 'Karyawan berhasil ditambahkan!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/karyawan/:id', (req, res) => {
  const { nama, no_hp } = req.body;
  try {
    const stmt = db.prepare('UPDATE karyawan SET nama = ?, no_hp = ? WHERE id_karyawan = ?');
    stmt.run(nama, no_hp, req.params.id);
    res.json({ message: 'Data karyawan diperbarui!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/karyawan/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM karyawan WHERE id_karyawan = ?');
    stmt.run(req.params.id);
    res.json({ message: 'Karyawan dihapus!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gaji-lengkap', (req, res) => {
  try {
    const sql = `
      SELECT k.id_karyawan, k.nama, k.no_hp, k.tgl_join, 
             r.nama_bank, r.no_rekening, r.nama_pemilik, 
             g.gaji_pokok, g.tunjangan_shift, g.tunjangan_weekend, 
             g.tunjangan_makan_transport, g.bonus_kehadiran, g.lembur_jam, g.tambahan_lain, g.potongan_lain
      FROM karyawan k
      LEFT JOIN rekening_karyawan r ON k.id_karyawan = r.id_karyawan
      LEFT JOIN komponen_gaji g ON k.id_karyawan = g.id_karyawan
      ORDER BY k.id_karyawan ASC`;
    const rows = db.prepare(sql).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gaji-rekening', (req, res) => {
  const { id_karyawan, nama_bank, no_rekening, nama_pemilik, gaji_pokok, tunjangan_shift, tunjangan_weekend, tunjangan_makan_transport, bonus_kehadiran, lembur_jam, tambahan_lain, potongan_lain } = req.body;

  try {
    const queryRek = `INSERT INTO rekening_karyawan (id_karyawan, nama_bank, no_rekening, nama_pemilik) VALUES (?, ?, ?, ?)
      ON CONFLICT(id_karyawan) DO UPDATE SET nama_bank=excluded.nama_bank, no_rekening=excluded.no_rekening, nama_pemilik=excluded.nama_pemilik`;
    
    const queryGaji = `INSERT INTO komponen_gaji (id_karyawan, gaji_pokok, tunjangan_shift, tunjangan_weekend, tunjangan_makan_transport, bonus_kehadiran, lembur_jam, tambahan_lain, potongan_lain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id_karyawan) DO UPDATE SET gaji_pokok=excluded.gaji_pokok, tunjangan_shift=excluded.tunjangan_shift, tunjangan_weekend=excluded.tunjangan_weekend, tunjangan_makan_transport=excluded.tunjangan_makan_transport, bonus_kehadiran=excluded.bonus_kehadiran, lembur_jam=excluded.lembur_jam, tambahan_lain=excluded.tambahan_lain, potongan_lain=excluded.potongan_lain`;

    db.prepare(queryRek).run(id_karyawan, nama_bank || "", no_rekening || "", nama_pemilik || "");
    db.prepare(queryGaji).run(id_karyawan, parseFloat(gaji_pokok)||0, parseFloat(tunjangan_shift)||0, parseFloat(tunjangan_weekend)||25000, parseFloat(tunjangan_makan_transport)||0, parseFloat(bonus_kehadiran)||0, parseFloat(lembur_jam)||0, parseFloat(tambahan_lain)||0, parseFloat(potongan_lain)||0);

    res.json({ message: 'Data gaji berhasil disimpan!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clock-in', (req, res) => {
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
    const row = db.prepare('SELECT * FROM absensi WHERE id_karyawan = ? AND tanggal = ? AND clock_out IS NULL').get(id_karyawan, today);
    if (row) return res.status(400).json({ error: 'Anda sudah Check-In hari ini!' });

    const stmt = db.prepare(`INSERT INTO absensi (id_karyawan, kode_lokasi, lokasi, shift, clock_in, foto_in, tanggal, waktu) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`);
    stmt.run(id_karyawan, kode_lokasi, targetLokasi.nama, shift || 'Shift 1', foto || '', today, timeNow);

    res.json({ message: 'Check-In Berhasil!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clock-out', (req, res) => {
  const { id_karyawan, foto } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    const row = db.prepare('SELECT * FROM absensi WHERE id_karyawan = ? AND tanggal = ? AND clock_out IS NULL').get(id_karyawan, today);
    if (!row) return res.status(400).json({ error: 'Tidak ada sesi Check-In aktif hari ini!' });

    const stmt = db.prepare('UPDATE absensi SET clock_out = CURRENT_TIMESTAMP, foto_out = ? WHERE id = ?');
    stmt.run(foto || '', row.id);

    res.json({ message: 'Clock Out Berhasil!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/riwayat', (req, res) => {
  try {
    const sql = `SELECT a.id, a.id_karyawan, k.nama, a.lokasi, a.shift, a.clock_in, a.foto_in, a.clock_out, a.foto_out, a.tanggal, a.waktu FROM absensi a JOIN karyawan k ON a.id_karyawan = k.id_karyawan ORDER BY a.id DESC`;
    const rows = db.prepare(sql).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reset-database', (req, res) => {
  try {
    db.prepare(`DELETE FROM absensi`).run();
    db.prepare(`DELETE FROM komponen_gaji`).run();
    db.prepare(`DELETE FROM rekening_karyawan`).run();
    db.prepare(`DELETE FROM karyawan WHERE id_karyawan != 'ADMIN'`).run();
    res.json({ message: 'Database berhasil dikosongkan!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback Route untuk Express v5 (Mengarahkan rute yang tak terdaftar ke index.html)
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server Absensi Padel berjalan pada port ${PORT}`));