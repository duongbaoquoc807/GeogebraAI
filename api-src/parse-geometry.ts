import { GoogleGenAI, Type, Schema } from '@google/genai';

// ============ AI Client ============
type AiProvider = 'gemini' | 'agent-platform';
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const AP_FALLBACK = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

function createClient(apiKey: string, provider: AiProvider) {
  return provider === 'agent-platform' ? new GoogleGenAI({ vertexai: true, apiKey }) : new GoogleGenAI({ apiKey });
}
function getModels(sel: string, provider: AiProvider) {
  return Array.from(new Set([sel, ...(provider === 'agent-platform' ? AP_FALLBACK : FALLBACK_MODELS)]));
}
function classifyError(e: any) {
  const s = e?.status, m = (e?.message || '').toLowerCase();
  if (s === 500 || s === 503 || s === 504 || m.includes('overloaded')) return 'MODEL_OVERLOADED';
  if (s === 404) return 'NOT_FOUND';
  if (s === 401) return 'AUTH_ERROR';
  if (s === 403) return 'PERMISSION_DENIED';
  if (s === 429) return 'QUOTA_EXCEEDED';
  if (s === 400) return 'INVALID_REQUEST';
  return 'UNKNOWN';
}
async function callAI(opts: { apiKey: string; provider: AiProvider; selectedModel: string; contents: any; systemInstruction: string; responseSchema: Schema }) {
  const client = createClient(opts.apiKey, opts.provider);
  const models = getModels(opts.selectedModel, opts.provider);
  let last: any;
  for (let i = 0; i < models.length; i++) {
    try {
      const r = await client.models.generateContent({
        model: models[i], contents: opts.contents,
        config: { systemInstruction: opts.systemInstruction, responseMimeType: 'application/json', responseSchema: opts.responseSchema, maxOutputTokens: 32768 },
      });
      return { text: r.text || '', modelUsed: models[i], fallbackUsed: i > 0 };
    } catch (e: any) {
      last = e;
      const et = classifyError(e);
      if (et === 'MODEL_OVERLOADED' || et === 'NOT_FOUND') continue;
      if (et === 'PERMISSION_DENIED' && opts.provider === 'agent-platform') continue;
      if (et === 'AUTH_ERROR') throw new Error('API Key không hợp lệ hoặc đã hết hạn.');
      if (et === 'QUOTA_EXCEEDED') throw new Error('Hết quota API.');
      throw e;
    }
  }
  throw last || new Error('Tất cả model không khả dụng.');
}

// ============ Vercel Handler ============
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const apiKey = (req.headers['x-api-key'] as string) || process.env.GEMINI_API_KEY || '';
    const provider = ((req.headers['x-ai-provider'] as string) || 'gemini') as AiProvider;
    const selectedModel = (req.headers['x-ai-model'] as string) || 'gemini-3.6-flash';
    if (!apiKey) return res.status(401).json({ success: false, error: 'Vui lòng cấu hình API Key.' });

    const { text, imageBase64 } = req.body || {};
    const parts: any[] = [];
    parts.push({ text: text ? `Đề bài toán hình học: ${text}\n\nHãy phân tích và trả về dữ kiện hình học.` : 'Hãy phân tích hình ảnh đề bài toán hình học này và trả về dữ kiện hình học.' });
    if (imageBase64) {
      const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      parts.push({ inlineData: { mimeType, data: imageBase64.replace(/^data:image\/\w+;base64,/, '') } });
    }

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING },
        objects: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, type: { type: Type.STRING }, name: { type: Type.STRING }, details: { type: Type.STRING }, coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } } }, required: ['id', 'type', 'name'] } },
        relations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, objects: { type: Type.ARRAY, items: { type: Type.STRING } }, details: { type: Type.STRING } }, required: ['type', 'objects'] } },
        measurements: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, objects: { type: Type.ARRAY, items: { type: Type.STRING } }, value: { type: Type.STRING } }, required: ['type', 'objects', 'value'] } },
        visibility: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { edgeId: { type: Type.STRING }, style: { type: Type.STRING } }, required: ['edgeId', 'style'] } },
        uncertain_flags: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING } }, required: ['description'] } },
        geogebra_commands: { type: Type.ARRAY, items: { type: Type.STRING } },
        show_axes: { type: Type.BOOLEAN },
      },
      required: ['mode', 'objects', 'relations', 'measurements', 'visibility', 'uncertain_flags', 'geogebra_commands'],
    };

    const systemInstruction = `Bạn là Chuyên gia Toán học Việt Nam. Phân tích đề bài và trích xuất thông tin hình học.
ĐẶC BIỆT QUAN TRỌNG:
1. BẮT BUỘC dùng lệnh KHỐI ĐA DIỆN GeoGebra: Pyramid(), Prism(), Tetrahedron(). KHÔNG vẽ rời rạc từng Segment.
2. Dùng điểm tự do làm gốc, các điểm khác phụ thuộc qua vector.
- VD: Chóp S.ABCD -> A=(0,0,0), B=(4,0,0), D=(1,3,0), C=B+D-A, S=(2,2,5). Rồi: Pyramid(A,B,C,D,S).
- VD: Lăng trụ ABC.A1B1C1 -> A=(0,0,0), B=(3,0,0), C=(0,4,0), A1=(0,0,5), B1=B+A1-A, C1=C+A1-A. Rồi: Prism(A,B,C,A1,B1,C1).
- ĐỒ THỊ: show_axes=true, khai báo hàm vào geogebra_commands. mode="2D".
- Không dùng dấu nháy trong tên điểm.`;

    const result = await callAI({ apiKey, provider, selectedModel, contents: { parts }, systemInstruction, responseSchema });
    const data = JSON.parse(result.text || '{}');
    return res.status(200).json({ success: true, data, modelUsed: result.modelUsed, fallbackUsed: result.fallbackUsed });
  } catch (error: any) {
    const et = classifyError(error);
    return res.status(et === 'AUTH_ERROR' ? 401 : 500).json({ success: false, error: error?.message || 'Lỗi hệ thống', errorType: et });
  }
}
