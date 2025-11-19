import React from 'react';
import type { Location } from '../data/types';
import { LocationCard } from './LocationCard';
import './components.css';

interface LocationListProps {
    locations: Location[];
    onLocationClick: (location: Location) => void;
}

export const LocationList: React.FC<LocationListProps> = ({ locations, onLocationClick }) => {
    if (locations.length === 0) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
                <h3>找不到相關地點</h3>
                <p>請嘗試調整您的搜尋關鍵字或篩選條件。</p>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="location-grid">
                {locations.map((location) => (
                    <LocationCard key={location.id} location={location} onClick={onLocationClick} />
                ))}
            </div>
        </div>
    );
};
