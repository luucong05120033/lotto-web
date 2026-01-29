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

// ================= DATABASE (Render OK) =================
const db = new sqlite3.Database('/tmp/data.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      number INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`INSERT OR IGNORE INTO settings VALUES ('lock','0')`);
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
  db.get("SELECT value FROM settings WHERE key='lock'", (e, r) => {
    cb(r && r.value === '1');
  });
}

// ================= CSS CHUNG =================
const baseCSS = `
<style>
body{
  margin:0;
  font-family:Arial;
  background:linear-gradient(135deg,#b71c1c,#f9a825);
  min-height:100vh;
}
.box{
  background:#fff8e1;
  max-width:420px;
  margin:60px auto;
  padding:35px;
  border-radius:22px;
  border:4px solid #fbc02d;
  box-shadow:0 18px 40px rgba(0,0,0,.35);
}
h1,h2{color:#c62828;text-align:center}
input,button{
  width:100%;
  padding:12px;
  margin-top:10px;
  border-radius:10px;
  border:1px solid #ccc;
}
button{
  background:#d32f2f;
  color:#ffeb3b;
  font-size:16px;
  cursor:pointer;
  border:none;
}
table{
  width:100%;
  border-collapse:collapse;
  margin-top:20px;
}
th,td{
  border:1px solid #fbc02d;
  padding:10px;
  text-align:center;
}
th{background:#ffe082}
a.btn{
  display:block;
  margin-top:20px;
  text-align:center;
  padding:12px;
  background:#d32f2f;
  color:#ffeb3b;
  text-decoration:none;
  border-radius:10px;
}
.lock{
  background:#ffebee;
  padding:18px;
  border-radius:12px;
  color:#b71c1c;
  font-weight:bold;
  text-align:center;
}
</style>
`;

// ================= TRANG NGƯỜI CHƠI =================
app.get('/', (req, res) => {
  isLocked(locked => {
    res.send(`
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Con Số May Mắn</title>
${baseCSS}
</head>
<body>
<div class="box">
<h1>🧧 CON SỐ MAY MẮN 🧧</h1>

${locked ? `
<div class="lock">
🔒 ĐÃ KHÓA GỬI SỐ<br><br>
Xin cảm ơn! 🙏<br>
Vui lòng chờ BTC công bố kết quả 🎊
</div>
` : `
<form method="POST" action="/submit">
<b>Tên của bạn</b>
<input name="name" required>

<b>Số bạn chọn (1–40)</b>
<input type="number" name="number" min="1" max="40" required>

<button>🎉 GỬI SỐ MAY MẮN</button>
</form>
`}

<p style="text-align:center;margin-top:15px">
🍀 Số <b>nhỏ nhất & duy nhất</b> sẽ trúng lộc 🍀
</p>
</div>
</body></html>
`);
  });
});

// ================= SUBMIT =================
app.post('/submit', (req, res) => {
  isLocked(locked => {
    if (locked) return res.redirect('/');
    const { name, number } = req.body;
    db.run(
      'INSERT INTO submissions (name, number) VALUES (?,?)',
      [name, number],
      () => res.redirect(`/thanks?name=${encodeURIComponent(name)}`)
    );
  });
});

// ================= THANK YOU =================
app.get('/thanks', (req, res) => {
  const name = req.query.name || 'Bạn';
  res.send(`
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Cảm ơn</title>
${baseCSS}
</head>
<body>
<div class="box">
<h2>🧧 Cảm ơn <br>
${name} đã gửi số con số may mắn 🧧</h2>

<p style="text-align:center">
🎁 Bao lì xì đã được gửi đi 🎁<br><br>
🌸 Chúc Bạn Năm Mới 🌸<br>
🌼🌺 An Khang – Thịnh Vượng – Cát Tường 🌺🌼
</p>

<a class="btn" href="/">⬅ Quay lại</a>
</div>
</body></html>
`);
});

// ================= ADMIN LOGIN =================
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Admin Login</title>
${baseCSS}
</head>
<body>
<div class="box">
<h2>🔐 ADMIN LOGIN</h2>
<form method="POST" action="/admin/login">
<input name="username" placeholder="Username">
<input type="password" name="password" placeholder="Password">
<button>Đăng nhập</button>
</form>
</div>
</body></html>
`);
});

app.post('/admin/login', (req, res) => {
  if (req.body.username === ADMIN_USER && req.body.password === ADMIN_PASS) {
    req.session.admin = true;
    res.redirect('/admin/dashboard');
  } else {
    res.send('Sai tài khoản');
  }
});

// ================= DASHBOARD =================
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');

  const q = req.query.q || '';
  db.all(
    `SELECT * FROM submissions WHERE name LIKE ? OR number LIKE ? ORDER BY number ASC`,
    [`%${q}%`, `%${q}%`],
    (e, rows) => {
      isLocked(locked => {
        res.send(`
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Bảng Kết Quả</title>
${baseCSS}
</head>
<body>
<div class="box">
<h2>📊 BẢNG KẾT QUẢ 🎊</h2>

<form>
<input name="q" placeholder="🔍 Lọc tên / số" value="${q}">
<button>Lọc</button>
</form>

<form method="POST" action="/admin/toggle-lock">
<button>${locked ? '🔓 MỞ GỬI SỐ' : '🔒 KHÓA GỬI SỐ'}</button>
</form>

<table>
<tr><th>Tên</th><th>Số</th></tr>
${rows.map(r => `<tr><td>${r.name}</td><td>${r.number}</td></tr>`).join('')}
</table>

<a class="btn" href="/admin/reset">🗑 RESET</a>
</div>
</body></html>
`);
      });
    }
  );
});

// ================= LOCK & RESET =================
app.post('/admin/toggle-lock', (req, res) => {
  db.get("SELECT value FROM settings WHERE key='lock'", (e, r) => {
    const v = r.value === '1' ? '0' : '1';
    db.run("UPDATE settings SET value=?", [v], () =>
      res.redirect('/admin/dashboard')
    );
  });
});

app.get('/admin/reset', (req, res) => {
  if (!req.session.admin) return res.redirect('/admin');
  db.run('DELETE FROM submissions', () =>
    res.redirect('/admin/dashboard')
  );
});

// ================= START =================
app.listen(PORT, () => {
  console.log('🧧 Server chạy tại port ' + PORT);
});
