import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="card max-w-sm w-full text-center">
        <img src="/logo.svg" className="w-12 h-12 mx-auto mb-4" alt="ArcBot" />
        <h1 className="text-2xl font-heading font-bold text-text-emphasis mb-2">ArcBot Tools</h1>
        <p className="text-text-muted text-sm mb-6">Sign in with Discord to access your maps</p>
        <button onClick={login} className="btn-primary w-full">
          Login with Discord
        </button>
      </div>
    </div>
  );
}
