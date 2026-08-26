import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Mic } from 'lucide-react';
import { formatFileSize } from '../lib/crypto';

interface AudioPlayerProps {
  src: string;
  fileName: string;
  fileSize?: number;
  isMine: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  fileName,
  fileSize,
  isMine,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize audio listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => console.error('Audio play error:', err));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = Math.max(0, Math.min(duration, (clickX / width) * duration));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Generate deterministic pseudo waveform heights
  const barsCount = 28;
  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      className={`p-3 rounded-2xl border transition-all ${
        isMine
          ? 'bg-indigo-700/60 border-indigo-500/40 text-white'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Top Title & Size */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              isMine ? 'bg-indigo-500/80 text-white' : 'bg-indigo-100 text-indigo-600'
            }`}
          >
            <Mic className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold truncate max-w-[160px] sm:max-w-[200px]">
            {fileName || 'Pesan Suara'}
          </span>
        </div>

        {fileSize && (
          <span className={`text-[10px] shrink-0 font-medium ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
            {formatFileSize(fileSize)}
          </span>
        )}
      </div>

      {/* Center Waveform & Play Button */}
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 cursor-pointer shrink-0 ${
            isMine
              ? 'bg-white text-indigo-600 hover:bg-indigo-50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title={isPlaying ? 'Jeda' : 'Putar Audio'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
        </button>

        {/* Interactive Waveform Progress */}
        <div
          onClick={handleSeek}
          className="flex-1 h-9 flex items-center gap-[2px] cursor-pointer py-1 select-none group"
          title="Klik untuk melompat waktu"
        >
          {Array.from({ length: barsCount }).map((_, i) => {
            const barProgress = i / barsCount;
            const isPlayed = barProgress <= progressRatio;
            // Deterministic waveform pattern
            const heightMultiplier = Math.sin((i / barsCount) * Math.PI * 3) * 0.4 + 0.6;
            const heightPercent = Math.max(25, Math.min(100, heightMultiplier * 100));

            return (
              <div
                key={i}
                style={{ height: `${heightPercent}%` }}
                className={`flex-1 rounded-full transition-all duration-75 ${
                  isPlayed
                    ? isMine
                      ? 'bg-white shadow-xs'
                      : 'bg-indigo-600'
                    : isMine
                    ? 'bg-indigo-400/50 group-hover:bg-indigo-300/60'
                    : 'bg-slate-300 group-hover:bg-slate-400'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-current/10 text-[11px]">
        {/* Timers */}
        <div className="font-mono text-[10px] tracking-tight opacity-90">
          <span>{formatTime(currentTime)}</span>
          <span className="mx-1 opacity-50">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={togglePlaybackRate}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
              isMine
                ? 'bg-indigo-600/70 hover:bg-indigo-600 text-indigo-100'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
            title="Kecepatan Putar"
          >
            {playbackRate}x
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isMine ? 'hover:bg-indigo-600/70 text-indigo-100' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title={isMuted ? 'Bunyikan' : 'Senyapkan'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Download button */}
          <a
            href={src}
            download={fileName || 'audio-message.webm'}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isMine ? 'hover:bg-indigo-600/70 text-indigo-100' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Unduh Pesan Suara"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
