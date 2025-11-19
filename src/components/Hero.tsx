import React from 'react';
import './components.css';

interface HeroProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ searchTerm, onSearchChange }) => {
    return (
        <div className="hero">
            <div className="container">
                <h1 className="hero-title">尋找台灣親子友善空間</h1>
                <p className="hero-subtitle">
                    輕鬆搜尋附近的百貨公司與公共設施，包含哺乳室、嬰兒車租借及各項親子友善服務。
                </p>
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="搜尋地點、名稱或設施..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};
