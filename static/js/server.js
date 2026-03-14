const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const users = []; // temporary in-memory storage

app.post('/signup', (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const existing = users.find(u => u.email === email);
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  users.push({ fullName, email, password });
  res.status(201).json({ message: 'User created successfully' });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));