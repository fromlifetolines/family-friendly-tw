import React from 'react';

interface HeaderProps {
  onSearch: (query: string) => void;
  onCategorySelect?: (category: string) => void;
  unlockedBadges?: string[];
}

const Header: React.FC<HeaderProps> = ({ onSearch, unlockedBadges = [] }) => {
  return (
    <nav className="brand-header">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'white', lineHeight: 1.1, margin: 0 }}>
          Family Friendly <span style={{ color: '#00F2FF' }}>TW</span>
        </h1>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'uppercase', marginTop: '2px' }}>
          Parent-Child Discovery
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>🔍</span>
          <input
            type="text"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '16px',
              padding: '10px 12px 10px 36px',
              fontSize: '14px',
              color: 'white',
              outline: 'none',
              width: '150px'
            }}
            placeholder="搜尋目的地..."
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        <button style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '8px 12px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ fontSize: '18px' }}>🏆</span> 
          <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#00F2FF' }}>{unlockedBadges.length}</span>
        </button>
      </div>
    </nav>
  );
};

export default Header;
