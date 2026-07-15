import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-xs font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-gray-200 text-sm font-medium max-w-[120px] truncate">
          {user.username}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a24] border border-[#2a2a3a] rounded-lg py-1 min-w-[140px] z-50 shadow-xl">
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
