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
  res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Lộc Xuân May Mắn</title>
<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #c62828, #f9a825);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.box {
  background: #fff8e1;
  padding: 32px;
  width: 360px;
  border-radius: 18px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.35);
  border: 4px solid #fbc02d;
}
h2 {
  text-align: center;
  color: #c62828;
  margin-bottom: 20px;
}
label {
  font-weight: bold;
  margin-top: 12px;
  display: block;
}
input {
  width: 100%;
  padding: 10px;
  margin-top: 6px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 15px;
}
button {
  margin-top: 22px;
  width: 100%;
  padding: 12px;
  background: #d32f2f;
  color: #ffeb3b;
  border: none;
  border-radius: 10px;
  font-size: 17px;
  cursor: pointer;
}
button:hover {
  background: #b71c1c;
}
.note {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
  color: #6d4c41;
}
</style>
</head>
<body>
<div class="box">
  <h2>🧧 LỘC XUÂN MAY MẮN</h2>
  <form method="POST" action="/submit">
    <label>Tên của bạn</label>
    <input name="name" required>

    <label>Số bạn chọn (1–40)</label>
    <input type="number" name="number" min="1" max="40" required>

    <button>🎉 GỬI LỘC</button>
  </form>
  <div class="note">
    Số nhỏ nhất & duy nhất sẽ nhận lộc đầu năm 🍀
  </div>
</div>
</body>
</html>
`);
});

// ================= SUBMIT =================
app.post('/submit', (req, res) => {
  const { name, number } = req.body;
  db.run(
    'INSERT INTO submissions (name, number) VALUES (?, ?)',
    [name, number],
    () => res.redirect('/')
  );
});

// ================= ADMIN LOGIN =================
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Admin</title>
<style>
body {
  background: linear-gradient(135deg, #8e0000, #ffb300);
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: Arial;
}
.box {
  background: #fff8e1;
  padding: 30px;
  border-radius: 16px;
  width: 320px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}
h2 {
  text-align: center;
  color: #c62828;
}
input, button {
  width: 100%;
  padding: 10px;
  margin-top: 12px;
}
button {
  background: #d32f2f;
  color: #ffeb3b;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
</head>
<body>
<div class="box">
  <h2>🔐 ADMIN</h2>
  <form method="POST" action="/admin/login">
    <input name="username" placeholder="Tài khoản">
    <input type="password" name="password" placeholder="Mật khẩu">
    <button>Đăng nhập</button>
  </form>
</div>
</body>
</html>
`);
});

// ================= ADMIN LOGIN HANDLE =================
app.post('/admin/login', (req, res) => {
  if (req.body.username === ADMIN_USER && req.body.password === ADMIN_PASS) {
    req.session.admin = true;
    res.redirect('/admin/dashboard');
  } else {
    res.send('❌ Sai tài khoản');
  }
});

// ================= ADMIN DASHBOARD =================
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');

  db.all('SELECT * FROM submissions ORDER BY number ASC', (err, rows) => {
    let tableRows = rows.map(r =>
      `<tr><td>${r.name}</td><td>${r.number}</td></tr>`
    ).join('');

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Dashboard</title>
<style>
body {
  font-family: Arial;
  background: #fff3e0;
  padding: 30px;
}
h2 {
  color: #c62828;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 20px;
}
th, td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: center;
}
th {
  background: #fbc02d;
}
a {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 16px;
  background: #d32f2f;
  color: #ffeb3b;
  text-decoration: none;
  border-radius: 8px;
}
</style>
</head>
<body>
<h2>📊 TỔNG HỢP LỘC XUÂN</h2>
<table>
<tr><th>Tên</th><th>Số</th></tr>
${tableRows}
</table>
<a href="/admin/reset">🔄 RESET</a>
</body>
</html>
`);
  });
});

// ================= RESET =================
app.get('/admin/reset', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  db.run('DELETE FROM submissions', () => {
    res.redirect('/admin/dashboard');
  });
});

// ================= START =================
app.listen(PORT, () => {
  console.log('🧧 Server running on port ' + PORT);
});
