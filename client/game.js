// API Configuration
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : '/api';

// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = {
  isRunning: false,
  score: 0,
  highScore: 0,
  speed: 5,
  gravity: 0.6,
  jumpStrength: -12
};

// Player Object
const player = {
  x: 50,
  y: canvas.height - 60,
  width: 40,
  height: 50,
  velocityY: 0,
  isJumping: false,
  color: '#4CAF50'
};

// Obstacles Array
let obstacles = [];
let obstacleTimer = 0;
const obstacleInterval = 100; // frames between obstacles

// Game Loop
let animationId;

// Initialize Game
function init() {
  loadHighScore();
  loadLeaderboard();
  
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', restartGame);
  document.getElementById('submitScore').addEventListener('click', submitScore);
  document.getElementById('jumpBtn').addEventListener('click', jump);
  
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (gameState.isRunning) {
        jump();
      } else {
        startGame();
      }
    }
  });
}

function startGame() {
  gameState.isRunning = true;
  gameState.score = 0;
  gameState.speed = 5;
  obstacles = [];
  obstacleTimer = 0;
  
  player.y = canvas.height - 60;
  player.velocityY = 0;
  player.isJumping = false;
  
  document.getElementById('gameOver').classList.add('hidden');
  document.getElementById('startBtn').disabled = true;
  
  gameLoop();
}

function restartGame() {
  startGame();
}

function gameLoop() {
  if (!gameState.isRunning) return;
  
  update();
  render();
  
  animationId = requestAnimationFrame(gameLoop);
}

function update() {
  // Update score
  gameState.score++;
  document.getElementById('currentScore').textContent = Math.floor(gameState.score / 10);
  
  // Increase difficulty
  if (gameState.score % 500 === 0) {
    gameState.speed += 0.5;
  }
  
  // Update player physics
  player.velocityY += gameState.gravity;
  player.y += player.velocityY;
  
  // Ground collision
  if (player.y > canvas.height - 60) {
    player.y = canvas.height - 60;
    player.velocityY = 0;
    player.isJumping = false;
  }
  
  // Create obstacles
  obstacleTimer++;
  if (obstacleTimer > obstacleInterval) {
    createObstacle();
    obstacleTimer = 0;
  }
  
  // Update obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= gameState.speed;
    
    // Remove off-screen obstacles
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
      continue;
    }
    
    // Check collision
    if (checkCollision(player, obstacles[i])) {
      gameOver();
      return;
    }
  }
}

function render() {
  // Clear canvas
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw ground
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
  
  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  
  // Draw obstacles
  ctx.fillStyle = '#FF4444';
  obstacles.forEach(obstacle => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });
  
  // Draw score
  ctx.fillStyle = '#000';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${Math.floor(gameState.score / 10)}`, 10, 30);
}

function jump() {
  if (!player.isJumping && gameState.isRunning) {
    player.velocityY = gameState.jumpStrength;
    player.isJumping = true;
  }
}

function createObstacle() {
  const height = 30 + Math.random() * 40;
  obstacles.push({
    x: canvas.width,
    y: canvas.height - 10 - height,
    width: 20 + Math.random() * 30,
    height: height
  });
}

function checkCollision(player, obstacle) {
  return player.x < obstacle.x + obstacle.width &&
         player.x + player.width > obstacle.x &&
         player.y < obstacle.y + obstacle.height &&
         player.y + player.height > obstacle.y;
}

function gameOver() {
  gameState.isRunning = false;
  cancelAnimationFrame(animationId);
  
  const finalScore = Math.floor(gameState.score / 10);
  document.getElementById('finalScore').textContent = finalScore;
  
  if (finalScore > gameState.highScore) {
    gameState.highScore = finalScore;
    localStorage.setItem('highScore', finalScore);
    document.getElementById('highScore').textContent = finalScore;
  }
  
  document.getElementById('gameOver').classList.remove('hidden');
  document.getElementById('startBtn').disabled = false;
}

async function submitScore() {
  const playerName = document.getElementById('playerName').value.trim();
  const finalScore = Math.floor(gameState.score / 10);
  
  if (!playerName) {
    alert('Please enter your name!');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerName,
        score: finalScore
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      alert(`Score submitted! You ranked #${data.rank}`);
      loadLeaderboard();
      document.getElementById('playerName').value = '';
    } else {
      alert('Failed to submit score. Please try again.');
    }
  } catch (error) {
    console.error('Error submitting score:', error);
    alert('Failed to submit score. Please try again.');
  }
}

async function loadLeaderboard() {
  try {
    const response = await fetch(`${API_URL}/scores`);
    if (response.ok) {
      const scores = await response.json();
      displayLeaderboard(scores);
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    document.getElementById('leaderboardList').innerHTML = '<p>Failed to load leaderboard</p>';
  }
}

function displayLeaderboard(scores) {
  const leaderboardList = document.getElementById('leaderboardList');
  
  if (scores.length === 0) {
    leaderboardList.innerHTML = '<p>No scores yet. Be the first!</p>';
    return;
  }
  
  leaderboardList.innerHTML = scores.map((score, index) => `
    <div class="leaderboard-item">
      <span class="rank">#${index + 1}</span>
      <span class="name">${escapeHtml(score.playerName)}</span>
      <span class="score">${score.score}</span>
    </div>
  `).join('');
}

function loadHighScore() {
  const savedHighScore = localStorage.getItem('highScore');
  if (savedHighScore) {
    gameState.highScore = parseInt(savedHighScore);
    document.getElementById('highScore').textContent = gameState.highScore;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when page loads
window.addEventListener('load', init);