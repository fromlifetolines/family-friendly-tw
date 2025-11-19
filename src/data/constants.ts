import type { Amenity } from './types';

export const AMENITY_LABELS: Record<Amenity, { label: string; icon: string }> = {
    nursing_room: { label: '哺乳室', icon: '🍼' },
    stroller_rental: { label: '嬰兒車租借', icon: '🛒' },
    diaper_changing: { label: '尿布台', icon: '👶' },
    hot_water: { label: '熱水/飲水', icon: '💧' },
    elevator: { label: '電梯', icon: '🛗' },
    priority_queue: { label: '排隊禮遇', icon: '🎫' },
    play_area: { label: '遊戲區', icon: '🎠' },
    family_toilet: { label: '親子廁所', icon: '🚻' },
};
