import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, CircleAlert, CircleDot, Copy, FileCode2, GitBranch, Layers3, LockKeyhole, Plus, Save, Settings2, ShieldCheck, Workflow, X } from 'lucide-react';
import { Badge, Button, DemoNote, PageHeader } from './components/UI.jsx';
import './pipelines.css';

const stageCatalog = {
  source: { title: 'Pool Snapshot', description: 'Immutable candidate input', implementation: ['pool-registry'] },
  eligibility: { title: 'Eligibility', description: 'Exclude reserved and ineligible samples', implementation: ['pool-eligibility'] },
  dedup: { title: 'Quality & Dedup', description: 'Filter corrupt and redundant frames', implementation: ['exact-near-dedup', 'none'] },
  domain: { title: 'Domain Partitioning', description: 'Represent and partition visual domains', implementation: ['dinov2-faiss', 'siglip-faiss'] },
  prediction: { title: 'Predictions', description: 'Registered detector inference', implementation: ['registered-detector'] },
  embedding: { title: 'Embedding', description: 'Feature extraction for similarity', implementation: ['dinov2', 'siglip'] },
  uncertainty: { title: 'Uncertainty', description: 'Score uncertain detections', implementation: ['least-confidence', 'entropy', 'margin'] },
  diversity: { title: 'Diversity', description: 'Prioritize coverage of different examples', implementation: ['facility-location', 'farthest-first'] },
  selection: { title: 'Sample Selection', description: 'Select exactly N eligible samples', implementation: ['hybrid', 'random', 'uncertainty-only'] },
  privacy: { title: 'Privacy Gate', description: 'Anonymize and verify before export', implementation: ['face-plate-mask'] },
  output: { title: 'Curated Batch', description: 'Produce a reviewable selection batch', implementation: ['selection-batch-v1'] }
};

const required = new Set(['source', 'eligibility', 'selection', 'privacy', 'output']);
const defaultSteps = [
  ['source', []],
  ['eligibility', ['source']],
  ['dedup', ['eligibility']],
  ['prediction', ['eligibility']],
  ['embedding', ['dedup']],
  ['uncertainty', ['prediction']],
  ['diversity', ['embedding']],
  ['selection', ['uncertainty', 'diversity']],
  ['privacy', ['selection']],
  ['output', ['privacy']]
];
const asStage = (type, dependsOn = [], index = 0) => ({
  id: type + (index ? '-' + index : ''), type, enabled: true, label: stageCatalog[type].title,
  implementation: stageCatalog[type].implementation[0], dependsOn
});
export const initialPipelineDefinitions = [
  {
    id: 'al-selection-v1', familyId: 'al-selection', name: 'Active Learning Selection',
    description: 'Canonical selection pipeline from an immutable pool to a privacy-safe review batch.',
    version: 1, status: 'published', updatedAt: '2026-10-08T10:00:00.000Z',
    origin: 'bundled', stages: defaultSteps.map(([type, deps]) => asStage(type, deps)),
  },
  {
    id: 'quality-screen-v1', familyId: 'quality-screen', name: 'Data Quality Screening',
    description: 'Example definition for evaluating incoming samples before mining.',
    version: 1, status: 'draft', updatedAt: '2026-10-09T09:00:00.000Z',
    origin: 'fixture', stages: [
      asStage('source'), asStage('eligibility', ['source']), asStage('dedup', ['eligibility']),
      asStage('selection', ['dedup']), asStage('privacy', ['selection']), asStage('output', ['privacy'])
    ]
  }
];
const copy = x => JSON.parse(JSON.stringify(x));
const statusLabel = d => d.status === 'published' ? 'Published' : 'Draft';
const dateLabel = t => new Date(t).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
function validate(d) {
  const issues = [];
  const enabled = d.stages.filter(n => n.enabled);
  const ids = new Set(enabled.map(n => n.id));
  if (!d.name.trim()) issues.push('Pipeline name is required.');
  if (new Set(d.stages.map(n => n.id)).size !== d.stages.length) issues.push('Stage IDs must be unique.');
  for (const type of required) if (!enabled.some(n => n.type === type)) issues.push('Required stage missing: ' + stageCatalog[type].title + '.');
  for (const stage of enabled) {
    if (!stageCatalog[stage.type]) { issues.push('Unknown stage type: ' + stage.type); continue; }
    if (!stageCatalog[stage.type].implementation.includes(stage.implementation)) issues.push(stage.label + ' uses an unknown implementation.');
    for (const dep of stage.dependsOn) {
      if (dep === stage.id) issues.push(stage.label + ' cannot depend on itself.');
      else if (!ids.has(dep)) issues.push(stage.label + ' depends on a disabled or missing stage: ' + dep + '.');
    }
    if (stage.type !== 'source' && !stage.dependsOn.length) issues.push(stage.label + ' has no input dependency.');
  }
  const byId = new Map(enabled.map(n => [n.id, n]));
  const state = new Map();
  const visit = id => {
    if (state.get(id) === 1) return false;
    if (state.get(id) === 2) return true;
    state.set(id, 1);
    const node = byId.get(id);
    for (const dep of node?.dependsOn || []) if (byId.has(dep) && !visit(dep)) return false;
    state.set(id, 2); return true;
  };
  if (!enabled.every(n => visit(n.id))) issues.push('Cycle detected: dependencies must form a DAG.');
  const find = type => enabled.find(n => n.type === type);
  for (const [from, to] of [['source','eligibility'], ['selection','privacy'], ['privacy','output']]) {
    const target = find(to);
    if (target && find(from) && !target.dependsOn.includes(find(from).id)) issues.push(stageCatalog[to].title + ' must depend on ' + stageCatalog[from].title + '.');
  }
  return [...new Set(issues)];
}
function graphLayout(stages) {
  const active = stages.filter(n => n.enabled);
  const byId = new Map(active.map(n => [n.id,n]));
  const cache = new Map();
  const depth = (node, seen = new Set()) => {
    if (cache.has(node.id)) return cache.get(node.id);
    if (seen.has(node.id)) return 0;
    const next = new Set(seen); next.add(node.id);
    const value = Math.min(10, Math.max(0, ...node.dependsOn.map(id => byId.has(id) ? depth(byId.get(id), next) + 1 : 0)));
    cache.set(node.id, value); return value;
  };
  const buckets = new Map();
  active.forEach(n => { const level = depth(n); buckets.set(level, [...(buckets.get(level) || []), n]); });
  const locations = {};
  const maxColumn = Math.max(0,...buckets.keys());
  const tallest = Math.max(1,...[...buckets.values()].map(g=>g.length));
  for (const [level, group] of buckets.entries()) {
    group.forEach((n,index) => { locations[n.id] = { x: 28+level*216, y: 34+index*114+(tallest-group.length)*54 }; });
  }
  return { locations, width: Math.max(470, maxColumn*216+252), height: Math.max(270, tallest*114+68), active };
}
function statusOf(run) { return run?.status || 'No runs'; }
export function PipelineDefinitions({ definitions, setDefinitions, runs = [], navigate, notify }) {
  const [selectedId, setSelectedId] = useState('al-selection-v1');
  const selected = definitions.find(d => d.id === selectedId) || definitions[0];
  const [draft, setDraft] = useState(() => copy(selected || initialPipelineDefinitions[0]));
  const [selectedStage, setSelectedStage] = useState('selection');
  const [tab, setTab] = useState('graph');
  const [search, setSearch] = useState('');
  const [newStageType, setNewStageType] = useState('domain');
  useEffect(() => { if (selected) { setDraft(copy(selected)); setSelectedStage('selection'); setTab('graph'); } }, [selectedId, selected]);
  const isEditable = draft.status === 'draft';
  const dirty = Boolean(selected && JSON.stringify(selected) !== JSON.stringify(draft));
  const problems = useMemo(() => validate(draft), [draft]);
  const layout = useMemo(() => graphLayout(draft.stages), [draft.stages]);
  const inspected = draft.stages.find(n => n.id === selectedStage) || draft.stages[0];
  const familyRuns = runs.filter(r => r.pipelineDefinitionId === selected?.id || (selected?.id === 'al-selection-v1' && r.type === 'Mining' && !r.pipelineDefinitionId));
  const runnable = draft.id === 'al-selection-v1' && draft.status === 'published' && !dirty;
  const updateDraft = patch => setDraft(previous => ({ ...previous, ...patch }));
  const changeNode = patch => setDraft(previous => ({...previous, stages: previous.stages.map(n => n.id === selectedStage ? {...n,...patch} : n) }));
  const makeDraft = (base = selected, blank = false) => {
    if (!base) return;
    const familyId = blank ? 'custom-' + Date.now().toString(36) : base.familyId;
    const version = blank ? 1 : Math.max(0,...definitions.filter(d=>d.familyId===familyId).map(d=>d.version)) + 1;
    const now = Date.now().toString(36);
    const fresh = { ...copy(base), id: 'pipeline-' + now, familyId,
      version, status:'draft', updatedAt:new Date().toISOString(), origin:'user',
      name: blank ? 'Untitled pipeline' : base.name,
      description: blank ? 'New editable pipeline definition.' : base.description };
    setDefinitions(list => [fresh,...list]); setSelectedId(fresh.id);
    notify(blank ? 'New pipeline draft created · local demo' : 'Editable draft created · local demo');
  };
  const saveDraft = () => {
    if (!isEditable) return;
    const saved = {...draft,updatedAt:new Date().toISOString()};
    setDefinitions(list => list.map(d => d.id === saved.id ? saved : d));
    notify('Definition draft saved locally');
  };
  const publish = () => {
    if (!isEditable || problems.length) { notify('Resolve definition validation issues before publishing'); return; }
    const saved = {...draft,status:'published',updatedAt:new Date().toISOString()};
    setDefinitions(list => list.map(d => d.id === saved.id ? saved : d));
    notify('Definition published locally · execution support is separate');
  };
  const addStage = () => {
    const type = newStageType;
    const index = draft.stages.filter(n=>n.type===type).length;
    const current = draft.stages.find(n=>n.id===selectedStage && n.enabled);
    const node = asStage(type, [current?.id || 'source'], index+1);
    setDraft(d => ({...d,stages:[...d.stages,node]}));
    setSelectedStage(node.id);
  };
  const toggleStage = node => {
    if (required.has(node.type)) return;
    changeNode({enabled:!node.enabled});
  };
  const removeStage = node => {
    if (required.has(node.type)) return;
    setDraft(d=>({...d,stages:d.stages.filter(s=>s.id!==node.id).map(s=>({...s,dependsOn:s.dependsOn.filter(dep=>dep!==node.id)}))}));
    setSelectedStage('selection');
  };
  const toggleDep = id => changeNode({dependsOn:inspected.dependsOn.includes(id) ? inspected.dependsOn.filter(k=>k!==id) : [...inspected.dependsOn,id]});
  const filtered = definitions.filter(d => (d.name + d.description + d.id).toLowerCase().includes(search.toLowerCase()));
  return <div className="page pipeline-page">
    <PageHeader eyebrow="Workflow design / Definitions" title="Pipeline Definitions" description="Versioned workflows, editable stages, and explicit execution contracts." actions={<><Button icon={Plus} onClick={()=>makeDraft(selected,true)}>New pipeline</Button><Button icon={Copy} onClick={()=>makeDraft()}>Clone as draft</Button></>}/>
    <DemoNote>Frontend-only pipeline design concept · definitions are saved in this browser. Custom DAGs do not execute on a backend.</DemoNote>
    <div className="pipeline-overview">
      <div><strong>{definitions.length}</strong><span>Definitions</span></div>
      <div><strong>{definitions.filter(d=>d.status==='published').length}</strong><span>Published versions</span></div>
      <div><strong>{definitions.filter(d=>d.status==='draft').length}</strong><span>Editable drafts</span></div>
      <div><strong>{familyRuns.length}</strong><span>Related demo runs</span></div>
    </div>
    <div className="pipeline-layout">
      <aside className="pipeline-catalog" aria-label="Pipeline definitions">
        <div className="pipeline-section-heading"><strong>Definitions</strong><span>Local registry</span></div>
        <input className="pipeline-search" value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search pipeline definitions" placeholder="Search definitions..." />
        <div className="pipeline-catalog-items">
          {filtered.map(d=><button className={'pipeline-def-item'+(selected?.id===d.id?' is-selected':'')} key={d.id} onClick={()=>setSelectedId(d.id)} aria-current={selected?.id===d.id?'true':undefined}>
            <span className="pipeline-def-icon"><Workflow size={17}/></span>
            <span className="pipeline-def-copy"><strong>{d.name}</strong><small>v{d.version} · {dateLabel(d.updatedAt)}</small></span>
            <span className={'pipeline-mini-status '+(d.status==='published'?'is-published':'')}>{statusLabel(d)}</span>
          </button>)}
          {!filtered.length&&<p className="pipeline-muted pipeline-empty">No matching definitions.</p>}
        </div>
        <div className="pipeline-catalog-footer"><ShieldCheck size={16}/><span>Published definitions are immutable. Clone to modify them.</span></div>
      </aside>
      <section className="pipeline-canvas-section" aria-label="Definition editor">
        <div className="pipeline-definition-heading">
          <div><span className="pipeline-overline">PIPELINE / {draft.familyId} / VERSION {draft.version}</span>
            {isEditable?<input className="pipeline-name-input" aria-label="Pipeline name" value={draft.name} onChange={e=>updateDraft({name:e.target.value})}/>:<h2>{draft.name}</h2>}
            <p>{draft.description}</p>
          </div>
          <span className={'pipeline-status '+(isEditable?'pipeline-status--draft':'pipeline-status--published')}>{isEditable?'Draft':'Published'}</span>
        </div>
        <div className="pipeline-definition-actions">
          <div className="pipeline-tabs" role="tablist" aria-label="Definition sections">
            {[['graph','Graph'],['config','JSON'],['versions','Versions']].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}
          </div>
          <div className="pipeline-action-buttons">
            {isEditable?<><Button icon={Save} onClick={saveDraft} disabled={!dirty}>Save draft</Button><Button variant="primary" icon={Check} onClick={publish} disabled={Boolean(problems.length)}>Publish</Button></>:<Button icon={Copy} onClick={()=>makeDraft()}>New draft</Button>}
          </div>
        </div>
        {tab==='graph'&&<>
          <div className="pipeline-graph-toolbar"><span><GitBranch size={15}/> Execution dependencies · {layout.active.length} enabled stages</span><span>Scroll horizontally to explore</span></div>
          <div className="pipeline-graph-scroll" tabIndex={0} aria-label="Scrollable pipeline graph">
            <div className="pipeline-graph-board" style={{width:layout.width,height:layout.height}}>
              <svg className="pipeline-graph-edges" width={layout.width} height={layout.height} viewBox={'0 0 '+layout.width+' '+layout.height} aria-hidden="true">
                <defs><marker id="pipeline-edge-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="currentColor" strokeWidth="1.2"/></marker></defs>
                {layout.active.flatMap(n=>n.dependsOn.filter(id=>layout.locations[id]).map(id=>{
                  const a=layout.locations[id], b=layout.locations[n.id];if(!a||!b) return null;
                  return <path key={id+'--'+n.id} d={'M'+(a.x+174)+' '+(a.y+40)+' C'+(a.x+193)+' '+(a.y+40)+' '+(b.x-16)+' '+(b.y+40)+' '+b.x+' '+(b.y+40)} fill="none" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#pipeline-edge-arrow)"/>;
                }))}
              </svg>
              {layout.active.map(n=><button key={n.id} type="button" className={'pipeline-node'+(selectedStage===n.id?' pipeline-node--selected':'')} style={{left:layout.locations[n.id].x,top:layout.locations[n.id].y}} onClick={()=>setSelectedStage(n.id)} aria-pressed={selectedStage===n.id}>
                <span className="pipeline-node-kind">{required.has(n.type)?<LockKeyhole size={12}/>:<CircleDot size={12}/>} {n.type.toUpperCase()}</span>
                <strong>{n.label}</strong><small>{n.implementation}</small>
              </button>)}
            </div>
          </div>
          <div className="pipeline-stage-footer"><div><strong>Stage catalog</strong><span>{isEditable?'Select a type and add it to this draft.':'Clone a published definition to add or remove stages.'}</span></div>
            {isEditable&&<div className="pipeline-add-controls"><select aria-label="New stage type" value={newStageType} onChange={e=>setNewStageType(e.target.value)}>{Object.entries(stageCatalog).filter(([id])=>!required.has(id)).map(([id,item])=><option key={id} value={id}>{item.title}</option>)}</select><Button icon={Plus} onClick={addStage}>Add stage</Button></div>}
          </div>
        </>}
        {tab==='config'&&<div className="pipeline-json-view"><div><FileCode2 size={17}/><strong>Definition snapshot</strong><Button onClick={()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(JSON.stringify(draft,null,2)).then(()=>notify('Definition copied')).catch(()=>notify('Clipboard unavailable'));}}>Copy JSON</Button></div><pre>{JSON.stringify(draft,null,2)}</pre><p>Read-only JSON preview. Edit the draft through the graph and inspector; runtime configuration lives in Launchpad.</p></div>}
        {tab==='versions'&&<div className="pipeline-versions"><h3>Version history</h3>{definitions.filter(d=>d.familyId===draft.familyId).sort((a,b)=>b.version-a.version).map(d=><button key={d.id} className={selected?.id===d.id?'selected':''} onClick={()=>setSelectedId(d.id)}><span>v{d.version} · {statusLabel(d)}</span><small>{dateLabel(d.updatedAt)}</small><ArrowRight size={16}/></button>)}</div>}
        <div className={'pipeline-validation'+(problems.length?' pipeline-validation--invalid':'')}>
          {problems.length?<><CircleAlert size={18}/><div><strong>{problems.length} definition issue{problems.length!==1?'s':''}</strong>{problems.map((p,i)=><p key={i}>{p}</p>)}</div></>:<><CheckCircle2 size={18}/><div><strong>Definition schema checks passed</strong><p>DAG, required stages, and dependency references are consistent. This does not confirm backend execution support.</p></div></>}
        </div>
      </section>
      <aside className="pipeline-inspector" aria-label="Definition inspector">
        <div className="pipeline-section-heading"><strong>Inspector</strong><Settings2 size={16}/></div>
        {tab==='graph'&&inspected?<div className="pipeline-inspector-content">
          <span className="pipeline-overline">STAGE CONFIGURATION</span>
          <h3>{inspected.label}</h3>
          <p>{stageCatalog[inspected.type]?.description}</p>
          <div className="pipeline-field"><label htmlFor="pipeline-stage-label">Display name</label><input id="pipeline-stage-label" disabled={!isEditable} value={inspected.label} onChange={e=>changeNode({label:e.target.value})}/></div>
          <div className="pipeline-field"><label htmlFor="pipeline-stage-implementation">Implementation</label><select id="pipeline-stage-implementation" disabled={!isEditable} value={inspected.implementation} onChange={e=>changeNode({implementation:e.target.value})}>{(stageCatalog[inspected.type]?.implementation||[]).map(v=><option key={v} value={v}>{v}</option>)}</select></div>
          <div className="pipeline-stage-enable"><span>{required.has(inspected.type)?'Required stage':'Enabled'}</span>{required.has(inspected.type)?<LockKeyhole size={17}/>:<input type="checkbox" aria-label="Enable stage" disabled={!isEditable} checked={inspected.enabled} onChange={()=>toggleStage(inspected)}/>}</div>
          <div className="pipeline-deps"><strong>Depends on</strong><p>Choose upstream stages. Invalid edges and cycles block publishing.</p>
            {draft.stages.filter(n=>n.id!==inspected.id&&n.enabled).map(n=><label key={n.id}><input type="checkbox" disabled={!isEditable || (inspected.type==='source')} checked={inspected.dependsOn.includes(n.id)} onChange={()=>toggleDep(n.id)}/><span>{n.label}</span></label>)}
          </div>
          {isEditable&&!required.has(inspected.type)&&<Button className="pipeline-remove-stage" icon={X} onClick={()=>removeStage(inspected)}>Remove stage</Button>}
        </div>:<div className="pipeline-inspector-content"><h3>Definition information</h3><p>Select Graph to inspect stages, dependencies, and implementations.</p></div>}
        <div className="pipeline-inspector-bottom"><strong>Execution readiness</strong><p>{runnable?'Bundled Selection v1 supports the existing local simulated selection runner.':'Custom and edited definitions are design-only until a compatible executor contract is implemented.'}</p>
          {runnable?<Button variant="primary" icon={ArrowRight} onClick={()=>navigate('mining?definition=al-selection-v1')}>Open Launchpad</Button>:<Button onClick={()=>navigate('mining?definition=al-selection-v1')}>Open existing Selection Launchpad</Button>}
          <Button onClick={()=>navigate('history')}>View runs</Button>
        </div>
      </aside>
    </div>
  </div>;
}