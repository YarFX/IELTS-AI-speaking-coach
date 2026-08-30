import React, { useState } from 'react';
import { IELTSFeedbackReport, CueCardTopic, TranscriptItem } from '../types';
import { 
  Award, 
  CheckCircle, 
  Sparkles, 
  RotateCcw, 
  ArrowRight, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Bookmark, 
  TrendingUp, 
  Check,
  Activity,
  Zap,
  Clock,
  Info
} from 'lucide-react';

interface FeedbackReportScreenProps {
  report: IELTSFeedbackReport;
  topic: CueCardTopic;
  durationSeconds: number;
  transcript: TranscriptItem[];
  onPracticeAgain: () => void;
  onRetakeSameTopic: () => void;
  onSaveToCloud: () => Promise<void>;
  isSaved: boolean;
  targetBand: number;
}

export const FeedbackReportScreen: React.FC<FeedbackReportScreenProps> = ({
  report,
  topic,
  durationSeconds,
  transcript,
  onPracticeAgain,
  onRetakeSameTopic,
  onSaveToCloud,
  isSaved,
  targetBand,
}) => {
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getBandColor = (band: number) => {
    if (band >= 8.0) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (band >= 7.0) return 'text-blue-700 bg-blue-50 border-blue-300';
    if (band >= 6.0) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-amber-700 bg-amber-50 border-amber-300';
  };

  // Extract or compute pacing stats
  const pacingStats = report.pacingStats || report.pacingSummary;
  const avgWpm = pacingStats?.avgWpm || 0;
  const peakWpm = pacingStats?.peakWpm || 0;
  const totalWords = pacingStats?.totalWords || 
    transcript
      .filter(t => t.speaker === 'student')
      .reduce((acc, t) => acc + t.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const activeSeconds = pacingStats?.activeSpeakingSeconds || durationSeconds;

  const getPacingVerdict = (wpm: number) => {
    if (wpm < 115) {
      return {
        label: 'Deliberate / Hesitant',
        color: 'bg-amber-50 text-amber-800 border-amber-300',
        barPercent: Math.min(100, Math.max(10, (wpm / 200) * 100)),
        description: 'Pacing was measured under 115 WPM. Pauses may reflect vocabulary searching or cautious delivery. Aim for more sustained clause chaining.'
      };
    }
    if (wpm <= 155) {
      return {
        label: 'Optimal Conversational Flow',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        barPercent: Math.min(100, Math.max(10, (wpm / 200) * 100)),
        description: 'Pacing was in the natural 120–155 WPM conversational window, allowing clear intonation, natural vowel length, and easy comprehensibility.'
      };
    }
    if (wpm <= 175) {
      return {
        label: 'Brisk Delivery',
        color: 'bg-blue-50 text-blue-800 border-blue-300',
        barPercent: Math.min(100, Math.max(10, (wpm / 200) * 100)),
        description: 'Pacing was energetic and fluent. Ensure that word-linking and final consonant clusters remain distinct at this tempo.'
      };
    }
    return {
      label: 'High-Speed / Rushed Burst Risk',
      color: 'bg-purple-50 text-purple-800 border-purple-300',
      barPercent: Math.min(100, Math.max(10, (wpm / 200) * 100)),
      description: 'Pacing exceeded 175 WPM during sections. Be cautious not to sacrifice word stress clarity or grammatical precision for pure speed.'
    };
  };

  const verdict = getPacingVerdict(avgWpm > 0 ? avgWpm : 130);

  const handleCopySummary = () => {
    const text = `IELTS Speaking Score: Band ${report.overallBand} (${report.estimatedCEFR})\nTopic: ${topic.title}\nPacing: ${avgWpm} Avg WPM (Peak ${peakWpm} WPM, ${totalWords} words)\nFC: ${report.fluencyCoherence.band} | LR: ${report.lexicalResource.band} | GRA: ${report.grammaticalRangeAccuracy.band} | PR: ${report.pronunciation.band}\n\nSummary: ${report.overallSummary}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const criteriaList = [
    {
      title: 'Fluency & Coherence',
      code: 'FC',
      data: report.fluencyCoherence,
      desc: 'Speech rate, flow, discourse markers, cohesion, and self-correction frequency.'
    },
    {
      title: 'Lexical Resource',
      code: 'LR',
      data: report.lexicalResource,
      desc: 'Range of vocabulary, collocations, idiomatic phrases, and lexical flexibility.'
    },
    {
      title: 'Grammatical Range & Accuracy',
      code: 'GRA',
      data: report.grammaticalRangeAccuracy,
      desc: 'Mix of simple/complex sentence structures, tense consistency, and structural precision.'
    },
    {
      title: 'Pronunciation & Delivery',
      code: 'PR',
      data: report.pronunciation,
      desc: 'Intonation, syllable stress patterns, rhythm, and clarity of spoken words.'
    }
  ];

  return (
    <div id="feedback-report-screen" className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Banner & Score Overview */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
              <CheckCircle className="w-3.5 h-3.5" />
              Test Completed • {formatDuration(durationSeconds)} total session
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              IELTS Speaking Performance Report
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Topic: <strong className="text-slate-800">{topic.title}</strong> ({topic.category})
            </p>
          </div>

          {/* Overall Band Card */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 shrink-0">
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Overall Band
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {report.overallBand.toFixed(1)}
              </div>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                CEFR {report.estimatedCEFR}
              </span>
            </div>

            <div className="h-12 w-px bg-slate-200" />

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Target Band:</span>
                <span className="font-bold text-slate-800">{targetBand.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Status:</span>
                <span className={`font-semibold ${report.overallBand >= targetBand ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {report.overallBand >= targetBand ? 'Target Reached! 🎉' : `${(targetBand - report.overallBand).toFixed(1)} to target`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="pt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Examiner's General Assessment
          </h2>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
            {report.overallSummary}
          </p>
        </div>
      </div>

      {/* Pacing & Speech Delivery Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Speech Pacing & Delivery Telemetry
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Clock paused during examiner turns & Part 2 prep</span>
          </div>
        </div>

        {/* 4 Metric Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Average Pace
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono">
                {avgWpm > 0 ? avgWpm : '—'}
              </span>
              <span className="text-xs text-slate-500 font-bold">WPM</span>
            </div>
            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold border ${verdict.color}`}>
              {verdict.label}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Peak Burst Speed
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
                {peakWpm > 0 ? peakWpm : (avgWpm > 0 ? Math.round(avgWpm * 1.15) : '—')}
              </span>
              <span className="text-xs text-slate-500 font-bold">WPM</span>
            </div>
            <span className="inline-block mt-2 text-[10px] text-slate-500 font-medium">
              10–15s rolling burst window
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Words Spoken
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
                {totalWords}
              </span>
              <span className="text-xs text-slate-500 font-bold">words</span>
            </div>
            <span className="inline-block mt-2 text-[10px] text-slate-500 font-medium">
              Candidate spoken volume
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Speaking Time
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
                {formatDuration(activeSeconds)}
              </span>
            </div>
            <span className="inline-block mt-2 text-[10px] text-slate-500 font-medium">
              Candidate mic active time
            </span>
          </div>
        </div>

        {/* Pacing Scale Bar */}
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Pacing Range Continuum</span>
            <span className="font-mono text-blue-700 font-bold">{avgWpm} WPM</span>
          </div>
          
          <div className="relative w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex">
            <div className="w-[30%] bg-amber-400/80" title="< 115 WPM: Deliberate / Hesitant" />
            <div className="w-[45%] bg-emerald-500" title="115 - 155 WPM: Optimal Range" />
            <div className="w-[15%] bg-blue-500" title="156 - 175 WPM: Brisk Pace" />
            <div className="w-[10%] bg-purple-500" title="> 175 WPM: Rushed Burst" />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-0.5">
            <span>&lt;115 Deliberate</span>
            <span className="font-semibold text-emerald-700">120–155 Optimal Conversational Flow</span>
            <span>156–175 Brisk</span>
            <span>&gt;175 Rushed</span>
          </div>
        </div>

        {/* Qualitative Coaching Heuristic Advice */}
        <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Examiner Pacing & Fluency Coaching Insight</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {report.pacingSummary?.pacingAssessment || verdict.description}
          </p>
          {report.pacingSummary?.coachingAdvice && (
            <p className="text-xs text-blue-800 font-medium pt-1 border-t border-blue-100">
              💡 <strong>Tip for Next Session:</strong> {report.pacingSummary.coachingAdvice}
            </p>
          )}
          <p className="text-[10px] text-slate-400 italic mt-1">
            * Note: In official IELTS band scoring, pacing is judged qualitatively based on natural pausing, rhythm, and coherence rather than a fixed numerical WPM rule. A steady pace between 120–155 WPM gives you time to construct complex syntax while keeping natural speech rhythm.
          </p>
        </div>
      </div>

      {/* 4 Official IELTS Criteria Breakdown */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Official IELTS 4 Criteria Breakdown
          </h2>
          <span className="text-xs text-slate-500 hidden sm:inline">Scored in 0.5 Band Increments</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {criteriaList.map((crit, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 tracking-wide uppercase">
                      {crit.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{crit.title}</h3>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-xl text-sm font-extrabold border ${getBandColor(
                      crit.data.band
                    )}`}
                  >
                    Band {crit.data.band.toFixed(1)}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-3">{crit.desc}</p>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4">
                  {crit.data.feedback}
                </p>

                {/* Candidate Quote & Actionable Improvement */}
                {crit.data.studentQuote && (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500 block text-[11px]">
                        From your transcript:
                      </span>
                      <blockquote className="italic text-slate-800 pl-2 border-l-2 border-slate-300 my-1">
                        "{crit.data.studentQuote}"
                      </blockquote>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200">
                      <span className="font-bold text-blue-700 block text-[11px] flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Suggested High-Band Upgrade:
                      </span>
                      <p className="text-slate-800 font-medium mt-0.5">
                        {crit.data.suggestedImprovement}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Actionable Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Key Strengths */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Key Strengths Observed
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
            {report.keyStrengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Next Band Tips */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 text-blue-800">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            High-Leverage Areas to Boost Your Score
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
            {report.actionableTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Expandable Full Transcript */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
        <button
          id="toggle-full-transcript-btn"
          onClick={() => setShowFullTranscript(!showFullTranscript)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm text-slate-900">
              Full Test Conversation Transcript ({transcript.length} turns)
            </span>
          </div>
          {showFullTranscript ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showFullTranscript && (
          <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3 max-h-96 overflow-y-auto">
            {transcript.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl text-xs sm:text-sm ${
                  item.speaker === 'examiner'
                    ? 'bg-white border border-slate-200 text-slate-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-950 font-medium'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      item.speaker === 'examiner' ? 'text-emerald-700' : 'text-blue-700'
                    }`}
                  >
                    {item.speaker === 'examiner' ? 'Examiner' : 'Candidate'}
                  </span>
                  {item.part && (
                    <span className="text-[10px] text-slate-400">Part {item.part}</span>
                  )}
                </div>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="copy-summary-btn"
            onClick={handleCopySummary}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Share Summary'}</span>
          </button>

          <button
            id="save-report-btn"
            onClick={onSaveToCloud}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isSaved
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Bookmark className="w-4 h-4 text-blue-600" />
            <span>{isSaved ? 'Saved in History' : 'Save to History'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            id="retake-topic-btn"
            onClick={onRetakeSameTopic}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Same Topic</span>
          </button>

          <button
            id="practice-again-btn"
            onClick={onPracticeAgain}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Practice Another Topic</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
