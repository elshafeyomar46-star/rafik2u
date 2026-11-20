import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mic,
  RotateCcw,
  Square,
} from 'lucide-react';
import { RecitationAnalysisReport } from '../types';

interface QuizVoiceRecitationInputProps {
  surahName: string;
  fromAyah: number;
  toAyah: number;
  referenceText: string;
  quizSubmitted: boolean;
  onCompleteEvaluation: (isCorrect: boolean, summaryNote: string) => void;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الملف الصوتي.'));
    reader.readAsDataURL(blob);
  });
}

export const QuizVoiceRecitationInput: React.FC<
  QuizVoiceRecitationInputProps
> = ({
  surahName,
  fromAyah,
  toAyah,
  referenceText,
  quizSubmitted,
  onCompleteEvaluation,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<RecitationAnalysisReport | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMsg(null);
    setReport(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('المتصفح لا يدعم التسجيل الصوتي حالياً.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start(250);
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg(
        'لم يتم منح إذن الميكروفون. يمكنك السماح بالوصول أو استخدام التقييم الذاتي بعد التلاوة الشفهية.'
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const analyzeAudio = async () => {
    if (!audioBlob) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const res = await fetch('/api/analyze-recitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || 'audio/webm',
          surahName,
          fromAyah,
          toAyah,
          referenceText,
        }),
      });
      const data = (await res.json()) as RecitationAnalysisReport & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'تعذر تحليل التسجيل الصوتي.');
      }
      setReport(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر الاتصال بخدمة التحليل الصوتي.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const confidenceMeta =
    report?.audioClarity === 'clear'
      ? {
          label: 'درجة الثقة في التحليل: عالية (صوت واضح)',
          cls: 'text-[#1B6B46] dark:text-[#6EE7B7]',
        }
      : report?.audioClarity === 'moderate'
      ? {
          label: 'درجة الثقة في التحليل: متوسطة (يُراعى احتمال خطأ التعرف الآلي)',
          cls: 'text-[#9C6F21] dark:text-[#D6A954]',
        }
      : {
          label: 'درجة الثقة في التحليل: منخفضة — لا يُعتمد كحكم مؤكد على الحفظ',
          cls: 'text-[#B84A39] dark:text-[#FCA5A5]',
        };

  return (
    <div className="space-y-4">
      {/* Recorder Controls */}
      <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            {isRecording
              ? `جاري التسجيل... (${seconds} ث)`
              : audioBlob
              ? `تم تسجيل المقطع (${seconds} ث)`
              : 'اضغط لبدء التسميع الصوتي من ذاكرتك'}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isRecording ? (
              <button
                type="button"
                disabled={quizSubmitted || analyzing}
                onClick={() => void startRecording()}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] dark:text-[#133A2A] text-[#F7F3EA] text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45"
              >
                <Mic className="w-4 h-4" aria-hidden="true" />
                <span>{audioBlob ? 'إعادة التسجيل' : 'بدء التسجيل الصوتي'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#B84A39] hover:bg-[#9E3C2D] text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4" aria-hidden="true" />
                <span>إيقاف التسجيل</span>
              </button>
            )}

            {audioBlob && !isRecording && !quizSubmitted && (
              <button
                type="button"
                disabled={analyzing}
                onClick={() => void analyzeAudio()}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{analyzing ? 'جاري التحليل...' : 'تحليل ومقارنة التلاوة'}</span>
              </button>
            )}
          </div>
        </div>

        {audioUrl && (
          <audio controls src={audioUrl} className="w-full h-10" />
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#B84A39]/10 text-[#B84A39] dark:text-[#FCA5A5] text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Analysis Report */}
      {report && (
        <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#C69749] space-y-4">
          <div className={`text-sm font-bold ${confidenceMeta.cls}`}>
            {confidenceMeta.label}
          </div>

          {report.clarityNote && (
            <p className="text-xs sm:text-sm text-[#46524B] dark:text-[#D8D0C0]">
              {report.clarityNote}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A]">
              <div className="text-xs font-bold text-[#1B6B46] dark:text-[#6EE7B7] mb-1.5">
                الكلمات التي تم التعرف عليها ({report.recognizedWords.length})
              </div>
              <p className="font-display text-lg leading-relaxed">
                {report.recognizedWords.length > 0
                  ? report.recognizedWords.join(' · ')
                  : 'لم تتضح كلمات كافية في التسجيل.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A]">
              <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] mb-1.5">
                مواضع غير واضحة أو تستحق المراجعة ({report.unclearWords.length})
              </div>
              <p className="font-display text-lg leading-relaxed">
                {report.unclearWords.length > 0
                  ? report.unclearWords.join(' · ')
                  : 'لا توجد مواضع غير واضحة بارزة.'}
              </p>
            </div>
          </div>

          <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
            تنبيه مهم: لا يُعدّ خطأ التعرف الآلي على الصوت خطأً مؤكداً في حفظك؛ استمع لتسجيلك وقارن بنفسك بالنص الموثق.
          </div>
        </div>
      )}

      {/* Confirmation Buttons so user evaluates honestly after listening/analyzing */}
      {!quizSubmitted && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onCompleteEvaluation(
                true,
                report
                  ? `تم التحليل الصوتي (${confidenceMeta.label}) وتأكيد التسميع.`
                  : 'تم تأكيد إتمام التسميع الصوتي بشكل صحيح.'
              )
            }
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1B6B46] hover:bg-[#155739] text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>أتممت التسميع الصوتي بشكل صحيح</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onCompleteEvaluation(
                false,
                'حددت أن هذا الموضع يحتاج إعادة مراجعة وتثبيت صوتي.'
              )
            }
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>يحتاج مراجعة (إضافة لجدول الأخطاء)</span>
          </button>
        </div>
      )}
    </div>
  );
};
