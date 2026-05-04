import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import './App.css';
import { locations } from './data/locations';
import type { Location, FacilityType } from './data/locations';

// --- Types ---
type Screen = 'map' | 'detail' | 'contribute';

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
const premiumIcon = createCustomIcon('#1E2D5A', 1.4); // --brand-navy, larger

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

// --- Helpers ---
function getDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function isOpenNow(openHours: string) {
  if (openHours.includes('24小時') || openHours.includes('全天開放')) return true;
  try {
    const timeStr = openHours.replace('–', '-').replace(' ', '');
    const [start, end] = timeStr.split('-');
    if (!start || !end) return true; // Fallback if format unknown
    
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    const [sH, sM] = start.split(':').map(Number);
    const startMins = sH * 60 + (sM || 0);
    
    const [eH, eM] = end.split(':').map(Number);
    let endMins = eH * 60 + (eM || 0);
    if (endMins < startMins) endMins += 24 * 60; // passes midnight
    
    let currentMinsCheck = currentMins;
    if (currentMins < startMins && endMins > 24 * 60) {
        currentMinsCheck += 24 * 60; // Check late night hours properly
    }
    
    return currentMinsCheck >= startMins && currentMinsCheck <= endMins;
  } catch (e) {
    return true; // Fallback
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('map');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [activeFilters, setActiveFilters] = useState<FacilityType[]>([]);
  
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  
  // For Contribute page
  const [contributeAmenities, setContributeAmenities] = useState<FacilityType[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        (err) => console.log('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const toggleFilter = (id: FacilityType) => {
    setActiveFilters(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleContributeAmenity = (id: FacilityType) => {
    setContributeAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleMarkerClick = (loc: Location) => {
    setSelectedLocation(loc);
    setCurrentScreen('detail');
  };

  const filteredLocations = activeFilters.length > 0
    ? locations.filter(loc => 
        activeFilters.every(filter => 
          loc.facilities.some(f => f.id === filter && f.available)
        )
      )
    : locations;

  const renderMapScreen = () => (
    <div className="map-page" style={{ height: 'calc(100vh - 60px)' }}>
      <div className="search-pill">
        <span>目前位置：{userLat && userLng ? '已取得您的位置' : '偵測中...'}</span>
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
        {ALL_FACILITIES.map(key => {
          const isActive = activeFilters.includes(key);
          return (
            <button 
              key={key}
              className={`quick-filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => toggleFilter(key)}
            >
              {FACILITY_META[key].icon} {FACILITY_META[key].label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDetailScreen = () => {
    const loc = selectedLocation || locations[0];
    
    let distanceText = '';
    if (userLat && userLng) {
      const distKm = getDistanceKM(userLat, userLng, loc.lat, loc.lng);
      // Rough walking speed: 5 km/h -> 1 km = 12 mins
      const walkMins = Math.round(distKm * 12);
      distanceText = `🚶 步行 ${walkMins} 分鐘・`;
    }

    const isOpen = isOpenNow(loc.openHours);

    return (
      <div className="info-page" style={{ paddingBottom: '80px' }}>
        <div className="mini-map" style={{ height: '160px' }}>
          <button className="back-btn" onClick={() => setCurrentScreen('map')}>
            ←
          </button>
          <MapContainer 
            center={[loc.lat, loc.lng]} 
            zoom={16} 
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <Marker position={[loc.lat, loc.lng]} icon={loc.isPremium ? premiumIcon : standardIcon} />
          </MapContainer>
        </div>

        <div className="info-card">
          <h1 className="info-title">{loc.name} {loc.branch}</h1>
          
          <div className="info-status" style={{ color: isOpen ? 'var(--brand-green)' : 'var(--brand-coral)' }}>
            {distanceText}{isOpen ? '營業中' : '已打烊'} ({loc.openHours})
          </div>

          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--brand-amber)' }}>{'★'.repeat(Math.round(loc.rating))}</span>
            <span>{loc.rating.toFixed(1)}</span>
            <span style={{ color: 'var(--brand-muted)', marginLeft: '4px' }}>({loc.reviewCount} 則評價)</span>
          </div>

          <div className="amenity-grid-4">
            {ALL_FACILITIES.map(key => {
              const fac = loc.facilities.find(f => f.id === key);
              const isAvailable = fac?.available ?? false;
              
              return (
                <div key={key} className={`amenity-item ${isAvailable ? 'has' : 'none'}`}>
                  <span style={{ fontSize: '24px' }}>{FACILITY_META[key].icon}</span>
                  <span>{FACILITY_META[key].label}</span>
                  {fac?.note && <span style={{ fontSize: '10px', marginTop: '4px', color: 'var(--brand-coral)' }}>{fac.note}</span>}
                </div>
              );
            })}
          </div>

          <div className="ad-banner">
            <span style={{ fontSize: '24px' }}>💡</span>
            <span>需要嬰兒用品？點此查看附近優惠</span>
          </div>

          <button 
            className="cta-btn"
            onClick={() => window.open(`https://maps.google.com/?q=${loc.lat},${loc.lng}`, '_blank')}
          >
            <span>📍</span> 開始導航
          </button>
        </div>
      </div>
    );
  };

  const renderContributeScreen = () => (
    <div className="contribute-page">
      <div className="contribute-header">
        <h1 className="contribute-title">回報設施情報</h1>
        <div className="auto-location-pill">
          📍 已自動定位：{selectedLocation?.name || '請先在地圖上選擇地點'}
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
        <label className="photo-area">
          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => console.log(e.target.files)} />
          📷 拍張現場照
        </label>

        <div className="points-card">
          <span className="points-text">貢獻者積分</span>
          <span className="points-badge">+50 徽章</span>
        </div>

        <button 
          className="submit-btn" 
          onClick={() => {
            console.log('Submitted payload:', {
              locationId: selectedLocation?.id,
              facilities: contributeAmenities
            });
            alert('情報送出成功！');
          }}
        >
          <span>🚀</span> 送出情報，獲得 50 點
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {currentScreen === 'map' && renderMapScreen()}
      {currentScreen === 'detail' && renderDetailScreen()}
      {currentScreen === 'contribute' && renderContributeScreen()}

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button 
          className={`nav-item ${currentScreen === 'map' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('map')}
        >
          <span className="nav-icon">🗺️</span>
          地圖
        </button>
        <button 
          className={`nav-item ${currentScreen === 'detail' ? 'active' : ''}`}
          onClick={() => {
            if (selectedLocation) setCurrentScreen('detail');
            else alert('請先在地圖上選擇一個地點');
          }}
        >
          <span className="nav-icon">📋</span>
          資訊
        </button>
        <button 
          className={`nav-item ${currentScreen === 'contribute' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('contribute')}
        >
          <span className="nav-icon">➕</span>
          回報
        </button>
      </div>
    </div>
  );
}
