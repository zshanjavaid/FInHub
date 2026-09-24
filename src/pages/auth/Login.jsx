import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import InputField from '../../components/InputField';
import PasswordField from '../../components/PasswordField';
import Button from '../../components/Button';
import AuthCard from '../../components/AuthCard';
import ErrorAlert from '../../components/ErrorAlert';

const Login = ({ showSignupLink = false }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign in | FinHub';
  }, []);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = form.email.trim();
    const password = form.password;
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      const code = err.code;
      let message = 'Invalid email or password.';
      if (code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error. Check your connection.';
      } else if (code === 'auth/invalid-email') {
        message = 'Enter a valid email address.';
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Sign in" subtitle="Sign in to your private FinHub workspace.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
        <ErrorAlert message={error} />
        <InputField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Enter your email"
          icon={<FiMail className="w-5 h-5 text-gray-400" />}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => handleChange('password', e.target.value)}
          placeholder="Enter password"
          leftIcon={<FiLock className="w-5 h-5 text-gray-400" />}
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
        {showSignupLink && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Need an account?{' '}
            <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
              Create account
            </Link>
          </p>
        )}
      </form>
    </AuthCard>
  );
};

export default Login;
