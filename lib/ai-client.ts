import { GoogleGenAI, Type, Schema } from '@google/genai';

export type AiProvider = 'gemini' | 'agent-platform';

export const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];

export const AGENT_PLATFORM_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

export function createGoogleAiClient(apiKey: string, provider: AiProvider): GoogleGenAI {
  if (provider === 'agent-platform') {
    return new GoogleGenAI({ vertexai: true, apiKey });
  }
  return new GoogleGenAI({ apiKey });
}

export function getOrderedModels(selectedModel: string, provider: AiProvider): string[] {
  const fallbacks = provider === 'agent-platform' ? AGENT_PLATFORM_FALLBACK_MODELS : FALLBACK_MODELS;
  const models = [selectedModel, ...fallbacks];
  return Array.from(new Set(models));
}

export type ApiErrorType = 
  | 'MODEL_OVERLOADED'  // 500, 503, 504, overloaded/high demand text
  | 'NOT_FOUND'         // 404
  | 'AUTH_ERROR'        // 401
  | 'PERMISSION_DENIED' // 403
  | 'QUOTA_EXCEEDED'    // 429
  | 'INVALID_REQUEST'   // 400
  | 'UNKNOWN';

export function parseApiError(error: any): ApiErrorType {
  const status = error?.status;
  const message = (error?.message || '').toLowerCase();
  
  if (status === 500 || status === 503 || status === 504 || message.includes('overloaded') || message.includes('high demand')) {
    return 'MODEL_OVERLOADED';
  }
  if (status === 404) return 'NOT_FOUND';
  if (status === 401) return 'AUTH_ERROR';
  if (status === 403) return 'PERMISSION_DENIED';
  if (status === 429) return 'QUOTA_EXCEEDED';
  if (status === 400) return 'INVALID_REQUEST';
  return 'UNKNOWN';
}

export interface CallOptions {
  apiKey: string;
  provider: AiProvider;
  selectedModel: string;
  contents: any;
  systemInstruction: string;
  responseSchema: Schema;
  maxOutputTokens?: number;
}

export interface CallResult {
  text: string;
  modelUsed: string;
  fallbackUsed: boolean;
}

export async function callWithFallback(options: CallOptions): Promise<CallResult> {
  const { apiKey, provider, selectedModel, contents, systemInstruction, responseSchema, maxOutputTokens } = options;
  const client = createGoogleAiClient(apiKey, provider);
  const orderedModels = getOrderedModels(selectedModel, provider);
  
  let lastError: any;
  
  for (let i = 0; i < orderedModels.length; i++) {
    const model = orderedModels[i];
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          maxOutputTokens: maxOutputTokens || 32768
        }
      });
      
      return {
        text: response.text || '',
        modelUsed: model,
        fallbackUsed: i > 0
      };
    } catch (error: any) {
      lastError = error;
      const errorType = parseApiError(error);
      
      if (errorType === 'MODEL_OVERLOADED' || errorType === 'NOT_FOUND') {
        console.warn(`[AI Client] Model ${model} failed with ${errorType}, trying next...`);
        continue;
      }
      
      if (errorType === 'PERMISSION_DENIED' && provider === 'agent-platform') {
        console.warn(`[AI Client] Model ${model} permission denied on agent-platform, trying next...`);
        continue;
      }
      
      // Throw immediately for other errors
      if (errorType === 'AUTH_ERROR') {
        throw new Error('API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong Cài đặt.');
      }
      if (errorType === 'PERMISSION_DENIED') {
        throw new Error('API key không có quyền truy cập. Vui lòng kiểm tra cấu hình.');
      }
      if (errorType === 'QUOTA_EXCEEDED') {
        throw new Error('Đã hết quota hoặc vượt giới hạn tốc độ API. Vui lòng đợi rồi thử lại.');
      }
      if (errorType === 'INVALID_REQUEST') {
        throw new Error('Yêu cầu không hợp lệ: ' + error.message);
      }
      
      throw error;
    }
  }
  
  throw new Error('Tất cả model đều không khả dụng. Vui lòng thử lại sau.');
}
