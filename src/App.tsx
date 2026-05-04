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

  // --- Check-in & Badge System ---
  const [visitedLocations, setVisitedLocations] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fft-visited') || '[]'); } catch { return []; }
  });

  // Auto check-in when within 150m of a location
  useEffect(() => {
    if (!userLat || !userLng) return;
    locations.forEach(loc => {
      if (!visitedLocations.includes(loc.id) && getDistance(userLat, userLng, loc.lat, loc.lng) < 150) {
        setVisitedLocations(prev => {
          const updated = [...prev, loc.id];
          localStorage.setItem('fft-visited', JSON.stringify(updated));
          return updated;
        });
        showToast(`🏅 成功抵達！解鎖「${loc.name}」探險家勳章`);
      }
    });
  }, [userLat, userLng]);

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
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#FFA07A', letterSpacing: '0.1em', marginBottom: '3px' }}>FROM LIFE TO LINES</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#262626', lineHeight: 1.2 }}>尋找親子友善空間</div>
            <div style={{ fontSize: '11px', color: '#A3A3A3', fontWeight: 600, marginTop: '3px' }}>林口三井·願院·捷運站，哺乳室設施一鍵直達</div>
          </div>
          <div style={{ width: '38px', height: '38px', background: '#FFD8C4', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, marginLeft: '12px' }}>🗺️</div>
        </div>
        {closestLoc && userLat && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '12px', color: '#FFA07A', fontWeight: 700 }}>
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

  const REWARDS = [
    { brand: '林口三井 Outlet', title: '童裝品牌限量 9 折券', coins: 500, color: '#FFD8C4' },
    { brand: '林口長庚周邊', title: '母嬰用品店贈品兌換', coins: 300, color: '#C4E8D2' },
    { brand: '大創百貨', title: '嬰兒用品 85 折券', coins: 200, color: '#D8C4FF' },
  ];

  const renderTaskScreen = () => (
    <div className="task-page">
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(160deg, #FFD8C4 0%, #FFF5F0 55%, #FFFFFF 100%)',
        padding: '56px 24px 36px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFA07A', letterSpacing: '0.08em', marginBottom: '10px' }}>FAMILY FRIENDLY TAIWAN</div>
        <div style={{ fontSize: '30px', fontWeight: 900, color: '#262626', lineHeight: 1.25 }}>
          全台最質感的<br/>親子空間地圖
        </div>
        <div style={{ fontSize: '14px', color: '#A3A3A3', marginTop: '10px', fontWeight: 600 }}>
          集點回報 · 兑換好礼 · 守護親子幸福
        </div>
      </div>

      {/* Coin Wallet */}
      <div style={{ margin: '0 16px', marginTop: '-20px', background: '#262626', borderRadius: '24px', padding: '24px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.55, fontWeight: 700 }}>我的育兒金</div>
            <div style={{ fontSize: '38px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              🪙 <span>0</span> <span style={{ fontSize: '16px', opacity: 0.5, fontWeight: 700 }}>點</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', opacity: 0.55, fontWeight: 700 }}>
            還需 <span style={{ color: '#FFD8C4', opacity: 1 }}>500 點</span><br/>兑換首張折僳券
          </div>
        </div>
        <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.12)', borderRadius: '999px', height: '6px' }}>
          <div style={{ width: '0%', background: 'linear-gradient(90deg, #FFD8C4, #FFA07A)', height: '100%', borderRadius: '999px' }} />
        </div>
      </div>

      {/* Active Task */}
      <div style={{ margin: '16px 16px 0', background: '#FFF5F0', borderRadius: '24px', padding: '22px' }}>
        <div style={{ fontSize: '11px', color: '#FFA07A', fontWeight: 800, letterSpacing: '0.06em' }}>限時任務</div>
        <div style={{ fontSize: '20px', fontWeight: 900, color: '#262626', marginTop: '6px' }}>
          📍 踩點回報最新設施狀態
        </div>
        <div style={{ fontSize: '13px', color: '#A3A3A3', marginTop: '4px', fontWeight: 600 }}>
          上傳哺乳室或設備現況照片
        </div>
        <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFA07A', marginTop: '6px' }}>+50 育兒金</div>
        <button
          style={{
            width: '100%', marginTop: '16px',
            background: '#262626', color: 'white',
            padding: '17px', borderRadius: '16px',
            fontSize: '16px', fontWeight: 800, border: 'none',
          }}
          onClick={() => showToast('🔥 任務帹片開啟！請到地圖上選擇一個場域進行回報。')}
        >
          領取回報任務 (+50點)
        </button>
      </div>

      {/* Medal Album */}
      {(() => {
        const MEDALS = [
          { id: 'first-step', title: '第一步', desc: '首次踩點', icon: '👣', unlocked: visitedLocations.length >= 1 },
          { id: 'nursing-3', title: '哺乳先锋', desc: '踩點 3 個場域', icon: '🍼', unlocked: visitedLocations.length >= 3 },
          { id: 'linkou-hero', title: '林口冲驇家', desc: '解鎖林口三井', icon: '🏆', unlocked: visitedLocations.includes('linkou-mitsui') },
          { id: 'hospital', title: '長庚守護者', desc: '解鎖林口長庚', icon: '⚕️', unlocked: visitedLocations.includes('linkou-cgmh') },
          { id: 'nursing-10', title: '奶瓶大師', desc: '踩點 10 個場域', icon: '🏅', unlocked: visitedLocations.length >= 10 },
          { id: 'navigator', title: '育兒領航員', desc: '踩點 20 個場域', icon: '🧭', unlocked: visitedLocations.length >= 20 },
        ];
        const unlockedCount = MEDALS.filter(m => m.unlocked).length;
        return (
          <div style={{ margin: '24px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#262626' }}>🏅 勳章堈</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#A3A3A3' }}>{unlockedCount}/{MEDALS.length} 解鎖</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {MEDALS.map(medal => (
                <div key={medal.id} style={{
                  background: medal.unlocked ? 'white' : '#F5F5F5',
                  borderRadius: '20px',
                  padding: '16px 8px',
                  textAlign: 'center',
                  boxShadow: medal.unlocked ? 'var(--shadow-soft)' : 'none',
                  opacity: medal.unlocked ? 1 : 0.45,
                  border: medal.unlocked ? '2px solid var(--brand-coral)' : 'none',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{medal.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#262626', lineHeight: 1.2 }}>{medal.title}</div>
                  <div style={{ fontSize: '10px', color: '#A3A3A3', fontWeight: 600, marginTop: '4px' }}>{medal.desc}</div>
                </div>
              ))}
            </div>
            {visitedLocations.length >= 1 && (
              <button
                onClick={() => showToast('🎨 成就證書功能將於正式版啟動，敬請期待！')}
                style={{
                  width: '100%', marginTop: '16px',
                  background: 'linear-gradient(135deg, #FFD8C4, #FFA07A)',
                  color: '#262626', border: 'none',
                  padding: '15px', borderRadius: '16px',
                  fontSize: '15px', fontWeight: 800
                }}
              >
                🔗 分享成就海報（IG 演串流量）
              </button>
            )}
          </div>
        );
      })()}
      <div style={{ margin: '24px 0 0' }}>
        <div style={{ padding: '0 16px', fontSize: '18px', fontWeight: 900, color: '#262626', marginBottom: '14px' }}>
          🎁 可兑換好礼
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', gap: '12px', padding: '0 16px 8px', overflowX: 'auto' }}>
          {REWARDS.map((r, i) => (
            <div key={i} style={{
              flex: '0 0 190px',
              background: r.color,
              borderRadius: '20px',
              padding: '20px 16px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#262626', opacity: 0.55, marginBottom: '6px' }}>{r.brand}</div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#262626', lineHeight: 1.3 }}>{r.title}</div>
              <div style={{
                marginTop: '14px',
                background: 'rgba(38,38,38,0.1)',
                borderRadius: '12px', padding: '10px 12px',
                fontSize: '14px', fontWeight: 900, color: '#262626'
              }}>
                🪙 {r.coins} 點兑換
              </div>
            </div>
          ))}
        </div>
      </div>
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
      {currentScreen === 'contribute' && renderTaskScreen()}

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button 
          className={`nav-item ${currentScreen === 'map' ? 'active' : ''}`}
          onClick={() => { setCurrentScreen('map'); setSelectedLocation(null); }}
        >
          <span className="nav-icon">🗺️</span>
          地圖探索
        </button>
        <button 
          className={`nav-item ${currentScreen === 'contribute' ? 'active' : ''}`}
          onClick={() => { setCurrentScreen('contribute'); setSelectedLocation(null); }}
        >
          <span className="nav-icon">🪙</span>
          領取任務
        </button>
      </div>
    </div>
  );
}
