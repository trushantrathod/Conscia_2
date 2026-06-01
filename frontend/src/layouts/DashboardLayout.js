import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { auth } from '../config/firebase';
import './DashboardLayout.css'; 

// 🚨 THE FIX: Added the 'chatbot/' subfolder to the path
import Chatbot from '../components/chatbot/Chatbot';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      clearAuth();
      navigate('/auth');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <h2>CONSCIA</h2>
        </div>

        <nav className="sidebar-nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            Product Insights
          </NavLink>
          <NavLink to="/reviews" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            My Reviews
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            About Conscia
          </NavLink>
        </nav>

        {/* PINNED TO BOTTOM LEFT */}
        <div className="sidebar-bottom" style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          <NavLink 
            to="/settings" 
            className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
          >
            Account Settings
          </NavLink>
          
          {/* HARDCODED LOG OUT BUTTON */}
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
            <span style={{ fontSize: '1.1rem' }}></span> Log Out
          </button>
          
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────
          MAIN CONTENT AREA (Where your pages render)
          ────────────────────────────────────────────────────────── */}
      <main className="dashboard-main-content">
        <Outlet />
      </main>
      
      {/* THE CONSCIA ASSISTANT */}
      <Chatbot />
    </div>
  );
};

export default DashboardLayout;