import { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { exchangeCode, getFirebaseToken } from './api';
import { BASE_PATH, CALLBACK_PATH } from './basePath';

export function OAuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const discordError = params.get('error');

    if (discordError) {
      setError(discordError === 'access_denied' ? 'You denied the authorization request.' : `Discord error: ${discordError}`);
      setLoading(false);
      return;
    }

    if (!code) {
      setError('Missing authorization code. Please try logging in again.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const redirectUri = window.location.origin + CALLBACK_PATH.replace(/\/$/, '');
        const result = await exchangeCode(code, redirectUri, state ?? undefined);
        if (cancelled) return;

        localStorage.setItem('session_token', result.session_id);

        const fbToken = await getFirebaseToken(result.session_id);
        if (cancelled) return;

        await signInWithCustomToken(auth, fbToken);
        if (cancelled) return;

        window.location.replace(BASE_PATH);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(`Authentication failed: ${message}`);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#111118]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-[#5865F2] border-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">Logging in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#111118]">
        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-lg p-6 max-w-sm w-full text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => { window.location.href = BASE_PATH; }}
            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
}
