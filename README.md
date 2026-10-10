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
- **Selection Batches** (`/batches`): review-focused Registry with progress, run lineage and links to `/batches/:id`. The nested workspace has:
  - **Review Queue**: filterable contact sheet, quick sample inspector, bulk decisions and pagination. Media rendering is shared with Data Explorer.
  - **Focus Review + Quick Edit**: CVAT-inspired 2D box editor, tool rail, object list and separate selection decisions. Drafts and selection decisions stay local, not registered ground truth.
  - **Curated Batch** (`?view=handoff`): two-stage user experience. Before finalization, show approved candidates and proposed version name; after finalization, show an immutable version with *Send for Annotation* and *Export Dataset* actions. This mock cannot validate full membership, so real Finalize remains disabled. The interactive **version preview** (`?view=handoff&preview=version`) is explicitly labeled illustrative, not a created artifact. The on-demand delivery drawer configures purpose, format, destination and includes; privacy/annotation checks are conditional on the package, not global blockers. Only a clearly labeled plan JSON can be downloaded.

### Strategy Comparison — run-first workspace

`/comparison` now begins with **2–5 completed mining runs**, baseline and comparison-scope checks. Tabs separate **Selection Results**, **Sample Differences** and **Model Impact**. Selection Results shows available registered batch aggregates without inventing diversity, cost or safety coverage. Sample Differences requires **actual selected sample IDs** from both immutable membership lists. When IDs are missing, it explains the limitation and offers an optional interactive **illustrative gallery** (`/comparison?demo=samples`); the sample groups in this mode must never be used as experimental results. Model Impact requires compatible, linked evaluation records and stays empty if absent. The old synthetic two-arm benchmark is accessible separately via **Example benchmark** and remains labeled synthetic.

### Annotation Jobs and Model Evaluation

- **Annotation Jobs** (`/annotation-jobs`): first-class delivery registry with status filters, expected/returned counts and a detail inspector. A recorded fixture return of 5,072 / 5,084 is displayed as an aggregate discrepancy of 12; exact missing IDs cannot be inferred until the authoritative membership manifest and returned artifact are compared. The **Import return** action opens a small contextual drawer attached to that job. The Curated Version and Batch Registry link here; legacy `/batches/:id?view=return` links direct users to the new workspace.
- **Model Evaluation** (`/model-evaluation`): independent record registry with metrics, per-class, safety-slice, artifacts and provenance tabs. The built-in benchmark entries are explicitly marked synthetic; local imported records remain unverified. **Import evaluation** opens a contextual drawer with Model Version, Dataset Version, Holdout, optional Run and a JSON/CSV file or R2/S3 URI. Existing `/evaluations/import` URLs open the new import drawer.
- **Shared intake drawer**: reuses the COCO/RoadSift annotation JSON and evaluation JSON/simple-CSV schema parsers. Saving creates a **browser-only intake metadata record**, never a verified annotated dataset, evaluation record or artifact. URI references are not fetched or hashed. Sample mapping, class consistency, holdout provenance, model weights and artifact integrity must be reconciled server-side before publication. Native CVAT packages, YOLO ZIP and large files require a backend importer.
- Strategy Comparison consumes verified results only for model-impact claims; unverified local intakes can be listed for visibility but must never be used as evidence of uplift.

### Trust & release boundaries

Finalize and Export are separate: finalization locks approved membership after authoritative backend review/policy checks; delivery then applies purpose-, format- and destination-specific privacy/annotation/integrity requirements. A manifest without image bytes does not require image sanitization by default, but still requires recipient access controls. When image bytes leave the controlled workspace, sanitized artifacts must be confirmed; training outputs additionally require verified labels. **Neither a real curated version nor a real delivery job can be created in this frontend-only prototype.**

### Important demo and trust limitations

The current gallery contains **fixture sample images, not verified members** of the selected immutable batch. The local `reviewWorkspace.decisions` and `reviewWorkspace.edits` maps persist in browser state only; they are **not counted** in server-verified batch aggregate review totals, and box drafts are **not ground-truth annotations**. Privacy verification, sample membership and content-hashed artifacts require a backend. Therefore the Handoff view does **not** claim to create an immutable Curated Batch or export a real ZIP from fixture data: Finalize is disabled until those checks can be performed. The Download handoff plan action exports preview JSON marked `notAnExport: true`.

The initial 2D editor is not a replacement for CVAT's full annotation stack or 3D point-cloud labeling. The media viewer and review state are separate so a point-cloud renderer can be added later. No CVAT instance is hosted in this mock.

Build with `npm run build`; route rendering tests are in `scripts/route-smoke.mjs`.
