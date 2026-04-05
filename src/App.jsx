import React, { useState, useEffect, useRef } from "react";
import Bird from "./Bird";
import Pipe from "./Pipe";
import Score from "./Score";
import GameOver from "./GameOver";
import StartMenu from "./StartMenu";
import MuteButton from "./MuteButton";

const GRAVITY = 3;
const JUMP_HEIGHT = 50;
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
  const [muted, setMuted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Sound refs
  const flapSound = useRef(null);
  const scoreSound = useRef(null);
  const hitSound = useRef(null);

  useEffect(() => {
    flapSound.current = new Audio("/flap.mp3");
    scoreSound.current = new Audio("/point.mp3");
    hitSound.current = new Audio("/hit.mp3");

    flapSound.current.volume = 0.3;
    scoreSound.current.volume = 0.4;
    hitSound.current.volume = 0.5;
  }, []);

  // Window resize
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Responsive sizes
  const BIRD_SIZE = Math.min(50, dimensions.width * 0.1);
  const BIRD_X = dimensions.width * 0.25;
  const PIPE_WIDTH = Math.min(100, dimensions.width * 0.1);
  const PIPE_GAP = Math.min(180, dimensions.height * 0.25);

  // Gravity
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setBirdY(prev => Math.min(prev + GRAVITY, dimensions.height - BIRD_SIZE));
      setRotation(prev => Math.min(prev + ROTATION_SPEED, MAX_ROTATION));
    }, 30);
    return () => clearInterval(interval);
  }, [started, gameOver, dimensions.height, BIRD_SIZE]);

  // Pipes movement
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setPipes(prev => {
        let newPipes = prev.map(pipe => ({ ...pipe, x: pipe.x - 3 }));
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
  }, [started, gameOver, dimensions.width, dimensions.height, PIPE_WIDTH, PIPE_GAP]);

  // Score update
  useEffect(() => {
    if (!started || gameOver) return;
    pipes.forEach(pipe => {
      if (pipe.x + PIPE_WIDTH < BIRD_X && !pipe.passed) {
        if (!muted && scoreSound.current) {
          scoreSound.current.currentTime = 0;
          scoreSound.current.play();
        }
        setScore(prev => prev + 1);
        pipe.passed = true;
      }
    });
  }, [pipes, started, gameOver, muted, BIRD_X, PIPE_WIDTH]);

  // Collision detection
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
  }, [birdY, pipes, dimensions.height, started, gameOver, BIRD_X, BIRD_SIZE, PIPE_WIDTH, PIPE_GAP]);

  const handleGameOver = () => {
    if (!muted && hitSound.current) {
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

  // Jump / restart
  const handleJump = () => {
    if (!started) return;
    if (!gameOver) {
      if (!muted && flapSound.current) {
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

  // Keyboard controls
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
      onTouchStart={() => (started ? handleJump() : setStarted(true))}
    >
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
      {started && <Bird y={birdY} rotation={rotation} BIRD_SIZE={BIRD_SIZE} BIRD_X={BIRD_X} />}

      {/* Pipes */}
      {started &&
        pipes.map((pipe, idx) => (
          <Pipe
            key={idx}
            pipe={pipe}
            dimensions={dimensions}
            PIPE_WIDTH={PIPE_WIDTH}
            PIPE_GAP={PIPE_GAP}
          />
        ))}

      {/* Score */}
      {started && !gameOver && <Score score={score} />}

      {/* Game Over */}
      {gameOver && (
        <GameOver score={score} highScore={highScore} newRecord={newRecord} onRestart={restartGame} />
      )}

      {/* Start Menu */}
      {!started && <StartMenu highScore={highScore} onStart={() => setStarted(true)} />}

      {/* Mute Button */}
      <MuteButton muted={muted} setMuted={setMuted} />
    </div>
  );
}
