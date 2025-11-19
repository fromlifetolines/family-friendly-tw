import React from 'react';
import './components.css';

interface HeaderProps {
    onNavigate: (page: 'home' | 'about') => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
    return (
        <header className="header">
            <div className="container header-content">
                <div className="logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
                    <span>👶</span> 親子友善地圖
                </div>
                <nav className="nav-links">
                    <button onClick={() => onNavigate('home')} className="nav-link">首頁</button>
                    <button onClick={() => onNavigate('about')} className="nav-link">關於我們</button>
                </nav>
            </div>
        </header>
    );
};
