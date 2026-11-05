import assert from 'node:assert/strict';
import records from '../src/data/taiwan_poi_seed.json';
import { FACILITY_TYPES } from '../src/data/locations';
import type { Location } from '../src/data/locations';

const locations = records as Location[];

const ids = new Set<string>();
const locationKeys = new Set([
  'id',
  'name',
  'type',
  'address',
  'district',
  'lat',
  'lng',
  'phone',
  'phoneExtension',
  'mobilePhone',
  'openingHours',
  'locationGuide',
  'listedEquipment',
  'friendlyServices',
  'accreditationExpiry',
  'wheelchairAccess',
  'reminder',
  'coordinateSource',
  'publicToiletCategory',
  'publicToiletGrade',
  'managementUnit',
  'parentFriendlyAward',
  'facilities',
  'source',
]);
const facilityKeys = new Set(['id', 'status', 'note', 'sourceUrl']);
const sourceKeys = new Set([
  'datasetName',
  'datasetUrl',
  'platformImportedAt',
  'platformUpdatedAt',
  'platformDeclaredCount',
  'sourceFileRecordCount',
  'exactDuplicateCount',
]);
const coordinateSourceKeys = new Set([
  'datasetName',
  'datasetUrl',
  'method',
  'matchedAddress',
  'platformUpdatedAt',
]);
const familyToiletDataset = '臺北市親子友善廁所點位資訊';
const playgroundDataset = '臺北市公園設施資料';

assert.ok(locations.length > 0, '資料集不得為空');
assert.ok(
  locations.filter(({ type }) => type === 'nursing_room').length >= 500,
  '哺集乳室資料筆數低於官方清單規模，需人工確認後才能建置',
);

for (const location of locations) {
  for (const key of Object.keys(location)) {
    assert.ok(locationKeys.has(key), `${location.id} 含有未支援／未查證欄位：${key}`);
  }
  assert.ok(location.id.trim(), '每個地點都要有 ID');
  assert.ok(!ids.has(location.id), `地點 ID 重複：${location.id}`);
  ids.add(location.id);
  assert.ok(location.name.trim(), `${location.id} 缺少名稱`);
  assert.ok(location.address.trim(), `${location.id} 缺少來源地址`);
  assert.ok(location.source.datasetName.trim(), `${location.id} 缺少資料集名稱`);
  assert.ok(
    location.source.datasetUrl.startsWith('https://data.taipei/')
      || location.source.datasetUrl.startsWith('https://data.gov.tw/'),
    `${location.id} 缺少官方來源網址`,
  );
  assert.ok(
    location.type === 'family_center'
      || location.type === 'nursing_room'
      || ['mall', 'transport', 'hospital', 'park', 'public_facility'].includes(location.type),
    `${location.id} 的場所類型不在已查證資料集中`,
  );
  if (location.source.platformImportedAt) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/u.test(location.source.platformImportedAt), `${location.id} 的匯入日期格式錯誤`);
  }
  if (location.source.platformUpdatedAt) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/u.test(location.source.platformUpdatedAt), `${location.id} 的資料集更新日期格式錯誤`);
  }
  if (location.type === 'family_center') {
    assert.ok(location.source.platformImportedAt, `${location.id} 的親子館來源缺少平台匯入日期`);
    assert.equal(location.source.datasetName, '臺北市嬰幼兒照顧服務_親子館');
  } else if (location.type === 'nursing_room') {
    assert.ok(location.openingHours?.trim(), `${location.id} 的哺集乳室缺少來源開放時間`);
    assert.equal(location.source.datasetName, '臺北市哺集乳室 OD');
  } else if (location.source.datasetName === playgroundDataset) {
    assert.equal(location.type, 'park', `${location.id} 遊戲場分類錯誤`);
    assert.equal(location.source.datasetName, playgroundDataset, `${location.id} 的遊戲場資料集不符`);
    assert.ok(location.district?.trim(), `${location.id} 缺少來源行政區`);
    assert.ok(location.listedEquipment?.trim(), `${location.id} 缺少來源遊具數量資訊`);
    assert.ok(location.source.sourceFileRecordCount !== undefined, `${location.id} 缺少遊戲場來源列數`);
    assert.ok(location.source.exactDuplicateCount !== undefined, `${location.id} 缺少遊戲場去重數`);
  } else {
    assert.equal(location.source.datasetName, familyToiletDataset, `${location.id} 的公廁資料集不符`);
    assert.ok(location.publicToiletCategory?.trim(), `${location.id} 缺少來源公廁類別`);
    assert.ok(location.source.platformDeclaredCount !== undefined, `${location.id} 缺少來源 metadata 筆數`);
    assert.ok(location.source.sourceFileRecordCount !== undefined, `${location.id} 缺少來源 CSV 筆數`);
    assert.ok(location.source.exactDuplicateCount !== undefined, `${location.id} 缺少重複資料統計`);
  }
  for (const key of [
    'phone',
    'phoneExtension',
    'mobilePhone',
    'openingHours',
    'locationGuide',
    'listedEquipment',
    'friendlyServices',
    'accreditationExpiry',
    'wheelchairAccess',
    'reminder',
    'district',
    'listedEquipment',
    'publicToiletCategory',
    'publicToiletGrade',
    'managementUnit',
    'parentFriendlyAward',
  ] as const) {
    assert.ok(
      location[key] === undefined || typeof location[key] === 'string',
      `${location.id} 的 ${key} 必須是字串`,
    );
  }
  for (const key of Object.keys(location.source)) {
    assert.ok(sourceKeys.has(key), `${location.id} 的來源資訊包含未支援欄位：${key}`);
  }
  if (location.coordinateSource) {
    for (const key of Object.keys(location.coordinateSource)) {
      assert.ok(coordinateSourceKeys.has(key), `${location.id} 的座標來源包含未支援欄位：${key}`);
    }
    assert.ok(location.coordinateSource.datasetName.trim(), `${location.id} 缺少座標來源名稱`);
    assert.ok(
      location.coordinateSource.datasetUrl.startsWith('https://data.taipei/')
        || location.coordinateSource.datasetUrl.startsWith('https://data.gov.tw/'),
      `${location.id} 缺少官方座標來源網址`,
    );
    assert.ok(
      location.coordinateSource.method === 'official_address_point'
        || location.coordinateSource.method === 'official_projected_coordinates'
        || location.coordinateSource.method === 'source_coordinates',
      `${location.id} 的座標來源方法不合法`,
    );
    if (location.coordinateSource.method === 'official_address_point') {
      assert.ok(location.coordinateSource.matchedAddress?.trim(), `${location.id} 缺少門牌匹配依據`);
    }
  }

  assert.equal(
    Number.isFinite(location.lat),
    Number.isFinite(location.lng),
    `${location.id} 的座標必須同時提供經度與緯度`,
  );
  if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
    assert.ok(location.coordinateSource, `${location.id} 有座標但缺少座標來源`);
    assert.ok(location.lat! >= 21.5 && location.lat! <= 25.5, `${location.id} 緯度不在台灣本島範圍內`);
    assert.ok(location.lng! >= 119.5 && location.lng! <= 122.5, `${location.id} 經度不在台灣本島範圍內`);
  }

  assert.equal(location.facilities.length, FACILITY_TYPES.length, `${location.id} 設施狀態未完整列出`);
  assert.deepEqual(
    location.facilities.map(({ id }) => id).sort(),
    [...FACILITY_TYPES].sort(),
    `${location.id} 必須列出每一項設施且不得重複`,
  );
  for (const facility of location.facilities) {
    for (const key of Object.keys(facility)) {
      assert.ok(facilityKeys.has(key), `${location.id} 的設施包含未支援欄位：${key}`);
    }
    assert.ok(
      facility.status === 'available'
        || facility.status === 'unavailable'
        || facility.status === 'unknown',
      `${location.id} 有不合法的設施狀態`,
    );
    if (facility.status !== 'unknown') {
      assert.ok(
        facility.sourceUrl?.startsWith('https://'),
        `${location.id} 的 ${facility.id} 狀態缺少直接來源網址`,
      );
    }
  }
  if (location.type === 'nursing_room') {
    const nursingRoom = location.facilities.find(({ id }) => id === 'nursing_room');
    assert.equal(nursingRoom?.status, 'available', `${location.id} 未標示來源列出的哺集乳室`);
    assert.equal(
      nursingRoom?.sourceUrl,
      location.source.datasetUrl,
      `${location.id} 的哺集乳室狀態缺少該資料集來源`,
    );
    assert.ok(
      location.facilities.filter(({ id }) => id !== 'nursing_room').every(({ status }) => status === 'unknown'),
      `${location.id} 含有未由來源確認的其他親子設施`,
    );
  } else if (location.type === 'family_center') {
    assert.ok(
      location.facilities.every(({ status }) => status === 'unknown'),
      `${location.id} 親子設施必須保持來源未提供狀態`,
    );
  } else if (location.source.datasetName === playgroundDataset) {
    const playArea = location.facilities.find(({ id }) => id === 'play_area');
    assert.equal(playArea?.status, 'available', `${location.id} 未標示來源遊戲場設施`);
    assert.equal(playArea?.sourceUrl, location.source.datasetUrl);
    assert.ok(
      location.facilities.filter(({ id }) => id !== 'play_area').every(({ status }) => status === 'unknown'),
      `${location.id} 含有未由來源確認的其他親子設施`,
    );
    assert.equal(location.coordinateSource?.method, 'official_projected_coordinates');
  } else {
    const familyRestroom = location.facilities.find(({ id }) => id === 'family_restroom');
    assert.equal(familyRestroom?.status, 'available', `${location.id} 未標示來源親子友善廁所`);
    assert.equal(familyRestroom?.sourceUrl, location.source.datasetUrl);
    for (const id of ['diaper_table', 'child_seat'] as const) {
      const item = location.facilities.find((facility) => facility.id === id);
      assert.ok(item, `${location.id} 缺少 ${id} 設施狀態`);
      if (item?.status !== 'unknown') {
        assert.ok(item?.note?.trim(), `${location.id} 的 ${id} 設施數量說明缺漏`);
        assert.equal(item?.sourceUrl, location.source.datasetUrl);
      }
    }
    assert.ok(
      location.facilities
        .filter(({ id }) => !['family_restroom', 'diaper_table', 'child_seat'].includes(id))
        .every(({ status }) => status === 'unknown'),
      `${location.id} 含有未由來源確認的其他親子設施`,
    );
  }
}

const familyToilets = locations.filter((location) => location.source.datasetName === familyToiletDataset);
const toiletSource = familyToilets[0]?.source;
assert.ok(familyToilets.length > 0, '尚未同步親子友善廁所來源');
assert.equal(
  familyToilets.length,
  (toiletSource?.sourceFileRecordCount ?? 0) - (toiletSource?.exactDuplicateCount ?? 0),
  '親子友善廁所 CSV 實際筆數與去重結果不符',
);
const playgrounds = locations.filter((location) => location.source.datasetName === playgroundDataset);
const playgroundSource = playgrounds[0]?.source;
assert.ok(playgrounds.length > 0, '尚未同步臺北市兒童遊戲場來源');
assert.equal(
  playgrounds.length,
  (playgroundSource?.sourceFileRecordCount ?? 0) - (playgroundSource?.exactDuplicateCount ?? 0),
  '兒童遊戲場來源列數與去重結果不符',
);

console.log(
  `資料驗證完成：${locations.length} 筆，含 ${familyToilets.length} 處親子友善廁所及 ${playgrounds.length} 個官方遊戲場點位。`,
);
