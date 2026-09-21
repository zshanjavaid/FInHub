import { Rise } from '../motion';

const ErrorAlert = ({ message, messages = [], className = '' }) => {
  const list = messages.length ? messages : (message ? [message] : []);
  if (list.length === 0) return null;
  return (
    <Rise
      className={`rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-card ${className}`}
      role="alert"
    >
      {list.map((msg, i) => (
        <p key={i}>{msg}</p>
      ))}
    </Rise>
  );
};

export default ErrorAlert;
