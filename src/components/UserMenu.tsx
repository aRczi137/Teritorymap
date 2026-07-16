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

  const currentTab = new URLSearchParams(window.location.search).get('tab') || 'map';
  const isMap = currentTab === 'map';

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
        <div className="absolute right-0 top-full mt-1 bg-surface-card border border-surface-border rounded-lg py-1 min-w-[180px] z-50 shadow-xl">
          <a
            href="?tab=map"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 text-sm no-underline transition-colors ${isMap ? 'text-accent-purple bg-surface-hover' : 'text-text-muted hover:bg-surface-hover hover:text-text-emphasis'}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            Territory Map
          </a>
          <a
            href="?tab=hive"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 text-sm no-underline transition-colors ${!isMap ? 'text-accent-purple bg-surface-hover' : 'text-text-muted hover:bg-surface-hover hover:text-text-emphasis'}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Hive Builder
          </a>
          <div className="border-t border-surface-border my-1" />
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
