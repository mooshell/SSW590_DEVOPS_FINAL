// tests/scoring.test.js

// Mock the database connection to prevent it from running during tests
jest.mock('pg', () => {
  const mClient = {
    query: jest.fn(),
  };
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool), Client: jest.fn(() => mClient) };
});

// Import after mocking
const { calculateScore } = require('../server');

describe('Scoring Logic Tests', () => {
  test('calculates score correctly with obstacles', () => {
    const timeAlive = 5000; // 5 seconds
    const obstaclesPassed = 10;
    const score = calculateScore(timeAlive, obstaclesPassed);
    expect(score).toBe(105); // 10*10 + 5
  });
  
  test('calculates score with zero obstacles', () => {
    const timeAlive = 3000; // 3 seconds
    const obstaclesPassed = 0;
    const score = calculateScore(timeAlive, obstaclesPassed);
    expect(score).toBe(3); // 0*10 + 3
  });
  
  test('calculates score with only time', () => {
    const timeAlive = 10000; // 10 seconds
    const obstaclesPassed = 0;
    const score = calculateScore(timeAlive, obstaclesPassed);
    expect(score).toBe(10);
  });
  
  test('calculates score with only obstacles', () => {
    const timeAlive = 0;
    const obstaclesPassed = 5;
    const score = calculateScore(timeAlive, obstaclesPassed);
    expect(score).toBe(50);
  });
  
  test('validates score boundaries', () => {
    const timeAlive = 60000; // 1 minute
    const obstaclesPassed = 50;
    const score = calculateScore(timeAlive, obstaclesPassed);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1000000);
    expect(score).toBe(560); // 50*10 + 60
  });

  test('handles large numbers', () => {
    const timeAlive = 180000; // 3 minutes
    const obstaclesPassed = 100;
    const score = calculateScore(timeAlive, obstaclesPassed);
    expect(score).toBe(1180); // 100*10 + 180
  });
});