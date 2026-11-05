import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import proj4 from 'proj4';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const FAMILY_CENTER_URL = 'https://data.taipei/api/v1/dataset/5c09f39f-79cc-45b8-be8e-9b3ea8b220e3?scope=resourceAquire&limit=1000';
const FAMILY_CENTER_DATASET = '臺北市嬰幼兒照顧服務_親子館';
const NURSING_ROOM_DATASET = '臺北市哺集乳室 OD';
const NURSING_ROOM_DATASET_URL = 'https://data.taipei/dataset/detail?id=5d1d34d8-1b81-4162-87b6-05e0896af958';
const NURSING_ROOM_CSV_URL = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=4350117f-8697-4903-8a49-a7a59f30eeb1';
const FAMILY_TOILET_DATASET_ID = 172110;
const FAMILY_TOILET_DATASET = '臺北市親子友善廁所點位資訊';
const FAMILY_TOILET_DATASET_URL = `https://data.gov.tw/dataset/${FAMILY_TOILET_DATASET_ID}`;
const TAIPEI_PLAYGROUND_DATASET_ID = 136476;
const TAIPEI_PLAYGROUND_DATASET = '臺北市公園設施資料';
const TAIPEI_PLAYGROUND_RESOURCE = '臺北市公園設施資料 - 兒童遊戲場';
const DOORPLATE_DATASET_ID = 155472;
const DOORPLATE_DATASET = '臺北市門牌位置數值資料';
const DATASET_METADATA_URL = 'https://data.gov.tw/api/front/dataset/detail';
const NLSC_DISTRICTS_URL = 'https://api.nlsc.gov.tw/other/ListTown1/63000';
const EPSG_3826 = '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';
const FAMILY_TOILET_COLUMNS = [
  '行政區',
  '公廁編號',
  '公廁類別',
  '公廁名稱',
  '公廁位置',
  '公廁等級',
  '公廁地址',
  '經度',
  '緯度',
  '管理單位',
  '尿布臺設置數量',
  '兒童座椅設置數量',
  '親子友善評鑑獲獎',
] as const;
const PLAYGROUND_COUNT_COLUMNS = [
  '組合遊具數量',
  '磨石滑梯數量',
  '鞦韆數量',
  '翹翹板數量',
  '搖搖樂數量',
  '攀爬組數量',
  '戲沙坑數量',
  '擺盪船索數量',
  '其他數量',
] as const;
const PLAYGROUND_COLUMNS = [
  '公園名稱',
  '行政區',
  '管理單位',
  ...PLAYGROUND_COUNT_COLUMNS,
  'X坐標',
  'Y坐標',
] as const;
const NURSING_ROOM_COLUMNS = [
  '行政區',
  '機構名稱',
  '地址',
  '電話',
  '分機',
  '手機',
  '開放時間',
  '位置指引',
  '基本設備',
  '友善設備或服務',
  '優良哺集乳室認證效期',
  '輪椅使用',
  '貼心小提醒',
] as const;
const FACILITY_IDS = [
  'nursing_room',
  'stroller_rental',
  'diaper_table',
  'hot_water',
  'elevator',
  'play_area',
  'priority_lane',
  'family_restroom',
  'child_seat',
] as const;
const execFileAsync = promisify(execFile);

proj4.defs('EPSG:3826', EPSG_3826);

interface TaipeiFamilyCenterRecord {
  _id: number;
  _importdate?: { date?: string };
  機構類型?: string;
  機構名稱?: string;
  地址?: string;
  電話?: string;
}

interface TaipeiDatasetResponse {
  result?: {
    count?: number;
    results?: TaipeiFamilyCenterRecord[];
  };
}

interface GovernmentDatasetMetadata {
  success?: boolean;
  payload?: {
    nid?: number;
    title?: string;
    changed?: { date?: string };
    resources?: Array<{
      url?: string;
      file_format?: string;
      encoding?: string;
      amount?: number;
      description?: string;
    }>;
  };
}

interface DatasetFile {
  url: string;
  datasetUrl: string;
  datasetName: string;
  encoding: 'BIG5' | 'UTF-8';
  updatedAt?: string;
  declaredCount?: number;
}

interface FamilyToiletRow {
  行政區: string;
  公廁編號: string;
  公廁類別: string;
  公廁名稱: string;
  公廁位置: string;
  公廁等級: string;
  公廁地址: string;
  經度: string;
  緯度: string;
  管理單位: string;
  尿布臺設置數量: string;
  兒童座椅設置數量: string;
  親子友善評鑑獲獎: string;
}

interface PlaygroundRow {
  公園名稱: string;
  行政區: string;
  管理單位: string;
  組合遊具數量: string;
  磨石滑梯數量: string;
  鞦韆數量: string;
  翹翹板數量: string;
  搖搖樂數量: string;
  攀爬組數量: string;
  戲沙坑數量: string;
  擺盪船索數量: string;
  其他數量: string;
  X坐標: string;
  Y坐標: string;
}

interface DoorplateMatch {
  x: number;
  y: number;
  address: string;
}

interface NursingRoomRow {
  行政區: string;
  機構名稱: string;
  地址: string;
  電話: string;
  分機: string;
  手機: string;
  開放時間: string;
  位置指引: string;
  基本設備: string;
  友善設備或服務: string;
  優良哺集乳室認證效期: string;
  輪椅使用: string;
  貼心小提醒: string;
}

const outputPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/taiwan_poi_seed.json',
);

async function download(url: string): Promise<Buffer> {
  const { stdout } = await execFileAsync(
    'curl',
    [
      '--fail',
      '--silent',
      '--show-error',
      '--location',
      '--ipv4',
      '--connect-timeout',
      '10',
      '--max-time',
      '45',
      '--retry',
      '1',
      '--retry-delay',
      '1',
      url,
    ],
    { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 },
  );
  return stdout;
}

async function downloadToFile(url: string, filePath: string): Promise<void> {
  await execFileAsync(
    'curl',
    [
      '--fail',
      '--silent',
      '--show-error',
      '--location',
      '--ipv4',
      '--connect-timeout',
      '10',
      '--max-time',
      '180',
      '--retry',
      '1',
      '--retry-delay',
      '1',
      '--output',
      filePath,
      url,
    ],
    { maxBuffer: 1024 * 1024 },
  );
}

async function getDatasetFile(
  datasetId: number,
  expectedTitle: string,
  expectedEncoding: DatasetFile['encoding'],
): Promise<DatasetFile> {
  const response = await download(`${DATASET_METADATA_URL}?nid=${datasetId}`);
  const metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(response)) as GovernmentDatasetMetadata;
  const payload = metadata.payload;
  if (
    metadata.success !== true
    || payload?.nid !== datasetId
    || payload.title !== expectedTitle
  ) {
    throw new Error(`政府資料開放平臺 ${datasetId} metadata 不符預期；未修改現有資料檔。`);
  }
  const resource = payload.resources?.find(
    (item) => item.file_format?.toUpperCase() === 'CSV' && typeof item.url === 'string',
  );
  if (
    !resource?.url?.startsWith('https://data.taipei/')
    || resource.encoding?.toUpperCase() !== expectedEncoding
  ) {
    throw new Error(`政府資料開放平臺 ${datasetId} 未提供預期的臺北市 CSV 資源；未修改現有資料檔。`);
  }
  const updatedAt = payload.changed?.date?.slice(0, 10);
  return {
    url: resource.url,
    datasetUrl: `https://data.gov.tw/dataset/${datasetId}`,
    datasetName: expectedTitle,
    encoding: expectedEncoding,
    ...(updatedAt ? { updatedAt } : {}),
    ...(typeof resource.amount === 'number' ? { declaredCount: resource.amount } : {}),
  };
}

function isCenterRecord(record: TaipeiFamilyCenterRecord): boolean {
  return Number.isInteger(record._id)
    && record.機構類型 === '親子館'
    && typeof record.機構名稱 === 'string'
    && record.機構名稱.trim().length > 0
    && typeof record.地址 === 'string'
    && record.地址.trim().length > 0
    && (record.電話 === undefined || typeof record.電話 === 'string');
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (inQuotes) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && csv[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error('哺集乳室 CSV 結尾的引號不完整。');
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  return rows;
}

function csvRecordIsComplete(value: string): boolean {
  let inQuotes = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '"') continue;
    if (inQuotes && value[index + 1] === '"') {
      index += 1;
    } else {
      inQuotes = !inQuotes;
    }
  }
  return !inQuotes;
}

async function* readCsvFile(filePath: string): AsyncGenerator<string[]> {
  const lines = createReadStream(filePath, { encoding: 'utf8' });
  const lineReader = createInterface({
    input: lines,
    crlfDelay: Infinity,
  });
  let pending = '';
  for await (const line of lineReader) {
    pending = pending ? `${pending}\n${line}` : line;
    if (!csvRecordIsComplete(pending)) continue;
    const [row] = parseCsv(pending);
    if (row) yield row;
    pending = '';
  }
  if (pending.trim()) throw new Error('官方 CSV 結尾的引號不完整。');
}

function normalizedText(value: string): string {
  return value.replace(/\r\n?/gu, '\n').trim();
}

function parseNursingRoomCsv(csv: string): NursingRoomRow[] {
  const [header, ...records] = parseCsv(csv);
  if (!header || header.length !== NURSING_ROOM_COLUMNS.length) {
    throw new Error('哺集乳室 CSV 欄位數與來源格式不符；未修改現有資料檔。');
  }

  const normalizedHeader = header.map((value, index) => (
    index === 0 ? value.replace(/^\uFEFF/u, '').trim() : value.trim()
  ));
  if (normalizedHeader.some((column, index) => column !== NURSING_ROOM_COLUMNS[index])) {
    throw new Error('哺集乳室 CSV 欄位名稱與來源格式不符；未修改現有資料檔。');
  }
  if (records.length < 500) {
    throw new Error(`哺集乳室 CSV 僅有 ${records.length} 筆，與來源公布的 526 筆差異過大；未修改現有資料檔。`);
  }

  const parsed = records.map((values, rowIndex) => {
    if (values.length !== NURSING_ROOM_COLUMNS.length) {
      throw new Error(`哺集乳室 CSV 第 ${rowIndex + 2} 列欄位數錯誤；未修改現有資料檔。`);
    }
    return Object.fromEntries(
      NURSING_ROOM_COLUMNS.map((column, index) => [column, normalizedText(values[index])]),
    ) as NursingRoomRow;
  });

  if (parsed.some((record) => !record.行政區 || !record.機構名稱 || !record.地址 || !record.開放時間)) {
    throw new Error('哺集乳室 CSV 有缺少行政區、名稱、地址或開放時間的紀錄；未修改現有資料檔。');
  }
  return parsed;
}

function unknownFacilities() {
  return FACILITY_IDS.map((id) => ({
    id,
    status: id === 'nursing_room' ? 'available' : 'unknown',
    ...(id === 'nursing_room' ? { sourceUrl: NURSING_ROOM_DATASET_URL } : {}),
  }));
}

function mapNursingRoom(record: NursingRoomRow, idSource: string) {
  const stableId = createHash('sha256').update(idSource).digest('hex').slice(0, 20);

  return {
    id: `taipei-nursing-room-${stableId}`,
    name: record.機構名稱,
    type: 'nursing_room',
    address: record.地址,
    ...(record.電話 ? { phone: record.電話.replace(/\s+/gu, '') } : {}),
    ...(record.分機 ? { phoneExtension: record.分機 } : {}),
    ...(record.手機 ? { mobilePhone: record.手機.replace(/\s+/gu, '') } : {}),
    openingHours: record.開放時間,
    ...(record.位置指引 ? { locationGuide: record.位置指引 } : {}),
    ...(record.基本設備 ? { listedEquipment: record.基本設備 } : {}),
    ...(record.友善設備或服務 ? { friendlyServices: record.友善設備或服務 } : {}),
    ...(record.優良哺集乳室認證效期
      ? { accreditationExpiry: record.優良哺集乳室認證效期 }
      : {}),
    ...(record.輪椅使用 ? { wheelchairAccess: record.輪椅使用 } : {}),
    ...(record.貼心小提醒 ? { reminder: record.貼心小提醒 } : {}),
    facilities: unknownFacilities(),
    source: {
      datasetName: NURSING_ROOM_DATASET,
      datasetUrl: NURSING_ROOM_DATASET_URL,
    },
  };
}

function mapNursingRooms(records: NursingRoomRow[]) {
  const uniqueRecords = new Map<string, NursingRoomRow>();
  for (const record of records) {
    const identity = NURSING_ROOM_COLUMNS.map((column) => record[column]).join('\u001f');
    if (!uniqueRecords.has(identity)) uniqueRecords.set(identity, record);
  }
  const locations = [...uniqueRecords.entries()].map(([identity, record]) => mapNursingRoom(record, identity));
  return { locations, duplicateCount: records.length - uniqueRecords.size };
}

function csvObject<T extends string>(
  header: string[],
  values: string[],
  columns: readonly T[],
  label: string,
  rowNumber: number,
): Record<T, string> {
  if (values.length !== columns.length) {
    throw new Error(`${label} CSV 第 ${rowNumber} 列欄位數錯誤；未修改現有資料檔。`);
  }
  const actualHeader = header.map((value, index) => (
    index === 0 ? value.replace(/^\uFEFF/u, '').trim() : value.trim()
  ));
  if (actualHeader.some((column, index) => column !== columns[index])) {
    throw new Error(`${label} CSV 欄位名稱與來源格式不符；未修改現有資料檔。`);
  }
  return Object.fromEntries(
    columns.map((column, index) => [column, normalizedText(values[index])]),
  ) as Record<T, string>;
}

function parseFamilyToilets(csv: string) {
  const [header, ...records] = parseCsv(csv);
  if (!header || records.length === 0) {
    throw new Error('親子友善廁所 CSV 沒有資料；未修改現有資料檔。');
  }
  const parsed = records.map((values, index) => (
    csvObject(header, values, FAMILY_TOILET_COLUMNS, '親子友善廁所', index + 2) as FamilyToiletRow
  ));
  const requiredValues = ['行政區', '公廁編號', '公廁類別', '公廁名稱', '公廁地址', '經度', '緯度'] as const;
  if (parsed.some((record) => requiredValues.some((key) => !record[key]))) {
    throw new Error('親子友善廁所 CSV 有缺少行政區、編號、類別、名稱、地址或座標的資料；未修改現有資料檔。');
  }
  return parsed;
}

function facilityByCount(id: 'diaper_table' | 'child_seat', value: string) {
  const normalized = value.trim();
  const count = /^\d+(?:\.0+)?$/u.test(normalized) ? Number(normalized) : undefined;
  return {
    id,
    status: count === undefined ? 'unknown' : count > 0 ? 'available' : 'unavailable',
    ...(count === undefined ? {} : { note: `來源列示 ${count} 個` }),
    ...(count === undefined ? {} : { sourceUrl: FAMILY_TOILET_DATASET_URL }),
  };
}

function familyToiletType(category: string): 'transport' | 'mall' | 'park' | 'hospital' | 'public_facility' {
  switch (category.trim()) {
    case '交通':
      return 'transport';
    case '綜合零售賣場':
      return 'mall';
    case '公園':
      return 'park';
    case '醫院':
      return 'hospital';
    default:
      return 'public_facility';
  }
}

function mapFamilyToilets(
  records: FamilyToiletRow[],
  dataset: DatasetFile,
) {
  const uniqueRecords = new Map<string, FamilyToiletRow>();
  for (const record of records) {
    const identity = FAMILY_TOILET_COLUMNS.map((column) => record[column]).join('\u001f');
    if (!uniqueRecords.has(identity)) uniqueRecords.set(identity, record);
  }
  const duplicateCount = records.length - uniqueRecords.size;
  const locations = [...uniqueRecords.entries()].map(([identity, record]) => {
    const lat = Number(record.緯度);
    const lng = Number(record.經度);
    if (
      !Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < 24.9 || lat > 25.3 || lng < 121.4 || lng > 121.7
    ) {
      throw new Error(`親子友善廁所「${record.公廁名稱}」座標無效或不在臺北市；未修改現有資料檔。`);
    }
    const stableId = createHash('sha256').update(identity).digest('hex').slice(0, 20);
    return {
      id: `taipei-family-toilet-${stableId}`,
      name: record.公廁名稱,
      type: familyToiletType(record.公廁類別),
      address: record.公廁地址,
      lat,
      lng,
      coordinateSource: {
        datasetName: dataset.datasetName,
        datasetUrl: dataset.datasetUrl,
        method: 'source_coordinates',
        ...(dataset.updatedAt ? { platformUpdatedAt: dataset.updatedAt } : {}),
      },
      ...(record.公廁位置 ? { locationGuide: record.公廁位置 } : {}),
      ...(record.公廁等級 ? { publicToiletGrade: record.公廁等級 } : {}),
      publicToiletCategory: record.公廁類別,
      ...(record.管理單位 ? { managementUnit: record.管理單位 } : {}),
      ...(record.親子友善評鑑獲獎 ? { parentFriendlyAward: record.親子友善評鑑獲獎 } : {}),
      facilities: [
        {
          id: 'family_restroom',
          status: 'available',
          note: '列入官方親子友善廁所名冊',
          sourceUrl: dataset.datasetUrl,
        },
        facilityByCount('diaper_table', record.尿布臺設置數量),
        facilityByCount('child_seat', record.兒童座椅設置數量),
        ...FACILITY_IDS
          .filter((id) => !['family_restroom', 'diaper_table', 'child_seat'].includes(id))
          .map((id) => ({ id, status: 'unknown' })),
      ],
      source: {
        datasetName: dataset.datasetName,
        datasetUrl: dataset.datasetUrl,
        ...(dataset.updatedAt ? { platformUpdatedAt: dataset.updatedAt } : {}),
        ...(dataset.declaredCount === undefined ? {} : { platformDeclaredCount: dataset.declaredCount }),
        sourceFileRecordCount: records.length,
        exactDuplicateCount: duplicateCount,
      },
    };
  });
  return { locations, duplicateCount };
}

async function fetchTaipeiPlaygrounds() {
  const metadataResponse = await download(`${DATASET_METADATA_URL}?nid=${TAIPEI_PLAYGROUND_DATASET_ID}`);
  const metadata = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(metadataResponse),
  ) as GovernmentDatasetMetadata;
  const dataset = metadata.payload;
  if (
    metadata.success !== true
    || dataset?.nid !== TAIPEI_PLAYGROUND_DATASET_ID
    || dataset.title !== TAIPEI_PLAYGROUND_DATASET
  ) {
    throw new Error('政府資料開放平臺公園設施 metadata 不符預期；未修改現有資料檔。');
  }
  const resource = dataset.resources?.find(
    (item) => item.description === TAIPEI_PLAYGROUND_RESOURCE
      && item.file_format?.toUpperCase() === 'JSON'
      && item.encoding?.toUpperCase() === 'UTF-8',
  );
  if (!resource?.url?.startsWith('https://tppkl.blob.core.windows.net/')) {
    throw new Error('臺北市公園設施資料未提供預期的官方兒童遊戲場 JSON；未修改現有資料檔。');
  }

  const json = await download(resource.url);
  const sourceRows: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json));
  if (!Array.isArray(sourceRows) || sourceRows.length < 400) {
    throw new Error('臺北市兒童遊戲場資料筆數異常；未修改現有資料檔。');
  }
  const expectedKeys = [...PLAYGROUND_COLUMNS].sort();
  const rows = sourceRows.map((value, index) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`臺北市兒童遊戲場資料第 ${index + 1} 列格式錯誤；未修改現有資料檔。`);
    }
    const row = value as Record<string, unknown>;
    const keys = Object.keys(row).sort();
    if (
      keys.length !== expectedKeys.length
      || keys.some((key, keyIndex) => key !== expectedKeys[keyIndex])
      || PLAYGROUND_COLUMNS.some((column) => typeof row[column] !== 'string')
    ) {
      throw new Error(`臺北市兒童遊戲場資料第 ${index + 1} 列欄位與來源格式不符；未修改現有資料檔。`);
    }
    const record = row as unknown as PlaygroundRow;
    if (!record.公園名稱.trim() || !record.行政區.trim()) {
      throw new Error(`臺北市兒童遊戲場資料第 ${index + 1} 列缺少名稱或行政區；未修改現有資料檔。`);
    }
    const x = Number(record.X坐標);
    const y = Number(record.Y坐標);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`臺北市兒童遊戲場「${record.公園名稱}」座標無效；未修改現有資料檔。`);
    }
    for (const column of PLAYGROUND_COUNT_COLUMNS) {
      const count = Number(record[column]);
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error(`臺北市兒童遊戲場「${record.公園名稱}」的 ${column} 數量無效；未修改現有資料檔。`);
      }
    }
    const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [x, y]);
    if (
      !Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < 24.9 || lat > 25.3 || lng < 121.4 || lng > 121.7
    ) {
      throw new Error(`臺北市兒童遊戲場「${record.公園名稱}」座標轉換後不在臺北市；未修改現有資料檔。`);
    }
    return { record, lat, lng };
  });

  const uniqueRows = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    const identity = JSON.stringify(row.record);
    if (!uniqueRows.has(identity)) uniqueRows.set(identity, row);
  }
  const duplicateCount = rows.length - uniqueRows.size;
  const datasetUrl = `https://data.gov.tw/dataset/${TAIPEI_PLAYGROUND_DATASET_ID}`;
  const updatedAt = dataset.changed?.date?.slice(0, 10);
  const locations = [...uniqueRows.entries()].map(([identity, { record, lat, lng }]) => {
    const listedEquipment = PLAYGROUND_COUNT_COLUMNS
      .map((column) => ({ column, count: Number(record[column]) }))
      .filter(({ count }) => count > 0)
      .map(({ column, count }) => `${column.replace(/數量$/u, '')} ${count}`)
      .join('、');
    const stableId = createHash('sha256').update(identity).digest('hex').slice(0, 20);
    return {
      id: `taipei-playground-${stableId}`,
      name: record.公園名稱,
      type: 'park',
      address: '臺北市',
      district: record.行政區,
      lat,
      lng,
      coordinateSource: {
        datasetName: TAIPEI_PLAYGROUND_DATASET,
        datasetUrl,
        method: 'official_projected_coordinates',
        ...(updatedAt ? { platformUpdatedAt: updatedAt } : {}),
      },
      ...(record.管理單位 ? { managementUnit: record.管理單位 } : {}),
      listedEquipment: listedEquipment || '來源資料列出的遊具數量皆為 0',
      facilities: [
        {
          id: 'play_area',
          status: 'available',
          note: listedEquipment || '官方兒童遊戲場點位',
          sourceUrl: datasetUrl,
        },
        ...FACILITY_IDS
          .filter((id) => id !== 'play_area')
          .map((id) => ({ id, status: 'unknown' })),
      ],
      source: {
        datasetName: TAIPEI_PLAYGROUND_DATASET,
        datasetUrl,
        ...(updatedAt ? { platformUpdatedAt: updatedAt } : {}),
        sourceFileRecordCount: rows.length,
        exactDuplicateCount: duplicateCount,
      },
    };
  });
  return { locations, sourceRowCount: rows.length, duplicateCount };
}

async function fetchTaipeiDistrictCodes(): Promise<Map<string, string>> {
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(await download(NLSC_DISTRICTS_URL));
  const districts = new Map<string, string>();
  for (const [, code, name] of xml.matchAll(/<townItem>\s*<towncode>(\d{8})<\/towncode>[\s\S]*?<townname>([^<]+)<\/townname>/gu)) {
    districts.set(name.trim(), code);
  }
  if (districts.size !== 12 || [...districts.keys()].some((name) => !name.endsWith('區'))) {
    throw new Error('國土測繪中心行政區 API 回應格式不符預期；未修改現有資料檔。');
  }
  return districts;
}

function chineseNumeralToArabic(value: string): string {
  const digits: Record<string, string> = {
    零: '0',
    〇: '0',
    一: '1',
    二: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
  };
  if (!value.includes('十')) return [...value].map((digit) => digits[digit] ?? digit).join('');
  const [tens = '', ones = ''] = value.split('十');
  return `${tens ? digits[tens] : '1'}${ones ? digits[ones] : '0'}`;
}

function normalizeAddressCore(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/台北市/gu, '臺北市')
    .replace(/[零〇一二三四五六七八九十]+(?=段|巷|弄|之|號)/gu, chineseNumeralToArabic)
    .replace(/[-－—~～]/gu, '之')
    .replace(/\s+/gu, '')
    .replace(/[，,、]/gu, '')
    .replace(/樓.*$/u, '');
}

function getDoorplate(value: string): string | undefined {
  return value.match(/^(.+?號(?:之\d+)?)/u)?.[1];
}

function addressMatchKey(address: string, districts: Map<string, string>): string | undefined {
  const normalized = normalizeAddressCore(address);
  const addressMatch = normalized.match(/(?:臺北市)?(.+?區)(.+)$/u);
  if (!addressMatch) return undefined;
  const [, districtName, rest] = addressMatch;
  const districtCode = districts.get(districtName);
  const doorplate = getDoorplate(rest);
  if (!districtCode || !doorplate) return undefined;
  return `${districtCode}|${doorplate}`;
}

function doorplateAddressKey(fields: string[]): string | undefined {
  const districtCode = fields[1];
  const address = fields.slice(4, 9).join('');
  if (!districtCode?.startsWith('63000')) return undefined;
  const normalized = normalizeAddressCore(address);
  const doorplate = getDoorplate(normalized);
  return doorplate ? `${districtCode}|${doorplate}` : undefined;
}

async function matchDoorplateCoordinates(
  locations: Array<Record<string, unknown> & { address: string; id: string }>,
  districts: Map<string, string>,
  doorplateFile: string,
  doorplateDataset: DatasetFile,
) {
  const unmappedBefore = locations.filter((location) => location.lat === undefined || location.lng === undefined).length;
  const targetLocations = new Map<string, Array<Record<string, unknown> & { address: string; id: string }>>();
  for (const location of locations) {
    if (location.lat !== undefined || location.lng !== undefined) continue;
    const key = addressMatchKey(location.address, districts);
    if (!key) continue;
    const grouped = targetLocations.get(key) ?? [];
    grouped.push(location);
    targetLocations.set(key, grouped);
  }

  const matches = new Map<string, Map<string, DoorplateMatch>>();
  let headerChecked = false;
  let rowNumber = 0;
  for await (const fields of readCsvFile(doorplateFile)) {
    rowNumber += 1;
    if (!headerChecked) {
      const expected = [
        '省市縣市代碼',
        '鄉鎮市區代碼',
        '村里',
        '鄰',
        '街路段',
        '地區',
        '巷',
        '弄',
        '號',
        '橫座標',
        '縱座標',
      ];
      const header = fields.map((value, index) => (
        index === 0 ? value.replace(/^\uFEFF/u, '').trim() : value.trim()
      ));
      if (header.length !== expected.length || header.some((value, index) => value !== expected[index])) {
        throw new Error('臺北市門牌位置 CSV 欄位名稱與來源格式不符；未修改現有資料檔。');
      }
      headerChecked = true;
      continue;
    }
    if (fields.length !== 11) {
      throw new Error(`臺北市門牌位置 CSV 第 ${rowNumber} 列欄位數錯誤；未修改現有資料檔。`);
    }
    const key = doorplateAddressKey(fields);
    if (!key || !targetLocations.has(key)) continue;
    const x = Number(fields[9]);
    const y = Number(fields[10]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const candidateMap = matches.get(key) ?? new Map<string, DoorplateMatch>();
    const rawAddress = fields.slice(4, 9).join('');
    candidateMap.set(`${x},${y}`, { x, y, address: rawAddress });
    matches.set(key, candidateMap);
  }
  if (!headerChecked) throw new Error('臺北市門牌位置 CSV 為空；未修改現有資料檔。');

  let matchedLocationCount = 0;
  for (const [key, groupedLocations] of targetLocations) {
    const candidates = matches.get(key);
    if (candidates?.size !== 1) continue;
    const [point] = candidates.values();
    if (!point) continue;
    const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [point.x, point.y]);
    if (
      !Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < 21.5 || lat > 25.5 || lng < 119.5 || lng > 122.5
    ) {
      throw new Error(`門牌「${point.address}」轉換後座標無效；未修改現有資料檔。`);
    }
    for (const location of groupedLocations) {
      location.lat = lat;
      location.lng = lng;
      location.coordinateSource = {
        datasetName: doorplateDataset.datasetName,
        datasetUrl: doorplateDataset.datasetUrl,
        method: 'official_address_point',
        matchedAddress: point.address,
        ...(doorplateDataset.updatedAt ? { platformUpdatedAt: doorplateDataset.updatedAt } : {}),
      };
      matchedLocationCount += 1;
    }
  }
  return { matchedLocationCount, unmatchedLocationCount: unmappedBefore - matchedLocationCount };
}

async function fetchFamilyCenters() {
  const response = await download(FAMILY_CENTER_URL);
  const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(response)) as TaipeiDatasetResponse;
  const records = payload.result?.results;
  if (!Array.isArray(records) || records.length === 0 || records.some((record) => !isCenterRecord(record))) {
    throw new Error('臺北市親子館 API 回應格式不符預期；未修改現有資料檔。');
  }
  if (typeof payload.result?.count === 'number' && payload.result.count !== records.length) {
    throw new Error(
      `親子館 API 回傳 ${records.length} 筆，但總筆數為 ${payload.result.count}；請調整分頁後再同步。`,
    );
  }

  const datasetDate = records[0]._importdate?.date?.slice(0, 10);
  if (!datasetDate || records.some((record) => record._importdate?.date?.slice(0, 10) !== datasetDate)) {
    throw new Error('親子館來源未提供一致的平台匯入日期；未修改現有資料檔。');
  }

  return records.map((record) => ({
    id: `taipei-family-center-${record._id}`,
    name: record.機構名稱!.trim(),
    type: 'family_center',
    address: record.地址!.trim(),
    ...(record.電話?.trim() ? { phone: record.電話.trim() } : {}),
    facilities: unknownFacilities().map(({ id }) => ({ id, status: 'unknown' })),
    source: {
      datasetName: FAMILY_CENTER_DATASET,
      datasetUrl: FAMILY_CENTER_URL,
      platformImportedAt: datasetDate,
    },
  }));
}

async function fetchNursingRooms() {
  const csv = new TextDecoder('big5', { fatal: true }).decode(await download(NURSING_ROOM_CSV_URL));
  return mapNursingRooms(parseNursingRoomCsv(csv));
}

async function syncData() {
  const [toiletDataset, doorplateDataset] = await Promise.all([
    getDatasetFile(FAMILY_TOILET_DATASET_ID, FAMILY_TOILET_DATASET, 'BIG5'),
    getDatasetFile(DOORPLATE_DATASET_ID, DOORPLATE_DATASET, 'UTF-8'),
  ]);
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'family-friendly-data-'));
  try {
    const doorplateFile = path.join(temporaryDirectory, 'taipei-doorplates.csv');
    await downloadToFile(doorplateDataset.url, doorplateFile);
    const [familyCenters, nursingRoomResult, toiletCsv, districts] = await Promise.all([
      fetchFamilyCenters(),
      fetchNursingRooms(),
      download(toiletDataset.url).then((content) => (
        new TextDecoder(toiletDataset.encoding.toLowerCase(), { fatal: true }).decode(content)
      )),
      fetchTaipeiDistrictCodes(),
    ]);
    const playgroundResult = await fetchTaipeiPlaygrounds();
    const parsedFamilyToilets = parseFamilyToilets(toiletCsv);
    const familyToiletResult = mapFamilyToilets(parsedFamilyToilets, toiletDataset);
    const nursingRooms = nursingRoomResult.locations;
    const familyToilets = familyToiletResult.locations;
    const playgrounds = playgroundResult.locations;
    const locations = [...familyCenters, ...nursingRooms, ...familyToilets, ...playgrounds];
    const coordinateMatch = await matchDoorplateCoordinates(
      locations,
      districts,
      doorplateFile,
      doorplateDataset,
    );
    const ids = new Set<string>();
    for (const location of locations) {
      if (ids.has(location.id)) throw new Error(`同步結果有重複地點 ID：${location.id}`);
      ids.add(location.id);
    }

    const temporaryPath = `${outputPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(locations, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, outputPath);
    const toiletCountNote = toiletDataset.declaredCount !== undefined
      && toiletDataset.declaredCount !== parsedFamilyToilets.length
      ? `metadata 宣告 ${toiletDataset.declaredCount} 筆、CSV 實際 ${parsedFamilyToilets.length} 筆；`
      : '';
    console.log(
      `已同步 ${familyCenters.length} 間臺北市親子館、${nursingRooms.length} 間臺北市哺集乳室`
      + `、${familyToilets.length} 處臺北市親子友善廁所及 ${playgrounds.length} 個臺北市兒童遊戲場點位。`
      + `門牌唯一匹配 ${coordinateMatch.matchedLocationCount} 筆，未匹配或不唯一 ${coordinateMatch.unmatchedLocationCount} 筆；`
      + `遊戲場來源 ${playgroundResult.sourceRowCount} 列，合併 ${playgroundResult.duplicateCount} 列完全重複資料；`
      + `廁所${toiletCountNote}合併 ${familyToiletResult.duplicateCount} 筆完全重複列。`
      + `哺集乳室 CSV 合併 ${nursingRoomResult.duplicateCount} 筆完全重複列。`,
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

syncData().catch((error: unknown) => {
  console.error('資料同步失敗；現有資料檔未變更：', error);
  process.exitCode = 1;
});
