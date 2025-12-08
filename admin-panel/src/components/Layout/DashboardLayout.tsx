/**
 * Dashboard Layout Component
 * Main layout wrapper for admin panel pages
 */

import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Package,
  FileText,
  RefreshCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/sessions', label: 'Sessions', icon: <Package size={20} /> },
  { path: '/users', label: 'Users', icon: <Users size={20} /> },
  { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { path: '/reports', label: 'Reports', icon: <FileText size={20} /> },
  { path: '/sync', label: 'Sync', icon: <RefreshCcw size={20} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const currentItem = navItems.find((item) => item.path === location.pathname);
    return currentItem?.label || 'Admin Panel';
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="logo">
            <Package size={28} />
            {sidebarOpen && <span>Stock Verify</span>}
          </h1>
          <button
            className="toggle-btn desktop-only"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
        <header className="page-header">
          <h2>{getPageTitle()}</h2>
        </header>
        <div className="page-content">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

export default DashboardLayout;
