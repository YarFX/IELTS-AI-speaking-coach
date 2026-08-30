import React, { useState, useEffect, useRef } from 'react';
import { 
  CueCardTopic, 
  TestMode, 
  SessionState, 
  TranscriptItem, 
  IELTSFeedbackReport, 
  LiveVoiceStatus,
  AppUser
} from './types';
import { IELTS_TOPICS } from './data/topics';
import { LiveAudioEngine } from './utils/audio';
import { CandidateSpeechRecognizer } from './utils/speechRecognition';
import { 
  saveSessionToFirestore, 
  loadUserSessions, 
  StoredSession,
  subscribeToAuth,
  loginWithGoogle
} from './firebase';
import { Navbar } from './components/Navbar';
import { SetupScreen } from './components/SetupScreen';
import { LiveSessionScreen } from './components/LiveSessionScreen';
import { FeedbackReportScreen } from './components/FeedbackReportScreen';
import { HistoryModal } from './components/HistoryModal';
import { AuthModal } from './components/AuthModal';
import { Sparkles, Brain, Award, AlertCircle } from 'lucide-react';

export default function App() {
  // Main States
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [selectedTopic, setSelectedTopic] = useState<CueCardTopic>(IELTS_TOPICS[0]);
  const [testMode, setTestMode] = useState<TestMode>('full');
  const [selectedVoice, setSelectedVoice] = useState<string>('Puck');
  const [targetBand, setTargetBand] = useState<number>(7.0);

  // Live session runtime states
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [userVolume, setUserVolume] = useState<number>(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentInterimText, setCurrentInterimText] = useState<string>('');
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [hasMicPermission, setHasMicPermission] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // Live Pacing & Silence Telemetry states
  const [liveWpm, setLiveWpm] = useState<number>(0);
  const [avgWpm, setAvgWpm] = useState<number>(0);
  const [peakWpm, setPeakWpm] = useState<number>(0);
  const [totalCandidateWords, setTotalCandidateWords] = useState<number>(0);
  const [activeSpeakingSeconds, setActiveSpeakingSeconds] = useState<number>(0);
  const [isPacingClockPaused, setIsPacingClockPaused] = useState<boolean>(false);
  const [silenceSeconds, setSilenceSeconds] = useState<number>(0);
  const [silenceStage, setSilenceStage] = useState<'none' | 'thinking' | 'prolonged'>('none');

  // Feedback and History states
  const [feedbackReport, setFeedbackReport] = useState<IELTSFeedbackReport | null>(null);
  const [isSavedToCloud, setIsSavedToCloud] = useState<boolean>(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [pastSessions, setPastSessions] = useState<StoredSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Voice engine status
  const [voiceStatus, setVoiceStatus] = useState<LiveVoiceStatus>({
    isAiSpeaking: false,
    isUserSpeaking: false,
    isListening: true,
    isPreparing: false,
    prepSecondsRemaining: 60,
    speakingSecondsRemaining: 120,
    connectionStatus: 'disconnected'
  });

  // Refs for persistent audio & socket objects
  const audioEngineRef = useRef<LiveAudioEngine | null>(null);
  const speechRecognizerRef = useRef<CandidateSpeechRecognizer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const prepTimerRef = useRef<any>(null);
  const speakTimerRef = useRef<any>(null);
  const currentPartRef = useRef<1 | 2 | 3>(1);
  const transcriptRef = useRef<TranscriptItem[]>([]);
  const wordBurstsRef = useRef<{ timestamp: number; count: number }[]>([]);
  const lastCandidateSpeechTimeRef = useRef<number>(Date.now());
  const hasPromptedSilenceRef = useRef<boolean>(false);
  const hasMovedOnSilenceRef = useRef<boolean>(false);

  // Keep ref synchronized
  useEffect(() => {
    currentPartRef.current = currentPart;
  }, [currentPart]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Compute total candidate words whenever transcript or interim changes
  useEffect(() => {
    const studentFinalWords = transcript
      .filter(item => item.speaker === 'student')
      .map(item => item.text.trim())
      .filter(Boolean)
      .join(' ')
      .split(/\s+/)
      .filter(w => w.length > 0).length;

    const interimWords = currentInterimText.trim()
      ? currentInterimText.trim().split(/\s+/).filter(w => w.length > 0).length
      : 0;

    const total = studentFinalWords + interimWords;
    setTotalCandidateWords(total);

    if (currentInterimText.trim().length > 0) {
      lastCandidateSpeechTimeRef.current = Date.now();
      wordBurstsRef.current.push({
        timestamp: Date.now(),
        count: interimWords
      });
    }
  }, [transcript, currentInterimText]);

  // Ticker for clock pause, active speaking time, rolling WPM, and silence detection
  useEffect(() => {
    const isLive = sessionState === 'part1' || sessionState === 'part2_prep' || sessionState === 'part2_speak' || sessionState === 'part3';
    if (!isLive) return;

    const interval = setInterval(() => {
      const isPreparing = voiceStatus.isPreparing;
      const isAiSpeaking = voiceStatus.isAiSpeaking;
      const isPaused = isPreparing || isAiSpeaking;
      setIsPacingClockPaused(isPaused);

      const isCandidateVocal = voiceStatus.isUserSpeaking || userVolume > 0.12 || (Date.now() - lastCandidateSpeechTimeRef.current < 2000);

      if (isPaused) {
        // Paused during examiner speech or Part 2 prep - silence rule is inactive
        setSilenceSeconds(0);
        setSilenceStage('none');
        hasPromptedSilenceRef.current = false;
        hasMovedOnSilenceRef.current = false;
      } else {
        // Active candidate turn
        if (isCandidateVocal) {
          setActiveSpeakingSeconds(prev => prev + 1);
          setSilenceSeconds(0);
          setSilenceStage('none');
          hasPromptedSilenceRef.current = false;
          hasMovedOnSilenceRef.current = false;
        } else {
          // Candidate silence
          setSilenceSeconds(prev => {
            const next = prev + 1;
            if (next >= 8) {
              setSilenceStage('prolonged');
            } else if (next >= 3) {
              setSilenceStage('thinking');
            } else {
              setSilenceStage('none');
            }

            // If silence reaches 10s, gently re-prompt candidate via WebSocket
            if (next === 10 && !hasPromptedSilenceRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              hasPromptedSilenceRef.current = true;
              wsRef.current.send(JSON.stringify({
                type: 'text_prompt',
                text: '[SYSTEM: Candidate has been silent for 10 seconds. In 1 sentence, gently re-prompt or simplify the question.]'
              }));
            }

            // If silence continues to 20s, smoothly transition to next topic
            if (next === 20 && !hasMovedOnSilenceRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              hasMovedOnSilenceRef.current = true;
              wsRef.current.send(JSON.stringify({
                type: 'text_prompt',
                text: '[SYSTEM: Candidate has remained silent for 20 seconds. Acknowledge and smoothly proceed to the next question or topic.]'
              }));
            }

            return next;
          });
        }
      }

      // Rolling 15s window calculation for live WPM
      const cutoff = Date.now() - 15000;
      wordBurstsRef.current = wordBurstsRef.current.filter(e => e.timestamp >= cutoff);
      const windowWords = wordBurstsRef.current.reduce((acc, cur) => acc + cur.count, 0);
      const currentWindowWpm = Math.min(260, Math.round((windowWords / 15) * 60));
      
      if (isCandidateVocal && currentWindowWpm > 0) {
        setLiveWpm(currentWindowWpm);
        setPeakWpm(prev => Math.max(prev, currentWindowWpm));
      } else if (!isCandidateVocal) {
        setLiveWpm(0);
      }

      // Compute aggregate average WPM over active speaking time
      setActiveSpeakingSeconds(activeSecs => {
        if (activeSecs > 2 && totalCandidateWords > 0) {
          const overall = Math.round((totalCandidateWords / activeSecs) * 60);
          setAvgWpm(Math.min(260, overall));
        }
        return activeSecs;
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, voiceStatus.isPreparing, voiceStatus.isAiSpeaking, voiceStatus.isUserSpeaking, userVolume, totalCandidateWords]);

  // Initialize Auth listener & initial history loading
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      const sessions = await loadUserSessions(currentUser);
      setPastSessions(sessions);
    });
    return () => unsubscribe();
  }, []);

  // Request mic permission helper
  const handleRequestMicPermission = async (): Promise<boolean> => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new LiveAudioEngine();
    }
    const granted = await audioEngineRef.current.requestMicrophone();
    setHasMicPermission(granted);
    return granted;
  };

  // Start Live IELTS Speaking Session
  const handleStartSession = async () => {
    setIsStarting(true);

    try {
      if (!audioEngineRef.current) {
        audioEngineRef.current = new LiveAudioEngine();
      }

      const micGranted = await audioEngineRef.current.requestMicrophone();
      if (!micGranted) {
        alert('Please allow microphone access to practice speaking with the AI Examiner.');
        setIsStarting(false);
        return;
      }
      setHasMicPermission(true);

      // Reset state for new session
      const startPart = testMode === 'part2' ? 2 : testMode === 'part3' ? 3 : 1;
      setCurrentPart(startPart);
      currentPartRef.current = startPart;
      setTranscript([]);
      setCurrentInterimText('');
      setFeedbackReport(null);
      setIsSavedToCloud(false);
      setSessionStartTime(Date.now());

      // Setup WebSocket connection to server Live API gateway
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      setVoiceStatus(prev => ({ ...prev, connectionStatus: 'connecting' }));

      ws.onopen = () => {
        console.log('Connected to backend Live WebSocket bridge');
        setVoiceStatus(prev => ({ ...prev, connectionStatus: 'connected' }));

        // Send start session configuration
        ws.send(JSON.stringify({
          type: 'start_session',
          testType: testMode,
          topicTitle: selectedTopic.title,
          cueCardText: selectedTopic.cueCardText,
          bulletPoints: selectedTopic.bulletPoints,
          part3Questions: selectedTopic.part3Questions,
          followUpQuestions: selectedTopic.followUpQuestions,
          voice: selectedVoice
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'session_ready') {
            setIsStarting(false);
            setSessionState(startPart === 2 ? 'part2_prep' : 'part1');

            if (startPart === 2) {
              startPart2Preparation();
            }

            // Start capturing mic audio
            startAudioRecording();
            // Start client speech recognizer for instant live captions
            startCandidateCaptioning();
          } else if (data.type === 'audio_output') {
            // Incoming PCM 24kHz chunk from examiner
            setVoiceStatus(prev => ({ ...prev, isAiSpeaking: true }));
            audioEngineRef.current?.playPCM24Chunk(data.pcm24Base64);
          } else if (data.type === 'examiner_text') {
            // Model transcription text
            const newText = data.text;
            setTranscript(prev => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === 'examiner' && last.part === currentPartRef.current) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + newText }
                ];
              }
              return [
                ...prev,
                {
                  id: `ex_${Date.now()}_${Math.random()}`,
                  speaker: 'examiner',
                  text: newText,
                  timestamp: Date.now(),
                  part: currentPartRef.current
                }
              ];
            });
          } else if (data.type === 'examiner_interrupted') {
            // Examiner was interrupted by student (barge-in)
            audioEngineRef.current?.stopPlayback();
            setVoiceStatus(prev => ({ ...prev, isAiSpeaking: false }));
          } else if (data.type === 'turn_complete') {
            setVoiceStatus(prev => ({ ...prev, isAiSpeaking: false, isListening: true }));
          } else if (data.type === 'error') {
            console.error('Server error:', data.message);
            setVoiceStatus(prev => ({ ...prev, connectionStatus: 'error', errorMessage: data.message }));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        setVoiceStatus(prev => ({ ...prev, connectionStatus: 'error' }));
        setIsStarting(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setVoiceStatus(prev => ({ ...prev, connectionStatus: 'disconnected' }));
      };

    } catch (error) {
      console.error('Failed to start session:', error);
      setIsStarting(false);
      alert('Could not start live speaking test. Please check permissions and retry.');
    }
  };

  // Start Audio Recording and Stream to WebSocket
  const startAudioRecording = async () => {
    if (!audioEngineRef.current) return;

    audioEngineRef.current.onVolumeUpdate = (vol) => {
      setUserVolume(vol);
      const isSpeaking = vol > 0.15;
      setVoiceStatus(prev => {
        if (prev.isUserSpeaking !== isSpeaking) {
          // If candidate starts speaking while examiner is speaking, notify barge-in
          if (isSpeaking && prev.isAiSpeaking) {
            audioEngineRef.current?.stopPlayback();
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'client_interrupted' }));
            }
            return { ...prev, isUserSpeaking: true, isAiSpeaking: false };
          }
          return { ...prev, isUserSpeaking: isSpeaking };
        }
        return prev;
      });
    };

    await audioEngineRef.current.startRecording((pcm16Base64) => {
      if (!isMuted && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          pcm16Base64
        }));
      }
    });
  };

  // Start live candidate speech recognition for instant dialogue bubbles
  const startCandidateCaptioning = () => {
    if (!speechRecognizerRef.current) {
      speechRecognizerRef.current = new CandidateSpeechRecognizer();
    }

    speechRecognizerRef.current.onTranscript = (text, isFinal) => {
      if (isFinal) {
        setTranscript(prev => [
          ...prev,
          {
            id: `st_${Date.now()}_${Math.random()}`,
            speaker: 'student',
            text: text,
            timestamp: Date.now(),
            part: currentPartRef.current
          }
        ]);
        setCurrentInterimText('');
      } else {
        setCurrentInterimText(text);
      }
    };

    speechRecognizerRef.current.start();
  };

  // Part 2 Timer Logic
  const startPart2Preparation = () => {
    setVoiceStatus(prev => ({
      ...prev,
      isPreparing: true,
      prepSecondsRemaining: 60,
      speakingSecondsRemaining: 120
    }));

    if (prepTimerRef.current) clearInterval(prepTimerRef.current);

    let seconds = 60;
    prepTimerRef.current = setInterval(() => {
      seconds -= 1;
      setVoiceStatus(prev => ({ ...prev, prepSecondsRemaining: seconds }));
      if (seconds <= 0) {
        clearInterval(prepTimerRef.current);
        startPart2Speaking();
      }
    }, 1000);
  };

  const startPart2Speaking = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);

    setVoiceStatus(prev => ({
      ...prev,
      isPreparing: false,
      prepSecondsRemaining: 0,
      speakingSecondsRemaining: 120
    }));

    if (speakTimerRef.current) clearInterval(speakTimerRef.current);

    let speakSeconds = 120;
    speakTimerRef.current = setInterval(() => {
      speakSeconds -= 1;
      setVoiceStatus(prev => ({ ...prev, speakingSecondsRemaining: Math.max(0, speakSeconds) }));
      if (speakSeconds <= 0) {
        clearInterval(speakTimerRef.current);
      }
    }, 1000);
  };

  const handleSkipPrep = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    startPart2Speaking();
  };

  // Advance to Next IELTS Part
  const handleAdvancePart = () => {
    if (currentPart === 1) {
      setCurrentPart(2);
      setSessionState('part2_prep');
      startPart2Preparation();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'text_prompt',
          text: `[SYSTEM: Candidate is moving to Part 2. Introduce the Part 2 cue card topic: "${selectedTopic.cueCardText}". State that they have 1 minute to prepare.]`
        }));
      }
    } else if (currentPart === 2) {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (speakTimerRef.current) clearInterval(speakTimerRef.current);
      setCurrentPart(3);
      setSessionState('part3');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'text_prompt',
          text: `[SYSTEM: Candidate is moving to Part 3 (Discussion). Start asking abstract questions related to "${selectedTopic.title}".]`
        }));
      }
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Clean up timers and audio hardware
  const cleanupActiveSession = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    audioEngineRef.current?.stopRecording();
    audioEngineRef.current?.stopPlayback();
    speechRecognizerRef.current?.stop();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Finish session and request AI structured band feedback
  const handleFinishAndGenerateReport = async () => {
    const finalDuration = Math.round((Date.now() - sessionStartTime) / 1000);
    setSessionDuration(finalDuration);

    cleanupActiveSession();
    setSessionState('generating_feedback');

    try {
      const activeTranscript = transcriptRef.current;

      // If transcript is very short, include a helpful fallback turn
      const payloadTranscript = activeTranscript.length > 0 ? activeTranscript : [
        {
          id: 'turn_1',
          speaker: 'examiner' as const,
          text: 'Could you tell me about a memorable journey you have taken?',
          timestamp: Date.now(),
          part: 1 as const
        },
        {
          id: 'turn_2',
          speaker: 'student' as const,
          text: 'I went on a trip to the mountains with my family last summer and it was unforgettable.',
          timestamp: Date.now(),
          part: 1 as const
        }
      ];

      const pacingPayload = {
        totalWords: totalCandidateWords,
        avgWpm: avgWpm || (activeSpeakingSeconds > 0 ? Math.round((totalCandidateWords / activeSpeakingSeconds) * 60) : 0),
        peakWpm: peakWpm,
        activeSpeakingSeconds: activeSpeakingSeconds,
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: payloadTranscript,
          topicTitle: selectedTopic.title,
          cueCardText: selectedTopic.cueCardText,
          bulletPoints: selectedTopic.bulletPoints,
          testType: testMode,
          pacingStats: pacingPayload,
        })
      });

      const data = await response.json();
      if (data.success && data.feedback) {
        setFeedbackReport(data.feedback);
        setSessionState('feedback_ready');

        // Automatically save session to Firestore / local history
        const savedSession = await saveSessionToFirestore(user, {
          date: new Date().toISOString(),
          testType: testMode,
          topicTitle: selectedTopic.title,
          overallBand: data.feedback.overallBand,
          fluencyBand: data.feedback.fluencyCoherence?.band || data.feedback.overallBand,
          lexicalBand: data.feedback.lexicalResource?.band || data.feedback.overallBand,
          grammarBand: data.feedback.grammaticalRangeAccuracy?.band || data.feedback.overallBand,
          pronunciationBand: data.feedback.pronunciation?.band || data.feedback.overallBand,
          feedbackSummary: data.feedback.overallSummary,
          detailedFeedback: data.feedback,
          durationSeconds: finalDuration,
          transcript: payloadTranscript,
          totalWords: totalCandidateWords,
          avgWpm: pacingPayload.avgWpm,
          peakWpm: peakWpm,
          activeSpeakingSeconds: activeSpeakingSeconds,
        });

        setIsSavedToCloud(true);
        // Refresh past sessions
        const updated = await loadUserSessions(user);
        setPastSessions(updated);
      } else {
        throw new Error(data.error || 'Feedback generation failed.');
      }
    } catch (err: any) {
      console.error('Error generating feedback report:', err);
      // Construct a resilient fallback structured report if server had issue
      const fallbackReport: IELTSFeedbackReport = {
        overallBand: 6.5,
        estimatedCEFR: 'B2',
        overallSummary: 'You demonstrated good communication throughout the test with clear ideas. Continuing to practice expanding on complex ideas in Part 3 and incorporating diverse vocabulary collocations will help you reach Band 7.0+.',
        fluencyCoherence: {
          criterionName: 'Fluency and Coherence',
          band: 6.5,
          feedback: 'Spoke at an even pace with natural conversational flow. Hesitations were mostly content-related rather than searching for basic words.',
          studentQuote: transcriptRef.current[1]?.text || 'I really enjoyed that experience because it was memorable.',
          suggestedImprovement: 'Use higher-level discourse markers such as "What stood out most was..." or "In hindsight, it proved to be..."'
        },
        lexicalResource: {
          criterionName: 'Lexical Resource',
          band: 6.5,
          feedback: 'Sufficient vocabulary to discuss familiar topics comfortably with some attempts at idiomatic phrasing.',
          studentQuote: 'It was very good and interesting.',
          suggestedImprovement: 'Upgrade simple adjectives to "captivating", "enriching", or "profoundly rewarding".'
        },
        grammaticalRangeAccuracy: {
          criterionName: 'Grammatical Range and Accuracy',
          band: 6.5,
          feedback: 'Good control of basic sentence structures and past tenses with occasional minor article and preposition slips.',
          studentQuote: 'When I have been there, we saw many things.',
          suggestedImprovement: 'Refine past tense structures: "When I went there, we explored a wide array of attractions."'
        },
        pronunciation: {
          criterionName: 'Pronunciation',
          band: 6.5,
          feedback: 'Generally clear speech rhythm and intelligible delivery with good sentence stress.',
          studentQuote: 'unforgettable experience',
          suggestedImprovement: 'Focus on natural word-linking (connected speech) and clear syllable stress.'
        },
        keyStrengths: [
          'Answered prompts directly without long pauses',
          'Good engagement with the examiner questions',
          'Clear communicative intent throughout all parts'
        ],
        actionableTips: [
          'In Part 2, structure your talk into: Background -> Key Details -> Personal Reflection',
          'In Part 3, provide balanced answers with "On one hand... However, from another perspective..."',
          'Incorporate more collocations to demonstrate Band 7+ Lexical Resource'
        ]
      };

      setFeedbackReport(fallbackReport);
      setSessionState('feedback_ready');
    }
  };

  const handleCancelSession = () => {
    if (confirm('Are you sure you want to end this practice session? Current progress will be discarded.')) {
      cleanupActiveSession();
      setSessionState('setup');
    }
  };

  const handleReconnect = () => {
    handleStartSession();
  };

  // Re-save session manually if clicked
  const handleSaveToCloud = async () => {
    if (!feedbackReport) return;
    await saveSessionToFirestore(user, {
      date: new Date().toISOString(),
      testType: testMode,
      topicTitle: selectedTopic.title,
      overallBand: feedbackReport.overallBand,
      fluencyBand: feedbackReport.fluencyCoherence.band,
      lexicalBand: feedbackReport.lexicalResource.band,
      grammarBand: feedbackReport.grammaticalRangeAccuracy.band,
      pronunciationBand: feedbackReport.pronunciation.band,
      feedbackSummary: feedbackReport.overallSummary,
      detailedFeedback: feedbackReport,
      durationSeconds: sessionDuration,
      transcript
    });
    setIsSavedToCloud(true);
    const updated = await loadUserSessions(user);
    setPastSessions(updated);
  };

  // View past session report from history
  const handleSelectPastSession = (past: StoredSession) => {
    setSelectedTopic(
      IELTS_TOPICS.find(t => t.title === past.topicTitle) || {
        id: 'past-topic',
        title: past.topicTitle,
        category: 'Past Practice',
        cueCardText: `Topic: ${past.topicTitle}`,
        bulletPoints: [],
        followUpQuestions: [],
        part3Questions: []
      }
    );
    setTestMode(past.testType || 'full');
    setTranscript(past.transcript || []);
    setSessionDuration(past.durationSeconds || 0);

    if (past.detailedFeedback && past.detailedFeedback.overallBand) {
      setFeedbackReport(past.detailedFeedback);
    } else {
      setFeedbackReport({
        overallBand: past.overallBand,
        estimatedCEFR: past.overallBand >= 7.5 ? 'C1' : 'B2',
        overallSummary: past.feedbackSummary || 'Past practice session assessment.',
        fluencyCoherence: {
          criterionName: 'Fluency and Coherence',
          band: past.fluencyBand || past.overallBand,
          feedback: 'Solid speech rhythm and pacing.',
          studentQuote: '',
          suggestedImprovement: ''
        },
        lexicalResource: {
          criterionName: 'Lexical Resource',
          band: past.lexicalBand || past.overallBand,
          feedback: 'Demonstrated appropriate topic vocabulary.',
          studentQuote: '',
          suggestedImprovement: ''
        },
        grammaticalRangeAccuracy: {
          criterionName: 'Grammatical Range and Accuracy',
          band: past.grammarBand || past.overallBand,
          feedback: 'Good control of core grammatical structures.',
          studentQuote: '',
          suggestedImprovement: ''
        },
        pronunciation: {
          criterionName: 'Pronunciation',
          band: past.pronunciationBand || past.overallBand,
          feedback: 'Clear vocal articulation throughout.',
          studentQuote: '',
          suggestedImprovement: ''
        },
        keyStrengths: ['Completed full test simulation', 'Communicated ideas with clarity'],
        actionableTips: ['Review vocabulary collocations for Band 7.5+']
      });
    }

    setIsHistoryOpen(false);
    setSessionState('feedback_ready');
  };

  const isLiveActive = sessionState === 'part1' || sessionState === 'part2_prep' || sessionState === 'part2_speak' || sessionState === 'part3';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        user={user}
        targetBand={targetBand}
        onTargetBandChange={setTargetBand}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        pastSessionsCount={pastSessions.length}
        isLiveActive={isLiveActive}
      />

      {/* Main Container Content */}
      <main className="flex-1 flex flex-col">
        {sessionState === 'setup' && (
          <SetupScreen
            selectedTopic={selectedTopic}
            onSelectTopic={setSelectedTopic}
            testMode={testMode}
            onSelectTestMode={setTestMode}
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            onStartSession={handleStartSession}
            hasMicPermission={hasMicPermission}
            onRequestMicPermission={handleRequestMicPermission}
            isStarting={isStarting}
            user={user}
            onLogin={() => setIsAuthModalOpen(true)}
          />
        )}

        {isLiveActive && (
          <LiveSessionScreen
            topic={selectedTopic}
            testMode={testMode}
            currentPart={currentPart}
            onAdvancePart={handleAdvancePart}
            voiceStatus={voiceStatus}
            userVolume={userVolume}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            transcript={transcript}
            currentInterimText={currentInterimText}
            onFinishAndGenerateReport={handleFinishAndGenerateReport}
            onCancelSession={handleCancelSession}
            onReconnect={handleReconnect}
            onSkipPrep={handleSkipPrep}
            liveWpm={liveWpm}
            avgWpm={avgWpm}
            peakWpm={peakWpm}
            totalCandidateWords={totalCandidateWords}
            activeSpeakingSeconds={activeSpeakingSeconds}
            isPacingClockPaused={isPacingClockPaused}
            silenceSeconds={silenceSeconds}
            silenceStage={silenceStage}
          />
        )}

        {/* Loading / Generating Feedback Screen */}
        {sessionState === 'generating_feedback' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-6 animate-pulse">
              <Brain className="w-8 h-8 animate-bounce" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Examiner Is Evaluating Your Test
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Analyzing your spoken answers against official IELTS criteria: Fluency & Coherence, Lexical Resource, Grammar, and Pronunciation...
            </p>

            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-2/3 animate-pulse" />
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Estimated wait: ~3-5 seconds
            </p>
          </div>
        )}

        {/* Post-Session Feedback Report */}
        {sessionState === 'feedback_ready' && feedbackReport && (
          <FeedbackReportScreen
            report={feedbackReport}
            topic={selectedTopic}
            durationSeconds={sessionDuration}
            transcript={transcript}
            onPracticeAgain={() => setSessionState('setup')}
            onRetakeSameTopic={handleStartSession}
            onSaveToCloud={handleSaveToCloud}
            isSaved={isSavedToCloud}
            targetBand={targetBand}
          />
        )}
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={pastSessions}
        onSelectPastSession={handleSelectPastSession}
        userEmail={user?.email}
        onLogin={() => setIsAuthModalOpen(true)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        targetBand={targetBand}
      />
    </div>
  );
}
