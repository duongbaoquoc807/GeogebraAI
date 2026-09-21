import React, { useState } from 'react';
import { BookOpen, Search, ChevronDown, ChevronUp, Zap, Star, Award } from 'lucide-react';

interface TemplateLibraryProps {
  onSelect: (promptText: string) => void;
  isCollapsed?: boolean;
}

const CATEGORIES = [
  { id: 'all', name: 'Tất cả', icon: '🌟' },
  { id: 'triangle', name: 'Tam giác', icon: '△' },
  { id: 'quadrilateral', name: 'Tứ giác', icon: '◇' },
  { id: 'circle', name: 'Đường tròn', icon: '○' },
  { id: 'solid_3d', name: 'Hình không gian', icon: '⬡' },
  { id: 'graph', name: 'Đồ thị hàm số', icon: '📈' },
  { id: 'coordinate', name: 'Hình tọa độ', icon: '📐' },
];

const TEMPLATES = [
  // Tam giác
  { category: 'triangle', title: 'Tam giác vuông', prompt: 'Cho tam giác ABC vuông tại A, AB = 3cm, AC = 4cm. Vẽ đường cao AH. Tính AH, BH, CH.', difficulty: 'basic' },
  { category: 'triangle', title: 'Tam giác đều', prompt: 'Cho tam giác đều ABC cạnh a = 6cm. Vẽ ba đường trung tuyến, xác định trọng tâm G.', difficulty: 'basic' },
  { category: 'triangle', title: 'Tam giác với đường tròn ngoại tiếp', prompt: 'Cho tam giác ABC có AB = 5, BC = 6, CA = 7. Vẽ đường tròn ngoại tiếp tam giác ABC, xác định tâm O và bán kính R.', difficulty: 'intermediate' },
  { category: 'triangle', title: 'Tam giác với đường phân giác', prompt: 'Cho tam giác ABC có AB = 8, AC = 6, BC = 10. Vẽ đường phân giác trong AD. Tính BD, DC.', difficulty: 'intermediate' },
  
  // Tứ giác
  { category: 'quadrilateral', title: 'Hình bình hành', prompt: 'Cho hình bình hành ABCD với AB = 5cm, BC = 3cm, góc B = 60°. Vẽ hai đường chéo AC và BD, xác định giao điểm O.', difficulty: 'basic' },
  { category: 'quadrilateral', title: 'Hình thoi', prompt: 'Cho hình thoi ABCD có AC = 8cm, BD = 6cm. Vẽ hình thoi và hai đường chéo.', difficulty: 'basic' },
  { category: 'quadrilateral', title: 'Hình thang cân', prompt: 'Cho hình thang cân ABCD (AB // CD) với AB = 10cm, CD = 6cm, AD = BC = 5cm. Vẽ hình và đường cao.', difficulty: 'intermediate' },
  
  // Đường tròn
  { category: 'circle', title: 'Đường tròn và tiếp tuyến', prompt: 'Cho đường tròn (O; R=4cm) và điểm A nằm ngoài đường tròn với OA = 8cm. Vẽ hai tiếp tuyến AB, AC từ A đến đường tròn.', difficulty: 'intermediate' },
  { category: 'circle', title: 'Hai đường tròn cắt nhau', prompt: 'Cho hai đường tròn (O₁; 3cm) và (O₂; 4cm) cắt nhau tại A và B, O₁O₂ = 5cm. Vẽ hai đường tròn và dây chung AB.', difficulty: 'advanced' },
  
  // Hình không gian 3D
  { category: 'solid_3d', title: 'Hình chóp tam giác đều', prompt: 'Cho hình chóp đều S.ABC có cạnh đáy a = 4cm, cạnh bên SA = 6cm. Vẽ hình chóp, đường cao SH.', difficulty: 'basic' },
  { category: 'solid_3d', title: 'Hình chóp tứ giác đều', prompt: 'Cho hình chóp đều S.ABCD có cạnh đáy a = 5cm, SA = 7cm. SA vuông góc mặt phẳng đáy. Vẽ hình chóp.', difficulty: 'basic' },
  { category: 'solid_3d', title: 'Lăng trụ đứng tam giác', prompt: 'Cho lăng trụ đứng ABC.A\'B\'C\' có đáy ABC là tam giác vuông tại A, AB = 3, AC = 4, AA\' = 5. Vẽ lăng trụ.', difficulty: 'intermediate' },
  { category: 'solid_3d', title: 'Lăng trụ đứng tứ giác', prompt: 'Cho hình hộp chữ nhật ABCD.A\'B\'C\'D\' với AB = 3, AD = 4, AA\' = 5. Vẽ hình hộp và đường chéo AG.', difficulty: 'intermediate' },
  { category: 'solid_3d', title: 'Hình chóp với mặt cắt', prompt: 'Cho hình chóp S.ABCD đáy hình vuông cạnh 4cm, SA vuông góc đáy, SA = 6cm. Gọi M, N lần lượt là trung điểm SB, SC. Vẽ thiết diện qua A, M, N.', difficulty: 'advanced' },
  
  // Đồ thị
  { category: 'graph', title: 'Hàm bậc 3', prompt: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số y = x³ - 3x² + 2', difficulty: 'basic' },
  { category: 'graph', title: 'Hàm bậc 4 trùng phương', prompt: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số y = x⁴ - 2x² + 1', difficulty: 'intermediate' },
  { category: 'graph', title: 'Hàm phân thức', prompt: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số y = (2x + 1)/(x - 1)', difficulty: 'intermediate' },
  { category: 'graph', title: 'Hàm trị tuyệt đối', prompt: 'Vẽ đồ thị hàm số y = |x² - 4|', difficulty: 'advanced' },
  
  // Tọa độ
  { category: 'coordinate', title: 'Phương trình đường thẳng', prompt: 'Trong mặt phẳng Oxy, cho A(1, 2), B(4, 6). Vẽ đường thẳng AB, tìm trung điểm M, vẽ đường trung trực.', difficulty: 'basic' },
  { category: 'coordinate', title: 'Phương trình đường tròn', prompt: 'Trong mặt phẳng Oxy, vẽ đường tròn (C): (x-2)² + (y-3)² = 16 và tiếp tuyến tại điểm A(2, 7).', difficulty: 'intermediate' },
];

const DIFFICULTY_MAP = {
  basic: { label: 'Cơ bản', color: 'bg-green-100 text-green-700', icon: Zap },
  intermediate: { label: 'Trung bình', color: 'bg-yellow-100 text-yellow-700', icon: Star },
  advanced: { label: 'Nâng cao', color: 'bg-red-100 text-red-700', icon: Award }
};

export default function TemplateLibrary({ onSelect, isCollapsed: initialCollapsed = false }: TemplateLibraryProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTemplates = TEMPLATES.filter(t => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
      <div 
        className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <BookOpen size={20} className="text-blue-600" />
          <h2>📚 Thư viện bài mẫu</h2>
        </div>
        <button className="text-gray-500 hover:text-gray-800 focus:outline-none">
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm mẫu bài toán..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-thin">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  activeCategory === cat.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
            {filteredTemplates.map((template, idx) => {
              const diffInfo = DIFFICULTY_MAP[template.difficulty as keyof typeof DIFFICULTY_MAP];
              const DiffIcon = diffInfo.icon;
              return (
                <div 
                  key={idx}
                  onClick={() => onSelect(template.prompt)}
                  className="border border-gray-200 rounded-md p-3 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white group flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{template.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {template.prompt}
                    </p>
                  </div>
                  <div className="mt-3 flex justify-start">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${diffInfo.color}`}>
                      <DiffIcon size={10} />
                      {diffInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {filteredTemplates.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-8 text-gray-500 text-sm">
                Không tìm thấy bài mẫu nào phù hợp.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
