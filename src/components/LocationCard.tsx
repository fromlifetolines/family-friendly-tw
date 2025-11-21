import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Location } from '../data/types';
import { AMENITY_LABELS } from '../data/constants';
import './components.css';

interface LocationCardProps {
    location: Location;
    distance?: number; // Distance in km
    onClick?: (location: Location) => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({ location, distance }) => {
    const [imageError, setImageError] = useState(false);

    // Fallback image if the main one fails
    const displayImage = imageError
        ? 'https://images.unsplash.com/photo-1519567241046-7f570eee3c9e?auto=format&fit=crop&w=800&q=80'
        : location.imageUrl;

    return (
        <Link to={`/location/${location.id}`} className="location-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <img
                src={displayImage}
                alt={location.name}
                className="card-image"
                loading="lazy"
                onError={() => setImageError(true)}
            />
            <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div className="card-category">{location.category}</div>
                    {typeof distance === 'number' && distance !== Infinity && (
                        <div style={{
                            fontSize: '0.85rem',
                            color: '#0ea5e9',
                            fontWeight: '600',
                            backgroundColor: '#f0f9ff',
                            padding: '2px 8px',
                            borderRadius: '12px'
                        }}>
                            📍 {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                        </div>
                    )}
                </div>
                <h3 className="card-title">{location.name}</h3>
                <div className="card-address">
                    <span>📍</span> {location.city}
                </div>
                <div className="amenity-tags">
                    {location.amenities.slice(0, 4).map((amenity) => (
                        <span key={amenity} className="amenity-tag">
                            {AMENITY_LABELS[amenity].icon} {AMENITY_LABELS[amenity].label}
                        </span>
                    ))}
                    {location.amenities.length > 4 && (
                        <span className="amenity-tag">+{location.amenities.length - 4} 更多</span>
                    )}
                </div>
            </div>
        </Link>
    );
};
