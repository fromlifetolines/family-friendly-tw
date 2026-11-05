import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Baby,
  Building2,
  Check,
  Clock3,
  Info,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Search,
  Train,
  TreePine,
  Utensils,
  X,
} from 'lucide-react';
import FamilyFriendlyMap from './components/FamilyFriendlyMap';
import { FACILITY_LABELS, loadLocations, TYPE_CONFIG } from './data/locations';
import type { FacilityType, Location, LocationType } from './data/locations';
import './App.css';

type ViewMode = 'map' | 'list';
type Coordinates = { lat: number; lng: number };

const categories: { id: LocationType | 'all'; label: string; icon: typeof MapPin }[] = [
  { id: 'all', label: '全部地點', icon: MapPin },
  { id: 'mall', label: '百貨商場', icon: Building2 },
  { id: 'transport', label: '交通運輸', icon: Train },
  { id: 'family_center', label: '親子館', icon: Baby },
  { id: 'nursing_room', label: '哺集乳室', icon: Baby },
  { id: 'park', label: '公園景點', icon: TreePine },
  { id: 'museum', label: '博物館／科學館', icon: MapIcon },
  { id: 'hospital', label: '醫療院所', icon: MapIcon },
  { id: 'public_facility', label: '公共設施', icon: MapIcon },
  { id: 'restaurant', label: '親子餐廳', icon: Utensils },
];

const facilityFilters: { id: FacilityType; label: string }[] = [
  { id: 'nursing_room', label: '哺乳室' },
  { id: 'diaper_table', label: '尿布台' },
  { id: 'hot_water', label: '泡奶熱水' },
  { id: 'play_area', label: '兒童遊戲' },
  { id: 'family_restroom', label: '親子廁所' },
  { id: 'child_seat', label: '兒童座椅' },
  { id: 'stroller_rental', label: '嬰兒車' },
];

function distanceBetween(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const value = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} 公尺` : `${(meters / 1000).toFixed(1)} 公里`;
}

function mapsUrl(location: Location) {
  const destination = Number.isFinite(location.lat) && Number.isFinite(location.lng)
    ? `${location.lat},${location.lng}`
    : location.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function LocationDetails({
  location,
  distance,
  onClose,
}: {
  location: Location;
  distance?: number;
  onClose: () => void;
}) {
  const phone = location.phone?.replace(/[^\d+]/g, '');
  const mobilePhone = location.mobilePhone?.replace(/[^\d+]/g, '');
  const category = TYPE_CONFIG[location.type];

  return (
    <section className="location-details" aria-label={`${location.name}地點資訊`}>
      <button className="details-close" type="button" onClick={onClose} aria-label="關閉地點資訊">
        <X size={20} />
      </button>
      <div className="details-topline">
        <span className="category-label">
          {category.label}{location.publicToiletCategory ? ` · ${location.publicToiletCategory}` : ''}
        </span>
        {typeof distance === 'number' && <span className="distance-label">{formatDistance(distance)}</span>}
      </div>
      <h2>{location.name}</h2>

      <div className="details-actions">
        <a className="action-button action-primary" href={mapsUrl(location)} target="_blank" rel="noreferrer">
          <Navigation size={18} />
          開始導航
        </a>
        {phone && (
          <a className="action-button" href={`tel:${phone}`}>
            <Phone size={18} />
            撥打電話
          </a>
        )}
        {mobilePhone && (
          <a className="action-button" href={`tel:${mobilePhone}`}>
            <Phone size={18} />
            撥打手機
          </a>
        )}
      </div>

      <div className="details-info">
        <p>
          <MapPin size={17} />
          <span>
            {location.type === 'park' ? '臺北市（來源未提供街道地址）' : location.address}
          </span>
        </p>
        {location.district && (
          <p><MapPin size={17} /><span>來源所列行政區：{location.district}（未提供街道地址）</span></p>
        )}
        {location.coordinateSource && (
          <p>
            <MapPin size={17} />
            <span>
              地圖座標依據：{location.coordinateSource.method === 'official_address_point'
                ? `官方門牌匹配（${location.coordinateSource.matchedAddress ?? '門牌位置'}）`
                : location.coordinateSource.method === 'official_projected_coordinates'
                  ? '官方平面座標轉換'
                  : '來源提供座標'}
              {' · '}
              <a href={location.coordinateSource.datasetUrl} target="_blank" rel="noreferrer">
                {location.coordinateSource.datasetName}
              </a>
            </span>
          </p>
        )}
        {location.openingHours && <p><Clock3 size={17} /><span>{location.openingHours}</span></p>}
        {location.locationGuide && <p><Building2 size={17} /><span>{location.locationGuide}</span></p>}
        {location.phoneExtension && <p><Phone size={17} /><span>分機 {location.phoneExtension}</span></p>}
      </div>

      <h3>親子設施</h3>
      <div className="facility-list">
        {location.facilities.map((facility) => (
          <div className={`facility-item is-${facility.status}`} key={facility.id}>
            <span className="facility-check">
              {facility.status === 'available'
                ? <Check size={14} />
                : facility.status === 'unavailable'
                  ? <X size={14} />
                  : <Info size={14} />}
            </span>
            <span>{FACILITY_LABELS[facility.id]}</span>
            {facility.sourceUrl
              ? (
                <small>
                  <a href={facility.sourceUrl} target="_blank" rel="noreferrer">
                    {facility.status === 'available' ? '來源已確認' : '來源明確標示無'}
                  </a>
                </small>
              )
              : <small>來源未提供</small>}
            {facility.note && <small>{facility.note}</small>}
          </div>
        ))}
      </div>

      {location.listedEquipment && (
        <>
          <h3>{location.type === 'park' ? '官方列出的遊具數量' : '來源列出的哺集乳室設備'}</h3>
          <p className="official-details">{location.listedEquipment}</p>
        </>
      )}
      {(location.publicToiletGrade || location.managementUnit || location.parentFriendlyAward) && (
        <>
          <h3>{location.source.datasetName === '臺北市公園設施資料' ? '公園來源資訊' : '公廁來源資訊'}</h3>
          <div className="official-notes">
            {location.publicToiletGrade && <p><strong>公廁等級：</strong>{location.publicToiletGrade}</p>}
            {location.managementUnit && <p><strong>管理單位：</strong>{location.managementUnit}</p>}
            {location.parentFriendlyAward && (
              <p><strong>親子友善評鑑獲獎（來源原始值）：</strong>{location.parentFriendlyAward}</p>
            )}
          </div>
        </>
      )}
      {(location.friendlyServices || location.accreditationExpiry || location.wheelchairAccess || location.reminder) && (
        <>
          <h3>來源附註</h3>
          <div className="official-notes">
            {location.friendlyServices && <p><strong>友善設備或服務：</strong>{location.friendlyServices}</p>}
            {location.accreditationExpiry && <p><strong>優良哺集乳室認證效期：</strong>{location.accreditationExpiry}</p>}
            {location.wheelchairAccess && <p><strong>輪椅使用：</strong>{location.wheelchairAccess}</p>}
            {location.reminder && <p><strong>貼心提醒：</strong>{location.reminder}</p>}
          </div>
        </>
      )}

      <p className="data-note">
        <Info size={15} />
        <span>
          {location.type === 'nursing_room'
            ? '此哺集乳室及其開放時間、設備資訊由來源資料列出；實際開放情況可能變動，出發前請先向場館確認。'
            : location.source.datasetName === '臺北市公園設施資料'
              ? '此遊戲場位置及遊具數量依臺北市政府公園路燈工程管理處資料呈現；來源未提供街道地址或開放時間。'
              : location.publicToiletCategory
                ? '此親子友善廁所及尿布臺、兒童座椅數量依政府來源資料呈現；現場設施可能變動，使用前可先聯絡管理單位。'
                : `目前來源只提供場所名稱、地址與電話，未提供設施清單或營業時間。${location.source.platformImportedAt
                  ? ` 平台匯入日期（非設施查核日）：${location.source.platformImportedAt}。`
                  : ''}`}
          {location.source.platformUpdatedAt && ` 資料集頁面標示更新日期：${location.source.platformUpdatedAt}。`}
          {location.source.platformDeclaredCount !== undefined
            && location.source.sourceFileRecordCount !== undefined
            && location.source.platformDeclaredCount !== location.source.sourceFileRecordCount
            && ` 平臺 metadata 宣告 ${location.source.platformDeclaredCount} 筆，下載 CSV 實際有 ${location.source.sourceFileRecordCount} 筆；本站保留 CSV 的來源紀錄。`}
          {location.source.exactDuplicateCount !== undefined
            && location.source.exactDuplicateCount > 0
            && ` 來源檔含 ${location.source.exactDuplicateCount} 筆完全重複資料，已合併；不影響不同座標的遊戲場點位。`}
          <a href={location.source.datasetUrl} target="_blank" rel="noreferrer">
            查看{location.source.datasetName}原始資料
          </a>
        </span>
      </p>
    </section>
  );
}

export default function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LocationType | 'all'>('all');
  const [facility, setFacility] = useState<FacilityType | null>(null);
  const [city, setCity] = useState('all');
  const [view, setView] = useState<ViewMode>('list');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [nearbyFirst, setNearbyFirst] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let active = true;
    loadLocations()
      .then((loadedLocations) => {
        if (!active) return;
        setLocations(loadedLocations);
        setView(loadedLocations.some(
          (location) => Number.isFinite(location.lat) && Number.isFinite(location.lng),
        ) ? 'map' : 'list');
      })
      .catch((error: unknown) => {
        if (!active) return;
        const detail = error instanceof Error ? error.message : String(error);
        setDataError(`無法載入地點資料：${detail}`);
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cities = useMemo(
    () => [...new Set(locations.map((location) => location.address.match(/^(.*?[縣市])/u)?.[1]).filter(Boolean))].sort(),
    [locations],
  );
  const availableLocationTypes = useMemo(
    () => new Set(locations.map((location) => location.type)),
    [locations],
  );

  const distances = useMemo(() => {
    if (!userPosition) return new Map<string, number>();
    const result = new Map<string, number>();
    for (const location of locations) {
      if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
        result.set(location.id, distanceBetween(userPosition, { lat: location.lat!, lng: location.lng! }));
      }
    }
    return result;
  }, [locations, userPosition]);

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = locations.filter((location) => {
      const locationCity = location.address.match(/^(.*?[縣市])/u)?.[1];
      const matchesSearch = !query || [
        location.name,
        location.address,
        location.district,
        location.managementUnit,
        ...location.facilities.map((item) => FACILITY_LABELS[item.id]),
      ].some((value) => value?.toLocaleLowerCase().includes(query));
      const matchesFacility = !facility || location.facilities.some(
        (item) => item.id === facility && item.status === 'available',
      );
      return matchesSearch
        && (category === 'all' || location.type === category)
        && (!facility || matchesFacility)
        && (city === 'all' || locationCity === city);
    });

    if (nearbyFirst && userPosition) {
      return filtered.sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity));
    }
    return filtered;
  }, [category, city, distances, facility, locations, nearbyFirst, search, userPosition]);

  const locateMe = () => {
    setSelectedLocation(null);
    if (!navigator.geolocation) {
      setLocationMessage('目前瀏覽器不支援定位功能。');
      return;
    }

    setLocating(true);
    setLocationMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserPosition({ lat: coords.latitude, lng: coords.longitude });
        const mappableLocations = locations.filter(
          (location) => Number.isFinite(location.lat) && Number.isFinite(location.lng),
        );
        setNearbyFirst(mappableLocations.length > 0);
        setLocationMessage(mappableLocations.length > 0
          ? '已依照距離為你排序附近地點。'
          : '已取得位置；目前官方資料沒有提供地點座標，暫時無法計算最近距離。');
        setLocating(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? '定位權限未開啟，請在瀏覽器設定允許位置存取。'
          : error.code === error.TIMEOUT
            ? '定位逾時，請稍後再試。'
            : '目前無法取得位置，請確認裝置定位服務已開啟。';
        setLocationMessage(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const activeDistance = selectedLocation ? distances.get(selectedLocation.id) : undefined;
  const mappableFilteredCount = filteredLocations.filter(
    (location) => Number.isFinite(location.lat) && Number.isFinite(location.lng),
  ).length;
  const familyCenterCount = locations.filter((location) => location.type === 'family_center').length;
  const nursingRoomCount = locations.filter((location) => location.type === 'nursing_room').length;
  const familyToiletCount = locations.filter((location) => (
    location.facilities.some((item) => item.id === 'family_restroom' && item.status === 'available')
  )).length;
  const playgroundCount = locations.filter((location) => (
    location.facilities.some((item) => item.id === 'play_area' && item.status === 'available')
  )).length;
  const homeUrl = import.meta.env.BASE_URL;

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href={homeUrl} aria-label="親子友善地圖首頁">
          <span className="brand-mark"><Baby size={23} strokeWidth={2.5} /></span>
          <span className="brand-copy">
            <strong>親子友善地圖</strong>
            <small>Family Friendly Taiwan</small>
          </span>
        </a>
        <button className="locate-button" type="button" onClick={locateMe} disabled={locating}>
          <LocateFixed size={18} />
          {locating ? '定位中…' : '找附近'}
        </button>
      </header>

      <section className="discovery">
        <div className="discovery-copy">
          <p className="eyebrow">TAIWAN FAMILY SPOTS</p>
          <h1>帶孩子出門，<span>先找可查證的親子空間。</span></h1>
          <p className="discovery-subtitle">
            臺北市已核實收錄 {familyCenterCount} 間親子館、{nursingRoomCount} 間哺集乳室及
            {' '}{familyToiletCount} 處親子友善廁所、{playgroundCount} 個官方遊戲場點位；
            座標只採官方來源座標，或唯一匹配官方門牌定位。
          </p>
        </div>
        <label className="search-box">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            placeholder="搜尋景點、車站、百貨或設施…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="搜尋景點或親子設施"
          />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="清除搜尋"><X size={18} /></button>}
        </label>
      </section>

      <section className="browse-controls" aria-label="地點篩選">
        <div className="category-strip">
            {categories.map(({ id, label, icon: Icon }) => {
              const unavailable = id !== 'all' && !availableLocationTypes.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`category-chip ${category === id ? 'selected' : ''}`}
                  onClick={() => setCategory(id)}
                  aria-pressed={category === id}
                  disabled={unavailable}
                  title={unavailable ? '尚無已核實資料' : undefined}
                >
                  <Icon size={17} />
                  {label}
                  {unavailable && <small className="category-pending">資料建置中</small>}
                </button>
              );
            })}
        </div>

        <div className="filter-row">
          <div className="facility-strip">
            {facilityFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`facility-chip ${facility === item.id ? 'selected' : ''}`}
                onClick={() => setFacility((current) => current === item.id ? null : item.id)}
                aria-pressed={facility === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="city-select-wrap">
            <MapPin size={16} />
            <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="選擇縣市">
              <option value="all">所有已收錄縣市</option>
              {cities.map((cityName) => <option key={cityName} value={cityName}>{cityName}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="results-toolbar">
        <div className="results-count">
          <strong>{filteredLocations.length}</strong> 個親子友善地點
          {nearbyFirst && userPosition && (
            <button className="nearby-sort" type="button" onClick={() => setNearbyFirst(false)}>
              <ArrowUpDown size={14} /> 距離最近 <X size={13} />
            </button>
          )}
        </div>
        <div className="view-switch" role="group" aria-label="選擇檢視方式">
          <button type="button" className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>
            <MapIcon size={17} /> 地圖
          </button>
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            <MapPin size={17} /> 清單
          </button>
        </div>
      </section>
      {locationMessage && <p className="location-message" role="status">{locationMessage}</p>}
      {dataError && <p className="data-error" role="alert">{dataError}</p>}

      <section className={`explore-layout ${view === 'list' ? 'list-mode' : ''}`}>
        <aside className="results-panel" aria-label="親子友善地點清單">
          {dataLoading && <p className="data-status">正在載入已核實的地點資料…</p>}
          {!dataLoading && !dataError && filteredLocations.map((location) => {
            const type = TYPE_CONFIG[location.type];
            const distance = distances.get(location.id);
            const availableFacilities = location.facilities.filter((item) => item.status === 'available');
            const Icon = location.type === 'mall' || location.type === 'family_center'
              || location.type === 'nursing_room'
              ? Building2
              : location.type === 'transport'
                ? Train
                : location.type === 'park'
                  ? TreePine
                  : location.type === 'restaurant'
                    ? Utensils
                    : MapIcon;
            return (
              <button
                className={`place-card ${selectedLocation?.id === location.id ? 'active' : ''}`}
                key={location.id}
                type="button"
                onClick={() => setSelectedLocation(location)}
              >
                <span className={`place-icon place-${location.type}`}><Icon size={21} /></span>
                <span className="place-copy">
                  <span className="place-type">
                    {type.label}{location.publicToiletCategory ? ` · ${location.publicToiletCategory}` : ''}
                  </span>
                  <strong>{location.name}</strong>
                  <span className="place-address">
                    {location.district ? `臺北市 · ${location.district}` : location.address}
                  </span>
                  <span className="place-facilities">
                    {availableFacilities.slice(0, 3).map((item) => (
                      <span key={item.id}>{FACILITY_LABELS[item.id]}</span>
                    ))}
                    {availableFacilities.length > 3 && <span>+{availableFacilities.length - 3}</span>}
                    {availableFacilities.length === 0 && <span className="facility-unknown-hint">親子設施尚未由來源提供</span>}
                  </span>
                </span>
                {typeof distance === 'number' && <span className="place-distance">{formatDistance(distance)}</span>}
              </button>
            );
          })}
          {!dataLoading && !dataError && filteredLocations.length === 0 && (
            <div className="empty-results">
              <Search size={28} />
              <strong>找不到符合條件的地點</strong>
              <span>試試其他關鍵字、縣市或設施篩選。</span>
              <button type="button" onClick={() => { setSearch(''); setCategory('all'); setFacility(null); setCity('all'); }}>
                清除篩選
              </button>
            </div>
          )}
        </aside>

        <div className="map-panel" aria-label="親子友善地點地圖">
          <FamilyFriendlyMap
            active={view === 'map'}
            locations={filteredLocations}
            selectedLocation={selectedLocation}
            userPosition={userPosition}
            onMarkerClick={setSelectedLocation}
            onLocateMe={locateMe}
            locating={locating}
          />
          {!dataLoading && !dataError && mappableFilteredCount === 0 && (
            <p className="map-data-notice">
              {filteredLocations.length > 0
                ? '目前符合條件的地點沒有來源座標，因此不顯示推測標記或虛構距離。請從清單使用來源地址導航。'
                : '目前篩選條件沒有可顯示的地圖地點；請調整搜尋或切換至清單查看資料範圍。'}
            </p>
          )}
          {mappableFilteredCount > 0 && (
            <div className="map-caption"><MapPin size={14} /> 點選地圖標記查看設施資訊</div>
          )}
        </div>

        {selectedLocation && (
          <>
            <button className="details-backdrop" type="button" onClick={() => setSelectedLocation(null)} aria-label="關閉地點詳細資訊" />
            <LocationDetails
              location={selectedLocation}
              distance={activeDistance}
              onClose={() => setSelectedLocation(null)}
            />
          </>
        )}
      </section>

      <footer className="site-footer">
        <span><Check size={14} /> 目前收錄 {familyCenterCount} 間臺北市親子館及 {nursingRoomCount} 間臺北市哺集乳室</span>
        <span>
          部分來源未提供座標或其他親子設施資訊；未核實內容不以推測補上。
          <a href="https://data.gov.tw/" target="_blank" rel="noreferrer">政府資料開放平臺</a>
        </span>
      </footer>
    </main>
  );
}
