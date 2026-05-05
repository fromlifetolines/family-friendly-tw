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
const createCustomIcon = (type: LocationType, locName: string, isSelected: boolean, isUnlocked: boolean, distanceText?: string) => {
  const color = TYPE_CONFIG[type].color;
  const chipLabel = locName.length > 10 ? locName.slice(0, 10) + '…' : locName;
  const tooltip = distanceText ? `${chipLabel} · ${distanceText}` : chipLabel;

  const html = `
    <div class="marker-wrap ${isSelected ? 'selected' : ''}" style="--marker-color: ${color};">
      <div class="marker-chip">${tooltip}</div>
      <div class="marker-ring">
        <div class="marker-dot"></div>
        ${isUnlocked ? `<div style="position:absolute; top:-10px; right:-10px; font-size: 12px; z-index: 10; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.15));">✅</div>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    className: '', // empty — avoid leaflet default overflow clipping
    html,
    iconSize: [44, 44],
    iconAnchor: [22, 44],   // pin tip aligns to coordinate point
    popupAnchor: [0, -44],
  });
};

const createUserIcon = () => {
  return L.divIcon({
    className: 'user-pin-wrapper',
    html: `
      <div style="
        width: 16px; height: 16px;
        background: #007AFF;
        border-radius: 50%;
        border: 3px solid rgba(0,122,255,0.3);
        box-shadow: 0 0 12px rgba(0,122,255,0.4), 0 0 4px rgba(0,122,255,0.3);
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
  const [searchQuery, setSearchQuery] = useState('');
  
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
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateUserLocation(lat, lng);
          // Fly to user location after GPS resolves
          if (mapInstance) {
            mapInstance.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
          }
        },
        () => {}, // Silent fail — map stays at default Taiwan overview
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [mapInstance]); // Re-run if mapInstance becomes available after GPS resolves

  // Data Validation Hook
  useEffect(() => {
    if (import.meta.env.DEV) {
      const missingUrls = locations.filter(loc => 
        ['hospital', 'transport'].includes(loc.type) && !loc.officialWebsiteUrl
      );
      if (missingUrls.length > 0) {
        console.error('🚨 [Data Error] Missing officialWebsiteUrl:', missingUrls.map(l => l.name));
        showToast(`開發警告：有 ${missingUrls.length} 個場域缺少官網連結！請查看 Console。`);
      }
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
      mapInstance.flyTo([loc.lat - 0.003, loc.lng], 15, { animate: true, duration: 1.2 });
    }
  };

  const filteredLocations = locations.filter(loc => {
    // Search query matching
    const matchesSearch = searchQuery === '' || 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      loc.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Facility filters matching
    if (activeFilters.length === 0) return true;
    return activeFilters.every(filter => 
      loc.facilities.some(f => f.id === filter && f.available)
    );
  });



  const renderMapScreen = () => (
    <div className="map-page">
      {/* Brand Header */}
      <div className="brand-header" style={{ paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--liquid-text)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>🗺️ 親子友善地圖</div>
            <div style={{ fontSize: '11px', color: 'var(--liquid-muted)', fontWeight: 600, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>探索全台最完整的親子設施</div>
          </div>
          <div style={{
            padding: '5px 14px',
            background: '#007AFF',
            borderRadius: '999px',
            fontSize: '12px', fontWeight: 700, color: 'white',
            flexShrink: 0, marginLeft: '12px',
            boxShadow: '0 4px 12px rgba(0,122,255,0.25)'
          }}>探索版</div>
        </div>
        
        {/* Search Bar */}
        <div style={{ marginTop: '12px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#86868B' }}>🔍</span>
          <input 
            type="text" 
            placeholder="搜尋台北 101、新光三越..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '14px 14px 14px 44px',
              borderRadius: '99px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255, 255, 255, 0.05)', color: 'var(--liquid-text)',
              fontSize: '15px', fontWeight: 600,
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
              outline: 'none',
              transition: 'all 0.4s var(--ease-liquid)'
            }}
          />
          {searchQuery && filteredLocations.length > 0 && (
            <ul className="search-dropdown">
              {filteredLocations.slice(0, 5).map(loc => (
                <li 
                  key={loc.id} 
                  className="search-item"
                  onClick={() => {
                    setSearchQuery('');
                    handleMarkerClick(loc);
                  }}
                >
                  <span className="search-item-title">{loc.name}</span>
                  <span className="search-item-address">{loc.address}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {closestLoc && userLat && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: 'var(--liquid-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
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
          const isSelected = selectedLocation?.id === loc.id;
          let distanceText: string | undefined;
          
          if (userLat !== null && userLng !== null) {
            distanceText = getDistanceText(userLat, userLng, loc.lat, loc.lng);
          }
          
          const isUnlocked = !!visitedLocations[loc.id];
          
          return (
            <Marker 
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={createCustomIcon(loc.type, loc.name, isSelected, isUnlocked, distanceText)}
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
                {(selectedLocation as any).realSceneImages && (selectedLocation as any).realSceneImages.length > 0 ? (
                  <img src={(selectedLocation as any).realSceneImages[0]} className="sheet-photo" alt={selectedLocation.name} />
                ) : selectedLocation.photos && selectedLocation.photos.length > 0 ? (
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
                      <div key={key} className={`amenity-card tactile-btn ${isAvailable ? 'active' : 'inactive'}`} style={{ flexShrink: 0, minWidth: '90px' }}>
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
    const isMallUnlocked = Object.keys(visitedLocations).some(id => locations.find(l => l.id === id)?.type === 'mall');
    
    const svgDefs = (
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="metal-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2A8" />
            <stop offset="25%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#FFF2A8" />
            <stop offset="75%" stopColor="#AA7C11" />
            <stop offset="100%" stopColor="#FFF2A8" />
          </linearGradient>
          <linearGradient id="metal-silver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#B0B0B0" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="75%" stopColor="#808080" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
          <linearGradient id="metal-bronze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFC8A8" />
            <stop offset="25%" stopColor="#CD7F32" />
            <stop offset="50%" stopColor="#FFC8A8" />
            <stop offset="75%" stopColor="#8C491A" />
            <stop offset="100%" stopColor="#FFC8A8" />
          </linearGradient>
          <radialGradient id="inner-glow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="var(--brand-primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--brand-navy)" stopOpacity="0.4" />
          </radialGradient>
          <radialGradient id="inner-glow-purple" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="var(--brand-secondary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--brand-navy)" stopOpacity="0.4" />
          </radialGradient>
        </defs>
      </svg>
    );

    const hasBadge = (badgeId: string) => Object.keys(visitedLocations).some(id => locations.find(l => l.id === id)?.assignedBadgeId === badgeId);

    const MEDALS = [
      { id: 'first-step', title: '踩點大師', desc: '首次踩點', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow)" stroke="url(#metal-bronze)" strokeWidth="8"/><path d="M50 25 L56 40 L72 40 L59 50 L64 65 L50 55 L36 65 L41 50 L28 40 L44 40 Z" fill="url(#metal-bronze)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/></svg>, unlocked: Object.keys(visitedLocations).length >= 1 },
      { id: 'nursing-3', title: '育兒守護者', desc: '踩點 3 個場域', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><path d="M50 8 L90 20 L90 50 C90 75 50 95 50 95 C50 95 10 75 10 50 L10 20 Z" fill="url(#inner-glow-purple)" stroke="url(#metal-silver)" strokeWidth="8" strokeLinejoin="round"/><rect x="42" y="35" width="16" height="25" rx="8" fill="url(#metal-silver)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/><path d="M42 35 L58 35 L54 25 L46 25 Z" fill="url(#metal-silver)"/><circle cx="50" cy="22" r="3" fill="url(#metal-silver)"/></svg>, unlocked: Object.keys(visitedLocations).length >= 3 },
      { id: 'mall-hero', title: '百貨獵人', desc: '解鎖任意百貨', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow)" stroke="url(#metal-gold)" strokeWidth="8" strokeDasharray="15 5"/><path d="M35 45 L65 45 L60 70 L40 70 Z" fill="url(#metal-gold)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/><path d="M40 45 C40 30 60 30 60 45" fill="none" stroke="url(#metal-gold)" strokeWidth="4"/></svg>, unlocked: hasBadge('mall-hero') },
      { id: 'mitsui-shopper', title: '三井購物狂', desc: '解鎖三井 Outlet', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow-purple)" stroke="url(#metal-silver)" strokeWidth="8"/><path d="M30 40 L70 40 L65 70 L35 70 Z" fill="url(#metal-silver)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/><path d="M40 40 C40 25 60 25 60 40" fill="none" stroke="url(#metal-silver)" strokeWidth="4"/></svg>, unlocked: hasBadge('mitsui-shopper') },
      { id: 'thsr-explorer', title: '高鐵探索者', desc: '解鎖高鐵站', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow)" stroke="url(#metal-gold)" strokeWidth="8"/><path d="M20 60 L80 60 L70 40 L30 40 Z M10 70 L90 70 M45 40 L80 20" stroke="url(#metal-gold)" strokeWidth="6" fill="none" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/></svg>, unlocked: hasBadge('thsr-explorer') },
      { id: 'mrt-navigator', title: '北捷領航員', desc: '解鎖台北捷運站', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow-purple)" stroke="url(#metal-silver)" strokeWidth="8"/><path d="M25 50 A25 25 0 1 1 75 50 A25 25 0 1 1 25 50 M10 50 L90 50 M50 10 L50 90" stroke="url(#metal-silver)" strokeWidth="6" fill="none" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/></svg>, unlocked: hasBadge('mrt-navigator') },
      { id: 'tymetro-master', title: '機捷達人', desc: '解鎖機場捷運', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow)" stroke="url(#metal-bronze)" strokeWidth="8"/><path d="M30 60 L50 30 L70 60 Z M10 70 L90 70" stroke="url(#metal-bronze)" strokeWidth="6" fill="none" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/></svg>, unlocked: hasBadge('tymetro-master') },
      { id: 'krt-explorer', title: '高捷探索者', desc: '解鎖高雄捷運', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow-purple)" stroke="url(#metal-silver)" strokeWidth="8"/><path d="M30 30 L70 70 M30 70 L70 30 M15 50 L85 50" stroke="url(#metal-silver)" strokeWidth="6" fill="none" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/></svg>, unlocked: hasBadge('krt-explorer') },
      { id: 'hospital-guardian', title: '醫療守護者', desc: '解鎖醫療院所', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow)" stroke="url(#metal-gold)" strokeWidth="8"/><path d="M40 30 L60 30 L60 40 L70 40 L70 60 L60 60 L60 70 L40 70 L40 60 L30 60 L30 40 L40 40 Z" fill="url(#metal-gold)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/></svg>, unlocked: hasBadge('hospital-guardian') },
      { id: 'park-ranger', title: '公園探險家', desc: '解鎖公園景點', icon: <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%'}}><circle cx="50" cy="50" r="46" fill="url(#inner-glow-purple)" stroke="url(#metal-bronze)" strokeWidth="8"/><path d="M50 20 L70 50 L60 50 L80 80 L20 80 L40 50 L30 50 Z" fill="url(#metal-bronze)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/></svg>, unlocked: hasBadge('park-ranger') },
    ];
    const unlockedCount = MEDALS.filter(m => m.unlocked).length;

    const getMedalDate = (medalId: string) => {
      const dates = Object.values(visitedLocations);
      if (dates.length === 0) return '';
      switch(medalId) {
        case 'first-step': return dates[0];
        case 'nursing-3': return dates.length >= 3 ? dates[2] : '';
        case 'mall-hero': return isMallUnlocked ? Object.values(visitedLocations)[0] : '';
        case 'hospital': return visitedLocations['linkou-cgmh'] || '';
        case 'nursing-10': return dates.length >= 10 ? dates[9] : '';
        case 'navigator': return dates.length >= 20 ? dates[19] : '';
        default: return dates[0];
      }
    };

    return (
      <div className="task-page">
        {svgDefs}
        {/* Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)',
          padding: '56px 24px 36px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em', marginBottom: '10px' }}>35DAILY 全台親子探索地圖</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: 'white', lineHeight: 1.25 }}>
            一鍵導航<br/>成就解鎖
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', marginTop: '10px', fontWeight: 600 }}>
            全台百貨、景點、車站、醫院親子空間
          </div>
        </div>

        {/* Active Task (If in range) */}
        {checkInLocation ? (
          <div className="glass-panel" style={{ margin: '16px 16px 0', padding: '22px', borderColor: 'rgba(0,122,255,0.3)' }}>
            <div style={{ fontSize: '11px', color: '#007AFF', fontWeight: 700, letterSpacing: '0.04em' }}>📍 偵測到您已抵達</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1D1D1F', marginTop: '6px' }}>
              {checkInLocation.name}
            </div>
            <div style={{ fontSize: '13px', color: '#86868B', marginTop: '4px', fontWeight: 600 }}>
              請上傳哺乳室或設備現況照片，協助更新資訊！
            </div>
            <button
              className="tactile-btn"
              style={{
                width: '100%', marginTop: '16px',
                background: '#007AFF', color: 'white',
                padding: '17px', borderRadius: '14px',
                fontSize: '16px', fontWeight: 700,
              }}
              onClick={handleSimulateUpload}
            >
              📸 模擬上傳照片並解鎖勳章
            </button>
          </div>
        ) : (
          <div className="glass-panel" style={{ margin: '16px 16px 0', padding: '22px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#86868B', fontWeight: 600 }}>
              尚未到達任何場域。<br/>請至地圖探索，靠近場域 50m 內即可解鎖回報任務！
            </div>
            <button
              className="tactile-btn"
              style={{
                width: '100%', marginTop: '16px',
                background: '#007AFF', color: 'white',
                padding: '17px', borderRadius: '14px',
                fontSize: '16px', fontWeight: 700,
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
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1D1D1F' }}>🏅 我的成就徽章冊</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868B' }}>{unlockedCount}/{MEDALS.length} 解鎖</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {MEDALS.map(medal => {
              const date = getMedalDate(medal.id);
              return (
                <div key={medal.id} 
                  className={medal.unlocked ? 'medal-shimmer medal-glow' : ''}
                  onClick={() => !medal.unlocked && showToast(`🔒 解鎖條件：${medal.desc}`)}
                  style={{
                  background: medal.unlocked ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.02)',
                  backdropFilter: medal.unlocked ? 'blur(16px) saturate(180%)' : 'none',
                  WebkitBackdropFilter: medal.unlocked ? 'blur(16px) saturate(180%)' : 'none',
                  borderRadius: '20px',
                  padding: '16px 8px',
                  textAlign: 'center',
                  boxShadow: medal.unlocked ? '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)' : 'none',
                  border: medal.unlocked ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                  transition: 'all 0.4s cubic-bezier(0.25,0.8,0.25,1)',
                  cursor: medal.unlocked ? 'default' : 'pointer'
                }}>
                  <motion.div 
                    initial={false}
                    animate={{ 
                      filter: medal.unlocked ? 'grayscale(0%) blur(0px)' : 'grayscale(100%) blur(12px)',
                      opacity: medal.unlocked ? 1 : 0.6
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ 
                      width: '56px', height: '56px', margin: '0 auto 8px', position: 'relative'
                    }}
                  >
                    {medal.icon}
                    {!medal.unlocked && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.8 }}>
                        🔒
                      </div>
                    )}
                  </motion.div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: medal.unlocked ? '#1D1D1F' : '#86868B', lineHeight: 1.2 }}>{medal.title}</div>
                  <div style={{ fontSize: '10px', color: medal.unlocked ? '#007AFF' : '#AEAEB2', fontWeight: 600, marginTop: '4px' }}>
                    {medal.unlocked ? date : '點擊查看'}
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
                background: '#007AFF',
                color: 'white', border: 'none',
                padding: '15px', borderRadius: '14px',
                fontSize: '15px', fontWeight: 700,
                boxShadow: '0 4px 16px rgba(0,122,255,0.25)'
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
          background: 'rgba(10, 17, 38, 0.75)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          color: 'var(--liquid-text)',
          padding: '14px 28px',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 700,
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: 'var(--glass-shadow)',
          border: '1px solid rgba(255,255,255,0.2)',
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
