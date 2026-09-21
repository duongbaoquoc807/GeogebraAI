import React, { useState, useEffect } from 'react';
import { X, Clock, Trash2, RotateCcw, FileText } from 'lucide-react';
import { HistoryEntry, GeometryDataModel } from '../types';
import { getHistory, deleteHistoryEntry, clearHistory } from '../lib/history-store';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return new Date(timestamp).toLocaleDateString('vi-VN');
}

export default function HistoryPanel({ isOpen, onClose, onRestore }: HistoryPanelProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const loadHistory = () => {
    setEntries(getHistory() || []);
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    loadHistory();
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả lịch sử?')) {
      clearHistory();
      loadHistory();
    }
  };

  return (
    <>
      {/* Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <Clock size={20} className="text-blue-600" />
            <h2 className="text-lg">📋 Lịch sử bài đã vẽ</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
              <FileText size={48} className="text-gray-300" />
              <p className="text-center text-sm">Chưa có lịch sử.<br/>Hãy phân tích một đề bài toán!</p>
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white flex flex-col gap-2">
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {entry.thumbnail ? (
                      <img src={entry.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">📐</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <p className="text-sm text-gray-800 line-clamp-2 leading-tight" title={entry.inputText}>
                      {entry.inputText || 'Không có nội dung đề bài'}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock size={10} />
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                      <div className="flex gap-1">
                        {entry.mode && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">
                            {entry.mode}
                          </span>
                        )}
                        {entry.model && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px]">
                            {entry.model}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      onRestore(entry);
                      onClose();
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded transition-colors"
                  >
                    <RotateCcw size={14} />
                    Mở lại
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors flex items-center justify-center"
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {entries.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClearAll}
              className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 text-red-600 bg-white hover:bg-red-50 text-sm font-medium rounded-md transition-colors"
            >
              <Trash2 size={16} />
              Xóa tất cả
            </button>
          </div>
        )}
      </div>
    </>
  );
}
