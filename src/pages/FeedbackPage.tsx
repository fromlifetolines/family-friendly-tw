import React from 'react';
import '../components/components.css';

export const FeedbackPage: React.FC = () => {
    return (
        <div className="container" style={{ padding: '4rem 0', maxWidth: '900px' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>意見回饋</h1>

            <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                感謝您使用親子友善地圖！我們非常重視您的意見。無論是希望新增特定景點、更新現有資訊，或是對網站有任何建議，都歡迎透過以下表單與我們分享。
            </p>

            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <iframe
                    src="https://docs.google.com/forms/d/e/1FAIpQLSc_W71w_jPUAXAd0qDPNd47_Z30hMWQ-q3a_THJY-8dpSWUeA/viewform?embedded=true"
                    width="100%"
                    height="1011"
                    frameBorder="0"
                    marginHeight={0}
                    marginWidth={0}
                    style={{ border: 'none', borderRadius: 'var(--radius-md)' }}
                >
                    載入中…
                </iframe>
            </div>

            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                您的回饋將協助我們持續改進，讓更多家庭受益。謝謝您！
            </p>
        </div>
    );
};
