import React, { useState } from 'react';
import type { Location } from '../data/types';
import { AMENITY_LABELS } from '../data/constants';
import './components.css';

interface LocationDetailProps {
    location: Location;
    onClose: () => void;
}

export const LocationDetail: React.FC<LocationDetailProps> = ({ location, onClose }) => {
    const [imageError, setImageError] = useState(false);

    // Fallback image
    const displayImage = imageError
        ? 'https://images.unsplash.com/photo-1519567241046-7f570eee3c9e?auto=format&fit=crop&w=800&q=80'
        : location.imageUrl;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <img
                    src={displayImage}
                    alt={location.name}
                    className="detail-image"
                    onError={() => setImageError(true)}
                />

                <div className="detail-body">
                    <div className="detail-header">
                        <div className="detail-category">{location.category}</div>
                        <h2 className="detail-title">{location.name}</h2>

                        <div className="detail-info-row">
                            <span>📍</span> {location.address}
                        </div>
                        <div className="detail-info-row">
                            <span>🕒</span> {location.openingHours}
                        </div>
                        {location.phone && (
                            <div className="detail-info-row">
                                <span>📞</span> {location.phone}
                            </div>
                        )}
                        {location.websiteUrl && (
                            <div className="detail-info-row">
                                <span>🌐</span>
                                <a
                                    href={location.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="detail-link"
                                >
                                    官方網站
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="detail-section">
                        <h3 className="detail-section-title">設施服務</h3>
                        <div className="amenity-tags">
                            {location.amenities.map((amenity) => (
                                <span key={amenity} className="amenity-tag">
                                    {AMENITY_LABELS[amenity].icon} {AMENITY_LABELS[amenity].label}
                                    {location.floorInfo?.[amenity] && (
                                        <span className="floor-badge">📍 {location.floorInfo[amenity]}</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3 className="detail-section-title">關於這裡</h3>
                        <p className="detail-description">{location.description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
