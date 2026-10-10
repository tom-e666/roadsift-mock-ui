import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Build-only checks miss undefined names that are only read during React render.
// Exercise every top-level view and both registry/detail rendering paths.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const views = await server.ssrLoadModule('/src/Pages.jsx');
  const pipelineViews = await server.ssrLoadModule('/src/PipelineDefinitions.jsx');
  const curationViews = await server.ssrLoadModule('/src/BatchWorkspace.jsx');
  const fixtures = await server.ssrLoadModule('/src/data.js');
  const datasets = fixtures.initialDatasets;
  const pools = fixtures.initialPools;
  const runs = fixtures.initialRuns;
  const definitions = pipelineViews.initialPipelineDefinitions;
  const selectionBatches = fixtures.initialSelectionBatches;
  const runnerRegistry = fixtures.runners;
  const modelRegistryState = fixtures.modelRegistry;
  const algorithmRegistry = fixtures.strategies;
  const noop = () => {};
  globalThis.window = { location: { search: '', pathname: '/history' } };
  const common = {
    datasets, setDatasets: noop, pools, setPools: noop,
    runs, setRuns: noop, definitions, setDefinitions: noop, selectionBatches, setSelectionBatches: noop,
    runnerRegistry, setRunnerRegistry: noop,
    modelRegistryState, setModelRegistryState: noop,
    algorithmRegistry, setAlgorithmRegistry: noop,
    notify: noop, navigate: noop, setLanguage: noop,
    theme: 'light', setTheme: noop, preferences: {compact:false,animations:true}, setPreferences: noop,
    routePath: '/', contextDataset: null, language: 'en',
  };
  const cases = [
    ['Pools', 'pools', '/pools'],
    ['Pool details', 'pools', '/pools/' + pools[0].id],
    ['Datasets', 'datasets', '/datasets'],
    ['Dataset details', 'datasets', '/datasets/' + datasets[0].id],
    ['Data Explorer', 'data-explorer', '/data-explorer'],
    ['Ingest', 'import', '/import'],
    ['Pipeline Definitions', 'pipelines', '/pipelines'],
    ['Pipeline Editor - published', 'pipelines', '/pipelines/al-selection-v1'],
    ['Pipeline Editor - draft', 'pipelines', '/pipelines/quality-screen-v1'],
    ['Launchpad - selection', 'mining', '/mining'],
    ['Launchpad - custom definition', 'mining', '/mining?definition=quality-screen-v1'],
    ['Run Details - complete fixture', 'history', '/runs/' + encodeURIComponent(runs[0].id)],
    ['Run Details - failed fixture', 'history', '/runs/' + encodeURIComponent(runs.find(r=>r.status==='Failed')?.id || runs[0].id)],
    ['Selection Batches', 'batches', '/batches'],
    ['Batch Grid', 'batch-workspace', '/batches/' + encodeURIComponent(selectionBatches.find(b => b.status === 'In review').id) + '?view=grid'],
    ['Focus Review', 'batch-workspace', '/batches/' + encodeURIComponent(selectionBatches.find(b => b.status === 'In review').id) + '?view=review'],
    ['Finalize & Handoff', 'batch-workspace', '/batches/' + encodeURIComponent(selectionBatches.find(b => b.status === 'In review').id) + '?view=handoff'],
    ['Runs', 'history', '/history'],
    ['Runs quick preview', 'history', '/history?selected=' + encodeURIComponent(runs[0].id)],
    ['Strategy Comparison', 'comparison', '/comparison'],
    ['Settings', 'settings', '/settings'],
    ['System', 'system', '/system'],
    ['Onboarding', 'onboarding', '/onboarding'],
  ];
  const components = {
    pools: views.Pools, datasets: views.Datasets, 'data-explorer': views.Explorer,
    import: views.ImportData, pipelines: pipelineViews.PipelineDefinitions, mining: views.Mining, batches: views.SelectionBatches,
    history: views.History, 'batch-workspace': curationViews.BatchWorkspace, comparison: views.StrategyComparison, settings: views.SettingsPage,
    system: views.SystemPage, onboarding: views.Onboarding,
  };
  const failures = [];
  for (const [label, id, path] of cases) {
    try {
      window.location.pathname = path.split('?')[0];
      window.location.search = path.includes('?')?'?'+path.split('?')[1]:'';
      const html = renderToStaticMarkup(React.createElement(components[id], { ...common, routePath: path }));
      if (!html || html.length < 50) throw new Error('Empty HTML');
      if (id === 'pipelines' && path !== '/pipelines' && !html.includes('pipeline-graph-viewport')) throw new Error('Missing graph canvas');
      if (id === 'pipelines' && path === '/pipelines' && !html.includes('pipeline-registry-table')) throw new Error('Missing pipeline registry');
      if (id === 'mining' && !html.includes('lp-builder')) throw new Error('Missing launchpad builder');
      if (id === 'mining' && path === '/mining' && (html.includes('Stage implementation overrides') || !html.includes('Run Parameters'))) throw new Error('Launchpad must inherit stage implementations');
      if (id === 'batches' && (!html.includes('br-list') || !html.includes('Needs review') || !html.includes('Handoff') || html.includes('Finalize curated batch'))) throw new Error('Missing Batch Registry or exposes unverified finalize action');
      if (id === 'batch-workspace' && path.includes('view=grid') && (!html.includes('bw-queue-layout') || !html.includes('bw-grid') || !html.includes('bw-queue-preview') || !html.includes('Preview gallery') || !html.includes('Select page'))) throw new Error('Missing Review Queue contact sheet, preview inspector or provenance');
      if (id === 'batch-workspace' && path.includes('view=review') && (!html.includes('qb-studio-layout') || !html.includes('qb-objects') || !html.includes('Sample Inspector') || !html.includes('Save Draft'))) throw new Error('Missing CVAT-lite editor, object panel or review inspector');
      if (id === 'batch-workspace' && path.includes('view=handoff') && (!html.includes('Finalize readiness') || !html.includes('Eligible sample membership') || !html.includes('Privacy clearance') || !html.includes('Technical validation details') || !html.includes('Export checks') || !html.includes('bw-handoff-stepper') || !html.includes('Handoff purpose') || !html.includes('Export destination') || !html.includes('Requested version label') || !html.includes('Curated batch name') || !html.includes('Review decision records') || !html.includes('Manifest &amp; sample IDs') || !html.includes('Finalize Curated Batch') || !html.includes('Create export job'))) throw new Error('Missing simplified Handoff summary or gated output configuration');
      if (id === 'comparison' && (!html.includes('sc-page') || !html.includes('Key metrics comparison') || !html.includes('Selection overlap') || !html.includes('Synthetic fixture') || !html.includes('Learning curve'))) throw new Error('Missing evidence-first comparison workspace');
      if (id === 'history' && path.startsWith('/runs/') && !html.includes('rd-page')) throw new Error('Missing run details dashboard');
      if (id === 'history' && path === '/history' && (!html.includes('run-list-link') || !html.includes('run-list-preview'))) throw new Error('Missing explicit run navigation or preview buttons');
      if (id === 'history' && path.includes('selected=') && !html.includes('Open Run Details')) throw new Error('Missing quick-preview navigation');
      if (id === 'history' && path.startsWith('/runs/') && !html.includes('rd-no-graph')) throw new Error('Unrecorded fixture should not show an invented execution DAG');
      console.log('PASS', label, html.length, 'chars');
    } catch (error) {
      failures.push(label);
      console.error('FAIL', label, error.stack || error);
    }
  }
  // Cross-domain fixtures must not claim comparable metrics when the pool snapshot differs.
  try{
    const html=renderToStaticMarkup(React.createElement(views.StrategyComparison,{...common}));
    if(!html.includes('Matched comparison configuration')||!html.includes('Not recorded'))throw new Error('Comparison fixture lacks evidence labels');
    console.log('PASS Comparison fixtures show protocol compatibility and explicit missing evidence');
  }catch(error){failures.push('Comparison provenance');console.error('FAIL Comparison provenance',error.stack||error);}
  // A run with a persisted definition must render only its declared dependencies.
  // A recorded stage event may change that node status; no other node may inherit run-level success.
  try {
    const definition = definitions.find(d => d.id === 'al-selection-v1');
    if (!definition?.stages?.length) throw new Error('Missing test definition');
    const first = definition.stages.find(s => s.enabled);
    const testRun = {
      ...runs[0], id:'test_captured_dag', name:'Snapshot-bound test execution', status:'Running',
      pipelineDefinitionSnapshot:definition, pipelineDefinitionVersion:definition.version,
      stageEvents:[{stageId:first.id,status:'Complete',duration:'9s'}]
    };
    const html = renderToStaticMarkup(React.createElement(views.History,{
      ...common, runs:[testRun,...runs],routePath:'/runs/test_captured_dag'
    }));
    if (!html.includes('rd-execution-node') || !html.includes('rd-execution-edges')) throw new Error('Captured DAG was not rendered');
    if (!html.includes('rd-node-dot is-done')) throw new Error('Recorded stage status not reflected');
    if (!html.includes('No stage event')) throw new Error('Missing stage evidence must be reported as missing');
    if (html.includes('rd-no-graph')) throw new Error('Captured DAG incorrectly shown as absent');
    console.log('PASS Captured DAG with mixed recorded and unknown stage evidence');
  } catch (error) {
    failures.push('Captured DAG evidence');
    console.error('FAIL Captured DAG evidence', error.stack||error);
  }
  if (failures.length) {
    console.error('Route render failures:', failures.join(', '));
    process.exitCode = 1;
  } else {
    console.log('All', cases.length, 'route render smoke checks passed');
  }
} finally {
  await server.close();
}
