const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./absensi_padel.db');

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Master Lokasi & Geofencing GPS Padel
const LOKASI_PADEL = {
  "del_luna": {
    nama: "Padel Del Luna",
    lat: -6.918133332267737,
    lng: 107.58425180908361,
    radius_meter: 10
  },
  "boss_mengger": {
    nama: "Padel Boss Mengger",
    lat: -6.966117949983328,
    lng: 107.62140225511331,
    radius_meter: 10
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

// Inisialisasi Database SQLite
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS karyawan (
    id_karyawan TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    no_hp TEXT NOT NULL,
    tgl_join DATE NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rekening_karyawan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_karyawan TEXT UNIQUE NOT NULL,
    nama_bank TEXT NOT NULL,
    no_rekening TEXT NOT NULL,
    nama_pemilik TEXT NOT NULL,
    FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS komponen_gaji (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_karyawan TEXT UNIQUE NOT NULL,
    gaji_pokok REAL NOT NULL DEFAULT 0,
    tunjangan_shift REAL NOT NULL DEFAULT 0,
    tunjangan_weekend REAL NOT NULL DEFAULT 0,
    tunjangan_makan_transport REAL NOT NULL DEFAULT 0,
    bonus_kehadiran REAL NOT NULL DEFAULT 0,
    tambahan_lain REAL NOT NULL DEFAULT 0,
    potongan_lain REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
  )`);

  // Tabel Absensi Lengkap
  db.run(`CREATE TABLE IF NOT EXISTS absensi (
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
  )`, () => {
    // Penambahan kolom otomatis jika mengggunakan database eksisting
    const columns = ['kode_lokasi TEXT', 'lokasi TEXT', 'shift TEXT', 'clock_in DATETIME', 'foto_in TEXT', 'clock_out DATETIME', 'foto_out TEXT', 'waktu TIME'];
    columns.forEach(col => {
      db.run(`ALTER TABLE absensi ADD COLUMN ${col}`, () => {});
    });
  });

  // Seed Default Karyawan
  const daftarKaryawan = [
    ['ADMIN', 'Admin', '081111111111', '2000-01-01'],
    ['PDL-001', 'Nazwa Verylta', '08813099162', '2024-01-15'],
    ['PDL-002', 'Selvi Nuraeni', '085861554157', '2024-03-01'],
    ['PDL-003', 'Mia Haryati', '08997179078', '2024-06-20'],
    ['PDL-004', 'Robiatul Adawiyah/Dewi', '089611900474', '2024-08-10'],
    ['PDL-005', 'Puja Lestari', '089630889604', '2024-11-05'],
    ['PDL-006', 'Dani', '081999887766', '2024-11-05'],
    ['PDL-007', 'Iman Ruhiman', '081999887766', '2024-11-05']
  ];

  const stmt = db.prepare(`INSERT OR REPLACE INTO karyawan (id_karyawan, nama, no_hp, tgl_join) VALUES (?, ?, ?, ?)`);
  daftarKaryawan.forEach(k => stmt.run(k));
  stmt.finalize();
});

// Endpoint Master
app.get('/api/karyawan', (req, res) => {
  db.all('SELECT * FROM karyawan ORDER BY id_karyawan ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/gaji-lengkap', (req, res) => {
  const sql = `
    SELECT k.id_karyawan, k.nama, k.no_hp, k.tgl_join, 
           r.nama_bank, r.no_rekening, r.nama_pemilik, 
           g.gaji_pokok, g.tunjangan_shift, g.tunjangan_weekend, 
           g.tunjangan_makan_transport, g.bonus_kehadiran, g.tambahan_lain, g.potongan_lain,
           (COALESCE(g.gaji_pokok, 0) + COALESCE(g.tunjangan_shift, 0) + COALESCE(g.tunjangan_weekend, 0) + 
            COALESCE(g.tunjangan_makan_transport, 0) + COALESCE(g.bonus_kehadiran, 0) + COALESCE(g.tambahan_lain, 0) - COALESCE(g.potongan_lain, 0)) AS total_gaji
    FROM karyawan k
    LEFT JOIN rekening_karyawan r ON k.id_karyawan = r.id_karyawan
    LEFT JOIN komponen_gaji g ON k.id_karyawan = g.id_karyawan
    ORDER BY k.id_karyawan ASC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/gaji-rekening', (req, res) => {
  const { 
    id_karyawan, nama_bank, no_rekening, nama_pemilik, 
    gaji_pokok, tunjangan_shift, tunjangan_weekend, 
    tunjangan_makan_transport, bonus_kehadiran, tambahan_lain, potongan_lain 
  } = req.body;

  if (!id_karyawan) return res.status(400).json({ error: 'ID Karyawan wajib disertakan!' });

  const queryRek = `INSERT INTO rekening_karyawan (id_karyawan, nama_bank, no_rekening, nama_pemilik) VALUES (?, ?, ?, ?)
    ON CONFLICT(id_karyawan) DO UPDATE SET nama_bank=excluded.nama_bank, no_rekening=excluded.no_rekening, nama_pemilik=excluded.nama_pemilik`;
  
  const queryGaji = `INSERT INTO komponen_gaji (id_karyawan, gaji_pokok, tunjangan_shift, tunjangan_weekend, tunjangan_makan_transport, bonus_kehadiran, tambahan_lain, potongan_lain) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id_karyawan) DO UPDATE SET gaji_pokok=excluded.gaji_pokok, tunjangan_shift=excluded.tunjangan_shift, tunjangan_weekend=excluded.tunjangan_weekend, tunjangan_makan_transport=excluded.tunjangan_makan_transport, bonus_kehadiran=excluded.bonus_kehadiran, tambahan_lain=excluded.tambahan_lain, potongan_lain=excluded.potongan_lain`;

  db.run(queryRek, [id_karyawan, nama_bank || "", no_rekening || "", nama_pemilik || ""], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run(queryGaji, [
      id_karyawan, 
      parseFloat(gaji_pokok) || 0, parseFloat(tunjangan_shift) || 0, 
      parseFloat(tunjangan_weekend) || 0, parseFloat(tunjangan_makan_transport) || 0, 
      parseFloat(bonus_kehadiran) || 0, parseFloat(tambahan_lain) || 0, parseFloat(potongan_lain) || 0
    ], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Data rekening dan gaji berhasil disimpan!' });
    });
  });
});

// Endpoint Clock-In / Check-In
app.post('/api/clock-in', (req, res) => {
  const { id_karyawan, kode_lokasi, shift, user_lat, user_lng, foto } = req.body;

  if (!id_karyawan) {
    return res.status(400).json({ error: 'ID Karyawan wajib diisi!' });
  }

  const locKey = kode_lokasi || 'del_luna';
  const targetLokasi = LOKASI_PADEL[locKey] || LOKASI_PADEL['del_luna'];

  if (user_lat !== undefined && user_lng !== undefined) {
    const jarak = hitungJarak(targetLokasi.lat, targetLokasi.lng, user_lat, user_lng);
    if (jarak > targetLokasi.radius_meter) {
      return res.status(403).json({ error: `Gagal Absen! Jarak Anda ${Math.round(jarak)}m dari lokasi ${targetLokasi.nama} (Maks ${targetLokasi.radius_meter}m).` });
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const timeNow = new Date().toLocaleTimeString('id-ID');

  db.get('SELECT * FROM absensi WHERE id_karyawan = ? AND tanggal = ?', [id_karyawan, today], (err, row) => {
    if (row) return res.status(400).json({ error: 'Anda sudah melakukan Check-In hari ini!' });

    const stmt = db.prepare(`INSERT INTO absensi (id_karyawan, kode_lokasi, lokasi, shift, clock_in, foto_in, tanggal, waktu) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`);
    stmt.run(id_karyawan, locKey, targetLokasi.nama, shift || 'Shift 1', foto || '', today, timeNow, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: `Check-In Berhasil di ${targetLokasi.nama}!` });
    });
    stmt.finalize();
  });
});

// GET Riwayat Absen
app.get('/api/riwayat', (req, res) => {
  const sql = `
    SELECT a.id, a.id_karyawan, k.nama, a.lokasi, a.shift, a.clock_in, a.foto_in, a.clock_out, a.foto_out, a.tanggal, a.waktu 
    FROM absensi a 
    JOIN karyawan k ON a.id_karyawan = k.id_karyawan 
    ORDER BY a.id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(3000, () => {
  console.log('Server Absensi Padel berjalan di http://localhost:3000');
});