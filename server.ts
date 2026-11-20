import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ensureHadithLibraryLoaded,
  forceResyncHadithLibrary,
  getHadithById,
  searchHadithLibrary,
} from './server/hadithLibraryStore';
import type { HadithBookId, HadithRecordClassification } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

interface AnalyzeRecitationRequest {
  audioBase64?: string;
  mimeType?: string;
  surahName?: string;
  fromAyah?: number;
  toAyah?: number;
  referenceText?: string;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'مفتاح Gemini API غير مهيأ على الخادم. يرجى التأكد من إعداده في لوحة Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/hadith-library/summary', async (_req, res) => {
    try {
      const store = await ensureHadithLibraryLoaded();
      res.json(store.manifest);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'تعذر تحميل بيانات المكتبة الحديثية.',
      });
    }
  });

  app.get('/api/hadith-library/search', async (req, res) => {
    try {
      const bookParam = String(req.query.book ?? 'all');
      const book: 'all' | HadithBookId =
        bookParam === 'bukhari' ||
        bookParam === 'muslim' ||
        bookParam === 'ibnmajah'
          ? bookParam
          : 'all';

      const classParam = String(req.query.classification ?? 'all');
      const classification: 'all' | HadithRecordClassification =
        classParam === 'prophetic_hadith' || classParam === 'athar_or_intro'
          ? classParam
          : 'all';

      const chapterRaw = req.query.chapterId;
      const chapterId =
        chapterRaw !== undefined &&
        chapterRaw !== '' &&
        !Number.isNaN(Number(chapterRaw))
          ? Number(chapterRaw)
          : null;

      const result = await searchHadithLibrary({
        book,
        chapterId,
        narrator: req.query.narrator ? String(req.query.narrator) : '',
        topic: req.query.topic ? String(req.query.topic) : '',
        grade: req.query.grade ? String(req.query.grade) : '',
        classification,
        q: req.query.q ? String(req.query.q) : '',
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 15,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'تعذر البحث في المكتبة الحديثية.',
      });
    }
  });

  app.get('/api/hadith-library/item/:id', async (req, res) => {
    try {
      const item = await getHadithById(String(req.params.id));
      if (!item) {
        res.status(404).json({ error: 'السجل غير موجود في المكتبة.' });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'تعذر جلب تفاصيل الحديث.',
      });
    }
  });

  app.post('/api/hadith-library/sync', async (_req, res) => {
    try {
      const manifest = await forceResyncHadithLibrary();
      res.json(manifest);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'تعذر تحديث ومزامنة المكتبة الحديثية.',
      });
    }
  });

  app.post('/api/analyze-recitation', async (req, res) => {
    try {
      const body = req.body as AnalyzeRecitationRequest;
      const audioBase64 = body.audioBase64?.trim();
      const mimeType = body.mimeType?.trim() || 'audio/webm';
      const referenceText = body.referenceText?.trim();
      const surahName = body.surahName?.trim() || 'السورة المختارة';
      const fromAyah = body.fromAyah ?? 1;
      const toAyah = body.toAyah ?? 1;

      if (!audioBase64 || !referenceText) {
        res.status(400).json({
          error: 'الرجاء توفير التسجيل الصوتي ونص الآيات المرجعي للمقارنة.',
        });
        return;
      }

      const ai = getGeminiClient();

      // Step 1: Attempt Arabic audio transcription using gemini-3.5-transcribe
      // Audio remains strictly in transient memory and is never persisted to disk.
      const audioPart = {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      };

      const transcribeResponse = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            {
              text: 'فرّغ الكلام العربي المسموع في هذا التسجيل الصوتي فقط كما نُطق دون إكمال آيات غير مسموعة أو تخمين كلمات غير منطوقة. إذا كان التسجيل صامتاً أو غير واضح اكتب فقط: [الصوت غير واضح أو صامت].',
            },
          ],
        },
      });

      const rawTranscript = (transcribeResponse.text ?? '').trim();

      // Step 2: Analyze audio + transcript against verified reference ayahs using gemini-4-hydrogen
      const analysisPrompt = `
أنت مساعد تعليمي مختص بمراجعة التلاوة القرآنية.
لديك:
1) التسجيل الصوتي المرفق للمستخدم.
2) محاولة التفريغ النصي الأولي: "${rawTranscript || 'غير متوفر'}"
3) النص القرآني المرجعي الموثق للمراجعة (${surahName} - الآيات ${fromAyah} إلى ${toAyah}):
"${referenceText}"

المطلوب تحليل التلاوة بموضوعية وصدق علمي وإخراج JSON مطابق للمخطط المطلوب فقط:
- قيّم وضوح الصوت أولاً (clear / moderate / unclear).
- استخرج الكلمات التي تم التعرف عليها بوضوح في القراءة (recognizedWords).
- استخرج الكلمات من النص المرجعي التي لم تُسمع بوضوح أو سقطت أو لم يتم التعرف عليها (unclearWords).
- حدد مواضع الاختلاف المحتملة بين ما قُرئ والنص المرجعي (potentialDifferences) مع ذكر كلمة المرجع وما ظهر في التلاوة وتوضيح بسيط.
- قدّم نصائح عملية واضحة لتحسين القراءة (readingTips).
- بالنسبة لملاحظات التجويد (tajweedInitialNotes):
  * قدّم ملاحظات تعليمية أولية فقط إذا كان الصوت واضحاً وتوفر دليل صوتي كافٍ (مثلاً وضوح مد ظاهر أو غنة مسموعة أو قلقلة ظاهرة).
  * إذا كان الصوت غير واضح أو قصيراً جداً أو ضعيف الجودة، لا تصدر أي أحكام قطعية واجعل الملاحظات فارغة أو تقتصر على طلب إعادة التسجيل بصوت أوضح.
  * لا تدّعِ أبداً إمكانية الجزم بصحة جميع المخارج والصفات من التسجيل الصوتي.
`;

      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [audioPart, { text: analysisPrompt }],
        },
        config: {
          systemInstruction:
            'التزم الدقة العلمية والأمانة. لا تخترع كلمات لم تُسمع في التسجيل، ولا تصدر أحكام تجويد قطعية، وأجب باللغة العربية الواضحة فقط.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              audioClarity: {
                type: Type.STRING,
                description: 'Must be one of: clear, moderate, unclear',
              },
              clarityNote: {
                type: Type.STRING,
                description: 'Brief Arabic explanation of recording clarity.',
              },
              transcribedText: {
                type: Type.STRING,
                description: 'The Arabic text recognized from the user recitation.',
              },
              recognizedWords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Words from the reference clearly recognized in audio.',
              },
              unclearWords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Words from the reference that were unclear, skipped, or need re-reading.',
              },
              potentialDifferences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    expectedWord: { type: Type.STRING },
                    heardAs: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                },
                description: 'Potential word or pronunciation differences detected.',
              },
              readingTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Actionable Arabic tips to improve reading.',
              },
              tajweedInitialNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Tentative educational Tajweed observations ONLY when audio evidence is clear; never definitive judgments.',
              },
            },
          },
        },
      });

      const jsonText = (analysisResponse.text ?? '{}').trim();
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;

      res.json({
        audioClarity:
          parsed.audioClarity === 'clear' ||
          parsed.audioClarity === 'moderate' ||
          parsed.audioClarity === 'unclear'
            ? parsed.audioClarity
            : 'moderate',
        clarityNote:
          typeof parsed.clarityNote === 'string' ? parsed.clarityNote : '',
        transcribedText:
          typeof parsed.transcribedText === 'string' && parsed.transcribedText.trim()
            ? parsed.transcribedText
            : rawTranscript,
        recognizedWords: Array.isArray(parsed.recognizedWords)
          ? parsed.recognizedWords
          : [],
        unclearWords: Array.isArray(parsed.unclearWords)
          ? parsed.unclearWords
          : [],
        potentialDifferences: Array.isArray(parsed.potentialDifferences)
          ? parsed.potentialDifferences
          : [],
        readingTips: Array.isArray(parsed.readingTips) ? parsed.readingTips : [],
        tajweedInitialNotes: Array.isArray(parsed.tajweedInitialNotes)
          ? parsed.tajweedInitialNotes
          : [],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير متوقع أثناء تحليل التسجيل الصوتي.';
      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rifq server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
