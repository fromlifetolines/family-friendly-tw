import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Sub-component to access map instance
const MapController: React.FC<{ userLocation: { lat: number, lng: number } | null }> = ({ userLocation }) => {
  const map = useMap();
  
  return (
    <button
      onClick={() => {
        if (userLocation) {
          map.flyTo([userLocation.lat, userLocation.lng], 15);
        }
      }}
      style={{
        position: 'fixed',
        bottom: '100px',
        right: '20px',
        zIndex: 1000,
        width: '50px',
        height: '50px',
        borderRadius: '25px',
        background: 'white',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        cursor: 'pointer'
      }}
    >
      📍
    </button>
  );
};
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../data/locations';

// 核心演算法：Haversine 公式計算兩點經緯度實際距離 (公尺)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; 
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const deltaP = (lat2-lat1) * Math.PI/180;
  const deltaLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// 修正 Leaflet 預設 Icon 遺失問題
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface FamilyFriendlyMapProps {
  searchQuery?: string;
  onMarkerClick?: (loc: Location) => void;
}

const FamilyFriendlyMap: React.FC<FamilyFriendlyMapProps> = ({ searchQuery = '', onMarkerClick }) => {
  const [places, setPlaces] = useState<Location[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('userBadges');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // 1. 載入動態 JSON 圖資
  useEffect(() => {
    // 讀取爬蟲自動化產出的精準圖資
    fetch('/family-friendly-tw/data/map-locations.json')
      .then(res => res.json())
      .then((data: Location[]) => setPlaces(data))
      .catch(() => {});
  }, []);

  // 2. 啟動高精度 GPS 即時追蹤
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('GPS 定位失敗:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // 3. 距離判定與徽章解鎖邏輯
  const handleCheckIn = (place: Location) => {
    if (!userLocation) {
      alert('請先允許瀏覽器取用您的位置資訊！');
      return;
    }

    if (!place.badge) {
        alert('此地點暫無可解鎖的徽章。');
        return;
    }

    const distance = calculateDistance(
      userLocation.lat, userLocation.lng, 
      place.lat, place.lng
    );

    // 設定解鎖半徑為 100 公尺
    if (distance <= 100) { 
      if (!unlockedBadges.includes(place.badge.id)) {
        const newBadges = [...unlockedBadges, place.badge.id];
        setUnlockedBadges(newBadges);
        localStorage.setItem('userBadges', JSON.stringify(newBadges));
        alert(`🎉 打卡成功！已將專屬徽章『${place.badge.name}』收錄至成就庫。`);
      } else {
        alert('您已經擁有此徽章了！');
      }
    } else {
      alert(`距離目標點還有 ${Math.round(distance)} 公尺，再靠近一點才能解鎖喔！`);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0, background: '#f8f9fa' }}>
      <MapContainer 
        center={[25.033, 121.565]} 
        zoom={13} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {places
          .filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.address.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((place) => {
          const isUnlocked = place.badge ? unlockedBadges.includes(place.badge.id) : false;

          return (
            <Marker 
              key={place.id} 
              position={[place.lat, place.lng]}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(place)
              }}
            >
              <Popup>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px', padding: '4px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1c1c1e' }}>{place.name}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#8e8e93' }}>{place.address}</p>
                  </div>

                  {place.badge && (
                    <button
                      onClick={() => handleCheckIn(place)}
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
                          background: 'rgba(0, 122, 255, 0.05)',
                          color: '#007AFF',
                          border: '1px solid rgba(0, 122, 255, 0.1)'
                        })
                      }}
                    >
                      {isUnlocked ? '✨ 已解鎖成就' : '📍 抵達解鎖徽章'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              className: 'user-location-marker',
              html: `<div style="width: 14px; height: 14px; background: #007AFF; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,122,255,0.5);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          />
        )}
        
        <MapController userLocation={userLocation} />
      </MapContainer>
    </div>
  );
};

export default FamilyFriendlyMap;
