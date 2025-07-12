const express = require('express');
const router = express.Router();
const pool = require('../db'); // ← PostgreSQL接続

router.get('/sitemap.xml', async (req, res) => {
  try {
    const blogs = await pool.query('SELECT id, created_at FROM blogs ORDER BY created_at DESC');
    const news = await pool.query('SELECT id, date FROM news ORDER BY date DESC');

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // トップページや固定ページ
    const staticUrls = [
      '',
      'blog',
      'news-detail.html',
      'thanks.html',
    ];
    staticUrls.forEach(path => {
      xml += `  <url>\n`;
      xml += `    <loc>https://sieg-sports.com/${path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `  </url>\n`;
    });

    // 動的ブログ
    blogs.rows.forEach(blog => {
      xml += `  <url>\n`;
      xml += `    <loc>https://sieg-sports.com/blog/${blog.id}</loc>\n`;
      xml += `    <lastmod>${blog.created_at.toISOString().split('T')[0]}</lastmod>\n`;
      xml += `  </url>\n`;
    });

    // 動的ニュース
    news.rows.forEach(n => {
      xml += `  <url>\n`;
      xml += `    <loc>https://sieg-sports.com/news/${n.id}</loc>\n`;
      xml += `    <lastmod>${n.date.toISOString().split('T')[0]}</lastmod>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap Error:', err);
    res.status(500).send('sitemap generation failed');
  }
});

module.exports = router;
