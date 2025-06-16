
console.log("Starting server...");


const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('siegsports.db');
const PORT = process.env.PORT || 3000;
const path = require('path');
const session = require('express-session');
const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASS;
const { requireAdmin } = require('./middleware/auth');




app.use(session({
  secret:  process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));




app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const adminBlogRoutes = require('./routes/adminBlog');
app.use('/admin/blog', adminBlogRoutes);


app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views')); 




app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // または "smtp.example.com"
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: email,
      to: process.env.EMAIL_USER,
      subject: `お問い合わせ: ${name}`,
      text: message
    });

    res.redirect('/thanks.html');
  } catch (error) {
    console.error(error);
    res.status(500).send('送信失敗');
  }
});

// 登録画面の表示
app.get('/admin/news',requireAdmin, (req, res) => {
  // 管理者認証が必要ならここにチェックを追加
  res.render('admin/admin_news');
});

// POST登録処理
app.post('/admin/news',requireAdmin, (req, res) => {
  const { title, content, date } = req.body;
  const newsDate = date || new Date().toISOString().split('T')[0];

  const sql = 'INSERT INTO news (title, content, date) VALUES (?, ?, ?)';
  db.run(sql, [title, content, newsDate], (err) => {
    if (err) return res.status(500).send('登録に失敗しました');
    res.redirect('/admin/news/list'); // 完了後にフォームへ戻るなど
  });
});

app.get('/', (req, res) => {
  db.all('SELECT * FROM news ORDER BY date DESC LIMIT 5', (err, newsRows) => {
    if (err) return res.status(500).send('News取得エラー');

    db.all('SELECT id, title, thumbnail_url, created_at FROM blogs ORDER BY created_at DESC LIMIT 3', (err2, blogRows) => {
      if (err2) return res.status(500).send('Blog取得エラー');

      res.render('index', {
        newsList: newsRows,
        blogs: blogRows
      });
    });
  });
});


app.get('/news/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM news WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).send('記事が見つかりません');
    res.render('news_detail', { news: row });
  });
});

// 一覧表示
app.get('/admin/news/list',requireAdmin, (req, res) => {
  db.all('SELECT * FROM news ORDER BY date DESC', (err, rows) => {
    if (err) return res.status(500).send('一覧取得失敗');
    res.render('admin/admin_news_list', { newsList: rows });
  });
});

// 削除処理
app.get('/admin/news/delete/:id',requireAdmin, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM news WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send('削除失敗');
    res.redirect('/admin/news/list');
  });
});

// 編集画面の表示
app.get('/admin/news/edit/:id',requireAdmin, (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM news WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).send('記事が見つかりません');
    res.render('admin/admin_news_edit', { news: row });
  });
});

// 編集フォームの送信処理
app.post('/admin/news/edit/:id',requireAdmin, (req, res) => {
  const id = req.params.id;
  const { title, content, date } = req.body;
  const sql = 'UPDATE news SET title = ?, content = ?, date = ? WHERE id = ?';
  db.run(sql, [title, content, date, id], (err) => {
    if (err) return res.status(500).send('更新失敗');
    res.redirect('/admin/news/list');
  });
});

// 管理者ログイン処理
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


// ログアウト
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});


// 公開ブログ一覧ページ
app.get('/blog', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT id, title, content, created_at, category, thumbnail_url FROM blogs';
  const params = [];

  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';




  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).send('ブログの取得に失敗しました');
    res.render('blog_list', {
      blogs: rows,
      selectedCategory: category || null
    });
  });
});


// 公開ブログ詳細ページ
app.get('/blog/:id', (req, res) => {
  const blogId = req.params.id;

  db.get('SELECT * FROM blogs WHERE id = ?', [blogId], (err, blog) => {
    if (err) return res.status(500).send('取得エラー');
    if (!blog) return res.status(404).send('記事が見つかりません');

    res.render('blog_detail', { blog });
  });
});




app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
  