'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/lib/auth';

declare global {
  interface Window {
    google?: any;
    handleGoogleCredential?: (response: any) => void;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, config, signInWithGoogle, signInDemo } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoName, setDemoName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.profileComplete ? '/' : '/onboarding');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!config?.googleClientId) return;

    window.handleGoogleCredential = async (response: { credential?: string }) => {
      if (!response.credential) return;
      try {
        setBusy(true);
        const u = await signInWithGoogle(response.credential);
        router.replace(u.profileComplete ? '/' : '/onboarding');
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Google sign-in failed');
      } finally {
        setBusy(false);
      }
    };

    const renderButton = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: window.handleGoogleCredential,
      });
      const el = document.getElementById('google-signin-button');
      if (el) {
        window.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'signin_with',
        });
      }
    };

    if (window.google?.accounts?.id) renderButton();
    else {
      const handle = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(handle);
          renderButton();
        }
      }, 200);
      return () => clearInterval(handle);
    }
  }, [config, signInWithGoogle, router]);

  const handleDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoEmail || !demoName) return;
    try {
      setBusy(true);
      setError(null);
      const u = await signInDemo(demoEmail.trim(), demoName.trim());
      router.replace(u.profileComplete ? '/' : '/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Demo sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🏏</div>
            <h1 className="text-2xl font-bold text-cricket-green">DCL Support</h1>
            <p className="text-gray-600 text-sm mt-2">
              Sign in to get help with cricket disputes, scoring, scheduling, and more.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {config?.googleClientId ? (
            <div className="flex justify-center mb-6">
              <div id="google-signin-button" />
            </div>
          ) : null}

          {config?.demoLoginAvailable && (
            <>
              <div className="text-center text-xs text-gray-400 uppercase tracking-wide my-4">
                Demo mode (no Google)
              </div>
              <form onSubmit={handleDemo} className="space-y-3">
                <input
                  type="text"
                  value={demoName}
                  onChange={e => setDemoName(e.target.value)}
                  placeholder="Your name"
                  className="form-input"
                  required
                />
                <input
                  type="email"
                  value={demoEmail}
                  onChange={e => setDemoEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="form-input"
                  required
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="btn btn-primary w-full py-3"
                >
                  {busy ? 'Signing in…' : 'Continue (demo)'}
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Demo login is available because no GOOGLE_CLIENT_ID is configured on the backend.
                Set one in <code>backend/.env</code> to switch to real Google sign-in.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
