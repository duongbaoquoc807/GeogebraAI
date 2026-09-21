import React, { useState, useEffect, useCallback } from 'react';
import { GeometryDataModel, StepState, StepStatus, HistoryEntry } from './types';
import { AiProvider } from './lib/api-key-store';
import * as store from './lib/api-key-store';
import * as historyStore from './lib/history-store';
import { InputSection } from './components/InputSection';
import { ReviewSection } from './components/ReviewSection';
import { RenderSection } from './components/RenderSection';
import Header from './components/Header';
import ApiKeyModal from './components/ApiKeyModal';
import { SolutionSection } from './components/SolutionSection';
import TemplateLibrary from './components/TemplateLibrary';
import HistoryPanel from './components/HistoryPanel';
import { CheckCircle, Loader2, AlertCircle, MinusCircle, History, Compass } from 'lucide-react';

const INITIAL_STEPS: StepState[] = [
  { status: 'pending', label: 'Phân tích AI' },
  { status: 'pending', label: 'Xác nhận dữ kiện' },
  { status: 'pending', label: 'Dựng hình' },
];

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'done':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'loading':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'stopped':
      return <MinusCircle className="w-5 h-5 text-slate-400" />;
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;
  }
}

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geometryData, setGeometryData] = useState<GeometryDataModel | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [inputImage, setInputImage] = useState<string | null>(null);

  // API Key / Provider / Model
  const [apiKey, setApiKey] = useState<string>('');
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.6-flash');
  const [showSettings, setShowSettings] = useState(false);

  // Steps progress
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);

  // History panel
  const [showHistory, setShowHistory] = useState(false);

  // Template auto-fill ref
  const [templatePrompt, setTemplatePrompt] = useState<string | null>(null);

  useEffect(() => {
    const p = store.getProvider();
    setProvider(p);
    setApiKey(store.getApiKey(p) || '');
    setSelectedModel(store.getSelectedModel(p));
    if (!store.hasApiKey()) setShowSettings(true);
  }, []);

  const updateStep = useCallback((index: number, update: Partial<StepState>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
  }, []);

  const setStepError = useCallback((index: number, errorMsg: string) => {
    setSteps(prev => prev.map((s, i) => {
      if (i === index) return { ...s, status: 'error', error: errorMsg };
      if (i > index) return { ...s, status: 'stopped', error: 'Đã dừng do lỗi' };
      return s;
    }));
  }, []);

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-ai-provider': provider,
    'x-ai-model': selectedModel,
  }), [apiKey, provider, selectedModel]);

  const handleSettingsSave = (newKey: string, newProvider: AiProvider, newModel: string) => {
    store.setApiKey(newProvider, newKey);
    store.setProvider(newProvider);
    store.setSelectedModel(newModel);
    setApiKey(newKey);
    setProvider(newProvider);
    setSelectedModel(newModel);
  };

  const handleInputSubmit = async (text: string, imageBase64: string | null) => {
    if (!apiKey) { setShowSettings(true); return; }

    setInputText(text);
    setInputImage(imageBase64);
    setIsLoading(true);
    setError(null);
    setSteps([
      { status: 'loading', label: 'Phân tích AI' },
      { status: 'pending', label: 'Xác nhận dữ kiện' },
      { status: 'pending', label: 'Dựng hình' },
    ]);

    try {
      const res = await fetch("/api/parse-geometry", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ text, imageBase64 }),
      });

      if (!res.ok) {
        const textResponse = await res.text();
        let errorMessage = `Lỗi máy chủ (${res.status}).`;
        try {
          const json = JSON.parse(textResponse);
          errorMessage = json.error || errorMessage;
        } catch {
          if (res.status === 504) errorMessage = "Yêu cầu quá thời gian chờ. Vui lòng thử lại.";
          else if (res.status === 502 || res.status === 503) errorMessage = "Model đang quá tải; app đang thử model dự phòng.";
          else if (res.status === 401) errorMessage = "API Key không hợp lệ hoặc đã hết hạn.";
          else if (res.status === 429) errorMessage = "Đã hết quota hoặc vượt giới hạn tốc độ API.";
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      if (result.success) {
        setGeometryData(result.data);
        setModelUsed(result.modelUsed || null);
        updateStep(0, { status: 'done', modelUsed: result.modelUsed });
        updateStep(1, { status: 'loading' });
        setStep(2);

        // Save to history
        let thumb: string | undefined;
        if (imageBase64) {
          try { thumb = await historyStore.createThumbnail(imageBase64); } catch {}
        }
        historyStore.addHistoryEntry({
          inputText: text || '(Ảnh đề bài)',
          inputImageThumb: thumb,
          geometryData: result.data,
          modelUsed: result.modelUsed,
        });
      } else {
        throw new Error(result.error || "Có lỗi xảy ra.");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối mạng.");
      setStepError(0, err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmData = () => {
    updateStep(1, { status: 'done' });
    updateStep(2, { status: 'loading' });
    setStep(3);
    setTimeout(() => updateStep(2, { status: 'done' }), 2000);
  };

  const handleReset = () => {
    setStep(1);
    setGeometryData(null);
    setError(null);
    setModelUsed(null);
    setInputText('');
    setInputImage(null);
    setSteps(INITIAL_STEPS);
  };

  const handleTemplateSelect = (prompt: string) => {
    setTemplatePrompt(prompt);
    // Auto-submit if we have a key
    if (apiKey) {
      handleInputSubmit(prompt, null);
    }
  };

  const handleHistoryRestore = (entry: HistoryEntry) => {
    setGeometryData(entry.geometryData);
    setInputText(entry.inputText);
    setModelUsed(entry.modelUsed || null);
    setSteps([
      { status: 'done', label: 'Phân tích AI', modelUsed: entry.modelUsed },
      { status: 'loading', label: 'Xác nhận dữ kiện' },
      { status: 'pending', label: 'Dựng hình' },
    ]);
    setStep(2);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <Header
        currentModel={selectedModel}
        provider={provider}
        hasKey={!!apiKey && store.validateApiKey(apiKey)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <ApiKeyModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onRestore={handleHistoryRestore}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
        {/* Progress Stepper */}
        <div className="mb-6 flex items-center gap-2 bg-white px-4 sm:px-6 py-3 rounded-lg border border-slate-200 shadow-sm flex-wrap">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1.5">
                <StepIcon status={s.status} />
                <span className={`text-sm font-medium ${
                  s.status === 'done' ? 'text-green-700' :
                  s.status === 'loading' ? 'text-blue-700' :
                  s.status === 'error' ? 'text-red-700' :
                  s.status === 'stopped' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {s.status === 'error' ? s.error : s.status === 'stopped' ? 'Đã dừng' : s.label}
                </span>
                {s.modelUsed && s.status === 'done' && (
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded hidden sm:inline">{s.modelUsed}</span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px min-w-4 ${steps[i + 1].status !== 'pending' ? 'bg-blue-300' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setShowHistory(true)} className="text-xs text-slate-500 hover:text-blue-600 border border-slate-200 px-3 py-1 rounded transition-colors flex items-center gap-1" title="Lịch sử">
              <History className="w-3.5 h-3.5" /> Lịch sử
            </button>
            {step > 1 && (
              <button onClick={handleReset} className="text-xs text-slate-500 hover:text-blue-600 border border-slate-200 px-3 py-1 rounded transition-colors">
                Làm lại
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Lỗi xử lý</p>
              <p className="text-sm mt-1">{error}</p>
              {modelUsed && <p className="text-xs mt-1 text-red-500">Model: {modelUsed}</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            {/* Template Library */}
            {step === 1 && (
              <TemplateLibrary onSelect={handleTemplateSelect} />
            )}

            <div className={`transition-opacity duration-300 ${step !== 1 && 'opacity-60 grayscale-[30%] pointer-events-none'}`}>
              <InputSection onSubmit={handleInputSubmit} isLoading={isLoading} />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {step >= 2 && geometryData && (
              <div className="transition-opacity duration-500 animate-in fade-in slide-in-from-bottom-4">
                <ReviewSection
                  data={geometryData}
                  onConfirm={handleConfirmData}
                  onEdit={(newData) => setGeometryData(newData)}
                />
              </div>
            )}
          </div>
        </div>

        {step === 3 && geometryData && (
          <>
            <div className="transition-opacity duration-500 animate-in fade-in slide-in-from-bottom-8">
              <RenderSection
                data={geometryData}
                onUpdateData={(newData) => setGeometryData(newData)}
                apiKey={apiKey}
                provider={provider}
                selectedModel={selectedModel}
              />
            </div>

            {/* Solution Section */}
            <div className="mt-6">
              <SolutionSection
                problemText={inputText}
                geometryDataJson={JSON.stringify(geometryData)}
                apiKey={apiKey}
                provider={provider}
                selectedModel={selectedModel}
              />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Compass className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-slate-700">AI Geometry Studio</span>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm text-slate-600 font-medium">
                © {new Date().getFullYear()} Thầy Dương Bảo Quốc
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Tổ Toán - Tin &bull; Trường THCS & THPT Khánh Lâm
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
