import React, { useEffect, useRef } from 'react';
import './UserDashboard.css'; 

const About = () => {
  const bgCanvasRef = useRef(null);
  const cursorGlowRef = useRef(null);

  // Background Canvas Animation (Keeps the theme consistent)
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

  return (
    <div id="app">
      <canvas id="bg-canvas" ref={bgCanvasRef}></canvas>
      <div id="cursor-glow" ref={cursorGlowRef}></div>

      <header className="dashboard-header">
        <div className="header-inner">
          <div className="header-left">
            <div className="logo-mark">
              <svg viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="url(#lg1)" strokeWidth="2"/>
                <path d="M12 20 L20 12 L28 20 L20 28 Z" fill="url(#lg2)"/>
                <defs>
                  <linearGradient id="lg1" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#6ee7f7"/>
                    <stop offset="100%" stopColor="#a78bfa"/>
                  </linearGradient>
                  <linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#6ee7f7"/>
                    <stop offset="100%" stopColor="#a78bfa"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="dashboard-title">
                <span className="title-word" style={{ '--i': 0 }}>About</span>
                <span className="title-word accent" style={{ '--i': 1 }}>Conscia</span>
              </h1>
              <p className="dashboard-subtitle">Bridging the intention-action gap in e-commerce.</p>
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: '2rem 5%', maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        {/* EXPLANATION SECTION */}
        <div className="impact-breakdown-card" style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '2.5rem', marginBottom: '3rem' }}>
          <p style={{ color: '#e2e8f0', lineHeight: '1.8', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            The modern digital marketplace has witnessed a massive shift toward ethical consumerism, yet shoppers face a significant "intention-action gap." Conscia was developed to bridge this divide by providing transparent, real-time insights into the true social and environmental impact of everyday products.
          </p>
          <p style={{ color: '#e2e8f0', lineHeight: '1.8', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            To combat the prevalence of "greenwashing," our platform analyzes unstructured user-generated reviews rather than relying on static, often outdated corporate certifications. By utilizing a Teacher-Student neural network architecture, Conscia assigns dynamic ethical scores across four key pillars: Environmental Impact, Labor Rights, Animal Welfare, and Corporate Governance.
          </p>
          <p style={{ color: '#e2e8f0', lineHeight: '1.8', fontSize: '1.1rem', margin: 0 }}>
            To ensure complete transparency, the system integrates Explainable AI (LIME) to highlight the specific linguistic markers that influenced each score. This data is then synthesized by generative AI models into accessible, natural-language narratives, empowering consumers to make informed, values-aligned purchasing decisions.
          </p>
        </div>

        {/* TEAM SECTION */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h3 className="section-label" style={{ marginBottom: '1.5rem', fontSize: '0.9rem', letterSpacing: '2px' }}>RESEARCH TEAM</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            {['Trushant Rathod', 'Shreya Chaudhari', 'Kartik Rathod', 'Rohit Pawar'].map(name => (
              <div key={name} style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '8px', 
                color: '#cbd5e1', 
                fontSize: '1rem',
                fontFamily: 'DM Sans, sans-serif'
              }}>
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* IEEE LINK SECTION */}
        <div style={{ textAlign: 'center', paddingBottom: '4rem' }}>
          <span className="modal-cat-badge" style={{ marginBottom: '1rem', display: 'inline-block', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
            IEEE Published Research
          </span>
          <br/>
          <a 
            href="https://doi.org/10.1109/IC3ET64989.2026.11467486" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ieee-link-btn"
            style={{ marginTop: '1.5rem' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Read the Official IEEE Paper
          </a>
        </div>

      </main>
    </div>
  );
};

export default About;