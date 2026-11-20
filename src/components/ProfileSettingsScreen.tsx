import React, { useState } from 'react';
import { Bell, Check, Moon, Sparkles, Sun, Type, User } from 'lucide-react';
import { FontScale, ScreenId, UserSettings } from '../types';

interface ProfileSettingsScreenProps {
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const ProfileSettingsScreen: React.FC<ProfileSettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onNavigate,
}) => {
  const [nameInput, setNameInput] = useState(settings.userName);
  const [savedFlag, setSavedFlag] = useState(false);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim() || 'عبد الله';
    onUpdateSettings({ ...settings, userName: cleaned });
    setSavedFlag(true);
    window.setTimeout(() => setSavedFlag(false), 2500);
  };

  const toggleSetting = (
    key: 'darkMode' | 'wirdReminder' | 'adhkarReminder' | 'audioGuide'
  ) => {
    onUpdateSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
          الملف الشخصي والإعدادات
        </h2>
        <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-1">
          تخصيص الاسم، حجم الخط العربي، الهدف اليومي، والتنبيهات
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Identity & Daily Goals */}
        <section className="lg:col-span-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-6">
          <div className="flex items-center gap-4 border-b border-[#ECE4D4] dark:border-[#214232] pb-5">
            <div className="w-16 h-16 rounded-2xl bg-[#133A2A] text-[#D6A954] flex items-center justify-center shrink-0">
              <User className="w-8 h-8" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                {settings.userName}
              </h3>
              <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                هدفك اليومي: {settings.dailyGoalMinutes} دقيقة · {settings.dailyGoalPages} صفحة
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveName} className="space-y-3">
            <label
              htmlFor="profile-name"
              className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
            >
              الاسم المعروض في رسالة الترحيب
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="profile-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 min-w-[180px] min-h-[48px] px-4 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-[#1A2A22] dark:text-[#F7F3EA] focus:outline-2 focus:outline-[#C69749]"
              />
              <button
                type="submit"
                className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] dark:hover:bg-[#B38538] text-[#F7F3EA] dark:text-[#133A2A] font-bold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {savedFlag && <Check className="w-4 h-4" aria-hidden="true" />}
                <span>{savedFlag ? 'تم الحفظ' : 'حفظ الاسم'}</span>
              </button>
            </div>
          </form>

          {/* Daily Goal Time */}
          <div className="space-y-3">
            <div className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              الهدف اليومي للمراجعة والحفظ (بالدقائق)
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[15, 25, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, dailyGoalMinutes: mins })
                  }
                  className={`min-h-[48px] rounded-xl font-bold text-sm tabular-nums transition-colors cursor-pointer ${
                    settings.dailyGoalMinutes === mins
                      ? 'bg-[#C69749] text-[#133A2A]'
                      : 'bg-[#F4EDE0] dark:bg-[#173326] text-[#1A2A22] dark:text-[#E5DDCC]'
                  }`}
                >
                  {mins} دقيقة
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#ECE4D4] dark:border-[#214232]">
            <button
              type="button"
              onClick={() => onNavigate('welcome')}
              className="min-h-[48px] w-full px-5 py-3 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] dark:hover:bg-[#234B39] text-[#133A2A] dark:text-[#F7F3EA] font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#C69749]" aria-hidden="true" />
              <span>عرض الشاشة الترحيبية للتطبيق</span>
            </button>
          </div>
        </section>

        {/* Typography & Appearance & Notifications */}
        <section className="lg:col-span-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-6">
          {/* Font Scale */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-base font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              <Type className="w-5 h-5 text-[#C69749]" aria-hidden="true" />
              <span>حجم الخط العربي المريح للقراءة</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { id: 'normal', label: 'قياسي' },
                  { id: 'large', label: 'كبير ومريح' },
                  { id: 'xlarge', label: 'كبير جداً' },
                ] as { id: FontScale; label: string }[]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, fontScale: option.id })
                  }
                  className={`min-h-[48px] px-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                    settings.fontScale === option.id
                      ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                      : 'bg-[#F4EDE0] dark:bg-[#173326] text-[#1A2A22] dark:text-[#E5DDCC]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A]">
            <div className="flex items-center gap-3">
              {settings.darkMode ? (
                <Moon className="w-5 h-5 text-[#D6A954]" aria-hidden="true" />
              ) : (
                <Sun className="w-5 h-5 text-[#9C6F21]" aria-hidden="true" />
              )}
              <div>
                <div className="font-bold text-sm text-[#133A2A] dark:text-[#F7F3EA]">
                  المظهر الليلي الهادئ
                </div>
                <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                  التبديل بين البيج الدافئ والأخضر الليلي
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.darkMode}
              onClick={() => toggleSetting('darkMode')}
              className={`min-h-[44px] px-4 rounded-xl text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                settings.darkMode
                  ? 'bg-[#C69749] text-[#133A2A]'
                  : 'bg-[#133A2A] text-[#F7F3EA]'
              }`}
            >
              {settings.darkMode ? 'مُفعّل' : 'النهاري'}
            </button>
          </div>

          {/* Notification Toggles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-base font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              <Bell className="w-5 h-5 text-[#C69749]" aria-hidden="true" />
              <span>التنبيهات والتذكير اليومي</span>
            </div>

            {[
              {
                key: 'wirdReminder' as const,
                title: 'تذكير وِرد المراجعة اليومي',
                desc: 'تنبيه لطيف في الموعد المحدد يومياً',
              },
              {
                key: 'adhkarReminder' as const,
                title: 'تنبيه أذكار الصباح والمساء',
                desc: 'إشعار مختصر لقراءة الأذكار اليومية',
              },
              {
                key: 'audioGuide' as const,
                title: 'الإرشاد الصوتي أثناء التدريب',
                desc: 'تفعيل النبرة الإرشادية عند نطق أمثلة التجويد',
              },
            ].map((row) => {
              const active = settings[row.key];
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A]"
                >
                  <div>
                    <div className="font-bold text-sm text-[#133A2A] dark:text-[#F7F3EA]">
                      {row.title}
                    </div>
                    <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                      {row.desc}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    onClick={() => toggleSetting(row.key)}
                    className={`min-h-[40px] px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                        : 'bg-[#E5DEC9] text-[#5C665E] dark:bg-[#193628] dark:text-[#BFB6A4]'
                    }`}
                  >
                    {active ? 'مُفعّل' : 'متوقف'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
