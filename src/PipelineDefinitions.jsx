import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, CircleAlert, CircleDot, Copy, GitBranch, LockKeyhole, Maximize2, Minus, MousePointer2, Plus, Save, Search, Settings2, Workflow, X } from 'lucide-react';
import { Button } from './components/UI.jsx';
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

const ioContracts = {
  source:['External Pool Snapshot','Immutable candidate manifest'],
  eligibility:['Pool snapshot','Eligible sample IDs'],
  dedup:['Eligible sample IDs','Deduplicated candidates'],
  domain:['Candidate features','Domain assignments'],
  prediction:['Candidate images + model reference','Prediction metadata'],
  embedding:['Candidate images','Feature vectors'],
  uncertainty:['Prediction metadata','Uncertainty scores'],
  diversity:['Feature vectors','Diversity scores'],
  selection:['Scored eligible candidates','EXACT-N selection'],
  privacy:['Selected samples','Anonymized samples + verification'],
  output:['Approved safe selection','Reviewable batch manifest']
};
const stageCategories = [
  ['All','All'],['Source','Source'],['Preprocessing','Preprocessing'],
  ['Mining','Mining'],['Selection','Selection'],['Privacy','Privacy'],['Output','Output']
];
const stageCategory = {
  source:'Source',eligibility:'Preprocessing',dedup:'Preprocessing',domain:'Mining',
  prediction:'Mining',embedding:'Mining',uncertainty:'Mining',diversity:'Mining',
  selection:'Selection',privacy:'Privacy',output:'Output'
};
const stageConfig = stage => ({
  label:stage.label,implementation:stage.implementation,enabled:stage.enabled,
  dependsOn:[...stage.dependsOn],params:stage.params || {}
});
function checkStageConfigJSON(json, stage, stages) {
  if(!stage) return {error:'Select a stage first.',config:null};
  try {
    const data=JSON.parse(json);
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Expected a JSON object.');
    const keys=Object.keys(data);
    if(keys.some(k=>!['label','implementation','enabled','dependsOn','params'].includes(k)))throw Error('Only label, implementation, enabled, dependsOn and params are editable.');
    if(typeof data.label!=='string'||!data.label.trim())throw Error('label must be a non-empty string.');
    if(!stageCatalog[stage.type]?.implementation.includes(data.implementation))throw Error('Choose a registered implementation for this stage.');
    if(typeof data.enabled!=='boolean')throw Error('enabled must be a boolean.');
    if(required.has(stage.type)&&!data.enabled)throw Error('Required stages cannot be disabled.');
    if(!Array.isArray(data.dependsOn)||data.dependsOn.some(k=>typeof k!=='string'))throw Error('dependsOn must be an array of stage IDs.');
    if(new Set(data.dependsOn).size!==data.dependsOn.length)throw Error('Duplicate dependencies are not allowed.');
    if(data.dependsOn.includes(stage.id))throw Error('A stage cannot depend on itself.');
    if(data.dependsOn.some(k=>!stages.some(n=>n.id===k&&n.enabled)))throw Error('Dependencies must reference enabled stages.');
    if(stage.type==='source'&&data.dependsOn.length)throw Error('Source cannot have upstream dependencies.');
    if(data.params===null||typeof data.params!=='object'||Array.isArray(data.params))throw Error('params must be a JSON object.');
    return {error:null,config:data};
  }catch(error){return {error:error.message,config:null};}
}
function nextDraft(definitions, from, newFamily = false) {
  const familyId = newFamily ? 'custom-' + Date.now().toString(36) : from.familyId;
  const version = newFamily ? 1 : Math.max(0,...definitions.filter(d => d.familyId === familyId).map(d => d.version)) + 1;
  return { ...copy(from), id:'pipeline-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6),
    familyId, version, name:newFamily?'Untitled Pipeline':from.name,
    description:newFamily?'Configure stages and dependencies to create a new workflow.':from.description,
    status:'draft', updatedAt:new Date().toISOString(), origin:'user' };
}
export function PipelineDefinitions({ definitions, setDefinitions, runs = [], navigate, notify, routePath = '/pipelines' }) {
  const routeId = decodeURIComponent(routePath.split('?')[0].split('/')[2] || '');
  const inEditor = Boolean(routeId);
  const active = definitions.find(d => d.id === routeId);
  const [draft,setDraft] = useState(() => copy(active || definitions[0] || initialPipelineDefinitions[0]));
  const [selectedStage,setSelectedStage] = useState(null);
  const [inspectorMode,setInspectorMode] = useState('form');
  const [stageJSON,setStageJSON] = useState('');
  const [versionOpen,setVersionOpen] = useState(false);
  const [validationOpen,setValidationOpen] = useState(false);
  const [query,setQuery] = useState('');
  const [pickerOpen,setPickerOpen] = useState(false);
  const [catalogOpen,setCatalogOpen] = useState(false);
  const [catalogQuery,setCatalogQuery] = useState('');
  const [catalogFilter,setCatalogFilter] = useState('All');
  const [zoom,setZoom] = useState(1);
  const [pan,setPan] = useState({x:0,y:0});
  const canvasRef = React.useRef(null);
  const dragRef = React.useRef(null);
  useEffect(()=>{
    if (active) setDraft(copy(active));
    setSelectedStage(null);
    setPickerOpen(false);setCatalogOpen(false);setVersionOpen(false);setValidationOpen(false);setInspectorMode('form');
  },[routeId]);
  const selected = draft.stages.find(n=>n.id===selectedStage) || null;
  useEffect(()=>{
    if(selected) setStageJSON(JSON.stringify(stageConfig(selected),null,2));
    setInspectorMode('form');
  },[selectedStage]);
  const jsonCheck = useMemo(()=>checkStageConfigJSON(stageJSON,selected,draft.stages),[stageJSON,selectedStage,draft.stages]);
  const filteredStages = Object.entries(stageCatalog).filter(([type,item])=>
    (catalogFilter==='All'||stageCategory[type]===catalogFilter) &&
    (item.title+' '+item.description+' '+type).toLowerCase().includes(catalogQuery.toLowerCase())
  );
  const problems = useMemo(()=>validate(draft),[draft]);
  const layoutKey = draft.stages.map(n=>[n.id,n.enabled,n.dependsOn.join(',')].join(':')).join('|');
  const layout = useMemo(()=>graphLayout(draft.stages),[layoutKey]);
  const editable = draft.status==='draft';
  const dirty = Boolean(active && JSON.stringify(active)!==JSON.stringify(draft));
  const assignedRuns = d => runs.filter(r => r.pipelineDefinitionId===d.id || (d.id==='al-selection-v1' && r.type==='Mining' && !r.pipelineDefinitionId));
  const compatibleRunner = Boolean(active?.id==='al-selection-v1' && draft.status==='published' && !dirty);

  const fitView = () => {
    const el=canvasRef.current;
    if(!el) return;
    const w=el.clientWidth,h=el.clientHeight;
    if(w<1||h<1)return;
    const z=Math.min(1.15,Math.max(.23,Math.min((w-56)/layout.width,(h-56)/layout.height)));
    setZoom(z);
    setPan({x:(w-layout.width*z)/2,y:(h-layout.height*z)/2});
  };
  useEffect(() => {
    if(!inEditor) return;
    const el=canvasRef.current;
    if(!el)return;
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>fitView()):null;
    observer?.observe(el);
    fitView();
    if(!observer){window.addEventListener('resize',fitView);return()=>window.removeEventListener('resize',fitView);}
    return()=>observer.disconnect();
  },[routeId,layout.width,layout.height,selectedStage!==null,catalogOpen]);
  useEffect(()=>{
    if(!inEditor)return;
    const el=canvasRef.current;
    if(!el)return;
    const wheel=e=>{
      if(!e.ctrlKey&&!e.metaKey){e.preventDefault();setPan(p=>({x:p.x-e.deltaX,y:p.y-e.deltaY}));return;}
      e.preventDefault();
      const rect=el.getBoundingClientRect();
      const mx=e.clientX-rect.left,my=e.clientY-rect.top;
      const nextZoom=Math.min(1.7,Math.max(.25,zoom*Math.exp(-e.deltaY*.002)));
      const ratio=nextZoom/zoom;
      setPan(p=>({x:mx-(mx-p.x)*ratio,y:my-(my-p.y)*ratio}));
      setZoom(nextZoom);
    };
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>el.removeEventListener('wheel',wheel);
  },[routeId,zoom]);
  useEffect(()=>{
    const esc=e=>{if(e.key==='Escape'){setSelectedStage(null);setPickerOpen(false);setCatalogOpen(false);setVersionOpen(false);setValidationOpen(false);}};
    window.addEventListener('keydown',esc);
    return()=>window.removeEventListener('keydown',esc);
  },[]);
  const moveZoom = direction => {
    const rect=canvasRef.current?.getBoundingClientRect();
    if(!rect)return;
    const z=Math.min(1.7,Math.max(.25,zoom*(direction>0?1.2:1/1.2)));
    const cx=rect.width/2,cy=rect.height/2,ratio=z/zoom;
    setPan(p=>({x:cx-(cx-p.x)*ratio,y:cy-(cy-p.y)*ratio}));setZoom(z);
  };
  const onPointerDown=e=>{
    if(e.button!==0 || e.target.closest('button'))return;
    dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,pan};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove=e=>{
    const drag=dragRef.current;
    if(drag?.id!==e.pointerId)return;
    setPan({x:drag.pan.x+e.clientX-drag.x,y:drag.pan.y+e.clientY-drag.y});
  };
  const onPointerUp=e=>{
    const drag=dragRef.current;
    if(drag?.id===e.pointerId){
      const distance=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);
      dragRef.current=null;
      if(distance<5){setSelectedStage(null);}
    }
    if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const make = (from, fresh = false) => {
    const next=nextDraft(definitions,from,fresh);
    setDefinitions(d=>[next,...d]);
    notify(fresh?'New pipeline created locally':'Editable version created locally');
    navigate('pipelines/'+encodeURIComponent(next.id));
  };
  const save=()=>{
    if(!editable)return;
    const saved={...draft,updatedAt:new Date().toISOString()};
    setDefinitions(d=>d.map(x=>x.id===saved.id?saved:x));
    setDraft(saved);
    notify('Draft saved in this browser');
  };
  const publish=()=>{
    if(!editable||problems.length){notify('Resolve definition validation issues first');return;}
    const saved={...draft,status:'published',updatedAt:new Date().toISOString()};
    setDefinitions(d=>d.map(x=>x.id===saved.id?saved:x));
    setDraft(saved);
    notify('Definition published locally; executor support is separate');
  };
  const changeNode=patch=>setDraft(d=>({...d,stages:d.stages.map(n=>n.id===selectedStage?{...n,...patch}:n)}));
  const removeStage=()=>{
    if(!selected||required.has(selected.type))return;
    setDraft(d=>({...d,stages:d.stages.filter(n=>n.id!==selected.id).map(n=>({...n,dependsOn:n.dependsOn.filter(x=>x!==selected.id)}))}));
    setSelectedStage(null);
  };
  const addStage=type=>{
    if(!editable)return;
    if(required.has(type) && draft.stages.some(n=>n.type===type)) {
      notify('Required stage already exists in this definition');
      return;
    }
    const suffix=1+Math.max(0,...draft.stages.filter(n=>n.type===type).map(n=>{
      const m=n.id.match(/-(\d+)$/);return m?Number(m[1]):1;
    }));
    const id=draft.stages.some(n=>n.id===type)?type+'-'+suffix:type;
    const upstream=selected?.enabled?selected.id:'eligibility';
    const newNode=asStage(type,[upstream]);
    newNode.id=id;
    if(id!==type)newNode.label=stageCatalog[type].title+' '+suffix;
    setDraft(d=>({...d,stages:[...d.stages,newNode]}));
    setSelectedStage(id);setInspectorMode('form');setCatalogOpen(false);
  };
  const applyStageJSON=()=>{
    if(!editable||jsonCheck.error||!jsonCheck.config)return;
    changeNode(jsonCheck.config);
    setInspectorMode('form');
    notify('Stage configuration applied to the draft');
  };
  const copyDefinition=()=>{
    if(!navigator.clipboard?.writeText){notify('Clipboard unavailable');return;}
    navigator.clipboard.writeText(JSON.stringify(draft,null,2))
      .then(()=>notify('Definition JSON copied')).catch(()=>notify('Clipboard unavailable'));
  };
  const filtered=definitions.filter(d=>(d.name+' '+d.id+' '+d.description).toLowerCase().includes(query.toLowerCase()));
  if(!inEditor) return <div className="page pipeline-registry-page">
    <div className="pipeline-registry-header">
      <div><span className="pipeline-kicker">WORKFLOWS</span><h1>Pipelines</h1><p>Define, version and launch repeatable data workflows.</p></div>
      <Button variant="primary" icon={Plus} onClick={()=>make(definitions.find(d=>d.id==='al-selection-v1')||definitions[0]||initialPipelineDefinitions[0],true)}>Create Pipeline</Button>
    </div>
    <div className="pipeline-registry-toolbar">
      <div className="pipeline-search"><Search size={15}/><input aria-label="Search pipelines" placeholder="Search pipelines..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <span>{definitions.length} versions</span>
    </div>
    <div className="pipeline-registry-table-wrap">
      <table className="pipeline-registry-table"><thead><tr><th>Pipeline</th><th>Version</th><th>Status</th><th>Stages</th><th>Runs</th><th>Updated</th><th></th></tr></thead><tbody>
        {filtered.map(d=><tr key={d.id}>
          <td><button className="pipeline-row-link" onClick={()=>navigate('pipelines/'+encodeURIComponent(d.id))}><Workflow size={17}/><span><strong>{d.name}</strong><small>{d.description}</small></span></button></td>
          <td>v{d.version}</td><td><span className={'pipeline-state '+(d.status==='published'?'is-published':'')}>{statusLabel(d)}</span></td>
          <td>{d.stages.filter(n=>n.enabled).length}</td><td>{assignedRuns(d).length}</td><td>{dateLabel(d.updatedAt)}</td>
          <td><button className="pipeline-link-action" onClick={()=>navigate('pipelines/'+encodeURIComponent(d.id))}>Open <ArrowRight size={14}/></button></td>
        </tr>)}
        {!filtered.length&&<tr><td colSpan={7}><p className="pipeline-no-results">No matching pipelines.</p></td></tr>}
      </tbody></table>
    </div>
    <p className="pipeline-source-note">Preview · Definitions are stored locally in this browser. Published versions cannot be edited directly.</p>
  </div>;

  if(!active) return <div className="page pipeline-missing"><h1>Pipeline not found</h1><p>This definition is not available in your local registry.</p><Button onClick={()=>navigate('pipelines')}>Back to Pipelines</Button></div>;
  return <div className="pipeline-editor-page">
    <header className="pipeline-editor-header">
      <div className="pipeline-editor-identity">
        <button className="pipeline-icon-button" aria-label="Back to Pipelines" title="Back to Pipelines" onClick={()=>navigate('pipelines')}><ArrowLeft size={17}/></button>
        <div className="pipeline-title-area">
          <button className="pipeline-title-trigger" aria-expanded={pickerOpen} onClick={()=>{setPickerOpen(v=>!v);setAddOpen(false);}}>
            <span>{draft.name}</span><ChevronDown size={14}/>
          </button>
          <div className="pipeline-title-meta">v{draft.version} · <span className={editable?'':'pipeline-published-text'}>{editable?'Draft':'Published'}</span> <span className="pipeline-local-note">· Preview / Local only</span></div>
        </div>
        {pickerOpen&&<div className="pipeline-picker-popover">
          <div className="pipeline-picker-title">Switch pipeline</div>
          {definitions.map(d=><button key={d.id} onClick={()=>navigate('pipelines/'+encodeURIComponent(d.id))} className={d.id===routeId?'active':''}><span>{d.name}</span><small>v{d.version} · {statusLabel(d)}</small></button>)}
          <button className="pipeline-picker-footer" onClick={()=>navigate('pipelines')}>View all pipelines <ArrowRight size={13}/></button>
        </div>}
      </div>
      <div className="pipeline-editor-actions">
        <div className="pipeline-header-popover-anchor">
          <button className="pipeline-header-version" aria-expanded={versionOpen}
            onClick={()=>{setVersionOpen(v=>!v);setValidationOpen(false);setPickerOpen(false);}}>
            v{draft.version} <ChevronDown size={13}/>
          </button>
          {versionOpen&&<div className="pipeline-toolbar-popover pipeline-versions-popover">
            <strong>Version history</strong>
            {definitions.filter(d=>d.familyId===draft.familyId).sort((a,b)=>b.version-a.version).map(d=>
              <button key={d.id} onClick={()=>{setVersionOpen(false);navigate('pipelines/'+encodeURIComponent(d.id));}}>
                <span>v{d.version} · {statusLabel(d)}</span><small>{dateLabel(d.updatedAt)}</small>
              </button>)}
            <button className="pipeline-copy-definition" onClick={()=>{copyDefinition();setVersionOpen(false);}}><Copy size={13}/> Copy definition JSON</button>
          </div>}
        </div>
        <div className="pipeline-header-popover-anchor">
          <button className={'pipeline-validation-pill '+(problems.length?'has-errors':'')} onClick={()=>{setValidationOpen(v=>!v);setVersionOpen(false);}} aria-label="Show validation results" aria-expanded={validationOpen}>
            {problems.length?<CircleAlert size={15}/>:<CheckCircle2 size={15}/>}
            <span>{problems.length?problems.length+' issues':'Graph valid'}</span>
          </button>
          {validationOpen&&<div className="pipeline-toolbar-popover pipeline-validation-popover" role="status">
            <strong>{problems.length?'Structural issues':'Structural validation passed'}</strong>
            {problems.length?problems.map((issue,i)=><p key={i}>{issue}</p>):
              <p>Required stages and graph dependencies are consistent. Execution readiness requires backend validation.</p>}
          </div>}
        </div>
        {editable?<><Button onClick={save} disabled={!dirty} icon={Save}>Save</Button><Button variant="primary" icon={Check} onClick={publish} disabled={Boolean(problems.length)}>Publish</Button></>:
          <><Button onClick={()=>make(active)} icon={Copy}>New version</Button>{compatibleRunner&&<Button variant="primary" onClick={()=>navigate('mining?definition='+active.id)} icon={ArrowRight}>Launch</Button>}</>}
      </div>
    </header>
    <div className={'pipeline-editor-main'+(selected?' has-inspector':'')}>
      <section className="pipeline-graph-pane" aria-label="Pipeline DAG editor">
        <div className="pipeline-canvas-toolbar">
          <button className="pipeline-tool-button pipeline-add-button" disabled={!editable}
            aria-expanded={catalogOpen} onClick={()=>{setCatalogOpen(v=>!v);setPickerOpen(false);}}>
            <Plus size={16}/> {catalogOpen?'Close catalog':'Add stage'}
          </button>
          <div className="pipeline-zoom-tools" role="group" aria-label="Graph navigation">
            <button title="Zoom out" aria-label="Zoom out" onClick={()=>moveZoom(-1)}><Minus size={16}/></button>
            <span>{Math.round(zoom*100)}%</span>
            <button title="Zoom in" aria-label="Zoom in" onClick={()=>moveZoom(1)}><Plus size={16}/></button>
            <button className="pipeline-fit-button" title="Fit entire graph" onClick={fitView}><Maximize2 size={15}/> Fit</button>
          </div>
        </div>
        <div className="pipeline-graph-viewport" ref={canvasRef} tabIndex={0} aria-label="Pipeline graph. Drag to pan, Control and wheel to zoom."
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="pipeline-graph-world" style={{width:layout.width,height:layout.height,transform:'translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')'}}>
            <svg className="pipeline-world-edges" width={layout.width} height={layout.height} viewBox={'0 0 '+layout.width+' '+layout.height} aria-hidden="true">
              <defs><marker id="pipeline-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="currentColor" strokeWidth="1.2"/></marker></defs>
              {layout.active.flatMap(n=>n.dependsOn.filter(id=>layout.locations[id]).map(id=>{
                const a=layout.locations[id],b=layout.locations[n.id];
                return <path key={id+'--'+n.id} d={'M'+(a.x+174)+' '+(a.y+40)+' C'+(a.x+193)+' '+(a.y+40)+' '+(b.x-16)+' '+(b.y+40)+' '+b.x+' '+(b.y+40)} fill="none" stroke="currentColor" strokeWidth="1.6" markerEnd="url(#pipeline-arrow)"/>;
              }))}
            </svg>
            {layout.active.map(n=><button key={n.id} className={'pipeline-node'+(selectedStage===n.id?' pipeline-node--selected':'')}
              style={{left:layout.locations[n.id].x,top:layout.locations[n.id].y}}
              aria-pressed={selectedStage===n.id} onPointerDown={e=>e.stopPropagation()} onClick={()=>{setSelectedStage(n.id);setPane('stage');setAddOpen(false);}}>
              <span className="pipeline-node-kind">{required.has(n.type)?<LockKeyhole size={12}/>:<CircleDot size={12}/>} {n.type.toUpperCase()}</span>
              <strong>{n.label}</strong><small>{n.implementation}</small>
            </button>)}
          </div>
        </div>
        <div className="pipeline-canvas-footer">
          <span><MousePointer2 size={13}/> Drag to pan · Ctrl + scroll to zoom</span>
          <span>{layout.active.length} connected stages</span>
        </div>
        {catalogOpen&&<section className="pipeline-stage-catalog" aria-label="Stage Catalog">
          <header className="pipeline-stage-catalog-header">
            <div className="pipeline-catalog-label"><strong>Stage Catalog</strong><span>Choose a component to add to this pipeline</span></div>
            <label className="pipeline-catalog-search"><Search size={15}/><input aria-label="Search stages" placeholder="Search stages..." value={catalogQuery} onChange={e=>setCatalogQuery(e.target.value)}/></label>
            <div className="pipeline-catalog-filters" aria-label="Filter stage categories">
              {stageCategories.map(([key,label])=><button key={key} className={catalogFilter===key?'active':''} aria-pressed={catalogFilter===key} onClick={()=>setCatalogFilter(key)}>{label}</button>)}
            </div>
            <button className="pipeline-catalog-close" aria-label="Close Stage Catalog" onClick={()=>setCatalogOpen(false)}><X size={17}/></button>
          </header>
          <div className="pipeline-catalog-cards">
            {filteredStages.map(([type,item])=>{
              const locked=required.has(type)&&draft.stages.some(n=>n.type===type);
              return <div key={type} className="pipeline-catalog-card">
                <span className="pipeline-catalog-card-icon"><Workflow size={18}/></span>
                <div className="pipeline-catalog-card-text"><strong>{item.title}</strong><small>{item.description}</small></div>
                <button title={locked?'Required stage already present':'Add '+item.title} disabled={locked}
                  aria-label={locked?item.title+' already added':'Add '+item.title} onClick={()=>addStage(type)}>
                  {locked?<Check size={15}/>:<Plus size={16}/>}
                </button>
              </div>;
            })}
            {!filteredStages.length&&<p className="pipeline-catalog-empty">No stages match the current filters.</p>}
          </div>
        </section>}
      </section>
      {selected&&<aside className="pipeline-node-inspector" aria-label="Selected stage inspector">
        <header className="pipeline-inspector-heading"><div><span>STAGE INSPECTOR</span><strong>{selected.label}</strong><small>{selected.id}</small></div><button aria-label="Close stage inspector" onClick={()=>setSelectedStage(null)}><X size={17}/></button></header>
        <div className="pipeline-inspector-tabs" role="tablist" aria-label="Stage settings">
          {[['stage','Settings'],['dependencies','Dependencies'],['io','I/O']].map(([id,label])=><button key={id} role="tab" aria-selected={pane===id} className={pane===id?'active':''} onClick={()=>setPane(id)}>{label}</button>)}
        </div>
        <div className="pipeline-inspector-scroll">
          {pane==='stage'&&<>
            <p className="pipeline-inspector-lead">{stageCatalog[selected.type]?.description}</p>
            <div className="pipeline-inspector-field"><label htmlFor="pipeline-stage-label">Display name</label><input id="pipeline-stage-label" disabled={!editable} value={selected.label} onChange={e=>changeNode({label:e.target.value})}/></div>
            <div className="pipeline-inspector-field"><label htmlFor="pipeline-stage-implementation">Implementation</label><select id="pipeline-stage-implementation" disabled={!editable} value={selected.implementation} onChange={e=>changeNode({implementation:e.target.value})}>{(stageCatalog[selected.type]?.implementation||[]).map(x=><option key={x} value={x}>{x}</option>)}</select></div>
            <label className="pipeline-inspector-switch"><span>{required.has(selected.type)?'Required stage':'Enabled'}</span>{required.has(selected.type)?<LockKeyhole size={15}/>:<input type="checkbox" disabled={!editable} checked={selected.enabled} onChange={e=>changeNode({enabled:e.target.checked})}/>}</label>
            {editable&&!required.has(selected.type)&&<button className="pipeline-inspector-remove" onClick={removeStage}><X size={14}/> Remove stage</button>}
          </>}
          {pane==='dependencies'&&<>
            <p className="pipeline-inspector-lead">Choose upstream stages. Cycles and missing dependencies block publishing.</p>
            {draft.stages.filter(n=>n.id!==selected.id&&n.enabled).map(n=><label className="pipeline-dependency" key={n.id}><input type="checkbox" disabled={!editable||selected.type==='source'} checked={selected.dependsOn.includes(n.id)} onChange={()=>changeNode({dependsOn:selected.dependsOn.includes(n.id)?selected.dependsOn.filter(x=>x!==n.id):[...selected.dependsOn,n.id]})}/><span><strong>{n.label}</strong><small>{n.id}</small></span></label>)}
          </>}
          {pane==='io'&&<>
            <p className="pipeline-inspector-lead">Expected interface for this stage type. Compatibility requires an executor implementation.</p>
            <div className="pipeline-io-box"><span>INPUT</span><strong>{ioContracts[selected.type]?.[0] || 'Unspecified'}</strong></div>
            <div className="pipeline-io-box"><span>OUTPUT</span><strong>{ioContracts[selected.type]?.[1] || 'Unspecified'}</strong></div>
            <p className="pipeline-contract-caveat">Illustrative stage contracts. These are not backend-validated.</p>
          </>}
        </div>
      </aside>}
    </div>:<section className="pipeline-editor-detail">
      {tab==='json'&&<><div className="pipeline-editor-detail-head"><div><FileCode2 size={19}/><h2>Definition JSON</h2></div><Button onClick={()=>{if(!navigator.clipboard?.writeText){notify('Clipboard unavailable');return;}navigator.clipboard.writeText(JSON.stringify(draft,null,2)).then(()=>notify('JSON copied')).catch(()=>notify('Clipboard unavailable'));}}>Copy</Button></div><pre>{JSON.stringify(draft,null,2)}</pre><p>Read-only definition snapshot. Use Graph to modify stages; run parameters belong in Launchpad.</p></>}
      {tab==='versions'&&<><h2>Version history</h2><p>Published versions are immutable. Create a new draft to make changes.</p><div className="pipeline-version-list">{definitions.filter(d=>d.familyId===active.familyId).sort((a,b)=>b.version-a.version).map(d=><button key={d.id} onClick={()=>navigate('pipelines/'+encodeURIComponent(d.id))}><strong>{d.name} · v{d.version}</strong><span>{statusLabel(d)} · {dateLabel(d.updatedAt)}</span><ArrowRight size={16}/></button>)}</div></>}
      {tab==='validation'&&<><h2>Validation</h2><p>Structural checks for required stages, dependencies and acyclic graph.</p>{problems.length?<div className="pipeline-problem-list">{problems.map((p,i)=><p key={i}><CircleAlert size={16}/>{p}</p>)}</div>:<div className="pipeline-validation-ok"><CheckCircle2 size={20}/><div><strong>Graph checks passed</strong><p>Stage references, required steps and cycles are valid. Backend runtime compatibility has not been verified.</p></div></div>}</>}
    </section>}
  </div>;
}
