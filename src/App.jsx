
import React, { useState, useEffect, useRef } from "react";

const GRAVITY = 3;
const JUMP_HEIGHT = 50;
const PIPE_WIDTH = 100;
const PIPE_GAP = 180;
const PIPE_SPEED = 3;
const BIRD_SIZE = 50;
const BIRD_X = 500;
const ROTATION_SPEED = 3;
const MAX_ROTATION = 25;
const JUMP_ROTATION = -25;

export default function App() {
  const [birdY, setBirdY] = useState(window.innerHeight / 2);
  const [rotation, setRotation] = useState(0);
  const [pipes, setPipes] = useState([{ x: window.innerWidth, height: 200, passed: false }]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("highScore")) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [muted, setMuted] = useState(false);


  // --- Sound refs ---
  const flapSound = useRef("/flap,mp3");
  const scoreSound = useRef(null);
  const hitSound = useRef("/hit.mp3");
  const bgMusic = useRef("/bgmusic.mp3");

  useEffect(() => {
    flapSound.current = new Audio("/flap.mp3");
    scoreSound.current = new Audio("/point.mp3");
    hitSound.current = new Audio("/hit.mp3");
    bgMusic.current = new Audio("/bgmusic.mp3");

    flapSound.current.volume = 0.9;
    scoreSound.current.volume = 0.4;
    hitSound.current.volume = 0.9;
    bgMusic.current.volume = 0.25;

    bgMusic.current.loop = true;
  }, []);



  useEffect(() => {
    const allSounds = [flapSound, scoreSound, hitSound, bgMusic];
    allSounds.forEach(ref => {
      if (ref.current) {
        ref.current.muted = muted;
      }
    });
  }, [muted]);



  // --- Background music control ---
  useEffect(() => {
    if (!bgMusic.current) return;

    if (started && !gameOver) {
      bgMusic.current.play().catch(() => { }); // play when game is active
    } else {
      bgMusic.current.pause(); // pause when not playing
      bgMusic.current.currentTime = 0; // reset to start
    }
  }, [started, gameOver]);

  // --- Window resize ---
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Gravity ---
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setBirdY(prev => Math.min(prev + GRAVITY, dimensions.height - BIRD_SIZE));
      setRotation(prev => Math.min(prev + ROTATION_SPEED, MAX_ROTATION));
    }, 30);
    return () => clearInterval(interval);
  }, [started, gameOver, dimensions.height]);

  // --- Pipes movement ---
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setPipes(prev => {
        let newPipes = prev.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }));
        const lastPipe = newPipes[newPipes.length - 1];
        if (lastPipe && lastPipe.x < dimensions.width - 500) {
          newPipes.push({
            x: dimensions.width,
            height: 100 + Math.random() * (dimensions.height - PIPE_GAP - 100),
            passed: false,
          });
        }
        return newPipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);
      });
    }, 30);
    return () => clearInterval(interval);
  }, [started, gameOver, dimensions.width, dimensions.height]);

  // --- Score update ---
  useEffect(() => {
    if (!started || gameOver) return;
    pipes.forEach(pipe => {
      if (pipe.x + PIPE_WIDTH < BIRD_X && !pipe.passed) {
        if (scoreSound.current) {
          scoreSound.current.currentTime = 0;
          scoreSound.current.play();
        }
        setScore(prev => prev + 1);
        pipe.passed = true;
      }
    });
  }, [pipes, started, gameOver]);




  // --- Collision detection ---
  useEffect(() => {
    if (!started || gameOver) return;
    pipes.forEach(pipe => {
      if (
        BIRD_X + BIRD_SIZE > pipe.x &&
        BIRD_X < pipe.x + PIPE_WIDTH &&
        (birdY < pipe.height || birdY + BIRD_SIZE > pipe.height + PIPE_GAP)
      ) {
        handleGameOver();
      }
    });
    if (birdY >= dimensions.height - BIRD_SIZE) handleGameOver();
  }, [birdY, pipes, dimensions.height, started, gameOver]);

  const handleGameOver = () => {
    if (hitSound.current) {
      hitSound.current.currentTime = 0;
      hitSound.current.play();
    }
    setGameOver(true);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("highScore", score);
      setNewRecord(true);
    } else {
      setNewRecord(false);
    }
  };

  // --- Jump / restart ---
  const handleJump = () => {
    if (!started) return;
    if (!gameOver) {
      if (flapSound.current) {
        flapSound.current.currentTime = 0;
        flapSound.current.play();
      }
      setBirdY(prev => Math.max(prev - JUMP_HEIGHT, 0));
      setRotation(JUMP_ROTATION);
    } else {
      restartGame();
    }
  };

  const restartGame = () => {
    setBirdY(dimensions.height / 2);
    setRotation(0);
    setPipes([{ x: dimensions.width, height: 200, passed: false }]);
    setScore(0);
    setGameOver(false);
    setStarted(true);
    setNewRecord(false);
  };

  // --- Keyboard controls ---
  useEffect(() => {
    const handler = e => {
      if (e.code === "Space") {
        if (!started) setStarted(true);
        else handleJump();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, gameOver]);

  return (
    <div
      className="relative w-screen h-screen flex justify-center items-center overflow-hidden"
      onClick={() => (started ? handleJump() : setStarted(true))}
    >
      {/* 🔊 Mute Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted(prev => !prev);
        }}
        className="absolute top-5 left-40 z-50 backdrop-blur-md bg-white/10 border border-white/20 text-white p-3 rounded-full hover:bg-white/20 hover:scale-110 transition-all shadow-lg"
        title={muted ? 'Unmute' : 'Mute'}
      >
        <span className="text-2xl">{muted ? '🔇' : '🔊'}</span>
      </button>




      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: "url('/bg.jpg')",
          backgroundRepeat: "repeat-x",
          backgroundSize: "cover",
          filter: "brightness(0.6)",
        }}
      />

      {/* Bird */}
      {started && (
        <img
          src="/bird.jpg"
          alt="bird"
          className="absolute"
          style={{
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            top: birdY,
            left: BIRD_X,
            transform: `rotate(${rotation}deg)`,
            transition: "top 0.03s, transform 0.1s",
          }}
        />
      )}

      {/* Pipes */}
      {started &&
        pipes.map((pipe, idx) => (
          <React.Fragment key={idx}>
            {/* Top Pipe */}
            <div
              className="absolute"
              style={{
                left: pipe.x,
                top: 0,
                width: PIPE_WIDTH,
                height: pipe.height,
                background: "linear-gradient(to bottom, #7ED957, #2E7D32)",
                borderLeft: "3px solid #1B5E20",
                borderRight: "3px solid #1B5E20",
              }}
            />
            {/* Bottom Pipe */}
            <div
              className="absolute"
              style={{
                left: pipe.x,
                top: pipe.height + PIPE_GAP,
                width: PIPE_WIDTH,
                height: dimensions.height - pipe.height - PIPE_GAP,
                background: "linear-gradient(to bottom, #7ED957, #2E7D32)",
                borderLeft: "3px solid #1B5E20",
                borderRight: "3px solid #1B5E20",
              }}
            />



          </React.Fragment>
        ))}




      {/* Score */}
      {started && !gameOver && (
        <div className="absolute top-8 left-4 text-white font-bold text-3xl drop-shadow-[0_0_5px_#000]">
          Score: {score}
        </div>
      )}




      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/70 text-white text-center">
          <h1 className="text-5xl font-bold text-red-500 mb-4">GAME OVER</h1>
          <p className="text-2xl mb-2">Score: {score}</p>
          <p className="text-2xl mb-4">
            High Score: {highScore} {newRecord && "✨ New Record!"}
          </p>
          <p className="mt-4 text-lg opacity-80">Click or Press Space to Restart</p>
        </div>
      )}

      {/* Start Menu */}
      {!started && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/60 text-white">
          <h1 className="text-6xl font-extrabold text-yellow-100 mb-1">FLAPPY bird</h1>
          <img src="/bird.jpg" alt="bird" className="w-[70px] h-[70px] mb-4" />
          <button
            onClick={() => setStarted(true)}
            className="px-8 py-4 text-2xl font-bold bg-red-600 hover:bg-red-700 rounded-2xl mb-4"
          >
            START GAME
          </button>
          <p className="text-2xl">
            High Score: {highScore} {newRecord && "✨ New Record!"}
          </p>
        </div>
      )}
    </div>
  );
}




