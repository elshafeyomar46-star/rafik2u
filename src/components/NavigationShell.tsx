import React from 'react';
import {
  Award,
  BookOpen,
  Compass,
  HeartHandshake,
  Home,
  Mic,
  Settings,
  Sparkles,
} from 'lucide-react';
import { ScreenId } from '../types';

interface NavigationShellProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  children: React.ReactNode;
}

const DESKTOP_NAV_ITEMS: {
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'memorization', label: 'الحفظ والمراجعة', icon: BookOpen },
  { id: 'tajweed', label: 'دروس التجويد', icon: Compass },
  { id: 'recitation', label: 'التدريب على التلاوة', icon: Mic },
  { id: 'hadith_dua', label: 'الأحاديث والأدعية', icon: HeartHandshake },
  { id: 'achievements', label: 'التحفيز والإنجازات', icon: Award },
  { id: 'profile', label: 'الملف الشخصي', icon: Settings },
  { id: 'welcome', label: 'الشاشة الترحيبية', icon: Sparkles },
];

const MOBILE_BOTTOM_TABS: {
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'memorization', label: 'الحفظ', icon: BookOpen },
  { id: 'tajweed', label: 'التجويد', icon: Compass },
  { id: 'recitation', label: 'التلاوة', icon: Mic },
  { id: 'hadith_dua', label: 'الأذكار', icon: HeartHandshake },
];

const SCREEN_TITLES: Record<ScreenId, string> = {
  welcome: 'مرحباً بك في رِفْق',
  home: 'رِفْق – الصفحة الرئيسية',
  memorization: 'مراجعة وحفظ القرآن',
  tajweed: 'دروس التجويد',
  recitation: 'التدريب على التلاوة',
  hadith_dua: 'الأحاديث والأدعية',
  achievements: 'التحفيز والإنجازات والأهداف',
  profile: 'الملف الشخصي والإعدادات',
};

export const NavigationShell: React.FC<NavigationShellProps> = ({
  currentScreen,
  onNavigate,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#F7F3EA] dark:bg-[#0D1F17] text-[#1A2A22] dark:text-[#F7F3EA] flex flex-col md:flex-row">
      {/* Desktop RTL Sidebar Navigation */}
      <aside className="hidden md:flex md:w-72 md:shrink-0 md:flex-col md:justify-between bg-[#133A2A] text-[#F7F3EA] border-l border-[#214E3B] sticky top-0 h-screen p-6">
        <div className="space-y-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-right w-full cursor-pointer"
          >
            <div className="font-display text-3xl font-bold text-[#FFFDF9]">
              رِفْق
            </div>
            <div className="text-xs text-[#D6A954] mt-0.5">
              رفيق الحفظ والتلاوة
            </div>
          </button>

          <nav aria-label="الأقسام الرئيسية" className="space-y-1.5">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#C69749] text-[#133A2A]'
                      : 'text-[#E5DDCC] hover:bg-[#1A4B37]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#214E3B] text-xs text-[#CFC6B4]">
          رِفْق · حفظ وتلاوة وتجويد برفق
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Mobile Top App Bar (<= 56px) */}
        <header className="md:hidden sticky top-0 z-30 h-14 px-4 bg-[#133A2A]/95 backdrop-blur-md text-[#F7F3EA] border-b border-[#214E3B] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="font-display text-xl font-bold text-[#D6A954] whitespace-nowrap shrink-0 cursor-pointer"
          >
            رِفْق
          </button>

          <h1 className="text-sm font-bold truncate text-center">
            {SCREEN_TITLES[currentScreen]}
          </h1>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('achievements')}
              aria-label="الإنجازات والإحصائيات"
              className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center cursor-pointer ${
                currentScreen === 'achievements' ? 'text-[#D6A954]' : 'text-[#E5DDCC]'
              }`}
            >
              <Award className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-label="الملف الشخصي والإعدادات"
              className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center cursor-pointer ${
                currentScreen === 'profile' ? 'text-[#D6A954]' : 'text-[#E5DDCC]'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="التنقل السفلي"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-[#FFFDF9]/95 dark:bg-[#11261D]/95 backdrop-blur-md border-t border-[#DFD6C5] dark:border-[#244736] grid grid-cols-5 items-center px-1"
      >
        {MOBILE_BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#133A2A] dark:text-[#D6A954] font-bold'
                  : 'text-[#6B6254] dark:text-[#BFB6A4] font-medium'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[11px] leading-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
