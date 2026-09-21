import React, { useEffect, useRef, useState, useCallback } from "react";
import { GeometryDataModel, GeometryStyle, DEFAULT_STYLE, STYLE_PRESETS } from "../types";
import { AiProvider } from "../lib/api-key-store";
import { 
  Download, MousePointer2, CircleDot, Minus, MoveDiagonal, Trash2, 
  Loader2, Sparkles, Copy, CheckCheck, Palette, Ruler, Play, Pause, 
  SkipForward, RotateCcw, FileDown
} from "lucide-react";

declare global {
  interface Window {
    GGBApplet: any;
    ggbApplet: any;
  }
}

interface RenderSectionProps {
  data: GeometryDataModel;
  onUpdateData?: (newData: GeometryDataModel) => void;
  apiKey?: string;
  provider?: AiProvider;
  selectedModel?: string;
}

export function RenderSection({ data, onUpdateData, apiKey, provider, selectedModel }: RenderSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tikzCode, setTikzCode] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"render" | "tikz">("render");
  const [isGeneratingTikz, setIsGeneratingTikz] = useState(false);
  const [tikzCopied, setTikzCopied] = useState(false);

  // Style customization
  const [style, setStyle] = useState<GeometryStyle>(DEFAULT_STYLE);
  const [showStylePanel, setShowStylePanel] = useState(false);

  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [animPlaying, setAnimPlaying] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Commands for animation
  const commandsRef = useRef<string[]>([]);

  const hexToRgb01 = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const applyStyle = useCallback((api: any, currentStyle: GeometryStyle) => {
    try {
      const objNames = api.getAllObjectNames();
      const pc = hexToRgb01(currentStyle.pointColor);
      const lc = hexToRgb01(currentStyle.lineColor);

      objNames.forEach((obj: string) => {
        const type = api.getObjectType(obj);
        if (type === "polygon" || type === "polyhedron") {
          api.evalCommand(`SetFilling(${obj}, ${currentStyle.fillOpacity})`);
          api.evalCommand(`SetLineThickness(${obj}, ${currentStyle.lineThickness})`);
          api.setColor(obj, Math.round(lc.r * 255), Math.round(lc.g * 255), Math.round(lc.b * 255));
        } else if (type === "point") {
          api.setColor(obj, Math.round(pc.r * 255), Math.round(pc.g * 255), Math.round(pc.b * 255));
          api.evalCommand(`SetPointSize(${obj}, ${currentStyle.pointSize})`);
        } else if (type === "segment" || type === "line") {
          api.setColor(obj, Math.round(lc.r * 255), Math.round(lc.g * 255), Math.round(lc.b * 255));
          api.evalCommand(`SetLineThickness(${obj}, ${currentStyle.lineThickness})`);
        }
      });
    } catch (e) {
      console.error("Style apply error", e);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    setIsAnimating(false);
    setAnimStep(0);
    setAnimPlaying(false);
    if (animTimerRef.current) clearInterval(animTimerRef.current);

    const is3D = data.mode === "3D";
    let commands: string[] = [];

    const generateCommands = () => {
      if (data.geogebra_commands && data.geogebra_commands.length > 0) {
        commands.push(...data.geogebra_commands);
        return;
      }

      let x = 0, y = 0;
      const segmentsCreated = new Set<string>();

      data.objects.filter(o => o.type === "point").forEach((p) => {
        if (p.coordinates && p.coordinates.length > 0) {
          commands.push(`${p.id} = (${p.coordinates.join(", ")})`);
        } else {
          if (is3D) {
            commands.push(`${p.id} = (${x}, ${y}, ${p.id === 'S' ? 5 : 0})`);
          } else {
            commands.push(`${p.id} = (${x}, ${y})`);
          }
          x += 2;
          if (x > 4) { x = 0; y += 2; }
        }
        commands.push(`SetCaption(${p.id}, "${p.name}")`);
        commands.push(`SetLabelMode(${p.id}, 3)`);
        commands.push(`SetPointSize(${p.id}, ${style.pointSize})`);
      });

      data.objects.filter(o => o.type === "segment").forEach(l => {
        let p1, p2, idToUse = l.id;
        if (l.name.trim().length === 2) { p1 = l.name[0]; p2 = l.name[1]; idToUse = l.name; }
        else if (l.id.length === 2) { p1 = l.id[0]; p2 = l.id[1]; }
        if (p1 && p2) {
          commands.push(`${idToUse} = Segment(${p1}, ${p2})`);
          commands.push(`SetCaption(${idToUse}, "")`);
          segmentsCreated.add(idToUse);
          segmentsCreated.add(p2 + p1);
        }
      });

      data.objects.filter(o => o.type === "polygon").forEach(poly => {
        const pts = poly.name.replace(/[^A-Za-z0-9]/g, '');
        if (pts.length >= 3) {
          commands.push(`${poly.id} = Polygon(${pts.split('').join(", ")})`);
        }
      });

      data.relations.forEach(rel => {
        if (rel.type === "midpoint" && rel.objects.length >= 2) {
          const mid = rel.objects[0];
          const seg = rel.objects[1];
          if (seg.length === 2) {
            commands.push(`${mid} = Midpoint(${seg[0]}, ${seg[1]})`);
            commands.push(`SetLabelMode(${mid}, 3)`);
            commands.push(`SetPointSize(${mid}, ${style.pointSize})`);
          }
        }
      });

      data.measurements.forEach((m, idx) => {
        if (m.type === "angle" && m.objects.length === 1 && m.objects[0].length === 3) {
          const ang = m.objects[0];
          commands.push(`ang${idx} = Angle(${ang[0]}, ${ang[1]}, ${ang[2]})`);
        }
      });

      if (is3D && data.visibility) {
        data.visibility.forEach(v => {
          const edgeId = v.edgeId;
          if (edgeId.length === 2 && !segmentsCreated.has(edgeId) && !segmentsCreated.has(edgeId[1] + edgeId[0])) {
            commands.push(`${edgeId} = Segment(${edgeId[0]}, ${edgeId[1]})`);
            commands.push(`SetCaption(${edgeId}, "")`);
            segmentsCreated.add(edgeId);
            segmentsCreated.add(edgeId[1] + edgeId[0]);
          }
        });
      }
    };

    generateCommands();
    commandsRef.current = commands;

    const parameters = {
      id: "ggbApplet",
      width: 800,
      height: 600,
      showToolBar: true,
      showAlgebraInput: false,
      showMenuBar: false,
      useBrowserForJS: false,
      enableLabelDrags: true,
      enableShiftDragZoom: true,
      showZoomButtons: true,
      errorDialogsActive: false,
      appName: is3D ? "3d" : "geometry",
      appletOnLoad: (api: any) => {
        if (data.show_axes) {
          api.evalCommand("ShowAxes(true)");
          api.evalCommand("ShowGrid(false)");
          if (!is3D) api.evalCommand("SetAxesRatio(1, 1)");
        } else {
          api.evalCommand("ShowAxes(false)");
          api.evalCommand("ShowGrid(false)");
        }
        if (is3D) {
          api.evalCommand("SetVisibleInView(xOyPlane, -1, false)");
          if (!data.show_axes) {
            api.evalCommand("SetVisibleInView(xAxis, -1, false)");
            api.evalCommand("SetVisibleInView(yAxis, -1, false)");
            api.evalCommand("SetVisibleInView(zAxis, -1, false)");
          }
        }
        api.evalCommand("SetBackgroundColor(1, 1, 1)");

        commands.forEach(cmd => {
          try { api.evalCommand(cmd); } catch (e) { console.error("GGB Error:", cmd, e); }
        });

        setTimeout(() => applyStyle(api, style), 200);
        generateBasicTikz();
      }
    };

    const applet = new window.GGBApplet(parameters, "5.0");
    applet.inject(containerRef.current);

    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, [data]);

  // Re-apply style when it changes
  useEffect(() => {
    if (window.ggbApplet) {
      applyStyle(window.ggbApplet, style);
    }
  }, [style, applyStyle]);

  // Animation controls
  const startAnimation = () => {
    if (!window.ggbApplet || commandsRef.current.length === 0) return;
    const api = window.ggbApplet;

    // Reset: remove all objects
    try {
      const names = api.getAllObjectNames();
      names.forEach((n: string) => { try { api.deleteObject(n); } catch {} });
    } catch {}

    setIsAnimating(true);
    setAnimStep(0);
    setAnimPlaying(true);

    let step = 0;
    const cmds = commandsRef.current;

    animTimerRef.current = setInterval(() => {
      if (step >= cmds.length) {
        if (animTimerRef.current) clearInterval(animTimerRef.current);
        setAnimPlaying(false);
        setTimeout(() => applyStyle(api, style), 100);
        return;
      }
      try { api.evalCommand(cmds[step]); } catch {}
      step++;
      setAnimStep(step);
    }, 600);
  };

  const pauseAnimation = () => {
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    setAnimPlaying(false);
  };

  const stepForward = () => {
    if (!window.ggbApplet || animStep >= commandsRef.current.length) return;
    try { window.ggbApplet.evalCommand(commandsRef.current[animStep]); } catch {}
    setAnimStep(prev => prev + 1);
  };

  const resetAnimation = () => {
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    setIsAnimating(false);
    setAnimStep(0);
    setAnimPlaying(false);
    // Re-render full
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      const is3D = data.mode === "3D";
      const params = {
        id: "ggbApplet", width: 800, height: 600, showToolBar: true,
        showAlgebraInput: false, showMenuBar: false, useBrowserForJS: false,
        enableLabelDrags: true, enableShiftDragZoom: true, showZoomButtons: true,
        errorDialogsActive: false, appName: is3D ? "3d" : "geometry",
        appletOnLoad: (api: any) => {
          if (data.show_axes) { api.evalCommand("ShowAxes(true)"); api.evalCommand("ShowGrid(false)"); }
          else { api.evalCommand("ShowAxes(false)"); api.evalCommand("ShowGrid(false)"); }
          if (is3D) { api.evalCommand("SetVisibleInView(xOyPlane, -1, false)"); }
          api.evalCommand("SetBackgroundColor(1, 1, 1)");
          commandsRef.current.forEach(cmd => { try { api.evalCommand(cmd); } catch {} });
          setTimeout(() => applyStyle(api, style), 200);
        }
      };
      new window.GGBApplet(params, "5.0").inject(containerRef.current);
    }
  };

  const generateBasicTikz = () => {
    let tikz = "% LaTeX TikZ Code generated by AI Geometry Studio\n";
    if (data.mode === "3D") {
      tikz += "\\usepackage{tikz-3dplot}\n\\tdplotsetmaincoords{70}{110}\n\\begin{tikzpicture}[tdplot_main_coords]\n";
    } else {
      tikz += "\\begin{tikzpicture}\n";
    }
    let fx = 0, fy = 0;
    data.objects.filter(o => o.type === "point").forEach(p => {
      const c = p.coordinates?.join(", ") || (data.mode === "3D" ? `${fx}, ${fy}, ${p.id === 'S' ? 5 : 0}` : `${fx}, ${fy}`);
      if (!p.coordinates) { fx += 2; if (fx > 4) { fx = 0; fy += 2; } }
      tikz += `  \\coordinate (${p.id}) at (${c});\n  \\filldraw (${p.id}) circle (1.5pt) node[anchor=north] {$${p.name}$};\n`;
    });
    data.objects.filter(o => o.type === "segment").forEach(s => {
      let p1, p2;
      if (s.name.trim().length === 2) { p1 = s.name[0]; p2 = s.name[1]; }
      else if (s.id.length >= 2) { p1 = s.id[0]; p2 = s.id[1]; }
      if (p1 && p2) {
        let st = "";
        if (data.mode === "3D" && data.visibility) {
          const v = data.visibility.find(v => v.edgeId === p1! + p2! || v.edgeId === p2! + p1!);
          if (v?.style === "dash") st = "[dashed]";
        }
        tikz += `  \\draw${st} (${p1}) -- (${p2});\n`;
      }
    });
    if (data.mode === "3D" && data.visibility) {
      data.visibility.forEach(v => {
        if (v.edgeId.length === 2) {
          const [p1, p2] = [v.edgeId[0], v.edgeId[1]];
          const exists = data.objects.some(o => o.type === "segment" && (o.name.includes(p1 + p2) || o.name.includes(p2 + p1) || o.id === p1 + p2 || o.id === p2 + p1));
          if (!exists) tikz += `  \\draw${v.style === "dash" ? "[dashed]" : ""} (${p1}) -- (${p2});\n`;
        }
      });
    }
    tikz += "\\end{tikzpicture}\n";
    setTikzCode(tikz);
  };

  const handleGenerateAiTikz = async () => {
    if (!apiKey) return;
    setIsGeneratingTikz(true);
    try {
      const res = await fetch("/api/generate-tikz", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey || "", "x-ai-provider": provider || "gemini", "x-ai-model": selectedModel || "gemini-3.6-flash" },
        body: JSON.stringify({ geometryData: data }),
      });
      const result = await res.json();
      if (result.success && result.tikzCode) setTikzCode(result.tikzCode);
      else alert("Lỗi tạo TikZ: " + (result.error || "Unknown error"));
    } catch (e: any) { alert("Lỗi: " + e.message); }
    finally { setIsGeneratingTikz(false); }
  };

  const handleDownloadPNG = () => {
    if (window.ggbApplet) {
      const base64 = window.ggbApplet.getPNGBase64(2, false, 300);
      const link = document.createElement("a");
      link.download = "geometry.png";
      link.href = "data:image/png;base64," + base64;
      link.click();
    }
  };

  const handleExportPDF = () => {
    if (!window.ggbApplet) return;
    const pngBase64 = window.ggbApplet.getPNGBase64(2, false, 200);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>AI Geometry Studio - Export</title>
      <style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px}
      img{max-width:100%;border:1px solid #ddd;border-radius:8px}
      h1{color:#1e40af}pre{background:#f1f5f9;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto}
      .btn{background:#1e40af;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;margin:8px 4px}
      @media print{.no-print{display:none}}</style></head><body>
      <div class="no-print"><button class="btn" onclick="window.print()">🖨️ In / Lưu PDF</button></div>
      <h1>📐 AI Geometry Studio</h1>
      <h2>Hình vẽ</h2>
      <img src="data:image/png;base64,${pngBase64}" alt="Geometry" />
      ${tikzCode ? `<h2>Mã LaTeX / TikZ</h2><pre>${tikzCode.replace(/</g, '&lt;')}</pre>` : ''}
      </body></html>`);
    w.document.close();
  };

  const setGeoGebraMode = (mode: number) => { if (window.ggbApplet) window.ggbApplet.setMode(mode); };

  const copyTikz = () => {
    navigator.clipboard.writeText(tikzCode);
    setTikzCopied(true);
    setTimeout(() => setTikzCopied(false), 2000);
  };

  const [nlCommand, setNlCommand] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateNL = async () => {
    if (!nlCommand.trim()) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/parse-geometry", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey || "", "x-ai-provider": provider || "gemini", "x-ai-model": selectedModel || "gemini-3.6-flash" },
        body: JSON.stringify({ text: `Dựa trên dữ kiện cũ: ${JSON.stringify(data)}\nHãy thực hiện yêu cầu sau và trả về JSON mới: ${nlCommand}` }),
      });
      const result = await res.json();
      if (result.success && onUpdateData) { onUpdateData(result.data); setNlCommand(""); }
      else alert("Có lỗi: " + result.error);
    } catch (e: any) { alert("Lỗi: " + e.message); }
    finally { setIsUpdating(false); }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-8">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4 flex-wrap gap-2">
        <div className="flex gap-4">
          <button onClick={() => setActiveTab("render")} className={`font-semibold text-lg pb-2 transition-colors border-b-2 ${activeTab === "render" ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-700"}`}>
            Tương tác Hình học
          </button>
          <button onClick={() => setActiveTab("tikz")} className={`font-semibold text-lg pb-2 transition-colors border-b-2 ${activeTab === "tikz" ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-700"}`}>
            Mã TikZ / LaTeX
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeTab === "render" && (
            <>
              <button onClick={() => setShowStylePanel(!showStylePanel)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showStylePanel ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                <Palette className="w-4 h-4" /> Màu sắc
              </button>
              <button onClick={handleDownloadPNG} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> PNG
              </button>
              <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                <FileDown className="w-4 h-4" /> PDF
              </button>
            </>
          )}
          {activeTab === "tikz" && (
            <>
              <button onClick={handleGenerateAiTikz} disabled={isGeneratingTikz || !apiKey} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {isGeneratingTikz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGeneratingTikz ? "Đang tạo..." : "Tạo LaTeX (AI)"}
              </button>
              <button onClick={copyTikz} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                {tikzCopied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {tikzCopied ? "Đã sao chép!" : "Sao chép"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Style panel */}
      {showStylePanel && activeTab === "render" && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">🎨 Tuỳ chỉnh Kiểu hình vẽ</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {STYLE_PRESETS.map((preset, i) => (
              <button key={i} onClick={() => setStyle(preset.style)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${JSON.stringify(style) === JSON.stringify(preset.style) ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                {preset.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Điểm <input type="color" value={style.pointColor} onChange={e => setStyle({ ...style, pointColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Đường <input type="color" value={style.lineColor} onChange={e => setStyle({ ...style, lineColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Nổi bật <input type="color" value={style.highlightColor} onChange={e => setStyle({ ...style, highlightColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Nét đứt <input type="color" value={style.dashColor} onChange={e => setStyle({ ...style, dashColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="text-xs text-slate-600">
              Độ dày nét ({style.lineThickness})
              <input type="range" min="1" max="8" value={style.lineThickness} onChange={e => setStyle({ ...style, lineThickness: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="text-xs text-slate-600">
              Cỡ điểm ({style.pointSize})
              <input type="range" min="2" max="8" value={style.pointSize} onChange={e => setStyle({ ...style, pointSize: Number(e.target.value) })} className="w-full" />
            </label>
          </div>
        </div>
      )}

      {/* NL command */}
      <div className="mb-4 flex gap-2">
        <input type="text" value={nlCommand} onChange={e => setNlCommand(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateNL()}
          placeholder="Nhập lệnh tự nhiên (VD: Đổi AH thành nét đứt, thêm trung điểm M của BC)..."
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
        <button onClick={handleUpdateNL} disabled={isUpdating || !nlCommand.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors text-sm">
          {isUpdating ? "..." : "Cập nhật"}
        </button>
      </div>

      {/* Render tab */}
      <div className={activeTab === "render" ? "block" : "hidden"}>
        {/* Toolbar */}
        <div className="flex gap-1.5 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200 flex-wrap">
          <button onClick={() => setGeoGebraMode(0)} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1 text-xs font-medium transition-colors" title="Di chuyển">
            <MousePointer2 className="w-4 h-4" /> Di chuyển
          </button>
          <button onClick={() => setGeoGebraMode(1)} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1 text-xs font-medium transition-colors" title="Điểm">
            <CircleDot className="w-4 h-4" /> Điểm
          </button>
          <button onClick={() => setGeoGebraMode(15)} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1 text-xs font-medium transition-colors" title="Đoạn">
            <Minus className="w-4 h-4" /> Đoạn
          </button>
          <button onClick={() => setGeoGebraMode(2)} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1 text-xs font-medium transition-colors" title="Đường thẳng">
            <MoveDiagonal className="w-4 h-4" /> Đường thẳng
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
          <button onClick={() => setGeoGebraMode(40)} className="px-2.5 py-1.5 hover:bg-blue-100 rounded text-blue-700 flex items-center gap-1 text-xs font-medium transition-colors" title="Đo khoảng cách">
            <Ruler className="w-4 h-4" /> Khoảng cách
          </button>
          <button onClick={() => setGeoGebraMode(36)} className="px-2.5 py-1.5 hover:bg-blue-100 rounded text-blue-700 flex items-center gap-1 text-xs font-medium transition-colors" title="Đo góc">
            📐 Góc
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
          <button onClick={() => setGeoGebraMode(5)} className="px-2.5 py-1.5 hover:bg-red-100 rounded text-red-600 flex items-center gap-1 text-xs font-medium transition-colors" title="Xóa">
            <Trash2 className="w-4 h-4" /> Xóa
          </button>
        </div>

        {/* Animation controls */}
        <div className="flex items-center gap-2 mb-4 bg-amber-50 p-2 rounded-lg border border-amber-200">
          <span className="text-xs font-semibold text-amber-800 mr-2">🎬 Animation:</span>
          {!isAnimating ? (
            <button onClick={startAnimation} className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-medium transition-colors">
              <Play className="w-3 h-3" /> Bắt đầu
            </button>
          ) : (
            <>
              {animPlaying ? (
                <button onClick={pauseAnimation} className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-medium transition-colors">
                  <Pause className="w-3 h-3" /> Dừng
                </button>
              ) : (
                <button onClick={() => { setAnimPlaying(true); startAnimation(); }} className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-medium transition-colors">
                  <Play className="w-3 h-3" /> Tiếp tục
                </button>
              )}
              <button onClick={stepForward} disabled={animStep >= commandsRef.current.length} className="flex items-center gap-1 px-3 py-1 bg-white border border-amber-300 text-amber-700 rounded text-xs font-medium transition-colors disabled:opacity-50">
                <SkipForward className="w-3 h-3" /> Bước tiếp
              </button>
              <button onClick={resetAnimation} className="flex items-center gap-1 px-3 py-1 bg-white border border-amber-300 text-amber-700 rounded text-xs font-medium transition-colors">
                <RotateCcw className="w-3 h-3" /> Từ đầu
              </button>
              <span className="text-xs text-amber-600 ml-2">
                Bước {animStep}/{commandsRef.current.length}
              </span>
            </>
          )}
        </div>

        <div ref={containerRef} className="w-full h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
          <span className="text-slate-400">Đang tải GeoGebra...</span>
        </div>
      </div>

      {/* TikZ tab */}
      <div className={activeTab === "tikz" ? "block" : "hidden"}>
        <textarea readOnly value={tikzCode} className="w-full h-[600px] p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none resize-none" />
      </div>
    </div>
  );
}
