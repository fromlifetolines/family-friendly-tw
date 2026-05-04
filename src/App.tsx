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
const createCustomIcon = (type: LocationType, locName: string, isSelected: boolean, distanceText?: string) => {
  const config = TYPE_CONFIG[type];
  const color = config.color;
  const svg = config.svg;
  
  const tooltipText = distanceText ? `${locName} · ${distanceText}` : locName;
  
  const html = `
    <div class="marker-container ${isSelected ? 'selected' : ''}" style="--marker-color: ${color};">
      <svg class="marker-icon" viewBox="0 0 24 24">${svg}</svg>
      <div class="marker-tooltip">${tooltipText}</div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-pin-wrapper',
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
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

/**
 * Safely opens an external URL in a new tab.
 * Uses noopener + noreferrer to prevent the new tab from accessing
 * window.opener, protecting PWA session from being overridden.
 */
function openExternal(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('map');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [activeFilters, setActiveFilters] = useState<FacilityType[]>([]);
  
  // GPS State: null = not yet fetched, explicit coords when ready
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [closestLoc, setClosestLoc] = useState<Location | null>(null);
  
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [contributeAmenities, setContributeAmenities] = useState<FacilityType[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const updateUserLocation = (lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);
    let minDist = Infinity;
    let closest: Location | null = null;
    locations.forEach(loc => {
      const d = getDistance(lat, lng, loc.lat, loc.lng);
      if (d < minDist) { minDist = d; closest = loc; }
    });
    setClosestLoc(closest);
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateUserLocation(pos.coords.latitude, pos.coords.longitude),
        () => {}, // Silent fail on initial load
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const handleGPSLocate = () => {
    if (!navigator.geolocation) {
      showToast('⚠️ 您的裝置不支援 GPS 定位');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateUserLocation(lat, lng);
        if (mapInstance) {
          mapInstance.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          showToast('📍 請允許定位權限，以協助您尋找最近的親子空間。');
          // Graceful fallback to Taiwan overview
          if (mapInstance) mapInstance.flyTo([25.0330, 121.5654], 12, { animate: true });
        } else {
          showToast('⚠️ 定位超時，請確認網路連線後再試一次。');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
              icon={createCustomIcon(loc.type, loc.name, isSelected, distanceText)}
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
        disabled={gpsLoading}
        style={{ 
          transform: selectedLocation ? 'translateY(-60vh)' : 'translateY(0)',
          opacity: gpsLoading ? 0.6 : 1,
        }}
      >
        {gpsLoading ? '⌛' : '📍'}
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
                  <div 
                    className="sheet-photo" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--brand-coral-light) 0%, var(--brand-cream) 100%)',
                      gap: '12px'
                    }}
                  >
                    <div dangerouslySetInnerHTML={{ 
                        __html: `<svg viewBox="0 0 24 24" style="width: 48px; height: 48px; stroke: var(--brand-coral-dark); stroke-width: 1.5; fill: none; opacity: 0.8;">${TYPE_CONFIG[selectedLocation.type].svg}</svg>` 
                      }} 
                    />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-coral-dark)', opacity: 0.8 }}>場域實景處理中</span>
                  </div>
                )}
                
                <div className="sheet-header">
                  <div className="sheet-title">{selectedLocation.name}</div>
                  <div className="sheet-subtitle">{selectedLocation.branch} • {selectedLocation.openHours}</div>
                </div>

                <div className="pill-actions">
                  {/* 一鍵導航 */}
                  <button 
                    className="action-pill primary"
                    onClick={() => {
                      const destLat = selectedLocation.navLat ?? selectedLocation.lat;
                      const destLng = selectedLocation.navLng ?? selectedLocation.lng;
                      let url: string;
                      if (userLat !== null && userLng !== null) {
                        url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(userLat + ',' + userLng)}&destination=${encodeURIComponent(destLat + ',' + destLng)}&travelmode=walking`;
                      } else {
                        url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destLat + ',' + destLng)}&travelmode=walking`;
                      }
                      openExternal(url);
                    }}
                  >
                    <span>📍</span> 一鍵導航
                  </button>
                  
                  {/* 樓層平面圖 */}
                  <button 
                    className="action-pill"
                    onClick={() => {
                      if (selectedLocation.mapUrl) {
                        openExternal(selectedLocation.mapUrl);
                      } else {
                        showToast('🗺️ 該場域尚未提供樓層平面圖');
                      }
                    }}
                  >
                    <span>🗺️</span> 樓層平面圖
                  </button>

                  {/* 官方網站 — 僅在有 officialWebsiteUrl 時顯示 */}
                  {selectedLocation.officialWebsiteUrl && (
                    <button 
                      className="action-pill"
                      onClick={() => openExternal(selectedLocation.officialWebsiteUrl!)}
                    >
                      <span>🌐</span> 官方網站
                    </button>
                  )}

                  {/* 設備清單 */}
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
    <div className={`app-container ${selectedLocation ? 'sheet-open' : ''}`}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--brand-navy)',
          color: 'white',
          padding: '14px 20px',
          borderRadius: 'var(--r-pill)',
          fontSize: '14px',
          fontWeight: 700,
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-float)',
          animation: 'fade-in 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

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
