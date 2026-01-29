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

// ================= TRANG NGƯỜI CHƠI =================
app.get('/', (req, res) => {
  isLocked(locked => {
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Lộc Xuân May Mắn</title>
<style>
body{
  background:linear-gradient(135deg,#c62828,#f9a825);
  height:100vh;display:flex;align-items:center;justify-content:center;
  font-family:Arial
}
.box{
  background:#fff8e1;padding:32px;width:360px;
  border-radius:22px;border:4px solid #fbc02d;
  box-shadow:0 18px 40px rgba(0,0,0,.35)
}
h2{text-align:center;color:#c62828}
label{font-weight:bold;margin-top:14px;display:block}
input{
  width:100%;padding:10px;margin-top:6px;
  border-radius:8px;border:1px solid #ccc
}
button{
  width:100%;margin-top:20px;padding:12px;
  background:#d32f2f;color:#ffeb3b;
  border:none;border-radius:12px;font-size:16px
}
.lock{
  background:#ffebee;padding:14px;border-radius:12px;
  text-align:center;color:#b71c1c;margin-top:18px
}
.note{text-align:center;font-size:13px;margin-top:16px;color:#6d4c41}
</style>
</head>
<body>
<div class="box">
<h2>🧧 LỘC XUÂN MAY MẮN</h2>

${locked ? `
<div class="lock">
🔒 Đã khóa gửi số<br>
Vui lòng chờ BTC
</div>
` : `
<form method="POST" action="/submit">
<label>Tên của bạn</label>
<input name="name" required>

<label>Số bạn chọn (1–40)</label>
<input type="number" name="number" min="1" max="40" required>

<button>🎉 GỬI LỘC</button>
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
      () => res.redirect('/thanks')
    );
  });
});

// ================= THANK YOU =================
app.get('/thanks', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Cảm ơn</title>
<style>
body{
  background:linear-gradient(135deg,#c62828,#f9a825);
  height:100vh;display:flex;align-items:center;justify-content:center;
  font-family:Arial
}
.box{
  background:#fff8e1;padding:36px;width:380px;
  border-radius:22px;border:4px solid #fbc02d;
  text-align:center
}
h2{color:#c62828}
a{
  display:inline-block;margin-top:24px;
  padding:12px 20px;background:#d32f2f;
  color:#ffeb3b;text-decoration:none;border-radius:12px
}
</style>
</head>
<body>
<div class="box">
<h2>🎊 GỬI LỘC THÀNH CÔNG</h2>
<p>Cảm ơn bạn đã tham gia<br><b>Lộc Xuân May Mắn</b></p>
<p>Chúc bạn năm mới<br><b>An Khang – Thịnh Vượng</b> 🍀</p>
<a href="/">⬅ Quay lại</a>
</div>
</body>
</html>
`);
});

// ================= ADMIN LOGIN =================
app.get('/admin', (req, res) => {
  res.send(`
<form method="POST" action="/admin/login"
style="width:300px;margin:120px auto">
<h3>ADMIN</h3>
<input name="username" placeholder="User"><br><br>
<input type="password" name="password" placeholder="Pass"><br><br>
<button>Login</button>
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

  db.all(
    'SELECT * FROM submissions ORDER BY number ASC',
    (err, rows) => {
      let table = rows.map(r =>
        `<tr><td>${r.name}</td><td>${r.number}</td></tr>`
      ).join('');

      res.send(`
<h2>📊 BẢNG KẾT QUẢ</h2>
<table border="1" cellpadding="8">
<tr><th>Tên</th><th>Số</th></tr>
${table || '<tr><td colspan="2">Chưa có dữ liệu</td></tr>'}
</table>
<br>
<a href="/admin/reset">RESET</a>
`);
    }
  );
});

// ================= RESET =================
app.get('/admin/reset', (req, res) => {
  db.run('DELETE FROM submissions', () =>
    res.redirect('/admin/dashboard')
  );
});

// ================= START =================
app.listen(PORT, () => {
  console.log('🧧 Server chạy tại http://localhost:' + PORT);
});
