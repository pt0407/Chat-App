const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});
app.use(express.static(path.join(__dirname)));

app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM leaderboard ORDER BY score DESC, time ASC LIMIT 50'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

app.post('/api/leaderboard', async (req, res) => {
    const { name, score, total, time, accuracy } = req.body;

    if (!name || score == null || total == null || time == null || accuracy == null) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO leaderboard (name, score, total, time, accuracy) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, score, total, time, accuracy]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error submitting score:', err);
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
