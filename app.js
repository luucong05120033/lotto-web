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
    INSERT OR IGNORE INTO settings (key,value)
    VALUES ('lock','0')
  `);
});

// ================= MIDDLEWARE =================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'tet-lotto',
  resave: false,
  saveUninitialized: true
}));

// ================= HELPER =================
function isLocked(cb) {
  db.get(
    "SELECT value FROM settings WHERE key='lock'",
    (err, row) => cb(row?.value === '1')
  );
}

// ================= USER PAGE =================
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
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  background:linear-gradient(135deg,#b71c1c,#fbc02d);
  font-family:Arial;
}
.card{
  width:360px;
  background:#fff8e1;
  border-radius:22px;
  padding:30px;
  border:4px solid #fbc02d;
  box-shadow:0 20px 45px rgba(0,0,0,.35);
  text-align:center;
}
h2{color:#c62828}
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
  font-size:16px;
  border:none;
}
.lock{
  color:#b71c1c;
  font-weight:bold;
}
</style>
</head>
<body>

<div class="card">
<h2>🧧 LÔ TÔ MAY MẮN</h2>
<p>Nhập tên & số của bạn</p>

${locked ? `
<p class="lock">🔒 ĐÃ KHÓA GỬI SỐ</p>
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
      "INSERT INTO submissions (name, number) VALUES (?,?)",
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
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  background:linear-gradient(135deg,#c62828,#fbc02d);
  font-family:Arial;
}
.box{
  background:white;
  padding:40px;
  border-radius:22px;
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
<p>🧧 Chúc bạn năm mới<br>AN KHANG – MAY MẮN – PHÁT TÀI 🧧</p>
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
  margin:0;
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  background:linear-gradient(135deg,#880e4f,#fbc02d);
  font-family:Arial;
}
.card{
  width:320px;
  background:#fff8e1;
  border-radius:22px;
  padding:30px;
  border:4px solid #fbc02d;
  box-shadow:0 18px 40px rgba(0,0,0,.4);
}
h2{text-align:center;color:#c62828}
input,button{
  width:100%;
  padding:12px;
  margin-top:12px;
  border-radius:10px;
  border:1px solid #ccc;
}
button{
  background:#c62828;
  color:#ffeb3b;
  border:none;
}
</style>
</head>
<body>

<div class="card">
<h2>🔐 ADMIN</h2>
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
        const list = rows.map(r => `
<tr>
<td>${r.name}</td>
<td><b>${r.number}</b></td>
</tr>`).join('');

        res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Dashboard</title>
<style>
body{
  font-family:Arial;
  background:#f3f3f3;
  padding:30px;
}
.panel{
  max-width:750px;
  margin:auto;
  background:white;
  padding:25px;
  border-radius:22px;
  box-shadow:0 18px 40px rgba(0,0,0,.3);
}
h2{text-align:center;color:#c62828}
.controls{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:20px;
}
input{
  padding:10px;
  border-radius:8px;
  border:1px solid #ccc;
}
button,a{
  padding:10px 14px;
  border-radius:8px;
  border:none;
  background:#c62828;
  color:white;
  text-decoration:none;
}
.lock{background:${locked ? '#2e7d32' : '#b71c1c'}}
.reset{background:#6d4c41}
table{
  width:100%;
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

<div class="panel">
<h2>📊 BẢNG KẾT QUẢ</h2>

<div class="controls">
<form>
<input name="q" placeholder="Lọc tên / số" value="${q}">
<button>🔍 Lọc</button>
</form>

<form method="POST" action="/admin/toggle-lock">
<button class="lock">
${locked ? '🔓 MỞ GỬI SỐ' : '🔒 KHÓA GỬI SỐ'}
</button>
</form>

<a class="reset" href="/admin/reset">♻ RESET</a>
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
  console.log('🧧 Server chạy tại http://localhost:' + PORT);
});
