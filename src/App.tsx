import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import './App.css';
import { locations, FACILITY_LABELS, TYPE_CONFIG } from './data/locations';
import type { Location, FacilityType, LocationType } from './data/locations';
import Header from './components/layout/Header';

// --- Types ---
type Screen = 'map' | 'contribute';

const ALL_FACILITIES = Object.keys(FACILITY_LABELS) as FacilityType[];

// --- Icons Definition (From Life To Lines style: white ring + pastel dot + name chip) ---
const createCustomIcon = (type: LocationType, locName: string, isSelected: boolean, isBadgeUnlocked: boolean, distanceText?: string) => {
  const color = TYPE_CONFIG[type].color;
  const chipLabel = locName.length > 10 ? locName.slice(0, 10) + '…' : locName;
  const tooltip = distanceText ? `${chipLabel} · ${distanceText}` : chipLabel;

  const html = `
    <div class="marker-wrap ${isSelected ? 'selected' : ''}" style="--marker-color: ${color};">
      <div class="marker-chip">${tooltip}</div>
      <div class="marker-ring">
        <div class="marker-dot"></div>
        ${isBadgeUnlocked ? `<div style="position:absolute; top:-12px; right:-12px; font-size: 16px; z-index: 10; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">✨</div>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    className: '', 
    html,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [locationsList, setLocationsList] = useState<Location[]>(locations);
  
  useEffect(() => {
    // Fetch dynamic government data from Taipei Open Data (synced via script)
    fetch('/data/map-locations.json')
      .then(res => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setLocationsList(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const uniqueNewData = (data as Location[]).filter((l: Location) => !existingIds.has(l.id));
            return [...prev, ...uniqueNewData];
          });
        }
      })
      .catch(() => console.log('Notice: No dynamic data found or fetch failed. Using seed data only.'));
  }, []);

  
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [closestLoc, setClosestLoc] = useState<Location | null>(null);
  
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // --- Badge System State ---
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('userBadges') || '[]');
    } catch { return []; }
  });

  const checkIn = (placeId: string) => {
    const loc = locationsList.find(l => l.id === placeId);
    if (!loc || !loc.badge || !userLat || !userLng) return;

    const distance = getDistance(userLat, userLng, loc.lat, loc.lng);
    if (distance <= 100) {
      if (!unlockedBadges.includes(loc.badge.id)) {
        const newBadges = [...unlockedBadges, loc.badge.id];
        setUnlockedBadges(newBadges);
        localStorage.setItem('userBadges', JSON.stringify(newBadges));
        showToast(`✨ 恭喜！成功解鎖『${loc.badge.name}』徽章！`);
      } else {
        showToast(`你已經擁有『${loc.badge.name}』徽章了！`);
      }
    } else {
      showToast(`📍 距離太遠了（${(distance).toFixed(0)}m），需在 100m 內才能解鎖徽章。`);
    }
  };

  const isBadgeUnlocked = (badgeId?: string) => {
    if (!badgeId) return false;
    return unlockedBadges.includes(badgeId);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const updateUserLocation = useCallback((lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);
    let minDist = Infinity;
    let closest: Location | null = null;
    locationsList.forEach(loc => {
      const d = getDistance(lat, lng, loc.lat, loc.lng);
      if (d < minDist) { minDist = d; closest = loc; }
    });
    setClosestLoc(closest);
  }, [locationsList]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateUserLocation(lat, lng);
          // Only auto-fly on first position lock
          if (mapInstance && !userLat) {
            mapInstance.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [mapInstance, updateUserLocation, userLat]);

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
    setSelectedLocation(null);
  };

  const handleMarkerClick = (loc: Location) => {
    setSelectedLocation(loc);
    if (mapInstance) {
      mapInstance.flyTo([loc.lat - 0.003, loc.lng], 15, { animate: true, duration: 1.2 });
    }
  };

  const filteredLocations = locationsList.filter(loc => {
    // Category filter
    const matchesCategory = selectedCategory === '全部' || 
      (selectedCategory === '玩樂' && ['park', 'play'].includes(loc.type)) ||
      (selectedCategory === '美食' && loc.type === 'restaurant') ||
      (selectedCategory === '休息' && ['hospital', 'transport', 'mall'].includes(loc.type));

    if (!matchesCategory) return false;

    const matchesSearch = searchQuery === '' || 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      loc.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeFilters.length === 0) return true;
    return activeFilters.every(filter => 
      loc.facilities.some(f => f.id === filter && f.available)
    );
  });

  const renderMapScreen = () => (
    <div className="map-page">
      <Header 
        onSearch={setSearchQuery}
        onCategorySelect={setSelectedCategory}
        unlockedBadgesCount={unlockedBadges.length}
        onBadgeClick={() => setCurrentScreen('contribute')}
      />

      <div style={{ position: 'fixed', top: '180px', left: '20px', zIndex: 100 }}>
        {closestLoc && userLat && (
          <div className="glass-panel" style={{ 
            padding: '8px 16px', 
            fontSize: '12px', 
            color: 'var(--liquid-cyan)', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px' 
          }}>
            <span style={{ fontSize: '14px' }}>📍</span> 最近：{closestLoc.name}
          </div>
        )}
      </div>

      <MapContainer 
        ref={setMapInstance}
        center={[25.0408, 121.5674]} 
        zoom={11} 
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full z-[10]"
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {filteredLocations.map(loc => {
          const isUnlocked = loc.badge ? unlockedBadges.includes(loc.badge.id) : false;
          return (
            <Marker 
              key={loc.id} 
              position={[loc.lat, loc.lng]} 
              icon={createCustomIcon(
                loc.type, 
                loc.name, 
                selectedLocation?.id === loc.id,
                isUnlocked,
                userLat && userLng ? getDistanceText(userLat, userLng, loc.lat, loc.lng) : undefined
              )}
            >
              <Popup className="premium-popup">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px', padding: '4px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--liquid-text)' }}>{loc.name}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--liquid-muted)' }}>{loc.address}</p>
                  </div>

                  {loc.badge && (
                    <button
                      onClick={() => checkIn(loc.id)}
                      className="tactile-btn"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        ...(isUnlocked ? {
                          background: 'linear-gradient(135deg, #34C759 0%, #007AFF 100%)',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)',
                          pointerEvents: 'none'
                        } : {
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--liquid-cyan)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        })
                      }}
                    >
                      {isUnlocked ? '✨ 已解鎖成就' : '📍 抵達解鎖徽章'}
                    </button>
                  )}
                  
                  <button 
                    className="tactile-btn"
                    onClick={() => {
                      handleMarkerClick(loc);
                    }}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)', color: 'var(--liquid-text)',
                      fontSize: '12px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    查看設施詳情
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLat !== null && userLng !== null && (
          <Marker 
            position={[userLat, userLng]}
            icon={L.divIcon({
              className: 'user-location-marker',
              html: `<div style="width: 14px; height: 14px; background: #007AFF; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 12px rgba(0,122,255,0.6);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
            zIndexOffset={2000}
          />
        )}
      </MapContainer>

      {/* GPS Button */}
      <button
        className="gps-btn tactile-btn"
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
              className={`quick-filter-btn tactile-btn ${isActive ? 'active' : ''}`}
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
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.5)', zIndex: 1500,
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
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
                      background: 'linear-gradient(135deg, rgba(0,122,255,0.05) 0%, rgba(245,245,247,1) 100%)',
                      gap: '12px'
                    }}
                  >
                    <div dangerouslySetInnerHTML={{ 
                        __html: `<svg viewBox="0 0 24 24" style="width: 48px; height: 48px; stroke: #86868B; stroke-width: 1.5; fill: none; opacity: 0.5;">${TYPE_CONFIG[selectedLocation.type].svg}</svg>` 
                      }} 
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#86868B' }}>親子友善地圖</span>
                  </div>
                )}
                
                <div className="sheet-header">
                  <div className="sheet-title">{selectedLocation.name}</div>
                  <div className="sheet-subtitle">{selectedLocation.branch} • {selectedLocation.openHours}</div>
                </div>

                {/* Description & Tags */}
                <div style={{ padding: '0 24px 16px 24px' }}>
                  {selectedLocation.desc && (
                    <p style={{ fontSize: '14px', color: 'var(--liquid-muted)', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                      {selectedLocation.desc}
                    </p>
                  )}
                  {selectedLocation.tags && (
                    <div className="amenity-tags">
                      {selectedLocation.tags.map(tag => (
                        <span key={tag} className="amenity-tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pill-actions">
                  <button 
                    className="action-pill primary tactile-btn"
                    onClick={() => {
                      const destLat = selectedLocation.lat;
                      const destLng = selectedLocation.lng;
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destLat + ',' + destLng)}&travelmode=walking`;
                      openExternal(url);
                    }}
                  >
                    <span>📍</span> 一鍵導航
                  </button>
                  
                  {selectedLocation.badge && (
                    <button 
                      className={`badge-btn ${isBadgeUnlocked(selectedLocation.badge.id) ? 'unlocked' : 'locked'} tactile-btn`}
                      onClick={() => checkIn(selectedLocation.id)}
                    >
                      {isBadgeUnlocked(selectedLocation.badge.id) ? (
                        <><span>✨</span> 已解鎖『{selectedLocation.badge.name}』</>
                      ) : (
                        <><span>📍</span> 抵達解鎖徽章</>
                      )}
                    </button>
                  )}
                  
                  <button 
                    className="action-pill tactile-btn"
                    onClick={() => {
                      if (selectedLocation.mapUrl) openExternal(selectedLocation.mapUrl);
                      else if (selectedLocation.floorGuideUrl) openExternal(selectedLocation.floorGuideUrl);
                      else showToast('🗺️ 尚未提供樓層指南');
                    }}
                  >
                    <span>🖼️</span> 樓層指南
                  </button>

                  {selectedLocation.officialWebsiteUrl && (
                    <button 
                      className="action-pill tactile-btn"
                      onClick={() => openExternal(selectedLocation.officialWebsiteUrl!)}
                    >
                      <span>🌐</span> 官網
                    </button>
                  )}
                </div>

                <div id="facility-section" className="section-title">提供設施</div>
                <div className="amenity-grid-3" style={{ paddingBottom: '32px' }}>
                  {ALL_FACILITIES.map(key => {
                    const fac = selectedLocation.facilities.find(f => f.id === key);
                    const isAvailable = fac?.available ?? false;
                    return (
                      <div key={key} className={`amenity-card tactile-btn ${isAvailable ? 'active' : 'inactive'}`}>
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

  const renderTaskScreen = () => {
    // Get all possible badges from locationsList
    const discoveryBadges = locationsList
      .filter(l => l.badge)
      .map(l => ({ ...l.badge!, placeName: l.name, placeId: l.id }));
    const unlockedCount = unlockedBadges.length;

    return (
      <div className="task-page no-scrollbar" style={{ overflowY: 'auto', height: '100vh' }}>
        <div style={{
          background: 'linear-gradient(135deg, #007AFF 0%, #00F2FF 100%)',
          padding: '64px 24px 40px',
          textAlign: 'center',
          color: 'white',
          borderRadius: '0 0 32px 32px',
          boxShadow: '0 12px 32px rgba(0,122,255,0.3)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.8, letterSpacing: '0.1em', marginBottom: '8px' }}>LIFE TO LINES</div>
          <div style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1.1 }}>探索成就</div>
        </div>

        <div style={{ padding: '24px 20px 120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--liquid-text)' }}>🏅 徽章收藏冊</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--liquid-cyan)' }}>{unlockedCount} / {discoveryBadges.length}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {discoveryBadges.map(badge => {
              const isUnlocked = unlockedBadges.includes(badge.id);
              return (
                <div 
                  key={badge.id} 
                  className={`medal-card ${isUnlocked ? 'medal-shimmer medal-glow' : ''}`}
                  style={{
                    background: isUnlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                    opacity: isUnlocked ? 1 : 0.5,
                    filter: isUnlocked ? 'none' : 'grayscale(100%)'
                  }}
                  onClick={() => {
                    if (!isUnlocked) {
                      const loc = locationsList.find(l => l.id === badge.placeId);
                      if (loc) {
                        setCurrentScreen('map');
                        setSelectedLocation(loc);
                        if (mapInstance) mapInstance.flyTo([loc.lat, loc.lng], 15);
                      }
                    }
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>{badge.icon}</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--liquid-text)' }}>{badge.name}</div>
                  <div style={{ fontSize: '11px', color: isUnlocked ? 'var(--liquid-cyan)' : 'var(--liquid-muted)', fontWeight: 700, marginTop: '4px' }}>
                    {isUnlocked ? badge.placeName : '尚未解鎖'}
                  </div>
                </div>
              );
            })}
          </div>

          {unlockedCount > 0 && (
            <button
              className="action-pill primary tactile-btn"
              style={{ width: '100%', marginTop: '32px', padding: '18px' }}
              onClick={() => showToast('🎨 成就海報生成中...')}
            >
              🔗 分享我的探索成就
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${selectedLocation ? 'sheet-open' : ''}`}>
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}

      {currentScreen === 'map' && renderMapScreen()}
      {currentScreen === 'contribute' && renderTaskScreen()}

      <div className="bottom-nav">
        <button 
          className={`nav-item tactile-btn ${currentScreen === 'map' ? 'active' : ''}`}
          onClick={() => { setCurrentScreen('map'); setSelectedLocation(null); }}
        >
          <span className="nav-icon">🗺️</span>
          地圖探索
        </button>
        <button 
          className={`nav-item tactile-btn ${currentScreen === 'contribute' ? 'active' : ''}`}
          onClick={() => { setCurrentScreen('contribute'); setSelectedLocation(null); }}
        >
          <span className="nav-icon">🏅</span>
          探索任務
        </button>
      </div>
    </div>
  );
}
