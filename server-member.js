const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.MEMBER_PORT || 10001;

const SUPABASE_URL = "postgresql://postgres.xrhqmjwddcmgyzkudvvg:@Laviola71017@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }));

const PUBLIC_DIR = fs.existsSync(path.join(__dirname, 'public')) 
  ? path.join(__dirname, 'public') 
  : path.join(__dirname, 'Public');

app.use(express.static(PUBLIC_DIR));

// Endpoint Login Member (Wajib Format JSON)[cite: 1]
app.get('/api/member/login/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID Member kosong!' });
    
    const result = await pool.query('SELECT * FROM member_padel WHERE UPPER(id_member) = UPPER($1)', [id.trim()]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ID Member tidak terdaftar di sistem Padel Boss!' });
    }
    return res.json(result.rows[0]);
  } catch (err) { 
    return res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/booking/next-id', async (req, res) => {
  try {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replace(/-/g, '');
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

app.get('/api/booking/terpakai', async (req, res) => {
  try {
    const { tanggal } = req.query;
    if (!tanggal) return res.json([]);
    const result = await pool.query(
      'SELECT lokasi, detail_jam FROM booking_lapangan WHERE tanggal = $1 AND status != \'Ditolak\'',
      [tanggal]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking', async (req, res) => {
  const { id_booking, id_member, nama, no_hp, lokasi, tanggal, detail_jam, total_bayar, poin_didapat, bukti_transfer } = req.body;
  try {
    await pool.query(`
      INSERT INTO booking_lapangan (id_booking, nama, no_hp, lokasi, tanggal, detail_jam, total_bayar, poin_didapat, bukti_transfer) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id_booking || 'BKG-GENERAL', nama, no_hp, lokasi, tanggal, detail_jam, total_bayar || 0, poin_didapat || 0, bukti_transfer || '']);

    if (id_member) {
      await pool.query(`UPDATE member_padel SET total_poin = total_poin + $1 WHERE id_member = $2`, [poin_didapat || 0, id_member]);
    }

    res.json({ message: 'Booking berhasil disimpan & Poin berhasil ditambahkan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/login-member', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login-member.html')));
app.get('/login-member.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login-member.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'booking.html')));
app.get('/booking.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'booking.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login-member.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server Khusus Member Booking Aktif di Port ${PORT}`);
});