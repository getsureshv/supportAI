'use client';

import { useEffect, useState } from 'react';
import { ticketsAPI, Ticket } from '@/lib/api';
import Link from 'next/link';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTickets();
  }, [filter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await ticketsAPI.list(params);
      setTickets(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'text-blue-600',
      'in-progress': 'text-orange-600',
      resolved: 'text-green-600',
      closed: 'text-gray-600',
    };
    return colors[status] || 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-cricket-green">My Support Tickets</h1>
        <Link href="/support/raise" className="btn btn-primary">
          Raise New Ticket
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'open', 'in-progress', 'resolved', 'closed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === status ? 'bg-cricket-green text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-gray-600 mb-4">No tickets found</p>
          <Link href="/support/raise" className="btn btn-primary">
            Create Your First Ticket
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <Link key={ticket.id} href={`/support/tickets/${ticket.id}`}>
              <div className={`ticket-card ${ticket.status}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{ticket.subject}</h3>
                    <p className="text-sm text-gray-600">ID: {ticket.id}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${ticket.priority}`}>{ticket.priority.toUpperCase()}</span>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{ticket.description.substring(0, 100)}...</p>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    📁 {ticket.category.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={getStatusColor(ticket.status)}>
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                  <span className="text-gray-600">
                    Created: {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
