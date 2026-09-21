<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AI Geometry Studio

Hệ thống AI tự động phân tích đề bài toán hình học, dựng hình chính xác trên GeoGebra, và xuất LaTeX/TikZ chất lượng xuất bản.

## Tính năng chính

- 📷 **Nhập đề bài** — Text, ảnh chụp, paste, kéo thả
- 🤖 **AI Phân tích** — Gemini AI trích xuất dữ kiện hình học tự động
- 📐 **GeoGebra Render** — Hình 2D/3D chính xác, tương tác kéo xoay
- 📊 **Đồ thị hàm số** — Vẽ đồ thị bậc 3, bậc 4, phân thức
- 📥 **Xuất PNG** — 300 DPI nền trắng, sẵn sàng cho tài liệu
- 📝 **Xuất LaTeX** — TikZ/pgfplots sinh bởi AI, compile trực tiếp
- 🔄 **Chỉnh sửa tự nhiên** — Nhập lệnh tiếng Việt để cập nhật hình
- 🔑 **Tự nhập API Key** — Hỗ trợ Gemini API & Agent Platform API

## Chạy Local

**Yêu cầu:** Node.js ≥ 18

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env.local (tuỳ chọn — có thể nhập key từ giao diện)
echo 'GEMINI_API_KEY="your-api-key-here"' > .env.local

# 3. Chạy app
npm run dev
```

Mở http://localhost:3000

## API Key

Bạn có thể nhập API key từ giao diện app (nút **⚙️ Cấu hình API** trên header).

- **Gemini API Key**: https://aistudio.google.com/apikey
- **Agent Platform API Key**: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/api-keys

## Deploy lên Vercel

```bash
# Push code lên GitHub
git push origin main

# Kết nối repo với Vercel — app tự deploy
```

Cấu hình `vercel.json` đã có sẵn. Không cần thêm biến môi trường nếu người dùng tự nhập key từ UI.

## Model AI hỗ trợ

| Model | Vai trò |
|-------|---------|
| `gemini-3.6-flash` | Mặc định — nhanh, mạnh |
| `gemini-3.5-flash` | Dự phòng chất lượng cao |
| `gemini-3.5-flash-lite` | Nhanh, rẻ |
| `gemini-2.5-flash` | Dự phòng cuối |

## Cấu trúc dự án

```
├── api/                    # Vercel Serverless Functions
│   ├── parse-geometry.ts   # AI phân tích đề bài
│   └── generate-tikz.ts    # AI sinh mã TikZ
├── lib/
│   └── ai-client.ts        # Client factory + fallback chain
├── src/
│   ├── components/
│   │   ├── ApiKeyModal.tsx  # Modal cấu hình API
│   │   ├── Header.tsx       # Header + Settings
│   │   ├── InputSection.tsx # Nhập đề bài
│   │   ├── ReviewSection.tsx # Review dữ kiện
│   │   └── RenderSection.tsx # GeoGebra + TikZ
│   ├── lib/
│   │   └── api-key-store.ts # localStorage management
│   ├── App.tsx
│   ├── types.ts
│   └── main.tsx
├── server.ts               # Express dev server
├── vercel.json             # Vercel config
└── package.json
```

## License

MIT
