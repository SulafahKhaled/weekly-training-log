import { useState } from 'react';
import { ChevronLeft, Flame, LogOut } from 'lucide-react';

export default function TopBar({ title, subtitle, showBack, onBack, streak, username, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="topbar">
      {showBack && (
        <button className="back" onClick={onBack} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="title-wrap">
        <h1>{title}</h1>
        <div className="sub">{subtitle}</div>
      </div>
      {streak > 0 && (
        <div className="streak-badge" title={`${streak}-day streak`}>
          <Flame size={13} fill="currentColor" />
          {streak}
        </div>
      )}
      {username && (
        <div className="account-menu">
          <button className="account-avatar" onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu">
            {username.slice(0, 1).toUpperCase()}
          </button>
          {menuOpen && (
            <>
              <button className="account-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
              <div className="account-dropdown">
                <div className="account-name">Signed in as {username}</div>
                <button
                  className="account-logout"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={13} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
