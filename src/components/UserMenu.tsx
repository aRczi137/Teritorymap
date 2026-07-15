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
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(to right, #FF6B2C, #9B30FF)' }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-text-emphasis text-sm font-medium max-w-[120px] truncate">
          {user.username}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface-card border border-surface-border rounded-lg py-1 min-w-[140px] z-50 shadow-xl">
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-surface-hover hover:text-text-emphasis transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
