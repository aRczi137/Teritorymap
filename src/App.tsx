import { useAuth } from './auth/AuthContext';
import { OAuthCallback } from './auth/OAuthCallback';
import { CALLBACK_PATH } from './auth/basePath';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginPage } from './components/LoginPage';
import AllianceMapManager from './AllianceMapManager';

export default function App() {
  if (window.location.pathname === CALLBACK_PATH.replace(/\/$/, '')) return <OAuthCallback />;
  return <AuthRouter />;
}

function AuthRouter() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <LoginPage />;

  const params = new URLSearchParams(window.location.search);
  const initialTab = (params.get('tab') === 'hive') ? 'frankenstein' as const : 'map' as const;

  return <AllianceMapManager userId={user.id} initialTab={initialTab} />;
}
