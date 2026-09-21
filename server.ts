import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Type, Schema } from "@google/genai";
import { callWithFallback, AiProvider, parseApiError } from "./lib/ai-client";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for images
  app.use(express.json({ limit: "50mb" }));

  // AI API Route — Parse Geometry
  app.post("/api/parse-geometry", async (req, res) => {
    try {
      const apiKeyHeader = req.headers['x-api-key'] as string;
      const aiProviderHeader = (req.headers['x-ai-provider'] as AiProvider) || 'gemini';
      const aiModelHeader = (req.headers['x-ai-model'] as string) || 'gemini-3.6-flash';

      const apiKey = apiKeyHeader || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(401).json({ success: false, error: 'Vui lòng cấu hình API Key trước khi sử dụng tính năng này.' });
      }

      const { text, imageBase64 } = req.body;

      let parts: any[] = [];
      if (text) {
        parts.push({ text: `Đề bài toán hình học: ${text}\n\nHãy phân tích và trả về dữ kiện hình học.` });
      } else {
        parts.push({ text: "Hãy phân tích hình ảnh đề bài toán hình học này và trả về dữ kiện hình học." });
      }

      if (imageBase64) {
        const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        const data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType,
            data,
          },
        });
      }

      const responseSchema: Schema = {
        type: Type.OBJECT,
        description: "Geometry Data Model extracted from the problem",
        properties: {
          mode: {
            type: Type.STRING,
            description: "'2D' or '3D'",
          },
          objects: {
            type: Type.ARRAY,
            description: "List of geometric objects",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Object identifier, e.g. 'A', 'AB', 'C1'" },
                type: { type: Type.STRING, description: "Type of object: 'point', 'line', 'segment', 'polygon', 'circle', 'sphere', etc." },
                name: { type: Type.STRING, description: "Display name" },
                details: { type: Type.STRING, description: "Additional details if any" },
                coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Required for points. [x,y] or [x,y,z] coordinates to render beautifully." }
              },
              required: ["id", "type", "name"]
            }
          },
          relations: {
            type: Type.ARRAY,
            description: "Relationships between objects (perpendicular, parallel, belongs to, intersection, tangent, midpoint, centroid...)",
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "Relation type (e.g. 'perpendicular', 'parallel', 'midpoint', 'belongs_to')" },
                objects: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs of the objects involved" },
                details: { type: Type.STRING }
              },
              required: ["type", "objects"]
            }
          },
          measurements: {
            type: Type.ARRAY,
            description: "Measurements like angle, length, ratio",
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "'angle', 'length', 'ratio'" },
                objects: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs of the objects" },
                value: { type: Type.STRING, description: "The measured value, e.g. '90 degrees', '5 cm', '1:2'" }
              },
              required: ["type", "objects", "value"]
            }
          },
          visibility: {
            type: Type.ARRAY,
            description: "For 3D mode: edges visibility according to Vietnamese textbooks (dash/solid)",
            items: {
              type: Type.OBJECT,
              properties: {
                edgeId: { type: Type.STRING, description: "ID of the edge" },
                style: { type: Type.STRING, description: "'dash' or 'solid'" }
              },
              required: ["edgeId", "style"]
            }
          },
          uncertain_flags: {
            type: Type.ARRAY,
            description: "Warnings for unclear or ambiguous data",
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING, description: "Description of the uncertainty" }
              },
              required: ["description"]
            }
          },
          geogebra_commands: {
            type: Type.ARRAY,
            description: "Mảng chứa các lệnh GeoGebra tuần tự để dựng hình có ràng buộc hình học (dynamic).",
            items: { type: Type.STRING }
          },
          show_axes: {
            type: Type.BOOLEAN,
            description: "Set to true if the problem involves a function graph or coordinate geometry where standard Oxy axes should be displayed."
          }
        },
        required: ["mode", "objects", "relations", "measurements", "visibility", "uncertain_flags", "geogebra_commands"]
      };

      const systemInstruction = `
        Bạn là Chuyên gia Toán học Việt Nam. Nhiệm vụ của bạn là phân tích đề bài (có thể bằng hình ảnh hoặc văn bản)
        để trích xuất các thông tin hình học. Trả về kết quả dưới định dạng JSON tuân thủ đúng schema.
        
        ĐẶC BIỆT QUAN TRỌNG VỀ TÍNH TOÁN RÀNG BUỘC (CONSTRAINTS) VÀ LỆNH GEOGEBRA:
        Để hình vẽ không bị vỡ và TỰ ĐỘNG NÉT ĐỨT/NÉT LIỀN khi xoay 3D (mà KHÔNG CẦN màu nền):
        1. BẮT BUỘC sử dụng các lệnh KHỐI ĐA DIỆN (Polyhedron) của GeoGebra như: Pyramid(A,B,C,D,S), Prism(A,B,C,D,E,F,G,H), Tetrahedron(A,B,C,S).
        - Lý do: Chỉ có khối đa diện nguyên bản của GeoGebra mới có thuật toán tự động nhận diện cạnh khuất (để vẽ nét đứt) khi người dùng xoay hình 3D, ngay cả khi ta làm trong suốt mặt phẳng (opacity = 0). TUYỆT ĐỐI KHÔNG vẽ rời rạc từng đoạn thẳng (Segment) cho các cạnh của khối chóp/lăng trụ vì chúng sẽ không thể tự động đổi nét đứt khi xoay. Chỉ dùng Segment cho các đường phụ (đường cao, trung tuyến).
        2. Dùng điểm tự do làm gốc, các điểm khác phụ thuộc qua vector/phép toán để giữ vững ràng buộc song song, vuông góc khi người dùng kéo/xoay.
        - VÍ DỤ 3D: Chóp tứ giác S.ABCD đáy hình bình hành -> A=(0,0,0), B=(4,0,0), D=(1,3,0), C=B+D-A, S=(2,2,5). Sau đó gọi lệnh: Pyramid(A,B,C,D,S).
        - VÍ DỤ 3D: Lăng trụ đứng ABC.A'B'C' -> A=(0,0,0), B=(3,0,0), C=(0,4,0). A'=(0,0,5). B'=B+A'-A. C'=C+A'-A. Sau đó dùng Prism(A,B,C, A',B',C').
        - LƯU Ý VỀ ĐỒ THỊ: Nếu đề bài là ĐỒ THỊ HÀM SỐ (hàm bậc 3, bậc 4, phân thức...), hãy đặt show_axes = true. Khai báo hàm số trực tiếp vào geogebra_commands, ví dụ: "f(x) = x^3 - 3x". Đặt mode="2D".
        - LƯU Ý: Tuyệt đối không dùng dấu nháy đơn, nháy kép trong tên điểm (chỉ dùng A, B, C...). Tên biến không được trùng với từ khóa GeoGebra.
      `;

      const result = await callWithFallback({
        apiKey,
        provider: aiProviderHeader,
        selectedModel: aiModelHeader,
        contents: { parts },
        systemInstruction,
        responseSchema
      });

      const geometryData = JSON.parse(result.text || '{}');

      res.json({ 
        success: true, 
        data: geometryData, 
        modelUsed: result.modelUsed, 
        fallbackUsed: result.fallbackUsed 
      });
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      const errorType = parseApiError(error);
      const statusCode = errorType === 'AUTH_ERROR' ? 401 : errorType === 'INVALID_REQUEST' ? 400 : 500;
      res.status(statusCode).json({ success: false, error: error.message, errorType });
    }
  });

  // AI API Route — Generate TikZ
  app.post("/api/generate-tikz", async (req, res) => {
    try {
      const apiKeyHeader = req.headers['x-api-key'] as string;
      const aiProviderHeader = (req.headers['x-ai-provider'] as AiProvider) || 'gemini';
      const aiModelHeader = (req.headers['x-ai-model'] as string) || 'gemini-3.6-flash';

      const apiKey = apiKeyHeader || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(401).json({ success: false, error: 'API Key is missing' });
      }

      const { geometryData } = req.body;

      const systemInstruction = `Bạn là chuyên gia LaTeX/TikZ. Hãy chuyển đổi dữ liệu hình học sau thành mã LaTeX TikZ chất lượng xuất bản.

QUY TẮC:
- Hình 2D: dùng gói tikz và tkz-euclide. Vẽ điểm, đoạn thẳng, góc, nhãn đúng vị trí.
- Hình 3D: dùng tikz-3dplot. Nét đứt cho cạnh khuất. Nhãn điểm rõ ràng.
- Đồ thị hàm số: dùng pgfplots với axis environment. Trục Oxy rõ ràng, điểm đặc biệt được đánh dấu.
- Xuất mã LaTeX hoàn chỉnh có thể biên dịch trực tiếp (bao gồm \\documentclass, \\usepackage, \\begin{document}).
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
        contents: { parts: [{ text: JSON.stringify(geometryData) }] },
        systemInstruction,
        responseSchema
      });

      const resultData = JSON.parse(result.text || '{}');

      res.json({ success: true, tikzCode: resultData.tikz_code, packages: resultData.packages || [] });
    } catch (error: any) {
      console.error("Error generating TikZ:", error);
      const errorType = parseApiError(error);
      res.status(500).json({ success: false, error: error.message, errorType });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
