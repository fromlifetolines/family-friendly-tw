import { motion } from 'framer-motion';
import { Navigation, MapPin, Star, ChevronRight, X } from 'lucide-react';

type FacilityStatus = 'open' | 'closed';

export interface Facility {
  id: string;
  name: string;
  status: FacilityStatus;
  distance: string;
  type: 'standard' | 'premium';
  amenities: {
    nursingRoom: boolean;
    diaperTable: boolean;
    hotWater: boolean;
    elevator: boolean;
    playArea: boolean;
    familyToilet: boolean;
  };
}

interface FacilityBottomSheetProps {
  facility: Facility | null;
  onClose: () => void;
}

const AMENITY_LABELS = {
  nursingRoom: { icon: '🍼', label: '哺乳室' },
  diaperTable: { icon: '👶', label: '尿布台' },
  hotWater: { icon: '💧', label: '熱水' },
  elevator: { icon: '🛗', label: '電梯' },
  playArea: { icon: '🎠', label: '遊戲區' },
  familyToilet: { icon: '🚻', label: '親子廁' },
};

export default function FacilityBottomSheet({ facility, onClose }: FacilityBottomSheetProps) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: facility ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-white rounded-t-[20px] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[1000] flex flex-col"
      style={{ height: '65vh' }}
    >
      {/* Handle */}
      <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
        <div className="w-[36px] h-[5px] bg-gray-300 rounded-full" />
      </div>

      {facility ? (
        <div className="flex flex-col h-full px-5 pb-5 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-2 mt-2">
            <h2 className="text-[18px] font-[800] text-[#1E2D5A] leading-tight">
              {facility.name}
            </h2>
            <button onClick={onClose} className="text-gray-400 p-1">
              <X size={20} />
            </button>
          </div>

          {/* Distance & Status */}
          <div className="flex items-center gap-3 mb-6 text-[14px]">
            <span className="flex items-center text-gray-500 font-medium">
              <MapPin size={16} className="mr-1" /> {facility.distance}
            </span>
            <span
              className={`font-bold ${
                facility.status === 'open' ? 'text-[#2DB87A]' : 'text-[#E5522E]'
              }`}
            >
              {facility.status === 'open' ? '營業中' : '休息中'}
            </span>
          </div>

          {/* Amenities Grid (3 columns) */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {(Object.keys(AMENITY_LABELS) as Array<keyof typeof AMENITY_LABELS>).map((key) => {
              const hasAmenity = facility.amenities[key as keyof Facility['amenities']];
              const { icon, label } = AMENITY_LABELS[key as keyof typeof AMENITY_LABELS];
              return (
                <div
                  key={key}
                  className={`flex flex-col items-center justify-center py-3 rounded-xl transition-opacity ${
                    hasAmenity ? 'bg-[#FFF0EC] opacity-100' : 'bg-gray-100 opacity-50 grayscale'
                  }`}
                >
                  <span className="text-[24px] mb-1">{icon}</span>
                  <span className="text-[12px] font-bold text-[#1E2D5A]">{label}</span>
                </div>
              );
            })}
          </div>

          {/* Monetization Banner (Premium/Ad placeholder) */}
          <div className="mt-auto mb-5 rounded-2xl bg-gradient-to-r from-[#FFF9E6] to-[#FFE8A1] p-4 flex items-center justify-between shadow-sm cursor-pointer border border-[#F5A623]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F5A623] flex items-center justify-center text-white">
                <Star size={20} fill="currentColor" />
              </div>
              <div>
                <h4 className="text-[14px] font-[800] text-[#1E2D5A]">解鎖獨家優惠</h4>
                <p className="text-[12px] text-[#8C7B6E] font-medium">查看周邊精選親子餐廳</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-[#F5A623]" />
          </div>

          {/* CTA Button */}
          <button className="w-full bg-[#FF6B4A] hover:bg-[#E5522E] text-white rounded-[14px] py-[14px] text-[15px] font-[800] flex items-center justify-center gap-2 shadow-md transition-colors active:scale-95">
            <Navigation size={18} />
            📍 開始導航
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          選擇地標查看詳情
        </div>
      )}
    </motion.div>
  );
}
