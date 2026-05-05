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

// --- Icons Definition (From Life To Lines style: white ring + pastel dot + name chip) ---
const createCustomIcon = (type: LocationType, locName: string, isSelected: boolean, distanceText?: string) => {
  const color = TYPE_CONFIG[type].color;
  const chipLabel = locName.length > 10 ? locName.slice(0, 10) + '…' : locName;
  const tooltip = distanceText ? `${chipLabel} · ${distanceText}` : chipLabel;

  const html = `
    <div class="marker-wrap ${isSelected ? 'selected' : ''}" style="--marker-color: ${color};">
      <div class="marker-chip">${tooltip}</div>
      <div class="marker-ring"><div class="marker-dot"></div></div>
    </div>
  `;

  return L.divIcon({
    className: '', // empty — avoid leaflet default overflow clipping
    html,
    iconSize: [110, 58],
    iconAnchor: [55, 54], // bottom-center of ring maps to coordinate
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

  // --- UGC Check-in & Badge System ---
  const [visitedLocations, setVisitedLocations] = useState<Record<string, string>>(() => {
    try { 
      const old = JSON.parse(localStorage.getItem('fft-visited') || '[]');
      if (Array.isArray(old) && old.length > 0) {
        const migrated: Record<string, string> = {};
        const today = new Date().toLocaleDateString('zh-TW');
        old.forEach((id: string) => migrated[id] = today);
        localStorage.setItem('fft-visited-badges', JSON.stringify(migrated));
        localStorage.removeItem('fft-visited');
        return migrated;
      }
      const stored = JSON.parse(localStorage.getItem('fft-visited-badges') || '{}');
      if (typeof stored === 'object' && !Array.isArray(stored)) return stored;
      return {};
    } catch { return {}; }
  });

  const [checkInLocation, setCheckInLocation] = useState<Location | null>(null);

  // Proximity check for unlocking photo upload mode
  useEffect(() => {
    if (!userLat || !userLng) return;
    let foundLoc: any = null;
    locations.forEach(loc => {
      if (!visitedLocations[loc.id] && getDistance(userLat, userLng, loc.lat, loc.lng) < 50) {
        foundLoc = loc;
      }
    });
    if (foundLoc && foundLoc.id !== checkInLocation?.id) {
      setCheckInLocation(foundLoc);
      showToast(`📍抵達【${foundLoc.name}】，請回報實景解鎖勳章！`);
    } else if (!foundLoc && checkInLocation) {
      setCheckInLocation(null);
    }
  }, [userLat, userLng, visitedLocations, checkInLocation]);

  const handleSimulateUpload = () => {
    if (!checkInLocation) return;
    const today = new Date().toLocaleDateString('zh-TW');
    setVisitedLocations(prev => {
      const updated = { ...prev, [checkInLocation.id]: today };
      localStorage.setItem('fft-visited-badges', JSON.stringify(updated));
      return updated;
    });
    showToast(`📸 感謝回報！成功解鎖【${checkInLocation.name}】勳章！`);
    setCheckInLocation(null);
  };

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



  const renderMapScreen = () => (
    <div className="map-page">
      {/* Brand Header */}
      <div className="brand-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--brand-accent)', letterSpacing: '0.1em', marginBottom: '3px' }}>35DAILY 親子探索地圖</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-navy)', lineHeight: 1.2 }}>發掘林口友善空間</div>
            <div style={{ fontSize: '11px', color: 'var(--brand-muted)', fontWeight: 600, marginTop: '3px' }}>踩點上傳照片，解鎖專屬成就徽章！</div>
          </div>
          <div style={{ width: '38px', height: '38px', background: 'var(--brand-primary-light)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, marginLeft: '12px' }}>🗺️</div>
        </div>
        {closestLoc && userLat && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '12px', color: 'var(--brand-accent)', fontWeight: 700 }}>
            📍 最近：{closestLoc.name}
          </div>
        )}
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
                    className="action-pill primary tactile-btn"
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
                    className="action-pill tactile-btn"
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
                      className="action-pill tactile-btn"
                      onClick={() => openExternal(selectedLocation.officialWebsiteUrl!)}
                    >
                      <span>🌐</span> 官方網站
                    </button>
                  )}

                  {/* 設備清單 */}
                  <button 
                    className="action-pill tactile-btn"
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


  const renderTaskScreen = () => {
    const MEDALS = [
      { id: 'first-step', title: '第一步', desc: '首次踩點', icon: '👣', unlocked: Object.keys(visitedLocations).length >= 1 },
      { id: 'nursing-3', title: '哺乳先鋒', desc: '踩點 3 個場域', icon: '🍼', unlocked: Object.keys(visitedLocations).length >= 3 },
      { id: 'linkou-hero', title: '三井探險家', desc: '解鎖林口三井', icon: '🏆', unlocked: !!visitedLocations['linkou-mitsui-1'] || !!visitedLocations['linkou-mitsui-2'] },
      { id: 'hospital', title: '長庚守護者', desc: '解鎖林口長庚', icon: '⚕️', unlocked: !!visitedLocations['linkou-cgmh'] },
      { id: 'nursing-10', title: '奶瓶大師', desc: '踩點 10 個場域', icon: '🏅', unlocked: Object.keys(visitedLocations).length >= 10 },
      { id: 'navigator', title: '育兒領航員', desc: '踩點 20 個場域', icon: '🧭', unlocked: Object.keys(visitedLocations).length >= 20 },
    ];
    const unlockedCount = MEDALS.filter(m => m.unlocked).length;

    const getMedalDate = (medalId: string) => {
      const dates = Object.values(visitedLocations);
      if (dates.length === 0) return '';
      switch(medalId) {
        case 'first-step': return dates[0];
        case 'nursing-3': return dates.length >= 3 ? dates[2] : '';
        case 'linkou-hero': return visitedLocations['linkou-mitsui-1'] || visitedLocations['linkou-mitsui-2'] || '';
        case 'hospital': return visitedLocations['linkou-cgmh'] || '';
        case 'nursing-10': return dates.length >= 10 ? dates[9] : '';
        case 'navigator': return dates.length >= 20 ? dates[19] : '';
        default: return dates[0];
      }
    };

    return (
      <div className="task-page">
        {/* Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
          padding: '56px 24px 36px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-primary-light)', letterSpacing: '0.08em', marginBottom: '10px' }}>35DAILY 親子探索地圖</div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: 'white', lineHeight: 1.25 }}>
            發掘林口友善空間<br/>解鎖專屬成就
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: 600 }}>
            上傳實景照片 · 守護育兒時光
          </div>
        </div>

        {/* Active Task (If in range) */}
        {checkInLocation ? (
          <div style={{ margin: '16px 16px 0', background: 'white', border: '2px solid var(--brand-primary)', borderRadius: '24px', padding: '22px', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ fontSize: '11px', color: 'var(--brand-accent)', fontWeight: 800, letterSpacing: '0.06em' }}>📍 偵測到您已抵達</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--brand-navy)', marginTop: '6px' }}>
              {checkInLocation.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--brand-muted)', marginTop: '4px', fontWeight: 600 }}>
              請上傳哺乳室或設備現況照片，協助更新資訊！
            </div>
            <button
              className="tactile-btn"
              style={{
                width: '100%', marginTop: '16px',
                background: 'var(--brand-primary)', color: 'var(--brand-navy)',
                padding: '17px', borderRadius: '16px',
                fontSize: '16px', fontWeight: 800, borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              }}
              onClick={handleSimulateUpload}
            >
              📸 模擬上傳照片並解鎖勳章
            </button>
          </div>
        ) : (
          <div style={{ margin: '16px 16px 0', background: 'var(--brand-bg)', borderRadius: '24px', padding: '22px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--brand-muted)', fontWeight: 700 }}>
              尚未到達任何場域。<br/>請至地圖探索，靠近場域 50m 內即可解鎖回報任務！
            </div>
            <button
              className="tactile-btn"
              style={{
                width: '100%', marginTop: '16px',
                background: 'var(--brand-secondary)', color: 'white',
                padding: '17px', borderRadius: '16px',
                fontSize: '16px', fontWeight: 800, borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              }}
              onClick={() => setCurrentScreen('map')}
            >
              🗺️ 前往地圖探索
            </button>
          </div>
        )}

        {/* Medal Album */}
        <div style={{ margin: '24px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-navy)' }}>🏅 我的成就徽章冊</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-muted)' }}>{unlockedCount}/{MEDALS.length} 解鎖</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {MEDALS.map(medal => {
              const date = getMedalDate(medal.id);
              return (
                <div key={medal.id} style={{
                  background: medal.unlocked ? 'white' : '#ECE8EF',
                  borderRadius: '20px',
                  padding: '16px 8px',
                  textAlign: 'center',
                  boxShadow: medal.unlocked ? 'var(--shadow-soft)' : 'none',
                  border: medal.unlocked ? '2px solid var(--brand-primary)' : '2px dashed #D1C4E9',
                  transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px', filter: medal.unlocked ? 'none' : 'grayscale(100%) opacity(0.5)' }}>
                    {medal.unlocked ? medal.icon : '🔒'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: medal.unlocked ? 'var(--brand-navy)' : 'var(--brand-muted)', lineHeight: 1.2 }}>{medal.title}</div>
                  <div style={{ fontSize: '10px', color: medal.unlocked ? 'var(--brand-secondary)' : '#A3A3A3', fontWeight: 600, marginTop: '4px' }}>
                    {medal.unlocked ? date : medal.desc}
                  </div>
                </div>
              );
            })}
          </div>
          {Object.keys(visitedLocations).length >= 1 && (
            <button
              className="tactile-btn"
              onClick={() => showToast('🎨 成就證書功能將於正式版啟動，敬請期待！')}
              style={{
                width: '100%', marginTop: '16px',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                color: 'white', border: 'none',
                padding: '15px', borderRadius: '16px',
                fontSize: '15px', fontWeight: 800
              }}
            >
              🔗 分享成就海報（IG 演算法流量）
            </button>
          )}
        </div>
      </div>
    );
  };

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
      {currentScreen === 'contribute' && renderTaskScreen()}

      {/* Bottom Nav */}
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
