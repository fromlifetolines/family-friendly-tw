import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { locations, FACILITY_LABELS } from './data/locations';
import type { Location, FacilityType } from './data/locations';
import Header from './components/layout/Header';
import FamilyFriendlyMap from './components/FamilyFriendlyMap';

// --- Types ---
type Screen = 'map' | 'contribute';


// --- Helpers ---
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2-lat1) * Math.PI/180
  const dLng = (lng2-lng1) * Math.PI/180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
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
  const [searchQuery, setSearchQuery] = useState('');
  const [locationsList, setLocationsList] = useState<Location[]>(locations);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // --- Badge System State ---
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('userBadges') || '[]');
    } catch { return []; }
  });

  useEffect(() => {
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
      .catch(() => console.log('Notice: No dynamic data found.'));
  }, []);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const updateUserLocation = useCallback((lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          updateUserLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [updateUserLocation]);

  const renderMapScreen = () => (
    <main className="relative w-full h-screen overflow-hidden">
      <Header 
        onSearch={setSearchQuery}
        unlockedBadges={unlockedBadges}
      />
      
      <div className="w-full h-full pt-[140px]">
         <FamilyFriendlyMap 
           searchQuery={searchQuery}
           onMarkerClick={(loc) => setSelectedLocation(loc)}
         />
      </div>

      <AnimatePresence>
        {selectedLocation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="bottom-sheet-overlay"
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
                  <div className="sheet-photo-placeholder">
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#86868B' }}>親子友善地圖</span>
                  </div>
                )}
                
                <div className="sheet-header">
                  <div className="sheet-title">{selectedLocation.name}</div>
                  <div className="sheet-subtitle">{selectedLocation.branch} • {selectedLocation.openHours}</div>
                </div>

                <div className="sheet-body">
                  <div className="sheet-facilities">
                    {selectedLocation.facilities.map(f => (
                      <div key={f.id} className={`facility-chip ${f.available ? 'available' : 'unavailable'}`}>
                        {FACILITY_LABELS[f.id as FacilityType]}
                      </div>
                    ))}
                  </div>

                  <div className="sheet-info-item">
                    <span className="info-icon">📍</span>
                    <div className="info-text">
                      <div className="info-label">{selectedLocation.address}</div>
                      <div className="info-sublabel">{selectedLocation.floorInfo}</div>
                    </div>
                  </div>

                  <div className="action-row">
                    <button 
                      className="primary-action-btn tactile-btn"
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedLocation.lat + ',' + selectedLocation.lng)}&travelmode=walking`;
                        openExternal(url);
                      }}
                    >
                      開始導航
                    </button>
                    <button 
                      className="secondary-action-btn tactile-btn"
                      onClick={() => checkIn(selectedLocation.id)}
                    >
                      打卡解鎖
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="nav-bar">
        <button className={`nav-item ${currentScreen === 'map' ? 'active' : ''}`} onClick={() => setCurrentScreen('map')}>
          <span className="nav-icon">🗺️</span>
          <span className="nav-label">地圖探索</span>
        </button>
        <button className={`nav-item ${currentScreen === 'contribute' ? 'active' : ''}`} onClick={() => setCurrentScreen('contribute')}>
          <span className="nav-icon">🏆</span>
          <span className="nav-label">成就任務</span>
        </button>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="toast-notification" style={{ zIndex: 10000 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );

  const renderContributeScreen = () => (
    <div className="contribute-page pt-[140px]">
      <Header onSearch={setSearchQuery} unlockedBadges={unlockedBadges} />
      <div className="p-6">
        <h2 className="text-2xl font-black mb-4">成就勳章</h2>
        <div className="grid grid-cols-2 gap-4">
          {locationsList.filter(l => l.badge).map(loc => {
            const unlocked = unlockedBadges.includes(loc.badge!.id);
            return (
              <div key={loc.id} className={`badge-card ${unlocked ? 'unlocked' : 'locked'}`}>
                <div className="badge-icon">{loc.badge!.icon}</div>
                <div className="badge-name">{loc.badge!.name}</div>
                <div className="badge-status">{unlocked ? '已收藏' : '未解鎖'}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="nav-bar">
        <button className={`nav-item ${currentScreen === 'map' ? 'active' : ''}`} onClick={() => setCurrentScreen('map')}>
          <span className="nav-icon">🗺️</span>
          <span className="nav-label">地圖探索</span>
        </button>
        <button className={`nav-item ${currentScreen === 'contribute' ? 'active' : ''}`} onClick={() => setCurrentScreen('contribute')}>
          <span className="nav-icon">🏆</span>
          <span className="nav-label">成就任務</span>
        </button>
      </div>
    </div>
  );

  return currentScreen === 'map' ? renderMapScreen() : renderContributeScreen();
}
