'use client';

import { useEffect, useState } from 'react';
import { TicketAttachment, ticketsAPI } from '@/lib/api';

interface AttachmentListProps {
  ticketId: string;
  attachments: TicketAttachment[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusBadge(status: string) {
  if (status === 'completed') return <span className="text-green-700 text-xs font-semibold">✓ Transcribed</span>;
  if (status === 'pending') return <span className="text-amber-700 text-xs font-semibold">⏳ Transcribing…</span>;
  return <span className="text-red-700 text-xs font-semibold">✗ Transcription failed</span>;
}

export default function AttachmentList({ ticketId, attachments }: AttachmentListProps) {
  const [items, setItems] = useState<TicketAttachment[]>(attachments);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Poll for transcription updates if anything is still pending.
  useEffect(() => {
    const stillPending = items.some(a => a.transcriptionStatus === 'pending');
    if (!stillPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await ticketsAPI.get(ticketId);
        if (res.data.attachments) setItems(res.data.attachments);
      } catch {
        // best-effort; keep polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [ticketId, items]);

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="font-bold text-lg mb-4">📎 Uploaded evidence ({items.length})</h3>
      <ul className="space-y-3">
        {items.map(att => {
          const isImage = att.mimeType.startsWith('image/');
          const downloadUrl = ticketsAPI.attachmentUrl(ticketId, att.id);
          const isOpen = expanded[att.id];

          return (
            <li key={att.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isImage ? (
                    <img
                      src={downloadUrl}
                      alt={att.fileName}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-xl">
                      📄
                    </div>
                  )}
                  <div className="min-w-0">
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-cricket-green hover:underline truncate block"
                    >
                      {att.fileName}
                    </a>
                    <div className="text-xs text-gray-600 flex gap-3">
                      <span>{att.mimeType}</span>
                      <span>{formatSize(att.fileSize)}</span>
                      {statusBadge(att.transcriptionStatus)}
                    </div>
                  </div>
                </div>
                {att.transcription && (
                  <button
                    onClick={() => toggle(att.id)}
                    className="btn btn-secondary btn-small text-xs"
                  >
                    {isOpen ? 'Hide' : 'Show'} transcript
                  </button>
                )}
              </div>

              {isOpen && att.transcription && (
                <div className="mt-3 bg-gray-50 border rounded-lg p-3 text-sm whitespace-pre-wrap text-gray-800 max-h-60 overflow-y-auto">
                  {att.transcription}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
