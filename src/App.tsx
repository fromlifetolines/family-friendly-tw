import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import './App.css';
import { locations, FACILITY_LABELS, TYPE_CONFIG } from './data/locations';
import type { Location, FacilityType, LocationType } from './data/locations';

// --- Types ---
type Screen = 'map' | 'detail' | 'contribute';

const ALL_FACILITIES = Object.keys(FACILITY_LABELS) as FacilityType[];

// --- Icons Definition ---
const createCustomIcon = (type: LocationType, isSelected: boolean, distanceText?: string) => {
  const config = TYPE_CONFIG[type];
  const color = config.color;
  const emoji = config.emoji;
  
  const borderStyle = isSelected ? '3px solid #1E2D5A' : '3px solid white';
  const transformStyle = isSelected ? 'rotate(-45deg) scale(1.3)' : 'rotate(-45deg)';
  const shadowStyle = isSelected ? '0 4px 16px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.25)';
  
  const distanceBadge = distanceText ? `
    <div style="
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: var(--brand-navy);
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 10px;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      pointer-events: none;
    ">${distanceText}</div>
  ` : '';

  const html = `
    <div style="position: relative;">
      <div style="
        width: 40px; height: 40px;
        background: ${color};
        border-radius: 50% 50% 50% 4px;
        transform: ${transformStyle};
        border: ${borderStyle};
        box-shadow: ${shadowStyle};
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      ">
        <span style="transform: rotate(45deg); font-size: 18px">${emoji}</span>
      </div>
      ${distanceBadge}
    </div>
  `;

  return L.divIcon({
    className: 'custom-pin-wrapper',
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

// --- Helpers ---
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2-lat1) * Math.PI/180
  const dLng = (lng2-lng1) * Math.PI/180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function getDistanceText(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dist = getDistance(lat1, lng1, lat2, lng2);
  if (dist < 500) {
    const mins = Math.ceil(dist / 80);
    return `步行 ${mins} 分鐘`;
  } else {
    return `${(dist / 1000).toFixed(1)} 公里`;
  }
}

function isOpenNow(openHours: string) {
  if (openHours.includes('24小時') || openHours.includes('全天開放')) return true;
  try {
    const timeStr = openHours.replace('–', '-').replace(' ', '');
    const [start, end] = timeStr.split('-');
    if (!start || !end) return true;
    
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    const [sH, sM] = start.split(':').map(Number);
    const startMins = sH * 60 + (sM || 0);
    
    const [eH, eM] = end.split(':').map(Number);
    let endMins = eH * 60 + (eM || 0);
    if (endMins < startMins) endMins += 24 * 60; // passes midnight
    
    let currentMinsCheck = currentMins;
    if (currentMins < startMins && endMins > 24 * 60) {
        currentMinsCheck += 24 * 60;
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
  const [locationName, setLocationName] = useState('定位中...');
  
  const [contributeAmenities, setContributeAmenities] = useState<FacilityType[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=zh-TW`)
            .then(r => r.json())
            .then(d => {
              if (d && d.display_name) {
                setLocationName(d.display_name.split(',')[0]);
              } else {
                setLocationName('無法取得地址');
              }
            })
            .catch(() => setLocationName('無法取得地址'));
        },
        () => {
          // 定位失敗時預設台北信義區
          setUserLat(25.0408);
          setUserLng(121.5674);
          setLocationName('台北市信義區');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUserLat(25.0408);
      setUserLng(121.5674);
      setLocationName('台北市信義區');
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
        <span>目前位置：{locationName}</span>
        <span>📍</span>
      </div>

      <MapContainer 
        center={[25.0408, 121.5674]} 
        zoom={14} 
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full z-[10]"
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {filteredLocations.map(loc => {
          const isSelected = selectedLocation?.id === loc.id;
          let distanceText: string | undefined;
          
          if (userLat !== null && userLng !== null) {
            distanceText = getDistanceText(userLat, userLng, loc.lat, loc.lng);
          }
          
          return (
            <Marker 
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={createCustomIcon(loc.type, isSelected, distanceText)}
              eventHandlers={{
                click: () => handleMarkerClick(loc)
              }}
              zIndexOffset={isSelected ? 1000 : 0}
            />
          );
        })}
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
              {FACILITY_LABELS[key]}
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
      distanceText = getDistanceText(userLat, userLng, loc.lat, loc.lng) + '・';
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
            attributionControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <Marker position={[loc.lat, loc.lng]} icon={createCustomIcon(loc.type, true)} />
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
                  <span style={{ fontSize: '24px' }}>{FACILITY_LABELS[key].split(' ')[0]}</span>
                  <span>{FACILITY_LABELS[key].split(' ')[1]}</span>
                  {fac?.note && <span style={{ fontSize: '10px', marginTop: '4px', color: 'var(--brand-coral)' }}>{fac.note}</span>}
                </div>
              );
            })}
          </div>

          <div className="ad-banner">
            <span style={{ fontSize: '24px' }}>💡</span>
            <span>需要嬰兒用品？點此查看附近優惠</span>
          </div>

          {loc.website && (
            <button 
              className="cta-btn-outline"
              onClick={() => window.open(loc.website, '_blank')}
            >
              <span>🌐</span> 官方網站
            </button>
          )}

          <button 
            className="cta-btn"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}&travelmode=walking`;
              window.open(url, '_blank');
            }}
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
                <span style={{ fontSize: '28px' }}>{FACILITY_LABELS[key].split(' ')[0]}</span>
                <span>{FACILITY_LABELS[key].split(' ')[1]}</span>
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
