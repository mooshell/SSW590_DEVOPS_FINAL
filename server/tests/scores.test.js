const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, Score } = require('../server');

let mongoServer;

// Setup: Start in-memory MongoDB before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.disconnect();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Cleanup: Clear database after each test
afterEach(async () => {
  await Score.deleteMany({});
});

// Teardown: Close connections after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Health Check', () => {
  test('GET /health should return 200 and healthy status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });
});

describe('Score Submission', () => {
  test('POST /api/scores should create a new score', async () => {
    const scoreData = {
      playerName: 'TestPlayer',
      score: 1000
    };

    const response = await request(app)
      .post('/api/scores')
      .send(scoreData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'Score submitted successfully');
    expect(response.body).toHaveProperty('rank', 1);
    expect(response.body.score).toHaveProperty('playerName', 'TestPlayer');
    expect(response.body.score).toHaveProperty('score', 1000);
  });

  test('POST /api/scores should reject negative scores', async () => {
    const scoreData = {
      playerName: 'TestPlayer',
      score: -100
    };

    const response = await request(app)
      .post('/api/scores')
      .send(scoreData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Score cannot be negative');
  });

  test('POST /api/scores should reject missing playerName', async () => {
    const scoreData = {
      score: 1000
    };

    const response = await request(app)
      .post('/api/scores')
      .send(scoreData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid input');
  });

  test('POST /api/scores should truncate long player names', async () => {
    const scoreData = {
      playerName: 'ThisIsAVeryLongPlayerNameThatExceedsTwentyCharacters',
      score: 500
    };

    const response = await request(app)
      .post('/api/scores')
      .send(scoreData);

    expect(response.status).toBe(201);
    expect(response.body.score.playerName.length).toBeLessThanOrEqual(20);
  });
});

describe('Get High Scores', () => {
  beforeEach(async () => {
    // Seed test data
    const testScores = [
      { playerName: 'Player1', score: 1000 },
      { playerName: 'Player2', score: 2000 },
      { playerName: 'Player3', score: 1500 },
      { playerName: 'Player4', score: 500 },
      { playerName: 'Player5', score: 3000 },
    ];

    await Score.insertMany(testScores);
  });

  test('GET /api/scores should return scores sorted by highest first', async () => {
    const response = await request(app).get('/api/scores');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(5);
    expect(response.body[0].score).toBe(3000);
    expect(response.body[1].score).toBe(2000);
    expect(response.body[4].score).toBe(500);
  });

  test('GET /api/scores should limit to 10 results', async () => {
    // Add more scores
    const moreScores = Array.from({ length: 15 }, (_, i) => ({
      playerName: `Player${i + 10}`,
      score: i * 100
    }));
    
    await Score.insertMany(moreScores);

    const response = await request(app).get('/api/scores');

    expect(response.status).toBe(200);
    expect(response.body.length).toBeLessThanOrEqual(10);
  });
});

describe('Get Player Best Score', () => {
  beforeEach(async () => {
    const testScores = [
      { playerName: 'TestPlayer', score: 1000 },
      { playerName: 'TestPlayer', score: 2000 },
      { playerName: 'TestPlayer', score: 1500 },
    ];

    await Score.insertMany(testScores);
  });

  test('GET /api/scores/player/:playerName should return best score', async () => {
    const response = await request(app).get('/api/scores/player/TestPlayer');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('playerName', 'TestPlayer');
    expect(response.body).toHaveProperty('score', 2000);
  });

  test('GET /api/scores/player/:playerName should return 404 for non-existent player', async () => {
    const response = await request(app).get('/api/scores/player/NonExistent');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Player not found');
  });
});

describe('Score Ranking', () => {
  test('Rank should be calculated correctly', async () => {
    // Create initial scores
    await Score.create({ playerName: 'Player1', score: 1000 });
    await Score.create({ playerName: 'Player2', score: 2000 });
    await Score.create({ playerName: 'Player3', score: 3000 });

    // Submit new score
    const response = await request(app)
      .post('/api/scores')
      .send({ playerName: 'NewPlayer', score: 1500 });

    expect(response.status).toBe(201);
    expect(response.body.rank).toBe(3); // Should rank 3rd (below 3000 and 2000)
  });
});