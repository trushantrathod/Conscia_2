import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import './Settings.css'; 

const Settings = () => {
  const bgCanvasRef = useRef(null);
  const cursorGlowRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.left = e.clientX + 'px';
        cursorGlowRef.current.style.top = e.clientY + 'px';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);

    const canvas = bgCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      let w, h, particles = [];

      const resize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      };
      
      const createParticles = () => {
        particles = [];
        const count = Math.floor((w * h) / 18000);
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 1.5 + 0.3,
            vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
            a: Math.random() * 0.5 + 0.1,
            color: Math.random() > 0.5 ? '110,231,247' : '167,139,250',
          });
        }
      };

      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        const blobs = [
          { x: w * 0.15, y: h * 0.2, r: 280, c: '110,231,247', a: 0.04 },
          { x: w * 0.85, y: h * 0.7, r: 320, c: '167,139,250', a: 0.04 },
          { x: w * 0.5,  y: h * 0.5, r: 200, c: '52,211,153',  a: 0.02 },
        ];
        blobs.forEach(b => {
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, `rgba(${b.c},${b.a})`);
          g.addColorStop(1, `rgba(${b.c},0)`);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        });
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color},${p.a})`;
          ctx.fill();
        });
        requestAnimationFrame(draw);
      };

      resize();
      createParticles();
      draw();
      window.addEventListener('resize', () => { resize(); createParticles(); });
    }
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (newPassword !== confirmPassword) {
      return setStatus({ type: 'error', message: 'New passwords do not match.' });
    }
    if (newPassword.length < 6) {
      return setStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
    }

    setIsUpdating(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user found.");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setStatus({ type: 'success', message: 'Password successfully updated. Your account is secure.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error) {
      console.error("Password update error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setStatus({ type: 'error', message: 'Incorrect current password.' });
      } else if (error.code === 'auth/too-many-requests') {
        setStatus({ type: 'error', message: 'Too many failed attempts. Try again later.' });
      } else {
        setStatus({ type: 'error', message: 'Failed to update password. Please try again.' });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div id="app">
      <canvas id="bg-canvas" ref={bgCanvasRef}></canvas>
      <div id="cursor-glow" ref={cursorGlowRef}></div>

      <div className="settings-container">
        <div className="settings-header">
          <div className="settings-header-icon">✦</div>
          <div className="settings-header-text">
            <h1 className="settings-title">Account Settings</h1>
            <p className="settings-subtitle">Manage your security credentials.</p>
          </div>
        </div>

        <div className="settings-grid">
          {/* Animated Password Card */}
          <div className="settings-card card-password" style={{ '--card-i': 1 }}>
            <div className="settings-card-header">
              <h2>Update Password</h2>
            </div>

            {/* ANIMATED STATUS PROMPT */}
            {status.message && (
              <div className={`settings-alert ${status.type}`}>
                <span className="settings-alert-icon">
                  {status.type === 'success' ? '✓' : '⚠'}
                </span>
                {status.message}
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="settings-form">
              <div className="form-field">
                <label>Current Password</label>
                <div className="input-wrapper">
                  <input 
                    type="password" 
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <div className="input-underline"></div>
                </div>
              </div>

              <div className="form-field">
                <label>New Password</label>
                <div className="input-wrapper">
                  <input 
                    type="password" 
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <div className="input-underline"></div>
                </div>
              </div>

              <div className="form-field">
                <label>Confirm New Password</label>
                <div className="input-wrapper">
                  <input 
                    type="password" 
                    placeholder="Type new password again"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <div className="input-underline"></div>
                </div>
              </div>

              <button type="submit" className="settings-btn btn-password" disabled={isUpdating}>
                {isUpdating ? <div className="btn-spinner"></div> : 'Save New Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;