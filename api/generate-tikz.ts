import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type, Schema } from '@google/genai';
import { callWithFallback, AiProvider, parseApiError } from './_lib/ai-client';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const apiKeyHeader = req.headers['x-api-key'] as string;
    const aiProviderHeader = (req.headers['x-ai-provider'] as AiProvider) || 'gemini';
    const aiModelHeader = (req.headers['x-ai-model'] as string) || 'gemini-3.6-flash';

    const apiKey = apiKeyHeader || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'Unauthorized: API Key is missing' });
    }

    const { geometryData } = req.body || {};

    const parts = [{ text: JSON.stringify(geometryData) }];

    const systemInstruction = `Bạn là chuyên gia LaTeX/TikZ. Hãy chuyển đổi dữ liệu hình học sau thành mã LaTeX TikZ chất lượng xuất bản.

QUY TẮC:
- Hình 2D: dùng gói tikz và tkz-euclide. Vẽ điểm, đoạn thẳng, góc, nhãn đúng vị trí.
- Hình 3D: dùng tikz-3dplot. Nét đứt cho cạnh khuất. Nhãn điểm rõ ràng.
- Đồ thị hàm số: dùng pgfplots với axis environment. Trục Oxy rõ ràng, điểm đặc biệt được đánh dấu.
- Xuất mã LaTeX hoàn chỉnh có thể biên dịch trực tiếp (bao gồm \\\\documentclass, \\\\usepackage, \\\\begin{document}).
- Tất cả nhãn tiếng Việt phải dùng gói fontspec hoặc inputenc utf8.
- Đảm bảo hình vẽ chính xác toán học.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        tikz_code: { type: Type.STRING },
        packages: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['tikz_code']
    };

    const result = await callWithFallback({
      apiKey,
      provider: aiProviderHeader,
      selectedModel: aiModelHeader,
      contents: { parts },
      systemInstruction,
      responseSchema
    });

    const resultData = JSON.parse(result.text || '{}');

    return res.status(200).json({
      success: true,
      tikzCode: resultData.tikz_code,
      packages: resultData.packages || []
    });
  } catch (error: any) {
    console.error("Generate TikZ error:", error?.message || error);
    const errorType = parseApiError(error);
    const statusCode = errorType === 'AUTH_ERROR' ? 401 : errorType === 'INVALID_REQUEST' ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: error?.message || 'Lỗi hệ thống',
      errorType
    });
  }
}
