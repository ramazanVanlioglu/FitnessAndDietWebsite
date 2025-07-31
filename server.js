const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

// MySQL bağlantısı
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'ramazan223205050?',
  database: 'fitness_diet',
  waitForConnections: true,
  connectionLimit: 10
});

// Statik dosyaları göster (ör: HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'fitness-diyet-web', 'main-pages')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// REGISTER işlemi
app.post('/register', async (req, res) => {
  const { ad, soyad, eposta, sifre } = req.body;
  if (!ad || !soyad || !eposta || !sifre) return res.status(400).json({ error: 'Eksik bilgi' });

  const hash = await bcrypt.hash(sifre, 10);
  try {
    await pool.query(
      'INSERT INTO kullanicilar (ad, soyad, eposta, sifre_hash) VALUES (?, ?, ?, ?)',
      [ad, soyad, eposta, hash]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Kayıt başarısız veya e-posta zaten kayıtlı.' });
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  const { eposta, sifre } = req.body;
  if (!eposta || !sifre) return res.status(400).json({ error: 'Eksik bilgi' });

  const [rows] = await pool.query('SELECT * FROM kullanicilar WHERE eposta = ?', [eposta]);
  if (rows.length === 0) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });

  const user = rows[0];
  const match = await bcrypt.compare(sifre, user.sifre_hash);
  if (!match) return res.status(401).json({ error: 'Şifre yanlış' });

  req.session.userId = user.id;
  res.json({ success: true, user: { id: user.id, ad_soyad: user.ad + ' ' + user.soyad, eposta: user.eposta } });
});

// LOGOUT
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// GET USER MESSAGES
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  await pool.query(
    'INSERT INTO mesajlar (ad, eposta, mesaj) VALUES (?, ?, ?)',
    [name, email, message]
  );
  res.json({ success: true });
});

app.get('/me', async (req, res) => {
  if (!req.session.userId) return res.json({});
  const [rows] = await pool.query('SELECT CONCAT(ad, " ", soyad) AS ad_soyad, rol FROM kullanicilar WHERE id = ?', [req.session.userId]);
  if (rows.length > 0) res.json(rows[0]);
  else res.json({});
});

app.get('/messages', async (req, res) => {
  // Sadece admin erişebilsin
  if (!req.session.userId) return res.status(401).json({ error: 'Yetkisiz' });
  const [userRows] = await pool.query('SELECT rol FROM kullanicilar WHERE id = ?', [req.session.userId]);
  if (!userRows.length || userRows[0].rol !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });

  const [messages] = await pool.query('SELECT * FROM mesajlar ORDER BY gonderim_tarihi DESC');
  res.json(messages);
});

// Kullanıcı gün bazlı program atamalarını kaydet (diyet/fitness)
app.post('/api/save-assignments', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Yetkisiz' });
  const { assignments, type } = req.body; // assignments: [program_id|null, ...], type: 'diyet' | 'fitness'
  if (!Array.isArray(assignments) || assignments.length !== 7 || !['diyet','fitness'].includes(type)) {
    return res.status(400).json({ error: 'Geçersiz veri' });
  }
  // Önce mevcut atamaları sil
  await pool.query('DELETE FROM kullanici_programlari WHERE kullanici_id = ? AND tur = ?', [req.session.userId, type]);
  // Sonra yeni atamaları ekle
  for (let i = 0; i < 7; i++) {
    if (assignments[i] !== null && assignments[i] !== undefined) {
      await pool.query(
        'INSERT INTO kullanici_programlari (kullanici_id, program_id, gun, tur, katilim_tarihi) VALUES (?, ?, ?, ?, NOW())',
        [req.session.userId,assignments[i] , i, type]
      );
    }
  }
  res.json({ success: true });
});

// Kullanıcıya atanmış programları getir (diyet/fitness)
app.get('/api/get-assignments', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Yetkisiz' });
  const { type } = req.query; // 'diyet' veya 'fitness'
  if (!['diyet','fitness'].includes(type)) return res.status(400).json({ error: 'Geçersiz tip' });
  const [rows] = await pool.query(
    'SELECT gun, program_id FROM kullanici_programlari WHERE kullanici_id = ? AND tur = ?',
    [req.session.userId, type]
  );
  // 7 elemanlı diziye çevir
  const result = Array(7).fill(null);
  rows.forEach(r => { if (r.gun >= 0 && r.gun < 7) result[r.gun] = r.program_id; });
  res.json({ assignments: result });
});

// Kullanıcıların haftalık diyet atamalarını admin için getir
app.get('/api/admin/diet-assignments', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Yetkisiz' });
  // Sadece admin erişebilsin
  const [userRows] = await pool.query('SELECT rol FROM kullanicilar WHERE id = ?', [req.session.userId]);
  if (!userRows.length || userRows[0].rol !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });

  // Tüm kullanıcılar ve haftalık diyet atamaları
  const [users] = await pool.query('SELECT id, CONCAT(ad, " ", soyad) AS ad_soyad FROM kullanicilar ORDER BY ad_soyad');
  const [assignments] = await pool.query(
    `SELECT k.kullanici_id, k.gun, p.baslik
     FROM kullanici_programlari k
     JOIN programlar p ON k.program_id = p.id
     WHERE k.tur = 'diyet'`
  );

  // Kullanıcı bazında günlere göre doldur
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = { ad_soyad: u.ad_soyad, days: Array(7).fill('') };
  });
  assignments.forEach(a => {
    if (userMap[a.kullanici_id] && a.gun >= 0 && a.gun < 7) {
      userMap[a.kullanici_id].days[a.gun] = a.baslik;
    }
  });
  res.json(Object.values(userMap));
});

// Kullanıcıların haftalık fitness atamalarını admin için getir
app.get('/api/admin/fitness-assignments', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Yetkisiz' });
  // Sadece admin erişebilsin
  const [userRows] = await pool.query('SELECT rol FROM kullanicilar WHERE id = ?', [req.session.userId]);
  if (!userRows.length || userRows[0].rol !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  // Tüm kullanıcılar ve haftalık fitness atamaları
  const [users] = await pool.query('SELECT id, CONCAT(ad, " ", soyad) AS ad_soyad FROM kullanicilar ORDER BY ad_soyad');
  const [assignments] = await pool.query(
    `SELECT k.kullanici_id, k.gun, p.baslik
     FROM kullanici_programlari k
     JOIN programlar p ON k.program_id+5 = p.id
     WHERE k.tur = 'fitness'`
  );
  // Kullanıcı bazında günlere göre doldur
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = { ad_soyad: u.ad_soyad, days: Array(7).fill('') };
  });
  assignments.forEach(a => {
    if (userMap[a.kullanici_id] && a.gun >= 0 && a.gun < 7) {
      userMap[a.kullanici_id].days[a.gun] = a.baslik;
    }
  });
  res.json(Object.values(userMap));
});

// Kullanıcı veya adminin profil bilgilerini döner
app.get('/api/userinfo', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Giriş gerekli' });
  const [rows] = await pool.query(
    'SELECT ad, soyad, eposta, rol, DATE_FORMAT(kayit_tarihi, "%d.%m.%Y") as kayit_tarihi FROM kullanicilar WHERE id = ?',
    [req.session.userId]
  );
  if (rows.length > 0) res.json(rows[0]);
  else res.status(404).json({ error: 'Kullanıcı bulunamadı' });
});

app.listen(3000, () => console.log('Sunucu calisiyor... http://localhost:3000'));