import { useAuth } from './auth/AuthContext';
import { OAuthCallback } from './auth/OAuthCallback';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginPage } from './components/LoginPage';
import AllianceMapManager from './AllianceMapManager';

export default function App() {
  if (window.location.pathname === '/callback') return <OAuthCallback />;
  return <AuthRouter />;
}

function AuthRouter() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  return <AllianceMapManager userId={user.id} />;
}
