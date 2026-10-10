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

## Launchpad and Run Details

- Launchpad (/mining) uses Inputs -> Stage Parameters -> Execution, conditional selection fields, run-scoped weight overrides, an advanced JSON editor and sticky run summary. Published definitions are listed, but only bundled Active Learning Selection v1 has a simulated local executor. Other published definitions cannot launch.
- Run Details (/runs/:id) shows recorded run state, pipeline structure when captured, stage information, logs, artifact references, effective run configuration and links to Selection Batches. Historical runs without captured DAG information are explicitly labeled as illustrative.
- Launch navigates immediately to the new Run Details page. Batch links open a registered selection batch for review. No real Kaggle submission or backend preflight happens in the preview.
