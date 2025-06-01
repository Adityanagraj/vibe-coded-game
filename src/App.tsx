import React, { useEffect, useRef, useState } from 'react';
import metroImg from './download.jpg';
import cskLogo from './csk_logo.png'; // Assuming the image is named csk_logo.png and is in src

const ROAD_LANES = 5;
const LANE_HEIGHT = 120;
const PLAYER_WIDTH = 120;
const PLAYER_HEIGHT = 100;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 40;
const GAME_WIDTH = 1100;
const GAME_HEIGHT = ROAD_LANES * LANE_HEIGHT;
const PLAYER_START_LANE = 2;
const PLAYER_SPEED = 4;
const OBSTACLE_SPEEDS = {
  zepto: 7,
  auto: 4,
  cow: 3,
};

const OBSTACLE_TYPES = [
  { type: 'zepto', icon: 'bike' },
  { type: 'auto', icon: '🛺' },
  { type: 'cow', icon: '🐄' },
];

const LEVEL1_DISTANCE = GAME_WIDTH - 50;
const LEVEL2_DISTANCE = GAME_WIDTH * 2;

interface Obstacle {
  type: string;
  icon: string;
  lane: number;
  x: number;
  y: number;
  speed: number;
}

interface Raindrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

function getRandomLane(existingObstacles: Obstacle[], outOfServiceLane: number): number {
  const availableLanes = Array.from({ length: ROAD_LANES }, (_, i) => i)
    .filter((lane: number) => lane !== outOfServiceLane)
    .filter((lane: number) =>
      !existingObstacles.some((obs: Obstacle) => obs.lane === lane && obs.x > GAME_WIDTH - 2 * OBSTACLE_WIDTH)
    );
  if (availableLanes.length === 0) return Math.floor(Math.random() * ROAD_LANES);
  return availableLanes[Math.floor(Math.random() * availableLanes.length)];
}

function getRandomObstacleType() {
  return OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
}

// SVG for simple human (front view, no background)
const SimpleManSVG = (
  <svg width={PLAYER_WIDTH} height={PLAYER_HEIGHT} viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <circle cx="30" cy="16" r="12" fill="#f5d7b7" stroke="#222" strokeWidth="2" />
    {/* Body */}
    <rect x="18" y="28" width="24" height="28" rx="10" fill="#1976d2" stroke="#222" strokeWidth="2" />
    {/* Arms */}
    <rect x="6" y="32" width="12" height="10" rx="5" fill="#f5d7b7" stroke="#222" strokeWidth="2" />
    <rect x="42" y="32" width="12" height="10" rx="5" fill="#f5d7b7" stroke="#222" strokeWidth="2" />
    {/* Legs */}
    <rect x="20" y="56" width="7" height="14" rx="3" fill="#333" />
    <rect x="33" y="56" width="7" height="14" rx="3" fill="#333" />
    {/* Laptop bag (side) */}
    <rect x="38" y="38" width="10" height="18" rx="4" fill="#ffb300" stroke="#222" strokeWidth="2" />
  </svg>
);

// SVG for woman (side view, simple)
const SimpleWomanSVG = (
  <svg width={PLAYER_WIDTH} height={PLAYER_HEIGHT} viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <circle cx="30" cy="16" r="12" fill="#f5d7b7" stroke="#222" strokeWidth="2" />
    {/* Hair */}
    <ellipse cx="30" cy="16" rx="13" ry="13" fill="#6d4c41" opacity="0.7" />
    {/* Body */}
    <rect x="18" y="28" width="24" height="28" rx="10" fill="#e91e63" stroke="#222" strokeWidth="2" />
    {/* Arms */}
    <rect x="6" y="32" width="12" height="10" rx="5" fill="#f5d7b7" stroke="#222" strokeWidth="2" />
    <rect x="42" y="32" width="12" height="10" rx="5" fill="#f5d7b7" stroke="#222" strokeWidth="2" />
    {/* Legs */}
    <rect x="20" y="56" width="7" height="14" rx="3" fill="#333" />
    <rect x="33" y="56" width="7" height="14" rx="3" fill="#333" />
    {/* Bag */}
    <rect x="38" y="38" width="10" height="18" rx="4" fill="#1976d2" stroke="#222" strokeWidth="2" />
  </svg>
);

// SVG for purple bike
const PurpleBikeSVG = (
  <svg width="60" height="40" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="32" r="7" fill="#a259f7" stroke="#333" strokeWidth="2" />
    <circle cx="45" cy="32" r="7" fill="#a259f7" stroke="#333" strokeWidth="2" />
    <rect x="20" y="25" width="20" height="6" rx="3" fill="#a259f7" stroke="#333" strokeWidth="2" />
    <rect x="28" y="10" width="4" height="18" rx="2" fill="#a259f7" stroke="#333" strokeWidth="2" />
    <rect x="32" y="10" width="4" height="18" rx="2" fill="#a259f7" stroke="#333" strokeWidth="2" />
    <rect x="25" y="5" width="10" height="8" rx="3" fill="#a259f7" stroke="#333" strokeWidth="2" />
  </svg>
);

// Level 1 Component
function Level1({ onComplete, onGameOver }: { onComplete: () => void, onGameOver: () => void }) {
  const [playerLane, setPlayerLane] = useState(PLAYER_START_LANE);
  const [playerX, setPlayerX] = useState(30);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [gameState, setGameState] = useState<'welcome' | 'playing' | 'gameover' | 'levelcomplete'>('welcome');
  const [levelInfo] = useState('Level 1: Traffic Dodge');
  const [showInstructions, setShowInstructions] = useState(true);
  const [rain, setRain] = useState<Raindrop[]>([]);
  const [isRaining, setIsRaining] = useState(false);
  const [outOfServiceLane] = useState(() => Math.floor(Math.random() * ROAD_LANES));
  const gameRef = useRef(null);
  const lastObstacleTimeRef = useRef(Date.now());

  // Handle keyboard input
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        const nextLane = playerLane - 1;
        // Prevent moving into out of service lane
        if (nextLane >= 0 && nextLane !== outOfServiceLane) setPlayerLane(nextLane);
      } else if (e.key === 'ArrowDown') {
        const nextLane = playerLane + 1;
        // Prevent moving into out of service lane
        if (nextLane < ROAD_LANES && nextLane !== outOfServiceLane) setPlayerLane(nextLane);
      }
      setShowInstructions(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerLane, gameState, outOfServiceLane]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    let animationId: number;

    const loop = () => {
      // Check win condition first
      if (playerX + PLAYER_WIDTH >= LEVEL1_DISTANCE - 10 && gameState === 'playing') {
        setGameState('levelcomplete');
        onComplete();
        return; // Stop processing this frame after winning
      }

      // Only proceed with game logic if game is playing
      if (gameState === 'playing') {
        // Move player forward
        setPlayerX(prev => prev + PLAYER_SPEED);

        // Move obstacles
        setObstacles(prev =>
          prev
            .map(obs => ({ ...obs, x: obs.x - obs.speed }))
            .filter(obs => obs.x + OBSTACLE_WIDTH > 0)
        );

        // Spawn new obstacles at a consistent rate
        const now = Date.now();
        if (now - lastObstacleTimeRef.current > 700) {
          setObstacles(prev => {
            const { type, icon } = getRandomObstacleType();
            const lane = getRandomLane(prev, outOfServiceLane);
            return [
              ...prev,
              {
                type: type as 'zepto' | 'auto' | 'cow',
                icon,
                lane,
                x: GAME_WIDTH,
                speed: OBSTACLE_SPEEDS[type as 'zepto' | 'auto' | 'cow'],
                y: 0,
              },
            ];
          });
          lastObstacleTimeRef.current = now;
        }

        // Collision detection for moving obstacles
        obstacles.forEach(obs => {
          if (
            obs.lane === playerLane &&
            obs.x < playerX + PLAYER_WIDTH &&
            obs.x + OBSTACLE_WIDTH > playerX
          ) {
            setGameState('gameover');
            onGameOver();
            // No need for return here, gameState change will stop future processing
          }
        });

        // Rain logic: randomly start/stop rain
        if (Math.random() < 0.003 && !isRaining) {
          setIsRaining(true);
          setTimeout(() => setIsRaining(false), 3000 + Math.random() * 3000);
        }
        if (isRaining) {
          setRain(prev => {
            const moved = prev.map(drop => ({ ...drop, y: drop.y + drop.speed }));
            const filtered = moved.filter(drop => drop.y < GAME_HEIGHT + 80);
            const newDrops: Raindrop[] = [];
            for (let i = 0; i < 6; i++) {
              newDrops.push({
                x: Math.random() * GAME_WIDTH,
                y: 0,
                length: 20 + Math.random() * 20,
                speed: 8 + Math.random() * 4,
                opacity: 0.3 + Math.random() * 0.5,
              });
            }
            return [...filtered, ...newDrops];
          });
        } else {
          setRain([]);
        }
      }

      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [playerLane, playerX, obstacles, gameState, outOfServiceLane, isRaining, onComplete, onGameOver]);

  // Reset for testing
  const handleRestart = () => {
    setPlayerLane(PLAYER_START_LANE);
    setPlayerX(30);
    setObstacles([]);
    setGameState('playing');
    setShowInstructions(true);
    setRain([]);
    setIsRaining(false);
  };

  // Start game from welcome
  const handleStartGame = () => {
    setGameState('playing');
    setPlayerLane(PLAYER_START_LANE);
    setPlayerX(30);
    setObstacles([]);
    setShowInstructions(true);
    setRain([]);
    setIsRaining(false);
  };

  return (
    <div style={{ width: GAME_WIDTH, height: GAME_HEIGHT + 80, margin: '40px auto', background: '#222', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px #0005', position: 'relative' }} ref={gameRef}>
      {/* Welcome Screen */}
      {gameState === 'welcome' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#222e',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
        }}>
          <div style={{ fontSize: 38, fontWeight: 'bold', marginBottom: 24, fontFamily: 'Noto Sans Kannada, sans-serif' }}>
            ಬೆಂಗಳೂರು ಕ್ರಾನಿಕಲ್ಸ್‌ಗೆ ಸ್ವಾಗತ
          </div>
          <div style={{ fontSize: 20, marginBottom: 24, textAlign: 'center' }}>
            <b>Level 1:</b> Traffic Dodge<br />
            <b>Objective:</b> Reach the end of the road.<br />
            <b>Controls:</b> Use <b>&uarr;</b> and <b>&darr;</b> to dodge.<br />
            Avoid the Out of Service lane.<br />
          </div>
          <button onClick={() => setGameState('playing')} style={{ fontSize: 24, padding: '12px 40px', borderRadius: 12, background: '#a259f7', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: 16 }}>Start Game</button>
        </div>
      )}
      {/* Level Nameboard */}
      <div style={{
        width: '100%',
        height: 60,
        background: 'linear-gradient(90deg, #1976d2 60%, #00bfae 100%)',
        color: 'white',
        fontWeight: 'bold',
        fontSize: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: 1,
        boxShadow: '0 2px 8px #0003',
        zIndex: 2,
      }}>{levelInfo}</div>
      {/* Instructions */}
      {showInstructions && gameState === 'playing' && (
        <div style={{
          position: 'absolute',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff9',
          color: '#222',
          fontSize: 20,
          padding: '10px 32px',
          borderRadius: 12,
          zIndex: 3,
          boxShadow: '0 2px 8px #0002',
        }}>
          Use <b>↑</b> and <b>↓</b> to dodge. Reach the end!
        </div>
      )}
      {/* Road */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: 0,
        width: '100%',
        height: GAME_HEIGHT,
        background: 'linear-gradient(180deg, #444 80%, #333 100%)',
        zIndex: 1,
      }}>
        {/* Dashed lane lines */}
        {[...Array(ROAD_LANES - 1)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: (i + 1) * LANE_HEIGHT - 4,
              left: 0,
              width: '100%',
              height: 8,
              background: 'repeating-linear-gradient(90deg, #fff 0 30px, transparent 30px 60px)',
              opacity: 0.5,
            }}
          />
        ))}
        {/* Out of Service Lane (red) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: outOfServiceLane * LANE_HEIGHT,
            width: '100%',
            height: LANE_HEIGHT,
            background: 'red',
            opacity: 0.7,
            zIndex: 2,
            borderBottom: '4px dashed #a259f7',
            borderTop: '4px dashed #a259f7',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Out of Service Signboard */}
          <div style={{
            position: 'absolute',
            left: 30,
            top: 20,
            background: '#fff',
            color: '#a259f7',
            fontWeight: 'bold',
            fontSize: 22,
            padding: '8px 18px',
            borderRadius: 10,
            border: '2px solid #a259f7',
            boxShadow: '0 2px 8px #0003',
            zIndex: 3,
          }}>
            Out of Service
          </div>
        </div>
      </div>
      {/* Rain effect */}
      {gameState === 'playing' && isRaining && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: GAME_WIDTH, height: GAME_HEIGHT + 80, pointerEvents: 'none', zIndex: 10 }}>
          {rain.map((drop, i) => (
            <line
              key={i}
              x1={drop.x}
              y1={drop.y}
              x2={drop.x}
              y2={drop.y + drop.length}
              stroke="#4fc3f7"
              strokeWidth="3"
              strokeLinecap="round"
              opacity={drop.opacity}
            />
          ))}
        </svg>
      )}
      {/* Player (SVG) */}
      {gameState === 'playing' && (
        <div
          style={{
            position: 'absolute',
            left: playerX,
            top: 60 + playerLane * LANE_HEIGHT + (LANE_HEIGHT - PLAYER_HEIGHT) / 2,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            zIndex: 3,
            background: 'transparent',
            border: 'none',
            borderRadius: 16,
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {SimpleManSVG}
        </div>
      )}
      {/* Obstacles (no background, just icon or SVG) */}
      {gameState === 'playing' && obstacles.map((obs, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: obs.x,
            top: 60 + obs.lane * LANE_HEIGHT + (LANE_HEIGHT - OBSTACLE_HEIGHT) / 2,
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
            zIndex: 2,
          }}
        >
          {obs.type === 'zepto' ? PurpleBikeSVG : <span>{obs.icon}</span>}
        </div>
      ))}
      {/* Game Over / Level Complete */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          width: '100%',
          height: GAME_HEIGHT,
          background: '#0008',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 'bold',
          zIndex: 10,
        }}>
          Game Over!<br />
          <button onClick={handleRestart} style={{ marginTop: 24, fontSize: 20, padding: '8px 24px', borderRadius: 8, background: '#a259f7', color: '#fff', border: 'none', cursor: 'pointer' }}>Restart</button>
        </div>
      )}
      {gameState === 'levelcomplete' && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          width: '100%',
          height: GAME_HEIGHT,
          background: '#0008',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 'bold',
          zIndex: 10,
        }}>
          Level 1 Complete!<br />
        </div>
      )}
    </div>
  );
}

// Level 2 Component (skeleton)
function Level2({ onComplete, onGameOver }: { onComplete: () => void; onGameOver: () => void }) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [playerLane, setPlayerLane] = useState(PLAYER_START_LANE);
  const [playerX, setPlayerX] = useState(30);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [gameState, setGameState] = useState<'welcome' | 'playing' | 'gameover' | 'levelcomplete'>('welcome');
  const [trainLeaving, setTrainLeaving] = useState(false);
  const [doorBlink, setDoorBlink] = useState(false);
  const gameRef = useRef(null);
  const lastObstacleTimeRef = useRef(Date.now());

  // Progress
  const progress = Math.min(1, (playerX + PLAYER_WIDTH) / (LEVEL2_DISTANCE - 40));

  // Handle keyboard input
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Player moves left and right on the platform
      if (e.key === 'ArrowLeft') setPlayerX(prev => Math.max(0, prev - 10));
      if (e.key === 'ArrowRight') setPlayerX(prev => Math.min(GAME_WIDTH - PLAYER_WIDTH, prev + 10));
      // Vertical movement is not needed in Level 2 platform
      setShowInstructions(false); // Hide instructions on first move
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, playerX]);

  // Train door blinking animation
  useEffect(() => {
    if (progress > 0.8 && gameState === 'playing') {
      const interval = setInterval(() => setDoorBlink(b => !b), 400);
      return () => clearInterval(interval);
    } else {
      setDoorBlink(false);
    }
  }, [progress, gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    let animationId: number;
    let trainTimeout: number;

    // Random train leaves early (keep for challenge)
    if (Math.random() < 0.1) {
      trainTimeout = setTimeout(() => {
        setTrainLeaving(true);
        setGameState('gameover');
        onGameOver();
      }, 6000 + Math.random() * 4000); // Train can leave between 6-10 seconds
    }

    // Main loop
    const loop = () => {
      // Move obstacles downwards (falling)
      setObstacles(prev =>
        prev
          .map(obs => ({ ...obs, y: obs.y + obs.speed }))
          .filter(obs => obs.y < GAME_HEIGHT + OBSTACLE_HEIGHT) // Filter out obstacles that have fallen off screen
      );

      // Spawn new obstacles (falling from top at random x)
      const now = Date.now();
      if (now - lastObstacleTimeRef.current > 500) { // Increased spawn rate for falling obstacles
        const types = [
          { type: 'crowd', icon: '👥' },
          { type: 'teastall', icon: '🍵' },
          { type: 'watchman', icon: '🧑‍✈️' },
          { type: 'police', icon: '👮' },
        ];
        const { type, icon } = types[Math.floor(Math.random() * types.length)];
        // Spawn at random x position above the game area
        const x = Math.random() * (GAME_WIDTH - OBSTACLE_WIDTH);
        const speed = 5 + Math.random() * 3; // Random falling speed
        setObstacles(prev => [
          ...prev,
          {
            type,
            icon,
            lane: 0, // Lane is not used for vertical positioning anymore, but keep in interface
            x,
            y: -OBSTACLE_HEIGHT, // Start above the screen
            speed,
          },
        ]);
        lastObstacleTimeRef.current = now;
      }

      // Collision detection (check for overlap in x and y)
      const playerBottom = 120 + playerLane * LANE_HEIGHT + (LANE_HEIGHT - PLAYER_HEIGHT) / 2 + PLAYER_HEIGHT;
      const playerTop = 120 + playerLane * LANE_HEIGHT + (LANE_HEIGHT - PLAYER_HEIGHT) / 2;
      const playerLeft = playerX;
      const playerRight = playerX + PLAYER_WIDTH;

      obstacles.forEach(obs => {
        const obstacleBottom = obs.y + OBSTACLE_HEIGHT;
        const obstacleTop = obs.y;
        const obstacleLeft = obs.x;
        const obstacleRight = obs.x + OBSTACLE_WIDTH;

        // Check for overlap
        if (
          playerRight > obstacleLeft &&
          playerLeft < obstacleRight &&
          playerBottom > obstacleTop &&
          playerTop < obstacleBottom
        ) {
          // Collision detected
          if (obs.type === 'crowd') {
            // User gets out only if hitting crowd
            setGameState('gameover');
            onGameOver();
          } else if (obs.type === 'teastall') {
            // If user hits coffee (tea stall) he should walk faster for 2 seconds
            // Increase player speed temporarily
            setPlayerX(prev => prev + 60); // Boost player forward by 60 pixels
            // Remove the hit tea stall obstacle
            setObstacles(prev => prev.filter(o => o !== obs));
          } else if (obs.type === 'watchman') {
            // Collision with watchman has no effect
            // We can add specific logic for watchman if needed later
          } else if (obs.type === 'police') {
            // If user gets encounter with police he should get out
            setGameState('gameover');
            onGameOver();
          }
          // No action for other obstacles like watchman based on current requirements
        }
      });

      // Win condition: reach train (playerX reaching near the right edge)
      if (gameState === 'playing' && playerX + PLAYER_WIDTH >= GAME_WIDTH - 40) { // Adjusted condition to use GAME_WIDTH
        setGameState('levelcomplete');
        onComplete();
      }

      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(trainTimeout);
    };
  }, [playerX, playerLane, obstacles, gameState, onComplete, onGameOver]);

  // Reset Level 2 game
  const handleRestart = () => {
    setPlayerLane(PLAYER_START_LANE);
    setPlayerX(30);
    setObstacles([]);
    setGameState('playing');
    setTrainLeaving(false);
    setDoorBlink(false);
  };

  // Metro platform background
  return (
    <div style={{ width: GAME_WIDTH, height: GAME_HEIGHT + 80, margin: '40px auto', position: 'relative', background: 'linear-gradient(180deg, #e3f2fd 60%, #bdbdbd 100%)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px #0005', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Welcome Screen */}
      {gameState === 'welcome' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#222e',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
        }}>
          <div style={{ fontSize: 30, fontWeight: 'bold', marginBottom: 16 }}>
            Level 2: Namma Metro Rush
          </div>
          <div style={{ fontSize: 20, marginBottom: 24, textAlign: 'center' }}>
            <b>Objective:</b> Reach the Metro Train.<br />
            <b>Controls:</b> Use <b>&larr;</b> and <b>&rarr;</b> to move left and right.<br />
            <b>Obstacles:</b> Avoid 👥 (Crowd) and 👮 (Police).<br />Touching 🍵 (Tea Stall) gives you a boost.<br />
          </div>
          <button onClick={() => setGameState('playing')} style={{ fontSize: 24, padding: '12px 40px', borderRadius: 12, background: '#a259f7', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Start</button>
        </div>
      )}
      {/* Progress Bar */}
      <div style={{ position: 'absolute', top: 16, left: 40, width: GAME_WIDTH - 160, height: 18, background: '#eee', borderRadius: 10, boxShadow: '0 1px 4px #0002', zIndex: 10 }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: 'linear-gradient(90deg, #8e24aa, #00bfae)', borderRadius: 10, transition: 'width 0.2s' }} />
      </div>
      {/* Top bar title */}
      <div style={{
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 200,
        background: 'linear-gradient(90deg, #8e24aa 60%, #00bfae 100%)',
        color: 'white',
        fontWeight: 'bold',
        fontSize: 22,
        letterSpacing: 1,
        boxShadow: '0 2px 8px #0003',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        Level 2: Namma Metro Rush
      </div>
      {/* Metro Wall & Pillars */}
      <div style={{ position: 'absolute', top: 60, left: 0, width: '100%', height: 60, background: 'linear-gradient(90deg, #bdbdbd 80%, #e3e3e3 100%)', zIndex: 1, display: 'flex', alignItems: 'center' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ width: 40, height: 60, background: '#a7a7a7', margin: '0 120px', borderRadius: 8, opacity: 0.3 }} />
        ))}
      </div>
      {/* Platform Floor (tiles) */}
      <div style={{ position: 'absolute', top: GAME_HEIGHT, left: 0, width: '100%', height: 40, background: 'repeating-linear-gradient(90deg, #e0e0e0 0 40px, #bdbdbd 40px 80px)', borderTop: '4px solid #8e24aa', zIndex: 3 }} />
      {/* Platform Edge */}
      <div style={{ position: 'absolute', top: GAME_HEIGHT - 10, left: 0, width: '100%', height: 10, background: 'repeating-linear-gradient(90deg, #ffd600 0 20px, #fff 20px 40px)', zIndex: 4 }} />
      {/* Train at the end (image) */}
      <div style={{ position: 'absolute', right: 0, top: 100, width: 160, height: GAME_HEIGHT - 60, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
        <img
          src={metroImg}
          alt="Metro Train"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderLeft: '12px solid #fff',
            borderRadius: '0 32px 32px 0',
            boxShadow: '-8px 0 24px #0002',
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 1,
          }}
        />
        {/* Blinking Door Overlay */}
        <div style={{
          position: 'absolute',
          left: 20,
          top: (GAME_HEIGHT - 60) / 2 - 40,
          width: 40,
          height: 80,
          background: doorBlink ? '#fff' : '#ffd600',
          border: '3px solid #8e24aa',
          borderRadius: 12,
          boxShadow: '0 2px 8px #0003',
          zIndex: 2,
          transition: 'background 0.2s',
        }} />
      </div>
      {/* Obstacles (falling from top, positioned by x and y) */}
      {obstacles.map((obs, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: obs.x, // Use obstacle's x
            top: 120 + obs.y, // Use obstacle's y, offset by platform height
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            fontSize: 48,
            zIndex: 6,
            background: obs.type === 'crowd' ? '#fff3' : obs.type === 'teastall' ? '#ffe0b2' : '#b3e5fc',
            borderRadius: 18,
            boxShadow: '0 2px 8px #0002',
            border: '2px solid #fff',
            padding: 8,
          }}
        >
          {/* Shadow/base */}
          <div style={{ position: 'absolute', left: 10, bottom: 8, width: OBSTACLE_WIDTH - 20, height: 14, background: 'rgba(0,0,0,0.13)', borderRadius: '50%', zIndex: 1 }} />
          <span style={{ position: 'relative', zIndex: 2 }}>{obs.icon}</span>
        </div>
      ))}
      {/* Player (woman SVG) with shadow, positioned by x and lane */}
      <div
        style={{
          position: 'absolute',
          left: playerX, // Use player's x
          top: 120 + playerLane * LANE_HEIGHT + (LANE_HEIGHT - PLAYER_HEIGHT) / 2, // Use player's lane for vertical positioning
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          zIndex: 10,
          background: 'transparent',
          border: 'none',
          borderRadius: 16,
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Shadow */}
        <div style={{ position: 'absolute', left: 10, top: PLAYER_HEIGHT - 10, width: PLAYER_WIDTH - 20, height: 18, background: 'rgba(0,0,0,0.18)', borderRadius: '50%', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 2 }}>{SimpleWomanSVG}</div>
      </div>
      {/* Game Over / Level Complete */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          width: '100%',
          height: GAME_HEIGHT,
          background: '#0008',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 'bold',
          zIndex: 20,
        }}>
          {trainLeaving ? 'Train Left! Missed it! Please wait for the next train.' : 'Game Over!'}<br />
          <button onClick={handleRestart} style={{ marginTop: 24, fontSize: 20, padding: '8px 24px', borderRadius: 8, background: '#a259f7', color: '#fff', border: 'none', cursor: 'pointer' }}>Restart</button>
        </div>
      )}
      {gameState === 'levelcomplete' && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          width: '100%',
          height: GAME_HEIGHT,
          background: '#0008',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 'bold',
          zIndex: 20,
        }}>
          Level 2 Complete!<br />
        </div>
      )}
    </div>
  );
}

// Level 3 Component (skeleton)
function Level3({ onComplete, onGameOver }: { onComplete: () => void; onGameOver: () => void }) {
  const [showInstructions, setShowInstructions] = useState(true);
  const GAME_WIDTH_LEVEL3 = 1100;
  const GAME_HEIGHT_LEVEL3 = 600; // Adjust height for pitch
  const PLAYER_WIDTH_LEVEL3 = 80;
  const PLAYER_HEIGHT_LEVEL3 = 100;
  const PLAYER_START_X_LEVEL3 = GAME_WIDTH_LEVEL3 / 2 - PLAYER_WIDTH_LEVEL3 / 2; // Start in the middle horizontally
  const PLAYER_START_Y_LEVEL3 = GAME_HEIGHT_LEVEL3 - PLAYER_HEIGHT_LEVEL3 - 20; // Start near the bottom
  const PLAYER_SPEED_LEVEL3 = 3; // Reduced player speed
  const PLAYER_HORIZONTAL_SPEED = 8; // Speed for left/right movement
  const TROPHY_REACH_THRESHOLD = 50; // Distance from trophy to win

  const [playerX, setPlayerX] = useState(PLAYER_START_X_LEVEL3);
  const [playerY, setPlayerY] = useState(PLAYER_START_Y_LEVEL3);
  const [gameState, setGameState] = useState<'welcome' | 'playing' | 'gameover' | 'levelcomplete'>('welcome');
  const [obstacles, setObstacles] = useState<Obstacle[]>([]); // Add state for obstacles
  const [cskSpawnCount, setCskSpawnCount] = useState(0); // Track spawned CSK obstacles
  const gameRef = useRef(null);
  const lastObstacleTimeRef = useRef(Date.now()); // To control obstacle spawning rate

  // Handle keyboard input (left/right movement)
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setPlayerX(prev => Math.max(0, prev - PLAYER_HORIZONTAL_SPEED));
      } else if (e.key === 'ArrowRight') {
        setPlayerX(prev => Math.min(GAME_WIDTH_LEVEL3 - PLAYER_WIDTH_LEVEL3, prev + PLAYER_HORIZONTAL_SPEED));
      }
      setShowInstructions(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, playerX]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    let animationId: number;

    const loop = () => {
      // Move player forward automatically (decreasing Y)
      setPlayerY(prev => prev - PLAYER_SPEED_LEVEL3);

      // Obstacle spawning and movement
      const now = Date.now();
      if (now - lastObstacleTimeRef.current > 2000 && cskSpawnCount < 2) { // Spawn new obstacle every 2 seconds, max 2
        setObstacles(prev => {
          const newObstacle = {
            type: 'csk',
            icon: cskLogo, // Use the imported image
            // Constrain spawning to the pitch width (adjust these values based on your pitch positioning and size)
            x: GAME_WIDTH_LEVEL3 / 2 - (GAME_WIDTH_LEVEL3 * 0.15) / 2 + Math.random() * (GAME_WIDTH_LEVEL3 * 0.15 - OBSTACLE_WIDTH), // Random horizontal position within pitch bounds
            y: 0, // Start at the top of the game area
            speed: 3 + Math.random() * 1, // Slightly reduced speed for fewer obstacles
            lane: 0, // Lane not used in this level but required by type
          };
          setCskSpawnCount(prev => prev + 1); // Increment spawn count
          return [...prev, newObstacle];
        });
        lastObstacleTimeRef.current = now;
      }

      // Move obstacles downwards
      setObstacles(prev =>
        prev
          .map(obs => ({ ...obs, y: obs.y + obs.speed }))
          .filter(obs => obs.y < GAME_HEIGHT_LEVEL3 + OBSTACLE_HEIGHT) // Remove obstacles that are off-screen
      );

      // Collision detection
      obstacles.forEach(obs => {
        // Assuming simple rectangular collision for now
        const playerRight = playerX + PLAYER_WIDTH_LEVEL3;
        const playerLeft = playerX;
        const playerBottom = playerY + PLAYER_HEIGHT_LEVEL3;
        const playerTop = playerY;

        const obstacleRight = obs.x + OBSTACLE_WIDTH; // Assuming OBSTACLE_WIDTH is defined
        const obstacleLeft = obs.x;
        const obstacleBottom = obs.y + OBSTACLE_HEIGHT; // Assuming OBSTACLE_HEIGHT is defined
        const obstacleTop = obs.y;

        if (
          playerRight > obstacleLeft &&
          playerLeft < obstacleRight &&
          playerBottom > obstacleTop &&
          playerTop < obstacleBottom
        ) {
          // Collision detected
          if (obs.type === 'csk') {
            // If player hits CSK, game over
            setGameState('gameover');
            onGameOver();
          }
          // TODO: Handle collision with ESCN flags here later
        }
      });

      // Win condition: reach the trophy (playerY is close to the top)
      if (playerY <= TROPHY_REACH_THRESHOLD) {
        setGameState('levelcomplete');
        onComplete();
      }

      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [playerY, gameState, onComplete, onGameOver]);

  // Reset Level 3 game
  const handleRestart = () => {
    setPlayerX(PLAYER_START_X_LEVEL3);
    setPlayerY(PLAYER_START_Y_LEVEL3);
    setObstacles([]);
    setGameState('playing');
    setCskSpawnCount(0); // Reset spawn count on restart
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (gameState === 'levelcomplete' && audioRef.current) {
      audioRef.current.play();
    }
  }, [gameState]);

  return (
    <div style={{ width: GAME_WIDTH_LEVEL3, height: GAME_HEIGHT_LEVEL3, margin: '60px auto 40px auto', position: 'relative', background: '#a4c2a5', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 4px 24px #0005' }} ref={gameRef}>
      {/* Welcome Screen */}
      {gameState === 'welcome' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#222e',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
        }}>
          <div style={{ fontSize: 30, fontWeight: 'bold', marginBottom: 16 }}>
            LEVEL 3: RCB Finale
          </div>
          <div style={{ fontSize: 20, marginBottom: 24, textAlign: 'center' }}>
            <b>Objective:</b> Reach the Trophy.<br />
            <b>Controls:</b> Use <b>&larr;</b> and <b>&rarr;</b> to move left and right.<br />
            <b>Obstacles:</b> Avoid CSK Logo To win.<br />
          </div>
          <button onClick={() => setGameState('playing')} style={{ fontSize: 24, padding: '12px 40px', borderRadius: 12, background: '#e01a4f', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Start</button>
        </div>
      )}
      {/* Chinnaswamy Pitch (simple green background for now) */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: GAME_WIDTH_LEVEL3 * 0.15, height: GAME_HEIGHT_LEVEL3 * 0.9, background: 'linear-gradient(180deg, #8b4513 0%, #a0522d 100%)', zIndex: 0, borderRadius: '10px' }} />
      {/* Boundary Lines (simple white lines) */}
      <div style={{ position: 'absolute', top: 10, left: 10, width: GAME_WIDTH_LEVEL3 - 20, height: GAME_HEIGHT_LEVEL3 - 20, border: '4px dashed #fff', zIndex: 1, borderRadius: '50%' }} />
      {/* Trophy Placeholder at the top */}
      <div style={{ position: 'absolute', top: 20, left: GAME_WIDTH_LEVEL3 / 2 - 30, width: 60, height: 80, background: 'red', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, zIndex: 2 }}>🏆</div>

      {/* Player (placeholder) */}
      {gameState === 'playing' && (
        <div
          style={{
            position: 'absolute',
            left: playerX,
            top: playerY,
            width: PLAYER_WIDTH_LEVEL3,
            height: PLAYER_HEIGHT_LEVEL3,
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {SimpleManSVG}
        </div>
      )}

      {/* Obstacles (CSK players) */}
      {gameState === 'playing' && obstacles.map((obs, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: obs.x,
            top: obs.y,
            width: OBSTACLE_WIDTH, // Assuming OBSTACLE_WIDTH is defined or use a new constant
            height: OBSTACLE_HEIGHT, // Assuming OBSTACLE_HEIGHT is defined or use a new constant
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40, // Adjust size as needed
            zIndex: 4, // Above player
          }}
        >
          {obs.type === 'csk' ? <img src={obs.icon} alt="CSK Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span>{obs.icon}</span>} {/* Render image or emoji based on type */}
        </div>
      ))}

      {/* Game Over / Level Complete */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#0008',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 'bold',
          zIndex: 10,
        }}>
          Game Over!<br />
          <button onClick={handleRestart} style={{ marginTop: 24, fontSize: 20, padding: '8px 24px', borderRadius: 8, background: '#e01a4f', color: '#fff', border: 'none', cursor: 'pointer' }}>Restart</button>
        </div>
      )}
      {gameState === 'levelcomplete' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#0008',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 'bold',
          zIndex: 10,
        }}>
          Level 3 Complete! Thank you for playing!<br />
        </div>
      )}
      {/* Firecracker effect on win */}
      {gameState === 'levelcomplete' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 20,
          pointerEvents: 'none', // Allow clicks to pass through
          overflow: 'hidden',
        }}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '10px',
                height: '10px',
                backgroundColor: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Random color
                borderRadius: '50%',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `firecracker ${1 + Math.random() * 1}s ease-out forwards`,
                animationDelay: `${Math.random() * 1}s`,
              }}
            />
          ))}
        </div>
      )}
      {/* Audio element for win sound */}
      <audio ref={audioRef} src="./rcb_win.mp3" preload="auto" />

      {/* Level Nameboard (LEVEL 3 ESCN) */}
      <div style={{
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 200,
        background: 'linear-gradient(90deg, #e01a4f 60%, #ff4500 100%)',
        color: 'white',
        fontWeight: 'bold',
        fontSize: 22,
        letterSpacing: 1,
        boxShadow: '0 2px 8px #0003',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>LEVEL 3 ESCN</div>
    </div>
  );
}

function App() {
  const [level, setLevel] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  const [nextLevel, setNextLevel] = useState(2);
  const [isGameOver, setIsGameOver] = useState(false);

  if (showTransition) {
    setTimeout(() => {
      setShowTransition(false);
      setLevel(nextLevel);
    }, 2000);
    return (
      <div style={{ width: GAME_WIDTH, height: GAME_HEIGHT + 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 'bold', color: '#8e24aa', background: '#fff', borderRadius: 16 }}>
        {nextLevel === 2 ? 'Get ready for Level 2: Namma Metro Rush!' : 'Get ready for Level 3: RCB Finale!'}
      </div>
    );
  }

  if (level === 1) {
    return <Level1 onComplete={() => { setShowTransition(true); setNextLevel(2); }} onGameOver={() => { setIsGameOver(true); }} />;
  }

  if (level === 2) {
    return <Level2 onComplete={() => { setShowTransition(true); setNextLevel(3); }} onGameOver={() => { setIsGameOver(true); }} />;
  }

  if (level === 3) {
    return <Level3 onComplete={() => { console.log('Game Complete!'); }} onGameOver={() => { setIsGameOver(true); }} />;
  }

  // Handle game over state from levels
  if (isGameOver) {
    return (
      <div style={{ width: GAME_WIDTH, height: GAME_HEIGHT + 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 'bold', color: 'red', background: '#fff', borderRadius: 16 }}>
        Game Over! Thanks for playing.<br />
        <button onClick={() => setLevel(1)} style={{ marginTop: 20, fontSize: 24, padding: '10px 30px', borderRadius: 10, background: '#e01a4f', color: '#fff', border: 'none', cursor: 'pointer' }}>Play Again</button>
      </div>
    );
  }

  return null;
}

export default App;