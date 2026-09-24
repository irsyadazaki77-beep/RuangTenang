import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  CloudRain,
  Waves,
  Trees,
  Headphones,
  Music,
  Coffee,
  Sparkles,
  Clock,
  Timer,
  ChevronDown,
  X,
  Maximize2,
  Sliders,
  Radio,
  RotateCcw,
  Zap
} from 'lucide-react';
import {
  soundscapeEngine,
  SOUNDSCAPE_TRACKS,
  SoundscapeState,
  SoundscapeTrackId,
  TimerMode
} from '../../lib/soundscapeEngine';

interface AmbientSoundscapeWidgetProps {
  currentMode?: 'RUANG_TENANG' | 'RUANG_KERJA';
}

export const AmbientSoundscapeWidget: React.FC<AmbientSoundscapeWidgetProps> = ({
  currentMode = 'RUANG_TENANG'
}) => {
  const [engineState, setEngineState] = useState<SoundscapeState>(soundscapeEngine.state);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'mixer' | 'timer'>('mixer');
  const [visualizerLevel, setVisualizerLevel] = useState(0);

  // Sync state with soundscape engine
  useEffect(() => {
    const unsubscribe = soundscapeEngine.subscribe(newState => {
      setEngineState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Visualizer Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    const updateVisualizer = () => {
      if (engineState.isPlaying) {
        const level = soundscapeEngine.getVisualizerLevel();
        setVisualizerLevel(level);
      } else {
        setVisualizerLevel(0);
      }
      animationFrameId = requestAnimationFrame(updateVisualizer);
    };

    animationFrameId = requestAnimationFrame(updateVisualizer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [engineState.isPlaying]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTrackIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case 'CloudRain': return <CloudRain className={className} />;
      case 'Waves': return <Waves className={className} />;
      case 'Trees': return <Trees className={className} />;
      case 'Headphones': return <Headphones className={className} />;
      case 'Music': return <Music className={className} />;
      case 'Coffee': return <Coffee className={className} />;
      default: return <Volume2 className={className} />;
    }
  };

  const filteredTracks = SOUNDSCAPE_TRACKS.filter(t => 
    currentMode === 'RUANG_KERJA' ? t.category === 'RUANG_KERJA' : t.category === 'RUANG_TENANG'
  );

  return (
    <>
      {/* Floating Widget: Minimized Badge vs Expanded Pill */}
      <aside 
        aria-label="Pemutar Suara Latar Ambient & Timer Fokus"
        className="fixed bottom-24 right-4 sm:right-6 sm:bottom-24 z-30 flex items-center gap-2 select-none pointer-events-auto"
      >
        <AnimatePresence mode="wait">
          {isMinimized ? (
            <motion.div
              key="minimized-soundscape"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <button
                onClick={() => setIsMinimized(false)}
                className={`group relative w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                  engineState.isPlaying
                    ? 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white border-teal-400/40 shadow-teal-500/25 ring-2 ring-teal-400/30'
                    : 'bg-white/95 dark:bg-slate-900/95 border-stone-200/80 dark:border-slate-800 text-stone-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400'
                }`}
                title="Buka Pemutar Soundscape"
                aria-label="Buka Pemutar Soundscape Ambient"
              >
                {engineState.isPlaying ? (
                  <div className="relative flex items-center justify-center">
                    <Headphones className="w-4 h-4 animate-pulse" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                  </div>
                ) : (
                  <Headphones className="w-4 h-4" />
                )}
                {/* Tooltip on hover */}
                <span className="absolute right-full mr-2 px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                  {engineState.isPlaying ? 'Soundscape Aktif' : 'Soundscape Tenang'}
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="expanded-soundscape-pill"
              layout
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative group"
            >
              {/* Main Floating Pill Button */}
              <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-stone-200/80 dark:border-slate-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
                {/* Quick Play/Pause */}
                <button
                  onClick={() => soundscapeEngine.togglePlay()}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    engineState.isPlaying
                      ? 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-500/20'
                      : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
                  }`}
                  title={engineState.isPlaying ? 'Jeda Suara Ambient' : 'Putar Suara Latar Ambient'}
                  aria-label={engineState.isPlaying ? 'Jeda Suara Ambient' : 'Putar Suara Latar Ambient'}
                >
                  {engineState.isPlaying ? (
                    <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                  )}
                </button>

                {/* Audio Waveform Bars (Visualizer) & Status */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-1 text-left cursor-pointer hover:opacity-80 transition-opacity"
                  title="Buka Mixer Soundscape & Timer"
                  aria-label="Buka Mixer Soundscape & Timer"
                >
                  {/* Dynamic Animated Bars */}
                  <div className="flex items-end gap-[2.5px] sm:gap-[3px] h-3.5 sm:h-4 w-4 sm:w-5">
                    {[0.4, 0.8, 1.0, 0.6].map((multiplier, i) => {
                      const baseHeight = engineState.isPlaying ? Math.max(3, (visualizerLevel * 20 + 4) * multiplier) : 3;
                      return (
                        <motion.div
                          key={i}
                          className={`w-[2.5px] sm:w-[3px] rounded-full transition-all duration-75 ${
                            engineState.isPlaying ? 'bg-teal-500 dark:bg-teal-400' : 'bg-stone-300 dark:bg-slate-700'
                          }`}
                          style={{ height: `${baseHeight}px` }}
                        />
                      );
                    })}
                  </div>

                  {/* Text Title & Subtitle - Hidden on mobile (< sm) for compact pill form factor */}
                  <div className="hidden sm:block">
                    <div className="text-[11.5px] font-semibold text-stone-800 dark:text-stone-200 leading-tight whitespace-nowrap">
                      {engineState.isPlaying ? (
                        currentMode === 'RUANG_KERJA' ? 'Fokus Suara Ambient' : 'Soundscape Tenang'
                      ) : (
                        'Suara Latar'
                      )}
                    </div>
                    <div className="text-[9.5px] text-stone-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
                      {engineState.timerMode !== 'none' ? (
                        <span className="text-teal-600 dark:text-teal-400 font-medium">
                          ⏱ {formatTimer(engineState.timerRemainingSeconds)}
                        </span>
                      ) : (
                        <span>{engineState.activeTracks.size} Layer Aktif</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Open Mixer Drawer Button */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Buka Panel Mixer Audio & Timer"
                  aria-label="Buka Panel Mixer Audio & Timer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>

                {/* Minimize / Collapse Button */}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Ciutkan Widget ke Samping"
                  aria-label="Ciutkan Widget Pemutar Musik"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* Expanded Soundscape Mixer & Timer Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            {/* Backdrop click */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-stone-200/80 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="p-4 border-b border-stone-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      Ambient Soundscape & Timer
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Sintesis Audio Web Murni • 100% Bebas Hak Cipta
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mode Tabs: Mixer vs Timer */}
              <div className="flex border-b border-stone-100 dark:border-slate-800 px-4 pt-2 gap-2">
                <button
                  onClick={() => setActiveTab('mixer')}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'mixer'
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
                      : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Audio Sound Mixer</span>
                </button>
                <button
                  onClick={() => setActiveTab('timer')}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'timer'
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
                      : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>Pomodoro & Sleep Timer</span>
                  {engineState.timerMode !== 'none' && (
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                  )}
                </button>
              </div>

              {/* Body Content */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                {activeTab === 'mixer' ? (
                  <>
                    {/* Quick Presets */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                        Preset Suara Cepat:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => soundscapeEngine.applyPreset('RUANG_TENANG')}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 hover:border-teal-400 bg-stone-50 dark:bg-slate-800/60 text-left transition-all cursor-pointer group"
                        >
                          <CloudRain className="w-4 h-4 text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
                          <div>
                            <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                              Hujan + Ombak
                            </div>
                            <div className="text-[10px] text-stone-400">Mode RuangTenang</div>
                          </div>
                        </button>

                        <button
                          onClick={() => soundscapeEngine.applyPreset('RUANG_KERJA')}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 hover:border-indigo-400 bg-stone-50 dark:bg-slate-800/60 text-left transition-all cursor-pointer group"
                        >
                          <Headphones className="w-4 h-4 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                          <div>
                            <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                              40Hz Gamma + Lofi
                            </div>
                            <div className="text-[10px] text-stone-400">Mode RuangKerja</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Master Volume Bar */}
                    <div className="p-3 bg-stone-50 dark:bg-slate-800/40 rounded-2xl border border-stone-200/70 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          Volume Utama (Master)
                        </span>
                        <span className="font-mono text-[11px] text-stone-500">
                          {Math.round(engineState.masterVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={engineState.masterVolume}
                        onChange={e => soundscapeEngine.setMasterVolume(parseFloat(e.target.value))}
                        className="w-full accent-teal-600 h-1.5 bg-stone-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Multi-Track Layers */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                        <span>Pilihan Lapisan Suara ({SOUNDSCAPE_TRACKS.length} Track):</span>
                        <span>Padukan Layer</span>
                      </div>

                      <div className="space-y-2">
                        {SOUNDSCAPE_TRACKS.map(track => {
                          const isActive = engineState.activeTracks.has(track.id);
                          const volume = engineState.trackVolumes[track.id] ?? 0.5;

                          return (
                            <div
                              key={track.id}
                              className={`p-3 rounded-2xl border transition-all ${
                                isActive
                                  ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800/60 shadow-3xs'
                                  : 'bg-white dark:bg-slate-850 border-stone-200/80 dark:border-slate-800 opacity-80 hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    onClick={() => soundscapeEngine.toggleTrack(track.id)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                      isActive
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'bg-stone-100 dark:bg-slate-800 text-stone-500 hover:bg-stone-200'
                                    }`}
                                  >
                                    {renderTrackIcon(track.icon, "w-3.5 h-3.5")}
                                  </button>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                                      {track.name}
                                    </div>
                                    <div className="text-[10px] text-stone-400 truncate">
                                      {track.description}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono text-stone-400">
                                    {isActive ? `${Math.round(volume * 100)}%` : 'Mati'}
                                  </span>
                                  <button
                                    onClick={() => soundscapeEngine.toggleTrack(track.id)}
                                    className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                                      isActive ? 'bg-teal-600' : 'bg-stone-200 dark:bg-slate-700'
                                    }`}
                                  >
                                    <div
                                      className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transform transition-transform ${
                                        isActive ? 'translate-x-3.5' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Individual Track Volume Slider */}
                              {isActive && (
                                <div className="pt-1 flex items-center gap-2 animate-in fade-in duration-150">
                                  <VolumeX className="w-3 h-3 text-stone-400" />
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={e =>
                                      soundscapeEngine.setTrackVolume(track.id, parseFloat(e.target.value))
                                    }
                                    className="w-full accent-teal-600 h-1 bg-stone-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                                  />
                                  <Volume2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* TIMER TAB (POMODORO & SLEEP TIMER) */
                  <div className="space-y-4">
                    {/* Active Timer Display */}
                    {engineState.timerMode !== 'none' ? (
                      <div className="p-5 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white text-center space-y-2 shadow-lg shadow-teal-500/20">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {engineState.timerMode === 'pomodoro'
                              ? engineState.pomodoroPhase === 'work'
                                ? 'Fokus Pomodoro (25 Min)'
                                : 'Waktu Rehat (5 Min)'
                              : 'Timer Tidur / Mati Otomatis'}
                          </span>
                        </div>
                        <div className="text-4xl font-extrabold font-mono tracking-wider">
                          {formatTimer(engineState.timerRemainingSeconds)}
                        </div>
                        <p className="text-xs text-teal-100">
                          {engineState.timerMode === 'sleep'
                            ? 'Volume akan memudar halus (fade-out) pada 60 detik terakhir.'
                            : 'Audio akan berbunyi lonceng lembut saat pergantian sesi.'}
                        </p>
                        <button
                          onClick={() => soundscapeEngine.stopTimer()}
                          className="mt-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Hentikan Pengatur Waktu
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-slate-800 text-center space-y-1">
                        <Timer className="w-6 h-6 text-stone-400 mx-auto" />
                        <h4 className="text-xs font-bold text-stone-700 dark:text-slate-300">
                          Tidak Ada Timer Aktif
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400">
                          Pilih sesi Pomodoro fokus belajar atau setel timer tidur dengan auto fade-out.
                        </p>
                      </div>
                    )}

                    {/* Pomodoro Focus Option */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                        Siklus Pomodoro (Belajar & Skripsi):
                      </label>
                      <button
                        onClick={() => soundscapeEngine.startPomodoroTimer()}
                        className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/60 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                            25m
                          </div>
                          <div>
                            <div className="text-xs font-bold text-teal-900 dark:text-teal-200">
                              Mulai Sesi Fokus Pomodoro
                            </div>
                            <div className="text-[11px] text-teal-700 dark:text-teal-300">
                              25 menit fokus penuh • 5 menit istirahat sejenak
                            </div>
                          </div>
                        </div>
                        <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </button>
                    </div>

                    {/* Sleep Timer Preset Buttons */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                        Timer Tidur / Mati Otomatis:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 45, 60].map(mins => (
                          <button
                            key={mins}
                            onClick={() => soundscapeEngine.startSleepTimer(mins)}
                            className="p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 hover:border-teal-500 bg-stone-50 dark:bg-slate-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-center transition-all cursor-pointer font-medium text-xs text-stone-800 dark:text-stone-200"
                          >
                            <div className="font-bold text-sm">{mins}</div>
                            <div className="text-[10px] text-stone-400">Menit</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Controls */}
              <div className="p-3 border-t border-stone-100 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-900/80 flex items-center justify-between">
                <button
                  onClick={() => soundscapeEngine.pauseAll()}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Matikan Semua Suara
                </button>

                <button
                  onClick={() => soundscapeEngine.togglePlay()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                >
                  {engineState.isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Jeda Audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Putar Soundscape</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
