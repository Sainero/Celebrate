import { useState, useRef, useEffect, useCallback } from 'react';
import Greeting from './components/Greeting';
import Game from './components/game/Game';

export default function App() {
  const [isOpened, setIsOpened] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const greetingAudioRef = useRef<HTMLAudioElement>(null);
  const gameAudioRef = useRef<HTMLAudioElement>(null);

  const [greetingTrackIndex, setGreetingTrackIndex] = useState(0);
  const greetingTracks = ['/PIZZA_Zanovo.mp3', '/mikaya_pust.mp3'];

  // Игровой плейлист
  const [gameTrackIndex, setGameTrackIndex] = useState(0);
  const gameTracks = [
    '/diskoteka_avariya_multivitamin.mp3',
    '/vida_loca.mp3',
    '/ivanzolo2004_relanium.mp3',
    '/deen_west_baobab.mp3',
    '/tom_ford.mp3',
    '/lida_koshka.mp3',
    '/virus_poproshu.mp3',
    '/vasilisa_zasidelis.mp3'
  ];

  const playAudio = useCallback((audio: HTMLAudioElement | null, volume: number) => {
    if (!audio) return;
    audio.volume = volume;
    audio.muted = false;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((e) => {
        console.log("Audio play failed:", e);
        setIsPlaying(false);
      });
    }
  }, []);

  const pauseAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (audio) {
      audio.pause();
    }
  }, []);

  const handleOpen = () => {
    setIsOpened(true);
    playAudio(greetingAudioRef.current, 0.08);
  };

  const toggleMusic = () => {
    const currentAudio = showGame ? gameAudioRef.current : greetingAudioRef.current;
    if (!currentAudio) return;
    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      playAudio(currentAudio, 0.08);
    }
  };

  useEffect(() => {
    if (showGame) {
      pauseAudio(greetingAudioRef.current);
      if (isPlaying) {
        playAudio(gameAudioRef.current, 0.08);
      }
    } else {
      pauseAudio(gameAudioRef.current);
      if (isOpened && isPlaying) {
        playAudio(greetingAudioRef.current, 0.08);
      }
    }
  }, [showGame, isPlaying, isOpened, playAudio, pauseAudio]);

  // Автоплей при переключении треков
  useEffect(() => {
    if (isPlaying && !showGame && isOpened) {
      playAudio(greetingAudioRef.current, 0.08);
    }
  }, [greetingTrackIndex, isPlaying, showGame, isOpened, playAudio]);

  useEffect(() => {
    if (isPlaying && showGame) {
      playAudio(gameAudioRef.current, 0.08);
    }
  }, [gameTrackIndex, isPlaying, showGame, playAudio]);

  return (
    <div className="min-h-screen bg-[#FCFBF9] text-[#2C2C2C] font-sans selection:bg-[#E8DCC4] overflow-x-hidden relative flex flex-col items-center">
      {showGame ? (
        <Game onBack={() => setShowGame(false)} />
      ) : (
        <Greeting 
          isOpened={isOpened} 
          onOpen={handleOpen} 
          onStartGame={() => setShowGame(true)} 
          toggleMusic={toggleMusic} 
          isPlaying={isPlaying} 
        />
      )}

      {/* Audio elements */}
      <audio
        ref={greetingAudioRef}
        src={greetingTracks[greetingTrackIndex]}
        preload="auto"
        muted={false}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setGreetingTrackIndex((prev) => (prev + 1) % greetingTracks.length);
        }}
        onError={(e) => {
          console.log("Error loading greeting track", e.currentTarget.src);
          setIsPlaying(false);
        }}
      />
      <audio
        ref={gameAudioRef}
        src={gameTracks[gameTrackIndex]}
        preload="auto"
        muted={false}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setGameTrackIndex((prev) => (prev + 1) % gameTracks.length);
        }}
        onError={(e) => {
          console.log("Error loading game track", e.currentTarget.src);
          setIsPlaying(false);
        }}
      />
    </div>
  );
}
