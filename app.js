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

// ================= DATABASE =================
const db = new sqlite3.Database('/tmp/data.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO settings (key, value)
    VALUES ('lock', '0')
  `);
});

// ================= MIDDLEWARE =================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'tet-lucky',
  resave: false,
  saveUninitialized: true
}));

// ================= HELPER =================
function isLocked(cb) {
  db.get(
    "SELECT value FROM settings WHERE key='lock'",
    (err, row) => cb(row && row.value === '1')
  );
}

// ================= TRANG NGƯỜI CHƠI =================
app.get('/', (req, res) => {
  isLocked(locked => {
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Con Số May Mắn</title>
<style>
body{
  margin:0;
  font-family:Arial;
  background:linear-gradient(135deg,#b71c1c,#f9a825);
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
}
.box{
  background:#fff8e1;
  width:380px;
  padding:35px;
  border-radius:22px;
  border:4px solid #fbc02d;
  box-shadow:0 18px 40px rgba(0,0,0,.35);
  text-align:center;
}
h2{color:#c62828;margin-bottom:20px}
label{display:block;text-align:left;font-weight:bold;margin-top:14px}
input{
  width:100%;
  padding:11px;
  margin-top:6px;
  border-radius:8px;
  border:1px solid #ccc;
}
button{
  margin-top:22px;
  width:100%;
  padding:14px;
  background:#d32f2f;
  color:#ffeb3b;
  border:none;
  border-radius:14px;
  font-size:17px;
  cursor:pointer;
}
.lock{
  background:#ffebee;
  padding:16px;
  border-radius:12px;
  color:#b71c1c;
  font-weight:bold;
}
.note{margin-top:18px;font-size:13px;color:#5d4037}
</style>
</head>
<body>
<div class="box">
<h2>🧧 CON SỐ MAY MẮN 🧧</h2>

${locked ? `
<div class="lock">
🔒 ĐÃ KHÓA GỬI SỐ<br><br>
Xin cảm ơn! 🙏<br>
Vui lòng chờ BTC công bố kết quả 🎊
</div>
` : `
<form method="POST" action="/submit">
<label>Tên của bạn</label>
<input name="name" required>

<label>Số bạn chọn (1 – 40)</label>
<input type="number" name="number" min="1" max="40" required>

<button>🎉 GỬI CON SỐ MAY MẮN</button>
</form>
`}

<div class="note">
Số <b>nhỏ nhất & duy nhất</b> sẽ nhận lộc 🍀
</div>
</div>
</body>
</html>
`);
  });
});

// ================= SUBMIT =================
app.post('/submit', (req, res) => {
  isLocked(locked => {
    if (locked) return res.redirect('/');
    const { name, number } = req.body;
    db.run(
      'INSERT INTO submissions (name, number) VALUES (?, ?)',
      [name, number],
      () => res.redirect(`/thanks?name=${encodeURIComponent(name)}`)
    );
  });
});

// ================= THANK YOU =================
app.get('/thanks', (req, res) => {
  const name = req.query.name || 'Bạn';
  res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Cảm ơn</title>
<style>
body{
  margin:0;
  font-family:Arial;
  background:linear-gradient(135deg,#b71c1c,#f9a825);
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
}
.box{
  background:#fff8e1;
  width:420px;
  padding:40px;
  border-radius:22px;
  border:4px solid #fbc02d;
  text-align:center;
  box-shadow:0 18px 40px rgba(0,0,0,.35);
}
h2{color:#c62828}
a{
  display:inline-block;
  margin-top:26px;
  padding:14px 24px;
  background:#d32f2f;
  color:#ffeb3b;
  text-decoration:none;
  border-radius:14px;
}
</style>
</head>
<body>
<div class="box">
<h2>🧧 Cảm ơn ${name} đã gửi số 🧧</h2>

<p>(🎁 Bao lì xì 🎁)</p>

<p>
🌸 Chúc Bạn Năm Mới 🌸<br>
(🌼🌺)<br>
<b>An Khang – Thịnh Vượng – Cát Tường</b><br>
(🌺🌼)
</p>

<a href="/">⬅ Quay lại màn hình chính</a>
</div>
</body>
</html>
`);
});

// ================= ADMIN LOGIN (TRANG TRÍ) =================
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Admin Login</title>
<style>
body{
  margin:0;
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  font-family:Arial;
  background:linear-gradient(135deg,#8e0000,#ffb300);
}
.box{
  background:#fff8e1;
  padding:40px;
  width:320px;
  border-radius:20px;
  border:4px solid #fbc02d;
  box-shadow:0 18px 40px rgba(0,0,0,.35);
  text-align:center;
}
h3{color:#c62828;margin-bottom:20px}
input{
  width:100%;
  padding:12px;
  margin-top:12px;
  border-radius:10px;
  border:1px solid #ccc;
}
button{
  width:100%;
  margin-top:20px;
  padding:14px;
  border:none;
  border-radius:14px;
  background:#d32f2f;
  color:#ffeb3b;
  font-size:16px;
  cursor:pointer;
}
</style>
</head>
<body>

<div class="box">
<h3>🔐 ADMIN LOGIN</h3>
<form method="POST" action="/admin/login">
<input name="username" placeholder="Username" required>
<input type="password" name="password" placeholder="Password" required>
<button>Đăng nhập</button>
</form>
</div>

</body>
</html>
`);
});
// ================= DASHBOARD (TRANG TRÍ CHUẨN) =================
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  const q = req.query.q || '';

  db.all(
    `SELECT * FROM submissions
     WHERE name LIKE ? OR number LIKE ?
     ORDER BY number ASC`,
    [`%${q}%`, `%${q}%`],
    (err, rows) => {
      isLocked(locked => {
        res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Bảng Kết Quả</title>
<style>
body{
  font-family:Arial;
  background:linear-gradient(135deg,#8e0000,#ffb300);
  padding:40px;
}
.box{
  background:#fff8e1;
  border-radius:22px;
  padding:30px;
  border:4px solid #fbc02d;
  box-shadow:0 18px 40px rgba(0,0,0,.35);
}
h2{text-align:center;color:#c62828}
table{
  width:100%;
  border-collapse:collapse;
  margin-top:20px;
}
th,td{
  border:1px solid #fbc02d;
  padding:12px;
  text-align:center;
}
th{background:#ffe082}
form{text-align:center;margin-top:15px}
input{
  padding:8px;
  border-radius:8px;
  border:1px solid #ccc;
}
button{
  padding:10px 18px;
  border:none;
  border-radius:10px;
  background:#d32f2f;
  color:#ffeb3b;
  cursor:pointer;
}
.actions{
  text-align:center;
  margin-top:20px;
}
.actions a{
  color:#c62828;
  font-weight:bold;
  text-decoration:none;
}
</style>
</head>
<body>

<div class="box">
<h2>📊 BẢNG KẾT QUẢ – CON SỐ MAY MẮN 🎊</h2>

<form>
<input name="q" value="${q}" placeholder="🔍 Lọc tên hoặc số">
<button>Lọc</button>
</form>

<form method="POST" action="/admin/toggle-lock">
<button>${locked ? '🔓 MỞ GỬI SỐ' : '🔒 KHÓA GỬI SỐ'}</button>
</form>

<table>
<tr><th>Tên</th><th>Số</th></tr>
${rows.map(r => `<tr><td>${r.name}</td><td>${r.number}</td></tr>`).join('')}
</table>

<div class="actions">
<a href="/admin/reset">🗑 RESET DỮ LIỆU</a>
</div>
</div>

</body>
</html>
`);
      });
    }
  );
});

// ================= START =================
app.listen(PORT, () => {
  console.log('🧧 Server chạy tại http://localhost:' + PORT);
});
