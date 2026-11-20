import { TajweedLevelNumber, TajweedUnitMeta } from '../types';

export const SUPPLEMENTARY_NOTICE_TEXT =
  'هذا الحكم من الموضوعات المكملة، ولا يوجد له شاهد مباشر في المتنين المشار إليهما';

export const TAJWEED_LEVEL_METADATA: Record<
  TajweedLevelNumber,
  {
    level: TajweedLevelNumber;
    title: string;
    subtitle: string;
    tierName: string;
    passingScorePct: number;
  }
> = {
  1: {
    level: 1,
    title: 'المستوى الأول: التمهيد والمخارج والصفات',
    subtitle: 'أساسيات علم التجويد، المخارج السبعة عشر، والصفات المتضادة وغير المتضادة',
    tierName: 'مبتدئ',
    passingScorePct: 67,
  },
  2: {
    level: 2,
    title: 'المستوى الثاني: التفخيم والترقيق والنون والميم',
    subtitle: 'التفخيم والترقيق، أحكام النون الساكنة والتنوين، المشددتين، والميم الساكنة',
    tierName: 'تأسيسي متقدم',
    passingScorePct: 67,
  },
  3: {
    level: 3,
    title: 'المستوى الثالث: اللامات والعلاقات والمدود',
    subtitle: 'أحكام اللامات، الإدغام بين الحروف، وجميع أقسام المدود في رواية حفص',
    tierName: 'متوسط',
    passingScorePct: 67,
  },
  4: {
    level: 4,
    title: 'المستوى الرابع: الضاد والظاء والوقف والأداء والرسم',
    subtitle: 'التمييز بين الضاد والظاء، الوقف والابتداء، ومباحث الأداء ورسم المصحف',
    tierName: 'متقدم',
    passingScorePct: 67,
  },
};

export const TAJWEED_UNITS: TajweedUnitMeta[] = [
  {
    id: 'unit-01',
    unitNumber: 1,
    level: 1,
    title: 'الوحدة الأولى: أساسيات علم التجويد',
    subtitle: 'التعريف والأهمية، اللحن الجلي والخفي، مراتب القراءة، الاستعاذة والبسملة',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-02',
    unitNumber: 2,
    level: 1,
    title: 'الوحدة الثانية: مخارج الحروف',
    subtitle: 'المخارج العامة والخاصة السبعة عشر: الجوف، الحلق، اللسان، الشفتان، الخيشوم',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-03',
    unitNumber: 3,
    level: 1,
    title: 'الوحدة الثالثة: صفات الحروف',
    subtitle: 'الصفات المتضادة العشر والصفات السبع التي لا ضد لها مع الغنة',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-04',
    unitNumber: 4,
    level: 2,
    title: 'الوحدة الرابعة: التفخيم والترقيق',
    subtitle: 'الحروف المفخمة والمرققة، مراتب التفخيم، الراء، ولام لفظ الجلالة',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-05',
    unitNumber: 5,
    level: 2,
    title: 'الوحدة الخامسة: أحكام النون الساكنة والتنوين',
    subtitle: 'الإظهار الحلقي والمطلق، الإدغام الكامل والناقص، الإقلاب، والإخفاء الحقيقي',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-06',
    unitNumber: 6,
    level: 2,
    title: 'الوحدة السادسة: أحكام النون والميم المشددتين',
    subtitle: 'الغنة ومقدارها وكيفية تطبيقها عملياً وصلاً ووقفاً',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-07',
    unitNumber: 7,
    level: 2,
    title: 'الوحدة السابعة: أحكام الميم الساكنة',
    subtitle: 'الإخفاء الشفوي، الإدغام الشفوي، الإظهار الشفوي والتحذير عند الواو والفاء',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-08',
    unitNumber: 8,
    level: 3,
    title: 'الوحدة الثامنة: أحكام اللامات',
    subtitle: 'اللام الشمسية والقمرية، لام الفعل، ولام لفظ الجلالة',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-09',
    unitNumber: 9,
    level: 3,
    title: 'الوحدة التاسعة: الإدغام بين الحروف',
    subtitle: 'المتماثلان والمتجانسان والمتقاربان، الصغير والكبير، الكامل والناقص',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-10',
    unitNumber: 10,
    level: 3,
    title: 'الوحدة العاشرة: أحكام المدود',
    subtitle: 'المد الطبيعي والفرعي، المتصل والمنفصل والبدل والعارض واللين واللازم والملحقات',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-11',
    unitNumber: 11,
    level: 4,
    title: 'الوحدة الحادية عشرة: الضاد والظاء',
    subtitle: 'الفروق المخرجية والصفاتية بين الضاد والظاء وأخطاء النطق الشائعة',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-12',
    unitNumber: 12,
    level: 4,
    title: 'الوحدة الثانية عشرة: الوقف والابتداء',
    subtitle: 'الوقف التام والكافي والحسن والقبيح، وعلامات الوقف في المصحف',
    category: 'tajweed_phonetics',
  },
  {
    id: 'unit-13',
    unitNumber: 13,
    level: 4,
    title: 'الوحدة الثالثة عشرة: مباحث أداء ورسم المصحف',
    subtitle: 'المقطوع والموصول، هاء التأنيث، همزة الوصل والقطع، الروم والإشمام، والسكت',
    category: 'performance_and_rasm',
    categoryNotice:
      'تصنيف علمي: هذه الوحدة تبحث في علم الأداء القرآني ورسم المصحف العثماني وطرق القراءة، وليست من أحكام التجويد الصوتية الصرفة.',
  },
];
