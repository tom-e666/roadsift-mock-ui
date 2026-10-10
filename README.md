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

`/pipelines` is an interactive frontend-only definition registry and stage/DAG editor. Published definitions are immutable; clone a definition to edit dependencies and stage implementations in a draft, validate and publish it locally. `/mining` remains the existing Selection Launchpad (with a reference to its bundled definition); `/history` remains the Runs list and detail views. All custom definitions are **design-only** and are not executed by the current worker. Demo changes live in localStorage, not the production RoadSift database.
