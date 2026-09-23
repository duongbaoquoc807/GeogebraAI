var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api-src/parse-geometry.ts
var parse_geometry_exports = {};
__export(parse_geometry_exports, {
  default: () => handler
});
module.exports = __toCommonJS(parse_geometry_exports);
var import_genai = require("@google/genai");
var FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
var AP_FALLBACK = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
function createClient(apiKey, provider) {
  return provider === "agent-platform" ? new import_genai.GoogleGenAI({ vertexai: true, apiKey }) : new import_genai.GoogleGenAI({ apiKey });
}
function getModels(sel, provider) {
  return Array.from(/* @__PURE__ */ new Set([sel, ...provider === "agent-platform" ? AP_FALLBACK : FALLBACK_MODELS]));
}
function classifyError(e) {
  const s = e?.status, m = (e?.message || "").toLowerCase();
  if (s === 500 || s === 503 || s === 504 || m.includes("overloaded")) return "MODEL_OVERLOADED";
  if (s === 404) return "NOT_FOUND";
  if (s === 401) return "AUTH_ERROR";
  if (s === 403) return "PERMISSION_DENIED";
  if (s === 429) return "QUOTA_EXCEEDED";
  if (s === 400) return "INVALID_REQUEST";
  return "UNKNOWN";
}
async function callAI(opts) {
  const client = createClient(opts.apiKey, opts.provider);
  const models = getModels(opts.selectedModel, opts.provider);
  let last;
  for (let i = 0; i < models.length; i++) {
    try {
      const r = await client.models.generateContent({
        model: models[i],
        contents: opts.contents,
        config: { systemInstruction: opts.systemInstruction, responseMimeType: "application/json", responseSchema: opts.responseSchema, maxOutputTokens: 32768 }
      });
      return { text: r.text || "", modelUsed: models[i], fallbackUsed: i > 0 };
    } catch (e) {
      last = e;
      const et = classifyError(e);
      if (et === "MODEL_OVERLOADED" || et === "NOT_FOUND") continue;
      if (et === "PERMISSION_DENIED" && opts.provider === "agent-platform") continue;
      if (et === "AUTH_ERROR") throw new Error("API Key kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n.");
      if (et === "QUOTA_EXCEEDED") throw new Error("H\u1EBFt quota API.");
      throw e;
    }
  }
  throw last || new Error("T\u1EA5t c\u1EA3 model kh\xF4ng kh\u1EA3 d\u1EE5ng.");
}
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const apiKey = req.headers["x-api-key"] || process.env.GEMINI_API_KEY || "";
    const provider = req.headers["x-ai-provider"] || "gemini";
    const selectedModel = req.headers["x-ai-model"] || "gemini-3.6-flash";
    if (!apiKey) return res.status(401).json({ success: false, error: "Vui l\xF2ng c\u1EA5u h\xECnh API Key." });
    const { text, imageBase64 } = req.body || {};
    const parts = [];
    parts.push({ text: text ? `\u0110\u1EC1 b\xE0i to\xE1n h\xECnh h\u1ECDc: ${text}

H\xE3y ph\xE2n t\xEDch v\xE0 tr\u1EA3 v\u1EC1 d\u1EEF ki\u1EC7n h\xECnh h\u1ECDc.` : "H\xE3y ph\xE2n t\xEDch h\xECnh \u1EA3nh \u0111\u1EC1 b\xE0i to\xE1n h\xECnh h\u1ECDc n\xE0y v\xE0 tr\u1EA3 v\u1EC1 d\u1EEF ki\u1EC7n h\xECnh h\u1ECDc." });
    if (imageBase64) {
      const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      parts.push({ inlineData: { mimeType, data: imageBase64.replace(/^data:image\/\w+;base64,/, "") } });
    }
    const responseSchema = {
      type: import_genai.Type.OBJECT,
      properties: {
        mode: { type: import_genai.Type.STRING },
        objects: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.OBJECT, properties: { id: { type: import_genai.Type.STRING }, type: { type: import_genai.Type.STRING }, name: { type: import_genai.Type.STRING }, details: { type: import_genai.Type.STRING }, coordinates: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.NUMBER } } }, required: ["id", "type", "name"] } },
        relations: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.OBJECT, properties: { type: { type: import_genai.Type.STRING }, objects: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }, details: { type: import_genai.Type.STRING } }, required: ["type", "objects"] } },
        measurements: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.OBJECT, properties: { type: { type: import_genai.Type.STRING }, objects: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }, value: { type: import_genai.Type.STRING } }, required: ["type", "objects", "value"] } },
        visibility: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.OBJECT, properties: { edgeId: { type: import_genai.Type.STRING }, style: { type: import_genai.Type.STRING } }, required: ["edgeId", "style"] } },
        uncertain_flags: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.OBJECT, properties: { description: { type: import_genai.Type.STRING } }, required: ["description"] } },
        geogebra_commands: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
        show_axes: { type: import_genai.Type.BOOLEAN }
      },
      required: ["mode", "objects", "relations", "measurements", "visibility", "uncertain_flags", "geogebra_commands"]
    };
    const systemInstruction = `B\u1EA1n l\xE0 Chuy\xEAn gia To\xE1n h\u1ECDc Vi\u1EC7t Nam. Ph\xE2n t\xEDch \u0111\u1EC1 b\xE0i v\xE0 tr\xEDch xu\u1EA5t th\xF4ng tin h\xECnh h\u1ECDc.
\u0110\u1EB6C BI\u1EC6T QUAN TR\u1ECCNG:
1. B\u1EAET BU\u1ED8C d\xF9ng l\u1EC7nh KH\u1ED0I \u0110A DI\u1EC6N GeoGebra: Pyramid(), Prism(), Tetrahedron(). KH\xD4NG v\u1EBD r\u1EDDi r\u1EA1c t\u1EEBng Segment.
2. D\xF9ng \u0111i\u1EC3m t\u1EF1 do l\xE0m g\u1ED1c, c\xE1c \u0111i\u1EC3m kh\xE1c ph\u1EE5 thu\u1ED9c qua vector.
- VD: Ch\xF3p S.ABCD -> A=(0,0,0), B=(4,0,0), D=(1,3,0), C=B+D-A, S=(2,2,5). R\u1ED3i: Pyramid(A,B,C,D,S).
- VD: L\u0103ng tr\u1EE5 ABC.A1B1C1 -> A=(0,0,0), B=(3,0,0), C=(0,4,0), A1=(0,0,5), B1=B+A1-A, C1=C+A1-A. R\u1ED3i: Prism(A,B,C,A1,B1,C1).
- \u0110\u1ED2 TH\u1ECA: show_axes=true, khai b\xE1o h\xE0m v\xE0o geogebra_commands. mode="2D".
- Kh\xF4ng d\xF9ng d\u1EA5u nh\xE1y trong t\xEAn \u0111i\u1EC3m.`;
    const result = await callAI({ apiKey, provider, selectedModel, contents: { parts }, systemInstruction, responseSchema });
    const data = JSON.parse(result.text || "{}");
    return res.status(200).json({ success: true, data, modelUsed: result.modelUsed, fallbackUsed: result.fallbackUsed });
  } catch (error) {
    const et = classifyError(error);
    return res.status(et === "AUTH_ERROR" ? 401 : 500).json({ success: false, error: error?.message || "L\u1ED7i h\u1EC7 th\u1ED1ng", errorType: et });
  }
}
