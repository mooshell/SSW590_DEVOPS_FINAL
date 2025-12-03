const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'musicrunner',
  user: process.env.DB_USER || 'gameuser',
  password: process.env.DB_PASSWORD || 'gamepass123',
});

// Initialize database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
    `);
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

initDB();

// Scoring logic (exported for testing)
const calculateScore = (timeAlive, obstaclesPassed) => {
  return obstaclesPassed * 10 + Math.floor(timeAlive / 1000);
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT player_name as name, score FROM scores ORDER BY score DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

app.post('/api/scores', async (req, res) => {
  const { name, score } = req.body;
  
  // Validation
  if (!name || typeof name !== 'string' || name.length === 0 || name.length > 50) {
    return res.status(400).json({ error: 'Invalid name: must be 1-50 characters' });
  }
  
  if (typeof score !== 'number' || score < 0 || score > 999999) {
    return res.status(400).json({ error: 'Invalid score: must be 0-999999' });
  }
  
  try {
    await pool.query(
      'INSERT INTO scores (player_name, score) VALUES ($1, $2)',
      [name.trim(), score]
    );
    res.status(201).json({ success: true, message: 'Score saved' });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.delete('/api/scores', async (req, res) => {
  try {
    await pool.query('DELETE FROM scores');
    res.json({ success: true, message: 'All scores deleted' });
  } catch (error) {
    console.error('Error deleting scores:', error);
    res.status(500).json({ error: 'Failed to delete scores' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 Music Runner Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end();
  });
});

module.exports = { app, calculateScore };