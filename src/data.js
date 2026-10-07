import { BookOpen, Database, ScanSearch, UploadCloud, Pickaxe, History, ChartNoAxesCombined, Settings, Monitor, Boxes, Layers } from 'lucide-react';
import mockData from './mock-data.json';

export const groups = [
  ['Library', [['pools', 'Pools', Boxes], ['datasets', 'Datasets', Database], ['data-explorer', 'Data Explorer', ScanSearch]]],
  ['Workflow', [['import', 'Ingest', UploadCloud], ['mining', 'Mining', Pickaxe], ['batches', 'Selection Batches', Layers], ['history', 'Runs', History], ['comparison', 'Strategy Comparison', ChartNoAxesCombined]]],
  ['Workspace', [['settings', 'Settings', Settings], ['system', 'System', Monitor], ['onboarding', 'Onboarding', BookOpen]]],
];
export const allPages = groups.flatMap(([, items]) => items);

export const initialDatasets = mockData.datasets;
export const initialPools = mockData.pools;
export const pools = mockData.pools;
export const fleetPool = { ...mockData.pools[0], ...mockData.fleetPoolExtra };
export const seedEvaluation = mockData.seedEvaluation;
export const seedDataset = mockData.seedDataset;
export const holdouts = mockData.holdouts;
export const strategies = mockData.strategies;
export const datasetRegistration = mockData.datasetRegistration;
export const importSimulation = mockData.importSimulation;
export const miningConfig = mockData.miningConfig;
export const runners = mockData.runners;
export const modelRegistry = mockData.modelRegistry;
export const systemServices = mockData.systemServices;
export const strategyComparison = mockData.strategyComparison;
export const systemRunnerRegistrationDefaults = mockData.systemRunnerRegistrationDefaults;
export const poolRegistration = mockData.poolRegistration;
export const frames = mockData.frames;
export const initialSelectionBatches = mockData.selectionBatches;
export const selectionBatches = mockData.selectionBatches;
export const batchLifecycle = mockData.selectionBatchLifecycle;
export const initialRuns = mockData.runs;
export const metrics = mockData.metrics;
export const sceneUrl = n => mockData.sceneUrls[n % mockData.sceneUrls.length];
export const count = n => Number(n).toLocaleString();
export const date = s => {
  if (!s) return '—';
  const raw = String(s);
  if (!raw.includes('T')) {
    const parsed = new Date(`${raw}T00:00:00`);
    return parsed.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }
  return new Date(raw).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
};
