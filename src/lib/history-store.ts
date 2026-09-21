import { HistoryEntry, GeometryDataModel } from '../types';

const HISTORY_KEY = 'geometry_studio_history';
const MAX_ENTRIES = 50;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: {
  inputText: string;
  inputImageThumb?: string;
  geometryData: GeometryDataModel;
  solution?: string;
  modelUsed?: string;
}): HistoryEntry {
  const history = getHistory();
  const newEntry: HistoryEntry = {
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    ...entry,
  };
  history.unshift(newEntry);
  // Keep only last MAX_ENTRIES
  if (history.length > MAX_ENTRIES) {
    history.splice(MAX_ENTRIES);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return newEntry;
}

export function deleteHistoryEntry(id: string): void {
  const history = getHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return getHistory().find(h => h.id === id);
}

// Create a small thumbnail from base64 image (resize to 80px)
export function createThumbnail(imageBase64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 80;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = imageBase64;
  });
}
