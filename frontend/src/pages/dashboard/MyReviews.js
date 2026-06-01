import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/axiosConfig';
import './UserDashboard.css'; 

const MyReviews = () => {
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // MODAL STATES
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedProductData, setSelectedProductData] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  
  // COMPOSE REVIEW STATES
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newReviewText, setNewReviewText] = useState('');

  // ANIMATION REFS
  const bgCanvasRef = useRef(null);
  const cursorGlowRef = useRef(null);
  const radarCanvasRef = useRef(null);

  // Helpers for visuals
  const getScoreClass = (s) => s >= 70 ? 'high' : s >= 40 ? 'mid' : 'low';
  const getBarColor = (s) => s >= 70 ? '#34d399' : s >= 40 ? '#fbbf24' : '#f87171';
  const getParsedReviews = (str) => str ? str.split('|').map(r => r.trim()).filter(r => r.length > 0) : [];

  // Background Canvas Animation
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

  // Fetch the user's review history
  const fetchMyReviews = async () => {
    try {
      const { data } = await apiClient.get(`/products/my-reviews?t=${Date.now()}`);
      setMyReviews(data);
    } catch (error) {
      console.error("Failed to fetch personal reviews", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReviews();
  }, []);

  // Radar Chart Animation
  useEffect(() => {
    if (selectedProductData && radarCanvasRef.current) {
      const canvas = radarCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2 + 8;
      const R = Math.min(W, H) * 0.36;

      const axes = [
        { label: 'Environment', val: selectedProductData.environmental_impact || 0, color: '#34d399' },
        { label: 'Labor', val: selectedProductData.labor_rights || 0, color: '#6ee7f7' },
        { label: 'Animal', val: selectedProductData.animal_welfare || 0, color: '#a78bfa' },
        { label: 'Governance', val: selectedProductData.corporate_governance || 0, color: '#fbbf24' },
        { label: 'Sentiment', val: selectedProductData.public_sentiment_score || 0, color: '#f87171' },
      ];

      const n = axes.length;
      const angleStep = (Math.PI * 2) / n;
      const offset = -Math.PI / 2;
      let progress = 0;
      let animationFrameId;

      const animateRadar = () => {
        progress = Math.min(progress + 0.06, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        ctx.clearRect(0, 0, W, H);

        for (let ring = 1; ring <= 4; ring++) {
          const rr = (ring / 4) * R;
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const a = offset + i * angleStep;
            ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(255,255,255,0.06)';
          ctx.stroke();
        }

        for (let i = 0; i < n; i++) {
          const a = offset + i * angleStep;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.stroke();
        }

        ctx.beginPath();
        const points = axes.map((ax, i) => {
          const a = offset + i * angleStep;
          const r = (ax.val / 100) * R * ease;
          return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
        });
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        grad.addColorStop(0, 'rgba(110,231,247,0.35)');
        grad.addColorStop(1, 'rgba(167,139,250,0.15)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(110,231,247,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        points.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = axes[i].color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(6,8,15,0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        ctx.font = '600 11px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        axes.forEach((ax, i) => {
          const a = offset + i * angleStep;
          const lx = cx + (R + 22) * Math.cos(a);
          const ly = cy + (R + 22) * Math.sin(a);
          ctx.fillStyle = 'rgba(148,163,184,0.85)';
          ctx.fillText(ax.label, lx, ly + 4);
        });

        if (progress < 1) animationFrameId = requestAnimationFrame(animateRadar);
      };
      animateRadar();
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [selectedProductData]);

  const formatDate = (isoString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(isoString).toLocaleDateString(undefined, options);
  };

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const my = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    card.style.setProperty('--mx', mx + '%');
    card.style.setProperty('--my', my + '%');
  };

  // FETCH LIVE PRODUCT DATA WHEN REVIEW IS CLICKED
  const handleReviewClick = async (review) => {
    setSelectedReview(review);
    setSelectedProductData(null);
    setIsModalLoading(true);
    try {
      const { data } = await apiClient.get(`/products/${review.productId}`);
      setSelectedProductData(data);
    } catch (error) {
      console.error("Failed to load full product data", error);
    } finally {
      setIsModalLoading(false);
    }
  };

  // SUBMIT A NEW REVIEW DIRECTLY FROM THE MODAL
  const submitNewReview = async () => {
    if (!newReviewText.trim()) return;
    
    try {
      const response = await apiClient.post(`/products/${selectedProductData.product_id}/reviews`, { 
        reviewText: newReviewText 
      });

      const { newScore, reviews } = response.data;

      // 1. Instantly update the modal's score and reviews list
      setSelectedProductData(prev => ({
        ...prev,
        reviews: reviews,
        public_sentiment_score: newScore
      }));

      // 2. Silently re-fetch the user's ledger so the background list is updated
      fetchMyReviews();

      // 3. Close compose box and clear text
      setIsComposeOpen(false);
      setNewReviewText('');
    } catch (error) {
      console.error("Failed to submit review", error);
      alert("Failed to save your review. Please try again.");
    }
  };

  return (
    <div id="app">
      <canvas id="bg-canvas" ref={bgCanvasRef}></canvas>
<     div id="cursor-glow" ref={cursorGlowRef}></div>

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
                <span className="title-word" style={{ '--i': 0 }}>My</span>
                <span className="title-word accent" style={{ '--i': 1 }}>Impact</span>
              </h1>
              <p className="dashboard-subtitle">A historical ledger of your ethical contributions.</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-pill" style={{ '--i': 0 }}>
              <span className="stat-num">{myReviews.length}</span>
              <span className="stat-lbl">Reviews</span>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">
          <div className="loader-orbs">
            <div className="orb" style={{ '--d': '0s' }}></div>
            <div className="orb" style={{ '--d': '.15s' }}></div>
            <div className="orb" style={{ '--d': '.3s' }}></div>
          </div>
          <p className="loading-text">Loading your ledger...</p>
        </div>
      ) : (
        <main className="product-grid list-view">
          {myReviews.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>You haven't written any reviews yet. Go shape some scores!</p>
            </div>
          ) : (
            myReviews.map((review, i) => {
              const impact = review.sentimentImpact || 0;
              const isPositive = impact >= 0;
              
              return (
                <div 
                  key={review.id} 
                  className="product-card history-card clickable-history-card"
                  style={{ '--card-i': i }}
                  onMouseMove={handleCardMouseMove}
                  onClick={() => handleReviewClick(review)} 
                >
                  <div className="history-header">
                    <div className="history-meta">
                      <span className="product-category">{review.category}</span>
                      <h3 className="history-product-name">{review.productName}</h3>
                      <span className="history-date">{formatDate(review.createdAt)}</span>
                    </div>
                    
                    <div className={`impact-badge ${isPositive ? 'positive' : 'negative'}`}>
                      <span className="impact-val">
                        {isPositive ? '+' : ''}{impact.toFixed(1)}
                      </span>
                      <span className="impact-lbl">Score Impact</span>
                    </div>
                  </div>

                  <div className="history-review-bubble">
                    <div className="bubble-quote">"</div>
                    <p>{review.reviewText}</p>
                  </div>
                </div>
              );
            })
          )}
        </main>
      )}

      {/* COMBINED IMPACT & PRODUCT MODAL */}
      {selectedReview && (
        <div className="modal-overlay" onClick={() => setSelectedReview(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedReview(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <div className="modal-glow-ring"></div>
            
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="modal-title-area">
                <h2>{selectedReview.productName}</h2>
                <span className="modal-cat-badge">{selectedReview.category}</span>
              </div>
              
              <div className="modal-price-area" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {isModalLoading ? (
                  <div className="spinner-ring" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
                ) : selectedProductData && (
                  <div className="modal-score-ring">
                    <svg viewBox="0 0 80 80" className="ring-svg">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="6"/>
                      <circle cx="40" cy="40" r="32" fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray="201" strokeDashoffset={201 - (selectedProductData.public_sentiment_score / 100) * 201} stroke={getBarColor(selectedProductData.public_sentiment_score)} transform="rotate(-90 40 40)"/>
                    </svg>
                    <div className="ring-label">
                      <span className={`ring-score ${getScoreClass(selectedProductData.public_sentiment_score)}`}>{Math.round(selectedProductData.public_sentiment_score)}</span>
                      <span className="ring-sub">Global</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-body scrollable-body">
              {/* SECTION: YOUR SPECIFIC REVIEW IMPACT */}
              <div className="modal-radar-section" style={{ marginBottom: '2rem' }}>
                <h3 className="section-label">Your Initial Contribution</h3>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                   <div className={`impact-badge ${selectedReview.sentimentImpact >= 0 ? 'positive' : 'negative'}`} style={{ padding: '0.4rem 1rem', minWidth: 'auto' }}>
                    <span className="impact-val" style={{ fontSize: '1.2rem' }}>
                      {selectedReview.sentimentImpact >= 0 ? '+' : ''}{selectedReview.sentimentImpact.toFixed(1)}
                    </span>
                    <span className="impact-lbl" style={{ fontSize: '0.65rem' }}>Score Shift</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Recorded on {formatDate(selectedReview.createdAt)}</span>
                </div>

                <div className="history-review-bubble" style={{ width: '100%', borderRadius: '12px', borderLeft: selectedReview.sentimentImpact >= 0 ? '3px solid rgba(52, 211, 153, 0.6)' : '3px solid rgba(248, 113, 113, 0.6)' }}>
                  <div className="bubble-quote" style={{ fontSize: '6rem', top: '-15px' }}>"</div>
                  <p style={{ fontSize: '1.1rem', padding: '0.5rem 0' }}>{selectedReview.reviewText}</p>
                </div>
              </div>

              {/* SECTION: RADAR CHART */}
              <div className="modal-radar-section" style={{ marginBottom: '2rem' }}>
                <h3 className="section-label">Current Ethical Breakdown</h3>
                {isModalLoading ? (
                  <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
                    <div className="loader-orbs"><div className="orb" style={{ '--d': '0s' }}></div><div className="orb" style={{ '--d': '.15s' }}></div><div className="orb" style={{ '--d': '.3s' }}></div></div>
                  </div>
                ) : selectedProductData && (
                  <div className="radar-wrap">
                    <canvas ref={radarCanvasRef} width="280" height="260"></canvas>
                    <div className="radar-legend">
                      {[
                        { label: 'Environment', val: selectedProductData.environmental_impact, color: '#34d399' },
                        { label: 'Labor', val: selectedProductData.labor_rights, color: '#6ee7f7' },
                        { label: 'Animal', val: selectedProductData.animal_welfare, color: '#a78bfa' },
                        { label: 'Governance', val: selectedProductData.corporate_governance, color: '#fbbf24' },
                        { label: 'Sentiment', val: selectedProductData.public_sentiment_score, color: '#f87171' },
                      ].map(ax => (
                        <div key={ax.label} className="legend-item">
                          <div className="legend-dot" style={{ background: ax.color }}></div>
                          <span className="legend-name">{ax.label}</span>
                          <span className="legend-val" style={{ color: getBarColor(ax.val) }}>{Math.round(ax.val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: COMMUNITY REVIEWS (WITH YOURS HIGHLIGHTED) */}
              <div className="modal-reviews-section">
                <h3 className="section-label">All Community Reviews</h3>
                
                <div className="reviews-list">
                  {isModalLoading ? (
                    <div style={{ padding: '1rem', color: '#94a3b8' }}>Loading reviews...</div>
                  ) : selectedProductData && getParsedReviews(selectedProductData.reviews).length === 0 ? (
                    <div className="empty-reviews-msg">No reviews yet.</div>
                  ) : (
                    selectedProductData && getParsedReviews(selectedProductData.reviews).map((r, i) => {
                      // Check if this review matches the one the user wrote
                      const isMyReview = r === selectedReview.reviewText;
                      
                      return (
                        <div key={i} className={`review-item ${isMyReview ? 'highlighted-community-review' : ''}`} style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                          <div className="review-avatar" style={{ background: isMyReview ? 'rgba(167, 139, 250, 0.2)' : '' }}>
                            {isMyReview ? 'Me' : String.fromCharCode(65 + (i % 26))}
                          </div>
                          <p className="review-text">{r}</p>
                          {isMyReview && <span className="my-review-tag">Your Review</span>}
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* WRITE A NEW REVIEW BUTTON */}
                <button className="add-review-btn" onClick={() => setIsComposeOpen(true)} style={{ marginTop: '1.5rem' }}>
                  <span>✦</span> Add Another Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW COMPOSE MODAL (Triggered from inside the detail modal) */}
      {isComposeOpen && selectedProductData && (
        <div className="review-modal" style={{ zIndex: 100000 }}>
          <div className="review-modal-box">
            <h3>Add to Your Impact</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Write another review for <strong>{selectedProductData.product_name}</strong>.
            </p>
            <textarea 
              id="review-textarea" 
              placeholder="What else would you like to say about this product?"
              value={newReviewText}
              onChange={(e) => setNewReviewText(e.target.value)}
            ></textarea>
            <div className="review-modal-actions">
              <button className="btn-secondary" onClick={() => setIsComposeOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={submitNewReview}>Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyReviews;