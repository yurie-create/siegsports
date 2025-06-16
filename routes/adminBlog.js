const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL 用
const { requireAdmin } = require('../middleware/auth');

// 一覧表示
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC');
    res.render('admin/blog/index', { blogs: result.rows });
  } catch (err) {
    res.status(500).send('データベースエラー');
  }
});

// 新規投稿フォーム
router.get('/new', requireAdmin, (req, res) => {
  res.render('admin/blog/new');
});

// 新規投稿処理
router.post('/', requireAdmin, async (req, res) => {
  const { title, content, category, thumbnail_url } = req.body;
  try {
    await pool.query(
      'INSERT INTO blogs (title, content, category, thumbnail_url) VALUES ($1, $2, $3, $4)',
      [title, content, category, thumbnail_url]
    );
    res.redirect('/admin/blog');
  } catch (err) {
    res.status(500).send('投稿に失敗しました');
  }
});

// 編集フォームの表示
router.get('/edit/:id', requireAdmin, async (req, res) => {
  const blogId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [blogId]);
    if (result.rows.length === 0) return res.status(404).send('記事が見つかりません');
    res.render('admin/blog/edit', { blog: result.rows[0] });
  } catch (err) {
    res.status(500).send('取得に失敗しました');
  }
});

// 編集内容の保存
router.post('/edit/:id', requireAdmin, async (req, res) => {
  const blogId = req.params.id;
  const { title, content, category } = req.body;
  try {
    await pool.query(
      'UPDATE blogs SET title = $1, content = $2, category = $3 WHERE id = $4',
      [title, content, category, blogId]
    );
    res.redirect('/admin/blog');
  } catch (err) {
    res.status(500).send('更新に失敗しました');
  }
});

// 削除処理
router.get('/delete/:id', requireAdmin, async (req, res) => {
  const blogId = req.params.id;
  try {
    await pool.query('DELETE FROM blogs WHERE id = $1', [blogId]);
    res.redirect('/admin/blog');
  } catch (err) {
    res.status(500).send('削除に失敗しました');
  }
});

module.exports = router;
