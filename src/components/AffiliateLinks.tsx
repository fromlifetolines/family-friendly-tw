import React from 'react';

interface AffiliateLink {
    provider: string;
    url: string;
    label: string;
}

interface AffiliateLinksProps {
    links?: AffiliateLink[];
}

export const AffiliateLinks: React.FC<AffiliateLinksProps> = ({ links }) => {
    if (!links || links.length === 0) return null;

    return (
        <div className="affiliate-links-container" style={{ margin: '20px 0', padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1.1rem', color: '#0369a1' }}>🎟️ 購票與優惠</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {links.map((link, index) => (
                    <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="affiliate-button"
                        style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            backgroundColor: '#0ea5e9',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {link.label} <span style={{ fontSize: '0.8em', opacity: 0.8 }}>via {link.provider}</span>
                    </a>
                ))}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', marginBottom: 0 }}>
                透過以上連結購買，我們可能會獲得微薄佣金以維持網站營運，但不影響您的購買價格。
            </p>
        </div>
    );
};
