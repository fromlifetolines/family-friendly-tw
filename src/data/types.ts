export type Amenity =
    | 'nursing_room'
    | 'stroller_rental'
    | 'diaper_changing'
    | 'hot_water'
    | 'elevator'
    | 'priority_queue'
    | 'play_area'
    | 'family_toilet';

export interface Location {
    id: string;
    name: string;
    category: 'Department Store' | 'Public Facility' | 'Transit' | 'Park';
    address: string;
    city: string;
    imageUrl: string;
    websiteUrl?: string;
    amenities: Amenity[];
    description: string;
    openingHours: string;
    phone?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    floorInfo?: Partial<Record<Amenity, string>>;
}
