import React, { useState, useMemo } from 'react';
import { Hero } from '../components/Hero';
import { FilterBar } from '../components/FilterBar';
import { LocationList } from '../components/LocationList';
import { RegionSwitch } from '../components/RegionSwitch';
import { LOCATIONS } from '../data/mockData';
import type { Amenity } from '../data/types';

export const HomePage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);
    const [currentRegion, setCurrentRegion] = useState<'TW' | 'JP'>('TW');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    const handleToggleAmenity = (amenity: Amenity) => {
        setSelectedAmenities((prev) =>
            prev.includes(amenity)
                ? prev.filter((a) => a !== amenity)
                : [...prev, amenity]
        );
    };

    const handleFindNearest = () => {
        setIsLocating(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('您的瀏覽器不支援地理定位功能');
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLocating(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = '無法取得您的位置';
                if (error.code === 1) errorMessage = '請允許瀏覽器存取您的位置以使用此功能';
                else if (error.code === 2) errorMessage = '無法偵測到您的位置';
                else if (error.code === 3) errorMessage = '定位逾時，請稍後再試';

                setLocationError(errorMessage);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Haversine formula to calculate distance in km
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    // Get available cities based on current region
    const availableCities = useMemo(() => {
        const cities = new Set<string>();
        LOCATIONS.forEach(location => {
            if (location.country === currentRegion) {
                cities.add(location.city);
            }
        });
        return Array.from(cities).sort();
    }, [currentRegion]);

    const filteredLocations = useMemo(() => {
        let locations = LOCATIONS.filter((location) => {
            // Filter by region
            if (location.country !== currentRegion) return false;

            // Filter by city
            if (selectedCity && location.city !== selectedCity) return false;

            // Filter by search term
            const matchesSearch =
                location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                location.description.toLowerCase().includes(searchTerm.toLowerCase());

            // Filter by amenities
            const matchesAmenities =
                selectedAmenities.length === 0 ||
                selectedAmenities.every((amenity) => location.amenities.includes(amenity));

            return matchesSearch && matchesAmenities;
        });

        // Sort by distance if user location is available
        if (userLocation) {
            locations = locations.map(location => {
                if (!location.coordinates) return { ...location, distance: Infinity };
                const distance = calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    location.coordinates.lat,
                    location.coordinates.lng
                );
                return { ...location, distance };
            }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }

        return locations;
    }, [searchTerm, selectedAmenities, currentRegion, selectedCity, userLocation]);

    return (
        <div className="home-page">
            <Hero searchTerm={searchTerm} onSearchChange={setSearchTerm} />

            <RegionSwitch currentRegion={currentRegion} onRegionChange={(region) => {
                setCurrentRegion(region);
                setSelectedCity(''); // Reset city when switching regions
                setUserLocation(null); // Reset location sort when switching regions
                setLocationError(null);
            }} />

            <div style={{ maxWidth: '1200px', margin: '20px auto 0', padding: '0 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                {/* City Filter Dropdown */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        style={{
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            padding: '10px 40px 10px 20px', // Extra padding on right for arrow
                            borderRadius: '50px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: 'white',
                            fontSize: '1rem',
                            color: '#334155',
                            cursor: 'pointer',
                            outline: 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            minWidth: '150px',
                            fontWeight: '500',
                            textAlign: 'center'
                        }}
                    >
                        <option value="">地區選擇</option>
                        {availableCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                    <div style={{
                        position: 'absolute',
                        right: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#64748b'
                    }}>
                        ▼
                    </div>
                </div>

                <button
                    onClick={handleFindNearest}
                    disabled={isLocating}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: userLocation ? '#0ea5e9' : 'white',
                        color: userLocation ? 'white' : '#334155',
                        border: userLocation ? 'none' : '1px solid #e2e8f0',
                        borderRadius: '50px',
                        cursor: isLocating ? 'wait' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isLocating ? '📍 定位中...' : userLocation ? '📍 已依距離排序' : '📍 尋找附近景點'}
                </button>
                {locationError && (
                    <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>{locationError}</span>
                )}
            </div>

            <FilterBar
                selectedAmenities={selectedAmenities}
                onToggleAmenity={handleToggleAmenity}
            />

            <LocationList
                locations={filteredLocations}
            />
        </div>
    );
};
