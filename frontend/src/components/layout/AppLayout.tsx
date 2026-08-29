import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Send, LayoutDashboard, Mail, Activity, Settings, LogOut } from 'lucide-react';

export const AppLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link to="/dashboard" className="brand">
            <div className="brand-icon">
              <Send size={18} />
            </div>
            <span>ReachInbox</span>
          </Link>

          <nav className="nav-links">
            <Link
              to="/dashboard"
              className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/campaigns"
              className={`nav-item ${location.pathname === '/campaigns' ? 'active' : ''}`}
            >
              <Mail size={16} />
              <span>Campaigns</span>
            </Link>
            <Link
              to="/composer"
              className={`nav-item ${location.pathname === '/composer' ? 'active' : ''}`}
            >
              <Send size={16} />
              <span>Composer</span>
            </Link>
            <Link
              to="/monitoring"
              className={`nav-item ${location.pathname === '/monitoring' ? 'active' : ''}`}
            >
              <Activity size={16} />
              <span>Monitoring</span>
            </Link>
            <Link
              to="/settings"
              className={`nav-item ${location.pathname.startsWith('/settings') ? 'active' : ''}`}
            >
              <Settings size={16} />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        <div className="header-right">
          {user && (
            <div className="user-pill">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          )}

          <button
            onClick={() => logout()}
            className="btn btn-danger-ghost"
            title="Log out"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
