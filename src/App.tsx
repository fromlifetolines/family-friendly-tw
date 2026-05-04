import { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import './App.css';

// --- Types & Interfaces ---
type Page = 'map' | 'info' | 'contribute';

type FacilityType =
  | 'nursing_room'      // 🍼 哺乳室
  | 'stroller_rental'   // 🛒 嬰兒車租借
  | 'diaper_table'      // 👶 尿布台
  | 'hot_water'         // 💧 熱水/飲水機
  | 'elevator'          // 🛗 電梯/無障礙坡道
  | 'play_area'         // 🎠 兒童遊戲區
  | 'priority_lane'     // 🎫 親子優先通道
  | 'family_restroom'   // 🚻 親子廁所

interface Facility {
  id: FacilityType;
  available: boolean;
  note?: string;         // 「需出示發票」「僅限會員」
}

interface Location {
  id: string;
  name: string;          // 「新光三越信義 A8」
  branch: string;        // 「5F 哺乳室區」
  type: 'mall' | 'hospital' | 'park' | 'transport' | 'restaurant';
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  openHours: string;     // 「10:00–22:00」
  isPremium: boolean;    // 贊助地標
  rating: number;        // 4.2
  reviewCount: number;
  facilities: Facility[];
  photos: string[];
  lastUpdated: string;
  floorInfo?: string;    // 「5F」
}

// --- Icons Definition ---
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
const premiumIcon = createCustomIcon('#1E2D5A', 1.2); // --brand-navy

// --- Static Data ---
const FACILITY_META: Record<FacilityType, { icon: string, label: string }> = {
  nursing_room: { icon: '🍼', label: '哺乳室' },
  stroller_rental: { icon: '🛒', label: '嬰兒車借' },
  diaper_table: { icon: '👶', label: '尿布台' },
  hot_water: { icon: '💧', label: '熱水飲水' },
  elevator: { icon: '🛗', label: '電梯坡道' },
  play_area: { icon: '🎠', label: '兒童遊戲' },
  priority_lane: { icon: '🎫', label: '親子通道' },
  family_restroom: { icon: '🚻', label: '親子廁所' }
};

const ALL_FACILITIES = Object.keys(FACILITY_META) as FacilityType[];

const MOCK_LOCATIONS: Location[] = [
  {
    id: 'l1',
    name: '信義新光三越 A8',
    branch: '5F 兒童館哺乳室',
    type: 'mall',
    lat: 25.0408,
    lng: 121.5674,
    address: '台北市信義區松高路12號',
    openHours: '11:00–21:30',
    isPremium: true,
    rating: 4.8,
    reviewCount: 324,
    photos: [],
    lastUpdated: '2024-05-01',
    floorInfo: '5F',
    facilities: [
      { id: 'nursing_room', available: true },
      { id: 'stroller_rental', available: true },
      { id: 'diaper_table', available: true },
      { id: 'hot_water', available: true },
      { id: 'elevator', available: true },
      { id: 'play_area', available: false },
      { id: 'priority_lane', available: false },
      { id: 'family_restroom', available: true }
    ]
  },
  {
    id: 'l2',
    name: '統一時代百貨',
    branch: '3F 親子廁所',
    type: 'mall',
    lat: 25.0412,
    lng: 121.5690,
    address: '台北市信義區忠孝東路五段8號',
    openHours: '11:00–21:30',
    isPremium: false,
    rating: 4.2,
    reviewCount: 156,
    photos: [],
    lastUpdated: '2024-04-15',
    floorInfo: '3F',
    facilities: [
      { id: 'nursing_room', available: false },
      { id: 'stroller_rental', available: false },
      { id: 'diaper_table', available: true },
      { id: 'hot_water', available: false },
      { id: 'elevator', available: true },
      { id: 'play_area', available: false },
      { id: 'priority_lane', available: false },
      { id: 'family_restroom', available: true }
    ]
  },
  {
    id: 'l3',
    name: '台北 101',
    branch: 'B1 哺乳室',
    type: 'mall',
    lat: 25.0398,
    lng: 121.5660,
    address: '台北市信義區市府路45號',
    openHours: '11:00–21:30',
    isPremium: true,
    rating: 4.9,
    reviewCount: 512,
    photos: [],
    lastUpdated: '2024-05-03',
    floorInfo: 'B1',
    facilities: [
      { id: 'nursing_room', available: true },
      { id: 'stroller_rental', available: true },
      { id: 'diaper_table', available: true },
      { id: 'hot_water', available: true },
      { id: 'elevator', available: true },
      { id: 'play_area', available: true },
      { id: 'priority_lane', available: true },
      { id: 'family_restroom', available: true }
    ]
  }
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('map');
  const [activeFilter, setActiveFilter] = useState<FacilityType | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  // For Contribute page
  const [contributeAmenities, setContributeAmenities] = useState<FacilityType[]>([]);

  const toggleFilter = (id: FacilityType) => {
    setActiveFilter(prev => prev === id ? null : id);
  };

  const toggleContributeAmenity = (id: FacilityType) => {
    setContributeAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleMarkerClick = (loc: Location) => {
    setSelectedLocation(loc);
    setCurrentPage('info');
  };

  const filteredLocations = activeFilter 
    ? MOCK_LOCATIONS.filter(loc => 
        loc.facilities.some(f => f.id === activeFilter && f.available)
      )
    : MOCK_LOCATIONS;

  const renderMapPage = () => (
    <div className="map-page">
      <div className="search-pill">
        <span>目前位置：信義新光三越 A8</span>
        <span>📍</span>
      </div>

      <MapContainer 
        center={[25.0408, 121.5674]} 
        zoom={15} 
        zoomControl={false}
        className="w-full h-full z-[10]"
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {filteredLocations.map(loc => (
          <Marker 
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={loc.isPremium ? premiumIcon : standardIcon}
            eventHandlers={{
              click: () => handleMarkerClick(loc)
            }}
          />
        ))}
      </MapContainer>

      <div className="quick-filter-scroll no-scrollbar">
        {ALL_FACILITIES.map(key => (
          <button 
            key={key}
            className={`quick-filter-btn ${activeFilter === key ? 'active' : ''}`}
            onClick={() => toggleFilter(key)}
          >
            {FACILITY_META[key].icon} {FACILITY_META[key].label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderInfoPage = () => {
    const loc = selectedLocation || MOCK_LOCATIONS[0];
    
    return (
      <div className="info-page">
        <div className="mini-map">
          <button className="back-btn" onClick={() => setCurrentPage('map')}>
            ←
          </button>
        </div>

        <div className="info-card">
          <h1 className="info-title">{loc.name} {loc.branch}</h1>
          <div className="info-status">🚶 距離很近・{loc.openHours}</div>

          <div className="amenity-grid-4">
            {ALL_FACILITIES.map(key => {
              const fac = loc.facilities.find(f => f.id === key);
              const isAvailable = fac?.available ?? false;
              
              return (
                <div key={key} className={`amenity-item ${isAvailable ? 'has' : 'none'}`}>
                  <span style={{ fontSize: '24px' }}>{FACILITY_META[key].icon}</span>
                  <span>{FACILITY_META[key].label}</span>
                </div>
              );
            })}
          </div>

          <div className="ad-banner">
            <span style={{ fontSize: '24px' }}>💡</span>
            <span>尿布快沒了？大樹藥局 100m 外・折 NT$50</span>
          </div>

          <button className="cta-btn">
            <span>📍</span> 開始導航
          </button>
        </div>
      </div>
    );
  };

  const renderContributePage = () => (
    <div className="contribute-page">
      <div className="contribute-header">
        <h1 className="contribute-title">回報設施情報</h1>
        <div className="auto-location-pill">
          📍 已自動定位：SOGO 忠孝館
        </div>
      </div>

      <div className="contribute-content">
        <div className="section-title">這間設施有哪些服務？</div>
        <div className="amenity-grid-4">
          {ALL_FACILITIES.map(key => {
            const isSelected = contributeAmenities.includes(key);
            return (
              <button 
                key={key}
                className={`toggle-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleContributeAmenity(key)}
              >
                <span style={{ fontSize: '28px' }}>{FACILITY_META[key].icon}</span>
                <span>{FACILITY_META[key].label}</span>
              </button>
            );
          })}
        </div>

        <div className="section-title">上傳現場照片（選填）</div>
        <div className="photo-area">
          📷 拍張現場照
        </div>

        <div className="points-card">
          <span className="points-text">貢獻者積分</span>
          <span className="points-badge">+50 徽章</span>
        </div>

        <button className="submit-btn" onClick={() => alert('情報送出成功！')}>
          <span>🚀</span> 送出情報，獲得 50 點
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {currentPage === 'map' && renderMapPage()}
      {currentPage === 'info' && renderInfoPage()}
      {currentPage === 'contribute' && renderContributePage()}

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button 
          className={`nav-item ${currentPage === 'map' ? 'active' : ''}`}
          onClick={() => setCurrentPage('map')}
        >
          <span className="nav-icon">🗺️</span>
          地圖
        </button>
        <button 
          className={`nav-item ${currentPage === 'info' ? 'active' : ''}`}
          onClick={() => setCurrentPage('info')}
        >
          <span className="nav-icon">📋</span>
          資訊
        </button>
        <button 
          className={`nav-item ${currentPage === 'contribute' ? 'active' : ''}`}
          onClick={() => setCurrentPage('contribute')}
        >
          <span className="nav-icon">➕</span>
          回報
        </button>
      </div>
    </div>
  );
}
