import React, { useState } from 'react';
import { CueCardTopic } from '../types';
import { Clock, Edit3, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface CueCardViewProps {
  topic: CueCardTopic;
  isPrepTime: boolean;
  prepSecondsRemaining: number;
  isSpeakingTime: boolean;
  speakingSecondsRemaining: number;
  onSkipPrep?: () => void;
}

export const CueCardView: React.FC<CueCardViewProps> = ({
  topic,
  isPrepTime,
  prepSecondsRemaining,
  isSpeakingTime,
  speakingSecondsRemaining,
  onSkipPrep
}) => {
  const [scratchNotes, setScratchNotes] = useState('');
  const [showNotes, setShowNotes] = useState(true);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div id="ielts-cue-card" className="bg-white border-2 border-slate-100 rounded-2xl shadow-sm overflow-hidden mb-5">
      {/* Header */}
      <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-semibold text-xs tracking-wide uppercase">
            Part 2 Cue Card
          </span>
          <span className="text-xs text-slate-500 font-medium">{topic.category}</span>
        </div>

        {/* Dynamic Timers */}
        <div className="flex items-center gap-2">
          {isPrepTime ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                Prep: {prepSecondsRemaining}s left
              </span>
              {onSkipPrep && (
                <button
                  id="skip-prep-button"
                  onClick={onSkipPrep}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md transition"
                >
                  Start Speaking Now
                </button>
              )}
            </div>
          ) : isSpeakingTime ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Speaking Goal (1–2 min): {formatTime(speakingSecondsRemaining)}
            </span>
          ) : (
            <span className="text-xs text-slate-500">2 Minutes Speaking Target</span>
          )}
        </div>
      </div>

      {/* Cue Card Body */}
      <div className="p-5 sm:p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          {topic.cueCardText}
        </h3>

        <p className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-blue-600" />
          You should say:
        </p>

        <ul className="space-y-2 mb-5 pl-2">
          {topic.bulletPoints.map((point, idx) => (
            <li key={idx} className="text-sm text-slate-700 flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        {/* Quick Scratchpad / Note-taking during prep */}
        <div className="pt-3 border-t border-slate-100">
          <button
            id="toggle-scratchpad-btn"
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-blue-600 mb-2"
          >
            <span className="flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              Prep Notes & Keywords (Scratchpad)
            </span>
            {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showNotes && (
            <div>
              <textarea
                id="cue-card-scratchpad"
                value={scratchNotes}
                onChange={(e) => setScratchNotes(e.target.value)}
                placeholder="Jot down keywords or story points here during your 1 minute preparation time..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-300 outline-none resize-none bg-slate-50 placeholder-slate-400 text-slate-800"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
