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
  const resultImports = await server.ssrLoadModule('/src/ResultImports.jsx');
  const annotationJobs = await server.ssrLoadModule('/src/AnnotationJobs.jsx');
  const modelEvaluations = await server.ssrLoadModule('/src/ModelEvaluation.jsx');
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
    ['Curated Batch release', 'batch-workspace', '/batches/' + encodeURIComponent(selectionBatches.find(b => b.status === 'In review').id) + '?view=handoff'],
    ['Curated Version preview', 'batch-workspace', '/batches/' + encodeURIComponent(selectionBatches.find(b => b.status === 'In review').id) + '?view=handoff&preview=version'],
    ['Annotation Jobs', 'annotation-jobs', '/annotation-jobs'],
    ['Annotation Jobs detail', 'annotation-jobs', '/annotation-jobs?job=batch_nhc_r13'],
    ['Annotation Jobs import drawer', 'annotation-jobs', '/annotation-jobs?job=batch_nhc_r13&import=1'],
    ['Legacy annotation URL', 'batch-workspace', '/batches/batch_nhc_r13?view=return'],
    ['Model Evaluation', 'model-evaluation', '/model-evaluation'],
    ['Model Evaluation detail', 'model-evaluation', '/model-evaluation?record=eval_demo_entropy_r00'],
    ['Model Evaluation import drawer', 'model-evaluation', '/model-evaluation?import=1'],
    ['Legacy evaluation import', 'model-evaluation', '/evaluations/import'],
    ['Runs', 'history', '/history'],
    ['Runs quick preview', 'history', '/history?selected=' + encodeURIComponent(runs[0].id)],
    ['Strategy Comparison', 'comparison', '/comparison'],
    ['Strategy Comparison sample demo', 'comparison', '/comparison?demo=samples'],
    ['Settings', 'settings', '/settings'],
    ['System', 'system', '/system'],
    ['Onboarding', 'onboarding', '/onboarding'],
  ];
  const components = {
    pools: views.Pools, datasets: views.Datasets, 'data-explorer': views.Explorer,
    import: views.ImportData, pipelines: pipelineViews.PipelineDefinitions, mining: views.Mining, batches: views.SelectionBatches,
    history: views.History, 'batch-workspace': curationViews.BatchWorkspace, 'annotation-jobs': annotationJobs.AnnotationJobs, 'model-evaluation': modelEvaluations.ModelEvaluation, comparison: views.StrategyComparison, settings: views.SettingsPage,
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
      if (id === 'batches' && (!html.includes('br-list') || !html.includes('Needs review') || !html.includes('Curated') || html.includes('Finalize curated batch'))) throw new Error('Missing Batch Registry or exposes unverified finalize action');
      if (id === 'batch-workspace' && path.includes('view=grid') && (!html.includes('bw-queue-layout') || !html.includes('bw-grid') || !html.includes('bw-queue-preview') || !html.includes('Preview gallery') || !html.includes('Select page'))) throw new Error('Missing Review Queue contact sheet, preview inspector or provenance');
      if (id === 'batch-workspace' && path.includes('view=review') && (!html.includes('qb-studio-layout') || !html.includes('qb-objects') || !html.includes('Sample Inspector') || !html.includes('Save Draft'))) throw new Error('Missing CVAT-lite editor, object panel or review inspector');
      if (id === 'batch-workspace' && path.includes('view=handoff') && !path.includes('preview=') && (!html.includes('cr-page') || !html.includes('Review outcome') || !html.includes('Approved candidates') || !html.includes('Preview version workspace') || !html.includes('Create Curated Batch'))) throw new Error('Missing curated release workflow');
      if (id === 'batch-workspace' && path.includes('preview=version') && (!html.includes('Curated Batch') || !html.includes('cr-version') || !html.includes('Send for annotation') || !html.includes('Export dataset') || !html.includes('Illustrative version view'))) throw new Error('Missing post-finalize version preview and delivery triggers');
      if (id === 'batch-workspace' && path.includes('view=return') && !html.includes('Annotation Return is now managed in Annotation Jobs')) throw new Error('Legacy annotation link must point to job workspace');
      if (id === 'annotation-jobs' && (!html.includes('aj-page') || !html.includes('Annotation deliveries') || !html.includes('Needs reconciliation') || !html.includes('Import return'))) throw new Error('Missing contextual annotation jobs workspace');
      if (id === 'annotation-jobs' && path.includes('import=1') && (!html.includes('id-panel') || !html.includes('Save intake record'))) throw new Error('Missing contextual annotation import drawer');
      if (id === 'model-evaluation' && (!html.includes('me-page') || !html.includes('Evaluation records') || !html.includes('Safety slices') || !html.includes('Provenance'))) throw new Error('Missing evaluation registry and tabbed detail');
      if (id === 'model-evaluation' && (path.includes('import=1')||path.startsWith('/evaluations/import')) && (!html.includes('id-panel') || !html.includes('Import evaluation result'))) throw new Error('Missing contextual evaluation import drawer');
      if (id === 'comparison' && (!html.includes('rc-page') || !html.includes('Runs to compare') || !html.includes('Sample Differences') || !html.includes('Model Impact') || !html.includes('Selection Results'))) throw new Error('Missing run-first comparison workspace');
      if (id === 'comparison' && path.includes('demo=samples') && (!html.includes('rc-overlap-groups') || !html.includes('Illustrative UI demonstration only') || !html.includes('Shared by both'))) throw new Error('Missing clearly labeled sample differences demonstration');
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
    if(!html.includes('Not directly comparable')||!html.includes('Not recorded'))throw new Error('Comparison lacks run comparability warnings or evidence labels');
    console.log('PASS Comparison run scope warnings and explicit missing evidence');
  }catch(error){failures.push('Comparison provenance');console.error('FAIL Comparison provenance',error.stack||error);}
  // The fixture's return count gap is an aggregate, not an invented missing sample ID list.
  try {
    const html=renderToStaticMarkup(React.createElement(annotationJobs.AnnotationJobs,{...common,routePath:'/annotation-jobs?job=batch_nhc_r13'}));
    if(!html.includes('12 expected samples not counted as returned')||!html.includes('cannot be inferred'))
      throw new Error('Annotation job reconciliation counts or provenance note missing');
    console.log('PASS annotation job aggregate difference and honest reconciliation status');
  }catch(error){failures.push('Annotation job reconciliation');console.error('FAIL Annotation job reconciliation',error.stack||error)}
  // Validate common import contracts without relying only on markup.
  try {
    const goodCoco={
      images:[{id:1,file_name:'frame_a.jpg'}],categories:[{id:2,name:'car'}],
      annotations:[{id:10,image_id:1,category_id:2,bbox:[3,5,22,18]}]
    };
    const validAnn=resultImports.inspectAnnotations(goodCoco);
    if (validAnn.errors.length||validAnn.summary?.samples!==1||validAnn.summary?.annotations!==1)throw new Error('Valid COCO annotation rejected');
    const broken=resultImports.inspectAnnotations({...goodCoco,annotations:[{id:9,image_id:99,category_id:2,bbox:[0,0,5,5]}]});
    if (!broken.errors.length)throw new Error('Unmapped annotation erroneously accepted');
    const validMetrics=resultImports.inspectEvaluation(JSON.stringify({metrics:{map50_95:.44,recall:.7}}),'json');
    if (validMetrics.errors.length||validMetrics.summary?.metrics.map50_95!==.44)throw new Error('Valid evaluation report rejected');
    const csvMetrics=resultImports.inspectEvaluation('metric,value\nmAP50-95,0.52\nrecall,0.77','csv');
    if(csvMetrics.errors.length||csvMetrics.summary?.metrics.recall!==.77)throw new Error('CSV import metrics not parsed correctly');
    if (!resultImports.inspectEvaluation('{"metrics":{"recall":1.4}}','json').errors.length)throw new Error('Out of range metric not rejected');
    console.log('PASS annotation / evaluation import parser contract cases');
  } catch (error) { failures.push('Result import parsers'); console.error('FAIL Result import parsers',error.stack||error); }
  // Deliberately compare a cross-domain pair: model impact and sample overlap are not inferred.
  try {
    const component=await server.ssrLoadModule('/src/RunComparisonWorkspace.jsx');
    const html=renderToStaticMarkup(React.createElement(component.RunComparisonWorkspace,{...common}));
    if (!html.includes('Not directly comparable') || !html.includes('Not recorded'))throw new Error('Unmatched run summaries shown as comparable');
    console.log('PASS Unmatched run scope is not marked comparable');
  }catch(error){failures.push('Comparison scope guard');console.error('FAIL Comparison scope guard',error.stack||error)}
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
