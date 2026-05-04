import { useState } from 'react';
import { Camera, MapPin, Check, Rocket } from 'lucide-react';
// import { createClient } from '@supabase/supabase-js';

// Mock Supabase client - replaced with real keys in production
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key';
// const supabase = createClient(supabaseUrl, supabaseKey);

const AMENITIES = [
  { id: 'nursingRoom', icon: '🍼', label: '哺乳室' },
  { id: 'diaperTable', icon: '👶', label: '尿布台' },
  { id: 'hotWater', icon: '💧', label: '熱水' },
  { id: 'elevator', icon: '🛗', label: '電梯' },
  { id: 'playArea', icon: '🎠', label: '遊戲區' },
  { id: 'familyToilet', icon: '🚻', label: '親子廁所' },
];

export default function ContributePage() {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Real implementation would look like this:
      /*
      await supabase.from('facilities').insert([{
        location: 'Taipei 101',
        amenities: selectedAmenities,
        // ... other data
      }]);
      */
      
      alert('情報送出成功！獲得 50 點！');
    } catch (error) {
      console.error(error);
      alert('送出失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDF6EC] pb-24">
      {/* Header */}
      <div className="bg-[#1E2D5A] rounded-b-[20px] pt-12 pb-8 px-5">
        <h1 className="text-white text-[24px] font-[800] mb-4">貢獻新地標</h1>
        
        {/* Location Pill */}
        <div className="bg-white/10 backdrop-blur-md rounded-[999px] py-2 px-4 flex items-center text-white text-[14px]">
          <MapPin size={16} className="text-[#FF6B4A] mr-2" />
          <span className="font-medium">已自動定位：台北市信義區信義路五段</span>
        </div>
      </div>

      <div className="px-5 mt-6 flex flex-col gap-8">
        {/* Amenities Toggle Grid */}
        <section>
          <h2 className="text-[#1E2D5A] text-[18px] font-[800] mb-4">這間設施有哪些服務？</h2>
          <div className="grid grid-cols-2 gap-3">
            {AMENITIES.map(amenity => {
              const isSelected = selectedAmenities.includes(amenity.id);
              return (
                <button
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.id)}
                  className={`flex flex-col items-center justify-center py-4 rounded-[16px] border-2 transition-all ${
                    isSelected 
                      ? 'bg-[#FFF0EC] border-[#FF6B4A]' 
                      : 'bg-white border-transparent shadow-sm'
                  }`}
                >
                  <span className="text-[28px] mb-2">{amenity.icon}</span>
                  <span className={`text-[15px] font-bold ${isSelected ? 'text-[#FF6B4A]' : 'text-[#1E2D5A]'}`}>
                    {amenity.label}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-[#FF6B4A] rounded-full p-0.5">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Photo Upload Area */}
        <section>
          <h2 className="text-[#1E2D5A] text-[18px] font-[800] mb-4">上傳現場照片（選填）</h2>
          <label className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-[#8C7B6E]/30 rounded-[16px] bg-white cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Camera size={32} className="text-[#8C7B6E] mb-2" />
              <p className="text-[14px] text-[#8C7B6E] font-medium">
                {imageFile ? imageFile.name : '點擊拍照或上傳照片'}
              </p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              capture="environment"
              onChange={handleImageChange}
            />
          </label>
        </section>

        {/* Points Preview Card */}
        <section>
          <div className="bg-[#1E2D5A] rounded-[16px] p-4 flex items-center justify-between">
            <div>
              <div className="text-[#FFF0EC] text-[12px] font-medium mb-1">完成回報即可獲得</div>
              <div className="text-white text-[16px] font-[800]">貢獻者積分</div>
            </div>
            <div className="bg-[#FF6B4A] text-white px-4 py-2 rounded-[999px] font-[800] text-[16px] shadow-sm">
              +50 徽章
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || selectedAmenities.length === 0}
          className="w-full bg-[#FF6B4A] disabled:bg-gray-300 disabled:opacity-50 text-white rounded-[14px] py-[16px] text-[16px] font-[800] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[350px]"
        >
          {isSubmitting ? (
            <span className="animate-pulse">送出中...</span>
          ) : (
            <>
              <Rocket size={20} />
              送出情報，獲得 50 點
            </>
          )}
        </button>
      </div>
    </main>
  );
}
