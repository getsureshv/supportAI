'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ticketsAPI, Ticket } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import UserHeader from '@/components/UserHeader';

export default function MyTicketsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!user.profileComplete) router.replace('/onboarding');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.profileComplete) return;
    (async () => {
      try {
        setListLoading(true);
        const params = filter !== 'all' ? { status: filter } : {};
        const res = await ticketsAPI.list(params);
        setTickets(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to load tickets');
      } finally {
        setListLoading(false);
      }
    })();
  }, [filter, user]);

  if (loading || !user || !user.profileComplete) {
    return <div className="p-12 text-center text-gray-500">Loading…</div>;
  }

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      open: 'text-blue-600',
      in_progress: 'text-orange-600',
      resolved: 'text-green-600',
      closed: 'text-gray-600',
    };
    return map[status] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen">
      <UserHeader />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-cricket-green">My Support Tickets</h1>
          <Link href="/" className="btn btn-primary text-sm">
            Start new chat
          </Link>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filter === status
                  ? 'bg-cricket-green text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</div>}

        {listLoading ? (
          <div className="text-center py-8 text-gray-600">Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 p-10 rounded-lg text-center">
            <p className="text-gray-600 mb-4">You haven't raised any tickets yet.</p>
            <Link href="/" className="btn btn-primary">
              Chat with support
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => (
              <Link key={ticket.id} href={`/support/tickets/${ticket.id}`}>
                <div className={`ticket-card ${ticket.status}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{ticket.subject}</h3>
                      <p className="text-xs text-gray-500 font-mono">{ticket.id.slice(0, 8)}</p>
                    </div>
                    <span className={`badge ${ticket.priority}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 text-sm">
                    {ticket.description.slice(0, 160)}
                    {ticket.description.length > 160 ? '…' : ''}
                  </p>
                  <div className="flex justify-between items-center text-sm flex-wrap gap-2">
                    <span className="text-gray-600">
                      📁 {ticket.category.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className={statusColor(ticket.status)}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
