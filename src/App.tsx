import { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import './App.css';

type Page = 'map' | 'info' | 'contribute';

// Custom icons based on requirements
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const standardIcon = createCustomIcon('#FF6B4A'); // --brand-coral

// Data
const QUICK_FILTERS = [
  { id: 'nursing', icon: '🍼', label: '哺乳室' },
  { id: 'stroller', icon: '🛒', label: '嬰兒車借' },
  { id: 'diaper', icon: '👶', label: '尿布台' },
  { id: 'water', icon: '💧', label: '熱水飲水' },
  { id: 'elevator', icon: '🛗', label: '電梯坡道' },
  { id: 'play', icon: '🎠', label: '兒童遊戲' },
  { id: 'lane', icon: '🎫', label: '親子通道' },
  { id: 'toilet', icon: '🚻', label: '親子廁所' },
];

const INFO_AMENITIES = [
  { id: 'nursing', icon: '🍼', label: '哺乳室', has: true },
  { id: 'stroller', icon: '🛒', label: '嬰兒車借', has: false },
  { id: 'diaper', icon: '👶', label: '尿布台', has: false },
  { id: 'water', icon: '💧', label: '熱水飲水', has: true },
  { id: 'elevator', icon: '🛗', label: '電梯坡道', has: true },
  { id: 'play', icon: '🎠', label: '兒童遊戲', has: false },
  { id: 'lane', icon: '🎫', label: '親子通道', has: false },
  { id: 'toilet', icon: '🚻', label: '親子廁所', has: true },
];

const CONTRIBUTE_AMENITIES = [
  { id: 'nursing', icon: '🍼', label: '哺乳室' },
  { id: 'diaper', icon: '👶', label: '尿布台' },
  { id: 'water', icon: '💧', label: '飲水機' },
  { id: 'stroller', icon: '🛒', label: '嬰兒車借' },
  { id: 'play', icon: '🎠', label: '遊戲區' },
  { id: 'elevator', icon: '🛗', label: '電梯' },
];

const MOCK_MARKERS = [
  { position: [25.0408, 121.5674] as [number, number], name: '信義新光三越 A8 哺乳室' },
  { position: [25.0412, 121.5690] as [number, number], name: '統一時代 3F 親子廁' },
  { position: [25.0398, 121.5660] as [number, number], name: '台北 101 B1 哺乳室' }
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('map');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [currentInfoTitle, setCurrentInfoTitle] = useState('SOGO 忠孝館 5F 哺乳室');

  const toggleFilter = (id: string) => {
    setActiveFilter(prev => prev === id ? null : id);
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleMarkerClick = (name: string) => {
    setCurrentInfoTitle(name);
    setCurrentPage('info');
  };

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
        
        {MOCK_MARKERS.map((marker, index) => (
          <Marker 
            key={index}
            position={marker.position}
            icon={standardIcon}
            eventHandlers={{
              click: () => handleMarkerClick(marker.name)
            }}
          />
        ))}
      </MapContainer>

      <div className="quick-filter-scroll no-scrollbar">
        {QUICK_FILTERS.map(filter => (
          <button 
            key={filter.id}
            className={`quick-filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => toggleFilter(filter.id)}
          >
            {filter.icon} {filter.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderInfoPage = () => (
    <div className="info-page">
      <div className="mini-map">
        <button className="back-btn" onClick={() => setCurrentPage('map')}>
          ←
        </button>
      </div>

      <div className="info-card">
        <h1 className="info-title">{currentInfoTitle}</h1>
        <div className="info-status">🚶 步行 3 分鐘・營業中</div>

        <div className="amenity-grid-4">
          {INFO_AMENITIES.map(amenity => (
            <div key={amenity.id} className={`amenity-item ${amenity.has ? 'has' : 'none'}`}>
              <span style={{ fontSize: '24px' }}>{amenity.icon}</span>
              <span>{amenity.label}</span>
            </div>
          ))}
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
        <div className="amenity-grid-2">
          {CONTRIBUTE_AMENITIES.map(amenity => {
            const isSelected = selectedAmenities.includes(amenity.id);
            return (
              <button 
                key={amenity.id}
                className={`toggle-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleAmenity(amenity.id)}
              >
                <span style={{ fontSize: '28px' }}>{amenity.icon}</span>
                <span>{amenity.label}</span>
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
