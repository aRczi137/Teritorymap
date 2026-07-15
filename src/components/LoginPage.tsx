import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="flex items-center justify-center h-screen bg-[#111118]">
      <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Territory Map</h1>
        <p className="text-gray-400 text-sm mb-6">Sign in with Discord to access your maps</p>
        <button
          onClick={login}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg px-6 py-3 font-medium w-full transition-colors"
        >
          Login with Discord
        </button>
      </div>
    </div>
  );
}
