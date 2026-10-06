import { BookOpen, Database, ScanSearch, UploadCloud, Pickaxe, History, ChartNoAxesCombined, Settings, Monitor, Boxes } from 'lucide-react';

export const groups = [
  ['Library', [['pools', 'Pools', Boxes], ['datasets', 'Datasets', Database], ['data-explorer', 'Data Explorer', ScanSearch]]],
  ['Workflow', [['import', 'Import Data', UploadCloud], ['mining', 'Mining', Pickaxe], ['history', 'Runs', History], ['comparison', 'Strategy Comparison', ChartNoAxesCombined]]],
  ['Workspace', [['settings', 'Settings', Settings], ['system', 'System', Monitor], ['onboarding', 'Onboarding', BookOpen]]],
];
export const allPages = groups.flatMap(([, items]) => items);
export const initialDatasets = [
  { id:'unc-r1', name:'Urban Core · Hanoi', subtitle:'Fleet Pool v1 · Urban driving corpus', count:12000, added:4000, stage:'Labeled', version:1, round:1, date:'2026-10-05T21:42:36', domain:'Mixed', scene:0, parent:'seed-8k', pool:'pool_fleet_001', run:'run_unc_r01', strategy:'Entropy Sampling', budget:4000, eligible:142680, boxes:30840, annotationHours:119, cost:1012, model:'YOLO11m · unc-r01', evalId:'eval_unc_r01_0037', evaluation:{map:.409,deltaMap:.028,recall:.696,deltaRecall:.028,vru:.616,deltaVru:.042,night:.548,deltaNight:.027,rain:.516}, description:'First acquisition round selected from Fleet Pool v1 using detector uncertainty.' },
  { id:'unc-r2', name:'Urban Core · Hanoi', subtitle:'Fleet Pool v1 · Urban driving corpus', count:16000, added:4000, stage:'Labeled', version:2, round:2, date:'2026-10-06T20:18:12', domain:'Mixed', scene:3, parent:'unc-r1', pool:'pool_fleet_001', run:'run_unc_r02', strategy:'Entropy Sampling', budget:4000, eligible:138680, boxes:32120, annotationHours:124, cost:1054, model:'YOLO11m · unc-r02', evalId:'eval_unc_r02_0040', evaluation:{map:.425,deltaMap:.016,recall:.711,deltaRecall:.015,vru:.638,deltaVru:.022,night:.566,deltaNight:.018,rain:.529}, description:'Second active-learning round adds 4,000 newly selected frames to the same uncertainty branch.' },
  { id:'rav-r1', name:'Night & Rain Fleet', subtitle:'Fleet Pool v1 · Adverse-condition driving corpus', count:12000, added:4000, stage:'Labeled', version:1, round:1, date:'2026-10-05T21:42:36', domain:'Mixed', scene:1, parent:'seed-8k', pool:'pool_fleet_001', run:'run_rav_r01', strategy:'Hybrid Sampling', budget:4000, eligible:142680, boxes:31240, annotationHours:121, cost:1029, weights:'U .35 · S .30 · D .25 · R −.10', model:'YOLO11m · rav-r01', evalId:'eval_rav_r01_0038', evaluation:{map:.417,deltaMap:.036,recall:.708,deltaRecall:.040,vru:.635,deltaVru:.061,night:.579,deltaNight:.058,rain:.542}, description:'Hybrid acquisition balances uncertainty, safety relevance, domain diversity, and redundancy.' },
  { id:'rav-r2', name:'Night & Rain Fleet', subtitle:'Fleet Pool v1 · Adverse-condition driving corpus', count:16000, added:4000, stage:'Labeled', version:2, round:2, date:'2026-10-06T20:18:12', domain:'Mixed', scene:4, parent:'rav-r1', pool:'pool_fleet_001', run:'run_rav_r02', strategy:'Hybrid Sampling', budget:4000, eligible:138680, boxes:31604, annotationHours:127, cost:1080, weights:'U .35 · S .30 · D .25 · R −.10', model:'YOLO11m · rav-r02', evalId:'eval_rav_r02_0041', evaluation:{map:.441,deltaMap:.024,recall:.731,deltaRecall:.023,vru:.674,deltaVru:.039,night:.608,deltaNight:.029,rain:.571}, description:'Second active-learning round adds 4,000 frames while preserving safety and domain coverage.' },
];
export const pools = [
  { id:'pool_fleet_001', name:'Hanoi Fleet Pool', version:12, snapshot:'pool_snap_20261007_014218', total:2418320, eligible:1814640, labeled:421780, reserved:36720, excluded:145180, indexed:'2026-10-07T01:42:18', storage:'r2://roadsift/pools/hanoi-fleet/', source:'Fleet ingest · Hanoi', status:'Active' },
  { id:'pool_north_002', name:'Northern Highway Pool', version:8, snapshot:'pool_snap_20261006_231407', total:864210, eligible:612480, labeled:168320, reserved:12480, excluded:70930, indexed:'2026-10-06T23:14:07', storage:'r2://roadsift/pools/northern-highway/', source:'Fleet ingest · Highway', status:'Active' },
  { id:'pool_adverse_003', name:'Adverse Weather Pool', version:5, snapshot:'pool_snap_20261006_184933', total:326840, eligible:218750, labeled:64120, reserved:8400, excluded:35570, indexed:'2026-10-06T18:49:33', storage:'r2://roadsift/pools/adverse-weather/', source:'Rain / night collection', status:'Active' }
];
export const fleetPool = { ...pools[0], holdout:12000, seed:8000, distribution:{ City:92640, Highway:43210, Suburban:31870, Other:16600, Day:121480, Night:62840, Clear:139250, Rain:27410, 'Fog / low visibility':7280 } };
export const seedEvaluation = { map:.381, recall:.668, vru:.574, night:.521, rain:.493 };

export const frames = Array.from({ length: 36 }, (_, index) => { const states=['Raw','Raw','Selected','Labeled','Labeled','Excluded']; const domains=['Urban','Urban','Night','Rain','Highway','Urban']; const weather=['Clear','Clear','Clear','Rain','Clear','Fog']; const score=Number((.31+((index*13)%61)/100).toFixed(2)); return { id:`frame_${String(18321+index).padStart(6,'0')}`, scene:index%6, domain:domains[index%6], weather:weather[index%6], state:states[index%6], score, uncertainty:Number(Math.min(.96,score+.04).toFixed(2)), safety:Number((.52+((index*11)%42)/100).toFixed(2)), diversity:Number((.45+((index*7)%48)/100).toFixed(2)), redundancy:Number((.08+((index*5)%31)/100).toFixed(2)), quality:index%6===5?'Quarantined':'Good', blur:Number((.08+((index*3)%24)/100).toFixed(2)), brightness:Number((.28+((index*9)%57)/100).toFixed(2)), objects:3+index%9, video:`drive_${String(21+Math.floor(index/6)).padStart(4,'0')}.mp4`, time:`00:${String(12+index).padStart(2,'0')}:40.${String((index*37)%1000).padStart(3,'0')}`, reviewed:index%6===3||index%6===4 }; });
export const selectionBatches = [
  { id:'batch_hybrid_r02', name:'Hybrid Sampling · Round 2 Batch', strategy:'Hybrid Sampling', source:'Fleet Pool v1', parentDataset:'Night & Rain Fleet v1', count:4000, status:'Ready for handoff', run:'mine_20261006_2018_a7f3', model:'YOLO11m · model_round_1.pt', reviewed:4000, approved:3824, rejected:112, deferred:64, destination:null },
  { id:'batch_entropy_r02', name:'Entropy Sampling · Round 2 Batch', strategy:'Entropy Sampling', source:'Fleet Pool v1', parentDataset:'Urban Core · Hanoi v1', count:4000, status:'Sent to annotation', run:'mine_20261006_1734_d91b', model:'YOLO11m · model_round_1.pt', reviewed:4000, approved:3910, rejected:62, deferred:28, destination:'CVAT · Job #1842' },
];
export const initialRuns = [
  { id:'mine_20261006_2018_a7f3', type:'Mining', name:'Hybrid Sampling · Fleet Pool v1 · Round 2', status:'Complete', source:'Fleet Pool v1', dataset:'Night & Rain Fleet v1', output:'Hybrid Sampling · Round 2 Batch', frames:142680, selected:4000, budget:4000, executor:'Kaggle GPU · T4', duration:'47m 12s', date:'Oct 6, 2026 · 8:18 PM', scene:4 },
  { id:'mine_20261006_1734_d91b', type:'Mining', name:'Entropy Sampling · Fleet Pool v1 · Round 2', status:'Complete', source:'Fleet Pool v1', dataset:'Urban Core · Hanoi v1', output:'Entropy Sampling · Round 2 Batch', frames:138680, selected:4000, budget:4000, executor:'Kaggle GPU · T4', duration:'39m 08s', date:'Oct 6, 2026 · 5:34 PM', scene:3 },
  { id:'mine_20261005_2142_b4e8', type:'Mining', name:'Hybrid Sampling · Fleet Pool v1 · Round 1', status:'Complete', source:'Fleet Pool v1', dataset:'Initial Labeled Seed', output:'Hybrid Sampling · Round 1 Batch', frames:142680, selected:4000, budget:4000, executor:'Kaggle GPU · T4', duration:'44m 36s', date:'Oct 5, 2026 · 9:42 PM', scene:1 },
  { id:'ingest_20261005_0942_c21d', type:'Import', name:'Hanoi Fleet · October Import', status:'Complete', source:'12 MP4 files', output:'Fleet Pool v1', frames:38420, selected:0, extraction:'2 FPS', executor:'Import Worker', duration:'12m 31s', date:'Oct 5, 2026 · 9:42 AM', scene:0 },
];
export const metrics = [
  { label: 'Car', precision: .92, recall: .89, ap: .913, count: 1820 },
  { label: 'Pedestrian', precision: .84, recall: .81, ap: .825, count: 620 },
  { label: 'Cyclist', precision: .79, recall: .76, ap: .774, count: 184 },
  { label: 'Truck', precision: .88, recall: .85, ap: .872, count: 320 },
  { label: 'Bus', precision: .9, recall: .86, ap: .895, count: 96 },
];
const realDrivingScenes = [
  'https://images.unsplash.com/photo-1708352548514-8a731e456e39?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1541747277704-ef7fb8e1a31c?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1569746133232-5ba1b89767d2?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1541747277704-ef7fb8e1a31c?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1708352548514-8a731e456e39?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1569746133232-5ba1b89767d2?auto=format&fit=crop&w=900&q=82',
];
export const sceneUrl = n => realDrivingScenes[n % realDrivingScenes.length];
export const count = n => Number(n).toLocaleString();
export const date = s => {
  const value = String(s).includes('T') ? s : `${s}T12:00:00`;
  return new Date(value).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
};
