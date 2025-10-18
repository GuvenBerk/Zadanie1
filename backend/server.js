const express = require('express');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get('/zadania', (req, res) => {
    const sql = "SELECT * FROM zadania";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ zadania: rows });
    });
});

app.get('/zadania/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM zadania WHERE id = ?";
    db.get(sql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Zadanie nie znalezione' });
            return;
        }
        res.json({ zadanie: row });
    });
});

app.post('/zadania', (req, res) => {
    const { tytul, opis, termin, priorytet, status } = req.body;
    if (!tytul) {
        return res.status(400).json({ error: 'Tytuł jest wymagany.' });
    }

    const sql = `INSERT INTO zadania (tytul, opis, termin, priorytet, status) 
                 VALUES (?, ?, ?, ?, ?)`;
    const params = [tytul, opis, termin, priorytet, status];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({
            message: 'Zadanie utworzone pomyślnie',
            zadanieId: this.lastID
        });
    });
});

app.put('/zadania/:id', (req, res) => {
    const id = req.params.id;
    const { tytul, opis, termin, priorytet, status } = req.body;

    if (!tytul) {
        return res.status(400).json({ error: 'Tytuł jest wymagany.' });
    }

    const sql = `UPDATE zadania 
                 SET tytul = ?, opis = ?, termin = ?, priorytet = ?, status = ?
                 WHERE id = ?`;
    const params = [tytul, opis, termin, priorytet, status, id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Zadanie do aktualizacji nie znalezione' });
            return;
        }
        res.json({ message: 'Zadanie zaktualizowane pomyślnie' });
    });
});

app.delete('/zadania/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM zadania WHERE id = ?";

    db.run(sql, [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Zadanie do usunięcia nie znalezione' });
            return;
        }
        res.json({ message: 'Zadanie usunięte pomyślnie' });
    });
});

app.listen(port, () => {
    console.log(`Serwer API działa na http://localhost:${port}`);
});