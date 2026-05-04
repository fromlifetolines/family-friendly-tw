import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import './App.css';
import { locations, FACILITY_LABELS, TYPE_CONFIG } from './data/locations';
import type { Location, FacilityType, LocationType } from './data/locations';

// --- Types ---
type Screen = 'map' | 'contribute';

const ALL_FACILITIES = Object.keys(FACILITY_LABELS) as FacilityType[];

// --- Icons Definition ---
const createCustomIcon = (type: LocationType, isSelected: boolean, distanceText?: string) => {
  const config = TYPE_CONFIG[type];
  const color = config.color;
  const emoji = config.emoji;
  
  const borderStyle = isSelected ? '3px solid var(--brand-navy)' : '3px solid white';
  const transformStyle = isSelected ? 'rotate(-45deg) scale(1.3)' : 'rotate(-45deg)';
  const shadowStyle = isSelected ? 'var(--shadow-float)' : 'var(--shadow-soft)';
  
  const distanceBadge = distanceText ? `
    <div style="
      position: absolute;
      top: -24px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: var(--brand-navy);
      font-size: 11px;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: var(--r-pill);
      white-space: nowrap;
      box-shadow: var(--shadow-soft);
      pointer-events: none;
    ">${distanceText}</div>
  ` : '';

  const html = `
    <div style="position: relative;">
      <div style="
        width: 44px; height: 44px;
        background: ${color};
        border-radius: 50% 50% 50% 8px;
        transform: ${transformStyle};
        border: ${borderStyle};
        box-shadow: ${shadowStyle};
        display: flex; align-items: center; justify-content: center;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        <span style="transform: rotate(45deg); font-size: 20px">${emoji}</span>
      </div>
      ${distanceBadge}
    </div>
  `;

  return L.divIcon({
    className: 'custom-pin-wrapper',
    html,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
  });
};

const createUserIcon = () => {
  return L.divIcon({
    className: 'user-pin-wrapper',
    html: `
      <div style="
        width: 20px; height: 20px;
        background: var(--brand-green);
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 0 12px rgba(0,0,0,0.15);
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('map');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [activeFilters, setActiveFilters] = useState<FacilityType[]>([]);
  
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [closestLoc, setClosestLoc] = useState<Location | null>(null);
  
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [contributeAmenities, setContributeAmenities] = useState<FacilityType[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          
          let minDist = Infinity;
          let closest: Location | null = null;
          locations.forEach(loc => {
            const d = getDistance(lat, lng, loc.lat, loc.lng);
            if (d < minDist) {
              minDist = d;
              closest = loc;
            }
          });
          setClosestLoc(closest);
        },
        () => {
          // 定位失敗
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const handleGPSLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          
          if (mapInstance) {
            mapInstance.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
          }

          let minDist = Infinity;
          let closest: Location | null = null;
          locations.forEach(loc => {
            const d = getDistance(lat, lng, loc.lat, loc.lng);
            if (d < minDist) {
              minDist = d;
              closest = loc;
            }
          });
          setClosestLoc(closest);
        },
        () => alert('無法取得位置資訊'),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const toggleFilter = (id: FacilityType) => {
    setActiveFilters(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
    setSelectedLocation(null); // Close bottom sheet on filter change
  };

  const handleMarkerClick = (loc: Location) => {
    setSelectedLocation(loc);
    if (mapInstance) {
      // Pan slightly down so the marker isn't covered by the bottom sheet
      mapInstance.flyTo([loc.lat - 0.003, loc.lng], 15, { animate: true, duration: 0.8 });
    }
  };

  const filteredLocations = activeFilters.length > 0
    ? locations.filter(loc => 
        activeFilters.every(filter => 
          loc.facilities.some(f => f.id === filter && f.available)
        )
      )
    : locations;

  // Header Context Logic
  let headerTitle = "🗺️ 親子友善空間地圖";
  let headerSub = "為您找到附近最適合寶寶的地點";
  
  if (userLat && userLng && closestLoc) {
    const dist = getDistance(userLat, userLng, closestLoc.lat, closestLoc.lng);
    if (dist < 2000) { // Only show if within 2km
      const distStr = dist < 500 ? `${Math.round(dist)} 公尺` : `${(dist / 1000).toFixed(1)} 公里`;
      headerTitle = `📍 距離 ${closestLoc.name}`;
      headerSub = `最近的友善設施僅 ${distStr}！`;
    }
  }

  const renderMapScreen = () => (
    <div className="map-page">
      {/* Contextual Header */}
      <div className="context-header">
        <div className="context-header-title">{headerTitle}</div>
        <div className="context-header-sub">{headerSub}</div>
      </div>

      <MapContainer 
        ref={setMapInstance}
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

        {userLat !== null && userLng !== null && (
          <Marker 
            position={[userLat, userLng]} 
            icon={createUserIcon()} 
            zIndexOffset={2000} 
          />
        )}
      </MapContainer>

      {/* GPS Button */}
      <button
        className="gps-btn"
        onClick={handleGPSLocate}
        style={{ transform: selectedLocation ? 'translateY(-60vh)' : 'translateY(0)' }} // Move up if sheet is open
      >
        📍
      </button>

      {/* Quick Filter */}
      <div 
        className="quick-filter-scroll no-scrollbar"
        style={{ 
          opacity: selectedLocation ? 0 : 1,
          pointerEvents: selectedLocation ? 'none' : 'auto',
          transform: selectedLocation ? 'translateY(20px)' : 'translateY(0)'
        }}
      >
        {ALL_FACILITIES.map(key => {
          const isActive = activeFilters.includes(key);
          return (
            <button 
              key={key}
              className={`quick-filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => toggleFilter(key)}
            >
              <span style={{ fontSize: '18px' }}>{FACILITY_LABELS[key].split(' ')[0]}</span>
              <span>{FACILITY_LABELS[key].split(' ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Sheet Detail View */}
      <AnimatePresence>
        {selectedLocation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'black', zIndex: 1500
              }}
              onClick={() => setSelectedLocation(null)}
            />
            <motion.div
              className="bottom-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) setSelectedLocation(null);
              }}
            >
              <div className="sheet-drag-handle" />
              
              <div className="sheet-content">
                {selectedLocation.photos && selectedLocation.photos.length > 0 ? (
                  <img src={selectedLocation.photos[0]} className="sheet-photo" alt={selectedLocation.name} />
                ) : (
                  <div className="sheet-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                    {TYPE_CONFIG[selectedLocation.type].emoji}
                  </div>
                )}
                
                <div className="sheet-header">
                  <div className="sheet-title">{selectedLocation.name}</div>
                  <div className="sheet-subtitle">{selectedLocation.branch} • {selectedLocation.openHours}</div>
                </div>

                <div className="pill-actions">
                  <button 
                    className="action-pill primary"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}&travelmode=walking`;
                      window.open(url, '_blank');
                    }}
                  >
                    <span>📍</span> 一鍵導航
                  </button>
                  <button className="action-pill">
                    <span>🗺️</span> 樓層平面圖
                  </button>
                  <button 
                    className="action-pill"
                    onClick={() => {
                      document.getElementById('facility-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span>✨</span> 設備清單
                  </button>
                </div>

                <div id="facility-section" className="section-title">提供設施</div>
                <div className="amenity-grid-3">
                  {ALL_FACILITIES.map(key => {
                    const fac = selectedLocation.facilities.find(f => f.id === key);
                    const isAvailable = fac?.available ?? false;
                    
                    return (
                      <div key={key} className={`amenity-card ${isAvailable ? 'active' : 'inactive'}`}>
                        <div className="amenity-card-icon">{FACILITY_LABELS[key].split(' ')[0]}</div>
                        <div className="amenity-card-label">{FACILITY_LABELS[key].split(' ')[1]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  const renderContributeScreen = () => (
    <div className="contribute-page">
      <h1 className="contribute-title">回報情報</h1>
      <p style={{ color: 'var(--brand-muted)', marginBottom: '24px', fontWeight: 600 }}>
        選擇您目前所在的設施，並更新情報。
      </p>

      <div style={{ marginBottom: '32px' }}>
        {ALL_FACILITIES.map(key => {
          const isSelected = contributeAmenities.includes(key);
          return (
            <button 
              key={key}
              onClick={() => {
                setContributeAmenities(prev => 
                  prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
                );
              }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '20px',
                marginBottom: '12px',
                background: isSelected ? 'var(--brand-navy)' : 'white',
                color: isSelected ? 'white' : 'var(--brand-navy)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: 800,
                boxShadow: 'var(--shadow-soft)',
                border: isSelected ? 'none' : '1px solid rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '24px' }}>{FACILITY_LABELS[key].split(' ')[0]}</span>
              {FACILITY_LABELS[key].split(' ')[1]}
            </button>
          );
        })}
      </div>

      <button 
        style={{
          width: '100%',
          padding: '18px',
          background: 'var(--brand-coral)',
          color: 'var(--brand-navy)',
          borderRadius: 'var(--r-pill)',
          fontWeight: 800,
          fontSize: '16px',
          boxShadow: 'var(--shadow-float)'
        }}
        onClick={() => {
          alert('情報送出成功！獲得貢獻積分。');
          setCurrentScreen('map');
        }}
      >
        🚀 送出情報
      </button>
    </div>
  );

  return (
    <div className="app-container">
      {currentScreen === 'map' && renderMapScreen()}
      {currentScreen === 'contribute' && renderContributeScreen()}

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button 
          className={`nav-item ${currentScreen === 'map' ? 'active' : ''}`}
          onClick={() => {
            setCurrentScreen('map');
            setSelectedLocation(null);
          }}
        >
          <span className="nav-icon">🗺️</span>
          地圖探索
        </button>
        <button 
          className={`nav-item ${currentScreen === 'contribute' ? 'active' : ''}`}
          onClick={() => {
            setCurrentScreen('contribute');
            setSelectedLocation(null);
          }}
        >
          <span className="nav-icon">➕</span>
          共同編輯
        </button>
      </div>
    </div>
  );
}
