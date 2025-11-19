import React, { useState, useMemo } from 'react';
import { Hero } from '../components/Hero';
import { FilterBar } from '../components/FilterBar';
import { LocationList } from '../components/LocationList';
import { LocationDetail } from '../components/LocationDetail';
import { LOCATIONS } from '../data/mockData';
import type { Location, Amenity } from '../data/types';

export const HomePage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    const handleToggleAmenity = (amenity: Amenity) => {
        setSelectedAmenities((prev) =>
            prev.includes(amenity)
                ? prev.filter((a) => a !== amenity)
                : [...prev, amenity]
        );
    };

    const filteredLocations = useMemo(() => {
        return LOCATIONS.filter((location) => {
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
    }, [searchTerm, selectedAmenities]);

    return (
        <div className="home-page">
            <Hero searchTerm={searchTerm} onSearchChange={setSearchTerm} />

            <FilterBar
                selectedAmenities={selectedAmenities}
                onToggleAmenity={handleToggleAmenity}
            />

            <LocationList
                locations={filteredLocations}
                onLocationClick={setSelectedLocation}
            />

            {selectedLocation && (
                <LocationDetail
                    location={selectedLocation}
                    onClose={() => setSelectedLocation(null)}
                />
            )}
        </div>
    );
};
