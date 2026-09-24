import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import AuthCard from '../../components/AuthCard';
import ErrorAlert from '../../components/ErrorAlert';

const Unauthorized = () => {
  const { logout } = useAuth();

  useEffect(() => {
    document.title = 'Access denied | FinHub';
  }, []);

  return (
    <AuthCard
      title="Access denied"
      subtitle="This account is not provisioned for the FinHub workspace."
    >
      <div className="space-y-4 sm:space-y-5">
        <ErrorAlert message="Sign-in succeeded, but this user is not on the allowed workspace list." />
        <p className="text-sm text-slate-600 leading-relaxed">
          Only registered FinHub accounts can open projects, transactions, and funds.
          If you were invited, ask an existing member to create your account from the app.
        </p>
        <Button type="button" fullWidth onClick={() => logout()}>
          Sign out
        </Button>
      </div>
    </AuthCard>
  );
};

export default Unauthorized;
