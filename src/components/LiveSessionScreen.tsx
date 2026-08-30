import React, { useState, useEffect, useRef } from 'react';
import { CueCardTopic, TestMode, TranscriptItem, LiveVoiceStatus } from '../types';
import { AudioVisualizer } from './AudioVisualizer';
import { 
  Mic, 
  MicOff, 
  ChevronRight, 
  RotateCcw, 
  MessageSquare, 
  Volume2, 
  X, 
  Sparkles, 
  Clock, 
  Lightbulb,
  Edit3,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  PauseCircle,
  PlayCircle
} from 'lucide-react';

interface LiveSessionScreenProps {
  topic: CueCardTopic;
  testMode: TestMode;
  currentPart: 1 | 2 | 3;
  onAdvancePart: () => void;
  voiceStatus: LiveVoiceStatus;
  userVolume: number;
  isMuted: boolean;
  onToggleMute: () => void;
  transcript: TranscriptItem[];
  currentInterimText: string;
  onFinishAndGenerateReport: () => void;
  onCancelSession: () => void;
  onReconnect: () => void;
  onSkipPrep?: () => void;
  liveWpm: number;
  avgWpm: number;
  peakWpm: number;
  totalCandidateWords: number;
  activeSpeakingSeconds: number;
  isPacingClockPaused: boolean;
  silenceSeconds?: number;
  silenceStage?: 'none' | 'thinking' | 'prolonged';
}

export const LiveSessionScreen: React.FC<LiveSessionScreenProps> = ({
  topic,
  testMode,
  currentPart,
  onAdvancePart,
  voiceStatus,
  userVolume,
  isMuted,
  onToggleMute,
  transcript,
  currentInterimText,
  onFinishAndGenerateReport,
  onCancelSession,
  onReconnect,
  onSkipPrep,
  liveWpm,
  avgWpm,
  peakWpm,
  totalCandidateWords,
  activeSpeakingSeconds,
  isPacingClockPaused,
  silenceSeconds = 0,
  silenceStage = 'none',
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [scratchNotes, setScratchNotes] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Elapsed session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentInterimText]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPartTitle = (part: number) => {
    if (part === 1) return 'Part 1: Introduction & Warmup';
    if (part === 2) return 'Part 2: Long Turn (Cue Card)';
    return 'Part 3: Two-Way Discussion';
  };

  const getPartProgressPercent = () => {
    if (currentPart === 2) {
      if (voiceStatus.isPreparing) {
        return Math.max(5, ((60 - voiceStatus.prepSecondsRemaining) / 60) * 100);
      }
      return Math.max(5, ((120 - voiceStatus.speakingSecondsRemaining) / 120) * 100);
    }
    // Part 1/3 progress estimate based on elapsed turns
    const currentPartTurns = transcript.filter(t => t.part === currentPart).length;
    return Math.min(95, Math.max(10, currentPartTurns * 20));
  };

  const getPacingBadge = (wpm: number) => {
    if (wpm === 0) {
      return { label: 'Awaiting Speech', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (wpm < 115) {
      return { label: 'Deliberate / Pauses', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (wpm <= 155) {
      return { label: 'Optimal Flow', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (wpm <= 175) {
      return { label: 'Brisk Pace', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return { label: 'High-Speed Burst', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  };

  const currentPacingBadge = getPacingBadge(liveWpm > 0 ? liveWpm : avgWpm);

  const isPrepTime = voiceStatus.isPreparing;

  return (
    <div id="live-session-screen" className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Main Content Area: Stage on Left, Aside Panel on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Interactive Main Stage */}
        <div className="flex-1 flex flex-col p-4 sm:p-8 relative overflow-y-auto">
          {/* Top Status & Pacing Telemetry Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                isPrepTime
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : voiceStatus.isAiSpeaking
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : voiceStatus.isUserSpeaking
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : silenceStage === 'prolonged'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : silenceStage === 'thinking'
                  ? 'bg-blue-50 text-blue-800 border-blue-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isPrepTime
                    ? 'bg-amber-500 animate-ping'
                    : voiceStatus.isAiSpeaking
                    ? 'bg-blue-600 animate-pulse'
                    : voiceStatus.isUserSpeaking
                    ? 'bg-emerald-500 animate-pulse'
                    : silenceStage === 'prolonged'
                    ? 'bg-amber-500 animate-pulse'
                    : silenceStage === 'thinking'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-emerald-500'
                }`} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isPrepTime
                    ? `1-Min Prep: ${voiceStatus.prepSecondsRemaining}s left`
                    : voiceStatus.isAiSpeaking
                    ? 'Examiner is Speaking'
                    : voiceStatus.isUserSpeaking
                    ? 'Candidate Speaking'
                    : silenceStage === 'prolonged'
                    ? `Silence Detected (${silenceSeconds}s)`
                    : silenceStage === 'thinking'
                    ? `Thinking Pause (${silenceSeconds}s)`
                    : 'Examiner is Listening'}
                </span>
              </div>

              {/* Live WPM Badge with Paused Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white shadow-xs">
                <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-extrabold text-slate-900 font-mono">
                    {liveWpm > 0 ? liveWpm : (avgWpm > 0 ? avgWpm : '—')}
                  </span>
                  <span className="text-slate-400 text-[11px]">WPM</span>
                  {isPacingClockPaused ? (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded ml-1 inline-flex items-center gap-1">
                      <PauseCircle className="w-3 h-3" />
                      Paused (Examiner/Prep)
                    </span>
                  ) : (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ml-1 ${currentPacingBadge.color}`}>
                      {currentPacingBadge.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Part Advance button on mobile/desktop */}
            {testMode === 'full' && currentPart < 3 && (
              <button
                id="advance-part-top-btn"
                type="button"
                onClick={onAdvancePart}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100 transition"
              >
                <span>Part {currentPart + 1}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Center Stage: Audio Waveform Visualizer */}
          <div className="flex flex-col items-center justify-center my-auto py-2 sm:py-4">
            <AudioVisualizer
              isAiSpeaking={voiceStatus.isAiSpeaking}
              isUserSpeaking={voiceStatus.isUserSpeaking}
              userVolume={userVolume}
              connectionStatus={voiceStatus.connectionStatus}
              isMuted={isMuted}
              isPrepTime={voiceStatus.isPreparing}
              prepSecondsRemaining={voiceStatus.prepSecondsRemaining}
              silenceSeconds={silenceSeconds}
              silenceStage={silenceStage}
            />

            {voiceStatus.connectionStatus === 'disconnected' && (
              <button
                id="reconnect-session-btn"
                onClick={onReconnect}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-300 hover:bg-amber-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reconnect Live Voice
              </button>
            )}
          </div>

          {/* Dialogue Transcript Container */}
          <div className="max-w-2xl mx-auto w-full bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm mt-2">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Dialogue Stream</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">{totalCandidateWords} words spoken</span>
                <span className="text-slate-300">•</span>
                <span>{transcript.length} turns</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
              {transcript.length === 0 && !currentInterimText && (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs italic">
                    The examiner is greeting you... Speak into your microphone to answer.
                  </p>
                </div>
              )}

              {transcript.map((item) => {
                const isExaminer = item.speaker === 'examiner';
                return (
                  <div
                    key={item.id}
                    className={`flex gap-3 items-start ${
                      isExaminer ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {isExaminer && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        AI
                      </div>
                    )}

                    <div
                      className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isExaminer
                          ? 'bg-white rounded-tl-none border border-slate-100 shadow-sm text-slate-700 max-w-[85%]'
                          : 'bg-blue-600 rounded-tr-none shadow-md text-white max-w-[80%]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{item.text}</p>
                    </div>

                    {!isExaminer && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-700">
                        YOU
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Interim Real-time candidate speech caption */}
              {currentInterimText && (
                <div className="flex gap-3 items-start justify-end">
                  <div className="bg-blue-500/90 p-3 rounded-2xl rounded-tr-none shadow-sm text-xs sm:text-sm text-white max-w-[80%] italic animate-pulse">
                    <p>{currentInterimText}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-800">
                    YOU
                  </div>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>

        {/* Aside Sidebar: Timers, Live Pacing Monitor, Cue Card, Pro Tips */}
        <aside className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 sm:p-6 flex flex-col gap-5 shadow-[-4px_0_12px_rgba(0,0,0,0.02)] overflow-y-auto">
          {/* Active Part & Time Tracker */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              {getPartTitle(currentPart)}
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-600 px-2 py-1 bg-blue-50 rounded">
                  {currentPart === 2 && isPrepTime
                    ? 'Preparation Time'
                    : currentPart === 2
                    ? 'Long Turn Goal'
                    : 'Elapsed Session'}
                </span>
                <span className="text-xl font-mono font-bold text-slate-800">
                  {currentPart === 2 && isPrepTime
                    ? `00:${voiceStatus.prepSecondsRemaining < 10 ? '0' : ''}${voiceStatus.prepSecondsRemaining}`
                    : currentPart === 2
                    ? `0${Math.floor(voiceStatus.speakingSecondsRemaining / 60)}:${(voiceStatus.speakingSecondsRemaining % 60) < 10 ? '0' : ''}${voiceStatus.speakingSecondsRemaining % 60}`
                    : formatElapsed(elapsedSeconds)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${getPartProgressPercent()}%` }}
                />
              </div>

              {isPrepTime && onSkipPrep && (
                <button
                  id="skip-prep-btn"
                  onClick={onSkipPrep}
                  className="mt-3 w-full py-1.5 px-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-lg transition text-center"
                >
                  Skip Prep & Start Speaking Now
                </button>
              )}
            </div>
          </div>

          {/* Live Pacing & Fluency Monitor */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                Live Pacing Telemetry
              </span>
              <span className="text-[10px] text-slate-400">
                {activeSpeakingSeconds}s active speech
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-3">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block">Current</span>
                <span className="text-base font-extrabold text-blue-700 font-mono">
                  {liveWpm > 0 ? liveWpm : (avgWpm > 0 ? avgWpm : '—')}
                </span>
                <span className="text-[9px] text-slate-400 block">WPM</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block">Average</span>
                <span className="text-base font-extrabold text-slate-800 font-mono">
                  {avgWpm > 0 ? avgWpm : '—'}
                </span>
                <span className="text-[9px] text-slate-400 block">WPM</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block">Peak Burst</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">
                  {peakWpm > 0 ? peakWpm : '—'}
                </span>
                <span className="text-[9px] text-slate-400 block">WPM</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
              <span>Total Candidate Words:</span>
              <strong className="font-mono text-slate-800">{totalCandidateWords}</strong>
            </div>
          </div>

          {/* Cue Card Prompt Box */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              {currentPart === 2 ? 'Cue Card Prompt' : 'Test Topic'}
            </h3>

            <div className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm">
              <p className="font-bold text-slate-800 mb-2.5 text-xs sm:text-sm">
                {topic.cueCardText}
              </p>

              <ul className="text-xs text-slate-600 space-y-1.5">
                {topic.bulletPoints.map((point, index) => (
                  <li key={index} className="flex gap-2 items-start">
                    <span className="text-blue-500 font-bold leading-none">•</span>
                    <span>{point}</span>
                  </li>
                ))}
                {currentPart === 3 && topic.part3Questions && topic.part3Questions.length > 0 && (
                  <li className="font-medium text-slate-800 pt-2 border-t border-slate-100 text-xs">
                    Follow-up focus: {topic.part3Questions[0]}
                  </li>
                )}
              </ul>

              {/* Collapsible scratchpad for Part 2 */}
              {currentPart === 2 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    id="toggle-notes-btn"
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-blue-600"
                  >
                    <span className="flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                      1-Min Note Scratchpad
                    </span>
                    {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showNotes && (
                    <textarea
                      id="scratchpad-notes"
                      value={scratchNotes}
                      onChange={(e) => setScratchNotes(e.target.value)}
                      placeholder="Keywords, connectors, topic phrases..."
                      rows={2}
                      className="mt-2 w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-400 outline-none resize-none"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pro Tip Box */}
          <div className="mt-auto p-3.5 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-800 font-medium leading-relaxed">
              <strong className="block mb-1 text-blue-900 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                Examiner Pro Tip:
              </strong>
              {currentPart === 1
                ? 'Keep Part 1 answers direct and natural (2-3 sentences). Avoid overly rehearsed or robotic monologues.'
                : currentPart === 2
                ? 'Structure your story chronologically: Setting the scene → Main narrative details → Personal reflection.'
                : 'In Part 3, give balanced perspectives: "On one hand... However, looking at the wider picture..."'}
            </p>
          </div>
        </aside>
      </div>

      {/* Footer Controls Bar */}
      <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">
        {/* Left side: Mute / Status */}
        <div className="flex items-center gap-4">
          <button
            id="toggle-mic-mute-btn"
            onClick={onToggleMute}
            className={`flex items-center gap-2 transition-colors ${
              isMuted ? 'text-rose-600 hover:text-rose-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isMuted ? (
              <>
                <MicOff className="w-5 h-5 text-rose-500" />
                <span className="text-xs sm:text-sm font-semibold">Unmute Mic</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-blue-600" />
                <span className="text-xs sm:text-sm font-semibold">Mute Mic</span>
              </>
            )}
          </button>
        </div>

        {/* Center: Cancel (Red Circle) and Active Mic (Blue Circle) */}
        <div className="flex items-center gap-4">
          {/* Cancel Button */}
          <button
            id="cancel-session-btn"
            onClick={onCancelSession}
            className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-red-600 transition-colors"
            title="End test without generating report"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Active Speaking Indicator Orb */}
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ring-4 transition-all shadow-md ${
              isMuted
                ? 'bg-slate-400 ring-slate-100'
                : voiceStatus.isUserSpeaking
                ? 'bg-emerald-600 ring-emerald-100 scale-105'
                : 'bg-blue-600 ring-blue-50'
            }`}>
              <Mic className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Right side: Finish and Get Band Report */}
        <button
          id="end-session-and-report-btn"
          onClick={onFinishAndGenerateReport}
          className="bg-slate-900 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2"
        >
          <span>End Session & Get Report</span>
        </button>
      </footer>
    </div>
  );
};
