'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth';

/**
 * Gate a page behind authentication. Redirects:
 * - unauthenticated → /login
 * - authenticated but profile incomplete → /onboarding
 *
 * Returns { user, loading } so pages can render a spinner until auth is known.
 */
export function useRequireAuth() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!user.profileComplete) router.replace('/onboarding');
  }, [user, loading, router]);

  return { user, loading };
}
