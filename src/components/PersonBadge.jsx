import { personBadgeClass } from '../constants/projectAssignments';

const PersonBadge = ({ name }) => {
  const label = String(name || '').trim();
  if (!label) return '-';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${personBadgeClass(label)}`}>
      {label}
    </span>
  );
};

export default PersonBadge;
