import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

export function Header() {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <span className="header-logo">📦</span>
        <span className="header-title">Stock Verify Admin</span>
      </div>

      <div className="header-center">
        <div className="header-status">
          <span className="status-dot active"></span>
          <span>System Online</span>
        </div>
      </div>

      <div className="header-user">
        <span className="user-info">
          <span className="user-name">{user?.username}</span>
          <span className="user-role">{user?.role}</span>
        </span>
        <div className="user-avatar">
          {getInitials(user?.username || 'U')}
        </div>
        <button onClick={logout} className="logout-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
