import React from 'react';
import './components.css';

export const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="container footer-content">
                <p>&copy; 2025 親子友善地圖. 35日常版權所有.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    協助父母輕鬆找到最適合寶貝的友善空間
                </p>
            </div>
        </footer>
    );
};
