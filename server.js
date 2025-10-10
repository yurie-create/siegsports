// server.js（PostgreSQL対応版）
console.log("Starting server...");

const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const pool = require('./db'); // PostgreSQL用の接続


const PORT = process.env.PORT || 3000;
const path = require('path');
const session = require('express-session');
const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASS;
const { requireAdmin } = require('./middleware/auth');
const sitemapRouter = require('./routes/sitemap');



app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_default_secret',
  resave: false,
  saveUninitialized: false
}));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', sitemapRouter);

const adminBlogRoutes = require('./routes/adminBlog');
app.use('/admin/blog', adminBlogRoutes);

app.use((req, res, next) => {
  if (req.headers.host === 'sieg-sports.com') {
    return res.redirect(301, 'https://www.sieg-sports.com' + req.url);
  }
  next();
});


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  // 先にリダイレクト（www付き！）
  res.redirect(303, 'https://www.sieg-sports.com/thanks.html');

  // 送信は裏で実行（failしてもユーザーには影響なし）
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // ← Gmailのアプリパスワード16桁
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });

  transporter.sendMail({
    from: `"サイトお問い合わせ" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: email,
    subject: `お問い合わせ: ${name || ''}`,
    text:
`【お問い合わせ】

■ お名前
${name || ''}

■ メールアドレス
${email || ''}

■ メッセージ
${message || ''}
`
  }).then(info => {
    console.log('Mail queued/sent:', info.messageId);
  }).catch(err => {
    console.error('メール送信エラー:', err);
  });
});



app.get('/admin/news', requireAdmin, (req, res) => {
  res.render('admin/admin_news');
});

app.post('/admin/news', requireAdmin, async (req, res) => {
  const { title, content, date } = req.body;
  const newsDate = date || new Date().toISOString().split('T')[0];
  try {
    await pool.query('INSERT INTO news (title, content, date) VALUES ($1, $2, $3)', [title, content, newsDate]);
    res.redirect('/admin/news/list');
  } catch (err) {
    res.status(500).send('登録に失敗しました');
  }
});

app.get('/', async (req, res) => {
  try {
    const newsResult = await pool.query('SELECT * FROM news ORDER BY date DESC LIMIT 5');
    const blogResult = await pool.query('SELECT id, title, thumbnail_url, created_at FROM blogs ORDER BY created_at DESC LIMIT 3');
    res.render('index', { newsList: newsResult.rows, blogs: blogResult.rows });
  } catch (err) {
    res.status(500).send('データベースエラー');
  }
});

app.get('/news/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).send('記事が見つかりません');
    res.render('news_detail', { news: result.rows[0] });
  } catch (err) {
    res.status(500).send('取得失敗');
  }
});

app.get('/admin/news/list', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY date DESC');
    res.render('admin/admin_news_list', { newsList: result.rows });
  } catch (err) {
    res.status(500).send('一覧取得失敗');
  }
});

app.get('/admin/news/delete/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM news WHERE id = $1', [id]);
    res.redirect('/admin/news/list');
  } catch (err) {
    res.status(500).send('削除失敗');
  }
});

app.get('/admin/news/edit/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).send('記事が見つかりません');
    res.render('admin/admin_news_edit', { news: result.rows[0] });
  } catch (err) {
    res.status(500).send('編集画面取得失敗');
  }
});

app.post('/admin/news/edit/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { title, content, date } = req.body;
  try {
    await pool.query('UPDATE news SET title = $1, content = $2, date = $3 WHERE id = $4', [title, content, date, id]);
    res.redirect('/admin/news/list');
  } catch (err) {
    res.status(500).send('更新失敗');
  }
});

app.get('/admin/login', (req, res) => {
  res.render('admin/admin_login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    res.redirect('/admin/news/list');
  } else {
    res.render('admin/admin_login', { error: 'ユーザー名かパスワードが違います' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

app.get('/blog', async (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT id, title, content, created_at, category, thumbnail_url FROM blogs';
  const params = [];

  if (category) {
    sql += ' WHERE category = $1';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  try {
    const result = await pool.query(sql, params);
    res.render('blog_list', {
      blogs: result.rows,
      selectedCategory: category || null
    });
  } catch (err) {
    res.status(500).send('ブログの取得に失敗しました');
  }
});

app.get('/blog/:id', async (req, res) => {
  const blogId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [blogId]);
    if (result.rows.length === 0) return res.status(404).send('記事が見つかりません');
    res.render('blog_detail', { blog: result.rows[0] });
  } catch (err) {
    res.status(500).send('取得エラー');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
