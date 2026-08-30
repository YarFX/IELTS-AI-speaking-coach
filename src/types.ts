export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type TestMode = 'full' | 'part1' | 'part2' | 'part3';

export type SessionState = 
  | 'idle'
  | 'setup'
  | 'permissions'
  | 'part1'
  | 'part2_prep'
  | 'part2_speak'
  | 'part2_followup'
  | 'part3'
  | 'generating_feedback'
  | 'feedback_ready'
  | 'history';

export interface CueCardTopic {
  id: string;
  category: string;
  title: string;
  cueCardText: string;
  bulletPoints: string[];
  followUpQuestions: string[];
  part3Questions: string[];
}

export interface TranscriptItem {
  id: string;
  speaker: 'examiner' | 'student';
  text: string;
  timestamp: number;
  part: 1 | 2 | 3;
  isInterim?: boolean;
}

export interface CriterionFeedback {
  criterionName: string;
  band: number;
  feedback: string;
  studentQuote: string;
  suggestedImprovement: string;
}

export interface PacingStats {
  totalWords: number;
  avgWpm: number;
  peakWpm: number;
  activeSpeakingSeconds: number;
  pacingCategory?: 'deliberate' | 'optimal' | 'brisk' | 'rushed';
}

export interface IELTSFeedbackReport {
  overallBand: number;
  estimatedCEFR: 'B1' | 'B2' | 'C1' | 'C2';
  overallSummary: string;
  pacingStats?: PacingStats;
  pacingSummary?: {
    avgWpm: number;
    peakWpm: number;
    totalWords: number;
    activeSpeakingSeconds: number;
    pacingAssessment: string;
    coachingAdvice: string;
  };
  fluencyCoherence: CriterionFeedback;
  lexicalResource: CriterionFeedback;
  grammaticalRangeAccuracy: CriterionFeedback;
  pronunciation: CriterionFeedback;
  keyStrengths: string[];
  actionableTips: string[];
  partBreakdown?: {
    part1Notes?: string;
    part2Notes?: string;
    part3Notes?: string;
  };
}

export interface LiveVoiceStatus {
  isAiSpeaking: boolean;
  isUserSpeaking: boolean;
  isListening: boolean;
  isPreparing: boolean;
  prepSecondsRemaining: number;
  speakingSecondsRemaining: number;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  errorMessage?: string;
}
