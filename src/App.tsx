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
    fetch('/family-friendly-tw/data/map-locations.json')
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setLocationsList(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const uniqueNewData = (data as Location[]).filter((l: Location) => !existingIds.has(l.id));
            return [...prev, ...uniqueNewData];
          });
        }
      })
      .catch(err => console.log('Data loading fallback to seed:', err));
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

  return (
    <div className="app-container">
      <Header 
        onSearch={setSearchQuery}
        unlockedBadges={unlockedBadges}
      />
      
      {currentScreen === 'map' ? (
        <div className="map-page">
          <FamilyFriendlyMap 
            locations={locationsList}
            searchQuery={searchQuery}
            onMarkerClick={(loc) => setSelectedLocation(loc)}
          />
          
          <AnimatePresence>
            {selectedLocation && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bottom-sheet-overlay"
                  onClick={() => setSelectedLocation(null)}
                />
                <motion.div
                  className="bottom-sheet"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <div className="sheet-drag-handle" />
                  <div className="sheet-content">
                    <div className="sheet-header">
                      <div className="sheet-title">{selectedLocation.name}</div>
                      <div className="sheet-subtitle">{selectedLocation.branch} • {selectedLocation.openHours}</div>
                    </div>
                    <div className="p-6 pt-0">
                      <div className="flex flex-wrap gap-2 mb-6">
                        {selectedLocation.facilities.map(f => (
                          <div key={f.id} className="badge-btn unlocked" style={{ fontSize: '12px', padding: '6px 12px' }}>
                            {FACILITY_LABELS[f.id as FacilityType]}
                          </div>
                        ))}
                      </div>
                      <button 
                        className="badge-btn unlocked w-full"
                        onClick={() => checkIn(selectedLocation.id)}
                      >
                        📍 到達此地打卡解鎖
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="task-page">
          <h2 className="text-2xl font-black mb-6 text-white">成就任務</h2>
          <div className="grid grid-cols-2 gap-4">
            {locationsList.filter(l => l.badge).map(loc => {
              const unlocked = unlockedBadges.includes(loc.badge!.id);
              return (
                <div key={loc.id} className={`medal-card ${unlocked ? 'unlocked' : 'locked'}`}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>{loc.badge!.icon}</div>
                  <div className="text-sm font-bold text-white text-center">{loc.badge!.name}</div>
                  <div className={`text-[10px] mt-2 px-3 py-1 rounded-full ${unlocked ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                    {unlocked ? '已解鎖' : '未達成'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <button className={`nav-item ${currentScreen === 'map' ? 'active' : ''}`} onClick={() => setCurrentScreen('map')}>
          <span className="nav-icon">🗺️</span>
          <span className="nav-label">探索地圖</span>
        </button>
        <button className={`nav-item ${currentScreen === 'contribute' ? 'active' : ''}`} onClick={() => setCurrentScreen('contribute')}>
          <span className="nav-icon">🏆</span>
          <span className="nav-label">成就獎勵</span>
        </button>
      </nav>

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="toast-notification"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
