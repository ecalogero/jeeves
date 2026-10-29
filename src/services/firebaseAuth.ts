import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
// Firebase Web API keys are safe to embed in client code — they identify the project,
// not authenticate access. Security is enforced via Firebase Security Rules.
// See: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  projectId: 'casebook-511221',
  appId: '1:349349424398:web:7b60fb36040206ce773b5f',
  apiKey: 'AIzaSyBt3NtZ_71EiQfh-vn1bA5W91y6rgmr-MU',
  authDomain: 'casebook-511221.firebaseapp.com',
  storageBucket: 'casebook-511221.firebasestorage.app',
  messagingSenderId: '349349424398',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Workspace calendar scope configured via OAuth setup
provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google OAuth access token');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Returns a Firebase ID token for authenticating against the Jeeves backend API
export const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
