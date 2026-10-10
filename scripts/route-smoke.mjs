import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Build-only checks miss undefined names that are only read during React render.
// Exercise every top-level view and both registry/detail rendering paths.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const views = await server.ssrLoadModule('/src/Pages.jsx');
  const pipelineViews = await server.ssrLoadModule('/src/PipelineDefinitions.jsx');
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
    ['Mining', 'mining', '/mining'],
    ['Selection Batches', 'batches', '/batches'],
    ['Runs', 'history', '/history'],
    ['Strategy Comparison', 'comparison', '/comparison'],
    ['Settings', 'settings', '/settings'],
    ['System', 'system', '/system'],
    ['Onboarding', 'onboarding', '/onboarding'],
  ];
  const components = {
    pools: views.Pools, datasets: views.Datasets, 'data-explorer': views.Explorer,
    import: views.ImportData, pipelines: pipelineViews.PipelineDefinitions, mining: views.Mining, batches: views.SelectionBatches,
    history: views.History, comparison: views.StrategyComparison, settings: views.SettingsPage,
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
      console.log('PASS', label, html.length, 'chars');
    } catch (error) {
      failures.push(label);
      console.error('FAIL', label, error.stack || error);
    }
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
