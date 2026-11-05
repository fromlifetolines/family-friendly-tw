import recordsUrl from './taiwan_poi_seed.json?url';

export type FacilityType =
  | 'nursing_room'
  | 'stroller_rental'
  | 'diaper_table'
  | 'hot_water'
  | 'elevator'
  | 'play_area'
  | 'priority_lane'
  | 'family_restroom'
  | 'child_seat';

export type FacilityStatus = 'available' | 'unavailable' | 'unknown';

export type LocationType =
  | 'mall'
  | 'transport'
  | 'hospital'
  | 'park'
  | 'restaurant'
  | 'museum'
  | 'family_center'
  | 'nursing_room'
  | 'public_facility';

export interface Facility {
  id: FacilityType;
  status: FacilityStatus;
  note?: string;
  sourceUrl?: string;
}

export interface LocationSource {
  datasetName: string;
  datasetUrl: string;
  platformImportedAt?: string;
  platformUpdatedAt?: string;
  platformDeclaredCount?: number;
  sourceFileRecordCount?: number;
  exactDuplicateCount?: number;
}

export interface LocationCoordinateSource {
  datasetName: string;
  datasetUrl: string;
  method: 'official_address_point' | 'official_projected_coordinates' | 'source_coordinates';
  matchedAddress?: string;
  platformUpdatedAt?: string;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  district?: string;
  lat?: number;
  lng?: number;
  coordinateSource?: LocationCoordinateSource;
  phone?: string;
  phoneExtension?: string;
  mobilePhone?: string;
  openingHours?: string;
  locationGuide?: string;
  listedEquipment?: string;
  friendlyServices?: string;
  accreditationExpiry?: string;
  wheelchairAccess?: string;
  reminder?: string;
  publicToiletCategory?: string;
  publicToiletGrade?: string;
  managementUnit?: string;
  parentFriendlyAward?: string;
  facilities: Facility[];
  source: LocationSource;
}

export const FACILITY_TYPES: FacilityType[] = [
  'nursing_room',
  'stroller_rental',
  'diaper_table',
  'hot_water',
  'elevator',
  'play_area',
  'priority_lane',
  'family_restroom',
  'child_seat',
];

export const FACILITY_LABELS: Record<FacilityType, string> = {
  nursing_room: '🍼 哺乳室',
  stroller_rental: '🛒 嬰兒車借用',
  diaper_table: '👶 尿布台',
  hot_water: '💧 泡奶熱水',
  elevator: '🛗 電梯',
  play_area: '🎠 兒童遊戲區',
  priority_lane: '🎫 親子優先服務',
  family_restroom: '🚻 親子廁所',
  child_seat: '🪑 兒童座椅',
};

export const TYPE_CONFIG: Record<LocationType, { label: string; color: string }> = {
  mall: { label: '百貨商場', color: '#ef795f' },
  transport: { label: '交通運輸', color: '#5486b8' },
  hospital: { label: '醫療院所', color: '#8876b8' },
  park: { label: '公園景點', color: '#57a67a' },
  restaurant: { label: '親子餐廳', color: '#d88947' },
  museum: { label: '博物館／科學館', color: '#9271aa' },
  family_center: { label: '親子館', color: '#cf8c53' },
  nursing_room: { label: '哺集乳室', color: '#d97990' },
  public_facility: { label: '公共設施', color: '#777f86' },
};

function isLocation(value: unknown): value is Location {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string'
    || typeof record.name !== 'string'
    || typeof record.type !== 'string'
    || !Object.hasOwn(TYPE_CONFIG, record.type)
    || typeof record.address !== 'string'
    || typeof record.source !== 'object'
    || record.source === null
    || !Array.isArray(record.facilities)
  ) {
    return false;
  }

  const source = record.source as Record<string, unknown>;
  const hasLatitude = record.lat !== undefined;
  const hasLongitude = record.lng !== undefined;
  const coordinateSource = record.coordinateSource;
  return typeof source.datasetName === 'string'
    && typeof source.datasetUrl === 'string'
    && hasLatitude === hasLongitude
    && (!hasLatitude
      || (typeof record.lat === 'number' && Number.isFinite(record.lat)
        && typeof record.lng === 'number' && Number.isFinite(record.lng)
        && typeof coordinateSource === 'object' && coordinateSource !== null
        && typeof (coordinateSource as Record<string, unknown>).datasetName === 'string'
        && typeof (coordinateSource as Record<string, unknown>).datasetUrl === 'string'
        && ((coordinateSource as Record<string, unknown>).method === 'official_address_point'
          || (coordinateSource as Record<string, unknown>).method === 'official_projected_coordinates'
          || (coordinateSource as Record<string, unknown>).method === 'source_coordinates')))
    && record.facilities.every((facility: unknown) => {
      if (typeof facility !== 'object' || facility === null) return false;
      const item = facility as Record<string, unknown>;
      return typeof item.id === 'string'
        && FACILITY_TYPES.includes(item.id as FacilityType)
        && (item.status === 'available' || item.status === 'unavailable' || item.status === 'unknown');
    });
}

export async function loadLocations(): Promise<Location[]> {
  const response = await fetch(recordsUrl);
  if (!response.ok) {
    throw new Error(`地點資料檔載入失敗：HTTP ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isLocation)) {
    throw new Error('地點資料檔格式無效，請稍後重新整理頁面或回報問題。');
  }
  return data;
}
