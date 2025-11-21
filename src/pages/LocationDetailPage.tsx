import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LOCATIONS } from '../data/mockData';
import { AMENITY_LABELS } from '../data/constants';
import { SEO } from '../components/SEO';
import { LocationJsonLd } from '../components/JsonLd';
import { AdUnit } from '../components/AdUnit';
import { AffiliateLinks } from '../components/AffiliateLinks';


export const LocationDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [imageError, setImageError] = useState(false);

    const location = LOCATIONS.find(l => l.id === id);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (!location) {
        return (
            <div className="not-found" style={{ padding: '40px', textAlign: 'center' }}>
                <h2>找不到此地點</h2>
                <p>抱歉，我們找不到您要找的地點。</p>
                <Link to="/" className="back-button">返回首頁</Link>
            </div>
        );
    }

    const displayImage = imageError
        ? 'https://images.unsplash.com/photo-1519567241046-7f570eee3c9e?auto=format&fit=crop&w=800&q=80'
        : location.imageUrl;

    return (
        <div className="location-detail-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <SEO
                title={`${location.name} - ${location.city}親子好去處`}
                description={`${location.name}位於${location.city}。${location.description.substring(0, 100)}...`}
                image={location.imageUrl}
            />
            <LocationJsonLd location={location} />

            <Link to="/" className="back-link" style={{ display: 'inline-block', marginBottom: '20px', textDecoration: 'none', color: '#666' }}>
                ← 返回列表
            </Link>

            <div className="detail-content" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div className="image-container" style={{ position: 'relative', height: '400px' }}>
                    <img
                        src={displayImage}
                        alt={location.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setImageError(true)}
                    />
                    <div className="category-badge" style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', color: '#333' }}>
                        {location.category}
                    </div>
                </div>

                <div className="detail-body" style={{ padding: '30px' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '10px', color: '#1a1a1a' }}>{location.name}</h1>

                    <div className="info-grid" style={{ display: 'grid', gap: '12px', marginBottom: '30px', color: '#4a4a4a' }}>
                        <div className="info-row">📍 {location.address}</div>
                        <div className="info-row">🕒 {location.openingHours}</div>
                        {location.phone && <div className="info-row">📞 {location.phone}</div>}
                        {location.websiteUrl && (
                            <div className="info-row">
                                🌐 <a href={location.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9' }}>官方網站</a>
                            </div>
                        )}
                    </div>

                    <AdUnit slot="1234567890" />

                    <AffiliateLinks links={location.affiliateLinks} />

                    <div className="section" style={{ marginBottom: '30px' }}>
                        <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>設施服務</h3>
                        <div className="amenity-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {location.amenities.map((amenity) => (
                                <span key={amenity} className="amenity-tag" style={{ background: '#f3f4f6', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {AMENITY_LABELS[amenity].icon} {AMENITY_LABELS[amenity].label}
                                    {location.floorInfo?.[amenity] && (
                                        <span className="floor-badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.8em', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>
                                            {location.floorInfo[amenity]}
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="section">
                        <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>關於這裡</h3>
                        <p style={{ lineHeight: '1.8', color: '#374151' }}>{location.description}</p>
                    </div>

                    <AdUnit slot="0987654321" format="rectangle" />
                </div>
            </div>
        </div>
    );
};
