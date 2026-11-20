import {
  AchievementBadge,
  RecitationTrack,
  ReviewPortion,
  UserSettings,
  WeeklyDayStat,
} from '../types';

export const INITIAL_SETTINGS: UserSettings = {
  userName: 'عبد الله',
  dailyGoalMinutes: 25,
  dailyGoalPages: 2,
  fontScale: 'large',
  darkMode: false,
  wirdReminder: true,
  adhkarReminder: true,
  audioGuide: true,
};

export const INITIAL_PORTIONS: ReviewPortion[] = [
  {
    id: 'wird-1',
    title: 'وِرد المراجعة اليومي — المقطع الأول',
    type: 'review',
    sectionLabel: 'خطة تجريبية · المرحلة الأولى',
    linesCount: 7,
    estimatedMinutes: 10,
    sampleDisplayNote:
      'موضع عرض المقطع المخصّص للمراجعة اليومية (بيانات تجريبية). يُعرض هنا النص المضبوط بالرسم العثماني مع علامات الوقف والابتداء عند الربط بقاعدة البيانات المعتمدة.',
    practiceChecklist: [
      'قراءة المقطع نظراً بتركيز وهدوء',
      'تطبيق أحكام الغنة والمدود الأساسية',
      'تسميع المقطع غيباً ومطابقة النهايات',
    ],
    completed: true,
  },
  {
    id: 'wird-2',
    title: 'وِرد المراجعة اليومي — المقطع الثاني',
    type: 'review',
    sectionLabel: 'خطة تجريبية · المرحلة الثانية',
    linesCount: 8,
    estimatedMinutes: 10,
    sampleDisplayNote:
      'نموذج تجريبي لوِرد المراجعة المسائي. يمكنك تجربة إخفاء النص للتدرّب على التسميع الذاتي وتحديد إتمام المقطع لتحديث نسبة الإنجاز اليومي.',
    practiceChecklist: [
      'الربط بين نهاية المقطع السابق وبداية الحالي',
      'مراعاة مخارج الحروف المتقاربة',
      'تكرار التسميع مرتين دون تردد',
    ],
    completed: false,
  },
  {
    id: 'hifz-1',
    title: 'الحفظ الجديد — خطة الخمسة أسطر',
    type: 'new',
    sectionLabel: 'حفظ جديد · مقترح اليوم',
    linesCount: 5,
    estimatedMinutes: 12,
    sampleDisplayNote:
      'بطاقة تجريبية لمسار الحفظ الجديد بالتقسيم المتدرج (٥ أسطر يومياً). يتيح لك التطبيق تثبيت كل سطر على حدة ثم ربط الأسطر الخمسة معاً.',
    practiceChecklist: [
      'ترديد السطر الأول خمس مرات متتالية',
      'دمج السطرين الأول والثاني معاً',
      'مراجعة الأسطر الخمسة قبل النوم',
    ],
    completed: false,
  },
];

export const RECITATION_TRACKS: RecitationTrack[] = [
  {
    id: 'rec-1',
    title: 'تمرين تلاوة هادئة — المقطع الأول',
    focusRule: 'التركيز: ضبط الغنة والمد الطبيعي',
    durationLabel: '٣ دقائق',
    sampleGuideText:
      'نموذج تدريب تجريبي: اقرأ بهدوء مع ضبط مخارج الحروف وتطبيق مد الحركتين، ثم قارن أداءك بنقاط التقييم الذاتي.',
  },
  {
    id: 'rec-2',
    title: 'تمرين المخارج والقلقلة',
    focusRule: 'التركيز: وضوح القلقلة الصغرى والكبرى',
    durationLabel: '٤ دقائق',
    sampleGuideText:
      'نموذج تدريب تجريبي: ركّز على سكون حروف (ق ط ب ج د) في أواسط الكلمات وأواخر الوقف بنبرة متزنة.',
  },
  {
    id: 'rec-3',
    title: 'تمرين الوقف والابتداء',
    focusRule: 'التركيز: التنفس المريح والوقف الحسن',
    durationLabel: '٥ دقائق',
    sampleGuideText:
      'نموذج تدريب تجريبي: تدرّب على التوقف عند العلامات المناسبة واستئناف القراءة بنفَس متزن وواضح.',
  },
];

export const WEEKLY_STATS: WeeklyDayStat[] = [
  { dayLabel: 'السبت', minutes: 20, pages: 2 },
  { dayLabel: 'الأحد', minutes: 25, pages: 2 },
  { dayLabel: 'الإثنين', minutes: 15, pages: 1 },
  { dayLabel: 'الثلاثاء', minutes: 30, pages: 3 },
  { dayLabel: 'الأربعاء', minutes: 22, pages: 2 },
  { dayLabel: 'الخميس', minutes: 28, pages: 2 },
  { dayLabel: 'الجمعة', minutes: 18, pages: 2 },
];

export const INITIAL_ACHIEVEMENTS: AchievementBadge[] = [
  {
    id: 'ach-1',
    title: 'بداية الرفقة',
    description: 'إتمام أول جلسة مراجعة أو ورد يومي بهدوء',
    progressLabel: 'مكتمل',
    unlocked: true,
    tier: 'daily',
  },
  {
    id: 'ach-daily-wird',
    title: 'إتمام وِرد اليوم',
    description: 'إنجاز ٣ عناصر على الأقل من خطة اليوم',
    progressLabel: '٠ / ٣ عناصر',
    unlocked: false,
    tier: 'daily',
  },
  {
    id: 'ach-2',
    title: 'بركة الأسبوع',
    description: 'إتمام ٥ جلسات أو أيام نشطة خلال الأسبوع دون ضغط',
    progressLabel: '٧ / ٥ أيام',
    unlocked: true,
    tier: 'weekly',
  },
  {
    id: 'ach-3',
    title: 'طالب التجويد',
    description: 'اجتياز ٣ دروس في أحكام النون الساكنة والمدود',
    progressLabel: '٢ / ٣ دروس',
    unlocked: false,
    tier: 'weekly',
  },
  {
    id: 'ach-4',
    title: 'تلاوة متقنة',
    description: 'إجراء ٥ جلسات تدريب ومقارنة صوتية للتلاوة',
    progressLabel: '٣ / ٥ جلسات',
    unlocked: false,
    tier: 'weekly',
  },
  {
    id: 'ach-monthly-companion',
    title: 'رفيق الشهر الهادئ',
    description: 'جمع ٢٠٠ نقطة تحفيزية إيجابية خلال الشهر',
    progressLabel: '٠ / ٢٠٠ نقطة',
    unlocked: false,
    tier: 'monthly',
  },
  {
    id: 'ach-monthly-goals',
    title: 'منجز الأهداف الشخصية',
    description: 'تحقيق هدفين شخصيين على الأقل من أهدافك المحددة',
    progressLabel: '٠ / ٢ هدف',
    unlocked: false,
    tier: 'monthly',
  },
  {
    id: 'ach-monthly-tajweed',
    title: 'متدرج التجويد الشهري',
    description: 'إتمام ٥٠٪ أو أكثر من منهج التجويد المتدرج',
    progressLabel: '٠٪',
    unlocked: false,
    tier: 'monthly',
  },
];

export const DEFAULT_PERSONAL_GOALS = [
  {
    id: 'pg-default-1',
    title: 'مراجعة وحفظ ٥ آيات بهدوء يومياً',
    scope: 'daily' as const,
    category: 'memorization' as const,
    targetCount: 5,
    currentCount: 2,
    unitLabel: 'آيات',
    note: 'قليلٌ دائم خيرٌ من كثيرٍ منقطع',
    createdAt: '2026-11-01T08:00:00.000Z',
    completed: false,
  },
  {
    id: 'pg-default-2',
    title: 'إتمام ٤ جلسات حفظ أو مراجعة هذا الأسبوع',
    scope: 'weekly' as const,
    category: 'memorization' as const,
    targetCount: 4,
    currentCount: 2,
    unitLabel: 'جلسات',
    note: 'في أي أيام تناسب وقتي خلال الأسبوع',
    createdAt: '2026-11-01T08:00:00.000Z',
    completed: false,
  },
  {
    id: 'pg-default-3',
    title: 'إتقان درسين جديدين في أحكام التجويد هذا الشهر',
    scope: 'monthly' as const,
    category: 'tajweed' as const,
    targetCount: 2,
    currentCount: 1,
    unitLabel: 'دروس',
    note: 'التركيز على التطبيق الصوتي أثناء القراءة',
    createdAt: '2026-11-01T08:00:00.000Z',
    completed: false,
  },
];

export const PREVIOUS_MONTH_BASELINE = {
  previousMonthLabel: 'الشهر السابق',
  previousSessions: 14,
  previousMinutes: 360,
  previousTajweedLessons: 2,
  previousRecitationSessions: 4,
};

