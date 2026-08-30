import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { campaignApi } from '../../api/campaign.api.js';
import {
  LayoutDashboard,
  Send,
  Users,
  Mail,
  RotateCcw,
  FileText,
  BarChart2,
  PieChart,
  Layers,
  Settings,
  UserCheck,
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  Crown,
  ChevronDown,
  LogOut,
  X
} from 'lucide-react';

export const AppLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);

  // Resize listener for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname, isMobile]);

  // Keyboard shortcut Ctrl+/ or Cmd+/ for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [activities, setActivities] = useState<any[]>([]);
  const [lastReadTime, setLastReadTime] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('reachinbox_notifications_last_read');
      return stored ? new Date(stored).getTime() : 0;
    } catch {
      return 0;
    }
  });

  const formatTimeAgo = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return dateStr;
    const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchRecent = async () => {
      try {
        const data = await campaignApi.getRecentActivities();
        if (isMounted) {
          setActivities(data || []);
        }
      } catch {
        // silent fallback
      }
    };
    fetchRecent();
    return () => {
      isMounted = false;
    };
  }, []);

  const unreadCount = activities.filter(
    (a) => new Date(a.timestamp).getTime() > lastReadTime
  ).length;

  const handleMarkAllAsRead = () => {
    const now = Date.now();
    try {
      localStorage.setItem('reachinbox_notifications_last_read', new Date(now).toISOString());
    } catch {
      // ignore
    }
    setLastReadTime(now);
  };

  const navSearchItems = [
    { title: 'Outreach Campaigns', type: 'View', path: '/campaigns' },
    { title: 'Schedule New Campaign', type: 'Action', path: '/composer' },
    { title: 'Prospect Contacts', type: 'View', path: '/contacts' },
    { title: 'Performance Analytics', type: 'View', path: '/analytics' },
    { title: 'Queue & Rate Limiting Monitoring', type: 'System', path: '/monitoring' },
    { title: 'Unified Inbox', type: 'View', path: '/inbox' },
    { title: 'Email Templates', type: 'View', path: '/templates' },
    { title: 'Workspace Settings & SMTP Senders', type: 'Settings', path: '/settings' },
    { title: 'Integrations & Slack OAuth', type: 'Integration', path: '/integrations' }
  ];

  const filteredSearch = navSearchItems.filter((i) =>
    i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="outbox-app">
      {/* MOBILE BACKDROP OVERLAY */}
      {isMobile && sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR (Desktop Fixed or Mobile Drawer) */}
      <aside
        className={`outbox-sidebar ${isMobile ? 'mobile-drawer' : ''} ${sidebarOpen ? 'open' : 'closed'}`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <Link to="/dashboard" className="brand-logo" onClick={() => isMobile && setSidebarOpen(false)}>
            <div className="brand-icon-box">
              <Mail size={20} />
            </div>
            <span>Outbox</span>
          </Link>

          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="btn-icon-toggle mobile-close-btn"
              title="Close menu"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Sidebar Nav */}
        <div className="sidebar-content">
          {/* TOP DASHBOARD LINK */}
          <div style={{ marginBottom: '16px' }}>
            <ul className="sidebar-nav-list">
              <li>
                <Link
                  to="/dashboard"
                  className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>

          {/* OUTREACH SECTION */}
          <div>
            <div className="sidebar-section-title">OUTREACH</div>
            <ul className="sidebar-nav-list">
              <li>
                <Link
                  to="/campaigns"
                  className={`sidebar-link ${location.pathname === '/campaigns' || location.pathname.startsWith('/campaigns/') ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <Send size={18} />
                    <span>Campaigns</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  to="/templates"
                  className={`sidebar-link ${location.pathname === '/templates' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <FileText size={18} />
                    <span>Templates</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  to="/contacts"
                  className={`sidebar-link ${location.pathname === '/contacts' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <Users size={18} />
                    <span>Contacts</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  to="/inbox"
                  className={`sidebar-link ${location.pathname === '/inbox' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <Mail size={18} />
                    <span>Inbox</span>
                  </div>
                  <span className="sidebar-badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.3)', color: '#c7d2fe', padding: '1px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>12</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/follow-ups"
                  className={`sidebar-link ${location.pathname === '/follow-ups' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <RotateCcw size={18} />
                    <span>Follow-ups</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>

          {/* ANALYTICS SECTION */}
          <div>
            <div className="sidebar-section-title">ANALYTICS</div>
            <ul className="sidebar-nav-list">
              <li>
                <Link
                  to="/analytics"
                  className={`sidebar-link ${location.pathname === '/analytics' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <BarChart2 size={18} />
                    <span>Analytics</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  to="/reports"
                  className={`sidebar-link ${location.pathname === '/reports' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <PieChart size={18} />
                    <span>Reports</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>

          {/* SETTINGS SECTION */}
          <div>
            <div className="sidebar-section-title">SETTINGS</div>
            <ul className="sidebar-nav-list">
              <li>
                <Link
                  to="/integrations"
                  className={`sidebar-link ${location.pathname === '/integrations' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <Layers size={18} />
                    <span>Integrations</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className={`sidebar-link ${location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <Settings size={18} />
                    <span>Settings</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  to="/team"
                  className={`sidebar-link ${location.pathname === '/team' ? 'active' : ''}`}
                >
                  <div className="sidebar-link-left">
                    <UserCheck size={18} />
                    <span>Team</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>

          {/* PRO PLAN UPGRADE CARD */}
          <div className="sidebar-pro-card">
            <div className="pro-card-header">
              <span className="pro-card-title">Pro Plan</span>
              <span className="pro-card-renew">Renews on 28 Sep 2026</span>
            </div>
            <div className="pro-progress-container">
              <span className="pro-progress-text">72% of 10,000 emails used</span>
              <div className="pro-progress-bar">
                <div className="pro-progress-fill" style={{ width: '72%' }}></div>
              </div>
            </div>
            <button
              onClick={() => {
                if (isMobile) setSidebarOpen(false);
                navigate('/settings?tab=billing');
              }}
              className="btn-pro-upgrade"
              type="button"
            >
              <Crown size={14} />
              <span>Upgrade Plan</span>
            </button>
          </div>
        </div>

        {/* SIDEBAR USER FOOTER */}
        <div className="sidebar-user">
          <div className="sidebar-user-left">
            <div className="user-avatar-img">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div className="user-info">
              <span className="user-display-name">{user?.name || 'Gourav Vijayvargiya'}</span>
              <span className="user-display-role">{user?.role || 'Administrator'}</span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            style={{ color: '#64748b', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="outbox-main-pane">
        {/* TOP NAVBAR */}
        <header className="outbox-navbar">
          <div className="navbar-left">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="btn-icon-toggle"
              title="Toggle sidebar"
              type="button"
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>

            {/* Universal Search Bar */}
            <div className="search-input-wrapper" onClick={() => setSearchOpen(true)}>
              <Search size={16} className="search-input-icon" />
              <input
                type="text"
                placeholder="Search campaigns, contacts..."
                className="navbar-search-input"
                readOnly
                value={searchQuery}
              />
              <span className="search-shortcut-badge">Ctrl /</span>
            </div>
          </div>

          <div className="navbar-right">
            {/* THEME TOGGLER */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
              type="button"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* NOTIFICATION BELL */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="notification-bell-btn"
                title="Notifications"
                type="button"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="bell-badge" aria-label={`${unreadCount} unread notifications`} />}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="notifications-dropdown">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: 0
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  {activities.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No new notifications
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activities.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            if (n.campaignId) {
                              navigate(`/campaigns/${n.campaignId}`);
                            } else {
                              navigate('/monitoring');
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-card-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-card-secondary)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.title || n.subject || 'Activity'}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                              {formatTimeAgo(n.timestamp)}
                            </span>
                          </div>
                          {n.description && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* USER PROFILE PILL & DROPDOWN */}
            <div style={{ position: 'relative' }}>
              <div
                className="navbar-user-dropdown"
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                <div className="navbar-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="navbar-user-meta">
                  <span className="navbar-username">{user?.name || 'Workspace User'}</span>
                  <span className="navbar-role">{user?.role || 'Administrator'}</span>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: '4px' }} className="user-chevron" />
              </div>

              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <Settings size={15} />
                    <span>Settings & Profile</span>
                  </button>
                  <button
                    onClick={() => logout()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: 'var(--danger)',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    title="Logout"
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SEARCH MODAL */}
        {searchOpen && (
          <div
            className="search-modal-backdrop"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="search-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-card)' }}>
                <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '12px' }} />
                <input
                  type="text"
                  placeholder="Search campaigns, contacts, templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '1rem',
                    color: 'var(--text-main)'
                  }}
                />
                <button onClick={() => setSearchOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '12px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 10px', textTransform: 'uppercase' }}>
                  Quick Results
                </div>
                {filteredSearch.length > 0 ? (
                  filteredSearch.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSearchOpen(false);
                        navigate(item.path);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>{item.title}</span>
                      <span className="badge badge-completed">{item.type}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <main style={{ flex: 1 }}>
          {children}
        </main>

        {/* FOOTER */}
        <footer className="outbox-footer">
          <span>© 2026 Outbox. All rights reserved.</span>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#support">Support</a>
          </div>
        </footer>
      </div>
    </div>
  );
};
