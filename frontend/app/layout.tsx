'use client';

import React from 'react';
import Link from 'next/link';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <nav className="bg-cricket-green text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              🏏 DCL Support
            </Link>
            <div className="flex gap-6">
              <Link href="/support/raise" className="hover:bg-cricket-green-light px-3 py-2 rounded">
                Raise Ticket
              </Link>
              <Link href="/support/tickets" className="hover:bg-cricket-green-light px-3 py-2 rounded">
                My Tickets
              </Link>
              <Link href="/admin/support" className="hover:bg-cricket-green-light px-3 py-2 rounded">
                Admin
              </Link>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="bg-gray-800 text-white text-center py-4 mt-12">
          <p>© 2026 Dallas Cricket League. Support System powered by AI.</p>
        </footer>
      </body>
    </html>
  );
}
