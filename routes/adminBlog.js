const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./siegsports.db'); // DB名は環境に合わせて
const { requireAdmin } = require('../middleware/auth');


// 一覧表示
router.get('/', (req, res) => {
  db.all('SELECT * FROM blogs ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).send('データベースエラー');
    res.render('admin/blog/index', { blogs: rows });
  });
});

// 新規投稿フォーム
router.get('/new',requireAdmin, (req, res) => {
  res.render('admin/blog/new');
});

// 新規投稿処理
router.post('/',requireAdmin, (req, res) => {
  const { title, content, category,thumbnail_url } = req.body;
  console.log(req.body)
  db.run(
    'INSERT INTO blogs (title, content, category, thumbnail_url) VALUES (?, ?, ?, ?)',
    [title, content, category, thumbnail_url],
    (err) => {
      if (err) return res.status(500).send('投稿に失敗しました');
      res.redirect('/admin/blog');
    }
  );
});

// 編集フォームの表示
router.get('/edit/:id',requireAdmin, (req, res) => {
    const blogId = req.params.id;
    db.get('SELECT * FROM blogs WHERE id = ?', [blogId], (err, blog) => {
      if (err || !blog) return res.status(404).send('記事が見つかりません');
      res.render('admin/blog/edit', { blog });
    });
  });
  
  // 編集内容の保存
  router.post('/edit/:id',requireAdmin, (req, res) => {
    const blogId = req.params.id;
    const { title, content, category } = req.body;
  
    db.run('UPDATE blogs SET title = ?, content = ?, category = ? WHERE id = ?', [title, content, category, blogId], (err) => {
      if (err) return res.status(500).send('更新に失敗しました');
      res.redirect('/admin/blog');
    });
  });
  
  // 削除処理
router.get('/delete/:id',requireAdmin, (req, res) => {
    const blogId = req.params.id;
  
    db.run('DELETE FROM blogs WHERE id = ?', [blogId], (err) => {
      if (err) return res.status(500).send('削除に失敗しました');
      res.redirect('/admin/blog');
    });
  });
  

module.exports = router;
