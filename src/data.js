import { BookOpen, Database, ScanSearch, GitBranch, Video, History, ScanLine, Play, ChartNoAxesCombined, Sparkles, Settings, Monitor } from 'lucide-react';

export const groups = [
  ['Library', [['datasets', 'Datasets', Database], ['data-explorer', 'Data Explorer', ScanSearch], ['lineage', 'Lineage', GitBranch]]],
  ['Workflow', [['mining', 'Video Mining', Video], ['history', 'Mining History', History], ['labeling', 'Label Editor', ScanLine], ['training', 'Training', Play], ['metrics', 'Model Metrics', ChartNoAxesCombined], ['pal', 'PAL Workbench', Sparkles]]],
  ['Workspace', [['settings', 'Settings', Settings], ['system', 'System Status', Monitor], ['documentation', 'Documentation', BookOpen]]],
];
export const allPages = groups.flatMap(([, items]) => items);
export const initialDatasets = [
  { id: 'bdd100k-pool', name: 'Urban driving', subtitle: 'BDD100K · Unlabeled pool', count: 2400, stage: 'Raw', version: 1, date: '2026-10-06', domain: 'Urban', scene: 0, parent: null, description: 'A diverse pool of urban intersections, arterial roads, and downtown traffic scenes.' },
  { id: 'bdd100k-curated', name: 'Safety-critical selection', subtitle: 'Urban driving · Curated subset', count: 320, stage: 'Selected', version: 2, date: '2026-10-06', domain: 'Urban', scene: 1, parent: 'bdd100k-pool', description: 'A curated subset prioritizing pedestrians, crowded intersections, and low-confidence detections.' },
  { id: 'bdd100k-labeled', name: 'Ready for training', subtitle: 'Safety-critical · Human reviewed', count: 280, stage: 'Labeled', version: 3, date: '2026-10-05', domain: 'Urban', scene: 2, parent: 'bdd100k-curated', description: 'Reviewed sample frames with bounding boxes for vehicles, pedestrians, and cyclists.' },
  { id: 'night-driving', name: 'After dark', subtitle: 'BDD100K · Night driving', count: 640, stage: 'Embedded', version: 1, date: '2026-10-04', domain: 'Night', scene: 3, parent: null, description: 'Night-time driving scenes with headlights, difficult lighting, and reflective surfaces.' },
  { id: 'rain-driving', name: 'Rainy conditions', subtitle: 'BDD100K · Weather subset', count: 420, stage: 'Raw', version: 1, date: '2026-10-03', domain: 'Rain', scene: 4, parent: null, description: 'Wet roads and adverse-weather scenes for exploring domain coverage.' },
  { id: 'highway-driving', name: 'Open road', subtitle: 'BDD100K · Highway scenes', count: 880, stage: 'Raw', version: 1, date: '2026-10-02', domain: 'Highway', scene: 5, parent: null, description: 'High-speed road scenes, merging vehicles, and long-range detections.' },
  { id: 'validation-set', name: 'Validation holdout', subtitle: 'Evaluation · Fixed reference', count: 300, stage: 'Labeled', version: 1, date: '2026-10-01', domain: 'Mixed', scene: 1, parent: null, description: 'A fixed demo evaluation set, separate from the acquisition pool.' },
];
export const frames = Array.from({ length: 24 }, (_, index) => ({ id: `frame_${String(index + 1).padStart(4, '0')}`, scene: index % 6, domain: ['Urban', 'Urban', 'Urban', 'Night', 'Rain', 'Highway'][index % 6], score: Number((.28 + ((index * 17) % 65) / 100).toFixed(2)), objects: 2 + index % 7, time: `00:${String(12 + index * 2).padStart(2, '0')}`, reviewed: index < 4 }));
export const initialRuns = [
  { id: 'M-012', name: 'Downtown morning drive', status: 'Complete', frames: 480, selected: 64, date: 'Oct 6, 10:42 AM', scene: 0 },
  { id: 'M-011', name: 'Night commute', status: 'Complete', frames: 360, selected: 48, date: 'Oct 5, 8:15 PM', scene: 3 },
  { id: 'M-010', name: 'Rainy afternoon', status: 'Complete', frames: 240, selected: 36, date: 'Oct 4, 3:30 PM', scene: 4 },
];
export const metrics = [
  { label: 'Car', precision: .92, recall: .89, ap: .913, count: 1820 },
  { label: 'Pedestrian', precision: .84, recall: .81, ap: .825, count: 620 },
  { label: 'Cyclist', precision: .79, recall: .76, ap: .774, count: 184 },
  { label: 'Truck', precision: .88, recall: .85, ap: .872, count: 320 },
  { label: 'Bus', precision: .9, recall: .86, ap: .895, count: 96 },
];
export const sceneUrl = n => `/samples/scene-${n % 6}.svg`;
export const count = n => Number(n).toLocaleString();
export const date = s => new Date(`${s}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
