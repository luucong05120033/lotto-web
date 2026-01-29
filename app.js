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
app.set('trust proxy', 1);

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
label{
  display:block;
  text-align:left;
  font-weight:bold;
  margin-top:14px;
}
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
.note{
  margin-top:18px;
  font-size:13px;
  color:#5d4037;
}
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
  width:400px;
  padding:38px;
  border-radius:22px;
  border:4px solid #fbc02d;
  text-align:center;
  box-shadow:0 18px 40px rgba(0,0,0,.35);
}
h2{color:#c62828}
p{
  margin-top:14px;
  font-size:16px;
  color:#5d4037;
}
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
<h2>🧧 CẢM ƠN ${name}! 🧧</h2>

<p>🎁 Bao lì xì đã được gửi 🎁</p>

<p>
🌸 Chúc Bạn Năm Mới 🌸<br>
<b>An Khang – Thịnh Vượng – Cát Tường</b><br>
🌼🌺
</p>

<a href="/">⬅ Quay lại màn hình chính</a>
</div>
</body>
</html>
`);
});

// ================= ADMIN LOGIN (GIỮ NGUYÊN) =================
app.get('/admin', (req, res) => {
  res.send(`
<form method="POST" action="/admin/login" style="width:300px;margin:120px auto">
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

// ================= DASHBOARD (GIỮ NGUYÊN LOGIC) =================
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
        let html = `
<h2>📊 BẢNG KẾT QUẢ</h2>

<form>
<input name="q" value="${q}" placeholder="Lọc tên / số">
<button>Lọc</button>
</form><br>

<form method="POST" action="/admin/toggle-lock">
<button>${locked ? '🔓 MỞ GỬI SỐ' : '🔒 KHÓA GỬI SỐ'}</button>
</form>

<table border="1" cellpadding="6">
<tr><th>Tên</th><th>Số</th></tr>
`;
        rows.forEach(r => {
          html += `<tr><td>${r.name}</td><td>${r.number}</td></tr>`;
        });
        html += `
</table><br>
<a href="/admin/reset">🗑 RESET</a>
`;
        res.send(html);
      });
    }
  );
});

// ================= LOCK =================
app.post('/admin/toggle-lock', (req, res) => {
  db.get(
    "SELECT value FROM settings WHERE key='lock'",
    (err, row) => {
      const newVal = row.value === '1' ? '0' : '1';
      db.run(
        "UPDATE settings SET value=? WHERE key='lock'",
        [newVal],
        () => res.redirect('/admin/dashboard')
      );
    }
  );
});

// ================= RESET =================
app.get('/admin/reset', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  db.run('DELETE FROM submissions', () =>
    res.redirect('/admin/dashboard')
  );
});

// ================= START =================
app.listen(PORT, () => {
  console.log('🧧 Server chạy tại http://localhost:' + PORT);
});
