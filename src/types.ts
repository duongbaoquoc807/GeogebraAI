export interface GeometricObject {
  id: string;
  type: string;
  name: string;
  details?: string;
  coordinates?: number[];
}

export interface GeometricRelation {
  type: string;
  objects: string[];
  details?: string;
}

export interface GeometricMeasurement {
  type: string;
  objects: string[];
  value: string;
}

export interface GeometricVisibility {
  edgeId: string;
  style: "dash" | "solid" | string;
}

export interface UncertainFlag {
  description: string;
}

export interface GeometryDataModel {
  mode: "2D" | "3D";
  objects: GeometricObject[];
  relations: GeometricRelation[];
  measurements: GeometricMeasurement[];
  visibility: GeometricVisibility[];
  uncertain_flags: UncertainFlag[];
  geogebra_commands?: string[];
  show_axes?: boolean;
}

// --- AI Provider & Configuration Types ---

export type AiProvider = 'gemini' | 'agent-platform';

export type StepStatus = 'pending' | 'loading' | 'done' | 'error' | 'stopped';

export interface StepState {
  status: StepStatus;
  label: string;
  error?: string;
  modelUsed?: string;
}

export interface ApiCallResult {
  success: boolean;
  data?: GeometryDataModel;
  tikzCode?: string;
  error?: string;
  errorType?: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

// --- Template Types ---

export interface TemplateItem {
  id: string;
  category: TemplateCategory;
  title: string;
  description: string;
  prompt: string;
  icon: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export type TemplateCategory = 
  | 'triangle'
  | 'quadrilateral'
  | 'circle'
  | 'solid_3d'
  | 'graph'
  | 'coordinate';

export interface TemplateCategoryInfo {
  id: TemplateCategory;
  name: string;
  icon: string;
}

// --- History Types ---

export interface HistoryEntry {
  id: string;
  timestamp: number;
  inputText: string;
  inputImageThumb?: string; // small base64 thumbnail
  geometryData: GeometryDataModel;
  solution?: string;
  modelUsed?: string;
}

// --- Solution Types ---

export interface SolutionData {
  solution_text: string;
  steps: SolutionStep[];
  formulas: string[];
  answer: string;
}

export interface SolutionStep {
  step_number: number;
  title: string;
  content: string;
  formula?: string;
}

// --- Style/Color Types ---

export interface GeometryStyle {
  pointColor: string;
  lineColor: string;
  highlightColor: string;
  dashColor: string;
  fillOpacity: number;
  lineThickness: number;
  pointSize: number;
}

export const DEFAULT_STYLE: GeometryStyle = {
  pointColor: '#000000',
  lineColor: '#000000',
  highlightColor: '#e63946',
  dashColor: '#6b7280',
  fillOpacity: 0,
  lineThickness: 3,
  pointSize: 4,
};

export const STYLE_PRESETS: { name: string; style: GeometryStyle }[] = [
  {
    name: 'Chuẩn (Đen trắng)',
    style: DEFAULT_STYLE,
  },
  {
    name: 'Sách giáo khoa',
    style: { ...DEFAULT_STYLE, highlightColor: '#1d4ed8', lineColor: '#1e293b' },
  },
  {
    name: 'Màu sắc nổi bật',
    style: { ...DEFAULT_STYLE, pointColor: '#dc2626', lineColor: '#1d4ed8', highlightColor: '#f59e0b', dashColor: '#9333ea' },
  },
  {
    name: 'Tối giản xám',
    style: { ...DEFAULT_STYLE, pointColor: '#374151', lineColor: '#6b7280', highlightColor: '#374151', dashColor: '#d1d5db' },
  },
];
