import React, { useState, useEffect } from 'react';
import { Settings, Key, ExternalLink, Check, X } from 'lucide-react';
import {
  AiProvider,
  validateApiKey,
  getApiKey,
  getProvider,
  getSelectedModel,
  GEMINI_MODELS,
  AGENT_PLATFORM_MODELS,
  hasApiKey
} from '../lib/api-key-store';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, provider: AiProvider, model: string) => void;
}

export default function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [activeTab, setActiveTab] = useState<AiProvider>(getProvider());
  const [apiKey, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModelInput] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      const currentProvider = getProvider();
      setActiveTab(currentProvider);
      setApiKeyInput(getApiKey(currentProvider) || '');
      setSelectedModelInput(getSelectedModel(currentProvider));
    }
  }, [isOpen]);

  const handleTabChange = (provider: AiProvider) => {
    setActiveTab(provider);
    setApiKeyInput(getApiKey(provider) || '');
    setSelectedModelInput(getSelectedModel(provider));
  };

  const handleSave = () => {
    if (validateApiKey(apiKey)) {
      onSave(apiKey, activeTab, selectedModel);
      onClose();
    }
  };

  if (!isOpen) return null;

  const isValid = validateApiKey(apiKey);
  const models = activeTab === 'gemini' ? GEMINI_MODELS : AGENT_PLATFORM_MODELS;
  const linkUrl = activeTab === 'gemini' 
    ? 'https://aistudio.google.com/apikey'
    : 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/api-keys';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-800">Cấu hình API Key</h2>
          </div>
          {hasApiKey() && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <button
              className={`flex-1 py-3 px-4 rounded-lg font-medium border-2 transition-colors ${
                activeTab === 'gemini'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('gemini')}
            >
              Gemini API
            </button>
            <button
              className={`flex-1 py-3 px-4 rounded-lg font-medium border-2 transition-colors ${
                activeTab === 'agent-platform'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('agent-platform')}
            >
              Agent Platform API
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    apiKey && isValid ? 'border-green-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập API key của bạn..."
                />
                {apiKey && isValid && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                Lấy API key tại:{' '}
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  đây <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn Model
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedModel === model.id
                        ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setSelectedModelInput(model.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{model.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{model.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedModel === model.id ? 'border-indigo-600' : 'border-gray-300'
                      }`}>
                        {selectedModel === model.id && (
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          {hasApiKey() && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Đóng
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              !isValid ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
}
