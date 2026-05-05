import React from 'react';

interface HeaderProps {
  onSearch: (query: string) => void;
  onCategorySelect: (category: string) => void;
  unlockedBadgesCount: number;
  onBadgeClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch, onCategorySelect, unlockedBadgesCount, onBadgeClick }) => {
  const categories = ["全部", "玩樂", "美食", "休息"];

  return (
    <nav className="glass-panel" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: 50, 
      borderRadius: '0 0 24px 24px',
      borderTop: 'none',
      background: 'rgba(20, 20, 25, 0.45)', // Matching sidebar style
      padding: '16px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* 第一層：品牌標題與互動徽章 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ 
              fontSize: '20px', 
              fontWeight: 900, 
              color: 'var(--liquid-text)', 
              lineHeight: 1.1, 
              letterSpacing: '-0.02em',
              margin: 0
            }}>
              Family Friendly <span style={{ color: '#007AFF' }}>TW</span>
            </h1>
            <p style={{ 
              fontSize: '10px', 
              color: 'var(--liquid-muted)', 
              marginTop: '4px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em', 
              fontWeight: 700,
              margin: 0
            }}>
              Explore with Xing-Wei
            </p>
          </div>
          
          {/* 數位徽章按鈕：採用 Apple 式毛玻璃質感 */}
          <button 
            className="tactile-btn"
            onClick={onBadgeClick}
            style={{ 
              position: 'relative', 
              padding: '10px', 
              borderRadius: '16px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '20px' }}>🏆</span>
            {unlockedBadgesCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-4px', 
                right: '-4px', 
                background: '#FF3B30', 
                color: 'white', 
                fontSize: '10px', 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                border: '2px solid rgba(20,20,25,1)',
                fontWeight: 900
              }}>
                {unlockedBadgesCount}
              </span>
            )}
          </button>
        </div>

        {/* 第二層：搜尋框 */}
        <div style={{ position: 'relative' }}>
          <span style={{ 
            position: 'absolute', 
            left: '14px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            fontSize: '16px', 
            color: '#86868B',
            pointerEvents: 'none'
          }}>🔍</span>
          <input
            type="text"
            style={{
              width: '100%', 
              padding: '12px 12px 12px 44px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255, 255, 255, 0.05)', 
              color: 'var(--liquid-text)',
              fontSize: '15px', 
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.3s var(--ease-liquid)'
            }}
            placeholder="尋找星唯也愛的親子點位..."
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* 第三層：類別橫向捲軸 */}
        <div 
          className="no-scrollbar"
          style={{ 
            display: 'flex', 
            gap: '10px', 
            overflowX: 'auto', 
            paddingBottom: '4px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategorySelect(cat)}
              className="tactile-btn"
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--liquid-text)',
                transition: 'all 0.3s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Header;
