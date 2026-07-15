const ARC_API_URL = import.meta.env.VITE_ARC_API_URL || 'http://localhost:8000';

export interface UserInfo {
  id: string;
  username: string;
  avatar: string | null;
}

interface AuthStateResponse {
  state: string;
}

interface CallbackResponse {
  session_id: string;
  user: UserInfo;
}

interface FirebaseTokenResponse {
  firebaseToken: string;
}

interface MeResponse {
  id: string;
  username: string;
  avatar: string | null;
}

function headers(sessionId?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) h['Authorization'] = `Bearer ${sessionId}`;
  return h;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`ArcBot API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function getAuthState(): Promise<string> {
  const res = await fetch(`${ARC_API_URL}/api/auth/state`, {
    headers: headers(),
  });
  const data = await handleResponse<AuthStateResponse>(res);
  return data.state;
}

export async function exchangeCode(code: string, redirectUri: string, state?: string): Promise<CallbackResponse> {
  const res = await fetch(`${ARC_API_URL}/api/auth/discord/callback`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ code, redirect_uri: redirectUri, state }),
  });
  return handleResponse<CallbackResponse>(res);
}

export async function getFirebaseToken(sessionId: string): Promise<string> {
  const res = await fetch(`${ARC_API_URL}/api/auth/firebase-token`, {
    method: 'POST',
    headers: headers(sessionId),
  });
  const data = await handleResponse<FirebaseTokenResponse>(res);
  return data.firebaseToken;
}

export async function getMe(sessionId: string): Promise<MeResponse> {
  const res = await fetch(`${ARC_API_URL}/api/auth/me`, {
    headers: headers(sessionId),
  });
  return handleResponse<MeResponse>(res);
}

export async function logoutSession(sessionId: string): Promise<void> {
  const res = await fetch(`${ARC_API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: headers(sessionId),
  });
  await handleResponse<void>(res);
}
