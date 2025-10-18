CREATE TABLE IF NOT EXISTS zadania (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tytul TEXT NOT NULL,
    opis TEXT,
    termin TEXT,
    priorytet INTEGER,
    status TEXT
);