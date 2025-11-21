import React from 'react';
import './components.css';

interface RegionSwitchProps {
    currentRegion: 'TW' | 'JP';
    onRegionChange: (region: 'TW' | 'JP') => void;
}

export const RegionSwitch: React.FC<RegionSwitchProps> = ({ currentRegion, onRegionChange }) => {
    return (
        <div className="region-switch-container" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <div className="region-switch" style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '30px',
                position: 'relative',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <button
                    onClick={() => onRegionChange('TW')}
                    style={{
                        border: 'none',
                        background: currentRegion === 'TW' ? 'white' : 'transparent',
                        color: currentRegion === 'TW' ? '#0ea5e9' : '#64748b',
                        padding: '8px 24px',
                        borderRadius: '24px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        boxShadow: currentRegion === 'TW' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span style={{ fontSize: '1.2em' }}>🇹🇼</span> 台灣
                </button>
                <button
                    onClick={() => onRegionChange('JP')}
                    style={{
                        border: 'none',
                        background: currentRegion === 'JP' ? 'white' : 'transparent',
                        color: currentRegion === 'JP' ? '#ec4899' : '#64748b',
                        padding: '8px 24px',
                        borderRadius: '24px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        boxShadow: currentRegion === 'JP' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span style={{ fontSize: '1.2em' }}>🇯🇵</span> 日本
                </button>
            </div>
        </div>
    );
};
