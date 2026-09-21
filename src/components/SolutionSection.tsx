import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, Copy, CheckCheck, BookOpen, Lightbulb } from 'lucide-react';
// @ts-ignore
import { AiProvider } from '../lib/api-key-store';
// @ts-ignore
import { SolutionData } from '../types';

interface SolutionSectionProps {
  problemText: string;
  geometryDataJson: string; // JSON string of GeometryDataModel
  apiKey: string;
  provider: AiProvider;
  selectedModel: string;
}

export function SolutionSection({
  problemText,
  geometryDataJson,
  apiKey,
  provider,
  selectedModel,
}: SolutionSectionProps) {
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const handleSolve = async () => {
    if (!apiKey) {
      setError('Vui lòng nhập API Key để sử dụng tính năng này.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSolution(null);
    
    try {
      let geometryData = {};
      try {
        if (geometryDataJson) {
          geometryData = JSON.parse(geometryDataJson);
        }
      } catch (e) {
        console.warn('Failed to parse geometryDataJson', e);
      }

      const response = await fetch('/api/solve-problem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-ai-provider': provider,
          'x-ai-model': selectedModel,
        },
        body: JSON.stringify({
          problemText,
          geometryData,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Đã xảy ra lỗi khi giải bài toán');
      }
      
      setSolution(result.data);
      
      // Expand all steps initially
      const initialExpanded: Record<number, boolean> = {};
      if (result.data?.steps) {
        result.data.steps.forEach((step: any, idx: number) => {
          initialExpanded[idx] = true;
        });
      }
      setExpandedSteps(initialExpanded);
      
    } catch (err: any) {
      setError(err.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (solution?.solution_text) {
      navigator.clipboard.writeText(solution.solution_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Giải chi tiết
        </h2>
        <button
          onClick={handleSolve}
          disabled={loading || !problemText?.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Calculator className="w-5 h-5" />
          )}
          {loading ? 'Đang giải...' : 'Giải bài toán'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {solution && (
        <div className="flex flex-col gap-6 mt-4">
          <div className="space-y-4">
            {solution.steps?.map((step: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div 
                  className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => toggleStep(index)}
                >
                  <div className="flex items-center gap-3 font-medium text-gray-800">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {step.step_number || index + 1}
                    </span>
                    {step.title}
                  </div>
                  {expandedSteps[index] ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </div>
                
                {expandedSteps[index] && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-3">
                      {step.content}
                    </div>
                    {step.formula && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded text-blue-800 font-mono text-sm overflow-x-auto">
                        {step.formula}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {solution.formulas && solution.formulas.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5" />
                Công thức sử dụng
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-amber-900 font-mono text-sm">
                {solution.formulas.map((formula: string, idx: number) => (
                  <li key={idx}>{formula}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-5 shadow-sm">
            <h3 className="font-bold text-green-800 text-lg mb-2">Kết quả</h3>
            <div className="text-green-900 text-lg font-medium whitespace-pre-wrap">
              {solution.answer}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition border border-gray-200"
            >
              {copied ? (
                <>
                  <CheckCheck className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Chép lời giải
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
