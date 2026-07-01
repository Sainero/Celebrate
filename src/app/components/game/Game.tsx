import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import { ArrowLeft, PartyPopper, RefreshCw, Gem, Heart, Gift } from 'lucide-react';
import { GameState, Player, Platform, Collectible, Particle } from './types';
import { 
  LOGICAL_WIDTH, LOGICAL_HEIGHT, GRAVITY, JUMP_FORCE, 
  SPRING_FORCE, MOVE_SPEED, MAX_FALL_SPEED, PLATFORM_WIDTH, 
  PLATFORM_HEIGHT, PLAYER_SIZE, WIN_HEIGHT, EASTER_EGGS 
} from './constants';

// --- AUDIO ENGINE ---
class AudioEngine {
  ctx: AudioContext | null = null;

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  private getContext() {
    const ctx = this.ctx;
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  playJump() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  playSpring() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  playBreak() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playCollect() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }
}
const audio = new AudioEngine();

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export default function Game({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const keys = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const touchState = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  const stateRef = useRef({
    player: { pos: { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT - 100 }, vel: { x: 0, y: 0 }, width: PLAYER_SIZE, height: PLAYER_SIZE, facingRight: true } as Player,
    platforms: [] as Platform[],
    collectibles: [] as Collectible[],
    particles: [] as Particle[],
    trail: [] as {x: number, y: number, life: number}[],
    camera: { y: 0 },
    score: 0,
    maxHeight: 0,
    frames: 0,
    actualLogicalHeight: LOGICAL_HEIGHT
  });

  const generateLevel = () => {
    const platforms: Platform[] = [];
    const collectibles: Collectible[] = [];

    platforms.push({
      id: 0, pos: { x: LOGICAL_WIDTH / 2 - 50, y: LOGICAL_HEIGHT - 20 },
      width: 100, height: PLATFORM_HEIGHT, type: 'static', vx: 0, broken: false, opacity: 1
    });

    let currentY = LOGICAL_HEIGHT - 150;
    let id = 1;
    let prevX = LOGICAL_WIDTH / 2 - 50;

    while (currentY > -WIN_HEIGHT) {
      let x = prevX + randomRange(-180, 180);
      if (x < 0) x = Math.abs(x);
      if (x > LOGICAL_WIDTH - PLATFORM_WIDTH) x = (LOGICAL_WIDTH - PLATFORM_WIDTH) - (x - (LOGICAL_WIDTH - PLATFORM_WIDTH));
      prevX = x;

      let type: Platform['type'] = 'static';
      const r = Math.random();
      const progress = Math.min(1, Math.abs(currentY) / WIN_HEIGHT);

      if (r < 0.05 + progress * 0.15) type = 'moving';
      else if (r < 0.15 + progress * 0.15) type = 'fragile';
      else if (r < 0.20 + progress * 0.1) type = 'spring';

      const vx = type === 'moving' ? (Math.random() > 0.5 ? randomRange(1, 2) : -randomRange(1, 2)) : 0;

      platforms.push({
        id: id++, pos: { x, y: currentY }, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, type, vx, broken: false, opacity: 1
      });

      if (Math.random() < 0.2) {
        const cTypes: Collectible['type'][] = ['heart', 'ring', 'gift'];
        collectibles.push({
          id: id++, pos: { x: x + PLATFORM_WIDTH / 2 - 15, y: currentY - 40 },
          type: cTypes[Math.floor(Math.random() * cTypes.length)], collected: false, floatOffset: Math.random() * Math.PI * 2
        });
      }

      currentY -= randomRange(40, 75 + progress * 15);
    }

    platforms.push({
      id: 99999, pos: { x: LOGICAL_WIDTH / 2 - 120, y: -WIN_HEIGHT - 100 },
      width: 240, height: 40, type: 'finish', vx: 0, broken: false, opacity: 1
    });

    return { platforms, collectibles };
  };

  const startGame = async () => {
    await audio.init();
    const level = generateLevel();
    stateRef.current = {
      player: {
        pos: { x: LOGICAL_WIDTH / 2 - PLAYER_SIZE / 2, y: LOGICAL_HEIGHT - 150 },
        vel: { x: 0, y: JUMP_FORCE },
        width: PLAYER_SIZE, height: PLAYER_SIZE, facingRight: true
      },
      platforms: level.platforms,
      collectibles: level.collectibles,
      particles: [],
      trail: [],
      camera: { y: 0 },
      score: 0,
      maxHeight: 0,
      frames: 0,
      actualLogicalHeight: LOGICAL_HEIGHT
    };
    setScore(0);
    setGameState('playing');
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        pos: { x, y },
        vel: { x: randomRange(-5, 5), y: randomRange(-5, 5) },
        life: 0,
        maxLife: randomRange(20, 50),
        color,
        size: randomRange(4, 10),
        rotation: randomRange(0, Math.PI * 2),
        vRot: randomRange(-0.2, 0.2)
      });
    }
    stateRef.current.particles.push(...newParticles);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.current.right = true;
      if (e.code === 'Space' && (gameState === 'start' || gameState === 'gameover')) {
        startGame();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.current.right = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    if (direction === 'left') touchState.current.left = true;
    if (direction === 'right') touchState.current.right = true;
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    if (direction === 'left') touchState.current.left = false;
    if (direction === 'right') touchState.current.right = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const updateCanvasSize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const scale = rect.width / LOGICAL_WIDTH;
      ctx.scale(scale * dpr, scale * dpr);
      stateRef.current.actualLogicalHeight = rect.height / scale;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const update = (time: number) => {
      if (gameState !== 'playing') return;
      const state = stateRef.current;
      const { player, platforms, collectibles, particles, camera } = state;
      let dtFactor = 1;
      if (lastTimeRef.current) {
        dtFactor = Math.min(((time - lastTimeRef.current) / 1000) * 60, 3);
      }
      lastTimeRef.current = time;
      state.frames += dtFactor;

      const progress = Math.min(1, Math.max(0, -player.pos.y / WIN_HEIGHT));
      const currentGravity = GRAVITY + (progress * 0.25);

      const movingLeft = keys.current.left || touchState.current.left;
      const movingRight = keys.current.right || touchState.current.right;

      if (movingLeft) {
        player.vel.x = -MOVE_SPEED;
        player.facingRight = false;
      } else if (movingRight) {
        player.vel.x = MOVE_SPEED;
        player.facingRight = true;
      } else {
        player.vel.x *= Math.pow(0.8, dtFactor);
      }

      player.pos.x += player.vel.x * dtFactor;

      if (player.pos.x > LOGICAL_WIDTH) player.pos.x = -player.width;
      if (player.pos.x < -player.width) player.pos.x = LOGICAL_WIDTH;

      player.vel.y += currentGravity * dtFactor;
      if (player.vel.y > MAX_FALL_SPEED) player.vel.y = MAX_FALL_SPEED;
      player.pos.y += player.vel.y * dtFactor;

      if (player.vel.y > 0) {
        for (let i = 0; i < platforms.length; i++) {
          const p = platforms[i];
          if (p.broken) continue;

          if (
            player.pos.x + player.width - 10 > p.pos.x &&
            player.pos.x + 10 < p.pos.x + p.width &&
            player.pos.y + player.height > p.pos.y &&
            player.pos.y + player.height < p.pos.y + p.height + player.vel.y * dtFactor
          ) {
            player.pos.y = p.pos.y - player.height;

            if (p.type === 'finish') {
              setGameState('won');
              audio.playCollect();
              spawnParticles(player.pos.x, player.pos.y, '#D4AF37', 100);
              return;
            }

            if (p.type === 'fragile') {
              p.broken = true;
              audio.playBreak();
              spawnParticles(p.pos.x + p.width / 2, p.pos.y + p.height / 2, '#A39171', 20);
            } else if (p.type === 'spring') {
              player.vel.y = SPRING_FORCE;
              audio.playSpring();
              spawnParticles(player.pos.x + player.width / 2, player.pos.y + player.height, '#3B82F6', 15);
            } else {
              player.vel.y = JUMP_FORCE;
              audio.playJump();
              spawnParticles(player.pos.x + player.width / 2, player.pos.y + player.height, '#E8DCC4', 5);
            }
          }
        }
      }

      for (let c of collectibles) {
        if (!c.collected && Math.abs((player.pos.x + player.width / 2) - (c.pos.x + 15)) < 40 && Math.abs((player.pos.y + player.height / 2) - (c.pos.y + 15)) < 40) {
          c.collected = true;
          state.score += (c.type === 'gift' ? 500 : 100);
          audio.playCollect();
          spawnParticles(c.pos.x + 15, c.pos.y + 15, c.type === 'heart' ? '#EF4444' : '#F59E0B', 15);
        }
      }

      for (let p of platforms) {
        if (p.type === 'moving' && !p.broken) {
          p.pos.x += p.vx * dtFactor;
          if (p.pos.x > LOGICAL_WIDTH - p.width || p.pos.x < 0) p.vx *= -1;
        }
        if (p.broken && p.opacity > 0) {
          p.opacity -= 0.1 * dtFactor;
        }
      }

      const cameraThreshold = state.actualLogicalHeight / 2;
      if (player.pos.y < camera.y + cameraThreshold) {
        camera.y = player.pos.y - cameraThreshold;
      }

      const currentHeight = Math.floor(Math.abs(camera.y));
      if (currentHeight > state.maxHeight) {
        state.score += (currentHeight - state.maxHeight);
        state.maxHeight = currentHeight;
      }

      if (player.pos.y > camera.y + state.actualLogicalHeight) {
        setGameState('gameover');
        setScore(state.score);
        setHighScore(prev => Math.max(prev, state.score));
        return;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.pos.x += p.vel.x * dtFactor;
        p.pos.y += p.vel.y * dtFactor;
        p.vel.y += GRAVITY * 0.5 * dtFactor;
        p.rotation += p.vRot * dtFactor;
        p.life += dtFactor;
        if (p.life >= p.maxLife) particles.splice(i, 1);
      }

      // Trail update
      if (player.vel.y < JUMP_FORCE) {
        state.trail.push({ x: player.pos.x + player.width/2, y: player.pos.y + player.height/2, life: 1 });
      }
      for (let i = state.trail.length - 1; i >= 0; i--) {
        state.trail[i].life -= 0.08 * dtFactor;
        if (state.trail[i].life <= 0) state.trail.splice(i, 1);
      }

      ctx.clearRect(0, 0, LOGICAL_WIDTH, state.actualLogicalHeight);
      ctx.save();

      // --- DYNAMIC BACKGROUND ---
      // camera.y is 0 to -WIN_HEIGHT (-12000)
      const t = Math.min(1, Math.max(0, -camera.y / WIN_HEIGHT));
      
      // Interpolate colors based on height (t = 0 to 1)
      let color1, color2;
      
      // Define color stops (RGB)
      const dayBottom = [244, 239, 230];     // #F4EFE6
      const dayTop = [253, 251, 247];        // #FDFBF7
      const sunsetBottom = [242, 201, 160];  // soft warm gold
      const sunsetTop = [190, 204, 230];     // soft twilight blue
      const nightBottom = [26, 26, 46];      // dark navy
      const nightTop = [15, 15, 26];         // very dark navy

      if (t < 0.5) {
        const t2 = t * 2; // 0 to 1
        color1 = `rgba(${Math.floor(dayBottom[0] + (sunsetBottom[0] - dayBottom[0])*t2)}, ${Math.floor(dayBottom[1] + (sunsetBottom[1] - dayBottom[1])*t2)}, ${Math.floor(dayBottom[2] + (sunsetBottom[2] - dayBottom[2])*t2)}, 1)`;
        color2 = `rgba(${Math.floor(dayTop[0] + (sunsetTop[0] - dayTop[0])*t2)}, ${Math.floor(dayTop[1] + (sunsetTop[1] - dayTop[1])*t2)}, ${Math.floor(dayTop[2] + (sunsetTop[2] - dayTop[2])*t2)}, 1)`;
      } else {
        const t2 = (t - 0.5) * 2; // 0 to 1
        color1 = `rgba(${Math.floor(sunsetBottom[0] + (nightBottom[0] - sunsetBottom[0])*t2)}, ${Math.floor(sunsetBottom[1] + (nightBottom[1] - sunsetBottom[1])*t2)}, ${Math.floor(sunsetBottom[2] + (nightBottom[2] - sunsetBottom[2])*t2)}, 1)`;
        color2 = `rgba(${Math.floor(sunsetTop[0] + (nightTop[0] - sunsetTop[0])*t2)}, ${Math.floor(sunsetTop[1] + (nightTop[1] - sunsetTop[1])*t2)}, ${Math.floor(sunsetTop[2] + (nightTop[2] - sunsetTop[2])*t2)}, 1)`;
      }

      const grad = ctx.createLinearGradient(0, 0, 0, state.actualLogicalHeight);
      grad.addColorStop(0, color1);
      grad.addColorStop(1, color2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, state.actualLogicalHeight);

      // Draw faint stars at night
      if (t > 0.5) {
        const starOpacity = (t - 0.5) * 2;
        
        // Draw bigger, glowing stars
        for (let i = 0; i < 60; i++) {
          const sx = (Math.sin(i * 1234) * 0.5 + 0.5) * LOGICAL_WIDTH;
          // Apply gentle parallax to stars
          const sy = ((Math.cos(i * 4321) * 0.5 + 0.5) * state.actualLogicalHeight + (camera.y * 0.1 * (i % 3 + 1))) % state.actualLogicalHeight;
          const adjustedSy = (sy + state.actualLogicalHeight) % state.actualLogicalHeight;
          
          const sSize = (Math.sin(i * 9876 + state.frames * 0.03) * 0.5 + 0.5) * 2.5 + 0.5;
          
          ctx.save();
          ctx.globalAlpha = starOpacity * (0.3 + 0.7 * Math.sin(i * 555 + state.frames * 0.05));
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = sSize * 4;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(sx, adjustedSy, sSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw faint clouds (Parallax) in the lower half of the game
      if (t < 0.7) {
        const cloudOpacity = 1 - (t / 0.7); // fade out as we go higher
        ctx.fillStyle = `rgba(255, 255, 255, ${cloudOpacity * 0.15})`;
        for (let i = 0; i < 5; i++) {
          const cx = (Math.sin(i * 777) * 0.5 + 0.5) * LOGICAL_WIDTH + Math.sin(state.frames * 0.002 + i) * 50;
          const cy = ((i * 300) - (camera.y * 0.3) + state.actualLogicalHeight * 10) % state.actualLogicalHeight;
          
          ctx.beginPath();
          ctx.arc(cx, cy, 60 + i * 10, 0, Math.PI * 2);
          ctx.arc(cx + 50, cy + 20, 50, 0, Math.PI * 2);
          ctx.arc(cx - 40, cy + 30, 40, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.05)';
      ctx.lineWidth = 2;
      const numLines = Math.ceil(state.actualLogicalHeight / 100) + 2;
      const bgOffset = (camera.y * 0.5) % state.actualLogicalHeight;
      for (let i = 0; i < numLines; i++) {
        const yLine = ((i * 100) - bgOffset + state.actualLogicalHeight) % state.actualLogicalHeight;
        ctx.beginPath(); ctx.moveTo(0, yLine); ctx.lineTo(LOGICAL_WIDTH, yLine); ctx.stroke();
      }

      ctx.translate(0, -camera.y);

      // --- EASTER EGGS ---
      EASTER_EGGS.forEach(egg => {
        // Only draw if within visible camera range + padding
        if (egg.y > camera.y - state.actualLogicalHeight - 200 && egg.y < camera.y + state.actualLogicalHeight) {
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 8;
          ctx.fillText(egg.text, LOGICAL_WIDTH / 2, egg.y);
          ctx.shadowColor = 'transparent';
        }
      });

      platforms.forEach(p => {
        if (p.opacity <= 0) return;
        ctx.globalAlpha = p.opacity;

        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;

        if (p.type === 'finish') {
          ctx.save();
          ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
          ctx.shadowBlur = 20 + Math.sin(state.frames * 0.05) * 10;
          ctx.fillStyle = '#D4AF37';
          ctx.beginPath();
          ctx.roundRect(p.pos.x, p.pos.y, p.width, p.height, 10);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💌 ЗАБРАТЬ КОНВЕРТ', p.pos.x + p.width / 2, p.pos.y + 28);
        } else {
          ctx.fillStyle = p.type === 'fragile' ? '#E8DCC4' : p.type === 'spring' ? '#60A5FA' : p.type === 'moving' ? '#A39171' : '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(p.pos.x, p.pos.y, p.width, p.height, 8);
          ctx.fill();

          ctx.strokeStyle = p.type === 'fragile' ? '#D4C3A3' : '#F0EBE1';
          ctx.lineWidth = 2;
          ctx.stroke();

          if (p.type === 'spring') {
            ctx.fillStyle = '#3B82F6';
            ctx.fillRect(p.pos.x + p.width / 2 - 10, p.pos.y - 8, 20, 8);
          }
          if (p.type === 'fragile') {
            ctx.strokeStyle = '#D4C3A3';
            ctx.beginPath();
            ctx.moveTo(p.pos.x + 20, p.pos.y); ctx.lineTo(p.pos.x + 30, p.pos.y + p.height);
            ctx.moveTo(p.pos.x + 50, p.pos.y); ctx.lineTo(p.pos.x + 40, p.pos.y + p.height);
            ctx.stroke();
          }
        }
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1.0;
      });

      collectibles.forEach(c => {
        if (c.collected) return;
        const bounce = Math.sin(state.frames * 0.1 + c.floatOffset) * 5;
        ctx.save();
        ctx.shadowColor = c.type === 'heart' ? 'rgba(239, 68, 68, 0.8)' : 
                          c.type === 'gift' ? 'rgba(212, 175, 55, 0.8)' : 
                          'rgba(96, 165, 250, 0.8)';
        ctx.shadowBlur = 15 + Math.sin(state.frames * 0.05 + c.floatOffset) * 5;
        ctx.font = '24px Arial';
        ctx.fillText(c.type === 'heart' ? '❤️' : c.type === 'gift' ? '🎁' : '💍', c.pos.x, c.pos.y + bounce);
        ctx.restore();
      });

      ctx.save();
      ctx.translate(player.pos.x + player.width / 2, player.pos.y + player.height / 2);
      
      // Draw Trail
      if (state.trail.length > 0) {
        ctx.save();
        state.trail.forEach((t, i) => {
          ctx.globalAlpha = t.life * 0.4;
          ctx.fillStyle = '#60A5FA';
          ctx.beginPath();
          ctx.arc(t.x - (player.pos.x + player.width / 2), t.y - (player.pos.y + player.height / 2), (PLAYER_SIZE/3) * t.life, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      if (!player.facingRight) ctx.scale(-1, 1);

      const squash = player.vel.y < 0 ? 1.1 : 0.9;
      const stretch = player.vel.y < 0 ? 0.9 : 1.1;
      ctx.scale(squash, stretch);

      ctx.font = '40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.vel.y < -5 ? '👰' : '🤵', 0, 0);
      ctx.restore();

      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = 1 - (p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      ctx.restore();

      setScore(state.score);

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [gameState]);

  return (
    <div className="fixed inset-0 bg-[#FDFBF7] text-[#1A1A1A] font-sans flex flex-col items-center justify-center z-[100] overflow-hidden">

      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,_transparent_0%,_#F4EFE6_100%)]" />

      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 pointer-events-none">
        <button
          onClick={onBack}
          className="p-3 bg-white/80 backdrop-blur-md text-gray-600 hover:text-[#D4AF37] transition-colors rounded-full shadow-sm pointer-events-auto border border-[#F4EFE6]"
        >
          <ArrowLeft size={24} />
        </button>

        {gameState === 'playing' && (
          <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-2xl shadow-sm border border-[#F4EFE6] flex items-center gap-4 pointer-events-auto">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Счет</p>
              <p className="font-mono font-bold text-xl leading-none text-[#1A1A1A]">{score}</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-200"></div>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Рекорд</p>
              <p className="font-mono font-bold text-xl leading-none text-[#D4AF37]">{Math.max(score, highScore)}</p>
            </div>
          </div>
        )}
      </div>

      {gameState === 'playing' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-20 pointer-events-none">
          <div className="h-3 bg-white/50 backdrop-blur-md rounded-full overflow-hidden border border-[#F4EFE6] shadow-sm relative">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#E8DCC4] to-[#D4AF37] transition-all duration-300"
              style={{ width: `${Math.min(100, (score / WIN_HEIGHT) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="w-full h-full max-w-lg mx-auto relative shadow-[0_0_100px_rgba(0,0,0,0.05)] bg-[#FDFBF7] border-x border-[#F4EFE6]">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block touch-none"
        />

        {gameState === 'playing' && (
          <div className="absolute inset-0 flex sm:hidden z-10 touch-none">
            <div
              className="w-1/2 h-full opacity-0"
              onPointerDown={(e) => handleTouchStart(e, 'left')}
              onPointerUp={(e) => handleTouchEnd(e, 'left')}
              onPointerCancel={(e) => handleTouchEnd(e, 'left')}
            />
            <div
              className="w-1/2 h-full opacity-0"
              onPointerDown={(e) => handleTouchStart(e, 'right')}
              onPointerUp={(e) => handleTouchEnd(e, 'right')}
              onPointerCancel={(e) => handleTouchEnd(e, 'right')}
            />
          </div>
        )}

        <AnimatePresence>
          {gameState === 'start' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30"
            >
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-[#F4EFE6] rotate-12">
                <Heart size={40} className="text-[#D4AF37]" fill="#D4AF37" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif text-center mb-4 text-[#1A1A1A]">Свадебный <br /> Прыжок</h1>
              <p className="text-center text-gray-500 mb-8 font-light max-w-xs">
                Помогите молодоженам добраться до заветного конверта на самом верху! Управляйте стрелочками или касанием экрана.
              </p>

              <div className="w-full max-w-[280px] mb-8 space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest text-center text-gray-400 font-bold">Платформы</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex flex-col items-center gap-1.5 bg-white/50 p-2 rounded-xl border border-[#F4EFE6]">
                    <div className="w-12 h-3 rounded bg-white border-2 border-[#F0EBE1] shadow-sm"></div>
                    <span className="text-[10px] uppercase font-medium">Обычная</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 bg-white/50 p-2 rounded-xl border border-[#F4EFE6]">
                    <div className="w-12 h-3 rounded bg-[#A39171] shadow-sm relative overflow-hidden flex justify-center items-center">
                      <div className="w-full h-[1px] bg-white/20"></div>
                    </div>
                    <span className="text-[10px] uppercase font-medium">Движется</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 bg-white/50 p-2 rounded-xl border border-[#F4EFE6]">
                    <div className="w-12 h-3 rounded bg-[#60A5FA] shadow-sm relative flex justify-center">
                      <div className="w-4 h-1.5 bg-[#3B82F6] absolute -top-1 rounded-t-sm"></div>
                    </div>
                    <span className="text-[10px] uppercase font-medium">Пружина</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 bg-white/50 p-2 rounded-xl border border-[#F4EFE6]">
                    <div className="w-12 h-3 rounded bg-[#E8DCC4] border-2 border-[#D4C3A3] shadow-sm relative overflow-hidden flex justify-center">
                      <div className="w-[1px] h-full bg-[#D4C3A3] rotate-45"></div>
                    </div>
                    <span className="text-[10px] uppercase font-medium">Ломается</span>
                  </div>
                </div>

                <h4 className="text-[10px] uppercase tracking-widest text-center text-gray-400 font-bold pt-2">Бонусы</h4>
                <div className="flex justify-center gap-4 text-xl bg-white/50 p-2 rounded-xl border border-[#F4EFE6]">
                  <div className="flex items-center gap-1.5"><span className="animate-bounce" style={{ animationDuration: '2s' }}>❤️</span><span className="text-[10px] text-gray-400 font-bold font-mono">+100</span></div>
                  <div className="flex items-center gap-1.5"><span className="animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.1s' }}>💍</span><span className="text-[10px] text-gray-400 font-bold font-mono">+100</span></div>
                  <div className="flex items-center gap-1.5"><span className="animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.2s' }}>🎁</span><span className="text-[10px] text-[#D4AF37] font-bold font-mono">+500</span></div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="px-10 py-4 bg-[#1A1A1A] text-white rounded-2xl hover:bg-[#333] transition-colors font-medium shadow-xl flex items-center gap-3 text-lg"
              >
                <ArrowLeft className="rotate-90" /> Прыгнуть вверх!
              </motion.button>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-30"
            >
              <div className="bg-white p-8 rounded-[2rem] text-center w-full max-w-sm shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#1A1A1A]"></div>
                <h3 className="text-3xl font-serif mb-2 text-[#1A1A1A] mt-2">Ой, упали!</h3>
                <p className="text-gray-500 mb-6 font-light">До конверта было еще далеко, но вы старались.</p>

                <div className="bg-[#FDFBF7] p-4 rounded-2xl mb-6 border border-[#F4EFE6]">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Ваш счет</p>
                  <p className="font-mono font-bold text-4xl text-[#D4AF37]">{score}</p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-[#1A1A1A] text-white rounded-2xl hover:bg-[#333] transition-colors font-medium w-full shadow-lg"
                >
                  <RefreshCw size={20} /> Попробовать снова
                </motion.button>
              </div>
            </motion.div>
          )}

          {gameState === 'won' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 z-40 text-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mb-8"
              >
                <PartyPopper size={80} strokeWidth={1.5} className="text-[#D4AF37]" />
              </motion.div>

              <h3 className="text-4xl font-serif mb-6 text-[#1A1A1A]">Ура!</h3>

              <div className="bg-[#FDFBF7] border border-[#F4EFE6] p-6 rounded-3xl mb-8 max-w-sm shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
                  <Gem size={100} />
                </div>
                <p className="text-lg text-gray-700 font-light relative z-10">
                  Вы доказали, что готовы ко всему! А теперь смело вскрывайте настоящий конверт на столе...
                </p>
                <div className="mt-4 pt-4 border-t border-[#E8DCC4] relative z-10">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Итоговый счет</p>
                  <p className="font-mono font-bold text-3xl text-[#D4AF37]">{score}</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="px-10 py-5 bg-[#D4AF37] text-white rounded-2xl hover:bg-[#C29D2C] transition-all font-medium shadow-[0_10px_30px_rgba(212,175,55,0.3)] text-lg flex items-center gap-3"
              >
                <Gift size={24} /> Вернуться на праздник
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
