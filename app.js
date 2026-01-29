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
const db = new sqlite3.Database('./data.db');
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
app.use(session({
  secret: 'tet-lotto',
  resave: false,
  saveUninitialized: true
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
  box-shadow: 0 12px 30px rgba(0,0,0,0.3);
  border: 4px solid #fbc02d;
}
h2 {
  text-align: center;
  color: #c62828;
}
label {
  font-weight: bold;
  margin-top: 10px;
  display: block;
}
input {
  width: 100%;
  padding: 10px;
  margin-top: 6px;
  border-radius: 6px;
  border: 1px solid #ccc;
}
button {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background: #d32f2f;
  color: #ffeb3b;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}
.note {
  margin-top: 15px;
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
    () => {
      res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Nhận Lộc</title>
<style>
body {
  margin: 0;
  background: linear-gradient(135deg, #f9a825, #c62828);
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: Arial;
}
.box {
  background: #fff8e1;
  padding: 35px;
  width: 360px;
  border-radius: 16px;
  text-align: center;
  border: 4px solid #fbc02d;
}
.number {
  font-size: 42px;
  color: #d32f2f;
  margin: 15px 0;
}
a {
  display: inline-block;
  margin-top: 20px;
  background: #c62828;
  color: #ffeb3b;
  padding: 10px 22px;
  border-radius: 8px;
  text-decoration: none;
}
</style>
</head>
<body>
<div class="box">
  <h2>🎊 CHÚC MỪNG!</h2>
  <p><b>${name}</b> đã gửi lộc</p>
  <div class="number">${number}</div>
  <p>Chúc năm mới phát tài 🎆</p>
  <a href="/">⬅ Quay lại</a>
</div>
</body>
</html>
      `);
    }
  );
});

// ================= ADMIN LOGIN =================
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Admin Login</title>
<style>
body {
  background: #c62828;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: Arial;
}
.box {
  background: #fff8e1;
  padding: 30px;
  border-radius: 14px;
  width: 320px;
}
h2 {
  text-align: center;
  color: #c62828;
}
input, button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
}
button {
  background: #d32f2f;
  color: #ffeb3b;
  border: none;
  border-radius: 6px;
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

  const q = req.query.q || '';

  db.all(
    'SELECT * FROM submissions WHERE name LIKE ? OR number LIKE ? ORDER BY number ASC',
    [`%${q}%`, `%${q}%`],
    (err, rows) => {
      let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Dashboard</title>
<style>
body {
  font-family: Arial;
  background: #fff8e1;
  padding: 30px;
}
h2 {
  color: #c62828;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
input {
  padding: 8px;
}
button {
  padding: 8px 14px;
  background: #d32f2f;
  color: #ffeb3b;
  border: none;
  border-radius: 6px;
}
table {
  margin-top: 15px;
  width: 100%;
  border-collapse: collapse;
  background: white;
}
th {
  background: #c62828;
  color: #ffeb3b;
}
th, td {
  padding: 10px;
  text-align: center;
  border-bottom: 1px solid #ddd;
}
</style>
</head>
<body>

<h2>📊 TỔNG HỢP LỘC XUÂN</h2>

<div class="top">
  <form method="GET">
    <input name="q" placeholder="Lọc tên hoặc số" value="${q}">
    <button>Lọc</button>
  </form>

  <form method="POST" action="/admin/reset"
    onsubmit="return confirm('XÓA TOÀN BỘ DỮ LIỆU?');">
    <button>🗑 RESET</button>
  </form>
</div>

<table>
<tr>
  <th>ID</th>
  <th>Tên</th>
  <th>Số</th>
  <th>Thời gian</th>
</tr>
`;

      rows.forEach(r => {
        html += `
<tr>
  <td>${r.id}</td>
  <td>${r.name}</td>
  <td>${r.number}</td>
  <td>${r.created_at}</td>
</tr>
`;
      });

      html += `
</table>
</body>
</html>
`;
      res.send(html);
    }
  );
});

// ================= RESET =================
app.post('/admin/reset', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  db.run('DELETE FROM submissions', () => {
    res.redirect('/admin/dashboard');
  });
});

// ================= START =================
app.listen(PORT, () => {
  console.log('🧧 Server chạy tại http://localhost:' + PORT);
});
