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

function getTanggalLokal() {
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(new Date());
}

// Inisialisasi Otomatis Tabel Database & Seeding Data Member Excel
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

      CREATE TABLE IF NOT EXISTS member_padel (
        id_member VARCHAR(50) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        no_hp VARCHAR(30) NOT NULL,
        status_membership VARCHAR(30) DEFAULT 'AKTIF',
        start_member VARCHAR(20) DEFAULT '',
        stop_member VARCHAR(20) DEFAULT '',
        total_poin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

      INSERT INTO karyawan (id_karyawan, nama, no_hp, tgl_join, role) 
      VALUES ('ADMIN', 'Administrator', '081111111111', '2026-01-01', 'admin')
      ON CONFLICT (id_karyawan) DO UPDATE SET role = 'admin';
    `);

    // Seeding data member dari file Excel jika tabel kosong
    const checkMember = await pool.query('SELECT COUNT(*) FROM member_padel');
    if (parseInt(checkMember.rows[0].count) === 0) {
      const initialMembers = [
        ['PB0010', 'YAYU SRI DINASTI', '6281288444334', 'AKTIF', '2026-07-03', '2026-06-09'],
        ['PB0011', 'MELLISA GUNAWAN', '6281222888805', 'AKTIF', '2026-01-04', '2026-01-10'],
        ['PB0012', 'FREDDY', '62811237738', 'AKTIF', '2026-06-03', '2026-05-09'],
        ['PB0013', 'CLAUDIA VANESSA', '6287823212221', 'AKTIF', '2026-06-03', '2026-05-09'],
        ['PB0014', 'DEASY LIUNARDO', '6282126255968', 'AKTIF', '2026-01-04', '2026-01-10'],
        ['PB0015', 'RAMA TYAS', '6288299019106', 'AKTIF', '2026-01-04', '2026-01-10'],
        ['PB0016', 'IVO HIKARU WIJAYAKUSUMA', '62818978189', 'AKTIF', '2026-08-03', '2026-07-09'],
        ['PB0017', 'ZALE', '6281221892069', 'AKTIF', '2026-06-03', '2026-05-09'],
        ['PB0018', 'TOMY SARWANTO', '6281320464423', 'AKTIF', '2026-08-03', '2026-07-09'],
        ['PB0019', 'DINNY ASHRI AKBARIANI', '6282121070757', 'AKTIF', '2026-01-04', '2026-01-10'],
        ['PB0020', 'ANTARES PARASEVA BANDORO', '628112343003', 'AKTIF', '2026-07-03', '2026-06-09'],
        ['PB0021', 'AL FRITA MEGA PURI', '6282128286777', 'AKTIF', '2026-03-14', '2026-09-13'],
        ['PB0022', 'AGNES ISLY', '6281321155313', 'AKTIF', '2026-08-03', '2026-07-09'],
        ['PB0023', 'LIZA MARIANA', '6281321620426', 'AKTIF', '2026-01-04', '2026-01-10'],
        ['PB0024', 'CAROLINE HDI', '6285863336699', 'AKTIF', '2026-01-04', '2026-01-10'],
        ['PB0025', 'DAVID S (@DAVID.104)', '6285721221241', 'AKTIF', '2026-03-14', '2026-09-13'],
        ['PB0026', 'VICAQUITA LIDRAPRANOTO', '6281809787800', 'AKTIF', '2026-03-14', '2026-09-13'],
        ['PB0027', 'ANGGA ARDIANSYAH', '628112309096', 'AKTIF', '2026-01-04', '2026-01-10'],
        ['PB0028', 'GRACE SYNTIA DEWI', '6281809977336', 'AKTIF', '2026-11-03', '2026-10-09'],
        ['PB0029', 'ANGGA DWI KOSWARA', '6287779994563', 'AKTIF', '2026-03-13', '2026-12-09'],
        ['PB0030', 'FAISHAL ARDHAN', '6287838285096', 'AKTIF', '2026-03-25', '2026-09-24'],
        ['PB0031', 'FRANCISKA CLAUDIA SUNGADI', '6281802038451', 'AKTIF', '2026-03-17', '2026-09-16'],
        ['PB0032', 'FELIA FEBY SUTANTO', '628112388662', 'AKTIF', '2026-03-04', '2026-02-10'],
        ['PB0033', 'ALFI RAHMAN WIDI KRISNADI', '6282116163883', 'AKTIF', '2026-11-04', '2026-10-10'],
        ['PB0034', 'ABDUL HAKIM', '628112244619', 'AKTIF', '2026-08-04', '2026-07-10'],
        ['PB0035', 'BRAM F PURWA', '6281918189888', 'AKTIF', '2026-04-20', '2026-10-19'],
        ['PB0036', 'IIN RIZKI', '62818203337', 'AKTIF', '2026-04-20', '2026-10-19'],
        ['PB0037', 'NAJMIYA BRILIANI ARFIDHIYA', '6282240440173', 'AKTIF', '2026-04-20', '2026-10-19'],
        ['PB0038', 'ANGGI SUCI AGUSTINA', '628562312971', 'AKTIF', '2026-04-20', '2026-10-19'],
        ['PB0039', 'KANG J. RIDWAN', '6285871582080', 'AKTIF', '2026-04-20', '2026-10-19'],
        ['PB0040', 'FABIAN', '6281809090303', 'AKTIF', '2026-04-20', '2026-10-19'],
        ['PB0041', 'CHRISTINE GAUTAMA', '6281319000930', 'AKTIF', '2026-04-29', '2026-10-28'],
        ['PB0042', 'JUANITA', '628122182900', 'AKTIF', '2026-06-05', '2026-05-11'],
        ['PB0043', 'HENRY', '6285956225050', 'AKTIF', '2026-05-28', '2026-08-27'],
        ['PB0044', 'SEMBIRING', '6281322406496', 'AKTIF', '2026-05-28', '2026-11-27'],
        ['PB0045', 'FADHIL ADRIAN', '6282117811569', 'AKTIF', '2026-05-30', '2026-11-29']
      ];

      for (let m of initialMembers) {
        await pool.query(`
          INSERT INTO member_padel (id_member, nama, no_hp, status_membership, start_member, stop_member, total_poin)
          VALUES ($1, $2, $3, $4, $5, $6, 0)
          ON CONFLICT (id_member) DO NOTHING;
        `, m);
      }
      console.log("✅ Seeding database member Excel berhasil!");
    }

    console.log("✅ Database Supabase Siap & Terkoneksi!");
  } catch (err) {
    console.error("⚠️ Koneksi DB Terkendala:", err.message);
  }
}
initDB();

// ================= API ENDPOINTS MASTER MEMBER =================
app.get('/api/member', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM member_padel ORDER BY id_member ASC');
    res.json(result.rows || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/member/next-id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_member FROM member_padel WHERE id_member LIKE 'PB%' ORDER BY id_member DESC LIMIT 1`);
    let nextNum = 46;
    if (result.rows.length > 0) {
      const num = parseInt(result.rows[0].id_member.replace('PB', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    res.json({ nextId: `PB${String(nextNum).padStart(4, '0')}` });
  } catch (err) { res.json({ nextId: 'PB0046' }); }
});

app.post('/api/member', async (req, res) => {
  const { id_member, nama, no_hp, status_membership, start_member, stop_member, total_poin } = req.body;
  try {
    await pool.query(`
      INSERT INTO member_padel (id_member, nama, no_hp, status_membership, start_member, stop_member, total_poin) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id_member) DO UPDATE SET 
        nama = EXCLUDED.nama, 
        no_hp = EXCLUDED.no_hp,
        status_membership = EXCLUDED.status_membership,
        start_member = EXCLUDED.start_member,
        stop_member = EXCLUDED.stop_member,
        total_poin = COALESCE(EXCLUDED.total_poin, member_padel.total_poin);
    `, [id_member, nama, no_hp, status_membership || 'AKTIF', start_member || '', stop_member || '', parseInt(total_poin) || 0]);
    res.json({ message: 'Data member berhasil disimpan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/member/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM member_padel WHERE id_member = $1', [req.params.id]);
    res.json({ message: 'Member berhasil dihapus!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/member/login/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM member_padel WHERE UPPER(id_member) = UPPER($1)', [id.trim()]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ID Member tidak terdaftar di sistem Padel Boss!' });
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= API KARYAWAN & BOOKING =================
app.get('/api/karyawan', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM karyawan ORDER BY id_karyawan ASC');
    res.json(result.rows || []);
  } catch (err) {
    res.json([{ id_karyawan: 'ADMIN', nama: 'Administrator', no_hp: '081111111111', role: 'admin' }]);
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
  } catch (err) { res.status(500).json({ error: err.message }); }
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

app.post('/api/clock-in', async (req, res) => {
  const { id_karyawan, kode_lokasi, shift, user_lat, user_lng, foto } = req.body;
  const targetLokasi = LOKASI_PADEL[kode_lokasi || 'boss_mengger'];
  
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
  } catch (err) { res.json({ id_booking: `BKG-GENERAL-001` }); }
});

app.post('/api/booking', async (req, res) => {
  const { id_booking, id_member, nama, no_hp, lokasi, tanggal, detail_jam, total_bayar, poin_didapat, bukti_transfer } = req.body;
  try {
    await pool.query(`
      INSERT INTO booking_lapangan (id_booking, nama, no_hp, lokasi, tanggal, detail_jam, total_bayar, poin_didapat, bukti_transfer) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id_booking || 'BKG-GENERAL', nama, no_hp, lokasi, tanggal, detail_jam, total_bayar || 0, poin_didapat || 0, bukti_transfer || '']);

    if (id_member) {
      await pool.query(`
        UPDATE member_padel 
        SET total_poin = total_poin + $1 
        WHERE id_member = $2
      `, [poin_didapat || 0, id_member]);
    }

    res.json({ message: 'Booking berhasil disimpan & Poin berhasil ditambahkan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/booking', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM booking_lapangan ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
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