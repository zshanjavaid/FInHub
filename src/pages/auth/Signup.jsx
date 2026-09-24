import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiCheck, FiCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import InputField from '../../components/InputField';
import PasswordField from '../../components/PasswordField';
import Button from '../../components/Button';
import AuthCard from '../../components/AuthCard';
import ErrorAlert from '../../components/ErrorAlert';

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) }
];

const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  return null;
};

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign up | FinHub';
  }, []);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await signup(form.email.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      const code = err.code;
      let message = 'Sign up failed.';
      if (code === 'auth/email-already-in-use') message = 'This email is already registered.';
      else if (code === 'auth/max-users') message = 'Maximum number of accounts reached.';
      else if (code === 'auth/too-many-requests') message = 'Too many attempts. Please try again later.';
      else if (code === 'auth/network-request-failed') message = 'Network error. Check your connection.';
      else if (code === 'permission-denied') message = 'Maximum number of accounts reached.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Create account" subtitle="Register to access your FinHub workspace.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
        <ErrorAlert message={error} />
        <InputField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Enter your email"
          icon={<FiMail className="w-5 h-5 text-gray-400" />}
        />
        <div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="Enter password"
            leftIcon={<FiLock className="w-5 h-5 text-gray-400" />}
          />
          <ul className="mt-2 space-y-1.5">
            {PASSWORD_RULES.map((rule) => {
              const valid = rule.test(form.password);
              return (
                <li key={rule.key} className="flex items-center gap-2 text-xs">
                  {valid ? (
                    <FiCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <FiCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={valid ? 'text-green-700' : 'text-gray-500'}>
                    {rule.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={form.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          placeholder="Confirm password"
          leftIcon={<FiLock className="w-5 h-5 text-gray-400" />}
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>
    </AuthCard>
  );
};

export default Signup;
