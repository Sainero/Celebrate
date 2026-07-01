import { EasterEgg } from './types';

export const LOGICAL_WIDTH = 600;
export const LOGICAL_HEIGHT = 800;
export const GRAVITY = 0.2;
export const JUMP_FORCE = -8.5;
export const SPRING_FORCE = -14;
export const MOVE_SPEED = 4.5;
export const MAX_FALL_SPEED = 10;
export const PLATFORM_WIDTH = 100;
export const PLATFORM_HEIGHT = 16;
export const PLAYER_SIZE = 48;
export const WIN_HEIGHT = 12000;

export const EASTER_EGGS: EasterEgg[] = [
  { y: -2000, text: "Путь к богатству начался!" },
  { y: -6000, text: "Семья - это команда!" },
  { y: -10000, text: "Выше только звезды!" }
];
