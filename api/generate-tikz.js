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

// api-src/generate-tikz.ts
var generate_tikz_exports = {};
__export(generate_tikz_exports, {
  default: () => handler
});
module.exports = __toCommonJS(generate_tikz_exports);
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
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const apiKey = req.headers["x-api-key"] || process.env.GEMINI_API_KEY || "";
    const provider = req.headers["x-ai-provider"] || "gemini";
    const selectedModel = req.headers["x-ai-model"] || "gemini-3.6-flash";
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    const { geometryData } = req.body || {};
    const systemInstruction = `B\u1EA1n l\xE0 chuy\xEAn gia LaTeX/TikZ. Chuy\u1EC3n \u0111\u1ED5i d\u1EEF li\u1EC7u h\xECnh h\u1ECDc th\xE0nh m\xE3 LaTeX TikZ.
- H\xECnh 2D: tikz + tkz-euclide. H\xECnh 3D: tikz-3dplot. \u0110\u1ED3 th\u1ECB: pgfplots.
- Xu\u1EA5t m\xE3 LaTeX ho\xE0n ch\u1EC9nh. Nh\xE3n ti\u1EBFng Vi\u1EC7t d\xF9ng inputenc utf8.`;
    const responseSchema = { type: import_genai.Type.OBJECT, properties: { tikz_code: { type: import_genai.Type.STRING }, packages: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } } }, required: ["tikz_code"] };
    const result = await callAI({ apiKey, provider, selectedModel, contents: { parts: [{ text: JSON.stringify(geometryData) }] }, systemInstruction, responseSchema });
    const d = JSON.parse(result.text || "{}");
    return res.status(200).json({ success: true, tikzCode: d.tikz_code, packages: d.packages || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "L\u1ED7i h\u1EC7 th\u1ED1ng" });
  }
}
