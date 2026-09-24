import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMail } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import AuthCard from '../../components/AuthCard';
import ErrorAlert from '../../components/ErrorAlert';

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Reset password | FinHub';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);
    const trimmed = email.trim();
    try {
      await resetPassword(trimmed);
      setSuccess(true);
    } catch (err) {
      const code = err.code;
      if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else if (code === 'auth/invalid-email') {
        setError('Enter a valid email address.');
      } else {
        setSuccess(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Reset password" subtitle="We'll email you a link to choose a new password.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
        <ErrorAlert message={error} />
        {success && (
          <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800" role="status">
          Check your inbox if an account exists for that address. If it does, you will receive a reset link.
          </div>
        )}
        <InputField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          icon={<FiMail className="w-5 h-5 text-gray-400" />}
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </Button>
        <p className="text-center text-sm text-slate-600">
          <Link to="/" className="font-semibold text-primary-600 hover:text-primary-700">
            Back to Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
};

export default ForgotPassword;
