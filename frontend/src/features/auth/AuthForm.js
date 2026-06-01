import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // <-- Added signOut
import { useAuthStore } from '../../store/authStore'; // <-- Added global state monitor
import './AuthForm.css';

const AuthForm = () => {
  const navigate = useNavigate();
  const { isAuthenticated, dbUser } = useAuthStore(); // Listen to global state instead of a blind timer

  const bgCanvasRef = useRef(null);
  const cursorGlowRef = useRef(null);

  // UI States
  const [isAuthVisible, setIsAuthVisible] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); // <-- New success message state
  const [isLoading, setIsLoading] = useState(false);

  // THE FIX: Automatically navigate ONLY when the database sync is fully complete
  useEffect(() => {
    if (isAuthenticated && dbUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, dbUser, navigate]);

  // Background Canvas Animation (Deep Space Theme)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // STANDARD LOGIN
        await signInWithEmailAndPassword(auth, email, password);
        // Notice we DO NOT navigate here. The useEffect above handles it perfectly once sync completes.
      } else {
        // ACCOUNT CREATION
        await createUserWithEmailAndPassword(auth, email, password);
        
        // Firebase auto-logs the user in after creation. 
        // We sign them out silently so they are forced to log in manually.
        await signOut(auth);
        
        setSuccessMsg('Account created successfully! Please log in.');
        setIsLogin(true); // Flip UI back to Login tab
        setPassword('');  // Clear password field for security
        setIsLoading(false); // Stop the spinner
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message.replace('Firebase: ', ''));
      setIsLoading(false); 
    }
  };

  return (
    <div id="landing-app">
      <canvas id="bg-canvas" ref={bgCanvasRef}></canvas>
      <div id="cursor-glow" ref={cursorGlowRef}></div>

      <nav className="landing-nav">
        <div className="nav-brand">CONSCIA</div>
        {!isAuthVisible && (
          <button className="nav-login-btn" onClick={() => setIsAuthVisible(true)}>
            Login
          </button>
        )}
      </nav>

      <main className="landing-main">
        {!isAuthVisible ? (
          <div className="hero-section">
            <div className="hero-badge">AI Powered Ethical Shopping Companion</div>
            <h1 className="hero-title">
              Ethical transparency <br/>
              <span className="hero-accent">before you buy.</span>
            </h1>
            <p className="hero-description">
              Bridge the intention-action gap in e-commerce. Conscia utilizes a Teacher-Student neural network and Explainable AI (LIME) to analyze real-time consumer reviews, exposing greenwashing and delivering transparent scores across Environmental Impact, Labor Rights, Animal Welfare, and Corporate Governance.
            </p>
            <div className="hero-actions">
              <button className="btn-primary-large" onClick={() => setIsAuthVisible(true)}>
                Access Dashboard <span className="arrow">→</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-section">
            <div className="auth-card">
              <button className="back-btn" onClick={() => { setIsAuthVisible(false); setError(''); setSuccessMsg(''); }}>
                  ← Back
              </button>
              
              <div className="auth-header">
                <h2>{isLogin ? 'Login' : 'Create an account'}</h2>
                <p>{isLogin ? 'Welcome back to Conscia' : 'Join us and start tracking'}</p>
              </div>

              {/* Success & Error Messages */}
              {successMsg && (
                <div style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: '500' }}>
                  {successMsg}
                </div>
              )}
              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label>Email address</label>
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>

                <button type="submit" className="auth-submit-btn" style={{ minHeight: '52px' }} disabled={isLoading}>
                  {isLoading ? <div className="btn-spinner"></div> : (isLogin ? 'Login' : 'Create')}
                </button>
              </form>

              <div className="auth-toggle">
                {isLogin ? "Need to create an account? " : "Already have an account? "}
                <button 
                  className="toggle-btn" 
                  onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
                >
                  {isLogin ? 'Create an account' : 'Login'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AuthForm;