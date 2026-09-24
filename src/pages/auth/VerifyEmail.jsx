import { useState, useEffect, useRef } from 'react';
import { FiMail } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import AuthCard from '../../components/AuthCard';
import ErrorAlert from '../../components/ErrorAlert';

const VerifyEmail = () => {
  const { user, logout, sendVerificationEmail, reloadUser } = useAuth();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const sentRef = useRef(false);

  useEffect(() => {
    document.title = 'Verify email | FinHub';
  }, []);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    sendVerificationEmail()
      .then(() => {
        setNotice('Verification email sent. Check your inbox and spam folder.');
      })
      .catch(() => {});
  }, [sendVerificationEmail]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        reloadUser().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reloadUser]);

  const handleResend = async () => {
    setError('');
    setNotice('');
    setSending(true);
    try {
      await sendVerificationEmail();
      setNotice('Verification email sent. Check your inbox and spam folder.');
    } catch (err) {
      const code = err.code;
      if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Could not send verification email. Try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleChecked = async () => {
    setError('');
    setChecking(true);
    try {
      const next = await reloadUser();
      if (!next?.emailVerified) {
        setError('Email is not verified yet. Open the link in your inbox, then try again.');
      }
    } catch {
      setError('Could not refresh verification status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Confirm your address before opening this finance workspace."
    >
      <div className="space-y-4 sm:space-y-5">
        <ErrorAlert message={error} />
        {notice ? (
          <div
            className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800"
            role="status"
          >
            {notice}
          </div>
        ) : null}
        <p className="text-sm text-slate-600 leading-relaxed">
          We sent a verification link to{' '}
          <span className="font-semibold text-slate-800">{user?.email || 'your email'}</span>.
          Verify that address, then continue.
        </p>
        <Button type="button" fullWidth loading={checking} disabled={checking} onClick={handleChecked}>
          I have verified
        </Button>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          loading={sending}
          disabled={sending}
          onClick={handleResend}
        >
          Resend verification email
        </Button>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full text-center text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          Sign out
        </button>
        <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <FiMail className="w-4 h-4" aria-hidden />
          Use the same inbox you registered with.
        </p>
      </div>
    </AuthCard>
  );
};

export default VerifyEmail;
