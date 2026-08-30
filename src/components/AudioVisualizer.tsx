import React from 'react';
import { motion } from 'motion/react';
import { Mic, Volume2, AlertCircle, Hourglass, Clock, Sparkles } from 'lucide-react';

interface AudioVisualizerProps {
  isAiSpeaking: boolean;
  isUserSpeaking: boolean;
  userVolume: number;
  connectionStatus: string;
  isMuted: boolean;
  isPrepTime?: boolean;
  prepSecondsRemaining?: number;
  silenceSeconds?: number;
  silenceStage?: 'none' | 'thinking' | 'prolonged';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isAiSpeaking,
  isUserSpeaking,
  userVolume,
  connectionStatus,
  isMuted,
  isPrepTime = false,
  prepSecondsRemaining = 0,
  silenceSeconds = 0,
  silenceStage = 'none',
}) => {
  // Waveform bars with tailored height curves matching the design spec
  const barConfigs = [
    { baseH: 8, opacity: 'opacity-40', color: 'bg-blue-500' },
    { baseH: 12, opacity: 'opacity-50', color: 'bg-blue-500' },
    { baseH: 24, opacity: 'opacity-70', color: 'bg-blue-500' },
    { baseH: 32, opacity: 'opacity-100', color: 'bg-blue-600' },
    { baseH: 20, opacity: 'opacity-90', color: 'bg-blue-600' },
    { baseH: 28, opacity: 'opacity-80', color: 'bg-blue-500' },
    { baseH: 16, opacity: 'opacity-60', color: 'bg-blue-500' },
    { baseH: 10, opacity: 'opacity-40', color: 'bg-blue-500' },
    { baseH: 6, opacity: 'opacity-30', color: 'bg-blue-400' },
  ];

  const isSilenceDetected = !isAiSpeaking && !isUserSpeaking && !isPrepTime && !isMuted && silenceStage !== 'none';

  return (
    <div id="audio-visualizer-container" className="flex flex-col items-center justify-center py-4 w-full">
      {/* Dynamic Waveform Visualizer Center */}
      <div className="flex items-center justify-center gap-1.5 h-28 sm:h-32 my-2 relative">
        {barConfigs.map((config, index) => {
          let heightMultiplier = 1;
          if (isAiSpeaking) {
            const time = Date.now() / 160;
            const wave = (Math.sin(time + index * 0.7) + 1.2) * 1.3;
            heightMultiplier = wave;
          } else if (isUserSpeaking && !isMuted) {
            const volBoost = Math.max(0.5, userVolume * 3.5);
            const variation = (Math.sin(index * 0.9) + 1.2) * 0.8;
            heightMultiplier = volBoost * variation;
          } else if (isPrepTime) {
            heightMultiplier = 0.5 + Math.sin(Date.now() / 300 + index) * 0.2;
          } else if (isSilenceDetected) {
            // Gentle subtle rhythmic breathing ripple during silence
            heightMultiplier = 0.4 + Math.sin(Date.now() / 600 + index * 0.5) * 0.15;
          } else if (isMuted) {
            heightMultiplier = 0.3;
          }

          const computedHeight = Math.min(100, Math.max(6, config.baseH * heightMultiplier * 2.2));

          return (
            <motion.div
              key={index}
              animate={{ height: `${computedHeight}px` }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              className={`w-2 rounded-full transition-colors ${
                isMuted
                  ? 'bg-slate-300 opacity-40'
                  : isPrepTime
                  ? 'bg-amber-400 opacity-75'
                  : isSilenceDetected
                  ? silenceStage === 'prolonged'
                    ? 'bg-amber-400 opacity-60'
                    : 'bg-blue-400 opacity-50'
                  : `${config.color} ${config.opacity}`
              }`}
            />
          );
        })}
      </div>

      {/* Silence Detection Soft Pulsing Indicator Banner */}
      {isSilenceDetected && (
        <motion.div
          id="silence-indicator-cue"
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs mb-2 transition-all shadow-xs ${
            silenceStage === 'prolonged'
              ? 'bg-amber-50/90 text-amber-900 border-amber-300 ring-4 ring-amber-100/60'
              : 'bg-blue-50/90 text-blue-900 border-blue-200 ring-4 ring-blue-50/60'
          }`}
        >
          {/* Soft breathing pulse dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              silenceStage === 'prolonged' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              silenceStage === 'prolonged' ? 'bg-amber-600' : 'bg-blue-600'
            }`} />
          </span>

          <span className="font-medium">
            {silenceStage === 'prolonged'
              ? `Extended silence (${silenceSeconds}s) — Examiner will re-prompt or move on shortly`
              : `Thinking time (${silenceSeconds}s) — Examiner is listening, take your time`}
          </span>
        </motion.div>
      )}

      {/* Subtitle / Guidance */}
      <p className="text-slate-400 text-xs sm:text-sm italic mt-1 text-center">
        {isPrepTime
          ? `Preparation time: ${prepSecondsRemaining} seconds remaining`
          : isAiSpeaking
          ? 'Examiner speaking... (You can speak to interrupt anytime)'
          : isUserSpeaking && !isMuted
          ? 'Listening to candidate voice...'
          : isMuted
          ? 'Microphone is currently muted'
          : isSilenceDetected
          ? 'Speak into your microphone when you are ready...'
          : 'Speak clearly into your microphone...'}
      </p>
    </div>
  );
};

