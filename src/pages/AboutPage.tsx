import React from 'react';
import '../components/components.css';

export const AboutPage: React.FC = () => {
    return (
        <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--color-primary)' }}>關於親子友善地圖</h1>

            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                    <strong>親子友善地圖</strong> 是一個社群驅動的專案，致力於協助父母輕鬆帶著孩子出門。我們深知，在外出時能快速找到哺乳室、可租借嬰兒車的地方，或是僅僅是一杯熱水，都能讓育兒生活更加便利。
                </p>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>我們的使命</h2>
                <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                    建立台灣最完整、最新的親子友善設施指南，從各大百貨公司與公共空間開始，讓每個家庭都能安心出遊。
                </p>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>我們關注的設施</h2>
                <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[
                        '🍼 哺乳室',
                        '🛒 嬰兒車租借',
                        '👶 尿布台',
                        '💧 熱水/飲水機',
                        '🛗 電梯與無障礙坡道',
                        '🎠 兒童遊戲區',
                        '🎫 親子優先通道',
                        '🚻 親子廁所'
                    ].map(item => (
                        <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
