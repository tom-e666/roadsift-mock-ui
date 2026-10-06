# Bàn giao cho agent tiếp theo

## Mục tiêu và ranh giới

Đây là **repo mới, độc lập** để deploy Vercel: frontend React + Vite, không backend. UI theo Apple/macOS skill trong `.agents/skills/macos-design/`. Không tiếp tục sửa UI của repo P-021. Không kết nối API hoặc đưa dữ liệu thật vào prototype nếu chưa được yêu cầu.

## Đã có

- Core UI: sidebar collapse/mobile drawer, toolbar, light/dark, command palette (Ctrl/Cmd K), notifications, toast, modal/detail sheet, focus trapping, tables/cards, forms, segmented controls, badges, metrics, responsive CSS, reduced-motion support.
- Mock data: `src/data.js` gồm datasets, frames, mining runs, evaluation metrics; `public/samples/` có 6 cảnh đường phố SVG tự tạo.
- 12 màn: Datasets, Data Explorer, Lineage, Video Mining, Mining History, Label Editor, Training, Model Metrics, PAL Workbench, Settings, System Status, Documentation.
- Tương tác local: tìm kiếm/lọc/grid-list, xem chi tiết, import metadata demo, export JSON, chọn/review frame, vẽ/xóa/save bounding boxes, simulated mining/training/PAL, theme/preferences/reset demo.
- Mô tả flow và limitations trên UI; dữ liệu và các tác vụ mô phỏng có demo label.
- `vercel.json` cấu hình build và SPA routes. Không cần env vars.

## File chính

`src/App.jsx`: routing, shell, local state, theme; `src/Pages.jsx`: các màn; `src/components/UI.jsx`: primitives; `src/components/CommandPalette.jsx`: tìm workspace; `src/styles.css`: design system; `src/data.js`: fixtures.

## Agent tiếp theo cần làm

1. Đọc `AGENTS.md` và skill macOS trước khi thay UI.
2. Chạy `npm install`, `npm run dev`; đọc `VALIDATION.md` để biết kiểm tra đã chạy.
3. Visual QA đầy đủ 12 màn ở desktop/mobile, light/dark; chỉnh spacing/overflow/contrast theo kết quả thực tế. Không coi việc build pass là visual QA.
4. Kiểm tra accessibility/focus, keyboard navigation, modal stack, annotation pointer coordinates, persistence/reload/reset.
5. Nâng cấp lineage thành graph cho toàn bộ fixture catalog. Hiện graph chỉ minh họa chuỗi ba dataset đầu.
6. Explorer đang dùng cùng 24 sample frames cho mọi dataset; review và frame selection ở session state. Nếu cần demo sâu hơn, tạo fixture mapping và persistence nhất quán.
7. Training/mining/PAL dùng timer UI; chuyển trang sẽ dừng simulation. Có thể đưa job state lên App để tiếp tục khi đổi màn. Learning chart hiện là curve minh họa cố định (20 epochs), không benchmark thực.
8. Label editor đã vẽ/xóa/select box và save local; chưa có resize/move box, undo/redo, hotkeys nâng cao.
9. Chỉ push/deploy khi người dùng trực tiếp yêu cầu. Không đã-deploy nếu mới build local.

## Hướng dẫn push

```powershell
cd C:\AI\vinai20k\roadsift-mock-ui
git remote add origin https://github.com/<USERNAME>/roadsift-mock-ui.git
git push -u origin mock-ui
```

Tạo GitHub repository rỗng trước (không tự thêm README/license/gitignore). Trên Vercel import repo, chọn branch `mock-ui`, framework Vite, output `dist`, build `npm run build`.
