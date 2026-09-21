export type AiProvider = 'gemini' | 'agent-platform';

const GOOGLE_AI_API_KEY_PATTERN = /^(?:AIzaSy|AQ)\S{8,}$/;

const STORAGE_KEYS = {
  GEMINI_KEY: 'gemini_api_key',
  AGENT_PLATFORM_KEY: 'agent_platform_api_key',
  PROVIDER: 'google_ai_provider',
  PROVIDER_SOURCE: 'google_ai_provider_selection_source',
  SELECTED_MODEL: 'selected_ai_model',
} as const;

export const GEMINI_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Mặc định — Nhanh, mạnh, chi phí thấp', isDefault: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Chất lượng cao, dự phòng', isDefault: false },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Nhanh, rẻ, phân tích tài liệu tốt', isDefault: false },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Ổn định, dự phòng cuối', isDefault: false },
];

export const AGENT_PLATFORM_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Mặc định cho Agent Platform', isDefault: true },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Nhanh, chi phí thấp', isDefault: false },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Suy luận mạnh, chất lượng cao', isDefault: false },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Preview — Agentic capabilities', isDefault: false },
];

export function validateApiKey(key: string): boolean {
  return GOOGLE_AI_API_KEY_PATTERN.test(key);
}

export function getApiKey(provider: AiProvider): string | null {
  const key = provider === 'gemini' ? STORAGE_KEYS.GEMINI_KEY : STORAGE_KEYS.AGENT_PLATFORM_KEY;
  return localStorage.getItem(key);
}

export function setApiKey(provider: AiProvider, key: string): void {
  const storageKey = provider === 'gemini' ? STORAGE_KEYS.GEMINI_KEY : STORAGE_KEYS.AGENT_PLATFORM_KEY;
  localStorage.setItem(storageKey, key);
}

export function getProvider(): AiProvider {
  const provider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
  if (provider === 'gemini' || provider === 'agent-platform') {
    return provider;
  }
  return 'gemini';
}

export function setProvider(provider: AiProvider): void {
  localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
  localStorage.setItem(STORAGE_KEYS.PROVIDER_SOURCE, 'manual');
}

export function getSelectedModel(provider: AiProvider): string {
  const savedModel = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
  if (savedModel) {
    // Check if the model is valid for the provider
    const models = provider === 'gemini' ? GEMINI_MODELS : AGENT_PLATFORM_MODELS;
    if (models.some((m) => m.id === savedModel)) {
      return savedModel;
    }
  }
  
  return provider === 'gemini' ? 'gemini-3.6-flash' : 'gemini-2.5-flash';
}

export function setSelectedModel(model: string): void {
  localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
}

export function hasApiKey(): boolean {
  const provider = getProvider();
  const key = getApiKey(provider);
  return !!key && validateApiKey(key);
}
