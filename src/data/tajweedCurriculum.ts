import { TajweedLesson, TajweedLevelNumber, TajweedProgressMap } from '../types';
import { TAJWEED_LESSONS_PART_1 } from './tajweedLessonsPart1';
import { TAJWEED_LESSONS_PART_2 } from './tajweedLessonsPart2';
import {
  SUPPLEMENTARY_NOTICE_TEXT,
  TAJWEED_LEVEL_METADATA,
  TAJWEED_UNITS,
} from './tajweedUnitsMeta';

export {
  SUPPLEMENTARY_NOTICE_TEXT,
  TAJWEED_LEVEL_METADATA,
  TAJWEED_UNITS,
};

export const DEFAULT_TAJWEED_CURRICULUM: TajweedLesson[] = [
  ...TAJWEED_LESSONS_PART_1,
  ...TAJWEED_LESSONS_PART_2,
];

export interface UnitMasteryStat {
  unitId: string;
  unitNumber: number;
  title: string;
  level: TajweedLevelNumber;
  total: number;
  completed: number;
  remaining: number;
  masteryPct: number;
}

export interface LevelMasteryStat {
  level: TajweedLevelNumber;
  title: string;
  total: number;
  completed: number;
  remaining: number;
  masteryPct: number;
}

export interface TajweedAcademyStats {
  totalLessons: number;
  completedLessons: number;
  remainingLessons: number;
  overallMasteryPct: number;
  userTierLabel: string;
  userTierDescription: string;
  unitStats: Record<string, UnitMasteryStat>;
  levelStats: Record<TajweedLevelNumber, LevelMasteryStat>;
}

export function computeTajweedAcademyStats(
  lessons: TajweedLesson[],
  progressMap: TajweedProgressMap
): TajweedAcademyStats {
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((l) => progressMap[l.id]?.passed === true).length;
  const remainingLessons = Math.max(0, totalLessons - completedLessons);
  const overallMasteryPct =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const unitStats: Record<string, UnitMasteryStat> = {};
  for (const unit of TAJWEED_UNITS) {
    const unitLessons = lessons.filter((l) => l.unitId === unit.id);
    const completed = unitLessons.filter((l) => progressMap[l.id]?.passed === true).length;
    const total = unitLessons.length;
    const remaining = Math.max(0, total - completed);
    const masteryPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    unitStats[unit.id] = {
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      title: unit.title,
      level: unit.level,
      total,
      completed,
      remaining,
      masteryPct,
    };
  }

  const levelStats = {} as Record<TajweedLevelNumber, LevelMasteryStat>;
  for (const lvl of [1, 2, 3, 4] as TajweedLevelNumber[]) {
    const lvlLessons = lessons.filter((l) => l.level === lvl);
    const completed = lvlLessons.filter((l) => progressMap[l.id]?.passed === true).length;
    const total = lvlLessons.length;
    const remaining = Math.max(0, total - completed);
    const masteryPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    levelStats[lvl] = {
      level: lvl,
      title: TAJWEED_LEVEL_METADATA[lvl].title,
      total,
      completed,
      remaining,
      masteryPct,
    };
  }

  let userTierLabel = 'مبتدئ';
  let userTierDescription = 'تأسيس أساسيات التجويد ومخارج الحروف وصفاتها.';

  if (overallMasteryPct >= 95 && totalLessons > 0) {
    userTierLabel = 'متقن ومتمكّن';
    userTierDescription = 'أتممت جميع مستويات الأكاديمية من التمهيد حتى الأداء ورسم المصحف.';
  } else if (levelStats[1].masteryPct === 100 && levelStats[2].masteryPct === 100 && levelStats[3].masteryPct === 100) {
    userTierLabel = 'متقدم';
    userTierDescription = 'أتممت المدود والعلاقات واللامات، وتدرس الآن الضاد والظاء والوقف والأداء.';
  } else if (levelStats[1].masteryPct === 100 && levelStats[2].masteryPct === 100) {
    userTierLabel = 'متوسط';
    userTierDescription = 'أتقنت التأسيس والنون والميم، وتخوض الآن أحكام اللامات والإدغام والمدود.';
  } else if (levelStats[1].masteryPct === 100) {
    userTierLabel = 'تأسيسي متقدم';
    userTierDescription = 'أتقنت المخارج والصفات، وتتقدم في التفخيم والترقيق وأحكام النون والميم.';
  } else if (completedLessons > 0) {
    userTierLabel = 'مبتدئ صاعد';
    userTierDescription = 'بدأت خطواتك الأولى في تأسيس التلاوة السليمة وفق المتون المعتمدة.';
  }

  return {
    totalLessons,
    completedLessons,
    remainingLessons,
    overallMasteryPct,
    userTierLabel,
    userTierDescription,
    unitStats,
    levelStats,
  };
}
