export type FacilityType =
  | 'nursing_room' | 'stroller_rental' | 'diaper_table' | 'hot_water'
  | 'elevator' | 'play_area' | 'priority_lane' | 'family_restroom'

export type LocationType = 'mall' | 'transport' | 'hospital' | 'park' | 'restaurant'

export interface Facility {
  id: FacilityType
  available: boolean
  note?: string
}

export interface Location {
  id: string
  name: string
  branch: string
  type: LocationType
  lat: number
  lng: number
  address: string
  phone?: string
  website?: string
  openHours: string
  isPremium: boolean
  rating: number
  reviewCount: number
  floorInfo?: string
  facilities: Facility[]
  lastUpdated: string
  photos?: string[]
  officialWebsiteUrl?: string
  floorGuideUrl?: string
  realSceneImages?: string[]
  mapUrl?: string
  navLat?: number
  navLng?: number
  assignedBadgeId?: string;
}

export const FACILITY_LABELS: Record<FacilityType, string> = {
  nursing_room: '🍼 哺乳室',
  stroller_rental: '🛒 嬰兒車借',
  diaper_table: '👶 尿布台',
  hot_water: '💧 熱水飲水',
  elevator: '🛗 電梯坡道',
  play_area: '🎠 兒童遊戲',
  priority_lane: '🎫 親子通道',
  family_restroom: '🚻 親子廁所',
}

export const TYPE_CONFIG: Record<LocationType, { label: string; color: string; svg: string }> = {
  mall:       { label: '百貨商場', color: '#6C63FF', svg: '<path d="M10 2h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M8 8h8v10a4 4 0 0 1-4 4h0a4 4 0 0 1-4-4V8z"/><path d="M12 2v-2"/>' },
  transport:  { label: '交通樞紐', color: '#00C6FF', svg: '<rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h0"/><path d="M16 15h0"/>' },
  hospital:   { label: '醫療院所', color: '#00E676', svg: '<path d="M12 2v20"/><path d="M2 12h20"/>' },
  park:       { label: '公園景點', color: '#FFD740', svg: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>' },
  restaurant: { label: '親子餐廳', color: '#FF6B6B', svg: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>' },
}

import seedData from './taiwan_poi_seed.json';

export const locations: Location[] = seedData as Location[];

