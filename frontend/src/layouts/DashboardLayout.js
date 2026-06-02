import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { auth } from '../config/firebase';
import './DashboardLayout.css';

import Chatbot from '../components/chatbot/Chatbot';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      clearAuth();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout">

      {/* Mobile Hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h2>CONSCIA</h2>
        </div>

        <nav className="sidebar-nav-links">

          <NavLink
            to="/dashboard"
            onClick={closeSidebar}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            Product Insights
          </NavLink>

          <NavLink
            to="/reviews"
            onClick={closeSidebar}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            My Reviews
          </NavLink>

          <NavLink
            to="/about"
            onClick={closeSidebar}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            About Conscia
          </NavLink>

        </nav>

        <div
          className="sidebar-bottom"
          style={{
            marginTop: 'auto',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <NavLink
            to="/settings"
            onClick={closeSidebar}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            Account Settings
          </NavLink>

          <button
            className="sidebar-link logout-btn"
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'rgba(248, 113, 113, 0.1)',
              color: '#f87171',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '10px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
        />
      )}

      {/* Main Content */}
      <main className="dashboard-main-content">
        <Outlet />
      </main>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
};

export default DashboardLayout;