export type ScreenId =
  | 'welcome'
  | 'home'
  | 'memorization'
  | 'tajweed'
  | 'recitation'
  | 'hadith_dua'
  | 'achievements'
  | 'profile';

export type FontScale = 'normal' | 'large' | 'xlarge';

export interface UserSettings {
  userName: string;
  dailyGoalMinutes: number;
  dailyGoalPages: number;
  fontScale: FontScale;
  darkMode: boolean;
  wirdReminder: boolean;
  adhkarReminder: boolean;
  audioGuide: boolean;
}

export interface SurahSummary {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan' | string;
}

export interface QuranAyah {
  number: number;
  numberInSurah: number;
  text: string;
  juz?: number;
  page?: number;
}

export type MemorizationLevel = 'new' | 'needs_review' | 'mastered';

export interface DailyScheduleDay {
  dayNumber: number;
  fromAyah: number;
  toAyah: number;
  completed: boolean;
  completedAt?: string;
  lastScorePct?: number;
}

export interface MemorizationPlan {
  id: string;
  surahNumber: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  ayahsPerDay: number;
  level: MemorizationLevel;
  createdAt: string;
  schedule: DailyScheduleDay[];
}

export type QuizQuestionType =
  | 'complete_ayah_write'
  | 'next_ayah_write'
  | 'prev_ayah_write'
  | 'written_recitation'
  | 'complete_passage_write'
  | 'free_recitation'
  | 'resume_from_stop'
  | 'order_ayahs'
  | 'mutashabihat_review'
  | 'voice_recitation'
  | 'spot_mistake'
  // Legacy types preserved for compatibility with existing saved mistakeQueue items
  | 'multiple_choice'
  | 'complete_ayah'
  | 'next_ayah'
  | 'write_from_memory';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export type QuizScopeMode =
  | 'all_memorized'
  | 'specific_juz'
  | 'specific_surahs'
  | 'specific_ayahs'
  | 'full_quran';

export interface QuizDistributionWeights {
  writingPct: number; // default 70
  recitationAndRecallPct: number; // default 20
  mutashabihatChoicePct: number; // default 10
}

export interface MutashabihReferenceOption {
  label: string; // e.g. "سورة البقرة · الآية ٣٥"
  surahNumber: number;
  ayahNumber: number;
  juzNumber: number;
  verifiedText: string;
}

export interface SpotMistakeExercise {
  practiceTokens: string[];
  mistakenTokenIndex: number;
  mixedUpWord: string;
  correctWord: string;
  mixupSourceNote: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  difficulty: QuizDifficulty;
  difficultyLabel: string;
  typeLabel: string;
  surahNumber: number;
  surahName: string;
  targetAyahNumber: number;
  endAyahNumber?: number;
  juzNumber: number;
  riwayahLabel?: string; // رواية حفص عن عاصم
  positionInSurah?: 'beginning' | 'middle' | 'end';
  memorizationAgeLabel?: string; // محفوظ جديد / يحتاج مراجعة / محفوظ قديم متقن
  promptTitle: string;
  promptBody: string;
  hintText?: string;
  options?: string[];
  mutashabihOptions?: MutashabihReferenceOption[];
  mutashabihDifferenceNote?: string;
  mutashabihPairId?: string;
  spotMistake?: SpotMistakeExercise;
  correctAnswerText: string;
  orderedItems?: { ayahNumber: number; text: string }[];
  correctOrderNumbers?: number[];
  fullAyahText: string;
  previousAyahText?: string;
}

export interface AyahReviewStat {
  key: string; // `${surahNumber}:${ayahNumber}`
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  juzNumber: number;
  correctCount: number;
  mistakeCount: number;
  lastReviewedAt: string;
  mastered: boolean;
}

export interface SmartReviewMemory {
  ayahStats: Record<string, AyahReviewStat>;
  surahLastReviewed: Record<number, string>;
  confusedMutashabihIds: Record<string, number>;
  recentQuestionIds: string[];
}

export interface MistakeQueueItem {
  id: string;
  surahNumber: number;
  surahName: string;
  targetAyahNumber: number;
  juzNumber?: number;
  questionType: QuizQuestionType;
  questionTypeLabel: string;
  errorSummary: string;
  question: QuizQuestion;
  addedAt: string;
  attempts: number;
}

export interface CompletedSessionRecord {
  id: string;
  surahName: string;
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  scorePct: number;
  totalQuestions: number;
  correctQuestions: number;
  completedAt: string;
  mode: 'reading' | 'quiz' | 'mistake_review' | 'comprehensive_review';
  surahsTested?: string[];
  juzTested?: number[];
}

export interface ReviewPortion {
  id: string;
  title: string;
  type: 'review' | 'new';
  sectionLabel: string;
  linesCount: number;
  estimatedMinutes: number;
  sampleDisplayNote: string;
  practiceChecklist: string[];
  completed: boolean;
}

export type TajweedLevelNumber = 1 | 2 | 3 | 4;

export type ScientificReviewStatus = 'reviewed' | 'pending_review';

export type TajweedKnowledgeCategory =
  | 'tajweed_phonetics'
  | 'performance_and_rasm';

export type MutunId = 'tuhfa' | 'jazariyyah';

export interface MutunVerseEntry {
  verseNumber: number;
  sadr: string;
  ajuz: string;
}

export interface MutunChapter {
  chapterNumber: number;
  title: string;
  verses: MutunVerseEntry[];
}

export interface MutunDocument {
  id: MutunId;
  title: string;
  fullTitle: string;
  author: string;
  editionNote: string;
  totalVerses: number;
  chapters: MutunChapter[];
}

export interface MutunWitness {
  id: string;
  matnId: MutunId;
  matnName: string;
  chapterNumber: number;
  chapterTitle: string;
  verseNumbers: number[];
  verseIndicesLabel: string;
  verses: MutunVerseEntry[];
  highlightedPhrase: string;
  simpleExplanation: string;
}

export interface SupplementaryScholarSource {
  noticeText: string;
  sourceTitle: string;
  author: string;
  topicSummary: string;
}

export interface TajweedUnitMeta {
  id: string;
  unitNumber: number;
  level: TajweedLevelNumber;
  title: string;
  subtitle: string;
  category: TajweedKnowledgeCategory;
  categoryNotice?: string;
}

export interface TajweedExampleRef {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  highlightSegment: string;
  ruleNote: string;
}

export interface TajweedPracticeItem {
  id: string;
  prompt: string;
  targetToken: string;
  options: string[];
  correctOption: string;
  feedbackText: string;
}

export interface TajweedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TajweedLesson {
  id: string;
  level: TajweedLevelNumber;
  unitId: string;
  unitNumber: number;
  unitTitle: string;
  category: TajweedKnowledgeCategory;
  title: string;
  learningObjectives: string[];
  simpleDefinition: string;
  explanation: string;
  lettersOrPoints: string;
  scientificReference: string;
  reviewStatus: ScientificReviewStatus;
  durationMinutes: number;
  mutunWitnesses: MutunWitness[];
  supplementarySource?: SupplementaryScholarSource;
  exampleRefs: TajweedExampleRef[];
  practiceItems: TajweedPracticeItem[];
  quizQuestions: TajweedQuizQuestion[];
}

export interface TajweedProgressMap {
  [lessonId: string]: {
    passed: boolean;
    bestScorePct: number;
    practiceCompleted: boolean;
  };
}

export interface RecitationTrack {
  id: string;
  title: string;
  focusRule: string;
  durationLabel: string;
  sampleGuideText: string;
}

export interface PotentialDifferenceItem {
  expectedWord: string;
  heardAs: string;
  note: string;
}

export interface RecitationAnalysisReport {
  audioClarity: 'clear' | 'moderate' | 'unclear';
  clarityNote: string;
  transcribedText: string;
  recognizedWords: string[];
  unclearWords: string[];
  potentialDifferences: PotentialDifferenceItem[];
  readingTips: string[];
  tajweedInitialNotes: string[];
}

export type HadithCollectionSlug =
  | 'ara-bukhari'
  | 'ara-muslim'
  | 'ara-abudawud'
  | 'ara-tirmidhi'
  | 'ara-ibnmajah';

export type ContentPublishStatus = 'published' | 'pending_review';

export interface VerifiedHadithCardData {
  collectionSlug: HadithCollectionSlug;
  sourceBook: string;
  hadithNumber: number;
  narrator: string;
  authenticityGrade: string;
  text: string;
  simpleExplanation: string;
}

export interface VerifiedDuaCardData {
  title: string;
  text: string;
  sourceBook: string;
  hadithNumber?: number;
  authenticityGrade: string;
  virtueOrOccasion: string;
  simpleExplanation: string;
  recommendedCount: number;
}

export interface HadithDuaQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DailyHadithDuaEntry {
  id: string;
  dayNumber: number;
  dateLabel: string;
  publishStatus: ContentPublishStatus;
  reviewedByNote: string;
  hadith: VerifiedHadithCardData;
  dua: VerifiedDuaCardData;
  quiz: HadithDuaQuizQuestion[];
}

export type HadithBookId = 'bukhari' | 'muslim' | 'ibnmajah';

export type HadithRecordClassification =
  | 'prophetic_hadith'
  | 'athar_or_intro';

export interface HadithLibraryRecord {
  id: string; // e.g. "bukhari:1"
  bookId: HadithBookId;
  bookTitle: string; // صحيح البخاري | صحيح مسلم | سنن ابن ماجه
  chapterId: number;
  chapterName: string; // اسم الكتاب / الباب من المصدر بالعربية
  chapterSequence: number; // الترتيب التسلسلي داخل الكتاب/الباب
  hadithNumber: number; // رقم الحديث الأساسي في النسخة (idInBook)
  internationalNumber: number | null; // الترقيم العالمي/دار السلام إن وجد في النسخة المساندة
  numberInChapter: number | null; // رقم الحديث داخل الباب (من reference.hadith إن توفر)
  fullArabicText: string; // نص الحديث العربي الكامل كما ورد في المصدر دون تعديل أو اختصار
  isnad: string | null; // السند كما ورد في المصدر (إن أمكن فصله بدقة دون تعديل)
  matn: string; // المتن كما ورد في المصدر
  companionNarrator: string; // اسم الصحابي الراوي (أو بيان عدم التحديد في المصدر)
  authenticityGrade: string; // درجة الحديث الموثقة
  gradingScholar: string; // اسم العالم أو المصدر الحاكم على الحديث
  recordClassification: HadithRecordClassification; // تمييز الحديث النبوي المرفوع عن الآثار/المقدمة
  topicCategories: string[]; // تصنيفات الموضوع المستخلصة من اسم الكتاب
  sourceUrl: string; // رابط المصدر الأصلي
  textSourceName: string; // مصدر النص
  datasetVersion: string; // نسخة البيانات المستخدمة
}

export interface HadithChapterSummary {
  bookId: HadithBookId;
  chapterId: number;
  chapterName: string;
  count: number;
}

export interface HadithBookAuditStats {
  bookId: HadithBookId;
  bookTitle: string;
  primarySourceName: string;
  primarySourceUrl: string;
  primarySourceVersion: string;
  expectedCountPrimary: number;
  importedCount: number;
  emptyOrMissingInPrimary: number;
  secondarySourceName: string;
  secondarySourceUrl: string;
  secondarySourceVersion: string;
  expectedCountSecondary: number;
  secondaryNonEmptyCount: number;
  secondaryEmptyCount: number;
  emptyNumbersSecondarySample: number[];
  matchedWithSecondaryCount: number;
  ungradedCount: number;
  propheticHadithCount: number;
  atharOrIntroCount: number;
  completenessStatus:
    | 'complete_primary_verified'
    | 'complete_primary_with_secondary_gaps'
    | 'incomplete';
  statusNote: string;
}

export interface HadithLibraryManifest {
  importedAt: string;
  datasetVersion: string;
  totalImportedCount: number;
  totalPropheticCount: number;
  totalAtharOrIntroCount: number;
  books: HadithBookAuditStats[];
  chaptersByBook: Record<HadithBookId, HadithChapterSummary[]>;
  topNarrators: { name: string; count: number }[];
  topics: { name: string; count: number }[];
  grades: { name: string; count: number }[];
}

export interface HadithLibrarySearchResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: HadithLibraryRecord[];
}

export type BadgeTier = 'daily' | 'weekly' | 'monthly';

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  progressLabel: string;
  unlocked: boolean;
  tier: BadgeTier;
}

export interface WeeklyDayStat {
  dayLabel: string;
  minutes: number;
  pages: number;
}

export type GoalScope = 'daily' | 'weekly' | 'monthly';

export type GoalCategory =
  | 'memorization'
  | 'tajweed'
  | 'recitation'
  | 'hadith_dua'
  | 'general';

export interface PersonalGoal {
  id: string;
  title: string;
  scope: GoalScope;
  category: GoalCategory;
  targetCount: number;
  currentCount: number;
  unitLabel: string;
  note?: string;
  createdAt: string;
  completed: boolean;
}

export interface DailyMotivationCheckin {
  dateKey: string;
  wirdMemorizationDone: boolean;
  wirdTajweedDone: boolean;
  wirdRecitationDone: boolean;
  wirdHadithDuaDone: boolean;
  restDayTaken: boolean;
  bonusPoints: number;
}

export interface MonthlyComparisonSnapshot {
  previousMonthLabel: string;
  previousSessions: number;
  previousMinutes: number;
  previousTajweedLessons: number;
  previousRecitationSessions: number;
}

export interface SuggestedGoalTemplate {
  id: string;
  title: string;
  scope: GoalScope;
  category: GoalCategory;
  targetCount: number;
  unitLabel: string;
  reason: string;
}

