import React from 'react';
import { StoredSession } from '../firebase';
import { 
  X, 
  Calendar, 
  Clock, 
  ChevronRight, 
  FileText,
  Activity,
  Zap,
  TrendingUp,
  Cloud
} from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StoredSession[];
  onSelectPastSession: (session: StoredSession) => void;
  userEmail?: string | null;
  onLogin?: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectPastSession,
  userEmail,
  onLogin,
}) => {
  if (!isOpen) return null;

  const averageBand = sessions.length
    ? (sessions.reduce((acc, s) => acc + s.overallBand, 0) / sessions.length).toFixed(1)
    : '0.0';

  const highestBand = sessions.length
    ? Math.max(...sessions.map(s => s.overallBand)).toFixed(1)
    : '0.0';

  const totalMinutes = Math.round(
    sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60
  );

  const sessionsWithWpm = sessions.filter(s => (s.avgWpm || 0) > 0);
  const overallAvgWpm = sessionsWithWpm.length
    ? Math.round(sessionsWithWpm.reduce((acc, s) => acc + (s.avgWpm || 0), 0) / sessionsWithWpm.length)
    : 0;

  return (
    <div id="history-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">IELTS Practice History</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {userEmail ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-emerald-600" />
                  Synced with {userEmail}
                </span>
              ) : (
                'Stored locally on this device'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!userEmail && onLogin && (
              <button
                id="history-signin-btn"
                onClick={onLogin}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.053 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}

            <button
              id="close-history-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-4 gap-2.5 p-4 sm:p-5 bg-slate-50 border-b border-slate-100">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Avg Band
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-blue-700">{averageBand}</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Peak Band
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-700">{highestBand}</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Avg Pace
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-800">
                {overallAvgWpm > 0 ? `${overallAvgWpm}` : '—'}
                {overallAvgWpm > 0 && <span className="text-xs font-normal text-slate-500 ml-1">WPM</span>}
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Practice Time
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-800">{totalMinutes}m</span>
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700 mb-1">No Practice Sessions Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Complete your first IELTS speaking practice session with the AI examiner to see your performance scores, speech pacing telemetry, and progress over time.
              </p>
            </div>
          ) : (
            sessions.map((session, index) => {
              const formattedDate = new Date(session.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <button
                  key={session.id || index}
                  id={`session-item-${index}`}
                  onClick={() => onSelectPastSession(session)}
                  className="w-full text-left bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {session.topicTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                        {session.testType || 'Full Test'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                      {session.durationSeconds > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {Math.round(session.durationSeconds / 60)} min
                        </span>
                      )}
                      {(session.avgWpm || 0) > 0 && (
                        <span className="flex items-center gap-1 text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          <Activity className="w-3 h-3" />
                          {session.avgWpm} WPM {session.peakWpm ? `(Peak ${session.peakWpm})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Criteria Mini Pills */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        FC: {session.fluencyBand.toFixed(1)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        LR: {session.lexicalBand.toFixed(1)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        GRA: {session.grammarBand.toFixed(1)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        PR: {session.pronunciationBand.toFixed(1)}
                      </span>
                      {session.totalWords ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">
                          {session.totalWords} words
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Overall
                      </span>
                      <span className="text-xl font-extrabold text-blue-700">
                        Band {session.overallBand.toFixed(1)}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            id="close-history-footer-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
