import { BookOpen, Database, ScanSearch, GitBranch, Video, History, ScanLine, Play, ChartNoAxesCombined, Sparkles, Settings, Monitor } from 'lucide-react';

export const groups = [
  ['Library', [['datasets', 'Datasets', Database], ['data-explorer', 'Data Explorer', ScanSearch], ['lineage', 'Lineage', GitBranch]]],
  ['Workflow', [['mining', 'Video Mining', Video], ['history', 'Mining History', History], ['labeling', 'Label Editor', ScanLine], ['training', 'Training', Play], ['metrics', 'Model Metrics', ChartNoAxesCombined], ['pal', 'PAL Workbench', Sparkles]]],
  ['Workspace', [['settings', 'Settings', Settings], ['system', 'System Status', Monitor], ['documentation', 'Documentation', BookOpen]]],
];
export const allPages = groups.flatMap(([, items]) => items);
export const initialDatasets = [
  { id:'unc-r1', name:'Entropy Sampling', subtitle:'Fleet Pool v1 · Entropy acquisition', count:12000, added:4000, stage:'Labeled', version:1, round:1, date:'2026-10-05', domain:'Mixed', scene:0, parent:'seed-8k', pool:'pool_fleet_001', run:'run_unc_r01', strategy:'Entropy Sampling', budget:4000, eligible:142680, boxes:30840, annotationHours:119, cost:1012, model:'YOLO11m · unc-r01', evalId:'eval_unc_r01_0037', evaluation:{map:.409,deltaMap:.028,recall:.696,deltaRecall:.028,vru:.616,deltaVru:.042,night:.548,deltaNight:.027,rain:.516}, description:'First acquisition round selected from Fleet Pool v1 using detector uncertainty.' },
  { id:'unc-r2', name:'Entropy Sampling', subtitle:'Fleet Pool v1 · Entropy acquisition', count:16000, added:4000, stage:'Labeled', version:2, round:2, date:'2026-10-06', domain:'Mixed', scene:3, parent:'unc-r1', pool:'pool_fleet_001', run:'run_unc_r02', strategy:'Entropy Sampling', budget:4000, eligible:138680, boxes:32120, annotationHours:124, cost:1054, model:'YOLO11m · unc-r02', evalId:'eval_unc_r02_0040', evaluation:{map:.425,deltaMap:.016,recall:.711,deltaRecall:.015,vru:.638,deltaVru:.022,night:.566,deltaNight:.018,rain:.529}, description:'Second active-learning round adds 4,000 newly selected frames to the same uncertainty branch.' },
  { id:'rav-r1', name:'Hybrid Sampling', subtitle:'Fleet Pool v1 · U + Safety + Diversity − Redundancy', count:12000, added:4000, stage:'Labeled', version:1, round:1, date:'2026-10-05', domain:'Mixed', scene:1, parent:'seed-8k', pool:'pool_fleet_001', run:'run_rav_r01', strategy:'Hybrid Sampling', budget:4000, eligible:142680, boxes:31240, annotationHours:121, cost:1029, weights:'U .35 · S .30 · D .25 · R −.10', model:'YOLO11m · rav-r01', evalId:'eval_rav_r01_0038', evaluation:{map:.417,deltaMap:.036,recall:.708,deltaRecall:.040,vru:.635,deltaVru:.061,night:.579,deltaNight:.058,rain:.542}, description:'Hybrid acquisition balances uncertainty, safety relevance, domain diversity, and redundancy.' },
  { id:'rav-r2', name:'Hybrid Sampling', subtitle:'Fleet Pool v1 · U + Safety + Diversity − Redundancy', count:16000, added:4000, stage:'Labeled', version:2, round:2, date:'2026-10-06', domain:'Mixed', scene:4, parent:'rav-r1', pool:'pool_fleet_001', run:'run_rav_r02', strategy:'Hybrid Sampling', budget:4000, eligible:138680, boxes:31604, annotationHours:127, cost:1080, weights:'U .35 · S .30 · D .25 · R −.10', model:'YOLO11m · rav-r02', evalId:'eval_rav_r02_0041', evaluation:{map:.441,deltaMap:.024,recall:.731,deltaRecall:.023,vru:.674,deltaVru:.039,night:.608,deltaNight:.029,rain:.571}, description:'Second active-learning round adds 4,000 frames while preserving safety and domain coverage.' },
];
export const fleetPool = { id:'pool_fleet_001', name:'Fleet Pool v1', total:184320, eligible:142680, excluded:29640, holdout:12000, seed:8000, indexed:'Oct 6, 2026 · 6:32 PM', storage:'R2 · roadsift/fleet-pool-v1', distribution:{ City:92640, Highway:43210, Suburban:31870, Other:16600, Day:121480, Night:62840, Clear:139250, Rain:27410, 'Fog / low visibility':7280 } };
export const seedEvaluation = { map:.381, recall:.668, vru:.574, night:.521, rain:.493 };

export const frames = Array.from({ length: 36 }, (_, index) => { const states=['Raw','Raw','Selected','Labeled','Labeled','Excluded']; const domains=['Urban','Urban','Night','Rain','Highway','Urban']; const weather=['Clear','Clear','Clear','Rain','Clear','Fog']; const score=Number((.31+((index*13)%61)/100).toFixed(2)); return { id:`frame_${String(18321+index).padStart(6,'0')}`, scene:index%6, domain:domains[index%6], weather:weather[index%6], state:states[index%6], score, uncertainty:Number(Math.min(.96,score+.04).toFixed(2)), safety:Number((.52+((index*11)%42)/100).toFixed(2)), diversity:Number((.45+((index*7)%48)/100).toFixed(2)), redundancy:Number((.08+((index*5)%31)/100).toFixed(2)), quality:index%6===5?'Quarantined':'Good', blur:Number((.08+((index*3)%24)/100).toFixed(2)), brightness:Number((.28+((index*9)%57)/100).toFixed(2)), objects:3+index%9, video:`drive_${String(21+Math.floor(index/6)).padStart(4,'0')}.mp4`, time:`00:${String(12+index).padStart(2,'0')}:40.${String((index*37)%1000).padStart(3,'0')}`, reviewed:index%6===3||index%6===4 }; });
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
