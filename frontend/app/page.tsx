'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-cricket-green to-cricket-green-light text-white rounded-lg p-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to DCL Support</h1>
        <p className="text-lg mb-6">
          Get help with player registration, umpire disputes, scoring issues, equipment problems, and more.
        </p>
        <Link href="/support/raise" className="inline-block bg-cricket-gold text-black px-8 py-3 rounded-lg font-bold hover:bg-cricket-gold-dark transition">
          Raise a Ticket Now
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-cricket-green mb-4">🎯 Quick Help</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Player registration issues</li>
            <li>• Umpire call disputes</li>
            <li>• Scoring errors</li>
            <li>• Equipment problems</li>
            <li>• Match scheduling</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-cricket-green mb-4">⏱️ Fast Response</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Urgent: 2 hours</li>
            <li>• High: 4 hours</li>
            <li>• Medium: 8 hours</li>
            <li>• Low: 24 hours</li>
            <li>• AI chat available 24/7</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-cricket-green mb-4">📋 Cricket Rules</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Based on DCL rulebook</li>
            <li>• Quick fixes suggested</li>
            <li>• Video evidence helps</li>
            <li>• Fair play encouraged</li>
            <li>• Escalation when needed</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
        <h3 className="font-bold text-lg text-blue-900 mb-2">💡 Pro Tips</h3>
        <ul className="text-blue-800 space-y-2">
          <li>• Have video evidence ready for umpire disputes</li>
          <li>• Check player eligibility before playoffs (3+ league games required)</li>
          <li>• Playoff tickets get priority (2-hour response)</li>
          <li>• Reference specific Cricket Laws (e.g., Law 1.2.2) when filing</li>
          <li>• Contact dclmgmtops@gmail.com for emergencies (weather, walk-overs)</li>
        </ul>
      </div>
    </div>
  );
}
