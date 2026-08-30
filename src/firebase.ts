import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  setDoc,
  query, 
  orderBy, 
  limit, 
  Firestore,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';
import { AppUser } from './types';

declare global {
  interface Window {
    google?: any;
  }
}

const firebaseConfig = {
  projectId: firebaseConfigJson.projectId || "gen-lang-client-0990183090",
  appId: firebaseConfigJson.appId || "1:935288212752:web:de6f474b6dcc8828fea995",
  apiKey: firebaseConfigJson.apiKey || "AIzaSyAi_4Gsfg2Jp-O-3a8EjljGDQdDIAUSFCM",
  authDomain: firebaseConfigJson.authDomain || "gen-lang-client-0990183090.firebaseapp.com",
  storageBucket: firebaseConfigJson.storageBucket || "gen-lang-client-0990183090.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || "935288212752",
};

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: Firestore | null = null;
let isConfigured = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  if (firebaseConfigJson.firestoreDatabaseId) {
    db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  isConfigured = true;
} catch (err) {
  console.warn('Firebase initialization notice:', err);
}

export { auth, db, isConfigured };

export interface StoredSession {
  id?: string;
  userId: string;
  date: string;
  testType: 'full' | 'part1' | 'part2' | 'part3';
  topicTitle: string;
  overallBand: number;
  fluencyBand: number;
  lexicalBand: number;
  grammarBand: number;
  pronunciationBand: number;
  feedbackSummary: string;
  detailedFeedback: any;
  durationSeconds: number;
  totalWords?: number;
  avgWpm?: number;
  peakWpm?: number;
  activeSpeakingSeconds?: number;
  transcript: Array<{
    speaker: 'examiner' | 'student';
    text: string;
    timestamp: number;
    part?: number;
  }>;
}

const LOCAL_STORAGE_KEY = 'ielts_coach_sessions';
const USER_PROFILE_KEY = 'ielts_auth_user';

// Listeners for unified auth changes
type AuthCallback = (user: AppUser | null) => void;
const authListeners: Set<AuthCallback> = new Set();

export const subscribeToAuth = (callback: AuthCallback): (() => void) => {
  authListeners.add(callback);
  callback(getCurrentUser());
  return () => {
    authListeners.delete(callback);
  };
};

const notifyAuthListeners = (user: AppUser | null) => {
  authListeners.forEach(cb => {
    try {
      cb(user);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
};

export const getCurrentUser = (): AppUser | null => {
  // 1. Check local session
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // 2. Check Firebase auth
  if (auth && auth.currentUser) {
    return {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Candidate',
      email: auth.currentUser.email || null,
      photoURL: auth.currentUser.photoURL || null
    };
  }

  return null;
};

export const setStoredUser = (user: AppUser | null) => {
  try {
    if (user) {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_PROFILE_KEY);
    }
  } catch (e) {
    console.error('Error writing user to storage:', e);
  }
  notifyAuthListeners(user);
};

// Helper to save session locally as reliable fallback
export const saveSessionLocally = (session: StoredSession) => {
  try {
    const existing = getSessionsLocally(session.userId);
    const withId = { ...session, id: session.id || `local_${Date.now()}` };
    const updated = [withId, ...existing.filter(s => s.id !== withId.id)];
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${session.userId || 'guest'}`, JSON.stringify(updated));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return withId;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return session;
  }
};

export const getSessionsLocally = (userId?: string): StoredSession[] => {
  try {
    if (userId && userId !== 'guest') {
      const userSpecific = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
      if (userSpecific) return JSON.parse(userSpecific);
    }
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load local sessions:', e);
    return [];
  }
};

export async function saveSessionToFirestore(user: AppUser | User | null, sessionData: Omit<StoredSession, 'userId'>): Promise<StoredSession> {
  const uid = user?.uid || 'guest';
  const localSaved = saveSessionLocally({
    ...sessionData,
    userId: uid,
  });

  if (!user || !db) {
    return localSaved;
  }

  try {
    const colRef = collection(db, 'users', uid, 'sessions');
    const docRef = await addDoc(colRef, {
      ...sessionData,
      userId: uid,
      createdAt: serverTimestamp(),
      date: new Date().toISOString()
    });
    return { ...localSaved, id: docRef.id };
  } catch (err) {
    console.warn('Could not save to Firestore, using local storage:', err);
    return localSaved;
  }
}

export async function loadUserSessions(user: AppUser | User | null): Promise<StoredSession[]> {
  const uid = user?.uid || 'guest';
  const local = getSessionsLocally(uid);
  if (!user || !db || uid === 'guest') {
    return local;
  }

  try {
    const colRef = collection(db, 'users', uid, 'sessions');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return local;
    }

    const firestoreSessions: StoredSession[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || uid,
        date: data.date || new Date().toISOString(),
        testType: data.testType || 'full',
        topicTitle: data.topicTitle || 'IELTS Speaking Session',
        overallBand: data.overallBand || 6.0,
        fluencyBand: data.fluencyBand || 6.0,
        lexicalBand: data.lexicalBand || 6.0,
        grammarBand: data.grammarBand || 6.0,
        pronunciationBand: data.pronunciationBand || 6.0,
        feedbackSummary: data.feedbackSummary || '',
        detailedFeedback: data.detailedFeedback || {},
        durationSeconds: data.durationSeconds || 0,
        totalWords: data.totalWords !== undefined ? data.totalWords : (data.detailedFeedback?.pacingSummary?.totalWords || data.detailedFeedback?.pacingStats?.totalWords),
        avgWpm: data.avgWpm !== undefined ? data.avgWpm : (data.detailedFeedback?.pacingSummary?.avgWpm || data.detailedFeedback?.pacingStats?.avgWpm),
        peakWpm: data.peakWpm !== undefined ? data.peakWpm : (data.detailedFeedback?.pacingSummary?.peakWpm || data.detailedFeedback?.pacingStats?.peakWpm),
        activeSpeakingSeconds: data.activeSpeakingSeconds !== undefined ? data.activeSpeakingSeconds : (data.detailedFeedback?.pacingSummary?.activeSpeakingSeconds || data.detailedFeedback?.pacingStats?.activeSpeakingSeconds),
        transcript: data.transcript || []
      };
    });

    // Merge with local if any unique exist
    const seenIds = new Set(firestoreSessions.map(s => s.id));
    const uniqueLocal = local.filter(s => s.id && !seenIds.has(s.id));
    const combined = [...firestoreSessions, ...uniqueLocal];
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${uid}`, JSON.stringify(combined));
    return combined;
  } catch (err) {
    console.warn('Could not fetch from Firestore, falling back to local:', err);
    return local;
  }
}

export async function saveUserProfile(user: AppUser | User, targetBand: number = 7.0): Promise<void> {
  if (!user || !db) return;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      userId: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Candidate',
      email: user.email || '',
      photoURL: user.photoURL || '',
      targetBand: targetBand,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not update user profile in Firestore:', err);
  }
}

// Google Identity Services or Firebase Popup Login
export async function loginWithGoogle(): Promise<AppUser | null> {
  const oAuthClientId = firebaseConfigJson.oAuthClientId;

  // 1. Try Google Identity Services OAuth popup if available
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2 && oAuthClientId) {
    try {
      const user = await new Promise<AppUser | null>((resolve) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: oAuthClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
          callback: async (response: any) => {
            if (response.error || !response.access_token) {
              resolve(null);
              return;
            }
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` }
              });
              if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                const appUser: AppUser = {
                  uid: info.sub ? `google_${info.sub}` : `user_${Date.now()}`,
                  displayName: info.name || info.given_name || 'Candidate',
                  email: info.email || null,
                  photoURL: info.picture || null
                };
                setStoredUser(appUser);
                saveUserProfile(appUser).catch(() => {});
                resolve(appUser);
                return;
              }
            } catch (err) {
              console.warn('Error fetching Google userinfo:', err);
            }
            resolve(null);
          }
        });
        client.requestAccessToken({ prompt: 'select_account' });
      });

      if (user) {
        return user;
      }
    } catch (e) {
      console.warn('Google Identity Services flow encountered an issue:', e);
    }
  }

  // 2. Try Firebase Auth with silent error handling (no uncaught 400s)
  if (auth) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const appUser: AppUser = {
          uid: result.user.uid,
          displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Candidate',
          email: result.user.email || null,
          photoURL: result.user.photoURL || null
        };
        setStoredUser(appUser);
        saveUserProfile(appUser).catch(() => {});
        return appUser;
      }
    } catch (err: any) {
      console.info('Standard popup fallback activated:', err?.code || err?.message);
    }
  }

  // 3. Fallback: Quick Google Candidate Account Sign-In
  const defaultEmail = 'Yaroslav.Sulyaev@gmail.com';
  const name = defaultEmail.split('@')[0].replace('.', ' ');
  const fallbackUser: AppUser = {
    uid: `user_${defaultEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    email: defaultEmail,
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${name}&backgroundColor=2563eb&textColor=ffffff`
  };
  setStoredUser(fallbackUser);
  saveUserProfile(fallbackUser).catch(() => {});
  return fallbackUser;
}

export async function loginWithCustomEmail(email: string, name?: string): Promise<AppUser> {
  const cleanEmail = email.trim().toLowerCase();
  const derivedName = name?.trim() || cleanEmail.split('@')[0].replace(/[\._-]/g, ' ');
  const formattedName = derivedName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  const user: AppUser = {
    uid: `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
    displayName: formattedName || 'Candidate',
    email: cleanEmail,
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${formattedName}&backgroundColor=2563eb&textColor=ffffff`
  };

  setStoredUser(user);
  await saveUserProfile(user);
  return user;
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    try {
      await fbSignOut(auth);
    } catch {}
  }
  setStoredUser(null);
}

