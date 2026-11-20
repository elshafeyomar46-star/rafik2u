import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { HadithLibraryManifest } from '../types';

interface HadithAuditReportViewProps {
  manifest: HadithLibraryManifest | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  onResync: () => void;
}

export const HadithAuditReportView: React.FC<HadithAuditReportViewProps> = ({
  manifest,
  loading,
  syncing,
  error,
  onResync,
}) => {
  if (loading && !manifest) {
    return (
      <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-8 text-center text-sm text-[#6B6254] dark:text-[#BFB6A4]">
        جاري تحميل تقرير التحقق والاكتمال للمكتبة الحديثية...
      </div>
    );
  }

  if (error && !manifest) {
    return (
      <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#B84A39] p-6 space-y-3">
        <div className="font-bold text-[#B84A39] dark:text-[#FCA5A5]">{error}</div>
        <button
          type="button"
          onClick={onResync}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#133A2A] text-[#F7F3EA] text-sm font-bold cursor-pointer"
        >
          إعادة المحاولة والمزامنة
        </button>
      </div>
    );
  }

  if (!manifest) return null;

  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(manifest.importedAt));
    } catch {
      return manifest.importedAt;
    }
  })();

  const hasAnyIncompletePrimary = manifest.books.some(
    (b) => b.completenessStatus === 'incomplete'
  );
  const hasAnySecondaryGaps = manifest.books.some(
    (b) => b.completenessStatus === 'complete_primary_with_secondary_gaps'
  );

  return (
    <section className="space-y-6" aria-label="تقرير المسؤول عن اكتمال المكتبة الحديثية">
      {/* Audit Header */}
      <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#C69749] p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ECE4D4] dark:border-[#214232] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
              <Database className="w-4 h-4" aria-hidden="true" />
              <span>تقرير المسؤول · التحقق والاكتمال ومطابقة المصادر</span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              جرد المصادر وسجل الاستيراد الرقمي
            </h3>
            <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
              نسخة البيانات: {manifest.datasetVersion} · تاريخ آخر استيراد: {formattedDate}
            </div>
          </div>

          <button
            type="button"
            disabled={syncing}
            onClick={onResync}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] text-[#F7F3EA] dark:text-[#133A2A] disabled:opacity-50 text-sm font-bold inline-flex items-center gap-2 self-start cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>
              {syncing
                ? 'جاري إعادة المزامنة والتحقق...'
                : 'إعادة المزامنة والتحقق من المصادر'}
            </span>
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] p-4 space-y-1">
            <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
              إجمالي السجلات المستوردة
            </div>
            <div className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
              {manifest.totalImportedCount.toLocaleString('en-US')}
            </div>
            <div className="text-xs text-[#5C665E] dark:text-[#D8D0C0]">
              من المصادر الثلاثة بالنص الأصلي الكامل
            </div>
          </div>

          <div className="rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] p-4 space-y-1">
            <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
              الأحاديث النبوية المسندة
            </div>
            <div className="font-display text-3xl font-bold text-[#1B6B46] dark:text-[#6EE7B7] tabular-nums">
              {manifest.totalPropheticCount.toLocaleString('en-US')}
            </div>
            <div className="text-xs text-[#5C665E] dark:text-[#D8D0C0]">
              مفصولة برمجياً عن الآثار ومقدمة المصادر
            </div>
          </div>

          <div className="rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] p-4 space-y-1">
            <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
              الآثار والمقدمة والأقوال الموقوفة
            </div>
            <div className="font-display text-3xl font-bold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
              {manifest.totalAtharOrIntroCount.toLocaleString('en-US')}
            </div>
            <div className="text-xs text-[#5C665E] dark:text-[#D8D0C0]">
              مصنّفة بوضوح لمنع الخلط بالأحاديث المرفوعة
            </div>
          </div>
        </div>

        {/* Honest Global Completeness Disclaimer */}
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            hasAnyIncompletePrimary
              ? 'bg-[#B84A39]/10 border-[#B84A39] text-[#B84A39] dark:text-[#FCA5A5]'
              : hasAnySecondaryGaps
              ? 'bg-[#C69749]/15 border-[#C69749] text-[#133A2A] dark:text-[#F7F3EA]'
              : 'bg-[#1B6B46]/10 border-[#1B6B46] text-[#133A2A] dark:text-[#F7F3EA]'
          }`}
        >
          {hasAnyIncompletePrimary ? (
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          ) : hasAnySecondaryGaps ? (
            <AlertTriangle className="w-5 h-5 text-[#9C6F21] dark:text-[#D6A954] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#1B6B46] dark:text-[#6EE7B7] shrink-0 mt-0.5" />
          )}
          <div className="text-sm leading-relaxed space-y-1">
            <div className="font-bold">
              {hasAnyIncompletePrimary
                ? 'تنبيه: المكتبة غير مكتملة السجلات من المصدر الأساسي'
                : hasAnySecondaryGaps
                ? 'بيان أمانة علمية: جميع سجلات النسخة الأساسية مستوردة (١٠٠٪)، مع وجود فجوات موثقة في النسخة المساندة'
                : 'تم استيراد جميع السجلات والتحقق من اكتمالها عبر المصدرين'}
            </div>
            <p className="text-xs sm:text-sm text-[#46524B] dark:text-[#D8D0C0]">
              لا تدّعي المكتبة الكمال المطلق عند وجود أرقام فارغة أو غير مصنّفة الدرجة في نسخة المقارنة المساندة (دار السلام / fawazahmed0)، ويتم عرض تفاصيل كل كتاب بدقة أدناه.
            </p>
          </div>
        </div>
      </div>

      {/* Per-Book Verification Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {manifest.books.map((book) => {
          const isCompletePrimary = book.importedCount >= book.expectedCountPrimary;
          return (
            <article
              key={book.bookId}
              className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-[#ECE4D4] dark:border-[#214232] pb-3">
                  <h4 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                    {book.bookTitle}
                  </h4>
                  <span
                    className={`text-xs font-bold inline-flex items-center gap-1 ${
                      book.completenessStatus === 'incomplete'
                        ? 'text-[#B84A39] dark:text-[#FCA5A5]'
                        : book.completenessStatus === 'complete_primary_with_secondary_gaps'
                        ? 'text-[#9C6F21] dark:text-[#D6A954]'
                        : 'text-[#1B6B46] dark:text-[#6EE7B7]'
                    }`}
                  >
                    {book.completenessStatus === 'incomplete' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {isCompletePrimary ? 'النسخة الأساسية ١٠٠٪' : 'يوجد نقص'}
                    </span>
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#6B6254] dark:text-[#BFB6A4]">
                      المستورد / المتوقع (الأساسي):
                    </span>
                    <span className="font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                      {book.importedCount.toLocaleString('en-US')} /{' '}
                      {book.expectedCountPrimary.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6254] dark:text-[#BFB6A4]">
                      الأحاديث النبوية المرفوعة:
                    </span>
                    <span className="font-semibold text-[#1B6B46] dark:text-[#6EE7B7]">
                      {book.propheticHadithCount.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6254] dark:text-[#BFB6A4]">
                      الآثار / المقدمة:
                    </span>
                    <span className="font-semibold text-[#9C6F21] dark:text-[#D6A954]">
                      {book.atharOrIntroCount.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6254] dark:text-[#BFB6A4]">
                      سجلات فارغة في الأساسي:
                    </span>
                    <span className="font-semibold">{book.emptyOrMissingInPrimary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6254] dark:text-[#BFB6A4]">
                      المطابق مع النسخة المساندة:
                    </span>
                    <span className="font-semibold">
                      {book.matchedWithSecondaryCount.toLocaleString('en-US')} /{' '}
                      {book.expectedCountSecondary.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6254] dark:text-[#BFB6A4]">
                      أرقام فارغة النص في المساندة:
                    </span>
                    <span className="font-bold text-[#B84A39] dark:text-[#FCA5A5]">
                      {book.secondaryEmptyCount}
                    </span>
                  </div>
                  {book.bookId === 'ibnmajah' && (
                    <div className="flex justify-between">
                      <span className="text-[#6B6254] dark:text-[#BFB6A4]">
                        غير مصنّفة الدرجة في المساندة:
                      </span>
                      <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                        {book.ungradedCount}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#46524B] dark:text-[#D8D0C0] bg-[#F7F3EA] dark:bg-[#0F241A] rounded-xl p-3 leading-relaxed">
                  {book.statusNote}
                </p>

                {book.emptyNumbersSecondarySample.length > 0 && (
                  <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4] leading-relaxed">
                    <span className="font-bold">عينة الأرقام الفارغة في النسخة المساندة: </span>
                    <span className="tabular-nums">
                      {book.emptyNumbersSecondarySample.slice(0, 12).join('، ')}
                      {book.secondaryEmptyCount > 12 ? '...' : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#ECE4D4] dark:border-[#214232] space-y-1.5 text-xs">
                <a
                  href={book.primarySourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B6B46] dark:text-[#6EE7B7] hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>المصدر الأساسي: {book.primarySourceVersion}</span>
                </a>
                <br />
                <a
                  href={book.secondarySourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9C6F21] dark:text-[#D6A954] hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>المصدر المساند: {book.secondarySourceVersion}</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
