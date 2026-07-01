export type GameState = 'start' | 'playing' | 'gameover' | 'won';

export interface Vector { x: number; y: number; }
export interface Player {
  pos: Vector;
  vel: Vector;
  width: number;
  height: number;
  facingRight: boolean;
}
export interface Platform {
  id: number;
  pos: Vector;
  width: number;
  height: number;
  type: 'static' | 'moving' | 'fragile' | 'spring' | 'finish';
  vx: number;
  broken: boolean;
  opacity: number;
}
export interface Collectible {
  id: number;
  pos: Vector;
  type: 'heart' | 'ring' | 'gift';
  collected: boolean;
  floatOffset: number;
}
export interface Particle {
  pos: Vector;
  vel: Vector;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rotation: number;
  vRot: number;
}
export interface EasterEgg {
  y: number;
  text: string;
}
