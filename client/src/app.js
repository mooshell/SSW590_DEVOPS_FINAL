import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, RotateCcw, Trophy } from 'lucide-react';

const MusicRunner = () => {
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState([]);
  const [playerY, setPlayerY] = useState(250);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const gameLoopRef = useRef(null);
  const obstacleTimerRef = useRef(null);

  const GRAVITY = 0.6;
  const JUMP_STRENGTH = -12;
  const PLAYER_SIZE = 40;
  const OBSTACLE_WIDTH = 30;
  const GAME_HEIGHT = 500;
  const GAME_WIDTH = 800;

  // Fetch high scores from API
  const fetchHighScores = async () => {
    try {
      const response = await fetch('/api/scores');
      if (response.ok) {
        const data = await response.json();
        setHighScores(data);
      }
    } catch (error) {
      console.error('Failed to fetch scores:', error);
      setHighScores([]);
    }
  };

  // Submit score to API
  const submitScore = async (finalScore) => {
    if (!playerName.trim()) return;
    
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, score: finalScore })
      });
      
      await fetchHighScores();
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  };

  useEffect(() => {
    fetchHighScores();
  }, []);

  const jump = () => {
    if (gameState === 'playing' && playerY > 0) {
      setVelocity(JUMP_STRENGTH);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'menu' || gameState === 'gameOver') {
          startGame();
        } else if (gameState === 'playing') {
          jump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, playerY]);

  const startGame = () => {
    if (gameState === 'menu' && !playerName.trim()) {
      alert('Please enter your name!');
      return;
    }
    
    setGameState('playing');
    setScore(0);
    setPlayerY(250);
    setVelocity(0);
    setObstacles([]);
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoopRef.current = setInterval(() => {
      setVelocity(v => v + GRAVITY);
      setPlayerY(y => {
        const newY = y + velocity;
        if (newY >= GAME_HEIGHT - PLAYER_SIZE) {
          setGameState('gameOver');
          return GAME_HEIGHT - PLAYER_SIZE;
        }
        if (newY <= 0) return 0;
        return newY;
      });

      setObstacles(obs => {
        const updated = obs
          .map(o => ({ ...o, x: o.x - 5 }))
          .filter(o => o.x > -OBSTACLE_WIDTH);
        
        updated.forEach(o => {
          if (
            o.x < 100 + PLAYER_SIZE &&
            o.x + OBSTACLE_WIDTH > 100 &&
            (playerY < o.gapY || playerY + PLAYER_SIZE > o.gapY + o.gapSize)
          ) {
            setGameState('gameOver');
          }
        });

        updated.forEach(o => {
          if (o.x + OBSTACLE_WIDTH < 100 && !o.scored) {
            o.scored = true;
            setScore(s => s + 10);
          }
        });

        return updated;
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoopRef.current);
  }, [gameState, velocity, playerY]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    obstacleTimerRef.current = setInterval(() => {
      const gapSize = 150;
      const gapY = Math.random() * (GAME_HEIGHT - gapSize - 100) + 50;
      
      setObstacles(obs => [
        ...obs,
        {
          id: Date.now(),
          x: GAME_WIDTH,
          gapY,
          gapSize,
          scored: false
        }
      ]);
    }, 2000);

    return () => clearInterval(obstacleTimerRef.current);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'gameOver' && score > 0) {
      submitScore(score);
    }
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl max-w-5xl w-full">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Music className="w-8 h-8 text-yellow-400" />
          <h1 className="text-4xl font-bold text-white">Music Runner</h1>
          <Music className="w-8 h-8 text-yellow-400" />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div 
              className="relative bg-gradient-to-b from-indigo-600 to-purple-700 rounded-xl overflow-hidden shadow-lg"
              style={{ width: GAME_WIDTH, height: GAME_HEIGHT, maxWidth: '100%' }}
            >
              <div className="absolute top-4 left-4 bg-black/50 px-4 py-2 rounded-lg">
                <p className="text-white text-xl font-bold">Score: {score}</p>
              </div>

              {gameState !== 'menu' && (
                <div
                  className="absolute bg-yellow-400 rounded-full shadow-lg transition-all duration-100"
                  style={{
                    left: 100,
                    top: playerY,
                    width: PLAYER_SIZE,
                    height: PLAYER_SIZE,
                  }}
                >
                  <div className="flex items-center justify-center h-full">
                    <Music className="w-6 h-6 text-purple-900" />
                  </div>
                </div>
              )}

              {obstacles.map(obs => (
                <React.Fragment key={obs.id}>
                  <div
                    className="absolute bg-red-500 shadow-lg"
                    style={{
                      left: obs.x,
                      top: 0,
                      width: OBSTACLE_WIDTH,
                      height: obs.gapY,
                    }}
                  />
                  <div
                    className="absolute bg-red-500 shadow-lg"
                    style={{
                      left: obs.x,
                      top: obs.gapY + obs.gapSize,
                      width: OBSTACLE_WIDTH,
                      height: GAME_HEIGHT - (obs.gapY + obs.gapSize),
                    }}
                  />
                </React.Fragment>
              ))}

              {gameState === 'menu' && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                  <h2 className="text-3xl font-bold text-white mb-4">Ready to Play?</h2>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="px-4 py-2 rounded-lg text-lg mb-4"
                    maxLength={20}
                  />
                  <p className="text-white text-lg mb-2">Press SPACE or tap to jump</p>
                  <button
                    onClick={startGame}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-bold flex items-center gap-2 transition-colors"
                  >
                    <Play className="w-6 h-6" />
                    Start Game
                  </button>
                </div>
              )}

              {gameState === 'gameOver' && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                  <h2 className="text-4xl font-bold text-red-400 mb-2">Game Over!</h2>
                  <p className="text-white text-2xl mb-4">Final Score: {score}</p>
                  <button
                    onClick={startGame}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-xl font-bold flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-6 h-6" />
                    Play Again
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={jump}
              disabled={gameState !== 'playing'}
              className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 text-black font-bold py-4 rounded-lg text-xl transition-colors md:hidden"
            >
              TAP TO JUMP
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h3 className="text-2xl font-bold text-white">Top Scores</h3>
            </div>
            <div className="space-y-2">
              {highScores.map((entry, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 rounded-lg p-3 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 font-bold text-lg">#{idx + 1}</span>
                    <span className="text-white">{entry.name}</span>
                  </div>
                  <span className="text-yellow-400 font-bold">{entry.score}</span>
                </div>
              ))}
              {highScores.length === 0 && (
                <p className="text-white/50 text-center py-4">No scores yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white/5 backdrop-blur rounded-lg p-4">
          <p className="text-white text-center">
            🎵 Press <kbd className="bg-white/20 px-2 py-1 rounded">SPACE</kbd> to jump through the gaps! Avoid the obstacles and rack up points! 🎵
          </p>
        </div>
      </div>
    </div>
  );
};

export default MusicRunner;