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

// api-src/solve-problem.ts
var solve_problem_exports = {};
__export(solve_problem_exports, {
  default: () => handler
});
module.exports = __toCommonJS(solve_problem_exports);
var import_genai = require("@google/genai");
var FALLBACK = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
var AP_FALLBACK = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
function createClient(k, p) {
  return p === "agent-platform" ? new import_genai.GoogleGenAI({ vertexai: true, apiKey: k }) : new import_genai.GoogleGenAI({ apiKey: k });
}
function getModels(s, p) {
  return Array.from(/* @__PURE__ */ new Set([s, ...p === "agent-platform" ? AP_FALLBACK : FALLBACK]));
}
function classifyError(e) {
  const s = e?.status, m = (e?.message || "").toLowerCase();
  if (s === 500 || s === 503 || s === 504 || m.includes("overloaded")) return "MODEL_OVERLOADED";
  if (s === 404) return "NOT_FOUND";
  if (s === 401) return "AUTH_ERROR";
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
      const r = await client.models.generateContent({ model: models[i], contents: opts.contents, config: { systemInstruction: opts.systemInstruction, responseMimeType: "application/json", responseSchema: opts.responseSchema, maxOutputTokens: 32768 } });
      return { text: r.text || "", modelUsed: models[i], fallbackUsed: i > 0 };
    } catch (e) {
      last = e;
      const et = classifyError(e);
      if (et === "MODEL_OVERLOADED" || et === "NOT_FOUND") continue;
      throw e;
    }
  }
  throw last || new Error("T\u1EA5t c\u1EA3 model kh\xF4ng kh\u1EA3 d\u1EE5ng.");
}
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method Not Allowed" });
  try {
    const apiKey = req.headers["x-api-key"] || "";
    const provider = req.headers["x-ai-provider"] || "gemini";
    const selectedModel = req.headers["x-ai-model"] || "gemini-3.6-flash";
    if (!apiKey) return res.status(401).json({ success: false, error: "Missing API Key" });
    const { problemText, geometryData } = req.body || {};
    const systemInstruction = `B\u1EA1n l\xE0 Chuy\xEAn gia To\xE1n h\u1ECDc Vi\u1EC7t Nam c\u1EA5p THPT. Gi\u1EA3i b\xE0i to\xE1n h\xECnh h\u1ECDc chi ti\u1EBFt, ch\xEDnh x\xE1c.
- Tr\xECnh b\xE0y t\u1EEBng b\u01B0\u1EDBc r\xF5 r\xE0ng, ghi c\xF4ng th\u1EE9c LaTeX.
- K\u1EBFt qu\u1EA3 cu\u1ED1i c\xF9ng r\xF5 r\xE0ng. K\xFD hi\u1EC7u chu\u1EA9n qu\u1ED1c t\u1EBF. \u0110\u01A1n v\u1ECB nh\u1EA5t qu\xE1n.`;
    const responseSchema = {
      type: import_genai.Type.OBJECT,
      properties: {
        solution_text: { type: import_genai.Type.STRING },
        steps: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.OBJECT, properties: { step_number: { type: import_genai.Type.NUMBER }, title: { type: import_genai.Type.STRING }, content: { type: import_genai.Type.STRING }, formula: { type: import_genai.Type.STRING } }, required: ["step_number", "title", "content"] } },
        formulas: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
        answer: { type: import_genai.Type.STRING }
      },
      required: ["solution_text", "steps", "answer"]
    };
    const prompt = `B\xE0i to\xE1n:
${problemText || "Kh\xF4ng c\xF3 \u0111\u1EC1 b\xE0i."}

D\u1EEF li\u1EC7u h\xECnh h\u1ECDc:
${JSON.stringify(geometryData || {})}`;
    const result = await callAI({ apiKey, provider, selectedModel, contents: { parts: [{ text: prompt }] }, systemInstruction, responseSchema });
    let parsed;
    try {
      parsed = JSON.parse(result.text || "{}");
    } catch {
      parsed = { solution_text: result.text, steps: [], answer: result.text };
    }
    return res.status(200).json({ success: true, data: parsed });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "L\u1ED7i h\u1EC7 th\u1ED1ng" });
  }
}
