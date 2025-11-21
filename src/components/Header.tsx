import React from 'react';
import { Link } from 'react-router-dom';
import './components.css';

export const Header: React.FC = () => {
    return (
        <header className="header">
            <div className="container header-content">
                <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span>👶</span> 親子友善地圖
                </Link>
                <nav className="nav-links">
                    <Link to="/" className="nav-link">首頁</Link>
                    <Link to="/about" className="nav-link">關於我們</Link>
                    <Link to="/partner" className="nav-link">合作洽談</Link>
                </nav>
            </div>
        </header>
    );
};
