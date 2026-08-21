const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./absensi_padel.db');

// Limit bodyParser dinaikkan untuk menangani unggahan foto selfie (Base64)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================================
// === MASTER LOKASI PADEL & SHIFT (KOORDINAT GPS PRESISI) =================
// =========================================================================
const LOKASI_PADEL = {
  "del_luna": {
    nama: "Padel Del Luna",
    lat: -6.918133332267737,
    lng: 107.58425180908361,
    radius_meter: 50,
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
    radius_meter: 50,
    shifts: [
      { id: "M1", nama: "Shift 1 (08:00 - 16:00)" },
      { id: "M2", nama: "Shift 2 (13:00 - 23:00)" },
      { id: "M3", nama: "Shift 3 (Custom)" }
    ]
  }
};

// Rumus Haversine untuk menghitung jarak presisi dua titik koordinat (dalam meter)
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

// =========================================================================
// === DB INIT SQLITE & AUTO SEED DATA KARYAWAN ============================
// =========================================================================
db.serialize(() => {
  // 1. Tabel Karyawan
  db.run(`CREATE TABLE IF NOT EXISTS karyawan (
    id_karyawan TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    no_hp TEXT NOT NULL,
    tgl_join DATE NOT NULL
  )`);

  // 2. Tabel Rekening
  db.run(`CREATE TABLE IF NOT EXISTS rekening_karyawan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_karyawan TEXT UNIQUE NOT NULL,
    nama_bank TEXT NOT NULL,
    no_rekening TEXT NOT NULL,
    nama_pemilik TEXT NOT NULL,
    FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
  )`);

  // 3. Tabel Komponen Gaji
  db.run(`CREATE TABLE IF NOT EXISTS komponen_gaji (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_karyawan TEXT UNIQUE NOT NULL,
    gaji_pokok REAL NOT NULL DEFAULT 0,
    tunjangan_shift REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan) ON DELETE CASCADE
  )`);

  // 4. Tabel Absensi
  db.run(`CREATE TABLE IF NOT EXISTS absensi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_karyawan TEXT NOT NULL,
    kode_lokasi TEXT NOT NULL,
    lokasi TEXT NOT NULL,
    shift TEXT NOT NULL,
    clock_in DATETIME,
    foto_in TEXT,
    clock_out DATETIME,
    foto_out TEXT,
    tanggal DATE NOT NULL,
    FOREIGN KEY (id_karyawan) REFERENCES karyawan (id_karyawan)
  )`);

  // Auto-seed Daftar Nama Karyawan Padel Default
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

// =========================================================================
// === ENDPOINT MASTER DATA ================================================
// =========================================================================

// GET Lokasi
app.get('/api/lokasi', (req, res) => {
  res.json(LOKASI_PADEL);
});

// GET Karyawan
app.get('/api/karyawan', (req, res) => {
  db.all('SELECT * FROM karyawan ORDER BY id_karyawan ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST Karyawan Baru
app.post('/api/karyawan', (req, res) => {
  const { id_karyawan, nama, no_hp, tgl_join } = req.body;
  if (!id_karyawan || !nama || !no_hp || !tgl_join) {
    return res.status(400).json({ error: 'Semua field wajib diisi!' });
  }

  const stmt = db.prepare('INSERT INTO karyawan (id_karyawan, nama, no_hp, tgl_join) VALUES (?, ?, ?, ?)');
  stmt.run(id_karyawan, nama, no_hp, tgl_join, function (err) {
    if (err) return res.status(400).json({ error: 'ID Karyawan sudah terdaftar!' });
    res.json({ message: 'Karyawan berhasil ditambahkan!' });
  });
  stmt.finalize();
});

// PUT Update Data Karyawan
app.put('/api/karyawan/:id', (req, res) => {
  const id_karyawan = req.params.id;
  const { nama, no_hp } = req.body;

  if (!nama || !no_hp) {
    return res.status(400).json({ error: 'Nama dan No HP wajib diisi!' });
  }

  const stmt = db.prepare('UPDATE karyawan SET nama = ?, no_hp = ? WHERE id_karyawan = ?');
  stmt.run(nama, no_hp, id_karyawan, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Data karyawan berhasil diperbarui!' });
  });
  stmt.finalize();
});

// DELETE Karyawan
app.delete('/api/karyawan/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM karyawan WHERE id_karyawan = ?');
  stmt.run(req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Karyawan berhasil dihapus!' });
  });
  stmt.finalize();
});

// GET Gaji Lengkap
app.get('/api/gaji-lengkap', (req, res) => {
  const sql = `
    SELECT k.id_karyawan, k.nama, r.nama_bank, r.no_rekening, r.nama_pemilik, g.gaji_pokok, g.tunjangan_shift,
    (COALESCE(g.gaji_pokok, 0) + COALESCE(g.tunjangan_shift, 0)) AS total_gaji
    FROM karyawan k
    LEFT JOIN rekening_karyawan r ON k.id_karyawan = r.id_karyawan
    LEFT JOIN komponen_gaji g ON k.id_karyawan = g.id_karyawan
    ORDER BY k.id_karyawan ASC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST Rekening & Gaji
app.post('/api/gaji-rekening', (req, res) => {
  const { id_karyawan, nama_bank, no_rekening, nama_pemilik, gaji_pokok, tunjangan_shift } = req.body;
  const queryRekening = `INSERT INTO rekening_karyawan (id_karyawan, nama_bank, no_rekening, nama_pemilik) VALUES (?, ?, ?, ?)
    ON CONFLICT(id_karyawan) DO UPDATE SET nama_bank=excluded.nama_bank, no_rekening=excluded.no_rekening, nama_pemilik=excluded.nama_pemilik`;
  const queryGaji = `INSERT INTO komponen_gaji (id_karyawan, gaji_pokok, tunjangan_shift) VALUES (?, ?, ?)
    ON CONFLICT(id_karyawan) DO UPDATE SET gaji_pokok=excluded.gaji_pokok, tunjangan_shift=excluded.tunjangan_shift`;

  db.run(queryRekening, [id_karyawan, nama_bank, no_rekening, nama_pemilik], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run(queryGaji, [id_karyawan, gaji_pokok || 0, tunjangan_shift || 0], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Data rekening dan gaji berhasil disimpan!' });
    });
  });
});

// =========================================================================
// === ENDPOINT ABSENSI (CLOCK IN & CLOCK OUT WITH GEOFENCING & FOTO) =======
// =========================================================================

// POST: CLOCK IN
app.post('/api/clock-in', (req, res) => {
  const { id_karyawan, kode_lokasi, shift, user_lat, user_lng, foto } = req.body;

  if (!id_karyawan || !kode_lokasi || !shift || user_lat === undefined || user_lng === undefined || !foto) {
    return res.status(400).json({ error: 'Data tidak lengkap! Pilihan lokasi, GPS, dan foto wajib diisi.' });
  }

  const targetLokasi = LOKASI_PADEL[kode_lokasi];
  if (!targetLokasi) {
    return res.status(400).json({ error: 'Lokasi Padel yang dipilih tidak valid!' });
  }

  const jarak = hitungJarak(targetLokasi.lat, targetLokasi.lng, user_lat, user_lng);
  if (jarak > targetLokasi.radius_meter) {
    return res.status(403).json({ 
      error: `Gagal Absen! Anda berjarak ${Math.round(jarak)}m dari lokasi ${targetLokasi.nama}. Maksimal radius izin adalah ${targetLokasi.radius_meter}m.` 
    });
  }

  const today = new Date().toISOString().split('T')[0];

  db.get('SELECT * FROM absensi WHERE id_karyawan = ? AND tanggal = ? AND clock_out IS NULL', [id_karyawan, today], (err, row) => {
    if (row) {
      return res.status(400).json({ error: 'Anda sudah Clock In! Silakan Clock Out terlebih dahulu.' });
    }

    const stmt = db.prepare('INSERT INTO absensi (id_karyawan, kode_lokasi, lokasi, shift, clock_in, foto_in, tanggal) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)');
    stmt.run(id_karyawan, kode_lokasi, targetLokasi.nama, shift, foto, today, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: `Clock In Berhasil di ${targetLokasi.nama}!` });
    });
    stmt.finalize();
  });
});

// POST: CLOCK OUT
app.post('/api/clock-out', (req, res) => {
  const { id_karyawan, kode_lokasi, user_lat, user_lng, foto } = req.body;

  if (!id_karyawan || !kode_lokasi || user_lat === undefined || user_lng === undefined || !foto) {
    return res.status(400).json({ error: 'Data tidak lengkap! Pilihan lokasi, GPS, dan foto wajib diisi.' });
  }

  const targetLokasi = LOKASI_PADEL[kode_lokasi];
  if (!targetLokasi) {
    return res.status(400).json({ error: 'Lokasi Padel yang dipilih tidak valid!' });
  }

  const jarak = hitungJarak(targetLokasi.lat, targetLokasi.lng, user_lat, user_lng);
  if (jarak > targetLokasi.radius_meter) {
    return res.status(403).json({ 
      error: `Gagal Clock Out! Anda berjarak ${Math.round(jarak)}m dari lokasi ${targetLokasi.nama}. Clock Out harus dilakukan di lokasi bertugas.` 
    });
  }

  const today = new Date().toISOString().split('T')[0];

  db.get('SELECT * FROM absensi WHERE id_karyawan = ? AND tanggal = ? AND clock_out IS NULL', [id_karyawan, today], (err, row) => {
    if (!row) {
      return res.status(400).json({ error: 'Tidak ada sesi Clock In yang aktif untuk hari ini!' });
    }

    const stmt = db.prepare('UPDATE absensi SET clock_out = CURRENT_TIMESTAMP, foto_out = ? WHERE id = ?');
    stmt.run(foto, row.id, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: `Clock Out Berhasil di ${targetLokasi.nama}!` });
    });
    stmt.finalize();
  });
});

// GET Riwayat
app.get('/api/riwayat', (req, res) => {
  const sql = `
    SELECT a.id, k.nama, a.lokasi, a.shift, a.clock_in, a.foto_in, a.clock_out, a.foto_out, a.tanggal 
    FROM absensi a 
    JOIN karyawan k ON a.id_karyawan = k.id_karyawan 
    ORDER BY a.id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// =========================================================================
// === JALANKAN SERVER =====================================================
// =========================================================================
app.listen(3000, () => {
  console.log('Server Absensi Padel berjalan di http://localhost:3000');
});