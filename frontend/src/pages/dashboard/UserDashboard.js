import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../../api/axiosConfig';
import './UserDashboard.css';

const UserDashboard = () => {
  // --- Global State ---
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('Beauty'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false); 
  const [viewMode] = useState('grid');
  
  // --- Pagination State ---
  const [lastVisible] = useState(null); 
  const lastVisibleRef = useRef(null); 
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadTrigger, setLoadTrigger] = useState(0); 

  // --- Modal & Interaction State ---
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');

  // --- AI Ethical Snapshot State ---
  const [snapshotText, setSnapshotText] = useState(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);

  // --- Refs for Canvas & Animation ---
  const bgCanvasRef = useRef(null);
  const radarCanvasRef = useRef(null);
  const cursorGlowRef = useRef(null);

  // Reset snapshot data when a new product is clicked
  useEffect(() => {
    setSnapshotText(null);
    setIsSnapshotLoading(false);
  }, [selectedProduct]);

  // Fetch Ethical Snapshot via Backend (Gemini Integration)
  const fetchEthicalSnapshot = async () => {
    if (!selectedProduct) return;
    setIsSnapshotLoading(true);
    setSnapshotText(null);
    try {
      const response = await apiClient.get(`/products/${selectedProduct.product_id}/ethical-snapshot`);
      setSnapshotText(response.data.snapshot);
    } catch (error) {
      console.error("Error fetching AI snapshot:", error);
      setSnapshotText("Our AI assistant is currently experiencing high demand. Please try generating the snapshot again in a moment.");
    } finally {
      setIsSnapshotLoading(false);
    }
  };

  // --- Background Canvas Animation Logic ---
  useEffect(() => {
    // Mouse Glow Follower
    const handleMouseMove = (e) => {
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.left = e.clientX + 'px';
        cursorGlowRef.current.style.top = e.clientY + 'px';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);

    // Particle System
    const canvas = bgCanvasRef.current;
    let animationId;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      let w, h, particles = [];

      const resize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      };
      
      const createParticles = () => {
        particles = [];
        const count = Math.floor((w * h) / 18000); // Dynamic particle density
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
        
        // Ambient background gradient blobs
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
        
        // Update and draw particles
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color},${p.a})`;
          ctx.fill();
        });
        animationId = requestAnimationFrame(draw);
      };

      resize();
      createParticles();
      draw();
      window.addEventListener('resize', () => { resize(); createParticles(); });
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  // --- API Fetching Logic ---
  const fetchProducts = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoadingInitial(true);
      else setLoadingMore(true);

      let url = `/products?limit=50&category=${category.trim()}`;
      if (!isInitialLoad && lastVisibleRef.current) {
        url += `&cursor=${lastVisibleRef.current}`;
      }

      const { data } = await apiClient.get(url);
      
      setProducts(prev => {
        if (isInitialLoad) return data.products;
        // Deduplicate logic just in case Firebase shifts documents
        const existingIds = new Set(prev.map(p => p.product_id));
        const newProducts = data.products.filter(p => !existingIds.has(p.product_id));
        return [...prev, ...newProducts];
      });
      
      setLastVisible(data.lastVisible);
      lastVisibleRef.current = data.lastVisible;
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('❌ Error fetching products', error);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };

  // Handle Category Change
  useEffect(() => {
    setSearchTerm('');
    setIsSearching(false);
    setProducts([]);
    setLastVisible(null);
    lastVisibleRef.current = null;
    setHasMore(true);
    setLoadTrigger(0);
    fetchProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Handle Debounced Global Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchTerm.trim()) {
        if (isSearching) {
          setIsSearching(false);
          setProducts([]);
          lastVisibleRef.current = null;
          setHasMore(true);
          fetchProducts(true);
        }
        return;
      }

      setIsSearching(true);
      setLoadingInitial(true);
      try {
        const { data } = await apiClient.get(`/products/search?q=${searchTerm}`);
        setProducts(data);
        setHasMore(false); // Stop pagination during search
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setLoadingInitial(false);
      }
    }, 500); // 500ms delay to prevent API spam

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); 

  // Handle Infinite Scroll Trigger
  useEffect(() => {
    if (loadTrigger > 0 && !isSearching) {
      fetchProducts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTrigger]);

  // Intersection Observer setup for last product card
  const observer = useRef();
  const lastProductElementRef = useCallback((node) => {
    if (loadingInitial || loadingMore || isSearching) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setLoadTrigger(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore, isSearching]);

  // --- Modal Radar Chart Logic ---
  useEffect(() => {
    if (selectedProduct && radarCanvasRef.current) {
      const canvas = radarCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2 + 8;
      const R = Math.min(W, H) * 0.36;

      const axes = [
        { label: 'Environment', val: selectedProduct.environmental_impact || 0, color: '#34d399' },
        { label: 'Labor', val: selectedProduct.labor_rights || 0, color: '#6ee7f7' },
        { label: 'Animal', val: selectedProduct.animal_welfare || 0, color: '#a78bfa' },
        { label: 'Governance', val: selectedProduct.corporate_governance || 0, color: '#fbbf24' },
        { label: 'Sentiment', val: selectedProduct.public_sentiment_score || 0, color: '#f87171' },
      ];

      const n = axes.length;
      const angleStep = (Math.PI * 2) / n;
      const offset = -Math.PI / 2; // Start at 12 o'clock
      let progress = 0;
      let animationFrameId;

      const animateRadar = () => {
        progress = Math.min(progress + 0.05, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        ctx.clearRect(0, 0, W, H);

        // Draw Web Background
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

        // Draw Axes Lines
        for (let i = 0; i < n; i++) {
          const a = offset + i * angleStep;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.stroke();
        }

        // Draw Data Shape
        ctx.beginPath();
        const points = axes.map((ax, i) => {
          const a = offset + i * angleStep;
          const r = (ax.val / 100) * R * ease;
          return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
        });
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();

        // Fill Data Shape
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        grad.addColorStop(0, 'rgba(110,231,247,0.35)');
        grad.addColorStop(1, 'rgba(167,139,250,0.15)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(110,231,247,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Data Points
        points.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = axes[i].color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(6,8,15,0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        // Draw Labels
        ctx.font = '500 11px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        axes.forEach((ax, i) => {
          const a = offset + i * angleStep;
          const lx = cx + (R + 24) * Math.cos(a);
          const ly = cy + (R + 24) * Math.sin(a);
          ctx.fillStyle = 'rgba(148,163,184,0.9)';
          ctx.fillText(ax.label, lx, ly + 4);
        });

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animateRadar);
        }
      };
      
      animateRadar();
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [selectedProduct]);

  // --- Utility Functions ---
  const getScoreClass = (s) => s >= 70 ? 'high' : s >= 40 ? 'mid' : 'low';
  const getBarColor = (s) => s >= 70 ? '#34d399' : s >= 40 ? '#fbbf24' : '#f87171';
  const getParsedReviews = (str) => str ? str.split('|').map(r => r.trim()).filter(r => r.length > 0) : [];
  
  // Custom Card Hover Logic
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const my = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    card.style.setProperty('--mx', mx + '%');
    card.style.setProperty('--my', my + '%');
  };

  return (
    <div id="app">
      {/* Background Ambience */}
      <canvas id="bg-canvas" ref={bgCanvasRef}></canvas>
      <div id="cursor-glow" ref={cursorGlowRef}></div>

      {/* Header */}
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
                <span className="title-word" style={{ '--i': 0 }}>Product</span>
                <span className="title-word accent" style={{ '--i': 1 }}>Insights</span>
              </h1>
              <p className="dashboard-subtitle">Ethical transparency — before you buy.</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-pill" style={{ '--i': 0 }}>
              <span className="stat-num">{products.length}</span>
              <span className="stat-lbl">Loaded</span>
            </div>
          </div>
        </div>
      </header>

      {/* Control Bar */}
      <div className="controls-bar">
        <div className="search-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search products..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-tabs">
          {['Beauty', 'Fashion', 'Groceries', 'Electronics'].map(cat => (
            <button 
              key={cat}
              className={`cat-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              <span className="tab-icon">✦</span> {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loadingInitial ? (
        <div className="loading-state">
          <div className="loader-orbs">
            <div className="orb" style={{ '--d': '0s' }}></div>
            <div className="orb" style={{ '--d': '.15s' }}></div>
            <div className="orb" style={{ '--d': '.3s' }}></div>
          </div>
          <p className="loading-text">Fetching insights...</p>
        </div>
      ) : (
        <main className={`product-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◌</div>
              <p>No products match your search.</p>
            </div>
          ) : (
            products.map((p, i) => {
              const isLast = products.length === i + 1;
              return (
                <div 
                  key={p.product_id}
                  ref={isLast ? lastProductElementRef : null}
                  className="product-card"
                  style={{ '--card-i': i }}
                  onMouseMove={handleCardMouseMove}
                  onClick={() => setSelectedProduct(p)}
                >
                  <div className="card-header">
                    <div>
                      <h3 className="product-name">{p.product_name}</h3>
                      <span className="product-category">{p.category}</span>
                    </div>
                    <div className="sentiment-badge">
                      <span className={`score-number ${getScoreClass(p.public_sentiment_score)}`}>{Math.round(p.public_sentiment_score)}</span>
                      <span className="score-label">Sentiment</span>
                    </div>
                  </div>
                  <div className="metrics-container">
                    {[
                      { label: 'Environment', val: p.environmental_impact },
                      { label: 'Labor Rights', val: p.labor_rights },
                      { label: 'Animal Welfare', val: p.animal_welfare }
                    ].map(m => (
                      <div key={m.label} className="metric-row">
                        <span className="metric-label">{m.label}</span>
                        <div className="bar-bg">
                          <div className="bar-fill" style={{ width: `${m.val}%`, backgroundColor: getBarColor(m.val) }}></div>
                        </div>
                        <span className="metric-value">{Math.round(m.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </main>
      )}

      {loadingMore && <div className="loading-more"><div className="spinner-ring"></div></div>}

      {/* --- MASTER DETAIL MODAL --- */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <div className="modal-glow-ring"></div>
            
            <div className="modal-header">
              <div className="modal-title-area">
                <h2>{selectedProduct.product_name}</h2>
                <span className="modal-cat-badge">{selectedProduct.category}</span>
              </div>
              <div className="modal-price-area">
                {selectedProduct.product_price && <span className="modal-price">${selectedProduct.product_price.toFixed(2)}</span>}
                <div className="modal-score-ring">
                  <svg viewBox="0 0 80 80" className="ring-svg">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="6"/>
                    <circle cx="40" cy="40" r="32" fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray="201" strokeDashoffset={201 - (selectedProduct.public_sentiment_score / 100) * 201} stroke={getBarColor(selectedProduct.public_sentiment_score)} transform="rotate(-90 40 40)"/>
                  </svg>
                  <div className="ring-label">
                    <span className={`ring-score ${getScoreClass(selectedProduct.public_sentiment_score)}`}>{Math.round(selectedProduct.public_sentiment_score)}</span>
                    <span className="ring-sub">score</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-body scrollable-body">
              
              {/* TOP: Split Grid Layout */}
              <div className="modal-split-layout">
                
                {/* LEFT: Radar Chart */}
                <div className="modal-radar-section">
                  <h3 className="section-label">Ethical Breakdown</h3>
                  <div className="radar-wrap">
                    <canvas ref={radarCanvasRef} width="280" height="260"></canvas>
                    <div className="radar-legend">
                      {[
                        { label: 'Environment', val: selectedProduct.environmental_impact, color: '#34d399' },
                        { label: 'Labor', val: selectedProduct.labor_rights, color: '#6ee7f7' },
                        { label: 'Animal', val: selectedProduct.animal_welfare, color: '#a78bfa' },
                        { label: 'Governance', val: selectedProduct.corporate_governance, color: '#fbbf24' },
                        { label: 'Sentiment', val: selectedProduct.public_sentiment_score, color: '#f87171' },
                      ].map(ax => (
                        <div key={ax.label} className="legend-item">
                          <div className="legend-dot" style={{ background: ax.color }}></div>
                          <span className="legend-name">{ax.label}</span>
                          <span className="legend-val" style={{ color: getBarColor(ax.val) }}>{Math.round(ax.val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Community Reviews */}
                <div className="modal-reviews-section">
                  <h3 className="section-label">Community Reviews</h3>
                  <div className="reviews-list">
                    {getParsedReviews(selectedProduct.reviews).length === 0 ? (
                      <div className="empty-reviews-msg">No reviews yet. Be the first to share your thoughts!</div>
                    ) : (
                      getParsedReviews(selectedProduct.reviews).map((r, i) => (
                        <div key={i} className="review-item" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                          <div className="review-avatar">{String.fromCharCode(65 + (i % 26))}</div>
                          <p className="review-text">{r}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* MIDDLE: AI Ethical Snapshot */}
              <div className="modal-snapshot-section" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="section-label" style={{ margin: 0, color: '#93c5fd' }}>AI Ethical Snapshot</h3>
                  <button 
                    onClick={fetchEthicalSnapshot} 
                    disabled={isSnapshotLoading}
                    style={{ 
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
                      color: 'white', 
                      padding: '8px 16px', 
                      borderRadius: '8px',
                      border: 'none',
                      cursor: isSnapshotLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: '0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSnapshotLoading ? 'Analyzing...' : '✨ Generate Snapshot'}
                  </button>
                </div>
                {snapshotText && (
                  <div style={{ marginTop: '16px', color: '#f8fafc', fontSize: '15px', lineHeight: '1.6', fontStyle: 'italic' }}>
                    {snapshotText}
                  </div>
                )}
              </div>

              {/* BOTTOM: Action Button */}
              <button className="add-review-btn" onClick={() => setIsReviewModalOpen(true)}>
                <span>✦</span> Add Your Ethical Review
              </button>
            </div>
          </div>
        </div>
      )}

{/* --- REVIEW SUBMISSION MODAL --- */}
      {isReviewModalOpen && (
        <div className="review-modal" onClick={() => setIsReviewModalOpen(false)}>
          <div className="review-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Share Your Experience</h3>
            <textarea 
              id="review-textarea" 
              placeholder="What's your take on this product's ethics?"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              autoFocus /* Automatically selects the text box for the user */
            ></textarea>
            <div className="review-modal-actions">
              <button className="btn-secondary" onClick={() => setIsReviewModalOpen(false)}>Cancel</button>
              
              <button 
                className="btn-primary" 
                onClick={async () => {
                  if (!reviewText.trim()) return;
                  
                  try {
                    // Send to backend
                    const response = await apiClient.post(`/products/${selectedProduct.product_id}/reviews`, { 
                      reviewText 
                    });

                    const { newScore, reviews } = response.data;

                    // Update UI locally without reloading
                    const updatedProduct = { 
                      ...selectedProduct, 
                      reviews: reviews,
                      public_sentiment_score: newScore 
                    };
                    
                    setSelectedProduct(updatedProduct);
                    
                    setProducts(prevProducts => 
                      prevProducts.map(p => p.product_id === updatedProduct.product_id ? updatedProduct : p)
                    );

                    setIsReviewModalOpen(false);
                    setReviewText('');
                  } catch (error) {
                    console.error("Failed to submit review", error);
                    alert("Failed to save your review. Please try again.");
                  }
                }}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;