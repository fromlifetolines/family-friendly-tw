import React from 'react';

interface HeaderProps {
  onSearch: (query: string) => void;
  onCategorySelect?: (category: string) => void;
  unlockedBadges?: string[];
}

const Header: React.FC<HeaderProps> = ({ onSearch, unlockedBadges = [] }) => {
  return (
    // 強制置頂 z-[9999]，並確保寬度與定位完全固定
    <nav className="glass-panel" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: 9999, 
      width: '100%', 
      background: 'rgba(255, 255, 255, 0.9)', // Higher opacity as requested to prevent map clutter
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* 第一層：標題與徽章 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1e', lineHeight: 1.1, margin: 0 }}>
              Family Friendly <span style={{ color: '#007AFF' }}>TW</span>
            </h1>
            <span style={{ fontSize: '10px', color: '#8e8e93', fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'uppercase', marginTop: '2px' }}>
              Parent-Child Discovery
            </span>
          </div>
          
          <button 
            className="tactile-btn"
            style={{ 
              background: '#f2f2f7', 
              padding: '8px 12px', 
              borderRadius: '12px', 
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '18px' }}>🏆</span> 
            <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#1c1c1e' }}>{unlockedBadges.length}</span>
          </button>
        </div>

        {/* 第二層：搜尋框 - 加上背景色防止透視地圖導致文字混亂 */}
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8e8e93' }}>🔍</span>
          <input
            type="text"
            style={{
              width: '100%', 
              padding: '12px 12px 12px 40px',
              background: '#f2f2f7', 
              border: '1px solid transparent', 
              borderRadius: '16px', 
              fontSize: '14px', 
              color: '#1c1c1e',
              outline: 'none',
              transition: 'all 0.3s ease',
              boxSizing: 'border-box'
            }}
            placeholder="搜尋目的地..."
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
    </nav>
  );
};

export default Header;
