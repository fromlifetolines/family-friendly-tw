import React from 'react';
import type { Amenity } from '../data/types';
import { AMENITY_LABELS } from '../data/constants';
import './components.css';

interface FilterBarProps {
    selectedAmenities: Amenity[];
    onToggleAmenity: (amenity: Amenity) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ selectedAmenities, onToggleAmenity }) => {
    return (
        <div className="container">
            <div className="filter-bar">
                {(Object.keys(AMENITY_LABELS) as Amenity[]).map((amenity) => (
                    <button
                        key={amenity}
                        className={`filter-chip ${selectedAmenities.includes(amenity) ? 'active' : ''}`}
                        onClick={() => onToggleAmenity(amenity)}
                    >
                        <span>{AMENITY_LABELS[amenity].icon}</span>
                        {AMENITY_LABELS[amenity].label}
                    </button>
                ))}
            </div>
        </div>
    );
};
