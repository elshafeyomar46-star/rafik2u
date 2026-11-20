import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mic,
  Shield,
  Sparkles,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import { fetchAllSurahs, fetchSurahAyahsUthmani } from '../services/quranApi';
import {
  MemorizationPlan,
  QuranAyah,
  RecitationAnalysisReport,
  SurahSummary,
} from '../types';
import { normalizeArabicForComparison } from '../utils/quranQuizGenerator';

interface RecitationScreenProps {
  activePlan: MemorizationPlan | null;
  onLogSession: () => void;
  sessionsCount: number;
  fontSizeClass: string;
}

export const RecitationScreen: React.FC<RecitationScreenProps> = ({
  activePlan,
  onLogSession,
  sessionsCount,
  fontSizeClass,
}) => {
  // Reference Surah & Ayah Range Selection
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [surahNumber, setSurahNumber] = useState<number>(
    activePlan?.surahNumber ?? 112
  );
  const [fromAyah, setFromAyah] = useState<number>(activePlan?.fromAyah ?? 1);
  const [toAyah, setToAyah] = useState<number>(activePlan?.toAyah ?? 4);
  const [surahAyahs, setSurahAyahs] = useState<QuranAyah[]>([]);
  const [ayahsLoading, setAyahsLoading] = useState(false);
  const [ayahsError, setAyahsError] = useState<string | null>(null);
  const [hideTextForRecitation, setHideTextForRecitation] = useState(false);

  // Microphone & Recording State
  const [micPermissionState, setMicPermissionState] = useState<
    'idle' | 'granted' | 'denied'
  >('idle');
  const [micError, setMicError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');

  // Privacy Consent State (default: do NOT retain audio after analysis)
  const [keepAudioConsent, setKeepAudioConsent] = useState(false);
  const [autoDeletedNotice, setAutoDeletedNotice] = useState(false);

  // Gemini Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [report, setReport] = useState<RecitationAnalysisReport | null>(null);
  const [sessionLoggedNotice, setSessionLoggedNotice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load 114 Surahs
  useEffect(() => {
    void fetchAllSurahs()
      .then(setSurahs)
      .catch(() => {});
  }, []);

  // Load verified Uthmani ayahs when Surah changes
  useEffect(() => {
    let active = true;
    setAyahsLoading(true);
    setAyahsError(null);
    void fetchSurahAyahsUthmani(surahNumber)
      .then((list) => {
        if (!active) return;
        setSurahAyahs(list);
      })
      .catch((err) => {
        if (!active) return;
        setAyahsError(
          err instanceof Error
            ? err.message
            : 'تعذر تحميل الآيات الموثقة للمراجعة.'
        );
      })
      .finally(() => {
        if (active) setAyahsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [surahNumber]);

  // Timer during recording
  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  // Cleanup audio URL & media stream on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioUrl]);

  const selectedSurah = useMemo(
    () => surahs.find((s) => s.number === surahNumber) ?? null,
    [surahs, surahNumber]
  );

  const referenceAyahs = useMemo(
    () =>
      surahAyahs.filter(
        (a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah
      ),
    [surahAyahs, fromAyah, toAyah]
  );

  const referenceCombinedText = useMemo(
    () => referenceAyahs.map((a) => a.text).join(' '),
    [referenceAyahs]
  );

  const clearRecordedAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setSecondsElapsed(0);
  };

  const handleStartRecording = async () => {
    setMicError(null);
    setAnalysisError(null);
    setAutoDeletedNotice(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError(
        'متصفحك الحالي لا يدعم تسجيل الصوت عبر الميكروفون.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionState('granted');
      mediaStreamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ];
      const supportedType =
        preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';

      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || supportedType || 'audio/webm';
        const baseMime = mime.split(';')[0] || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: baseMime });

        clearRecordedAudio();
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setAudioMimeType(baseMime);

        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      clearRecordedAudio();
      setReport(null);
      setSecondsElapsed(0);
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setMicPermissionState('denied');
      setMicError(
        'تم رفض إذن الميكروفون أو تعذر الوصول إليه. يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح ثم المحاولة مجدداً.'
      );
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        } else {
          reject(new Error('تعذر قراءة بيانات الصوت.'));
        }
      };
      reader.onerror = () => reject(new Error('فشل تحويل الملف الصوتي.'));
      reader.readAsDataURL(blob);
    });
  };

  const handleAnalyzeRecitation = async () => {
    if (!audioBlob || !referenceCombinedText) return;
    setAnalyzing(true);
    setAnalysisError(null);
    setAutoDeletedNotice(false);

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const response = await fetch('/api/analyze-recitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioMimeType,
          surahName: selectedSurah?.name ?? `سورة رقم ${surahNumber}`,
          fromAyah,
          toAyah,
          referenceText: referenceCombinedText,
        }),
      });

      const payload = (await response.json()) as RecitationAnalysisReport & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error || 'تعذر تحليل التلاوة حالياً. يرجى المحاولة مرة أخرى.'
        );
      }

      setReport(payload);
      onLogSession();
      setSessionLoggedNotice(true);
      window.setTimeout(() => setSessionLoggedNotice(false), 3500);

      // Privacy protection: delete audio immediately after analysis unless user explicitly consented
      if (!keepAudioConsent) {
        clearRecordedAudio();
        setAutoDeletedNotice(true);
      }
    } catch (err) {
      setAnalysisError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء الاتصال بخدمة تحليل التلاوة.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const flaggedNormalizedSet = useMemo(() => {
    if (!report) return new Set<string>();
    const words = [
      ...report.unclearWords,
      ...report.potentialDifferences.map((d) => d.expectedWord),
    ];
    return new Set(
      words.map((w) => normalizeArabicForComparison(w)).filter(Boolean)
    );
  }, [report]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const rem = (sec % 60).toString().padStart(2, '0');
    return `${mins}:${rem}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            التدريب على التلاوة الصوتية
          </h2>
          <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-1 tabular-nums">
            سجّل تلاوتك وقارنها بالآيات الموثقة عبر Gemini · الجلسات المسجلة: {sessionsCount}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setHideTextForRecitation((h) => !h)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA] text-sm font-semibold inline-flex items-center gap-2 self-start whitespace-nowrap shrink-0 cursor-pointer"
        >
          {hideTextForRecitation ? (
            <>
              <Eye className="w-4 h-4" />
              <span>إظهار الآيات</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span>التلاوة غيباً (إخفاء النص)</span>
            </>
          )}
        </button>
      </div>

      {/* Step 1: Select Verified Ayahs for Recitation */}
      <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
            <BookOpen className="w-5 h-5 text-[#C69749]" aria-hidden="true" />
            <span>١. الآيات المحددة للمراجعة والقراءة</span>
          </div>

          {activePlan && (
            <button
              type="button"
              onClick={() => {
                setSurahNumber(activePlan.surahNumber);
                setFromAyah(activePlan.fromAyah);
                setToAyah(Math.min(activePlan.toAyah, activePlan.fromAyah + 9));
              }}
              className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] hover:underline cursor-pointer"
            >
              استخدام نطاق خطتي الحالية ({activePlan.surahName})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="rec-surah" className="block text-xs font-bold mb-1">
              السورة
            </label>
            <select
              id="rec-surah"
              value={surahNumber}
              onChange={(e) => {
                const nextNum = Number(e.target.value);
                setSurahNumber(nextNum);
                setFromAyah(1);
                const found = surahs.find((s) => s.number === nextNum);
                setToAyah(Math.min(found?.numberOfAyahs ?? 5, 5));
                setReport(null);
              }}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm font-semibold"
            >
              {surahs.length === 0 ? (
                <option value={112}>112. سُورَةُ ٱلْإِخْلَاصِ</option>
              ) : (
                surahs.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="rec-from" className="block text-xs font-bold mb-1">
              من الآية
            </label>
            <input
              id="rec-from"
              type="number"
              min={1}
              max={selectedSurah?.numberOfAyahs ?? 286}
              value={fromAyah}
              onChange={(e) => {
                const v = Math.max(1, Number(e.target.value) || 1);
                setFromAyah(v);
                if (v > toAyah) setToAyah(v);
                setReport(null);
              }}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm font-bold tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="rec-to" className="block text-xs font-bold mb-1">
              إلى الآية
            </label>
            <input
              id="rec-to"
              type="number"
              min={fromAyah}
              max={selectedSurah?.numberOfAyahs ?? 286}
              value={toAyah}
              onChange={(e) => {
                const max = selectedSurah?.numberOfAyahs ?? 286;
                const v = Math.min(
                  max,
                  Math.max(fromAyah, Number(e.target.value) || fromAyah)
                );
                setToAyah(v);
                setReport(null);
              }}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm font-bold tabular-nums"
            />
          </div>
        </div>

        {/* Reference Uthmani Text Box */}
        <div className="rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434] p-5">
          {ayahsLoading ? (
            <div className="py-4 flex items-center justify-center gap-2 text-sm text-[#6B6254]">
              <Loader2 className="w-4 h-4 animate-spin text-[#C69749]" />
              <span>جاري جلب الآيات الكريمة بالرسم العثماني...</span>
            </div>
          ) : ayahsError ? (
            <div className="text-sm text-[#B84A39] dark:text-[#FCA5A5]">
              {ayahsError}
            </div>
          ) : hideTextForRecitation ? (
            <div className="py-4 text-center text-sm text-[#6B6254] dark:text-[#BFB6A4]">
              النص مخفي للتلاوة من الذاكرة · اضغط «إظهار الآيات» عند الحاجة للمراجعة.
            </div>
          ) : (
            <div className="space-y-2">
              <div
                dir="rtl"
                className="font-quran text-2xl sm:text-3xl leading-[2.45] text-[#1A2A22] dark:text-[#F7F3EA]"
              >
                {referenceAyahs.map((ayah) => (
                  <span key={ayah.number} className="inline">
                    {ayah.text.split(/\s+/).map((word, wIdx) => {
                      const norm = normalizeArabicForComparison(word);
                      const needsReview =
                        norm.length > 0 && flaggedNormalizedSet.has(norm);
                      return (
                        <span
                          key={`${ayah.number}-${wIdx}`}
                          className={
                            needsReview
                              ? 'bg-[#C69749]/25 text-[#9C6F21] dark:text-[#D6A954] px-1 rounded-md underline decoration-2'
                              : undefined
                          }
                        >
                          {word}{' '}
                        </span>
                      );
                    })}
                    <span className="text-[#9C6F21] dark:text-[#D6A954] text-lg tabular-nums mx-1">
                      ﴿{ayah.numberInSurah}﴾{' '}
                    </span>
                  </span>
                ))}
              </div>
              {report && flaggedNormalizedSet.size > 0 && (
                <div className="text-xs font-semibold text-[#9C6F21] dark:text-[#D6A954] pt-2">
                  الكلمات المظللة في النص هي مواضع قد تحتاج إلى إعادة قراءة أو مراجعة.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Step 2: Microphone Recording, Playback & Privacy */}
      <section className="rounded-3xl bg-[#133A2A] text-[#F7F3EA] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-bold text-[#FFFDF9]">
              ٢. تسجيل التلاوة والاستماع إليها
            </h3>
            <p className="text-sm text-[#CFC6B4] mt-0.5">
              {micPermissionState === 'granted'
                ? 'تم منح إذن الميكروفون · اضغط بدء التسجيل واقرأ بهدوء ووضوح'
                : 'سيُطلب إذن استخدام الميكروفون عند الضغط على زر بدء التسجيل'}
            </p>
          </div>
          <div className="text-3xl font-bold tabular-nums text-[#D6A954]">
            {formatTime(secondsElapsed)}
          </div>
        </div>

        {/* Visual Waveform Bars */}
        <div className="h-12 flex items-center justify-center gap-1.5" aria-hidden="true">
          {[22, 38, 28, 46, 32, 48, 30, 42, 24, 36, 20, 34, 26, 40].map(
            (barH, idx) => (
              <span
                key={idx}
                className="w-1.5 rounded-full bg-[#D6A954] transition-all duration-150"
                style={{
                  height: `${isRecording ? barH : 10}px`,
                  opacity: isRecording ? 1 : 0.4,
                }}
              />
            )
          )}
        </div>

        {/* Record / Stop / Analyze Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              disabled={analyzing || referenceAyahs.length === 0}
              onClick={() => void handleStartRecording()}
              className="min-h-[48px] px-7 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] disabled:opacity-45 text-[#133A2A] font-bold text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Mic className="w-5 h-5" aria-hidden="true" />
              <span>{audioBlob ? 'إعادة التسجيل' : 'بدء التسجيل الصوتي'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecording}
              className="min-h-[48px] px-7 py-3 rounded-xl bg-[#B84A39] hover:bg-[#9E3C2D] text-white font-bold text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Square className="w-4 h-4" aria-hidden="true" />
              <span>إيقاف التسجيل</span>
            </button>
          )}

          {audioBlob && !isRecording && (
            <button
              type="button"
              disabled={analyzing}
              onClick={() => void handleAnalyzeRecitation()}
              className="min-h-[48px] px-7 py-3 rounded-xl bg-[#FFFDF9] hover:bg-[#EFE8D8] disabled:opacity-50 text-[#133A2A] font-bold text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>جاري التحليل الصوتي...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-[#9C6F21]" aria-hidden="true" />
                  <span>تحليل التلاوة ومقارنتها</span>
                </>
              )}
            </button>
          )}
        </div>

        {micError && (
          <div className="p-4 rounded-2xl bg-[#B84A39]/25 border border-[#FCA5A5]/40 text-sm text-[#FFFDF9] flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-[#FCA5A5] shrink-0 mt-0.5" />
            <span>{micError}</span>
          </div>
        )}

        {/* Playback & Delete Controls */}
        {audioUrl && !isRecording && (
          <div className="p-4 rounded-2xl bg-[#0F2E21] border border-[#245641] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-[#D6A954]">
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>الاستماع إلى تسجيلك</span>
              </span>

              <button
                type="button"
                onClick={clearRecordedAudio}
                className="text-xs font-bold text-[#FCA5A5] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>حذف التسجيل الآن</span>
              </button>
            </div>

            <audio controls src={audioUrl} className="w-full h-10" />
          </div>
        )}

        {/* Privacy Consent Notice */}
        <div className="p-4 rounded-2xl bg-[#184533] border border-[#255A44] space-y-2.5 text-sm">
          <div className="flex items-center gap-2 font-bold text-[#D6A954]">
            <Shield className="w-4 h-4" aria-hidden="true" />
            <span>حماية خصوصية التسجيل الصوتي</span>
          </div>
          <p className="text-[#E5DDCC] text-xs sm:text-sm leading-relaxed">
            لا يُحفظ صوتك على الخادم بعد التحليل إطلاقاً. وبشكل افتراضي، يُحذف التسجيل المؤقت من جلستك تلقائياً فور ظهور التقرير إلا إذا اخترت إبقاءه مؤقتاً للاستماع إليه.
          </p>
          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={keepAudioConsent}
              onChange={(e) => setKeepAudioConsent(e.target.checked)}
              className="w-4 h-4 accent-[#C69749]"
            />
            <span className="text-xs sm:text-sm text-[#FFFDF9]">
              أوافق على الاحتفاظ بالتسجيل مؤقتاً في جلستي الحالية للاستماع إليه بعد التحليل
            </span>
          </label>
        </div>

        {autoDeletedNotice && (
          <div className="text-xs text-[#6EE7B7] font-semibold text-center">
            تم حذف التسجيل الصوتي المؤقت تلقائياً بعد إتمام التحليل حمايةً لخصوصيتك.
          </div>
        )}

        {analysisError && (
          <div className="p-4 rounded-2xl bg-[#B84A39]/25 border border-[#FCA5A5]/40 text-sm text-[#FFFDF9] flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-[#FCA5A5] shrink-0 mt-0.5" />
            <span>{analysisError}</span>
          </div>
        )}
      </section>

      {/* Step 3: Clear Structured Recitation Report */}
      {report && (
        <section className="space-y-5">
          <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE4D4] dark:border-[#214232] pb-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  تقرير مراجعة التلاوة
                </h3>
                <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-0.5">
                  وضوح الصوت:{' '}
                  <span className="font-bold text-[#133A2A] dark:text-[#D6A954]">
                    {report.audioClarity === 'clear'
                      ? 'واضح'
                      : report.audioClarity === 'moderate'
                      ? 'متوسط الوضوح'
                      : 'غير واضح بما يكفي'}
                  </span>
                  {report.clarityNote ? ` — ${report.clarityNote}` : ''}
                </p>
              </div>

              {sessionLoggedNotice && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>سُجّلت جلسة التدريب</span>
                </span>
              )}
            </div>

            {report.transcribedText && (
              <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] space-y-1">
                <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                  النص المتعرف عليه من التسجيل:
                </div>
                <p
                  className={`font-display ${
                    fontSizeClass === 'text-xl' ? 'text-2xl' : 'text-xl'
                  } text-[#1A2A22] dark:text-[#F7F3EA] leading-loose`}
                >
                  {report.transcribedText}
                </p>
              </div>
            )}

            {/* 4 Required Report Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Recognized Words */}
              <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-3">
                <h4 className="font-bold text-base text-[#1B6B46] dark:text-[#6EE7B7]">
                  ١. الكلمات التي تم التعرف عليها
                </h4>
                {report.recognizedWords.length === 0 ? (
                  <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                    لم يتم التعرف على كلمات مطابقة بوضوح في هذا التسجيل.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 font-display text-xl text-[#1A2A22] dark:text-[#F7F3EA]">
                    {report.recognizedWords.map((w, i) => (
                      <span
                        key={`${w}-${i}`}
                        className="px-2.5 py-0.5 rounded-lg bg-[#1B6B46]/12 text-[#133A2A] dark:text-[#6EE7B7]"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Unclear Words */}
              <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-3">
                <h4 className="font-bold text-base text-[#B84A39] dark:text-[#FCA5A5]">
                  ٢. الكلمات التي لم يتم التعرف عليها بوضوح
                </h4>
                {report.unclearWords.length === 0 ? (
                  <p className="text-sm text-[#5C665E] dark:text-[#BFB6A4]">
                    لا توجد كلمات غير واضحة مرصودة في النطاق المقروء.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 font-display text-xl">
                    {report.unclearWords.map((w, i) => (
                      <span
                        key={`${w}-${i}`}
                        className="px-2.5 py-0.5 rounded-lg bg-[#B84A39]/15 text-[#B84A39] dark:text-[#FCA5A5]"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Potential Differences */}
              <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-3">
                <h4 className="font-bold text-base text-[#9C6F21] dark:text-[#D6A954]">
                  ٣. مواضع الاختلاف المحتملة
                </h4>
                {report.potentialDifferences.length === 0 ? (
                  <p className="text-sm text-[#5C665E] dark:text-[#BFB6A4]">
                    لم تُرصد مواضع اختلاف لافتة مقارنة بالنص المرجعي.
                  </p>
                ) : (
                  <ul className="space-y-2.5 text-sm">
                    {report.potentialDifferences.map((diff, i) => (
                      <li
                        key={`${diff.expectedWord}-${i}`}
                        className="p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] space-y-1"
                      >
                        <div className="font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                          المتوقع: «{diff.expectedWord}» · المسموع:{' '}
                          «{diff.heardAs || 'غير واضح'}»
                        </div>
                        <div className="text-[#46524B] dark:text-[#D8D0C0]">
                          {diff.note}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 4. Reading Improvement Tips */}
              <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-3">
                <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                  ٤. نصائح لتحسين القراءة
                </h4>
                {report.readingTips.length === 0 ? (
                  <p className="text-sm text-[#5C665E] dark:text-[#BFB6A4]">
                    استمر في القراءة المتأنية ومراجعة الآيات بانتظام.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm text-[#46524B] dark:text-[#D8D0C0]">
                    {report.readingTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-bold text-[#C69749] tabular-nums">
                          0{i + 1}.
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Cautious Initial Tajweed Notes */}
            <div className="p-5 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] border border-[#DFD6C5] dark:border-[#244736] space-y-3">
              <div className="font-bold text-base text-[#133A2A] dark:text-[#D6A954]">
                ملاحظات تعليمية أولية في التجويد
              </div>
              <p className="text-xs sm:text-sm text-[#5C665E] dark:text-[#BFB6A4]">
                تنبيه مهم: تُعرض الملاحظات التالية على سبيل الاستئناس التعليمي فقط عند توفر دليل صوتي كافٍ، ولا يمكن الجزم بصحة جميع المخارج والصفات من خلال التسجيل الصوتي، ولا تُغني عن المشافهة والتلقي على يد معلم متقن.
              </p>
              {report.audioClarity === 'unclear' ||
              report.tajweedInitialNotes.length === 0 ? (
                <p className="text-sm font-semibold text-[#9C6F21] dark:text-[#D6A954]">
                  لم يتوفر دليل صوتي كافٍ لإبداء ملاحظات تجويدية أولية في هذا التسجيل. يُنصح بإعادة التسجيل في مكان هادئ وبصوت واضح.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-[#1A2A22] dark:text-[#F7F3EA]">
                  {report.tajweedInitialNotes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
