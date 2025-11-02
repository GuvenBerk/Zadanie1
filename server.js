const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tajny_klucz_jwt';

let db;

async function initializeDatabase() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS zadania (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tytul VARCHAR(255) NOT NULL,
      opis TEXT,
      termin DATE,
      priorytet INTEGER,
      status VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      rola VARCHAR(50) DEFAULT 'USER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Baza danych SQLite zainicjalizowana');
}

initializeDatabase();

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
    const existingUser = await db.get('SELECT * FROM users WHERE login = ?', [login]);
    if (existingUser) {
      return res.status(400).json({ error: 'Login jest już zajęty' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.run(
      'INSERT INTO users (login, password_hash, rola) VALUES (?, ?, ?)',
      [login, passwordHash, 'USER']
    );

    res.status(201).json({ 
      message: 'Użytkownik zarejestrowany pomyślnie',
      user: {
        id: result.lastID,
        login: login,
        rola: 'USER'
      }
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
    const user = await db.get('SELECT * FROM users WHERE login = ?', [login]);
    if (!user) {
      return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
    }

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

app.get('/zadania', authenticateToken, async (req, res) => {
  try {
    const zadania = await db.all('SELECT * FROM zadania ORDER BY id DESC');
    res.json({ zadania: zadania });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/zadania/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const zadanie = await db.get('SELECT * FROM zadania WHERE id = ?', [id]);
    if (!zadanie) {
      res.status(404).json({ error: 'Zadanie nie znalezione' });
      return;
    }
    res.json({ zadanie: zadanie });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/zadania', authenticateToken, async (req, res) => {
  const { tytul, opis, termin, priorytet, status } = req.body;
  
  if (!tytul) {
    return res.status(400).json({ error: 'Tytuł jest wymagany.' });
  }

  try {
    const result = await db.run(
      'INSERT INTO zadania (tytul, opis, termin, priorytet, status) VALUES (?, ?, ?, ?, ?)',
      [tytul, opis, termin, priorytet, status]
    );

    const newZadanie = await db.get('SELECT * FROM zadania WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: 'Zadanie utworzone pomyślnie',
      zadanieId: result.lastID,
      zadanie: newZadanie
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/zadania/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  const { tytul, opis, termin, priorytet, status } = req.body;

  if (!tytul) {
    return res.status(400).json({ error: 'Tytuł jest wymagany.' });
  }

  try {
    await db.run(
      'UPDATE zadania SET tytul = ?, opis = ?, termin = ?, priorytet = ?, status = ? WHERE id = ?',
      [tytul, opis, termin, priorytet, status, id]
    );

    const updatedZadanie = await db.get('SELECT * FROM zadania WHERE id = ?', [id]);
    
    if (!updatedZadanie) {
      res.status(404).json({ error: 'Zadanie do aktualizacji nie znalezione' });
      return;
    }

    res.json({ message: 'Zadanie zaktualizowane pomyślnie', zadanie: updatedZadanie });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/zadania/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  
  try {
    const result = await db.run('DELETE FROM zadania WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      res.status(404).json({ error: 'Zadanie do usunięcia nie znalezione' });
      return;
    }

    res.json({ message: 'Zadanie usunięte pomyślnie' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Serwer API działa na porcie ${port}`);
});