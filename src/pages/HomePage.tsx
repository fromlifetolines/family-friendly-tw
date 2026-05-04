import { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import FacilityBottomSheet from '../components/FacilityBottomSheet';
import type { Facility } from '../components/FacilityBottomSheet';



const createCustomIcon = (color: string, sizeMultiplier: number = 1) => {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      background-color: ${color};
      width: ${20 * sizeMultiplier}px;
      height: ${20 * sizeMultiplier}px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20 * sizeMultiplier, 20 * sizeMultiplier],
    iconAnchor: [10 * sizeMultiplier, 10 * sizeMultiplier],
  });
};

const standardIcon = createCustomIcon('#FF6B4A', 1); // --brand-coral
const premiumIcon = createCustomIcon('#1E2D5A', 1.2); // --brand-navy, 20% larger

const mockFacilities: Facility[] = [
  {
    id: '1',
    name: '信義A8 兒童館哺乳室',
    status: 'open',
    distance: '150m',
    type: 'premium',
    amenities: {
      nursingRoom: true, diaperTable: true, hotWater: true,
      elevator: true, playArea: false, familyToilet: true,
    }
  },
  {
    id: '2',
    name: '全家便利商店 台北車站店',
    status: 'open',
    distance: '300m',
    type: 'standard',
    amenities: {
      nursingRoom: false, diaperTable: false, hotWater: true,
      elevator: false, playArea: false, familyToilet: false,
    }
  }
];

const mockPositions = [
  [25.033964, 121.564468], // Near Taipei 101
  [25.034500, 121.565000],
];

const QUICK_FILTERS = [
  { id: 'nursingRoom', icon: '🍼', label: '哺乳室' },
  { id: 'diaperTable', icon: '👶', label: '尿布台' },
  { id: 'hotWater', icon: '💧', label: '熱水' },
  { id: 'elevator', icon: '🛗', label: '電梯' },
  { id: 'playArea', icon: '🎠', label: '遊戲區' },
  { id: 'familyToilet', icon: '🚻', label: '親子廁' },
];

export default function HomePage() {
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // CartoDB Voyager Style (Grey/Light style)
  const mapStyleUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Top Search Bar */}
      <div className="absolute top-[50px] left-0 right-0 px-4 z-[400]">
        <div className="bg-white h-[46px] rounded-[999px] shadow-md flex items-center px-5 justify-between">
          <span className="text-[15px] text-[#1E2D5A] font-bold truncate">
            目前定位：台北市信義區...
          </span>
          <LocateFixed className="text-[#FF6B4A]" size={20} />
        </div>
      </div>

      <MapContainer 
        center={[25.033964, 121.564468]} 
        zoom={15} 
        zoomControl={false}
        className="w-full h-full z-[100]"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={mapStyleUrl}
        />
        
        {mockFacilities.map((facility, index) => (
          <Marker 
            key={facility.id}
            position={mockPositions[index] as L.LatLngExpression}
            icon={facility.type === 'premium' ? premiumIcon : standardIcon}
            eventHandlers={{
              click: () => setSelectedFacility(facility)
            }}
          />
        ))}
      </MapContainer>

      {/* Quick Filters (Horizontal scroll) */}
      <div className="absolute bottom-[24px] left-0 right-0 z-[400] overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-2 px-4 w-max">
          {QUICK_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(isActive ? null : filter.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[999px] shadow-sm text-[14px] font-bold transition-colors border ${
                  isActive 
                    ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]' 
                    : 'bg-white text-[#1E2D5A] border-gray-200'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overlay to catch clicks when BottomSheet is open */}
      {selectedFacility && (
        <div 
          className="absolute inset-0 bg-black/20 z-[900]"
          onClick={() => setSelectedFacility(null)}
        />
      )}

      {/* Bottom Sheet */}
      <FacilityBottomSheet 
        facility={selectedFacility} 
        onClose={() => setSelectedFacility(null)} 
      />

      {/* Hide scrollbar for the quick filter container */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
