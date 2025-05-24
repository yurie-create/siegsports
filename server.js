
console.log("Starting server...");


const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
  