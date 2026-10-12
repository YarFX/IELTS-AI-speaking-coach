import React, { useState } from 'react';
import { X, Check, Cloud, ShieldCheck } from 'lucide-react';
import { AppUser } from '../types';
import { loginWithGoogle } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  targetBand: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetBand
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await loginWithGoogle();
      if (user) {
        onClose();
      } else {
        setError('Sign-in was cancelled or failed. Please try again.');
      }
    } catch (e) {
      console.warn('Google sign-in failed:', e);
      setError('Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="auth-modal"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          
          <h3 className="text-xl font-bold">IELTS Candidate Sign-In</h3>
          <p className="text-blue-100 text-xs mt-1">
            Store your full test transcripts, audio pacing telemetry, and official IELTS band evaluations in your account.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {currentUser ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3.5">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} className="w-10 h-10 rounded-full border border-emerald-300 object-cover" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-sm">
                  {currentUser.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.displayName}</p>
                <p className="text-[11px] text-slate-600 truncate">{currentUser.email}</p>
                <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Account active & synced
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Google Sign In Button */}
              <button
                id="google-popup-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.053 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              {error && (
                <p className="text-xs text-red-600 text-center">{error}</p>
              )}
            </>
          )}

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Secure Cloud Persistence via Firestore & Google Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
