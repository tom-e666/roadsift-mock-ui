# RoadSift mock UI

An independent, frontend-only RoadSift prototype with an Apple-inspired interface. It uses React + Vite, bundled SVG sample scenes, and local browser state. **No backend is required.** All datasets, metrics, mining, training, and active-learning results are demo fixtures or explicit simulations.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5175. Build with `npm run build`; serve the production build with `npm run preview`.

## Deploy to Vercel

Import this repository into Vercel. Choose the **Vite** framework preset, build command `npm run build`, and output directory `dist`. No environment variables are required. `vercel.json` handles direct SPA route loading.

## Screens

Datasets, Data Explorer, Lineage, Video Mining, Mining History, Label Editor, Training, Model Metrics, PAL Workbench, Settings, System Status, and Documentation share one design system. Dataset search/filter/view switching, detail sheets, metadata-only demo imports, selection/review, annotation boxes, simulated jobs, theme switching, navigation, and preferences work locally.

Keyboard shortcuts: `Ctrl / Cmd + K` opens workspace search; arrow keys and Enter navigate; Escape dismisses dialogs; `Ctrl / Cmd + backslash` toggles the sidebar.

Demo imports read file names and sizes only and do not upload files or parse dataset contents. Persistent demo preferences and catalog changes live only in this browser's localStorage. Reset sample data in Settings.

## Agent skill

`.agents/skills/macos-design/` contains the complete macOS UI skill from https://github.com/ceorkm/macos-design-skill. See `AGENTS.md` for agent guidance.

## Pipeline Definitions preview

`/pipelines` is the compact definition registry; `/pipelines/:id` opens a full-canvas editor with graph pan/zoom, Fit View, a contextual stage inspector, version history, and validation. Published definitions are immutable; create a draft version to edit dependencies and implementations, then validate and publish it locally. `/mining` remains the existing Selection Launchpad (with a reference to its bundled definition); `/history` remains the Runs list and detail views. All custom definitions are **design-only** and are not executed by the current worker. Demo changes live in localStorage, not the production RoadSift database.


## Visual theme: Midnight Navy

The RoadSift Dark appearance uses shared semantic tokens in `src/styles.css`, with `--bg: #0D111A`, `--surface: #171D2A`, `--surface-elevated: #222D3D`, `--line: #334155`, `--accent: #268DFF`, and `--status-success: #31C48D`. Use `--accent-action` for blue buttons with white text to preserve readable contrast. The existing Light appearance is unchanged. Pipeline stage hues are centralized as `--stage-*` tokens; do not hardcode stage colors into components. Apply colors by **semantic role**, not page identity, and never use success-green icons to imply a definition stage has executed.

## Launchpad, Runs and Curation Workspace

- **Pipeline Editor** (`/pipelines/:id`): immutable published versions; edit graph topology, implementation and stage defaults only in a new draft version.
- **Launchpad** (`/mining`): launch-time Pool Snapshot, target EXACT-N, registered prediction model and compatible executor. Stage implementation, scoring policy and privacy gates are **inherited** from the published Pipeline Definition and cannot be edited in either Form or advanced JSON. Only the bundled Hybrid Active Learning Selection v1 definition is runnable in the local simulator.
- **Runs** (`/history`, `/runs/:id`): direct navigation to details, quick preview option, read-only captured execution DAG and contextual inspector. Unknown stage status is not inferred from run-level success. Run batch links open the Batch Workspace directly.
- **Selection Batches** (`/batches`): dedicated Registry with workflow filters, run lineage, progress, annotation status and direct Review/Handoff actions. Each batch opens `/batches/:id?view=grid`. The workspace contains:
  - **Review Queue / Batch Grid**: compact contact sheet, status and domain filters, sample preview inspector, page-select and bulk review actions. The image display primitive is reused from Data Explorer.
  - **Focus Review & Quick Edit**: CVAT-inspired vertical tool rail, center 2D canvas, object list, bounding box draw/move/resize/relabel, delete and undo/redo, plus separate Approve/Reject/Defer decisions. Draft edits survive page refresh in local mock state and warn before navigating with unsaved edits.
  - **Finalize & Handoff**: Validate → Configure → Freeze version → Export. Configure annotation/training purpose, manifest/ZIP/verified-label format, local download or future R2 destination, requested curated name/version label, export job name, notes, and included media/metadata/audit records. Freeze validates membership, review, privacy and shortfall policy; export separately validates the frozen version, artifact integrity, annotations and destination. Both actions are disabled without backend evidence. Downloading the preview JSON creates no curated version or export job.

### Important demo and trust limitations

The current gallery contains **fixture sample images, not verified members** of the selected immutable batch. The local `reviewWorkspace.decisions` and `reviewWorkspace.edits` maps persist in browser state only; they are **not counted** in server-verified batch aggregate review totals, and box drafts are **not ground-truth annotations**. Privacy verification, sample membership and content-hashed artifacts require a backend. Therefore the Handoff view does **not** claim to create an immutable Curated Batch or export a real ZIP from fixture data: Finalize is disabled until those checks can be performed. The Download handoff plan action exports preview JSON marked `notAnExport: true`.

The initial 2D editor is not a replacement for CVAT's full annotation stack or 3D point-cloud labeling. The media viewer and review state are separate so a point-cloud renderer can be added later. No CVAT instance is hosted in this mock.

Build with `npm run build`; route rendering tests are in `scripts/route-smoke.mjs`.
