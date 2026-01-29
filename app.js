// ================= IMPORT =================
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// ================= ADMIN ACCOUNT =================
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
app.set('trust proxy', 1);

app.use(session({
  secret: 'tet-lotto',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// ================= HELPER =================
function isLocked(cb) {
  db.get(
    "SELECT value FROM settings WHERE key='lock'",
    (err, row) => cb(row?.value === '1')
  );
}

// ================= USER FORM =================
app.get('/', (req, res) => {
  isLocked(locked => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Lô Tô May Mắn</title>
<style>
body{
  margin:0;
  font-family:Arial;
  background:linear-gradient(135deg,#c62828,#f9a825);
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
}
.box{
  background:#fff8e1;
  padding:30px;
  width:360px;
  border-radius:20px;
  border:4px solid #fbc02d;
  box-shadow:0 15px 40px rgba(0,0,0,.35);
  text-align:center;
}
h2{color:#c62828;margin-bottom:10px}
input,button{
  width:100%;
  padding:12px;
  margin-top:12px;
  border-radius:10px;
  border:1px solid #ccc;
  font-size:16px;
}
button{
  background:#d32f2f;
  color:#ffeb3b;
  border:none;
  cursor:pointer;
}
.lock{
  color:red;
  font-weight:bold;
}
</style>
</head>
<body>

<div class="box">
<h2>🧧 LÔ TÔ MAY MẮN</h2>
<p>Nhập tên & con số may mắn của bạn</p>

${locked ? `
<p class="lock">⛔ Đã khóa gửi số</p>
` : `
<form method="POST" action="/submit">
<input name="name" placeholder="Tên của bạn" required>
<input name="number" type="number" min="1" max="40" placeholder="Số may mắn (1–40)" required>
<button>🎉 GỬI SỐ</button>
</form>
`}

</div>
</body>
</html>
`);
  });
});

// ================= SUBMIT =================
app.post('/submit', (req, res) => {
  const { name, number } = req.body;

  isLocked(locked => {
    if (locked) {
      return res.send('<h2 style="text-align:center;color:red">Đã khóa gửi số</h2>');
    }

    db.run(
      "INSERT INTO submissions (name, number) VALUES (?, ?)",
      [name, number],
      () => {
        res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Cảm ơn</title>
<style>
body{
  background:linear-gradient(135deg,#d32f2f,#fbc02d);
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family:Arial;
}
.box{
  background:white;
  padding:40px;
  border-radius:20px;
  text-align:center;
  box-shadow:0 20px 40px rgba(0,0,0,.35);
}
h2{color:#c62828}
</style>
</head>
<body>

<div class="box">
<h2>🎉 CẢM ƠN BẠN!</h2>
<p><b>${name}</b> đã gửi số <b>${number}</b></p>
<p>🧧 Chúc bạn năm mới<br>SỨC KHỎE – MAY MẮN – PHÁT TÀI 🧧</p>
</div>

</body>
</html>
`);
      }
    );
  });
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
body{
  background:linear-gradient(135deg,#c62828,#f9a825);
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family:Arial;
}
.box{
  background:#fff8e1;
  padding:30px;
  width:320px;
  border-radius:20px;
  border:4px solid #fbc02d;
}
input,button{
  width:100%;
  padding:12px;
  margin-top:12px;
  border-radius:10px;
  border:1px solid #ccc;
}
button{
  background:#d32f2f;
  color:#ffeb3b;
  border:none;
}
</style>
</head>
<body>
<div class="box">
<h2 style="text-align:center;color:#c62828">🔐 ADMIN</h2>
<form method="POST" action="/admin/login">
<input name="username" placeholder="Tài khoản" required>
<input type="password" name="password" placeholder="Mật khẩu" required>
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
    res.send('<h3 style="text-align:center;color:red">Sai tài khoản</h3>');
  }
});

// ================= DASHBOARD =================
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
        let list = rows.map(r => `
<tr>
<td>${r.name}</td>
<td><b>${r.number}</b></td>
</tr>
`).join('');

        res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Dashboard</title>
<style>
body{font-family:Arial;background:#f5f5f5;padding:30px}
.box{
  background:white;
  max-width:700px;
  margin:auto;
  padding:25px;
  border-radius:18px;
  box-shadow:0 15px 40px rgba(0,0,0,.25);
}
.controls{display:flex;gap:10px;flex-wrap:wrap}
input{padding:10px;border-radius:8px;border:1px solid #ccc}
button,a{
  padding:10px 14px;
  border-radius:8px;
  border:none;
  color:white;
  background:#d32f2f;
  text-decoration:none;
}
.lock{background:${locked ? '#388e3c' : '#b71c1c'}}
.reset{background:#6d4c41}
table{
  width:100%;
  margin-top:15px;
  border-collapse:collapse;
}
th,td{
  border:1px solid #ddd;
  padding:10px;
  text-align:center;
}
th{background:#fbc02d}
</style>
</head>
<body>

<div class="box">
<h2 style="text-align:center;color:#c62828">📊 KẾT QUẢ</h2>

<div class="controls">
<form>
<input name="q" placeholder="Lọc tên / số" value="${q}">
<button>Lọc</button>
</form>

<form method="POST" action="/admin/toggle-lock">
<button class="lock">${locked ? '🔓 MỞ GỬI SỐ' : '🔒 KHÓA GỬI SỐ'}</button>
</form>

<a class="reset" href="/admin/reset">🗑 RESET</a>
</div>

<table>
<tr><th>Tên</th><th>Số</th></tr>
${list || '<tr><td colspan="2">Chưa có dữ liệu</td></tr>'}
</table>

</div>
</body>
</html>
`);
      });
    }
  );
});

// ================= TOGGLE LOCK =================
app.post('/admin/toggle-lock', (req, res) => {
  db.get("SELECT value FROM settings WHERE key='lock'", (e, r) => {
    const v = r.value === '1' ? '0' : '1';
    db.run("UPDATE settings SET value=? WHERE key='lock'", [v], () =>
      res.redirect('/admin/dashboard')
    );
  });
});

// ================= RESET =================
app.get('/admin/reset', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  db.run("DELETE FROM submissions", () =>
    res.redirect('/admin/dashboard')
  );
});

// ================= START =================
app.listen(PORT, () => {
  console.log('🧧 Server chạy tại port ' + PORT);
});
