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

    const handleToggleAmenity = (amenity: Amenity) => {
        setSelectedAmenities((prev) =>
            prev.includes(amenity)
                ? prev.filter((a) => a !== amenity)
                : [...prev, amenity]
        );
    };

    const filteredLocations = useMemo(() => {
        return LOCATIONS.filter((location) => {
            // Filter by region
            if (location.country !== currentRegion) return false;

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
    }, [searchTerm, selectedAmenities, currentRegion]);

    return (
        <div className="home-page">
            <Hero searchTerm={searchTerm} onSearchChange={setSearchTerm} />

            <RegionSwitch currentRegion={currentRegion} onRegionChange={setCurrentRegion} />

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
