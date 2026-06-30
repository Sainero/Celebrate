import { motion, AnimatePresence } from 'motion/react';
import { Heart, Leaf, Sparkles, Quote, Mail, Volume2, VolumeX, Music } from 'lucide-react';
import { ReactNode, useState, useRef, useEffect } from 'react';

const FadeIn = ({ children, delay = 0, className = "" }: { children: ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 1, delay, ease: [0.25, 0.1, 0.25, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

const ParticleBackground = ({ delay, duration, left }: { delay: number, duration: number, left: string }) => (
  <motion.div
    initial={{ opacity: 0, y: "110vh" }}
    animate={{ 
      opacity: [0, 0.8, 0], 
      y: ["110vh", "-10vh"],
      rotate: [0, 360]
    }}
    transition={{ 
      duration, 
      delay, 
      repeat: Infinity, 
      ease: "linear" 
    }}
    style={{ left }}
    className="absolute w-2 h-2 text-[#D4AF37]/30"
  >
    <Leaf size={12} strokeWidth={1} fill="currentColor" />
  </motion.div>
);

const InteractiveGoriko = () => {
  const [particles, setParticles] = useState<{id: number, x: number, y: number, angle: number, type: number}[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const pointerPosRef = useRef({ x: 0, y: 0 });

  const updatePointerPos = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    pointerPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const generateBurst = () => {
    const { x, y } = pointerPosRef.current;
    setParticles(prev => {
      const newParticles = Array.from({ length: 5 }).map((_, i) => ({
        id: Date.now() + i + Math.random(),
        x: x + (Math.random() * 80 - 40),
        y: y + (Math.random() * 80 - 40),
        angle: Math.random() * 60 - 30,
        type: Math.random() > 0.5 ? 1 : 0
      }));
      return [...prev.slice(-35), ...newParticles]; // limit max particles
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    updatePointerPos(e);
    generateBurst(); // Initial burst
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(generateBurst, 150);
    if (e.target instanceof Element) {
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (intervalRef.current) {
      updatePointerPos(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (e.target instanceof Element && e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <FadeIn delay={0.3} className="text-center pb-20 w-full relative select-none">
      <div ref={containerRef} className="absolute inset-0 z-0 overflow-visible pointer-events-none" />
      {particles.map(p => (
         <motion.div
           key={p.id}
           initial={{ opacity: 1, x: p.x, y: p.y, scale: 0.5, rotate: p.angle }}
           animate={{ opacity: 0, y: p.y - 250, x: p.x + (Math.random() * 150 - 75), scale: 1.5 + Math.random(), rotate: p.angle + (Math.random() * 180 - 90) }}
           transition={{ duration: 1.5 + Math.random() * 0.5, ease: "easeOut" }}
           onAnimationComplete={() => setParticles(prev => prev.filter(item => item.id !== p.id))}
           className={`absolute pointer-events-none z-0 origin-center ${p.type === 1 ? 'text-[#D4AF37]' : 'text-[#6B7566]'}`}
         >
           {p.type === 1 ? <Heart size={20} fill="currentColor" /> : <Leaf size={20} fill="currentColor" />}
         </motion.div>
       ))}
      <motion.button
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         onPointerCancel={handlePointerUp}
         onContextMenu={(e) => e.preventDefault()}
         className="inline-flex items-center justify-center w-28 h-28 rounded-full border border-[#D4AF37] text-[#D4AF37] mb-8 relative overflow-hidden group cursor-pointer bg-white shadow-sm z-10 outline-none"
      >
        <div className="absolute inset-0 bg-[#D4AF37]/5 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full" />
        <Sparkles size={40} strokeWidth={1} className="relative z-10 group-hover:rotate-12 transition-transform duration-300" />
      </motion.button>
      <h2 
        className="font-serif text-6xl md:text-8xl text-[#1A1A1A] mb-8 cursor-pointer relative z-10 hover:text-[#D4AF37] transition-colors duration-300 select-none" 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        Горько!
      </h2>
      <p className="text-xl md:text-2xl text-[#888] font-serif italic mb-2 relative z-10">
        С любовью,
      </p>
      <p className="text-lg text-[#6B7566] tracking-wider uppercase font-medium relative z-10">
        Семья Никитиных
      </p>
      <p className="mt-8 text-xs text-[#A3A3A3] uppercase tracking-[0.2em] relative z-10 opacity-70">
        Зажмите кнопку или текст
      </p>
      
      <div className="mt-14 flex items-center justify-center relative z-10 h-20 w-full">
        <div className="relative flex items-center justify-center w-32 h-full">
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-1/2 translate-x-3 w-16 h-16 rounded-full border-[3px] border-[#D4AF37] shadow-sm"
          />
          <motion.div
            animate={{ x: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute left-1/2 -translate-x-3 w-16 h-16 rounded-full border-[3px] border-[#A39171] shadow-sm"
          />
          <motion.div
             animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
             className="absolute z-10"
          >
             <Sparkles size={20} className="text-[#D4AF37]" />
          </motion.div>
        </div>
      </div>
    </FadeIn>
  );
}

export default function App() {
  const [isOpened, setIsOpened] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isOpened) {
      window.scrollTo(0, 0);
    }
  }, [isOpened]);

  const handleOpen = () => {
    setIsOpened(true);
    if (audioRef.current) {
      audioRef.current.volume = 0.08;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => console.log("Audio autoplay prevented", e));
    }
  };

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF9] text-[#2C2C2C] font-sans selection:bg-[#E8DCC4] overflow-x-hidden relative flex flex-col items-center">
      <AnimatePresence>
        {!isOpened && (
          <motion.div
            key="envelope"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: "-100vh" }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-50 bg-[#F4EFE6] flex flex-col items-center justify-center p-6 overflow-hidden"
          >
            {/* Botanical background decorations */}
            <Leaf className="absolute top-10 left-10 text-[#6B7566] opacity-10 w-32 h-32 -rotate-45 pointer-events-none" />
            <Leaf className="absolute bottom-10 right-10 text-[#6B7566] opacity-10 w-48 h-48 rotate-[135deg] pointer-events-none" />
            <div className="absolute top-1/4 right-10 w-16 h-16 rounded-full border border-[#6B7566]/20 pointer-events-none" />
            <div className="absolute bottom-1/4 left-10 w-24 h-24 rounded-full border border-[#6B7566]/10 pointer-events-none" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col items-center z-10"
            >
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#6B7566] mb-4 tracking-widest uppercase text-center leading-relaxed">Полина<br/><span className="text-3xl">&</span><br/>Дмитрий</h1>
              <p className="font-serif text-xl md:text-2xl text-[#888] mb-16 tracking-widest">04 / 07 / 26</p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpen}
                className="relative group cursor-pointer flex flex-col items-center border-none bg-transparent outline-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <motion.div
                  animate={{ boxShadow: ["0px 0px 0px 0px rgba(107, 117, 102, 0.4)", "0px 0px 0px 20px rgba(107, 117, 102, 0)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 rounded-full bg-[#6B7566] text-white flex items-center justify-center mb-6 relative overflow-hidden shadow-xl"
                >
                  <Mail size={32} strokeWidth={1.5} className="relative z-10" />
                  <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full" />
                </motion.div>
                <span className="text-[#1A1A1A] font-serif text-xl mb-2 group-hover:text-[#6B7566] transition-colors">Открыть послание</span>
                <span className="text-[#A39171] uppercase tracking-[0.15em] text-xs font-medium">от семьи Никитиных</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpened && (
        <>
          {/* Background decorations */}
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F4EFE6] blur-[120px] rounded-full opacity-60" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#F4EFE6] blur-[120px] rounded-full opacity-60" />
            
            {/* Floating particles */}
            {[...Array(25)].map((_, i) => (
              <ParticleBackground 
                key={i} 
                left={`${Math.random() * 100}%`}
                delay={Math.random() * 15} 
                duration={15 + Math.random() * 20} 
              />
            ))}
          </div>

          <div className="max-w-5xl w-full mx-auto px-6 py-20 md:py-32 relative z-10 flex flex-col items-center min-h-screen">
            <FadeIn delay={0.4} className="text-center mb-24 md:mb-32 w-full">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
                className="flex justify-center mb-10 text-[#6B7566]"
              >
                <Leaf size={56} strokeWidth={1} />
              </motion.div>
              <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-[#1A1A1A] mb-8 tracking-tight">С Днём Свадьбы!</h1>
              <div className="w-24 h-[1px] bg-[#6B7566] mx-auto mb-10"></div>
              <p className="text-xl md:text-3xl text-[#555] font-serif italic tracking-wide">
                Полина и Дмитрий
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mb-24 md:mb-32 w-full">
              <FadeIn delay={0.6} className="relative group">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F4EFE6] h-full group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500">
                  <h2 className="font-serif text-3xl md:text-4xl mb-6 text-[#1A1A1A] relative z-10">О самом главном</h2>
                  <p className="text-lg md:text-xl leading-relaxed text-[#555] font-light relative z-10">
                    Сегодня начинается новая, невероятно важная и прекрасная глава вашей жизни. Семья — это самое ценное, что мы можем создать, это тихая гавань в любые штормы и источник огромного счастья.
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.8} className="relative group">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F4EFE6] h-full group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500">
                  <h2 className="font-serif text-3xl md:text-4xl mb-6 text-[#1A1A1A] relative z-10">Вместе и навсегда</h2>
                  <p className="text-lg md:text-xl leading-relaxed text-[#555] font-light relative z-10">
                    Пусть каждый ваш день будет наполнен любовью, взаимопониманием и радостью. Пусть ваш дом будет полной чашей, где всегда звучит смех, царит уют и рождаются лучшие моменты.
                  </p>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={1} className="w-full max-w-4xl mx-auto text-center bg-white p-12 md:p-20 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-[#F4EFE6] relative mb-24 md:mb-32 group hover:shadow-[0_30px_70px_rgba(0,0,0,0.06)] transition-shadow duration-500">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-full border border-[#F4EFE6] text-[#D4AF37] shadow-sm group-hover:scale-110 transition-transform duration-500">
                <Heart size={36} strokeWidth={1.5} className="fill-[#D4AF37]/10" />
              </div>
              <h3 className="font-serif text-2xl md:text-4xl lg:text-4xl text-[#1A1A1A] leading-tight md:leading-snug mb-10">
                Храните тепло ваших чувств, поддерживайте друг друга во всем и помните, что теперь вы — одна команда!
              </h3>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-[1px] bg-[#E8DCC4]"></div>
                <p className="text-[#A39171] uppercase tracking-[0.2em] text-sm md:text-base font-medium">Бесконечного вам счастья</p>
                <div className="w-12 h-[1px] bg-[#E8DCC4]"></div>
              </div>
            </FadeIn>

            <InteractiveGoriko />
          </div>

          <AnimatePresence>
            {isOpened && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMusic}
                className="fixed bottom-6 md:bottom-10 right-6 md:right-10 z-50 w-12 md:w-14 h-12 md:h-14 rounded-full bg-white shadow-lg border border-[#F4EFE6] flex items-center justify-center text-[#6B7566] cursor-pointer outline-none hover:shadow-xl transition-shadow"
              >
                {isPlaying ? <Volume2 size={24} /> : <VolumeX size={24} />}
                {isPlaying && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 text-[#D4AF37]"
                  >
                    <Music size={14} />
                  </motion.div>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          <audio
            ref={audioRef}
            loop
            onError={(e) => {
              if (e.currentTarget.src.includes('mikaya_pust.mp3')) {
                e.currentTarget.src = "https://cdn.pixabay.com/audio/2022/04/27/audio_67b36f7a63.mp3";
                e.currentTarget.play().catch(() => {});
              }
              console.log("Audio failed to load");
            }}
            src="/mikaya_pust.mp3"
          />
        </>
      )}
    </div>
  );
}
