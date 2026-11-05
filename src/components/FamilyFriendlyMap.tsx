import { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '../data/locations';
import { TYPE_CONFIG } from '../data/locations';

type Coordinates = { lat: number; lng: number };

interface FamilyFriendlyMapProps {
  active: boolean;
  locations: Location[];
  selectedLocation: Location | null;
  userPosition: Coordinates | null;
  onMarkerClick: (location: Location) => void;
  onLocateMe: () => void;
  locating: boolean;
}

function MapController({
  active,
  selectedLocation,
  userPosition,
}: {
  active: boolean;
  selectedLocation: Location | null;
  userPosition: Coordinates | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    map.invalidateSize();
    if (selectedLocation && selectedLocation.lat !== undefined && selectedLocation.lng !== undefined) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], Math.max(map.getZoom(), 14), { duration: 0.7 });
    } else if (userPosition) {
      map.flyTo([userPosition.lat, userPosition.lng], 13, { duration: 0.7 });
    }
  }, [active, map, selectedLocation, userPosition]);

  return null;
}

function createLocationIcon(location: Location) {
  const color = TYPE_CONFIG[location.type].color;
  return L.divIcon({
    className: 'location-marker',
    html: `<span style="--marker-color:${color}"></span>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
}

export default function FamilyFriendlyMap({
  active,
  locations,
  selectedLocation,
  userPosition,
  onMarkerClick,
  onLocateMe,
  locating,
}: FamilyFriendlyMapProps) {
  const mappedTypes = [...new Set(locations
    .filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng))
    .map((location) => location.type))];

  return (
    <div className="map-frame">
      <MapContainer
        center={[25.0478, 121.5319]}
        zoom={11}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController active={active} selectedLocation={selectedLocation} userPosition={userPosition} />
        {locations.filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng)).map((location) => (
          <Marker
            key={location.id}
            position={[location.lat!, location.lng!]}
            icon={createLocationIcon(location)}
            eventHandlers={{ click: () => onMarkerClick(location) }}
            title={location.name}
          />
        ))}
        {userPosition && (
          <CircleMarker
            center={[userPosition.lat, userPosition.lng]}
            radius={8}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#3984d6', fillOpacity: 1 }}
          />
        )}
      </MapContainer>
      <button className="map-locate-button" type="button" onClick={onLocateMe} disabled={locating} aria-label="定位到我的位置">
        {locating ? '…' : '◎'}
      </button>
      <div className="map-legend" aria-label="地圖圖例">
        {mappedTypes.map((type) => (
          <span key={type}>
            <i className={`legend-dot legend-${type}`} style={{ backgroundColor: TYPE_CONFIG[type].color }} />
            {TYPE_CONFIG[type].label}
          </span>
        ))}
      </div>
    </div>
  );
}
