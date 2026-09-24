import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { MAX_USERS } from '../constants/app';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [provisioned, setProvisioned] = useState(false);
  const skipUserPaint = useRef(false);

  const ensureUserDoc = async (u) => {
    if (!u) return false;
    const userRef = doc(db, 'users', u.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) return true;
    await setDoc(userRef, {
      email: u.email ?? '',
      createdAt: serverTimestamp()
    });
    return true;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (skipUserPaint.current) {
        if (!u) {
          skipUserPaint.current = false;
          setUser(null);
          setProvisioned(false);
          setLoading(false);
          return;
        }
        try {
          await ensureUserDoc(u);
        } catch {
          // Signup will surface a real error if the user doc cannot be created.
        }
        return;
      }
      if (!u) {
        setUser(null);
        setProvisioned(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      let ok = false;
      try {
        ok = await ensureUserDoc(u);
      } catch {
        ok = false;
      }
      setProvisioned(ok);
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signup = async (email, password) => {
    const configRef = doc(db, 'app', 'config');
    const configSnap = await getDoc(configRef);
    const data = configSnap.exists() ? configSnap.data() : {};
    const userCount = data.userCount ?? (data.hasUsers ? 1 : 0);
    if (userCount >= MAX_USERS) {
      const err = new Error('Maximum number of accounts reached.');
      err.code = 'auth/max-users';
      throw err;
    }
    skipUserPaint.current = true;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const u = userCredential.user;
      await setDoc(doc(db, 'users', u.uid), {
        email: u.email ?? '',
        createdAt: serverTimestamp()
      });
      await setDoc(configRef, {
        hasUsers: true,
        userCount: userCount + 1
      }, { merge: true });
      try {
        await sendEmailVerification(u);
      } catch {
        // Account exists; they can sign in without verifying.
      }
      await signOut(auth);
      return userCredential;
    } catch (err) {
      skipUserPaint.current = false;
      try {
        if (auth.currentUser) await signOut(auth);
      } catch {
        // Keep the original signup error.
      }
      throw err;
    }
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const sendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) {
      const err = new Error('Not signed in.');
      err.code = 'auth/unauthenticated';
      throw err;
    }
    await sendEmailVerification(auth.currentUser);
  }, []);

  const reloadUser = useCallback(async () => {
    if (!auth.currentUser) return null;
    await reload(auth.currentUser);
    setUser(auth.currentUser);
    return auth.currentUser;
  }, []);

  const value = {
    user,
    loading,
    provisioned,
    signup,
    login,
    logout,
    resetPassword,
    sendVerificationEmail,
    reloadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
