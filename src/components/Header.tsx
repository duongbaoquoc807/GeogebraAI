import React from 'react';
import { Compass, Settings } from 'lucide-react';
import { AiProvider } from '../lib/api-key-store';

interface HeaderProps {
  currentModel: string;
  provider: AiProvider;
  hasKey: boolean;
  onOpenSettings: () => void;
}

export default function Header({ currentModel, provider, hasKey, onOpenSettings }: HeaderProps) {
  const getProviderName = () => {
    return provider === 'gemini' ? 'Gemini API' : 'Agent Platform';
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">AI Geometry Studio</h1>
              <p className="text-xs text-gray-500">Giải pháp Dựng hình Thông minh cho Giáo viên Toán</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {hasKey && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {currentModel} ({getProviderName()})
              </div>
            )}
            
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                hasKey
                  ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              {hasKey ? 'Cấu hình API' : 'Lấy API key để sử dụng app'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
