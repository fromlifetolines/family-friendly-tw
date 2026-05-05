import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Constants & Config ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 台北市政府資料開放平臺 API 端點
const API_ENDPOINTS = {
    // 臺北市嬰幼兒照顧服務_親子館 (JSON)
    FAMILY_CENTER: 'https://data.taipei/api/v1/dataset/5c09f39f-79cc-45b8-be8e-9b3ea8b220e3?scope=resourceAquire',
    // 臺北市公園基本資料 (JSON)
    PARK: 'https://data.taipei/api/v1/dataset/516b328a-8a5f-4d43-9830-4e3650205844?scope=resourceAquire'
};

const OUTPUT_PATH = path.join(__dirname, '../public/data/map-locations.json');

// 台北市各行政區中心座標 (作為缺少經緯度時的備案)
const DISTRICT_COORDS: Record<string, { lat: number, lng: number }> = {
    '士林區': { lat: 25.0922, lng: 121.5245 },
    '北投區': { lat: 25.1321, lng: 121.4987 },
    '內湖區': { lat: 25.0694, lng: 121.5892 },
    '中山區': { lat: 25.0685, lng: 121.5273 },
    '大同區': { lat: 25.0631, lng: 121.5133 },
    '松山區': { lat: 25.0592, lng: 121.5574 },
    '萬華區': { lat: 25.0354, lng: 121.4997 },
    '中正區': { lat: 25.0324, lng: 121.5190 },
    '大安區': { lat: 25.0334, lng: 121.5435 },
    '信義區': { lat: 25.0287, lng: 121.5671 },
    '南港區': { lat: 25.0546, lng: 121.6071 },
    '文山區': { lat: 24.9892, lng: 121.5701 }
};

async function syncMapData() {
    console.log('🔄 [Sync] 開始從台北市開放平臺同步親子友善點位...');
    console.time('SyncDuration');

    try {
        const dir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        console.log('📡 正在請求 API 資料...');
        const [centerRes, parkRes] = await Promise.all([
            fetch(API_ENDPOINTS.FAMILY_CENTER).then(res => res.json()).catch(() => null),
            fetch(API_ENDPOINTS.PARK).then(res => res.json()).catch(() => null)
        ]);

        const dynamicLocations: unknown[] = [];

        // 1. 處理親子館資料
        if (centerRes?.result?.results) {
            console.log(`👶 取得 ${centerRes.result.results.length} 筆親子館資料`);
            centerRes.result.results.forEach((item: { _id: number, 機構名稱?: string, 地址?: string, 電話?: string, 緯度?: string, 經度?: string }) => {
                const district = Object.keys(DISTRICT_COORDS).find(d => item.地址?.includes(d)) || '中正區';
                const coords = DISTRICT_COORDS[district];
                
                dynamicLocations.push({
                    id: `fc-${item._id}`,
                    name: item.機構名稱 || '未知親子館',
                    branch: '台北市公立親子館',
                    type: 'play',
                    // API 若無座標，使用行政區中心座標並加上微量偏移以避免重疊
                    lat: item.緯度 ? parseFloat(item.緯度) : (coords.lat + (Math.random() - 0.5) * 0.01),
                    lng: item.經度 ? parseFloat(item.經度) : (coords.lng + (Math.random() - 0.5) * 0.01),
                    address: item.地址 || '',
                    phone: item.電話 || '',
                    openHours: '09:00–17:30 (週一及國定假日休館)',
                    isPremium: true,
                    rating: 4.8,
                    reviewCount: 0,
                    facilities: [
                        { id: 'nursing_room', available: true },
                        { id: 'play_area', available: true },
                        { id: 'diaper_table', available: true },
                        { id: 'hot_water', available: true }
                    ],
                    lastUpdated: new Date().toISOString().split('T')[0],
                    desc: '具備完善的室內空間，提供 0-6 歲嬰幼兒共玩及親子課程。',
                    tags: ['公立親子館', '室內遊戲'],
                    badge: {
                        id: `badge_fc_${item._id}`,
                        icon: '🎨',
                        name: '室內探索家',
                        requirement: `抵達 ${item.機構名稱} 半徑 100m`
                    }
                });
            });
        }

        // 2. 處理公園資料
        if (parkRes?.result?.results) {
            console.log(`🌳 取得 ${parkRes.result.results.length} 筆公園資料`);
            parkRes.result.results.forEach((item: { _id: number, Latitude?: string, Longitude?: string, ParkName?: string, Location?: string, Introduction?: string }) => {
                if (!item.Latitude || !item.Longitude) return;
                dynamicLocations.push({
                    id: `park-${item._id}`,
                    name: item.ParkName,
                    branch: '台北市公園',
                    type: 'park',
                    lat: parseFloat(item.Latitude),
                    lng: parseFloat(item.Longitude),
                    address: item.Location || '',
                    openHours: '24 小時開放',
                    isPremium: false,
                    rating: 4.2,
                    reviewCount: 0,
                    facilities: [
                        { id: 'play_area', available: true },
                        { id: 'family_restroom', available: true }
                    ],
                    lastUpdated: new Date().toISOString().split('T')[0],
                    desc: item.Introduction || '提供戶外休閒與兒童遊樂設施。',
                    tags: ['戶外公園', '兒童遊具'],
                    badge: {
                        id: `badge_park_${item._id}`,
                        icon: '🌿',
                        name: '自然冒險王',
                        requirement: `抵達 ${item.ParkName} 半徑 100m`
                    }
                });
            });
        }

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dynamicLocations, null, 2));
        console.timeEnd('SyncDuration');
        console.log(`✅ 同步完成！共匯入 ${dynamicLocations.length} 筆資料至 public/data/map-locations.json`);

    } catch (error) {
        console.error('❌ 同步失敗:', error);
    }
}

syncMapData();
