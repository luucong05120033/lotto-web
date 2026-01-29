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
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Segoe UI', Arial, sans-serif;
  background: radial-gradient(circle at top, #ffeb3b, #c62828);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.box {
  background: linear-gradient(180deg, #fffde7, #fff8e1);
  padding: 34px;
  width: 380px;
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(0,0,0,0.4);
  border: 4px solid #fbc02d;
  position: relative;
}

.box::before {
  content: "🧧";
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 38px;
  background: #c62828;
  padding: 6px 14px;
  border-radius: 50%;
  border: 3px solid #fbc02d;
}

h2 {
  text-align: center;
  color: #b71c1c;
  margin-bottom: 22px;
  letter-spacing: 1px;
}

label {
  font-weight: 600;
  margin-top: 14px;
  display: block;
  color: #5d4037;
}

input {
  width: 100%;
  padding: 12px;
  margin-top: 6px;
  border-radius: 10px;
  border: 1px solid #ccc;
  font-size: 15px;
}

button {
  margin-top: 24px;
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #d32f2f, #b71c1c);
  color: #ffeb3b;
  border: none;
  border-radius: 14px;
  font-size: 17px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(0,0,0,0.25);
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0,0,0,0.35);
}

.note {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: #6d4c41;
}
</style>
</head>
<body>
<div class="box">
  <h2>LỘC XUÂN MAY MẮN</h2>
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
  background: linear-gradient(135deg, #b71c1c, #ffca28);
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Segoe UI', Arial;
}

.box {
  background: #fffde7;
  padding: 32px;
  border-radius: 18px;
  width: 340px;
  box-shadow: 0 14px 36px rgba(0,0,0,.4);
  border: 3px solid #fbc02d;
}

h2 {
  text-align: center;
  color: #b71c1c;
  margin-bottom: 18px;
}

input {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border-radius: 10px;
  border: 1px solid #ccc;
}

button {
  width: 100%;
  padding: 14px;
  margin-top: 18px;
  background: #d32f2f;
  color: #ffeb3b;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
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
  font-family: 'Segoe UI', Arial;
  background: linear-gradient(180deg, #fff3e0, #ffe0b2);
  padding: 30px;
}

h2 {
  color: #b71c1c;
  text-align: center;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 24px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
}

th, td {
  padding: 12px;
  text-align: center;
}

th {
  background: #fbc02d;
}

tr:nth-child(even) {
  background: #fffde7;
}

a {
  display: inline-block;
  margin-top: 24px;
  padding: 12px 18px;
  background: #d32f2f;
  color: #ffeb3b;
  text-decoration: none;
  border-radius: 10px;
  font-weight: bold;
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
