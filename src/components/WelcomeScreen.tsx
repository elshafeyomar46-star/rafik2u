import React from 'react';
import { ArrowLeft, BookOpen, Compass, Mic, Sparkles } from 'lucide-react';
import { ScreenId } from '../types';

interface WelcomeScreenProps {
  onStart: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStart,
  onNavigate,
}) => {
  return (
    <div className="min-h-screen bg-[#133A2A] text-[#F7F3EA] flex flex-col justify-between">
      <div className="max-w-6xl w-full mx-auto px-6 py-8 md:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Right / Primary Column in RTL */}
          <div className="lg:col-span-7 space-y-6 text-right">
            <div className="text-sm font-medium text-[#D6A954] tracking-wide">
              تطبيق رِفْق · تجربة الواجهات التفاعلية
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-[#FFFDF9] [text-wrap:balance]">
              رِفْق – رفيق الحفظ والتلاوة
            </h1>

            <p className="text-lg sm:text-xl text-[#E7DFCE] leading-relaxed max-w-2xl">
              رفيقك اليومي لمراجعة وحفظ القرآن الكريم بخطوات هادئة ومنظمة، مع دروس ميسّرة لأحكام التجويد، وتدريب عملي على التلاوة، وباب للأحاديث والأدعية اليومية.
            </p>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onStart}
                className="min-h-[48px] px-7 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-base transition-colors inline-flex items-center gap-3 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7F3EA]"
              >
                <span>ابدأ الرحلة الآن</span>
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('memorization')}
                className="min-h-[48px] px-6 py-3 rounded-xl border border-[#D6A954]/50 hover:bg-[#1C4D39] text-[#F7F3EA] font-medium text-base transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6A954]"
              >
                استعراض خطة المراجعة
              </button>
            </div>

            {/* Clean unboxed feature summary strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 border-t border-[#245641]">
              <button
                type="button"
                onClick={() => onNavigate('memorization')}
                className="text-right p-4 rounded-2xl bg-[#184533] hover:bg-[#1E533E] transition-colors cursor-pointer"
              >
                <BookOpen className="w-5 h-5 text-[#D6A954] mb-2" aria-hidden="true" />
                <div className="font-semibold text-[#FFFDF9] text-base">الحفظ والمراجعة</div>
                <div className="text-sm text-[#D6CEBC] mt-1">
                  متابعة الورد اليومي ووضع التسميع الذاتي
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('tajweed')}
                className="text-right p-4 rounded-2xl bg-[#184533] hover:bg-[#1E533E] transition-colors cursor-pointer"
              >
                <Compass className="w-5 h-5 text-[#D6A954] mb-2" aria-hidden="true" />
                <div className="font-semibold text-[#FFFDF9] text-base">دروس التجويد</div>
                <div className="text-sm text-[#D6CEBC] mt-1">
                  شروحات واضحة وأمثلة نطقية مبسطة
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('recitation')}
                className="text-right p-4 rounded-2xl bg-[#184533] hover:bg-[#1E533E] transition-colors cursor-pointer"
              >
                <Mic className="w-5 h-5 text-[#D6A954] mb-2" aria-hidden="true" />
                <div className="font-semibold text-[#FFFDF9] text-base">التدريب الصوتي</div>
                <div className="text-sm text-[#D6CEBC] mt-1">
                  تمارين التلاوة والتقييم الذاتي الهادئ
                </div>
              </button>
            </div>
          </div>

          {/* Left Visual Column */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md aspect-square rounded-3xl overflow-hidden border border-[#C69749]/35 bg-[#0F2E21] shadow-xl">
              <img
                src="/src/assets/images/rifq_welcome_art_1795193077814.jpg"
                alt="شعار هندسي إسلامي ذهبي على خلفية خضراء داكنة يرمز لتطبيق رفق"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <footer className="max-w-6xl w-full mx-auto px-6 py-5 border-t border-[#245641] flex flex-wrap items-center justify-between gap-4 text-sm text-[#CFC6B4]">
        <div className="inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D6A954]" aria-hidden="true" />
          <span>بيانات تجريبية لاستعراض الشاشات الثماني والتنقل الكامل</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="text-[#D6A954] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
        >
          تخصيص الخط والمظهر
        </button>
      </footer>
    </div>
  );
};
