'use client';

import { useEffect, useState } from 'react';
import { adminAPI, Ticket } from '@/lib/api';
import Link from 'next/link';
import UserHeader from '@/components/UserHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function AdminTicketQueuePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'open',
    slaStatus: 'all',
  });

  useEffect(() => {
    if (!user?.profileComplete) return;
    loadTickets();
  }, [filters, user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.slaStatus !== 'all') params.slaStatus = filters.slaStatus;

      const response = await adminAPI.listTickets(params);
      setTickets(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const getSLABadge = (ticket: Ticket) => {
    if (!ticket.sla) return null;
    const now = new Date();
    const dueDate = new Date(ticket.sla.resolutionDueAt);
    const minutesLeft = (dueDate.getTime() - now.getTime()) / 1000 / 60;

    if (minutesLeft < 0) return <span className="sla-badge breached">🔴 BREACHED</span>;
    if (minutesLeft < 120) return <span className="sla-badge at-risk">⚠️ AT RISK</span>;
    return <span className="sla-badge on-track">✅ ON TRACK</span>;
  };

  if (authLoading || !user?.profileComplete) {
    return <div className="p-12 text-center text-gray-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <UserHeader />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-cricket-green">Support Ticket Queue</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md flex gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">SLA Status</label>
          <select
            value={filters.slaStatus}
            onChange={e => setFilters({ ...filters, slaStatus: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="breached">Breached</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-gray-600">No tickets found with current filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-cricket-green text-white">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Subject</th>
                <th className="px-6 py-3 text-left font-semibold">Category</th>
                <th className="px-6 py-3 text-left font-semibold">Priority</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-left font-semibold">SLA</th>
                <th className="px-6 py-3 text-left font-semibold">Created</th>
                <th className="px-6 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket, idx) => (
                <tr key={ticket.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-6 py-4 font-semibold">{ticket.subject}</td>
                  <td className="px-6 py-4">{ticket.category.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${ticket.priority}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">{ticket.status}</td>
                  <td className="px-6 py-4">{getSLABadge(ticket)}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/support/tickets/${ticket.id}`}
                      className="text-cricket-green font-semibold hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </main>
    </div>
  );
}
