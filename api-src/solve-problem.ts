import { GoogleGenAI, Type, Schema } from '@google/genai';

type AiProvider = 'gemini' | 'agent-platform';
const FALLBACK = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
const AP_FALLBACK = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

function createClient(k: string, p: AiProvider) { return p === 'agent-platform' ? new GoogleGenAI({ vertexai: true, apiKey: k }) : new GoogleGenAI({ apiKey: k }); }
function getModels(s: string, p: AiProvider) { return Array.from(new Set([s, ...(p === 'agent-platform' ? AP_FALLBACK : FALLBACK)])); }
function classifyError(e: any) {
  const s = e?.status, m = (e?.message || '').toLowerCase();
  if (s === 500 || s === 503 || s === 504 || m.includes('overloaded')) return 'MODEL_OVERLOADED';
  if (s === 404) return 'NOT_FOUND'; if (s === 401) return 'AUTH_ERROR';
  if (s === 429) return 'QUOTA_EXCEEDED'; if (s === 400) return 'INVALID_REQUEST'; return 'UNKNOWN';
}
async function callAI(opts: { apiKey: string; provider: AiProvider; selectedModel: string; contents: any; systemInstruction: string; responseSchema: Schema }) {
  const client = createClient(opts.apiKey, opts.provider);
  const models = getModels(opts.selectedModel, opts.provider);
  let last: any;
  for (let i = 0; i < models.length; i++) {
    try {
      const r = await client.models.generateContent({ model: models[i], contents: opts.contents, config: { systemInstruction: opts.systemInstruction, responseMimeType: 'application/json', responseSchema: opts.responseSchema, maxOutputTokens: 32768 } });
      return { text: r.text || '', modelUsed: models[i], fallbackUsed: i > 0 };
    } catch (e: any) { last = e; const et = classifyError(e); if (et === 'MODEL_OVERLOADED' || et === 'NOT_FOUND') continue; throw e; }
  }
  throw last || new Error('Tất cả model không khả dụng.');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  try {
    const apiKey = (req.headers['x-api-key'] as string) || '';
    const provider = ((req.headers['x-ai-provider'] as string) || 'gemini') as AiProvider;
    const selectedModel = (req.headers['x-ai-model'] as string) || 'gemini-3.6-flash';
    if (!apiKey) return res.status(401).json({ success: false, error: 'Missing API Key' });

    const { problemText, geometryData } = req.body || {};
    const systemInstruction = `Bạn là Chuyên gia Toán học Việt Nam cấp THPT. Giải bài toán hình học chi tiết, chính xác.
- Trình bày từng bước rõ ràng, ghi công thức LaTeX.
- Kết quả cuối cùng rõ ràng. Ký hiệu chuẩn quốc tế. Đơn vị nhất quán.`;
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        solution_text: { type: Type.STRING },
        steps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { step_number: { type: Type.NUMBER }, title: { type: Type.STRING }, content: { type: Type.STRING }, formula: { type: Type.STRING } }, required: ['step_number', 'title', 'content'] } },
        formulas: { type: Type.ARRAY, items: { type: Type.STRING } },
        answer: { type: Type.STRING },
      },
      required: ['solution_text', 'steps', 'answer'],
    };
    const prompt = `Bài toán:\n${problemText || 'Không có đề bài.'}\n\nDữ liệu hình học:\n${JSON.stringify(geometryData || {})}`;
    const result = await callAI({ apiKey, provider, selectedModel, contents: { parts: [{ text: prompt }] }, systemInstruction, responseSchema });
    let parsed; try { parsed = JSON.parse(result.text || '{}'); } catch { parsed = { solution_text: result.text, steps: [], answer: result.text }; }
    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Lỗi hệ thống' });
  }
}
