import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type, Schema } from '@google/genai';
import { callWithFallback, AiProvider, parseApiError } from '../lib/ai-client';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const apiKey = req.headers['x-api-key'] as string;
  const provider = (req.headers['x-ai-provider'] as AiProvider) || 'gemini';
  const selectedModel = (req.headers['x-ai-model'] as string) || 'gemini-3.6-flash';

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Missing API Key' });
  }

  try {
    const { problemText, geometryData } = req.body;

    const systemInstruction = `Bạn là Chuyên gia Toán học Việt Nam cấp THPT. Hãy giải bài toán hình học sau một cách chi tiết, chính xác.

QUY TẮC:
- Trình bày lời giải theo từng bước rõ ràng, logic
- Mỗi bước phải có tiêu đề và nội dung giải thích
- Ghi rõ các công thức sử dụng (dạng LaTeX)
- Kết quả cuối cùng phải rõ ràng, chính xác
- Sử dụng ký hiệu toán học chuẩn quốc tế
- Nếu bài có nhiều câu hỏi, giải từng câu
- Đơn vị đo phải nhất quán`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        solution_text: { type: Type.STRING, description: 'Full solution text in markdown with LaTeX formulas' },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              step_number: { type: Type.NUMBER },
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              formula: { type: Type.STRING, description: 'Key formula used in this step (LaTeX)' }
            },
            required: ['step_number', 'title', 'content']
          }
        },
        formulas: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of all formulas used' },
        answer: { type: Type.STRING, description: 'Final concise answer' }
      },
      required: ['solution_text', 'steps', 'answer']
    };

    const prompt = `Bài toán:
${problemText || 'Không có đề bài.'}

Dữ liệu hình học:
${JSON.stringify(geometryData || {}, null, 2)}`;

    const result = await callWithFallback({
      apiKey,
      provider,
      selectedModel,
      contents: { parts: [{ text: prompt }] },
      systemInstruction,
      responseSchema,
    });

    let parsedResult;
    try {
      parsedResult = JSON.parse(result.text || '{}');
    } catch {
      parsedResult = { solution_text: result.text, steps: [], answer: result.text };
    }

    return res.status(200).json({ success: true, data: parsedResult });
  } catch (error: any) {
    console.error('Solve problem error:', error);
    const errorType = parseApiError(error);
    const statusCode = errorType === 'AUTH_ERROR' ? 401 : errorType === 'INVALID_REQUEST' ? 400 : 500;
    return res.status(statusCode).json({ success: false, error: error.message || 'Lỗi hệ thống', errorType });
  }
}
