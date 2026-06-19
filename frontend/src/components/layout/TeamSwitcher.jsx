import { useAuth } from '../../store/AuthContext.jsx';

const TeamSwitcher = () => {
  const { teams, activeTeam, switchTeam } = useAuth();

  if (!teams || teams.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-gray-700">
      <p className="text-xs text-gray-500 mb-1 uppercase tracking-widest">Active Team</p>
      <select
        value={activeTeam?._id || ''}
        onChange={(e) => {
          const membership = teams.find((m) => m.team?._id === e.target.value);
          if (membership) switchTeam(membership.team);
        }}
        className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-brand-500"
      >
        {teams.map((membership) => (
          <option key={membership.team?._id} value={membership.team?._id}>
            {membership.team?.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TeamSwitcher;
