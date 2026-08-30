import React from 'react';
import { AppUser } from '../types';
import { History, Target, LogIn, LogOut, User as UserIcon, Mic2 } from 'lucide-react';
import { logoutUser } from '../firebase';

interface NavbarProps {
  user: AppUser | null;
  targetBand: number;
  onTargetBandChange: (band: number) => void;
  onOpenHistory: () => void;
  onOpenAuth: () => void;
  pastSessionsCount: number;
  isLiveActive: boolean;
  currentPart?: 1 | 2 | 3;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  targetBand,
  onTargetBandChange,
  onOpenHistory,
  onOpenAuth,
  pastSessionsCount,
  isLiveActive,
  currentPart = 1,
}) => {
  const handleAuth = async () => {
    if (user) {
      await logoutUser();
    } else {
      onOpenAuth();
    }
  };

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Guest Candidate');
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AJ';

  return (
    <header id="main-header" className="h-16 flex items-center justify-between px-4 sm:px-8 bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Brand & App Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
          <div className="w-3.5 h-3.5 border-2 border-white rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
            IELTS Speaking Coach
          </span>
          <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
            AI Examiner
          </span>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Progress Pills (visible during live session or setup) */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {isLiveActive ? `Part ${currentPart}` : 'Progress'}
          </span>
          <div className="flex gap-1">
            <div className={`w-6 h-1.5 rounded-full transition-colors ${currentPart >= 1 && isLiveActive ? 'bg-blue-600' : isLiveActive ? 'bg-slate-200' : 'bg-blue-600'}`} />
            <div className={`w-6 h-1.5 rounded-full transition-colors ${currentPart >= 2 && isLiveActive ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`w-6 h-1.5 rounded-full transition-colors ${currentPart >= 3 && isLiveActive ? 'bg-blue-600' : 'bg-slate-200'}`} />
          </div>
        </div>

        <div className="hidden sm:block h-8 w-px bg-slate-200" />

        {/* History Modal Trigger */}
        <button
          id="open-history-btn"
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 transition"
          title="View past IELTS speaking sessions and feedback"
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">History</span>
          {pastSessionsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
              {pastSessionsCount}
            </span>
          )}
        </button>

        {/* Target Band Picker */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
          <Target className="w-3.5 h-3.5 text-blue-600" />
          <select
            id="target-band-select"
            value={targetBand}
            onChange={(e) => onTargetBandChange(parseFloat(e.target.value))}
            className="text-xs font-bold text-blue-700 bg-transparent outline-none cursor-pointer"
          >
            <option value={6.0}>Band 6.0</option>
            <option value={6.5}>Band 6.5</option>
            <option value={7.0}>Band 7.0</option>
            <option value={7.5}>Band 7.5</option>
            <option value={8.0}>Band 8.0</option>
            <option value={8.5}>Band 8.5</option>
            <option value={9.0}>Band 9.0</option>
          </select>
        </div>

        {/* User Profile / Status */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-semibold leading-none text-slate-800 truncate max-w-[120px]">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-500 uppercase font-medium mt-0.5">
              Target Band: {targetBand.toFixed(1)}
            </p>
          </div>

          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1 pl-2 pr-1 rounded-2xl">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="w-7 h-7 rounded-full border border-slate-300 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {initials}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate hidden md:inline">
                {displayName}
              </span>
              <button
                id="logout-btn"
                onClick={handleAuth}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="google-signin-btn"
              onClick={handleAuth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow transition cursor-pointer"
              title="Sign in with Google to sync results"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.053 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
