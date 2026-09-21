import React from "react";
import { GeometryDataModel } from "../types";
import { CheckCircle, Edit3, AlertTriangle } from "lucide-react";

interface ReviewSectionProps {
  data: GeometryDataModel;
  onConfirm: () => void;
  onEdit: (data: GeometryDataModel) => void;
}

export function ReviewSection({ data, onConfirm, onEdit }: ReviewSectionProps) {
  // We can provide a basic JSON editor or a structural editor.
  // For simplicity and robustness, we show a structured view with a raw JSON editor fallback.
  const [isEditing, setIsEditing] = React.useState(false);
  const [jsonText, setJsonText] = React.useState(JSON.stringify(data, null, 2));
  const [error, setError] = React.useState<string | null>(null);

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onEdit(parsed);
      setIsEditing(false);
      setError(null);
    } catch (e: any) {
      setError("JSON không hợp lệ: " + e.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          AI Đã Hiểu Đề (Human-in-the-loop)
        </h2>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => {
                setJsonText(JSON.stringify(data, null, 2));
                setIsEditing(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Chỉnh sửa
            </button>
          ) : (
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
              Lưu thay đổi
            </button>
          )}
        </div>
      </div>

      {data.uncertain_flags && data.uncertain_flags.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 text-sm">Cảnh báo dữ kiện chưa rõ ràng:</h4>
            <ul className="list-disc list-inside text-sm text-amber-700 mt-1">
              {data.uncertain_flags.map((flag, idx) => (
                <li key={idx}>{flag.description}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full h-96 p-3 font-mono text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider mb-2">Chế độ</h3>
              <p className="text-slate-800 font-medium">{data.mode}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider mb-2">Đối tượng ({data.objects.length})</h3>
              <ul className="space-y-1">
                {data.objects.map((obj) => (
                  <li key={obj.id} className="text-sm">
                    <span className="font-semibold text-blue-700">{obj.name}</span> <span className="text-slate-500">({obj.type})</span>
                    {obj.details && <span className="text-slate-600 ml-1">- {obj.details}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider mb-2">Quan hệ ({data.relations.length})</h3>
              <ul className="space-y-1">
                {data.relations.map((rel, idx) => (
                  <li key={idx} className="text-sm text-slate-700">
                    <span className="font-medium">{rel.type}</span>: {rel.objects.join(", ")} {rel.details && `(${rel.details})`}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider mb-2">Đo lường ({data.measurements.length})</h3>
              <ul className="space-y-1">
                {data.measurements.map((m, idx) => (
                  <li key={idx} className="text-sm text-slate-700">
                    <span className="font-medium">{m.type}</span> của {m.objects.join(", ")} = <span className="font-bold text-green-700">{m.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            {data.mode === "3D" && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider mb-2">Nét vẽ 3D</h3>
                <ul className="space-y-1">
                  {data.visibility?.map((v, idx) => (
                    <li key={idx} className="text-sm text-slate-700">
                      Cạnh {v.edgeId}: <span className={v.style === "dash" ? "text-slate-500 border-b border-dashed border-slate-500" : "font-semibold"}>{v.style === "dash" ? "Nét đứt" : "Nét liền"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={onConfirm}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors"
        >
          <CheckCircle className="w-5 h-5" />
          Xác nhận & Dựng hình
        </button>
      </div>
    </div>
  );
}
