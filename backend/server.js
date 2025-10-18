const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://zadanie1_user:Y9fVQzpYFGyE6IpmbWfbuRFxlp9ncoGa@dpg-d3pqvr2li9vc73br046g-a/zadanie1',
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('Połączono z PostgreSQL'))
  .catch(err => console.error('Błąd połączenia z PostgreSQL:', err));

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS zadania (
    id SERIAL PRIMARY KEY,
    tytul VARCHAR(255) NOT NULL,
    opis TEXT,
    termin DATE,
    priorytet INTEGER,
    status VARCHAR(50)
  );
`;

client.query(createTableQuery)
  .then(() => console.log('Tabela zadania utworzona'))
  .catch(err => console.error('Błąd tworzenia tabeli:', err));

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/zadania', (req, res) => {
  client.query('SELECT * FROM zadania ORDER BY id DESC')
    .then(result => res.json({ zadania: result.rows }))
    .catch(error => res.status(500).json({ error: error.message }));
});

app.get('/zadania/:id', (req, res) => {
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

app.post('/zadania', (req, res) => {
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

app.put('/zadania/:id', (req, res) => {
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

app.delete('/zadania/:id', (req, res) => {
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