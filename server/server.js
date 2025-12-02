const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Score Schema
const scoreSchema = new mongoose.Schema({
  playerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

scoreSchema.index({ score: -1 });

const Score = mongoose.model('Score', scoreSchema);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get top 10 high scores
app.get('/api/scores', async (req, res) => {
  try {
    const scores = await Score.find()
      .sort({ score: -1 })
      .limit(10)
      .select('playerName score timestamp');
    res.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// Submit a new score
app.post('/api/scores', async (req, res) => {
  try {
    const { playerName, score } = req.body;

    if (!playerName || typeof score !== 'number') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    if (score < 0) {
      return res.status(400).json({ error: 'Score cannot be negative' });
    }

    const newScore = new Score({
      playerName: playerName.substring(0, 20), // Limit name length
      score
    });

    await newScore.save();
    
    // Get player's rank
    const rank = await Score.countDocuments({ score: { $gt: score } }) + 1;
    
    res.status(201).json({ 
      message: 'Score submitted successfully',
      rank,
      score: newScore
    });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// Get player's best score
app.get('/api/scores/player/:playerName', async (req, res) => {
  try {
    const { playerName } = req.params;
    const bestScore = await Score.findOne({ playerName })
      .sort({ score: -1 })
      .select('playerName score timestamp');
    
    if (!bestScore) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(bestScore);
  } catch (error) {
    console.error('Error fetching player score:', error);
    res.status(500).json({ error: 'Failed to fetch player score' });
  }
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

module.exports = { app, Score }; // Export for testing