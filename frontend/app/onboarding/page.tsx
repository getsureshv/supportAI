'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { teamsAPI, Team } from '@/lib/api';

const ROLES = [
  { value: 'captain', label: 'Captain' },
  { value: 'player', label: 'Player' },
  { value: 'umpire', label: 'Umpire' },
  { value: 'team_manager', label: 'Team Manager' },
  { value: 'other', label: 'Other' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, updateProfile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [team, setTeam] = useState('');
  const [role, setRole] = useState('captain');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    else if (!loading && user?.profileComplete) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await teamsAPI.list();
        setTeams(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Could not load teams');
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) {
      setError('Please pick your team');
      return;
    }
    try {
      setBusy(true);
      setError(null);
      await updateProfile({ team, role });
      router.replace('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <div className="p-12 text-center text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg bg-white p-10 rounded-2xl shadow-lg border border-gray-100">
        <h1 className="text-2xl font-bold text-cricket-green mb-1">Welcome, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-gray-600 text-sm mb-8">
          Help us route your support requests correctly. Takes 5 seconds.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="form-label">Your team</label>
            <select
              value={team}
              onChange={e => setTeam(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Select your team…</option>
              {teams.map(t => (
                <option key={t.id} value={t.name}>
                  {t.name}
                  {t.division ? ` — ${t.division}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Your role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="form-select">
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full py-3 font-semibold"
          >
            {busy ? 'Saving…' : 'Continue to support'}
          </button>
        </form>
      </div>
    </div>
  );
}
