import React, { useState, useRef } from "react";
import { Upload, FileText, Send, Image as ImageIcon } from "lucide-react";

interface InputSectionProps {
  onSubmit: (text: string, imageBase64: string | null) => void;
  isLoading: boolean;
}

export function InputSection({ onSubmit, isLoading }: InputSectionProps) {
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension
        const MAX_DIMENSION = 1280;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG to save space, reducing payload size significantly
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setImageBase64(compressedBase64);
        } else {
          setImageBase64(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imageBase64) return;
    onSubmit(text, imageBase64);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
        }
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        Nhập Đề Bài Toán
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder="Nhập đề bài hình học vào đây, hoặc dán ảnh (Ctrl+V)..."
          className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all"
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
        >
          {imageBase64 ? (
            <div className="relative w-full max-w-xs mx-auto">
              <img src={imageBase64} alt="Đề bài" className="w-full h-auto rounded shadow-sm" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageBase64(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                &times;
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 text-center">
                <span className="font-semibold text-blue-600">Tải lên</span> hoặc Kéo thả ảnh đề bài vào đây
              </p>
              <p className="text-xs text-slate-400 mt-1">Hỗ trợ dán trực tiếp (Paste)</p>
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || (!text.trim() && !imageBase64)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang phân tích dữ liệu...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Phân tích Đề bài
            </>
          )}
        </button>
      </form>
    </div>
  );
}
