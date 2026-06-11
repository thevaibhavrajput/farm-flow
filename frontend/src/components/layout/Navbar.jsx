import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/slices/uiSlice.js';
import { logoutUser } from '../../store/slices/authSlice.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, Sun, Moon, Bell, LogOut, User,
  ShoppingCart, Settings, ChevronRight,
  ClipboardList, MapPin, Wallet, ShieldCheck,
  Package, TrendingUp, LayoutDashboard, Store
} from 'lucide-react';
import api from '../../api/api.js';

/* ─── Profile menu items per role ─────────────────────────── */
const PROFILE_MENU = {
  supplier: [
    { icon: LayoutDashboard, label: 'Dashboard',       to: '/supplier/dashboard' },
    { icon: Settings,        label: 'Profile Settings',to: '/profile' },
    { icon: Package,         label: 'Inventory',       to: '/supplier/inventory' },
    { icon: ClipboardList,   label: 'Orders',          to: '/supplier/orders' },
    { icon: TrendingUp,      label: 'Analytics',       to: '/supplier/reports' },
   
  ],
  buyer: [
   { icon: Store,         label: 'Marketplace',     to: '/marketplace' },
  { icon: ShoppingCart,  label: 'Cart',             to: '/cart' },
  { icon: ClipboardList, label: 'Orders',           to: '/orders' },
  { icon: Settings,      label: 'Profile Settings', to: '/profile' },
  
    
  ],
};

const Navbar = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { user }   = useSelector((state) => state.auth);
  const { unreadNotificationsCount, notifications, cartCount } =
    useSelector((state) => state.ui);
  const { theme, toggleTheme } = useTheme();

  /* profile dropdown open state (custom, not Bootstrap) */
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  /* close profile dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* close on Escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setProfileOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    dispatch(logoutUser()).then(() => navigate('/login'));
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      dispatch({ type: 'ui/markAllNotificationsRead' });
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = PROFILE_MENU[user?.role] ?? PROFILE_MENU.buyer;
  const isBuyer   = user?.role !== 'supplier';
  

  return (
    <nav className="navbar-farm" role="banner">

      {/* ── Left: hamburger + brand ── */}
      <div className="navbar-left">
        {/* <button
          className="nav-icon-btn sidebar-toggle"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button> */}

        <Link to="/" className="navbar-brand-farm">
          <span className="gradient-text fw-bold" style={{ fontSize: '20px' }}>
            FarmFlow
          </span>
        </Link>
      </div>

      {/* ── Right: actions ── */}
      <div className="navbar-right">

        {/* Theme toggle */}
        <button
          className="nav-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {/* ── Role-based quick-action icons ── */}
        {isBuyer ? (
           
          /* Buyers: Cart */
           <>
           <button
          className="nav-icon-btn nav-icon-btn--labeled"
          onClick={() => navigate('/marketplace')}
          aria-label="Marketplace"
          title="Marketplace"
        >
          <Store size={19} />
          <span className="nav-icon-label">Marketplace</span>
        </button>
           <button
          className="nav-icon-btn position-relative"
          onClick={() => navigate('/cart')}
          aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
          title="Cart"
        >
          <ShoppingCart size={19} />
          
          {cartCount > 0 && (
            <span className="notif-badge">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
          <button
          className="nav-icon-btn nav-icon-btn--labeled"
          onClick={() => navigate('/orders')}
          aria-label="Orders"
          title="Orders"
        >
          <ClipboardList size={19} />
          <span className="nav-icon-label">Orders</span>
        </button>
        </>
        ) : (
          /* Suppliers: Inventory + Orders */
          <>
            <button
              className="nav-icon-btn nav-icon-btn--labeled"
              onClick={() => navigate('/supplier/inventory')}
              aria-label="Inventory"
              title="Inventory"
            >
              <Package size={19} />
              <span className="nav-icon-label">Inventory</span>
            </button>
            <button
              className="nav-icon-btn nav-icon-btn--labeled"
              onClick={() => navigate('/supplier/orders')}
              aria-label="Orders"
              title="Orders"
            >
              <ClipboardList size={19} />
              <span className="nav-icon-label">Orders</span>
            </button>
          </>
        )}

        {/* Notifications */}
        <div className="dropdown">
          <button
            className="nav-icon-btn position-relative"
            type="button"
            id="notificationsDropdown"
            data-bs-toggle="dropdown"
            data-bs-auto-close="outside"
            aria-expanded="false"
            aria-label={`Notifications${unreadNotificationsCount > 0 ? `, ${unreadNotificationsCount} unread` : ''}`}
          >
            <Bell size={19} />
            {unreadNotificationsCount > 0 && (
              <span className="notif-badge">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <div
            className="dropdown-menu dropdown-menu-end card-farm p-0 border-0"
            style={{ width: 'min(320px, 92vw)', minWidth: '260px' }}
            aria-labelledby="notificationsDropdown"
          >
            <div
              className="d-flex justify-content-between align-items-center px-3 py-2"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <span className="fw-bold" style={{ fontSize: '14px' }}>Notifications</span>
              {unreadNotificationsCount > 0 && (
                <button
                  className="btn btn-link text-success text-decoration-none p-0"
                  style={{ fontSize: '12px', fontWeight: 600 }}
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p className="text-center text-muted py-4 mb-0" style={{ fontSize: '13px' }}>
                  No notifications yet
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`px-3 py-2 ${n.status.isRead ? '' : 'notif-unread'}`}
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <div className="fw-semibold text-success" style={{ fontSize: '13px', lineHeight: 1.3 }}>
                      {n.title}
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Profile Dropdown (Blinkit-style) ── */}
        <div className="profile-dropdown-wrap" ref={profileRef}>

          {/* Trigger pill */}
          <button
            className="user-pill"
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={profileOpen}
            aria-label="Account menu"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.fullName || 'User avatar'}
                className="user-avatar"
              />
            ) : (
              <div className="user-avatar-placeholder gradient-bg">
                {user?.firstName?.charAt(0)?.toUpperCase() ?? <User size={16} />}
              </div>
            )}
            <div className="user-info d-none d-sm-block">
              <div className="user-name">{user?.fullName}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </button>

          {/* Dropdown panel */}
          {profileOpen && (
            <div className="profile-dropdown-menu" role="menu">

              {/* User summary header */}
              <div className="profile-dropdown-header">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="pd-avatar" />
                ) : (
                  <div className="pd-avatar pd-avatar--placeholder gradient-bg">
                    {user?.firstName?.charAt(0)?.toUpperCase() ?? <User size={18} />}
                  </div>
                )}
                <div className="pd-user-info">
                  <div className="pd-user-name">{user?.fullName}</div>
                  <div className="pd-user-sub">{user?.email || user?.phone}</div>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              {/* Menu items */}
              <nav className="pd-nav">
                {menuItems.map(({ icon: Icon, label, to }) => (
                  <button
                    key={to}
                    className="pd-item"
                    role="menuitem"
                    onClick={() => { setProfileOpen(false); navigate(to); }}
                  >
                    <span className="pd-item-icon">
                      <Icon size={18} />
                    </span>
                    <span className="pd-item-label">{label}</span>
                    <ChevronRight size={15} className="pd-item-arrow" />
                  </button>
                ))}
              </nav>

              <div className="profile-dropdown-divider" />

              {/* Logout */}
              <button className="pd-logout" role="menuitem" onClick={handleLogout}>
                <LogOut size={17} />
                Log Out
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
