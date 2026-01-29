// ================= IMPORT =================
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// ================= ADMIN =================
const ADMIN_USER = 'admin';
const ADMIN_PASS = '123456';

// ================= TRẠNG THÁI GAME =================
let IS_LOCKED = false;

// ================= DATABASE =================
const db = new sqlite3.Database('/tmp/data.db');

db.run(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ================= MIDDLEWARE =================
app.use(bodyParser.urlencoded({ extended: true }));
app.set('trust proxy', 1);

app.use(session({
  secret: 'tet-lotto',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// ================= TRANG NGƯỜI CHƠI =================
app.get('/', (req, res) => {

  if (IS_LOCKED) {
    return res.send(`
    <html><body style="background:#c62828;color:#ffeb3b;
      display:flex;justify-content:center;align-items:center;height:100vh;
      font-family:Arial;text-align:center;">
      <div>
        <h1>⛔ LƯỢT CHƠI ĐÃ KHÓA</h1>
        <p>BTC đang tổng hợp kết quả<br>Vui lòng chờ công bố 🎉</p>
      </div>
    </body></html>
    `);
  }

  res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Lộc Xuân May Mắn</title>
<style>
body {
  margin: 0;
  font-family: Arial;
  background: linear-gradient(135deg, #c62828, #f9a825);
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.box {
  background: #fff8e1;
  padding: 30px;
  width: 360px;
  border-radius: 16px;
  border: 4px solid #fbc02d;
}
button {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background: #d32f2f;
  color: #ffeb3b;
  border: none;
  border-radius: 8px;
}
</style>
</head>
<body>
<div class="box">
  <h2>🧧 LỘC XUÂN MAY MẮN</h2>
  <form method="POST" action="/submit">
    <input name="name" placeholder="Tên bạn" required>
    <input type="number" name="number" min="1" max="40" placeholder="Số bạn chọn" required>
    <button>🎉 GỬI LỘC</button>
  </form>
</div>
</body>
</html>
`);
});

// ================= SUBMIT =================
app.post('/submit', (req, res) => {
  if (IS_LOCKED) return res.redirect('/');
  const { name, number } = req.body;
  db.run(
    'INSERT INTO submissions (name, number) VALUES (?, ?)',
    [name, number],
    () => res.redirect('/')
  );
});

// ================= ADMIN =================
app.get('/admin', (req, res) => {
  res.send(`
  <form method="POST" action="/admin/login"
   style="height:100vh;display:flex;justify-content:center;align-items:center;">
    <div>
      <h2>ADMIN LOGIN</h2>
      <input name="username" placeholder="user"><br>
      <input type="password" name="password" placeholder="pass"><br>
      <button>Login</button>
    </div>
  </form>
  `);
});

app.post('/admin/login', (req, res) => {
  if (req.body.username === ADMIN_USER && req.body.password === ADMIN_PASS) {
    req.session.admin = true;
    res.redirect('/admin/dashboard');
  } else res.send('Sai tài khoản');
});

// ================= DASHBOARD =================
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  const q = req.query.q || '';

  db.all(
    'SELECT * FROM submissions WHERE name LIKE ? OR number LIKE ? ORDER BY number ASC',
    [`%${q}%`, `%${q}%`],
    (err, rows) => {

      let html = `
      <h2>📊 DASHBOARD</h2>
      <p>Trạng thái: ${IS_LOCKED ? '🔒 ĐÃ KHÓA' : '🟢 ĐANG MỞ'}</p>

      <form method="GET">
        <input name="q" value="${q}" placeholder="Lọc tên hoặc số">
        <button>Lọc</button>
      </form>

      <form method="POST" action="/admin/toggle">
        <button>${IS_LOCKED ? 'MỞ LẠI' : 'KHÓA KẾT QUẢ'}</button>
      </form>

      <form method="POST" action="/admin/reset"
        onsubmit="return confirm('XÓA HẾT DỮ LIỆU?')">
        <button>RESET</button>
      </form>

      <table border="1" cellpadding="6">
      `;

      rows.forEach(r => {
        html += `<tr><td>${r.name}</td><td>${r.number}</td></tr>`;
      });

      html += '</table>';
      res.send(html);
    }
  );
});

// ================= TOGGLE LOCK =================
app.post('/admin/toggle', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  IS_LOCKED = !IS_LOCKED;
  res.redirect('/admin/dashboard');
});

// ================= RESET =================
app.post('/admin/reset', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  db.run('DELETE FROM submissions', () => res.redirect('/admin/dashboard'));
});

// ================= START =================
app.listen(PORT, () => {
  console.log('🧧 Server running on port ' + PORT);
});
