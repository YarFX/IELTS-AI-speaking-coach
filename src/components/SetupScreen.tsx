import React, { useState } from 'react';
import { CueCardTopic, TestMode, AppUser } from '../types';
import { IELTS_TOPICS } from '../data/topics';
import { 
  Sparkles, 
  Shuffle, 
  Mic, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Layers, 
  BookOpen, 
  Volume2, 
  Check,
  Cloud,
  Lock
} from 'lucide-react';

interface SetupScreenProps {
  selectedTopic: CueCardTopic;
  onSelectTopic: (topic: CueCardTopic) => void;
  testMode: TestMode;
  onSelectTestMode: (mode: TestMode) => void;
  selectedVoice: string;
  onSelectVoice: (voice: string) => void;
  onStartSession: () => void;
  hasMicPermission: boolean;
  onRequestMicPermission: () => Promise<boolean>;
  isStarting: boolean;
  user?: AppUser | null;
  onLogin?: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  selectedTopic,
  onSelectTopic,
  testMode,
  onSelectTestMode,
  selectedVoice,
  onSelectVoice,
  onStartSession,
  hasMicPermission,
  onRequestMicPermission,
  isStarting,
  user,
  onLogin
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [micTesting, setMicTesting] = useState(false);
  const [micTestPassed, setMicTestPassed] = useState(hasMicPermission);

  const categories = ['All', ...Array.from(new Set(IELTS_TOPICS.map(t => t.category)))];

  const filteredTopics = selectedCategory === 'All'
    ? IELTS_TOPICS
    : IELTS_TOPICS.filter(t => t.category === selectedCategory);

  const handleRandomizeTopic = () => {
    const remaining = IELTS_TOPICS.filter(t => t.id !== selectedTopic.id);
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    onSelectTopic(random);
  };

  const handleTestMic = async () => {
    setMicTesting(true);
    const ok = await onRequestMicPermission();
    setMicTestPassed(ok);
    setMicTesting(false);
  };

  return (
    <div id="setup-screen" className="max-w-5xl mx-auto px-4 py-8">
      {/* Intro Banner */}
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Real-time Live Audio Practice
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Master Your IELTS Speaking Exam
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Have an authentic 2-way voice conversation with our certified AI Examiner. Speak naturally, practice interrupting, and receive an official band score breakdown.
        </p>

        {/* Cloud Sync / Google Login Banner */}
        {!user && onLogin && (
          <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Sign in with Google to save your history</p>
                <p className="text-[11px] text-slate-600">Store exam recordings, WPM pacing, and band scores across all your devices.</p>
              </div>
            </div>
            <button
              id="setup-google-signin-btn"
              type="button"
              onClick={onLogin}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs shadow-xs transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.053 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              <span>Sign In with Google</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Test Configuration & Topic Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Test Mode Selection */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              1. Select Test Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                id="mode-full-test"
                type="button"
                onClick={() => onSelectTestMode('full')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  testMode === 'full'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Full Test (Recommended)</span>
                    {testMode === 'full' && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Parts 1, 2 & 3 in sequence with official timing (~11–14 min).
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                  Complete Simulation
                </span>
              </button>

              <button
                id="mode-part2-only"
                type="button"
                onClick={() => onSelectTestMode('part2')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  testMode === 'part2'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Part 2: Long Turn</span>
                    {testMode === 'part2' && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    1 min prep countdown + 2 min continuous speaking on cue card.
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                  Focus on Cue Card
                </span>
              </button>

              <button
                id="mode-part1-only"
                type="button"
                onClick={() => onSelectTestMode('part1')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  testMode === 'part1'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Part 1: Interview</span>
                    {testMode === 'part1' && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Quick conversational warmup on familiar daily topics (4–5 min).
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                  Intro & Warmup
                </span>
              </button>

              <button
                id="mode-part3-only"
                type="button"
                onClick={() => onSelectTestMode('part3')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  testMode === 'part3'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Part 3: Discussion</span>
                    {testMode === 'part3' && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Abstract analysis, deep probing questions and justifications.
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                  Deep Analytical
                </span>
              </button>
            </div>
          </div>

          {/* 2. Cue Card Topic Browser */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                2. Choose IELTS Speaking Topic
              </label>

              <button
                id="randomize-topic-btn"
                type="button"
                onClick={handleRandomizeTopic}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Randomize Topic
              </button>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Topic List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredTopics.map((topic) => {
                const isSelected = selectedTopic.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    id={`topic-${topic.id}`}
                    onClick={() => onSelectTopic(topic)}
                    className={`w-full p-3 rounded-xl text-left border transition flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-slate-900 font-semibold'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
                          {topic.category}
                        </span>
                        <span className="text-sm font-medium">{topic.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {topic.cueCardText}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 ml-2">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Topic Preview, Voice, Mic & Start (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cue Card Preview Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-blue-300">
                Selected Cue Card
              </span>
              <span>{selectedTopic.category}</span>
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              {selectedTopic.cueCardText}
            </h3>

            <p className="text-xs font-semibold text-slate-300 mb-2">
              You should say:
            </p>

            <ul className="space-y-1.5 text-xs text-slate-300 mb-4 pl-1">
              {selectedTopic.bulletPoints.map((bp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <span>{bp}</span>
                </li>
              ))}
            </ul>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Followed by 2-3 Part 3 discussion questions</span>
            </div>
          </div>

          {/* Examiner Voice & Persona Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-blue-600" />
              Examiner Voice
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Puck', label: 'Puck (British/Warm)', desc: 'Natural & supportive' },
                { name: 'Aoede', label: 'Aoede (Clear)', desc: 'Standard & articulate' },
                { name: 'Charon', label: 'Charon (Formal)', desc: 'Deep & professional' },
                { name: 'Kore', label: 'Kore (Calm)', desc: 'Relaxed & paced' },
              ].map((v) => (
                <button
                  key={v.name}
                  id={`voice-${v.name}`}
                  type="button"
                  onClick={() => onSelectVoice(v.name)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedVoice === v.name
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{v.label}</div>
                  <div className="text-[10px] text-slate-500">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Microphone Verification Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-blue-600" />
                Microphone Access
              </span>
              {micTestPassed ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Required
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Real-time voice conversation requires microphone access. Please allow mic access when prompted by the browser.
            </p>

            <button
              id="test-mic-button"
              type="button"
              onClick={handleTestMic}
              disabled={micTesting}
              className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-2"
            >
              <Mic className="w-3.5 h-3.5 text-blue-600" />
              {micTesting ? 'Checking Microphone...' : micTestPassed ? 'Re-test Microphone' : 'Grant / Test Microphone Permission'}
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            id="start-speaking-test-btn"
            type="button"
            onClick={onStartSession}
            disabled={isStarting}
            className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md hover:shadow-lg transition transform active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {isStarting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting with AI Examiner...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Speaking Practice</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
