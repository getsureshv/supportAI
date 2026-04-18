'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface UserHeaderProps {
  rightSlot?: React.ReactNode;
}

function roleLabel(role: string): string {
  switch (role) {
    case 'captain':
      return 'Captain';
    case 'player':
      return 'Player';
    case 'umpire':
      return 'Umpire';
    case 'team_manager':
      return 'Team Manager';
    case 'admin':
      return 'Admin';
    case 'support':
      return 'Support';
    default:
      return role || 'Member';
  }
}

export default function UserHeader({ rightSlot }: UserHeaderProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="text-2xl">🏏</div>
          <div className="leading-tight">
            <div className="font-bold text-cricket-green">DCL Support</div>
            <div className="text-xs text-gray-500 group-hover:text-gray-700">
              AI-assisted help
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {rightSlot}

          <Link
            href="/support/tickets"
            className="text-sm text-gray-600 hover:text-cricket-green font-medium"
          >
            My Tickets
          </Link>

          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cricket-green text-white text-sm font-bold flex items-center justify-center">
                {initials}
              </div>
            )}
            <div className="leading-tight hidden sm:block">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-gray-500">
                {user.team || 'No team'} · {roleLabel(user.role)}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-2 text-gray-400 hover:text-red-600 text-sm"
              title="Sign out"
            >
              ⎋
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
