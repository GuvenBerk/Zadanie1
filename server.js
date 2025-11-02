const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tajny_klucz_jwt';

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://zadanie1_user:Y9fVQzpYFGyE6IpmbWfbuRFxlp9ncoGa@dpg-d3pqvr2li9vc73br046g-a/zadanie1',
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('Połączono z PostgreSQL'))
  .catch(err => console.error('Błąd połączenia z PostgreSQL:', err));

const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS zadania (
    id SERIAL PRIMARY KEY,
    tytul VARCHAR(255) NOT NULL,
    opis TEXT,
    termin DATE,
    priorytet INTEGER,
    status VARCHAR(50)
  );

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rola VARCHAR(50) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

client.query(createTablesQuery)
  .then(() => console.log('Tabele utworzone/zaktualizowane'))
  .catch(err => console.error('Błąd tworzenia tabel:', err));

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token dostępu wymagany' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Nieprawidłowy token' });
    }
    req.user = user;
    next();
  });
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/home', (req, res) => {
  res.json({ 
    message: 'Witaj w Menadżerze Zadań!',
    description: 'To jest publiczna strona główna aplikacji do zarządzania zadaniami.',
    features: [
      'Dodawanie i usuwanie zadań',
      'Ustawianie priorytetów i terminów',
      'Śledzenie statusu zadań'
    ]
  });
});

app.post('/register', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Login i hasło są wymagane' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
  }

  try {
    const existingUser = await client.query('SELECT * FROM users WHERE login = $1', [login]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Login jest już zajęty' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await client.query(
      'INSERT INTO users (login, password_hash, rola) VALUES ($1, $2, $3) RETURNING id, login, rola',
      [login, passwordHash, 'USER']
    );

    res.status(201).json({ 
      message: 'Użytkownik zarejestrowany pomyślnie',
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Login i hasło są wymagane' });
  }

  try {
    const result = await client.query('SELECT * FROM users WHERE login = $1', [login]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    const token = jwt.sign(
      { id: user.id, login: user.login, rola: user.rola },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Logowanie udane',
      token,
      user: {
        id: user.id,
        login: user.login,
        rola: user.rola
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/zadania', authenticateToken, (req, res) => {
  client.query('SELECT * FROM zadania ORDER BY id DESC')
    .then(result => res.json({ zadania: result.rows }))
    .catch(error => res.status(500).json({ error: error.message }));
});

app.get('/zadania/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  client.query('SELECT * FROM zadania WHERE id = $1', [id])
    .then(result => {
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Zadanie nie znalezione' });
        return;
      }
      res.json({ zadanie: result.rows[0] });
    })
    .catch(error => res.status(500).json({ error: error.message }));
});

app.post('/zadania', authenticateToken, (req, res) => {
  const { tytul, opis, termin, priorytet, status } = req.body;
  
  if (!tytul) {
    return res.status(400).json({ error: 'Tytuł jest wymagany.' });
  }

  client.query(
    'INSERT INTO zadania (tytul, opis, termin, priorytet, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [tytul, opis, termin, priorytet, status]
  )
  .then(result => res.status(201).json({
    message: 'Zadanie utworzone pomyślnie',
    zadanieId: result.rows[0].id,
    zadanie: result.rows[0]
  }))
  .catch(error => res.status(500).json({ error: error.message }));
});

app.put('/zadania/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  const { tytul, opis, termin, priorytet, status } = req.body;

  if (!tytul) {
    return res.status(400).json({ error: 'Tytuł jest wymagany.' });
  }

  client.query(
    'UPDATE zadania SET tytul = $1, opis = $2, termin = $3, priorytet = $4, status = $5 WHERE id = $6 RETURNING *',
    [tytul, opis, termin, priorytet, status, id]
  )
  .then(result => {
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Zadanie do aktualizacji nie znalezione' });
      return;
    }
    res.json({ message: 'Zadanie zaktualizowane pomyślnie', zadanie: result.rows[0] });
  })
  .catch(error => res.status(500).json({ error: error.message }));
});

app.delete('/zadania/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  
  client.query('DELETE FROM zadania WHERE id = $1 RETURNING *', [id])
    .then(result => {
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Zadanie do usunięcia nie znalezione' });
        return;
      }
      res.json({ message: 'Zadanie usunięte pomyślnie' });
    })
    .catch(error => res.status(500).json({ error: error.message }));
});

app.listen(port, () => {
  console.log(`Serwer API działa na porcie ${port}`);
});