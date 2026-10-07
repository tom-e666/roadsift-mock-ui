import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Database, Layers, ScanLine, GitBranch, Plus, Search, LayoutGrid, List, Download, Upload, SlidersHorizontal, Check, X, Image, Video, Play, Pause, RotateCcw, Sparkles, Cpu, Cloud, ChartNoAxesCombined, Target, Crosshair, ZoomIn, ZoomOut, Trash2, Save, CheckCircle2, FileText, Monitor, Sun, Moon, MousePointer2, BoxSelect, ArrowLeft, Pickaxe, History as HistoryIcon } from 'lucide-react';
import { Button, Badge, PageHeader, Metric, Segmented, Empty, Panel, DemoNote, Field, Toggle, Modal, TextLink, HelpTip } from './components/UI.jsx';
import { frames, initialDatasets, initialRuns, initialSelectionBatches, metrics, count, date, sceneUrl, fleetPool, pools, seedDataset, seedEvaluation, holdouts, strategies, datasetRegistration, importSimulation, miningConfig, runners, modelRegistry, systemServices, strategyComparison, comparisonExperiments, evaluationRegistry, systemRunnerRegistrationDefaults, poolRegistration, batchLifecycle } from './data.js';

function useSimulation(onComplete) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const complete = useRef(onComplete); complete.current = onComplete;
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => setProgress(value => Math.min(100, value + 5)), 300);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => { if (progress >= 100 && status === 'running') { setStatus('complete'); complete.current?.(); } }, [progress, status]);
  return { progress, status, start: () => { setProgress(0); setStatus('running'); }, pause: () => setStatus('paused'), resume: () => setStatus('running'), reset: () => { setProgress(0); setStatus('idle'); } };
}
function Progress({ value, label }) { return <div className="progress"><div><span>{label}</span><strong>{value}%</strong></div><div className="progress__track"><i style={{ width: `${value}%` }} /></div></div>; }
function StatRow({ label, value }) { return <div className="stat-row"><span>{label}</span><strong>{value}</strong></div>; }
function ScoreBar({ label, value = 0 }) { const safe=Math.max(0,Math.min(1,Number(value)||0)); return <div className="score-bar"><div><span>{label}</span><strong>{safe.toFixed(2)}</strong></div><div className="score-bar__track"><i style={{width:`${safe*100}%`}} /></div></div>; }
function Scene({ scene, alt, className = '' }) { return <img className={`scene ${className}`} src={sceneUrl(scene)} alt={alt || 'Illustrated demo driving scene'} loading="lazy" />; }
function downloadJSON(name, data) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export function Pools({ navigate, pools, setPools, notify }) {
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState(null);
  const [createOpen,setCreateOpen]=useState(false);
  const [poolDraft,setPoolDraft]=useState({name:'',source:'',storageUri:'',manifestUri:'',total:'',eligible:'',validated:false});
  const [poolValidation,setPoolValidation]=useState(null);
  const patchPoolDraft=patch=>{setPoolDraft(v=>({...v,...patch,validated:false}));setPoolValidation(null);};
  const autofillPool=()=>{
    const nonce=Date.now().toString(36);
    const name=poolRegistration.defaultName;
    const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    setPoolDraft({
      name,
      source:poolRegistration.defaultSource,
      storageUri:`${poolRegistration.storageRoot}${slug}/`,
      manifestUri:`${poolRegistration.storageRoot}${slug}/${poolRegistration.manifestName.replace('.',`-${nonce}.`)}`,
      total:String(poolRegistration.defaultTotal),
      eligible:String(poolRegistration.defaultEligible),
      validated:false
    });
    setPoolValidation(null);
    notify('Pool registration fields autofilled');
  };
  const poolDraftError=()=>{
    const total=Number(poolDraft.total),eligible=Number(poolDraft.eligible);
    if(!poolDraft.name.trim()||!poolDraft.source.trim()||!poolDraft.storageUri.trim()||!poolDraft.manifestUri.trim()) return 'Complete all required pool registration fields.';
    if(!Number.isFinite(total)||total<=0||!Number.isFinite(eligible)||eligible<0||eligible>total) return 'Total and eligible counts are invalid.';
    if(pools.some(p=>p.storage===poolDraft.storageUri||p.manifestUri===poolDraft.manifestUri||p.name===poolDraft.name.trim())) return 'A Pool with the same name or storage reference already exists.';
    return '';
  };
  const validatePool=()=>{
    const error=poolDraftError();
    if(error){setPoolValidation({tone:'error',message:error});notify(error);return false;}
    setPoolDraft(v=>({...v,validated:true}));
    setPoolValidation({tone:'success',message:'Validation passed · Pool identity, storage reference and counts are ready.'});
    return true;
  };
  const createPool=()=>{
    const error=poolDraftError();
    if(error){setPoolDraft(v=>({...v,validated:false}));setPoolValidation({tone:'error',message:error});notify(error);return;}
    const now=new Date().toISOString(),stamp=Date.now().toString(36);
    const slug=poolDraft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const total=Number(poolDraft.total),eligible=Number(poolDraft.eligible);
    const excluded=Math.max(0,total-eligible);
    const record={id:`pool_${slug.replace(/-/g,'_')}_${stamp.slice(-4)}`,name:poolDraft.name.trim(),slug,version:1,snapshot:`pool_snap_${stamp}`,total,eligible,labeled:poolRegistration.defaultLabeled,reserved:poolRegistration.defaultReserved,excluded,indexed:now,storage:poolDraft.storageUri.trim(),manifestUri:poolDraft.manifestUri.trim(),source:poolDraft.source.trim(),status:'Active',eligibleTrend:[eligible],miningRuns7d:0,lastMiningAt:now,composition:{Unclassified:eligible},quality:{Good:eligible},stateBreakdown:{Eligible:eligible,Reserved:0,Labeled:0,Excluded:excluded},recentSnapshots:[{version:1,eligible,total,reason:'Pool registered',at:now}],sampleScenes:[0,1,2,3]};
    setPools(list=>[record,...list]); setCreateOpen(false); setPoolValidation(null); notify(`${record.name} created`);
  };
  const results=pools.filter(p=>`${p.name} ${p.snapshot} ${p.source}`.toLowerCase().includes(query.toLowerCase()));
  const sparkline = values => {
    const width=88,height=28,pad=2;
    const min=Math.min(...values),max=Math.max(...values),range=Math.max(1,max-min);
    return values.map((v,i)=>`${pad+(i*(width-pad*2))/Math.max(1,values.length-1)},${height-pad-((v-min)/range)*(height-pad*2)}`).join(' ');
  };
  const barWidth=(value,total)=>`${Math.max(2,Math.round((Number(value||0)/Math.max(1,Number(total||1)))*100))}%`;
  return <div className="page pools-page"><PageHeader eyebrow="Candidate registry" title="Pools" description="Versioned snapshots of unlabeled fleet data available for mining." actions={<Button variant="primary" icon={Plus} onClick={()=>{setPoolDraft({name:'',source:'',storageUri:'',manifestUri:'',total:'',eligible:'',validated:false});setPoolValidation(null);setCreateOpen(true)}}>Create pool</Button>} />
    <section className="catalog"><div className="catalog__heading"><div><h2>Candidate pools</h2></div></div>
      <div className="catalog__filters"><div className="search-field"><Search size={16}/><input aria-label="Search pools" placeholder="Search pools…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}</div></div>
      {results.length?<div className="table-scroll"><table className="dataset-table pool-registry-table"><thead><tr><th>Pool</th><th>Snapshot <HelpTip>An immutable version of Pool membership used to reproduce a Mining run.</HelpTip></th><th>Total</th><th>Eligible <HelpTip>Samples currently allowed to be selected by Mining.</HelpTip></th><th>Reserved <HelpTip>Samples already selected into a Selection Batch or under review, so they are temporarily unavailable.</HelpTip></th><th>Eligible trend <HelpTip>How the number of eligible candidates changed across recent Pool snapshots.</HelpTip></th><th>Mining <HelpTip>Recent Mining activity using this Pool as the candidate source.</HelpTip></th><th>Updated</th></tr></thead><tbody>{results.map(p=><tr key={p.id} tabIndex="0" role="button" onClick={()=>setSelected(p)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p)}}}><td><div className="dataset-name-cell"><strong>{p.name}</strong><small>{p.source}</small></div></td><td><code className="artifact-ref">{p.slug || p.id}:p{p.version}</code></td><td className="tabular">{count(p.total)}</td><td className="tabular">{count(p.eligible)}</td><td className="tabular">{count(p.reserved)}</td><td><div className="pool-trend" title={(p.eligibleTrend||[]).map((v,i)=>`p${Math.max(1,p.version-(p.eligibleTrend.length-1)+i)}: ${count(v)} eligible`).join(' · ')}><svg viewBox="0 0 88 28" role="img" aria-label={`${p.name} eligible trend`}><polyline points={sparkline(p.eligibleTrend||[p.eligible])}/><circle cx="86" cy={(() => { const values=p.eligibleTrend||[p.eligible]; const min=Math.min(...values),max=Math.max(...values),range=Math.max(1,max-min); return 26-((values.at(-1)-min)/range)*24; })()} r="2"/></svg></div></td><td><div className="pool-activity"><strong>{p.miningRuns7d} runs</strong><small>last {date(p.lastMiningAt)}</small></div></td><td className="table-muted">{date(p.indexed)}</td></tr>)}</tbody></table></div>:<Empty title="No matching pools" detail="Try a different search."/>}
    </section>

    {selected&&<Modal sheet title="Pool explorer" onClose={()=>setSelected(null)} footer={<><Button onClick={()=>setSelected(null)}>Close</Button><Button variant="primary" icon={Pickaxe} onClick={()=>navigate('mining')}>Start mining</Button></>}>
      <div className="detail-heading"><div className="detail-heading__meta"><Badge>{selected.status}</Badge><code className="artifact-ref">{selected.slug || selected.id}:p{selected.version}</code></div><h2>{selected.name}</h2><p>Inspect candidate composition, quality, snapshot history and sample frames before starting a mining run.</p></div>

      <details className="detail-section" open>
        <summary><div><strong>Overview</strong><span>Current snapshot and candidate availability.</span></div></summary>
        <div className="detail-section__body"><div className="pool-kpi-grid"><div><span>Total</span><strong>{count(selected.total)}</strong></div><div><span>Eligible</span><strong>{count(selected.eligible)}</strong></div><div><span>Reserved</span><strong>{count(selected.reserved)}</strong></div><div><span>Labeled</span><strong>{count(selected.labeled)}</strong></div></div><div className="detail-stats"><StatRow label="Snapshot ID" value={selected.snapshot}/><StatRow label="Storage" value={selected.storage}/><StatRow label="Excluded" value={count(selected.excluded)}/><StatRow label="Mining runs · 7d" value={String(selected.miningRuns7d)}/><StatRow label="Last mining" value={date(selected.lastMiningAt)}/><StatRow label="Updated" value={date(selected.indexed)}/></div></div>
      </details>

      <details className="detail-section" open>
        <summary><div><strong>Composition</strong><span>Domain mix inside the eligible candidate snapshot.</span></div></summary>
        <div className="detail-section__body"><div className="pool-breakdown">{Object.entries(selected.composition||{}).map(([label,value])=><div className="pool-breakdown__row" key={label}><div><span>{label}</span><strong>{count(value)}</strong></div><div className="pool-breakdown__track"><i style={{width:barWidth(value,selected.eligible)}}/></div></div>)}</div></div>
      </details>

      <details className="detail-section">
        <summary><div><strong>Quality & state</strong><span>Eligibility, reservations and quality flags.</span></div></summary>
        <div className="detail-section__body"><div className="pool-inspector-grid"><div><h4>State</h4>{Object.entries(selected.stateBreakdown||{}).map(([label,value])=><StatRow key={label} label={label} value={count(value)}/>)}</div><div><h4>Quality signals</h4>{Object.entries(selected.quality||{}).map(([label,value])=><StatRow key={label} label={label.replace(/([A-Z])/g,' $1').trim()} value={count(value)}/>)}</div></div></div>
      </details>

      <details className="detail-section" open>
        <summary><div><strong>Recent snapshots</strong><span>Why eligible membership changed across recent pool versions.</span></div></summary>
        <div className="detail-section__body"><div className="snapshot-list">{(selected.recentSnapshots||[]).map(s=><div className="snapshot-row" key={s.version}><code>{selected.slug}:p{s.version}</code><div><strong>{count(s.eligible)} eligible</strong><span>{s.reason}</span></div><small>{date(s.at)}</small></div>)}</div></div>
      </details>

      <details className="detail-section">
        <summary><div><strong>Mining activity</strong><span>Recent use of this pool as an acquisition source.</span></div></summary>
        <div className="detail-section__body"><div className="detail-stats"><StatRow label="Runs · 7d" value={String(selected.miningRuns7d)}/><StatRow label="Last mining" value={date(selected.lastMiningAt)}/><StatRow label="Current reserved" value={count(selected.reserved)}/><StatRow label="Eligible now" value={count(selected.eligible)}/></div><div className="insight insight--plain"><Pickaxe size={20}/><h3>Mining uses an immutable snapshot</h3><p>Starting a run pins this exact pool snapshot. Later ingest, labeling or quarantine changes produce a newer snapshot without altering the run input.</p></div></div>
      </details>

      <details className="detail-section" open>
        <summary><div><strong>Sample preview</strong><span>Representative frames from this pool.</span></div><Button onClick={(e)=>{e.preventDefault();navigate('data-explorer')}}>Open Data Explorer</Button></summary>
        <div className="detail-section__body"><div className="pool-preview-grid">{(selected.sampleScenes||[0,1,2,3]).map((scene,i)=><button key={i} className="pool-preview-card" onClick={()=>navigate('data-explorer')}><Scene scene={scene} alt={`${selected.name} sample ${i+1}`}/><span>sample_{String(i+1).padStart(4,'0')}</span></button>)}</div></div>
      </details>
    </Modal>}
    {createOpen&&<Modal title="Create pool" onClose={()=>setCreateOpen(false)} footer={<><Button onClick={()=>setCreateOpen(false)}>Cancel</Button><Button onClick={validatePool}>Validate</Button><Button variant="primary" onClick={createPool}>Create pool</Button></>}><div className="register-intro"><div><p className="modal-intro">Register an existing unlabeled candidate collection as a versioned Pool. Use Import Data when you still need to upload or extract media first.</p></div><Button icon={Sparkles} onClick={autofillPool}>Autofill</Button></div><Field label="Pool name"><input value={poolDraft.name} onChange={e=>patchPoolDraft({name:e.target.value})} placeholder="Central Vietnam Fleet Pool"/></Field><Field label="Source description"><input value={poolDraft.source} onChange={e=>patchPoolDraft({source:e.target.value})} placeholder="Existing R2 collection"/></Field><Field label="Storage URI"><input value={poolDraft.storageUri} onChange={e=>patchPoolDraft({storageUri:e.target.value})} placeholder="r2://roadsift/pools/central-vietnam/"/></Field><Field label="Manifest URI" help="Canonical membership reference for this Pool snapshot."><input value={poolDraft.manifestUri} onChange={e=>patchPoolDraft({manifestUri:e.target.value})} placeholder="r2://roadsift/pools/central-vietnam/manifest.parquet"/></Field><div className="register-grid"><Field label="Total samples"><input inputMode="numeric" value={poolDraft.total} onChange={e=>patchPoolDraft({total:e.target.value})}/></Field><Field label="Eligible samples" help="Samples currently allowed to enter Mining."><input inputMode="numeric" value={poolDraft.eligible} onChange={e=>patchPoolDraft({eligible:e.target.value})}/></Field></div>{poolValidation&&<div className={poolValidation.tone==='success'?'registration-valid':'registration-error'}>{poolValidation.tone==='success'?<CheckCircle2 size={18}/>:<X size={18}/>}<div><strong>{poolValidation.tone==='success'?'Validation passed':'Validation failed'}</strong><p>{poolValidation.message}</p></div></div>}</Modal>}

  </div>;
}

export function Datasets({ datasets, setDatasets, pools, navigate, notify }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null); const [importOpen, setImportOpen] = useState(false);
  const metadataInputRef=useRef(null);
  const [modelImportOpen,setModelImportOpen]=useState(false), [evalImportOpen,setEvalImportOpen]=useState(false);
  const [modelDraft,setModelDraft]=useState({name:'',uri:''});
  const [evalDraft,setEvalDraft]=useState({id:'',holdoutId:holdouts[0]?.id||'',map:'',recall:'',vru:'',night:'',rain:''});
  const taskFormats = datasetRegistration.taskFormats;
  const emptyRegistration = { name:'', manifestUri:'', annotationUri:'', task:datasetRegistration.defaultTask, format:datasetRegistration.defaultFormat, parentId:'', sourceBatch:'', validated:false };
  const [registration,setRegistration]=useState(emptyRegistration);
  const [registrationValidation,setRegistrationValidation]=useState(null);
  const latestDatasets = Object.values(datasets.reduce((acc,d) => {
    const key=d.name;
    if (!acc[key] || d.version > acc[key].version) acc[key]=d;
    return acc;
  }, {}));
  const results = latestDatasets.filter(d => `${d.name} ${d.strategy || ''} ${d.id}`.toLowerCase().includes(query.toLowerCase()));
  const openImport = () => { setRegistration(emptyRegistration); setRegistrationValidation(null); setImportOpen(true); };
  const patchRegistration = patch => { setRegistration(value => ({ ...value, ...patch, validated:false })); setRegistrationValidation(null); };
  const autofillRegistration = () => {
    const importedParent=datasets.find(d=>d.id===registration.parentId);
    const matchingFamily=[...datasets].filter(d=>d.name===registration.name).sort((a,b)=>(b.version||0)-(a.version||0))[0];
    const parent = importedParent || matchingFamily || [...datasets].sort((a,b)=>(b.version||0)-(a.version||0))[0] || datasets.at(-1);
    const nextVersion = (parent?.version || 0) + 1;
    const slug = parent?.slug || (parent?.name || 'fleet-dataset').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    let nonce = Date.now().toString(36);
    let manifestUri = `r2://roadsift/datasets/${slug}/v${nextVersion}/manifest-${nonce}.parquet`;
    let annotationUri = `r2://roadsift/annotations/${slug}/v${nextVersion}/annotations-${nonce}.json`;
    let sourceBatch = `batch_${slug.replace(/-/g,'_')}_r${String(nextVersion).padStart(2,'0')}_${nonce.slice(-5)}`;
    let attempt = 0;
    const collides = () => datasets.some(d => d.manifestUri === manifestUri || d.annotationUri === annotationUri || d.sourceBatch === sourceBatch);
    while (collides() && attempt < 20) {
      attempt += 1;
      nonce = `${Date.now().toString(36)}${attempt.toString(36)}`;
      manifestUri = `r2://roadsift/datasets/${slug}/v${nextVersion}/manifest-${nonce}.parquet`;
      annotationUri = `r2://roadsift/annotations/${slug}/v${nextVersion}/annotations-${nonce}.json`;
      sourceBatch = `batch_${slug.replace(/-/g,'_')}_r${String(nextVersion).padStart(2,'0')}_${nonce.slice(-5)}`;
    }
    setRegistration({
      name: parent?.name || `Fleet Dataset ${nonce.slice(-4).toUpperCase()}`,
      manifestUri, annotationUri,
      task: parent?.task || datasetRegistration.defaultTask,
      format: parent?.format || datasetRegistration.defaultFormat,
      parentId: parent?.id || '',
      sourceBatch,
      validated:false
    });
    notify(`Autofilled ${parent?.name || 'dataset'} v${nextVersion} with unique artifact paths`);
  };
  const registrationError = () => {
    const required = registration.name.trim() && registration.manifestUri.trim() && registration.annotationUri.trim() && registration.format && registration.parentId;
    if (!required) return 'Complete all required registration fields.';
    const uriConflict = datasets.some(d => d.manifestUri === registration.manifestUri || d.annotationUri === registration.annotationUri);
    const batchConflict = registration.sourceBatch && datasets.some(d => d.sourceBatch === registration.sourceBatch);
    if (uriConflict || batchConflict) return 'A manifest, annotation URI, or Selection Batch reference already exists. Use Autofill to generate a unique next version.';
    return '';
  };
  const validateRegistration = () => {
    const error=registrationError();
    if(error){setRegistration(value=>({...value,validated:false}));setRegistrationValidation({tone:'error',message:error});notify(error);return false;}
    setRegistration(value => ({...value,validated:true}));
    setRegistrationValidation({tone:'success',message:'References are complete, unique, and ready to register.'});
    notify('Validation passed');
    return true;
  };
  const registerDataset = () => {
    const error=registrationError();
    if(error){setRegistration(value=>({...value,validated:false}));setRegistrationValidation({tone:'error',message:error});notify(error);return;}
    const parent=datasets.find(d=>d.id===registration.parentId); const version=(parent?.version||0)+1; const stamp=Date.now().toString(36);
    const slug=parent?.slug || registration.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const record={...parent,id:`${slug}-v${version}-${stamp.slice(-4)}`,slug,name:registration.name.trim(),subtitle:`${registration.task} · ${registration.format}`,task:registration.task,format:registration.format,aliases:['latest','candidate'],count:(parent?.count||0)+datasetRegistration.defaultAddedSamples,added:datasetRegistration.defaultAddedSamples,stage:'Labeled',version,round:version,date:new Date().toISOString(),parent:parent?.id||null,manifestUri:registration.manifestUri,annotationUri:registration.annotationUri,format:registration.format,sourceBatch:registration.sourceBatch,description:`Registered dataset version from ${registration.sourceBatch || 'external annotation return'}.`};
    setDatasets(value=>[record,...value]); setImportOpen(false); setRegistrationValidation(null); notify(`${record.name} v${version} registered`);
  };
  const exportDatasetMetadata = dataset => {
    downloadJSON(`${dataset.slug||dataset.id}-v${dataset.version}.metadata.json`, {
      schemaVersion:'roadsift.dataset.v1',
      kind:'DatasetVersion',
      exportedAt:new Date().toISOString(),
      dataset
    });
    notify('Dataset metadata exported');
  };
  const importDatasetMetadata = async event => {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file) return;
    try{
      const parsed=JSON.parse(await file.text());
      const meta=parsed.dataset||parsed;
      const task=taskFormats[meta.task]?meta.task:datasetRegistration.defaultTask;
      const format=taskFormats[task]?.includes(meta.format)?meta.format:taskFormats[task][0];
      setRegistration({
        name:meta.name||'',
        manifestUri:meta.manifestUri||'',
        annotationUri:meta.annotationUri||'',
        task,format,
        parentId:datasets.some(d=>d.id===meta.parent)?meta.parent:(datasets.some(d=>d.id===meta.id)?meta.id:''),
        sourceBatch:meta.sourceBatch||'',
        validated:false
      });
      setImportOpen(true);
      notify('Metadata imported · review fields or use Autofill for a unique next version');
    }catch{
      notify('Metadata import failed · expected valid RoadSift JSON metadata');
    }
  };
  const openModelImport=()=>{
    setModelDraft({name:selected?.model||'',uri:selected?.modelUri||`r2://roadsift/models/${selected?.id||'dataset'}/model.pt`});
    setModelImportOpen(true);
  };
  const openEvalImport=()=>{
    const e=selected?.evaluation||{};
    setEvalDraft({id:selected?.evalId||'',holdoutId:holdouts[0]?.id||'',map:e.map??'',recall:e.recall??'',vru:e.vru??'',night:e.night??'',rain:e.rain??''});
    setEvalImportOpen(true);
  };
  const saveModelImport=()=>{
    if(!selected||!modelDraft.name.trim()||!modelDraft.uri.trim()){notify('Model name and artifact URI are required');return;}
    const updated={...selected,model:modelDraft.name.trim(),modelUri:modelDraft.uri.trim()};
    setDatasets(list=>list.map(d=>d.id===selected.id?updated:d)); setSelected(updated); setModelImportOpen(false); notify('Model artifact imported');
  };
  const saveEvalImport=()=>{
    if(!selected||!evalDraft.id.trim()){notify('Evaluation ID is required');return;}
    const values=['map','recall','vru','night','rain'].reduce((o,k)=>({...o,[k]:Number(evalDraft[k])}),{});
    if(Object.values(values).some(v=>!Number.isFinite(v))){notify('All evaluation metrics must be numeric');return;}
    const previous=selected.evaluation||{};
    const evaluation={...previous,...values,
      deltaMap:values.map-(previous.map??seedEvaluation.map),
      deltaRecall:values.recall-(previous.recall??seedEvaluation.recall),
      deltaVru:values.vru-(previous.vru??seedEvaluation.vru),
      deltaNight:values.night-(previous.night??seedEvaluation.night)
    };
    const updated={...selected,evalId:evalDraft.id.trim(),holdoutId:evalDraft.holdoutId,evaluation};
    setDatasets(list=>list.map(d=>d.id===selected.id?updated:d)); setSelected(updated); setEvalImportOpen(false); notify('Evaluation result imported');
  };
  const selectedFamily = selected ? datasets.filter(d => d.name === selected.name).sort((a,b)=>(b.version||0)-(a.version||0)) : [];
  const selectedPool = selected ? pools.find(p => p.id === selected.pool) : null;
  const selectedParent = selected ? datasets.find(d => d.id === selected.parent) : null;
  const historyCount = selectedFamily.length + (selectedFamily.some(d => d.version === 0) ? 0 : 1);
  return <div className="page datasets-page"><PageHeader eyebrow="Your library" title="Datasets" description="A home for your data. A clear path to your next model." actions={<Button variant="primary" icon={Plus} onClick={openImport}>Register dataset</Button>} />
    <section className="catalog"><div className="catalog__heading"><div><h2>All datasets</h2></div></div>
      <div className="catalog__filters"><div className="search-field"><Search size={16} /><input aria-label="Search datasets" placeholder="Search datasets…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</div></div>
      {results.length ? <div className="table-scroll"><table className="dataset-table dataset-registry-table"><thead><tr><th>Dataset</th><th>Current version</th><th>Samples</th><th>Strategy</th><th>Updated</th></tr></thead><tbody>{results.map(d => <tr key={d.id} tabIndex="0" role="button" onClick={() => setSelected(d)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(d)}}}><td><div className="dataset-name-cell"><strong>{d.name}</strong><small>{d.domain || 'Mixed driving domain'}</small></div></td><td><div className="dataset-version-cell"><code className="artifact-ref">{d.slug || d.id}:v{d.version}</code>{(d.aliases||[]).length>0&&<small className="artifact-aliases">aliases: {(d.aliases||[]).join(', ')}</small>}</div></td><td className="tabular">{count(d.count)}</td><td>{d.strategy || 'External registration'}</td><td className="table-muted">{date(d.date)}</td></tr>)}</tbody></table></div> : <Empty title="No matching datasets" detail="Try a different search." action={<Button onClick={() => setQuery('')}>Clear search</Button>} />}
    </section>
    {selected && <Modal sheet title="Dataset details" onClose={() => setSelected(null)} footer={<><Button icon={Download} onClick={() => exportDatasetMetadata(selected)}>Export metadata</Button><Button variant="primary" icon={ArrowRight} onClick={() => navigate('data-explorer', selected)}>Explore dataset</Button></>}>
      <div className="detail-heading"><div className="detail-heading__meta"><code className="artifact-ref">{selected.slug || selected.id}:v{selected.version}</code>{(selected.aliases||[]).length>0&&<small>aliases: {(selected.aliases||[]).join(', ')}</small>}</div><h2>{selected.name}</h2><p>{selected.description}</p></div>

      <details className="detail-section" open>
        <summary><div><strong>Overview</strong><span>Identity, task and storage metadata.</span></div></summary>
        <div className="detail-section__body"><div className="detail-stats"><StatRow label="Samples" value={count(selected.count)} /><StatRow label="Domain" value={selected.domain} /><StatRow label="Task" value={selected.task || datasetRegistration.defaultTask} /><StatRow label="Format" value={selected.format || datasetRegistration.defaultFormat} /><StatRow label="Updated" value={date(selected.updatedAt||selected.date)} /><StatRow label="Owner" value={selected.owner||'—'} /><StatRow label="Schema" value={selected.schemaVersion||'—'} /><StatRow label="Membership hash" value={selected.membershipHash||'—'} /><StatRow label="Base dataset" value={selectedParent ? `${selectedParent.name} v${selectedParent.version}` : seedDataset.name} />{selected.manifestUri&&<StatRow label="Manifest" value={selected.manifestUri}/>} {selected.annotationUri&&<StatRow label="Annotations" value={selected.annotationUri}/>}</div></div>
      </details>

      <details className="detail-section" open>
        <summary><div><strong>Model & Evaluation</strong><span>External model feedback registered against this dataset version.</span></div></summary>
        <div className="detail-section__body"><div className="model-eval-card model-eval-card--embedded"><div className="model-registry"><div><span>Registered model</span><strong>{selected.model || 'Not registered'}</strong><code>{selected.modelUri || `r2://roadsift/models/${selected.id}/model.pt`}</code></div><div><span className="inline-label-help">Evaluation <HelpTip>Fixed Holdout is never used for sample selection. It is reserved for comparing model performance across dataset versions.</HelpTip></span><strong>{holdouts[0]?.name} · {count(holdouts[0]?.samples)} frames</strong><code>{selected.evalId || 'Not registered'}</code></div></div>{selected.evaluation&&<div className="eval-metrics"><div><span>mAP50–95</span><strong>{selected.evaluation.map.toFixed(3)}</strong><em>+{selected.evaluation.deltaMap.toFixed(3)}</em></div><div><span>Recall</span><strong>{selected.evaluation.recall.toFixed(3)}</strong><em>+{selected.evaluation.deltaRecall.toFixed(3)}</em></div><div><span>VRU Recall</span><strong>{selected.evaluation.vru.toFixed(3)}</strong><em>+{selected.evaluation.deltaVru.toFixed(3)}</em></div><div><span>Night Recall</span><strong>{selected.evaluation.night.toFixed(3)}</strong><em>+{selected.evaluation.deltaNight.toFixed(3)}</em></div><div><span>Rain/Fog</span><strong>{selected.evaluation.rain.toFixed(3)}</strong><em>Fixed holdout</em></div></div>}<div className="release-gate"><span className="release-gate__status"><i/>Release gate passed <HelpTip>The registered evaluation satisfied the configured promotion criteria, so this model may be used for the next Mining round.</HelpTip></span><span>Eligible as acquisition model for the next mining round.</span></div><div className="model-eval-actions"><Button variant={selected.model?'secondary':'primary'} icon={Upload} onClick={openModelImport}>Import model</Button><Button variant={!selected.model&&selected.evalId?'primary':'secondary'} icon={Upload} onClick={openEvalImport}>Import evaluation</Button></div></div></div>
      </details>

      <details className="detail-section" open>
        <summary><div><strong>Version history</strong><span>Registered versions available for this dataset family.</span></div><Badge>{historyCount} records</Badge></summary>
        <div className="detail-section__body"><div className="version-timeline">{selectedFamily.flatMap((version,index)=>{const previous=selectedFamily[index+1];const gap=previous&&version.version-previous.version>1?version.version-previous.version-1:0;const node=<div key={version.id} className={index===0?'version-event version-event--current':'version-event'}><span className="version-dot"/><div><div className="version-event__top"><strong>v{version.version} · {count(version.count)} frames</strong>{version.id===selected.id&&<Badge>Current</Badge>}</div><p>+{count(version.added||0)} labeled frames · {version.strategy || 'External registration'}</p><small>{version.run || version.sourceBatch || 'registered'} · {date(version.date)}</small></div></div>;return gap?[node,<div key={`gap-${version.version}-${previous.version}`} className="version-gap"><span/><small>{gap} intermediate version{gap>1?'s':''} archived versions</small></div>]:[node]})}{!selectedFamily.some(d=>d.version===0)&&<div className="version-event"><span className="version-dot"/><div><strong>v{seedDataset.version} · {count(seedDataset.samples)} frames</strong><p>{seedDataset.name}</p><small>{seedDataset.id} · {date(seedDataset.createdAt)}</small></div></div>}</div></div>
      </details>

      <details className="detail-section">
        <summary><div><strong>Creation provenance</strong><span>Inputs and lineage that materialized the current version.</span></div></summary>
        <div className="detail-section__body"><div className="provenance-grid"><StatRow label="Candidate pool" value={selectedPool ? `${selectedPool.name} p${selectedPool.version}` : selected.pool || '—'}/><StatRow label="Pool snapshot" value={selectedPool?.snapshot || '—'}/><StatRow label="Base dataset version" value={selectedParent ? `${selectedParent.name} v${selectedParent.version} · ${count(selectedParent.count)}` : `${seedDataset.name} · ${count(seedDataset.samples)}`}/><StatRow label="Selection strategy" value={selected.strategy || 'External registration'}/><StatRow label="Selection model" value={selected.model || '—'}/><StatRow label="Budget / added" value={`${count(selected.budget||0)} / ${count(selected.added||0)}`}/><StatRow label="Mining run" value={selected.run || '—'}/><StatRow label="Source selection batch" value={selected.sourceBatch || '—'}/><StatRow label="Evaluation" value={selected.evalId || '—'}/></div></div>
      </details>
    </Modal>}
    {importOpen && <Modal title="Register dataset" onClose={() => setImportOpen(false)} footer={<><Button onClick={() => setImportOpen(false)}>Cancel</Button><Button onClick={validateRegistration}>Validate</Button><Button variant="primary" onClick={registerDataset}>Register dataset</Button></>}><div className="register-intro"><div><p className="modal-intro">Register an existing labeled dataset by reference. RoadSift keeps its identity, version, membership and annotation lineage without copying the underlying media.</p></div><div className="register-intro__actions"><input ref={metadataInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={importDatasetMetadata}/><Button icon={Upload} onClick={()=>metadataInputRef.current?.click()}>Import metadata</Button><Button icon={Sparkles} onClick={autofillRegistration}>Autofill</Button></div></div><Field label="Dataset name"><input value={registration.name} onChange={e=>patchRegistration({name:e.target.value})} placeholder="Night & Rain Fleet" /></Field><Field label="Manifest URI" hint="Canonical sample membership; Parquet or JSONL."><input value={registration.manifestUri} onChange={e=>patchRegistration({manifestUri:e.target.value})} placeholder="r2://roadsift/datasets/night-rain/v3/manifest.parquet" /></Field><Field label="Annotation URI"><input value={registration.annotationUri} onChange={e=>patchRegistration({annotationUri:e.target.value})} placeholder="r2://roadsift/annotations/night-rain/v3/annotations.json" /></Field><div className="register-grid"><Field label="Task"><select value={registration.task} onChange={e=>{const task=e.target.value;patchRegistration({task,format:taskFormats[task][0]})}}>{Object.keys(taskFormats).map(task=><option key={task}>{task}</option>)}</select></Field><Field label="Dataset / annotation format" help="The external annotation schema RoadSift will validate and map into its internal dataset contract."><select value={registration.format} onChange={e=>patchRegistration({format:e.target.value})}>{taskFormats[registration.task].map(format=><option key={format}>{format}</option>)}</select></Field></div><Field label="Base dataset version" help="The previous labeled dataset version. The new version inherits its membership before adding newly labeled samples." hint="The new version inherits all samples from the base dataset."><select value={registration.parentId} onChange={e=>patchRegistration({parentId:e.target.value})}><option value="">Select base version…</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.name} · v{d.version} · {count(d.count)} samples</option>)}</select></Field><Field label="Source selection batch (optional)" help="The reviewed Selection Batch whose samples were externally annotated and are now being added to this dataset version." hint="Links the newly labeled samples back to the Mining batch that selected them."><input value={registration.sourceBatch} onChange={e=>patchRegistration({sourceBatch:e.target.value})} placeholder="batch_northern_highway_corridor_r13_ab12c" /></Field>{registrationValidation&&<div className={registrationValidation.tone==='success'?'registration-valid':'registration-error'}>{registrationValidation.tone==='success'?<CheckCircle2 size={18}/>:<X size={18}/>}<div><strong>{registrationValidation.tone==='success'?'Validation passed':'Validation failed'}</strong><p>{registrationValidation.message}</p></div></div>}</Modal>}
    {modelImportOpen&&<Modal title="Import model artifact" onClose={()=>setModelImportOpen(false)} footer={<><Button onClick={()=>setModelImportOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveModelImport}>Import model</Button></>}><div className="register-intro"><p className="modal-intro">Reference an externally trained model artifact. RoadSift stores the model identity and URI; it does not train the model here.</p><Button icon={Sparkles} onClick={()=>setModelDraft({name:`YOLO11m · ${selected?.slug||selected?.id}-v${selected?.version}`,uri:`r2://roadsift/models/${selected?.slug||selected?.id}/v${selected?.version}/model.pt`})}>Autofill</Button></div><Field label="Model name"><input value={modelDraft.name} onChange={e=>setModelDraft(v=>({...v,name:e.target.value}))}/></Field><Field label="Artifact URI"><input value={modelDraft.uri} onChange={e=>setModelDraft(v=>({...v,uri:e.target.value}))}/></Field></Modal>}
    {evalImportOpen&&<Modal title="Import evaluation result" onClose={()=>setEvalImportOpen(false)} footer={<><Button onClick={()=>setEvalImportOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveEvalImport}>Import evaluation</Button></>}><div className="register-intro"><p className="modal-intro">Register externally computed metrics against the fixed holdout. These metrics are evaluation-only and never feed sample selection.</p><Button icon={Sparkles} onClick={()=>setEvalDraft({id:`eval_${selected?.slug||selected?.id}_v${selected?.version}_${Date.now().toString(36).slice(-4)}`,holdoutId:holdouts[0]?.id||'',map:String(selected?.evaluation?.map??seedEvaluation.map),recall:String(selected?.evaluation?.recall??seedEvaluation.recall),vru:String(selected?.evaluation?.vru??seedEvaluation.vru),night:String(selected?.evaluation?.night??seedEvaluation.night),rain:String(selected?.evaluation?.rain??seedEvaluation.rain)})}>Autofill</Button></div><Field label="Evaluation ID"><input value={evalDraft.id} onChange={e=>setEvalDraft(v=>({...v,id:e.target.value}))}/></Field><Field label="Fixed holdout"><select value={evalDraft.holdoutId} onChange={e=>setEvalDraft(v=>({...v,holdoutId:e.target.value}))}>{holdouts.map(h=><option key={h.id} value={h.id}>{h.name} · {count(h.samples)} frames</option>)}</select></Field><div className="register-grid"><Field label="mAP50–95"><input value={evalDraft.map} onChange={e=>setEvalDraft(v=>({...v,map:e.target.value}))}/></Field><Field label="Recall"><input value={evalDraft.recall} onChange={e=>setEvalDraft(v=>({...v,recall:e.target.value}))}/></Field><Field label="VRU Recall"><input value={evalDraft.vru} onChange={e=>setEvalDraft(v=>({...v,vru:e.target.value}))}/></Field><Field label="Night Recall"><input value={evalDraft.night} onChange={e=>setEvalDraft(v=>({...v,night:e.target.value}))}/></Field><Field label="Rain/Fog Recall"><input value={evalDraft.rain} onChange={e=>setEvalDraft(v=>({...v,rain:e.target.value}))}/></Field></div></Modal>}

  </div>;
}

export function Explorer({ datasets, pools, contextDataset, notify, navigate }) {
  const [sourceId,setSourceId]=useState(contextDataset?.id||'pool_fleet_001'); const [state,setState]=useState('All'); const [query,setQuery]=useState(''); const [domain,setDomain]=useState('All domains'); const [active,setActive]=useState(null); const [detections,setDetections]=useState(true); const [view,setView]=useState('grid'); const [inspectorTab,setInspectorTab]=useState('overview');
  const sourcePool=pools.find(p=>p.id===sourceId); const source=sourcePool?null:datasets.find(d=>d.id===sourceId); const sourceName=source? `${source.name} · v${source.version}`:(sourcePool?.name||fleetPool.name);
  const stateLabels={ All:'All', Raw:'Eligible', Selected:'Reserved', Labeled:'Labeled', Excluded:'Excluded' };
  const availableStates=source?['All','Labeled']:['All','Raw','Selected','Labeled','Excluded'];
  const sourceFrames=source?frames.filter(f=>f.state==='Labeled'):frames;
  const visible=sourceFrames.filter(f=>(state==='All'||f.state===state)&&(domain==='All domains'||f.domain===domain)&&`${f.id} ${f.domain} ${f.video}`.toLowerCase().includes(query.toLowerCase()));
  const stateCount=s=>s==='All'?sourceFrames.length:sourceFrames.filter(f=>f.state===s).length;
  return <div className="page data-browser"><PageHeader eyebrow="Library" title="Data Explorer" description="Browse the frames inside a fleet pool or dataset. Inspect sample state, provenance, quality, predictions, and acquisition signals." actions={<><Segmented value={view} onChange={setView} options={[['grid','Grid'],['list','List']]} /><Button icon={SlidersHorizontal} onClick={()=>setDetections(v=>!v)}>{detections?'Hide detections':'Show detections'}</Button></>} />
    <div className="browser-sourcebar"><div className="browser-source"><Database size={17}/><div><span>Browse source</span><select value={sourceId} onChange={e=>{setSourceId(e.target.value);setState('All');setActive(null)}}>{pools.map(p=><option key={p.id} value={p.id}>{p.name} · p{p.version} · {count(p.total)} frames</option>)}{datasets.map(d=><option key={d.id} value={d.id}>{d.name} · v{d.version} · {count(d.count)}</option>)}</select></div></div><div className="browser-source-meta"><span>{source?'Dataset':'Pool'}</span><strong>{source?count(source.count):count(sourcePool?.total||fleetPool.total)} frames</strong><small>{source?source.id:(sourcePool?.id||fleetPool.id)}</small></div></div>
    <div className="state-tabs-wrap"><div className="state-tabs">{availableStates.map(s=><button key={s} className={state===s?'state-tab state-tab--active':'state-tab'} onClick={()=>setState(s)}><span>{stateLabels[s]}</span><b>{s==='All'?count(source?source.count:(sourcePool?.total||0)):count(stateCount(s))}</b></button>)}</div>{!source&&<div className="lifecycle-help"><button type="button" aria-label="Explain pool lifecycle states">?</button><div className="lifecycle-help__popover" role="tooltip"><strong>Pool lifecycle</strong><p><b>Eligible</b> · candidate can be selected by Mining.</p><p><b>Reserved</b> · already selected into a Selection Batch or under review; temporarily unavailable for another run.</p><p><b>Labeled</b> · annotation has returned; excluded from the candidate set.</p><p><b>Excluded</b> · blocked by corrupt, deduplication, or eligibility policy.</p></div></div>}</div>
    <div className="explorer-toolbar browser-filters"><div className="search-field"><Search size={15}/><input aria-label="Search frames" placeholder="Search frame ID or source video…" value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={domain} onChange={e=>setDomain(e.target.value)}>{['All domains','Urban','Night','Rain','Highway'].map(d=><option key={d}>{d}</option>)}</select><select aria-label="Weather"><option>All weather</option><option>Clear</option><option>Rain</option><option>Fog</option></select><select aria-label="Quality"><option>All quality</option><option>Good</option><option>Quarantined</option></select></div>
    <div className="section-caption"><span>{visible.length} preview samples <i>·</i> {sourceName}</span><span>Click a frame to inspect</span></div>
    <div className={view==='grid'?'frame-grid':'frame-list'}>{visible.map(f=><article className="frame-card browser-frame" key={f.id} onClick={()=>{setActive(f);setInspectorTab('overview')}}><button className="frame-card__preview" aria-label={`Inspect ${f.id}`}><Scene scene={f.scene}/>{detections&&f.state!=='Raw'&&f.state!=='Excluded'&&<><span className="mock-box mock-box--car">car</span><span className="mock-box mock-box--person">pedestrian</span></>}<span className={`sample-state sample-state--${f.state.toLowerCase()}`}>{stateLabels[f.state] || f.state}</span></button><div className="frame-card__meta"><strong>{f.id}</strong><span>{f.domain}</span></div><div className="frame-card__foot"><span>{f.weather} · {f.objects} objects</span><span>{f.video}</span></div></article>)}</div>{!visible.length&&<Empty title="No matching frames" detail="Change lifecycle state or filters."/>}
    {active&&<Modal sheet title="Sample inspector" onClose={()=>setActive(null)} footer={<Button icon={Download} onClick={()=>{downloadJSON(`${active.id}.metadata.json`,{schemaVersion:'roadsift.sample.v1',sample:active});notify('Sample metadata exported')}}>Export metadata</Button>}><div className="inspector-scene inspector-scene--large"><Scene scene={active.scene}/>{detections&&active.state!=='Raw'&&active.state!=='Excluded'&&<><span className="mock-box mock-box--car">car · 0.91</span><span className="mock-box mock-box--person">pedestrian · 0.78</span></>}</div><div className="inspector-title"><div><h3>{active.id}</h3><p>{active.video} · {active.time}</p></div><Badge>{stateLabels[active.state]||active.state}</Badge></div><div className="inspector-tabs">{['overview','provenance','quality','predictions','acquisition','annotation'].map(tab=><button key={tab} className={inspectorTab===tab?'active':''} onClick={()=>setInspectorTab(tab)}>{tab[0].toUpperCase()+tab.slice(1)}</button>)}</div><div className="inspector-tab-body">{inspectorTab==='overview'&&<div className="detail-stats"><StatRow label="Source" value={sourceName}/><StatRow label="State" value={stateLabels[active.state]}/><StatRow label="Domain" value={active.domain}/><StatRow label="Weather" value={active.weather}/><StatRow label="Objects" value={active.objects}/><StatRow label="Timestamp" value={active.time}/></div>}{inspectorTab==='provenance'&&<div className="detail-stats"><StatRow label="Registry source" value={source?source.id:sourcePool?.id}/><StatRow label="Pool snapshot" value={sourcePool?.snapshot||source?.pool||'—'}/><StatRow label="Video" value={active.video}/><StatRow label="Sample ID" value={active.id}/></div>}{inspectorTab==='quality'&&<div className="inspector-mini-grid"><div><span>Quality</span><strong>{active.quality}</strong></div><div><span>Blur</span><strong>{active.blur.toFixed(2)}</strong></div><div><span>Brightness</span><strong>{active.brightness.toFixed(2)}</strong></div><div><span>Policy</span><strong>{active.state==='Excluded'?'Blocked':'Usable'}</strong></div></div>}{inspectorTab==='predictions'&&<div className="detail-stats"><StatRow label="Detector" value={source?.model||'YOLO11m acquisition model'}/><StatRow label="Detections" value={active.objects}/><StatRow label="Top classes" value="Car · Pedestrian · Cyclist"/><StatRow label="Cache" value="Available"/></div>}{inspectorTab==='acquisition'&&<><div className="score-bars"><ScoreBar label="Uncertainty" value={active.uncertainty}/><ScoreBar label="Safety" value={active.safety}/><ScoreBar label="Diversity" value={active.diversity}/><ScoreBar label="Redundancy" value={active.redundancy}/></div><div className="detail-stats"><StatRow label="Acquisition score" value={active.score.toFixed(2)}/><StatRow label="Selection eligibility" value={stateLabels[active.state]}/></div></>}{inspectorTab==='annotation'&&<div className="detail-stats"><StatRow label="Annotation state" value={active.state==='Labeled'?(active.reviewed?'Reviewed':'Labeled'):'Not labeled'}/><StatRow label="Instances" value={active.state==='Labeled'?active.objects:'—'}/><StatRow label="Format" value={active.state==='Labeled'?'COCO bounding boxes':'—'}/><StatRow label="Ownership" value="External annotation system"/></div>}</div></Modal>}</div>;
}

export function ImportData({ notify, navigate, setPools }) {
  const [sourceMode,setSourceMode]=useState(importSimulation.sourceAdapters?.[0]?.id||'upload');
  const [mode,setMode]=useState(importSimulation.defaultMode);
  const [files,setFiles]=useState([]);
  const [fps,setFps]=useState(importSimulation.defaultFps);
  const [name,setName]=useState(importSimulation.defaultPoolName);
  const [prefix,setPrefix]=useState('r2://roadsift/incoming/hanoi-october/');
  const [manifestUri,setManifestUri]=useState('r2://roadsift/manifests/hanoi-october.parquet');
  const [manifestFormat,setManifestFormat]=useState(importSimulation.defaultManifestFormat);
  const [validated,setValidated]=useState(false);
  const [status,setStatus]=useState('idle');
  const [jobId,setJobId]=useState('');
  const input=useRef(null);
  const extracted=mode==='videos'?importSimulation.videoFrames:(files.length||importSimulation.imageFramesFallback);
  const sourceReady=sourceMode==='existing'?Boolean(prefix.trim()):sourceMode==='manifest'?Boolean(manifestUri.trim()):files.length>0;
  const poolSlug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const stagedUri=`${importSimulation.stagingRoot}${poolSlug||'new-pool'}/`;
  const poolStorage=`${importSimulation.storageRoot}${poolSlug||'new-pool'}/`;
  const sourceLabel=sourceMode==='upload'?`${files.length} local file${files.length===1?'':'s'} → direct R2 upload`:sourceMode==='existing'?prefix:manifestUri;
  const validate=()=>{
    const ok=Boolean(name.trim()&&sourceReady);
    setValidated(ok);
    notify(ok?'Ingest preflight passed':'Ingest preflight blocked · resolve source and Pool identity');
  };
  useEffect(()=>{
    if(!['queued','processing','validating'].includes(status)) return;
    const next={queued:'processing',processing:'validating',validating:'complete'}[status];
    const timer=setTimeout(()=>setStatus(next),650);
    return()=>clearTimeout(timer);
  },[status]);
  useEffect(()=>{
    if(status!=='complete'||!jobId) return;
    const now=new Date().toISOString();
    const eligible=Math.max(0,extracted-importSimulation.duplicatesFlagged-importSimulation.qualityFlagged);
    const record={id:`pool_${poolSlug}_${jobId.slice(-4)}`,name,slug:poolSlug,version:1,snapshot:`pool_snap_${jobId.slice(-8)}`,total:extracted,eligible,labeled:0,reserved:0,excluded:extracted-eligible,indexed:now,storage:poolStorage,source:sourceLabel,status:'Active',eligibleTrend:[eligible],miningRuns7d:0,lastMiningAt:now,composition:{Unclassified:eligible},quality:{Good:eligible},stateBreakdown:{Eligible:eligible,Reserved:0,Labeled:0,Excluded:extracted-eligible},recentSnapshots:[{version:1,eligible,total:extracted,reason:'Ingest job complete',at:now}],sampleScenes:[0,1,2,3],schemaVersion:'roadsift.pool-snapshot.v1',manifestUri:`${importSimulation.manifestRoot}${poolSlug}/manifest.parquet`,owner:'Fleet Data Ops',createdBy:'ingest-worker',updatedAt:now};
    setPools?.(list=>list.some(p=>p.id===record.id)?list:[record,...list]);
    notify('Ingest Worker completed · Pool snapshot registered');
  },[status,jobId]);
  const submit=()=>{
    if(!validated){validate();return;}
    const id=`ingest_${new Date().toISOString().replace(/[-:T]/g,'').slice(0,12)}_${Date.now().toString(36).slice(-4)}`;
    setJobId(id);setStatus('queued');notify('Ingest job queued');
  };
  const worker=importSimulation.workerPolicy;
  const lifecycle=importSimulation.lifecycle||['Queued','Processing','Validating','Complete'];
  return <div className="page import-enterprise"><PageHeader eyebrow="Data operations" title="Create Ingest Job" description="Stage or reference source media, then let an Ingest Worker materialize a reproducible Pool snapshot." actions={<Button icon={Database} onClick={()=>navigate('pools')}>Pool registry</Button>}/>
    <div className="control-plane-note"><div><strong>Control plane</strong><span>RoadSift API creates the job, issues presigned upload access, validates references and enqueues work.</span></div><ArrowRight size={16}/><div><strong>Data plane</strong><span>Ingest Worker reads/writes R2, extracts frames, validates metadata and creates the Pool snapshot.</span></div></div>
    <div className="enterprise-stepper"><span className="active">1 · Source</span><i/><span className="active">2 · Worker policy</span><i/><span className={validated?'active':''}>3 · Preflight</span><i/><span className={status!=='idle'?'active':''}>4 · Execute</span><i/><span className={status==='complete'?'active':''}>5 · Pool snapshot</span></div>
    <div className="enterprise-form-grid"><section>
      <Panel title="Source adapter" description="Choose how the worker resolves input media. Local files are uploaded directly to R2; they do not pass through the application server."><div className="source-adapter-grid">{importSimulation.sourceAdapters.map(adapter=><button key={adapter.id} className={sourceMode===adapter.id?'source-adapter source-adapter--active':'source-adapter'} onClick={()=>{setSourceMode(adapter.id);setValidated(false)}}><strong>{adapter.label}</strong><span>{adapter.description}</span></button>)}</div>
        {sourceMode==='upload'&&<><div className="segmented compact"><button className={mode==='videos'?'active':''} onClick={()=>{setMode('videos');setValidated(false)}}>Videos</button><button className={mode==='images'?'active':''} onClick={()=>{setMode('images');setValidated(false)}}>Images</button></div><input ref={input} className="sr-only" type="file" multiple accept={mode==='videos'?'video/*':'image/*'} onChange={e=>{setFiles([...e.target.files]);setValidated(false)}}/><button className="import-dropzone" onClick={()=>input.current?.click()}><Cloud size={24}/><strong>{files.length?`${files.length} files ready for direct R2 staging`:'Choose local media'}</strong><small>Browser → presigned upload → {stagedUri}</small></button></>}
        {sourceMode==='existing'&&<Field label="Existing R2 prefix" help="Worker scans this prefix in place; media is not copied through the API server."><input value={prefix} onChange={e=>{setPrefix(e.target.value);setValidated(false)}}/></Field>}
        {sourceMode==='manifest'&&<div className="register-grid"><Field label="Manifest URI"><input value={manifestUri} onChange={e=>{setManifestUri(e.target.value);setValidated(false)}}/></Field><Field label="Manifest format"><select value={manifestFormat} onChange={e=>{setManifestFormat(e.target.value);setValidated(false)}}>{importSimulation.manifestFormats.map(v=><option key={v}>{v}</option>)}</select></Field></div>}
      </Panel>
      <Panel title="Worker processing policy" description="These settings are executed asynchronously by the Ingest Worker after the job enters the queue.">{mode==='videos'&&sourceMode!=='manifest'&&<Field label="Frame extraction rate" help="Worker-side FFmpeg extraction policy."><select value={fps} onChange={e=>{setFps(e.target.value);setValidated(false)}}>{importSimulation.fpsOptions.map(v=><option key={v} value={v}>{v} FPS</option>)}</select></Field>}<div className="worker-policy-list"><div><Check size={14}/><span>Quality checks</span><strong>{worker.qualityChecks?'Enabled':'Disabled'}</strong></div><div><Check size={14}/><span>Deduplication</span><strong>{worker.deduplication?'Enabled':'Disabled'}</strong></div><div><Check size={14}/><span>Metadata index</span><strong>{worker.metadataIndex?'Enabled':'Disabled'}</strong></div><div><Cpu size={14}/><span>Execution</span><strong>{worker.worker} · {worker.queue}</strong></div></div></Panel>
      <Panel title="Pool destination" description="The worker writes normalized artifacts and registers one immutable Pool snapshot."><Field label="Pool name"><input value={name} onChange={e=>{setName(e.target.value);setValidated(false)}}/></Field><div className="detail-stats"><StatRow label="Raw staging" value={sourceMode==='upload'?stagedUri:'No staging copy'}/><StatRow label="Pool storage" value={poolStorage}/><StatRow label="Manifest" value={`${importSimulation.manifestRoot}${poolSlug||'new-pool'}/manifest.parquet`}/><StatRow label="Membership" value="Immutable snapshot"/></div></Panel>
    </section>
    <aside><Panel title="Preflight & submit" description="The API validates the job contract and enqueues it. Heavy media processing never runs in the web server."><div className="preflight-list"><div className={name.trim()?'pass':'fail'}><Check size={13}/>Pool identity resolved</div><div className={sourceReady?'pass':'fail'}><Check size={13}/>Source reference resolved</div><div className="pass"><Check size={13}/>R2 access available</div><div className="pass"><Check size={13}/>Worker queue available</div><div className="pass"><Check size={13}/>Manifest schema configured</div></div><div className="job-spec-preview"><div><span>Ingest job contract</span><Badge>{validated?'Ready':'Draft'}</Badge></div><code>source_adapter={sourceMode}</code><code>worker={worker.worker}</code><code>queue={worker.queue}</code><code>media={sourceMode==='manifest'?'manifest':mode}</code><code>extract_fps={mode==='videos'&&sourceMode!=='manifest'?fps:'n/a'}</code><code>destination={poolStorage}</code></div><div className="button-row"><Button className="wide" onClick={validate}>Validate contract</Button><Button variant="primary" className="wide" icon={Play} disabled={['queued','processing','validating'].includes(status)} onClick={submit}>Create ingest job</Button></div></Panel>
      {status!=='idle'&&<Panel title={jobId||'Ingest job'} description="Asynchronous worker execution status."><div className="job-lifecycle">{lifecycle.map((step,index)=>{const current={queued:0,processing:1,validating:2,complete:3}[status]??-1;return <div key={step} className={index<current?'done':index===current?'current':''}><span>{index<current?<Check size={12}/>:index+1}</span><strong>{step}</strong></div>})}</div>{status==='processing'&&<p className="job-status-note">Worker is reading source objects and writing normalized artifacts to R2.</p>}{status==='validating'&&<p className="job-status-note">Worker is validating manifest integrity, quality flags and deduplication results.</p>}{status==='complete'&&<div className="section-actions"><Button icon={ArrowRight} onClick={()=>navigate('pools')}>Open Pool snapshot</Button></div>}</Panel>}
    </aside></div>
  </div>;
}

export function Mining({ notify, setRuns, runs, navigate, datasets, pools, runnerRegistry, modelRegistryState, algorithmRegistry }) {
  const [poolId,setPoolId]=useState(pools[0]?.id||'');
  const [parentId,setParentId]=useState('');
  const [algorithmId,setAlgorithmId]=useState(miningConfig.defaultStrategyId);
  const [budget,setBudget]=useState(String(miningConfig.defaultBudget));
  const [modelId,setModelId]=useState(miningConfig.defaultModelId||'');
  const [runnerId,setRunnerId]=useState('auto');
  const [submittedId,setSubmittedId]=useState(null);
  const [simulateFailure,setSimulateFailure]=useState(false);
  const pool=pools.find(p=>p.id===poolId);
  const parent=datasets.find(d=>d.id===parentId);
  const algorithm=algorithmRegistry.find(s=>s.id===algorithmId);
  const requiresPrediction=Boolean(algorithm?.requiresPredictionModel);
  const requiresEmbedding=Boolean(algorithm?.requiresEmbedding);
  const model=modelRegistryState.find(m=>m.id===modelId);
  const modelUsable=Boolean(model&&model.status==='Registered'&&model.capabilities?.includes('predictions')&&model.artifactUri);
  const n=Number(budget);
  const exactNValid=Number.isSafeInteger(n)&&n>0&&n<=(pool?.eligible||0);
  const busyRunnerIds=new Set(runs.filter(r=>r.type==='Mining'&&['Queued','Running','Validating'].includes(r.status)).map(r=>r.runnerId));
  const health=r=>{
    if(r.status!=='Ready')return {ok:false,label:r.status==='Pending verification'?'Pending verification':r.status};
    if(r.verified===false)return {ok:false,label:'Not verified'};
    if(!r.lastHeartbeatAt)return {ok:false,label:'No heartbeat'};
    const heartbeat=Date.parse(r.lastHeartbeatAt);
    if(!Number.isFinite(heartbeat))return {ok:false,label:'Invalid heartbeat'};
    // Fixture heartbeats represent seeded test resources; they are explicitly
    // simulated, never evidence of a connected runner.
    if(r.fixture===true)return {ok:true,label:'Fixture · simulated Ready'};
    return {ok:false,label:'Live heartbeat check unavailable'};
  };
  const suitable=r=>Boolean(r.allowedStrategyIds?.includes(algorithmId)&&(!requiresEmbedding||r.capabilities?.includes('embedding')));
  const runnable=runnerRegistry.filter(r=>health(r).ok&&suitable(r));
  const freeSlots=r=>Math.max(0,(r.maxConcurrent||1)-(r.queueDepth||0)-(busyRunnerIds.has(r.id)?1:0));
  const chosen=runnerId==='auto'?runnable.find(r=>freeSlots(r)>0):runnerRegistry.find(r=>r.id===runnerId);
  const runnerReady=Boolean(chosen&&runnable.some(r=>r.id===chosen.id)&&freeSlots(chosen)>0);
  const checks=[
    {name:'Registered Pool Snapshot + manifest',ok:Boolean(pool?.snapshot&&pool?.manifestUri)},
    {name:'EXACT-N within eligible capacity',ok:exactNValid},
    {name:'Enabled algorithm implementation + version',ok:Boolean(algorithm&&algorithm.enabled!==false&&algorithm.version)},
    {name:requiresPrediction?'Registered prediction model and artifact':'Prediction model not required',ok:!requiresPrediction||modelUsable},
    {name:requiresEmbedding?'Runner supports embedding':'Embedding not required',ok:!requiresEmbedding||Boolean(chosen?.capabilities?.includes('embedding'))},
    {name:'Verified compatible runner with free capacity',ok:runnerReady}
  ];
  const ready=checks.every(x=>x.ok);
  const contract={schemaVersion:miningConfig.contractSchema,poolSnapshotId:pool?.snapshot||null,
    poolManifestUri:pool?.manifestUri||null,parentDatasetVersionId:parent?.id||null,
    algorithmId:algorithm?.id||null,algorithmVersion:algorithm?.version||null,
    algorithmWeights:algorithm?.weights||null,
    registeredModelId:requiresPrediction?model?.id||null:null,
    modelArtifactUri:requiresPrediction?model?.artifactUri||null:null,
    budget:n,exactN:true,runnerId:chosen?.id||null};
  const fingerprint=value=>{
    const s=JSON.stringify(value);let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return 'fnv1a-'+(h>>>0).toString(16).padStart(8,'0');
  };
  const configFingerprint=fingerprint(contract);
  const submitted=runs.find(r=>r.id===submittedId);
  const submit=()=>{
    if(!ready){notify('Preflight blocked · fix invalid dependencies');return;}
    const now=new Date().toISOString(),nonce=Date.now().toString(36);
    const id=`mine_${now.replace(/[-:T]/g,'').slice(0,12)}_${nonce.slice(-5)}`;
    const batchId=`batch_${pool.slug.replace(/-/g,'_')}_${nonce.slice(-6)}`;
    const jobContract={...contract,configFingerprint};
    const batchName=`${pool.name} · ${algorithm.name} · ${count(n)} samples`;
    const plannedBatch={id:batchId,name:batchName,status:'In review',strategy:algorithm.name,algorithmId:algorithm.id,
      sourcePoolId:pool.id,sourceSnapshot:pool.snapshot,baseDatasetId:parent?.id||null,
      registeredModelId:requiresPrediction?model.id:null,runId:id,count:n,
      schemaVersion:'roadsift.selection-batch.v1',
      manifestUri:`r2://roadsift/batches/${batchId}/manifest.parquet`,
      membershipHash:`simulated:${fingerprint({batchId,runId:id,count:n})}`,owner:'Perception Data Ops',
      createdBy:'mock-worker',review:{reviewed:0,approved:0,rejected:0,deferred:0,finalizedAt:null},
      handoff:{status:'Not started',destination:null,sentAt:null,manifestUri:null},
      annotationReturn:{status:'Not started',expected:0,returned:0,validation:null,uri:null,receivedAt:null}};
    const record={id,type:'Mining',name:`${algorithm.name} · ${pool.name}`,status:'Queued',executionMode:'mock-worker',
      source:`${pool.name} p${pool.version}`,sourcePoolId:pool.id,dataset:parent?`${parent.name} v${parent.version}`:'None',
      output:'Pending worker execution',plannedBatch,frames:pool.eligible,selected:0,budget:n,
      executor:chosen.name,runnerId:chosen.id,duration:'—',date:now,updatedAt:now,
      owner:'Perception Data Ops',createdBy:'mining-orchestrator',attempt:1,retryable:true,simulateFailure,
      contract:jobContract,configFingerprint,outputBatchId:null};
    setRuns(list=>[record,...list]);setSubmittedId(id);
    notify('Mining Run queued · awaiting mock worker');
  };
  return <div className="page mining-page mining-page--production">
    <PageHeader eyebrow="Active learning operations" title="New Mining Run" description="Configure a reproducible selection run using registered resources." actions={<Button icon={HistoryIcon} onClick={()=>navigate('history')}>Runs</Button>}/>
    <div className="mining-builder">
      <section className="mining-builder__main">
        <details className="panel mining-accordion" open><summary className="mining-accordion__summary"><strong>Candidate Source</strong><small>{pool?.name||'Choose Pool'} · {pool?.snapshot||'Missing snapshot'}</small></summary><div className="panel__body">
          <Field label="Pool Snapshot *" help="Only eligible sample IDs from this immutable snapshot may be selected."><select value={poolId} onChange={e=>setPoolId(e.target.value)}>{pools.map(p=><option key={p.id} value={p.id}>{p.name} · p{p.version} · {count(p.eligible)} eligible</option>)}</select></Field>
          <div className="mining-source-meta"><StatRow label="Snapshot" value={pool?.snapshot||'—'}/><StatRow label="Eligible" value={count(pool?.eligible||0)}/><StatRow label="Manifest URI" value={pool?.manifestUri||'Missing'}/></div>
        </div></details>
        <details className="panel mining-accordion" open><summary className="mining-accordion__summary"><strong>Acquisition Context</strong><small>{parent?`${parent.name} v${parent.version}`:'No parent dataset'} · {requiresPrediction?(model?.name||'Select model'):'No detector required'}</small></summary><div className="panel__body mining-field-stack">
          <Field label="Parent Dataset Version · Optional" help="Lineage reference only; the model is selected independently."><select value={parentId} onChange={e=>setParentId(e.target.value)}><option value="">None · independent Pool mining</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.name} · v{d.version}</option>)}</select></Field>
          {requiresPrediction&&<Field label="Registered Prediction Model *"><select value={modelId} onChange={e=>setModelId(e.target.value)}><option value="">Select model</option>{modelRegistryState.filter(m=>m.status==='Registered'&&m.capabilities?.includes('predictions')).map(m=><option key={m.id} value={m.id}>{m.name} · {m.version}</option>)}</select></Field>}
          {requiresPrediction&&<div className="mining-model-ref"><StatRow label="Model artifact" value={model?.artifactUri||'Unresolved'}/></div>}
          <Button variant="ghost" onClick={()=>navigate('system')}>Manage Model registry and runners <ArrowRight size={13}/></Button>
        </div></details>
        <details className="panel mining-accordion" open><summary className="mining-accordion__summary"><strong>Selection Algorithm</strong><small>{algorithm?.name} · EXACT-{Number.isFinite(n)?count(n):'—'}</small></summary><div className="panel__body mining-field-stack">
          <div className="register-grid"><Field label="Algorithm *"><select value={algorithmId} onChange={e=>setAlgorithmId(e.target.value)}>{algorithmRegistry.filter(a=>a.enabled!==false).map(a=><option key={a.id} value={a.id}>{a.name} · v{a.version}</option>)}</select></Field>
            <Field label="Budget (EXACT-N) *"><input type="number" min="1" step="1" value={budget} onChange={e=>setBudget(e.target.value)}/></Field></div>
          <p className="mining-algorithm-description">{algorithm?.description}</p>
          <details className="advanced-config"><summary>Advanced algorithm configuration</summary>{algorithm?.weights?<div className="strategy-params">{Object.entries(algorithm.weights).map(([k,v])=><div key={k}><span>{k}</span><strong>{Number(v).toFixed(2)}</strong></div>)}</div>:<p>Uses the registered algorithm defaults.</p>}</details>
        </div></details>
        <details className="panel mining-accordion" open><summary className="mining-accordion__summary"><strong>Execution</strong><small>{chosen?.name||'No eligible runner'} · {runnerId==='auto'?'Auto assignment':'Manual assignment'}</small></summary><div className="panel__body">
          <Field label="Runner assignment *"><select value={runnerId} onChange={e=>setRunnerId(e.target.value)}><option value="auto">Auto · available compatible worker</option>{runnerRegistry.map(r=><option key={r.id} value={r.id}>{r.name} · {health(r).label}</option>)}</select></Field>
          <div className="mining-source-meta"><StatRow label="Runner" value={chosen?.name||'Unavailable'}/><StatRow label="Health" value={chosen?health(chosen).label:'Not assigned'}/><StatRow label="Free capacity" value={chosen?String(freeSlots(chosen)):'0'}/></div>
          <details className="advanced-config"><summary>Simulation controls</summary><label className="mining-simulation-toggle"><input type="checkbox" checked={simulateFailure} onChange={e=>setSimulateFailure(e.target.checked)}/> Simulate worker failure (exercise retry)</label></details>
          <p className="mining-simulation-disclaimer">Seeded runners are simulated test resources. Newly registered runners require a verified heartbeat before they can execute jobs.</p>
        </div></details>
      </section>
      <aside className="mining-builder__side"><Panel title="Review & submit" description="Preflight validates every algorithm dependency and the immutable job contract.">
        <div className="preflight-list">{checks.map(x=><div key={x.name} className={x.ok?'pass':'fail'}><Check size={13}/>{x.name}</div>)}</div>
        <div className="job-spec-preview"><div><span>Job contract</span><Badge>{ready?'Ready':'Blocked'}</Badge></div>
          <code>pool: {contract.poolSnapshotId||'—'}</code><code>parent: {contract.parentDatasetVersionId||'none'}</code>
          <code>algorithm: {algorithm?.id}@{algorithm?.version}</code><code>model: {contract.registeredModelId||'none'}</code>
          <code>budget: {exactNValid?count(n):'invalid'}</code><code>runner: {chosen?.id||'none'}</code>
          <code>config fingerprint: {configFingerprint}</code>
        </div>
        {!exactNValid&&<p className="mining-inline-error">EXACT-N blocked: enter an integer from 1 to {count(pool?.eligible||0)}. Budget is never reduced automatically.</p>}
        <div className="submit-note"><strong>Result contract</strong><span>Submit queues a Mining Run. The worker publishes a Selection Batch only after successful validation; it never creates a Dataset.</span></div>
        <Button className="wide" variant="primary" icon={Play} disabled={!ready} onClick={submit}>Submit Mining Run</Button>
        <p className="mining-simulation-disclaimer">This frontend uses a local mock worker. No remote GPU job is submitted.</p>
      </Panel></aside>
    </div>
    {submitted&&<div className="mining-result"><div className="mining-result__head"><span className="completion-card__icon"><Check size={20}/></span><div><small>Mining Run {submitted.status}</small><h3>{submitted.id}</h3><p>{submitted.executor} · EXACT-{count(submitted.budget)} · {submitted.configFingerprint}</p></div><Badge>{submitted.status}</Badge></div>
      <div className="section-actions"><Button onClick={()=>navigate('history')}>Open Run details</Button>{submitted.status==='Complete'&&<Button variant="primary" onClick={()=>navigate('batches')}>Open Selection Batch</Button>}</div>
    </div>}
  </div>;
}

export function SelectionBatches({ selectionBatches, setSelectionBatches, datasets, pools, navigate, notify }) {
  const [query,setQuery]=useState(''), [status,setStatus]=useState('All'), [selected,setSelected]=useState(null);
  const statuses=['All',...batchLifecycle.map(x=>x.label)];
  const results=selectionBatches.filter(b=>(status==='All'||b.status===status)&&(`${b.name} ${b.id} ${b.runId}`).toLowerCase().includes(query.toLowerCase()));
  const updateBatch=(id,fn)=>setSelectionBatches(list=>list.map(b=>b.id===id?fn(b):b));
  const syncSelected=next=>{setSelected(next);updateBatch(next.id,()=>next);};
  const finalizeReview=()=>{
    if(!selected) return;
    const now=new Date().toISOString(), rejected=Math.max(selected.review?.rejected||0,Math.round(selected.count*.025));
    const approved=selected.count-rejected;
    const next={...selected,status:'Curated',updatedAt:now,review:{reviewed:selected.count,approved,rejected,deferred:0,finalizedAt:now},audit:[...(selected.audit||[]),{at:now,actor:'data.ops@roadsift',event:'Curated membership finalized'}]};
    syncSelected(next);notify('Curated membership finalized');
  };
  const createHandoff=()=>{
    if(!selected) return;
    const now=new Date().toISOString();
    const next={...selected,status:'Handed off',updatedAt:now,handoff:{status:'Sent',destination:`CVAT · Job #${String(Date.now()).slice(-4)}`,sentAt:now,manifestUri:`r2://roadsift/handoffs/${selected.id}.json`},annotationReturn:{...(selected.annotationReturn||{}),status:'Not started',expected:selected.review?.approved||selected.count,returned:0},audit:[...(selected.audit||[]),{at:now,actor:'data.ops@roadsift',event:'Handoff sent to external annotation'}]};
    syncSelected(next);notify('Handoff created');
  };
  const registerReturn=()=>{
    if(!selected) return;
    const now=new Date().toISOString(), expected=selected.annotationReturn?.expected||selected.review?.approved||selected.count;
    const next={...selected,status:'Annotation returned',updatedAt:now,annotationReturn:{status:'Validated',expected,returned:expected,validation:'Passed',uri:`r2://roadsift/annotation-returns/${selected.id}/annotations.json`,receivedAt:now},audit:[...(selected.audit||[]),{at:now,actor:'annotation-import',event:'Annotation return validated'}]};
    syncSelected(next);notify('Annotation return registered');
  };
  const poolOf=b=>pools.find(p=>p.id===b.sourcePoolId);
  const datasetOf=b=>datasets.find(d=>d.id===b.baseDatasetId);
  const reviewPct=b=>Math.round(((b.review?.reviewed||0)/Math.max(1,b.count))*100);
  return <div className="page batches-page"><PageHeader eyebrow="Curation operations" title="Selection Batches" description="Review, freeze, hand off and reconcile the immutable outputs of Mining runs." actions={<Button icon={Pickaxe} onClick={()=>navigate('mining')}>New mining run</Button>}/>
    <div className="history-toolbar"><div className="search-field"><Search size={16}/><input placeholder="Batch ID, run, dataset…" value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select><Badge>{results.length} batches</Badge></div>
    <section className="catalog"><div className="table-scroll"><table className="dataset-table batches-table"><thead><tr><th>Batch</th><th>Status</th><th>Source</th><th>Base dataset</th><th>Membership</th><th>Review</th><th>Handoff</th><th>Updated</th></tr></thead><tbody>{results.map(b=><tr key={b.id} tabIndex="0" role="button" onClick={()=>setSelected(b)}><td><div className="dataset-name-cell"><strong>{b.name}</strong><small>{b.id}</small></div></td><td><Badge>{b.status}</Badge></td><td>{poolOf(b)?.name||b.sourcePoolId}</td><td>{datasetOf(b)?.name||b.baseDatasetId}</td><td>{count(b.count)}</td><td><div className="batch-review-cell"><strong>{reviewPct(b)}%</strong><span>{count(b.review?.reviewed||0)} / {count(b.count)}</span></div></td><td>{b.handoff?.status||'Not started'}</td><td>{date(b.updatedAt)}</td></tr>)}</tbody></table></div></section>
    {selected&&<Modal sheet title="Selection Batch" onClose={()=>setSelected(null)} footer={<><Button icon={Download} onClick={()=>{downloadJSON(`${selected.id}.metadata.json`,{schemaVersion:selected.schemaVersion,batch:selected});notify('Batch metadata exported')}}>Export metadata</Button>{selected.status==='Annotation returned'&&<Button variant="primary" icon={ArrowRight} onClick={()=>navigate('datasets')}>Register Dataset version</Button>}</>}>
      <div className="detail-heading"><div className="detail-heading__meta"><Badge>{selected.status}</Badge><code>{selected.id}</code></div><h2>{selected.name}</h2><p>Immutable Mining output tracked through review, annotation handoff and Dataset materialization.</p></div>
      <details className="detail-section" open><summary><div><strong>Overview</strong><span>Identity, lineage and immutable membership.</span></div></summary><div className="detail-section__body"><div className="detail-stats"><StatRow label="Mining run" value={selected.runId}/><StatRow label="Pool snapshot" value={selected.sourceSnapshot}/><StatRow label="Base dataset" value={datasetOf(selected)?`${datasetOf(selected).name} v${datasetOf(selected).version}`:selected.baseDatasetId}/><StatRow label="Strategy" value={selected.strategy}/><StatRow label="Membership" value={count(selected.count)}/><StatRow label="Owner" value={selected.owner}/><StatRow label="Schema" value={selected.schemaVersion}/><StatRow label="Membership hash" value={selected.membershipHash}/><StatRow label="Manifest" value={selected.manifestUri}/></div></div></details>
      <details className="detail-section" open><summary><div><strong>Human review</strong><span>Approve, reject and defer decisions before membership is frozen.</span></div><Badge>{reviewPct(selected)}%</Badge></summary><div className="detail-section__body"><div className="batch-progress"><i style={{width:`${reviewPct(selected)}%`}}/></div><div className="batch-review-stats"><div><span>Reviewed</span><strong>{count(selected.review?.reviewed||0)}</strong></div><div><span>Approved</span><strong>{count(selected.review?.approved||0)}</strong></div><div><span>Rejected</span><strong>{count(selected.review?.rejected||0)}</strong></div><div><span>Deferred</span><strong>{count(selected.review?.deferred||0)}</strong></div></div>{selected.status==='In review'&&<div className="section-actions"><Button onClick={()=>navigate('data-explorer')}>Open review workspace</Button><Button variant="primary" onClick={finalizeReview}>Finalize curated batch</Button></div>}</div></details>
      <details className="detail-section" open><summary><div><strong>Annotation handoff</strong><span>External annotation ownership and return reconciliation.</span></div></summary><div className="detail-section__body"><div className="detail-stats"><StatRow label="Handoff status" value={selected.handoff?.status||'Not started'}/><StatRow label="Destination" value={selected.handoff?.destination||'—'}/><StatRow label="Sent" value={selected.handoff?.sentAt?date(selected.handoff.sentAt):'—'}/><StatRow label="Return status" value={selected.annotationReturn?.status||'Not started'}/><StatRow label="Expected / returned" value={`${count(selected.annotationReturn?.expected||0)} / ${count(selected.annotationReturn?.returned||0)}`}/><StatRow label="Validation" value={selected.annotationReturn?.validation||'—'}/></div>{selected.status==='Curated'&&<div className="section-actions"><Button variant="primary" onClick={createHandoff}>Create handoff</Button></div>}{selected.status==='Handed off'&&<div className="section-actions"><Button onClick={registerReturn}>Register annotation return</Button></div>}{selected.annotationReturn?.validation==='Warning'&&<div className="registration-error"><X size={18}/><div><strong>Return mismatch</strong><p>{count((selected.annotationReturn.expected||0)-(selected.annotationReturn.returned||0))} expected samples are missing. Reconcile before Dataset registration.</p></div></div>}</div></details>
      <details className="detail-section"><summary><div><strong>Audit trail</strong><span>Who changed this Batch and when.</span></div></summary><div className="detail-section__body"><div className="audit-list">{(selected.audit||[]).slice().reverse().map((a,i)=><div key={i}><span>{date(a.at)}</span><strong>{a.event}</strong><small>{a.actor}</small></div>)}</div></div></details>
    </Modal>}
  </div>;
}

export function History({ runs, setRuns, navigate, notify }) {
  const [query,setQuery]=useState(''), [filter,setFilter]=useState('All'), [selected,setSelected]=useState(null);
  const retry=run=>{
    if(!run.contract||!run.plannedBatch){notify('Historical run has no replayable contract. Create a new Mining Run.');return;}
    const now=new Date().toISOString(),id=`mine_retry_${Date.now().toString(36)}`;
    const batchId=`batch_retry_${Date.now().toString(36)}`;
    const attempt={...run,id,status:'Queued',date:now,updatedAt:now,attempt:(run.attempt||1)+1,
      retryOf:run.id,selected:0,output:'Pending worker execution',completedAt:null,
      simulateFailure:false,errorCode:null,errorMessage:null,
      plannedBatch:{...run.plannedBatch,id:batchId,runId:id,
        manifestUri:`r2://roadsift/batches/${batchId}/manifest.parquet`,
        membershipHash:`simulated:${id}`}};
    setRuns(list=>[attempt,...list]);setSelected(attempt);
    notify('New retry attempt queued using the same immutable contract');
  };
  const selectedLatest=selected?(runs.find(r=>r.id===selected.id)||selected):null;
  const results=runs.filter(r=>(filter==='All'||r.type===filter)&&(`${r.name} ${r.id} ${r.source} ${r.output}`).toLowerCase().includes(query.toLowerCase()));
  return <div className="page runs-page"><PageHeader eyebrow="Operations registry" title="Runs" description="Audit ingest and Mining jobs across the workspace." actions={<Button variant="primary" icon={Plus} onClick={()=>navigate('mining')}>New mining run</Button>}/>
    <div className="history-toolbar"><div className="search-field"><Search size={16}/><input aria-label="Search runs" placeholder="Run ID, source, output…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="segmented"><button className={filter==='All'?'active':''} onClick={()=>setFilter('All')}>All</button><button className={filter==='Import'?'active':''} onClick={()=>setFilter('Import')}>Ingest</button><button className={filter==='Mining'?'active':''} onClick={()=>setFilter('Mining')}>Mining</button></div><Badge>{results.length} records</Badge></div>
    <section className="catalog"><div className="table-scroll"><table className="dataset-table runs-table"><thead><tr><th>Run</th><th>Type</th><th>Status</th><th>Source</th><th>Output</th><th>Executor</th><th>Started</th><th>Duration</th></tr></thead><tbody>{results.map(r=><tr key={r.id} tabIndex="0" role="button" onClick={()=>setSelected(r)}><td><div className="dataset-name-cell"><strong>{r.name}</strong><small>{r.id}</small></div></td><td>{r.type==='Import'?'Ingest':r.type}</td><td><Badge>{r.status}</Badge></td><td>{r.source}</td><td>{r.output}</td><td>{r.executor}</td><td>{date(r.date)}</td><td>{r.duration}</td></tr>)}</tbody></table></div></section>
    {selected&&<Modal sheet title="Run details" onClose={()=>setSelected(null)} footer={<Button icon={Download} onClick={()=>{downloadJSON(`${selectedLatest.id}.json`,{schemaVersion:'roadsift.run.v1',run:selectedLatest});notify('Run record exported')}}>Export record</Button>}><div className="detail-heading"><div className="detail-heading__meta"><Badge>{selectedLatest.type==='Import'?'Ingest':selectedLatest.type}</Badge><Badge>{selectedLatest.status}</Badge></div><h2>{selectedLatest.name}</h2><code>{selectedLatest.id}</code></div><details className="detail-section" open><summary><div><strong>Execution summary</strong><span>Operational state and timing.</span></div></summary><div className="detail-section__body"><div className="detail-stats"><StatRow label="Source" value={selectedLatest.source}/><StatRow label="Output" value={selectedLatest.output}/><StatRow label="Executor" value={selectedLatest.executor}/><StatRow label="Started" value={date(selectedLatest.date)}/><StatRow label="Duration" value={selectedLatest.duration}/><StatRow label="Status" value={selectedLatest.status}/></div></div></details>{selectedLatest.status==='Failed'&&<details className="detail-section" open><summary><div><strong>Failure</strong><span>Executor error and retry eligibility.</span></div></summary><div className="detail-section__body"><div className="registration-error"><X size={18}/><div><strong>{selectedLatest.errorCode||'RUN_FAILED'}</strong><p>{selectedLatest.errorMessage||'The run did not complete.'}</p></div></div>{selectedLatest.retryable&&<Button disabled={!selectedLatest.contract||!selectedLatest.plannedBatch} onClick={()=>retry(selectedLatest)}>Retry from same contract</Button>}{selectedLatest.retryable&&(!selectedLatest.contract||!selectedLatest.plannedBatch)&&<p className="mining-simulation-disclaimer">Historical fixture lacks a complete replayable contract. Retry is blocked; create a new Mining Run.</p>}</div></details>}{selectedLatest.type==='Mining'&&<><details className="detail-section" open><summary><div><strong>Selection contract</strong><span>Inputs captured by this Active Learning run.</span></div></summary><div className="detail-section__body"><div className="detail-stats"><StatRow label="Base dataset" value={selectedLatest.dataset}/><StatRow label="Eligible at start" value={count(selectedLatest.frames)}/><StatRow label="Budget" value={count(selectedLatest.budget)}/><StatRow label="Selected" value={count(selectedLatest.selected)}/><StatRow label="Attempt" value={selectedLatest.attempt||1}/><StatRow label="Retry of" value={selectedLatest.retryOf||'—'}/><StatRow label="Fingerprint" value={selectedLatest.configFingerprint||'Legacy fixture'}/></div></div></details><details className="detail-section"><summary><div><strong>Artifacts</strong><span>Immutable outputs from the executor.</span></div></summary><div className="detail-section__body"><div className="run-artifacts">{miningConfig.artifacts.map(a=><span key={a}>{a}</span>)}</div></div></details></>}</Modal>}
  </div>;
}

export function StrategyComparison({ navigate }) {
  const [experimentId,setExperimentId]=useState(comparisonExperiments[0]?.id||'');
  const [metric,setMetric]=useState('map');
  const [selectedRound,setSelectedRound]=useState(8);
  const exp=comparisonExperiments.find(x=>x.id===experimentId);
  const rows=evaluationRegistry.filter(x=>x.experimentId===experimentId);
  const arms=exp?.arms||[];
  const record=(arm,round)=>rows.find(x=>x.armId===arm&&x.round===round);
  const roundIds=[...new Set(rows.map(x=>x.round))].sort((a,b)=>a-b);
  const checks=[
    {label:'Same initial labeled dataset',ok:Boolean(exp?.initialDatasetVersionId&&arms.every(a=>!a.initialDatasetVersionId||a.initialDatasetVersionId===exp.initialDatasetVersionId))},
    {label:'Same immutable candidate Pool snapshot',ok:Boolean(exp?.candidatePoolSnapshotId&&arms.every(a=>!a.candidatePoolSnapshotId||a.candidatePoolSnapshotId===exp.candidatePoolSnapshotId))},
    {label:'Same training recipe and random seed',ok:Boolean(exp?.recipeId&&Number.isInteger(exp.trainingSeed)&&rows.every(x=>x.recipeId===exp.recipeId&&x.trainingSeed===exp.trainingSeed))},
    {label:'Same fixed holdout',ok:Boolean(exp?.holdoutId&&rows.every(x=>x.holdoutId===exp.holdoutId))},
    {label:'Same initial dataset in evaluation records',ok:Boolean(rows.length&&rows.every(x=>x.initialDatasetVersionId===exp.initialDatasetVersionId))},
    {label:'Both strategies have paired rounds and EXACT-N budgets',ok:Boolean(roundIds.length===exp?.expectedRounds+1&&roundIds.every(r=>arms.every(a=>{const x=record(a.id,r);return x&&x.cumulativeLabeled===8000+r*exp.expectedRoundBudget&&x.budgetIncrement===(r===0?0:exp.expectedRoundBudget)})))},
    {label:'Evaluation metrics and provenance present',ok:Boolean(rows.length&&roundIds.every(r=>arms.every(a=>{const x=record(a.id,r);return x&&Number.isFinite(x.metrics?.[metric])&&x.recordType==='synthetic_fixture'})))}
  ];
  const valid=checks.every(c=>c.ok);
  const points=valid?roundIds.map(round=>({round,label:round?'R'+round:'Seed',samples:record(arms[0].id,round).cumulativeLabeled,
    a:record(arms[0].id,round).metrics[metric],b:record(arms[1].id,round).metrics[metric]})):[];
  const chosen=valid?(points.find(p=>p.round===selectedRound)||points.at(-1)):null;
  const latest=points.at(-1);
  const values=points.flatMap(p=>[p.a,p.b]);
  const low=values.length?Math.min(...values)-.012:0,high=values.length?Math.max(...values)+.012:1;
  const px=i=>64+i*(746/Math.max(1,points.length-1));
  const py=v=>218-(v-low)/(high-low)*178;
  const path=key=>points.map((p,i)=>`${i?'L':'M'}${px(i).toFixed(1)},${py(p[key]).toFixed(1)}`).join(' ');
  const metrics=[['map','mAP50–95'],['recall','Recall'],['vru','VRU Recall'],['night','Night Recall'],['rain','Rain/Fog Recall']];
  const selectedA=chosen?record(arms[0].id,chosen.round):null;
  const selectedB=chosen?record(arms[1].id,chosen.round):null;
  const sumCost=(arm,round)=>rows.filter(x=>x.armId===arm&&x.round<=round).reduce((n,x)=>n+x.annotationCostUsdIncrement,0);
  const sumHours=(arm,round)=>rows.filter(x=>x.armId===arm&&x.round<=round).reduce((n,x)=>n+x.annotationHoursIncrement,0);
  const delta=chosen?chosen.b-chosen.a:null;
  const format=v=>Number.isFinite(v)?v.toFixed(3):'Missing';
  const exportEvidence=()=>{
    if(!exp)return;
    downloadJSON(`${exp.id}.comparison.json`,{schemaVersion:'roadsift.comparison.v1',evidenceClass:exp.evidenceClass,
      experiment:exp,evaluationRecords:rows,checks,eligible:valid,selectedMetric:metric});
  };
  return <div className="page comparison-page comparison-page--validated">
    <PageHeader eyebrow="Active learning evaluation" title="Strategy Comparison" description="Compare evaluation records under a shared experiment contract, not Dataset names or assumed round numbers." actions={<><Button onClick={exportEvidence} icon={Download}>Export evidence</Button><Button icon={Pickaxe} onClick={()=>navigate('mining')}>New mining run</Button></>}/>
    <div className="comparison-experiment-picker"><Field label="Comparison experiment"><select value={experimentId} onChange={e=>{setExperimentId(e.target.value);setSelectedRound(8)}}>{comparisonExperiments.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><div><Badge>Simulated fixture</Badge><p>{exp?.description}</p></div></div>
    <div className="comparison-contract comparison-contract--new"><span><small>Seed Dataset</small><strong>{exp?.initialDatasetVersionId||'Missing'}</strong></span><span><small>Pool snapshot</small><strong>{exp?.candidatePoolSnapshotId||'Incompatible'}</strong></span><span><small>Recipe</small><strong>{exp?.recipeId||'Missing'}</strong></span><span><small>Holdout</small><strong>{exp?.holdoutId||'Missing'}</strong></span></div>
    <section className="comparison-validity"><div><h2>Experiment eligibility</h2><p>{valid?'The comparison contract is internally consistent. These are still illustrative fixture values, not evidence of measured improvement.':'Comparison blocked. Correct the experiment registration and evaluation records before displaying a ranking.'}</p></div><Badge>{valid?'Contract checks passed':'Blocked'}</Badge><div className="comparison-checks">{checks.map(c=><div className={c.ok?'pass':'fail'} key={c.label}><span>{c.ok?'✓':'×'}</span>{c.label}</div>)}</div></section>
    {valid?<><section className="comparison-curve-panel"><div className="ops-section__header"><div><h2>Learning curve</h2><p>Seed + {exp.expectedRounds} rounds = {points.length} checkpoints per strategy. Measured results would come from Evaluation Registry records.</p></div><Field label="Metric"><select value={metric} onChange={e=>setMetric(e.target.value)}>{metrics.map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></Field></div>
      <div className="comparison-line-legend"><span><i className="comparison-key-a"/>{arms[0]?.label}</span><span><i className="comparison-key-b"/>{arms[1]?.label}</span><Badge>Illustrative only</Badge></div>
      <div className="comparison-svg-wrap"><svg viewBox="0 0 860 270" role="img" aria-label={`${metrics.find(x=>x[0]===metric)?.[1]} across ${points.length} evaluated rounds`}>
        {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="64" x2="810" y1={218-t*178} y2={218-t*178} stroke="currentColor" opacity=".1"/><text x="55" y={222-t*178} textAnchor="end" fontSize="11" fill="currentColor" opacity=".55">{(low+t*(high-low)).toFixed(3)}</text></g>)}
        <path d={path('a')} fill="none" stroke="#0071e3" strokeWidth="2.5"/><path d={path('b')} fill="none" stroke="#c17835" strokeWidth="2.5"/>
        {points.map((p,i)=><g key={p.round}><circle cx={px(i)} cy={py(p.a)} r={chosen?.round===p.round?5.5:4} fill="#0071e3"/><circle cx={px(i)} cy={py(p.b)} r={chosen?.round===p.round?5.5:4} fill="#c17835"/><text x={px(i)} y="240" textAnchor="middle" fontSize="11" fill="currentColor">{p.label}</text><text x={px(i)} y="254" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".55">{Math.round(p.samples/1000)}k</text></g>)}
      </svg></div>
      <div className="comparison-round-selector"><span>Inspect checkpoint</span>{points.map(p=><button key={p.round} className={chosen?.round===p.round?'active':''} onClick={()=>setSelectedRound(p.round)}>{p.label}</button>)}</div>
    </section>
    <div className="comparison-grid"><Panel title={`Checkpoint · ${chosen?.label}`} description="Matched cumulative labeled-frame budget; values are synthetic fixtures."><div className="comparison-checkpoint"><div><small>{arms[0].label}</small><strong>{format(chosen?.a)}</strong></div><div><small>{arms[1].label}</small><strong>{format(chosen?.b)}</strong></div><div><small>Δ B − A</small><strong>{delta>=0?'+':''}{format(delta)}</strong></div></div><StatRow label="Cumulative labeled" value={count(chosen?.samples||0)}/><StatRow label="Registered evaluations" value={`${selectedA?.id} · ${selectedB?.id}`}/></Panel>
      <Panel title="Safety slice metrics" description="Same evaluation holdout; inspect slices before interpreting aggregate mAP.">{metrics.filter(x=>x[0]!=='map').map(([key,label])=><div className="comparison-slice-row" key={key}><span>{label}</span><strong>{format(selectedA?.metrics[key])}</strong><strong>{format(selectedB?.metrics[key])}</strong></div>)}</Panel></div>
    <section className="comparison-table-card"><div><h3>Evaluation records</h3><p>One row per checkpoint. Missing values are never filled from seed or an adjacent round.</p></div><div className="table-scroll"><table><thead><tr><th>Round</th><th>Labeled frames</th><th>{arms[0].label}</th><th>{arms[1].label}</th><th>Δ B − A</th></tr></thead><tbody>{points.map(p=><tr key={p.round}><td>{p.label}</td><td>{count(p.samples)}</td><td>{format(p.a)}</td><td>{format(p.b)}</td><td>{p.round===0?'—':`${p.b-p.a>=0?'+':''}${format(p.b-p.a)}`}</td></tr>)}</tbody></table></div></section>
    <section className="comparison-efficiency"><div className="ops-section__header"><div><h2>Annotation efficiency</h2><p>Cumulative annotation cost and hours summed from round-level evaluation records. Not just the final Dataset version.</p></div></div><div className="comparison-checkpoint">{arms.map(arm=><div key={arm.id}><small>{arm.label}</small><strong>${count(sumCost(arm.id,chosen.round))}</strong><span>{count(sumHours(arm.id,chosen.round))} annotation hours</span><span>{chosen.round?format((record(arm.id,chosen.round)?.metrics.map-record(arm.id,0)?.metrics.map)/Math.max(1,sumHours(arm.id,chosen.round))*1000):'—'} mAP gain / 1,000 h</span></div>)}</div></section>
    <section className="comparison-validity"><div><h2>Decision · Illustrative only</h2><p>Contract eligibility is not statistical significance. No bootstrap CI, paired test or independent evaluation artifact is registered, so a production strategy recommendation is not available.</p></div><Badge>Inconclusive</Badge></section>
    </>:<section className="comparison-blocked"><X size={22}/><h2>Comparison blocked</h2><p>No learning curve, winner or efficiency ranking is displayed for incompatible or incomplete experiment records.</p></section>}
  </div>;
}

export function SettingsPage({ theme, setTheme, preferences, setPreferences, setDatasets, setPools, setSelectionBatches, setRuns, setRunnerRegistry, setModelRegistryState, setAlgorithmRegistry, notify, language='en', setLanguage }) {
  const [resetOpen,setResetOpen]=useState(false);
  const vi=language==='vi';
  const resetWorkspace=()=>{setDatasets(initialDatasets);setPools?.(pools);setSelectionBatches?.(initialSelectionBatches);setRuns(initialRuns);setRunnerRegistry?.(runners);setModelRegistryState?.(modelRegistry);setAlgorithmRegistry?.(strategies);try{localStorage.removeItem('roadsift-mock-annotations')}catch{}setResetOpen(false);notify('Workspace fixture state restored');};
  return <div className="page enterprise-settings"><PageHeader eyebrow="Workspace" title={vi?'Cài đặt':'Settings'} description={vi?'Cấu hình giao diện, ngôn ngữ và trạng thái workspace.':'Configure interface preferences and local workspace state.'}/>
    <div className="settings-shell"><nav className="settings-nav"><a href="#general">General</a><a href="#appearance">Appearance</a><a href="#workspace">Workspace data</a></nav><div className="settings-sections">
      <section id="general" className="settings-section"><div className="settings-section__header"><div><h2>General</h2><p>{vi?'Ngôn ngữ và hành vi mặc định.':'Language and default interface behavior.'}</p></div></div><div className="settings-table"><div className="settings-table__row"><div><strong>{vi?'Ngôn ngữ giao diện':'Interface language'}</strong><p>Technical ML/CV terms remain in English.</p></div><div className="language-switch language-switch--settings"><button aria-pressed={language==='en'} onClick={()=>setLanguage?.('en')}>English</button><button aria-pressed={language==='vi'} onClick={()=>setLanguage?.('vi')}>Tiếng Việt</button></div></div><div className="settings-table__row"><div><strong>{vi?'Danh sách gọn':'Compact tables'}</strong><p>{vi?'Giảm chiều cao row trong registry và operations table.':'Reduce row density in registry and operations tables.'}</p></div><Toggle label="Compact tables" checked={preferences.compact} onChange={value=>setPreferences(p=>({...p,compact:value}))}/></div><div className="settings-table__row"><div><strong>{vi?'Hiệu ứng giao diện':'Interface motion'}</strong><p>{vi?'Bật transition nhẹ cho panel và navigation.':'Enable subtle transitions for panels and navigation.'}</p></div><Toggle label="Interface motion" checked={preferences.animations} onChange={value=>setPreferences(p=>({...p,animations:value}))}/></div></div></section>
      <section id="appearance" className="settings-section"><div className="settings-section__header"><div><h2>{vi?'Giao diện':'Appearance'}</h2><p>{vi?'Theme áp dụng trên toàn workspace.':'Theme applies across the workspace.'}</p></div></div><div className="settings-table"><div className="settings-table__row"><div><strong>Theme</strong><p>{vi?'Chọn giao diện sáng hoặc tối.':'Choose light or dark appearance.'}</p></div><div className="segmented"><button className={theme==='light'?'active':''} onClick={()=>setTheme('light')}><Sun size={14}/> Light</button><button className={theme==='dark'?'active':''} onClick={()=>setTheme('dark')}><Moon size={14}/> Dark</button></div></div></div></section>
      <section id="workspace" className="settings-section"><div className="settings-section__header"><div><h2>{vi?'Dữ liệu workspace':'Workspace data'}</h2><p>{vi?'Trạng thái mock được lưu cục bộ trong browser.':'Workspace state persisted in this browser.'}</p></div></div><div className="settings-table"><div className="settings-table__row"><div><strong>Persistence</strong><p>Browser localStorage · no production backend attached.</p></div><Badge>Local</Badge></div><div className="settings-table__row settings-table__row--danger"><div><strong>{vi?'Reset workspace':'Reset workspace'}</strong><p>{vi?'Khôi phục toàn bộ registry và run fixture về trạng thái ban đầu.':'Restore Pool, Dataset and Run registries to baseline workspace state.'}</p></div><Button icon={RotateCcw} onClick={()=>setResetOpen(true)}>Reset</Button></div></div></section>
    </div></div>
    {resetOpen&&<Modal title="Reset workspace state?" onClose={()=>setResetOpen(false)} footer={<><Button onClick={()=>setResetOpen(false)}>Cancel</Button><Button variant="primary" onClick={resetWorkspace}>Reset workspace</Button></>}><p>This replaces locally created Pools, Dataset versions and Runs with the baseline workspace state. Theme and language are preserved.</p></Modal>}
  </div>;
}

export function SystemPage({ notify, runnerRegistry, setRunnerRegistry, modelRegistryState, setModelRegistryState, algorithmRegistry }) {
  const [open,setOpen]=useState(null);
  const [form,setForm]=useState({name:'',type:'RoadSift Worker',endpoint:'',maxConcurrent:'1',modelTask:'Object Detection',datasetVersionId:'',artifactUri:''});
  const [error,setError]=useState('');
  const patch=(field,value)=>{setForm(f=>({...f,[field]:value}));setError('');};
  const reset=kind=>{setOpen(kind);setError('');setForm({name:'',type:'RoadSift Worker',endpoint:'',maxConcurrent:'1',modelTask:'Object Detection',datasetVersionId:'',artifactUri:''});};
  const save=()=>{
    const name=form.name.trim(),endpoint=form.endpoint.trim();
    if(!name){setError('Resource name is required.');return;}
    if(open==='runner'){
      if(!/^(worker|kaggle|https?):\/\//.test(endpoint)){setError('Runner URI must start with worker://, kaggle://, http:// or https://.');return;}
      if(!Number.isInteger(Number(form.maxConcurrent))||Number(form.maxConcurrent)<1){setError('Capacity must be a positive integer.');return;}
      if(runnerRegistry.some(r=>r.name.toLowerCase()===name.toLowerCase()||r.uri===endpoint)){setError('A runner with this name or URI already exists.');return;}
      const id='runner_local_'+Date.now().toString(36);
      setRunnerRegistry(list=>[...list,{id,name,type:form.type,uri:endpoint,status:'Pending verification',verified:false,
        lastHeartbeatAt:null,queueDepth:0,maxConcurrent:Number(form.maxConcurrent),
        capacity:`0 / ${form.maxConcurrent} slots`,allowedStrategyIds:algorithmRegistry.map(a=>a.id),
        capabilities:['predictions','embedding'],createdAt:new Date().toISOString()}]);
      notify('Runner saved as Pending verification; no live connectivity assumed');
    }else{
      const uri=form.artifactUri.trim();
      if(!/^(r2|s3|gs|https?):\/\//.test(uri)){setError('A valid artifact URI is required (r2://, s3://, gs:// or https://).');return;}
      if(modelRegistryState.some(m=>m.name.toLowerCase()===name.toLowerCase()&&m.artifactUri===uri)){setError('This model artifact is already registered.');return;}
      setModelRegistryState(list=>[...list,{id:'model_local_'+Date.now().toString(36),name,version:'1.0',artifactUri:uri,
        datasetVersionId:form.datasetVersionId||null,status:'Pending verification',task:form.modelTask,
        capabilities:['predictions','uncertainty','safety'],createdAt:new Date().toISOString()}]);
      notify('Model metadata saved; artifact not yet verified');
    }
    setOpen(null);
  };
  return <div className="page system-page"><PageHeader eyebrow="Resource registry" title="System" description="Shared Model and Runner registries. Local additions are pending verification, not automatically execution-ready."/>
    <section className="ops-section"><div className="ops-section__header"><div><h2>Execution runners</h2><p>Connected worker metadata, capabilities, heartbeat and assignment readiness.</p></div><Button icon={Plus} onClick={()=>reset('runner')}>Register runner</Button></div>
      <div className="table-scroll"><table className="dataset-table system-table"><thead><tr><th>Runner</th><th>Backend</th><th>State</th><th>Heartbeat</th><th>Queue</th><th>Capacity</th></tr></thead><tbody>{runnerRegistry.map(r=><tr key={r.id}><td><div className="dataset-name-cell"><strong>{r.name}</strong><small>{r.uri}</small></div></td><td>{r.type}</td><td><Badge>{r.fixture?'Simulated Ready':r.status}</Badge></td><td>{r.lastHeartbeatAt?date(r.lastHeartbeatAt):'Not verified'}</td><td>{r.queueDepth||0}</td><td>{r.maxConcurrent||1}</td></tr>)}</tbody></table></div></section>
    <section className="ops-section"><div className="ops-section__header"><div><h2>Registered models</h2><p>Artifact metadata referenced by uncertainty-based acquisition policies.</p></div><Button icon={Plus} onClick={()=>reset('model')}>Register model</Button></div>
      <div className="table-scroll"><table className="dataset-table system-table"><thead><tr><th>Model</th><th>Task</th><th>Status</th><th>Artifact</th></tr></thead><tbody>{modelRegistryState.map(m=><tr key={m.id}><td><div className="dataset-name-cell"><strong>{m.name}</strong><small>{m.id}</small></div></td><td>{m.task}</td><td><Badge>{m.fixture?'Fixture · Registered':m.status}</Badge></td><td><code>{m.artifactUri}</code></td></tr>)}</tbody></table></div></section>
    <section className="ops-section"><div className="ops-section__header"><div><h2>Algorithm catalog</h2><p>Deployable strategy definitions with versioned dependency contracts. Managed by engineering, not created from Mining.</p></div><Badge>{algorithmRegistry.length} implementations</Badge></div>
      <div className="table-scroll"><table className="dataset-table system-table"><thead><tr><th>Algorithm</th><th>Version</th><th>Prediction model</th><th>Embeddings</th></tr></thead><tbody>{algorithmRegistry.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.version}</td><td>{a.requiresPredictionModel?'Required':'Not required'}</td><td>{a.requiresEmbedding?'Required':'Not required'}</td></tr>)}</tbody></table></div></section>
    <section className="ops-section"><div className="ops-section__header"><div><h2>Connected services</h2><p>References only. A browser fixture cannot verify storage or compute connectivity.</p></div></div><div className="system-service-list">{Object.entries(systemServices).map(([key,value])=><div key={key}><span>{key.replace(/([A-Z])/g,' $1')}</span><strong>{value}</strong><Badge>Fixture reference</Badge></div>)}</div></section>
    {open&&<Modal title={open==='runner'?'Register runner':'Register model'} onClose={()=>setOpen(null)} footer={<><Button onClick={()=>setOpen(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save to registry</Button></>}>
      <div className="mining-field-stack"><Field label="Resource name *"><input value={form.name} onChange={e=>patch('name',e.target.value)}/></Field>
        {open==='runner'?<><Field label="Backend type"><select value={form.type} onChange={e=>patch('type',e.target.value)}><option>RoadSift Worker</option><option>Kaggle</option><option>Custom</option></select></Field><Field label="Runner URI *"><input value={form.endpoint} onChange={e=>patch('endpoint',e.target.value)} placeholder="worker://roadsift/gpu-node"/></Field><Field label="Max concurrent jobs *"><input type="number" min="1" value={form.maxConcurrent} onChange={e=>patch('maxConcurrent',e.target.value)}/></Field></>:
          <><Field label="Model task"><select value={form.modelTask} onChange={e=>patch('modelTask',e.target.value)}><option>Object Detection</option></select></Field><Field label="Artifact URI *"><input value={form.artifactUri} onChange={e=>patch('artifactUri',e.target.value)} placeholder="r2://roadsift/models/model.pt"/></Field><Field label="Training Dataset version (optional)"><input value={form.datasetVersionId} onChange={e=>patch('datasetVersionId',e.target.value)} placeholder="huc-v7"/></Field></>}
        {error&&<p className="mining-inline-error" role="alert">{error}</p>}
        <p className="mining-simulation-disclaimer">Saving registry metadata does not verify an endpoint, artifact, capability or live heartbeat. A backend verification service is required to mark this resource Ready.</p>
      </div>
    </Modal>}
  </div>;
}

export function Onboarding({ navigate }) {
  return <div className="page onboarding-page"><PageHeader eyebrow="Product onboarding" title="RoadSift in 3 minutes" description="What the product owns, what stays external, and where the ROI comes from."/>
    <section className="onboarding-intro"><div><h2>Spend annotation budget on the frames that change the model.</h2><p>RoadSift sits between fleet collection and external annotation/training. It turns a large unlabeled candidate pool into traceable Selection Batches and measures whether those choices improve downstream model performance.</p></div><Button variant="primary" icon={ArrowRight} onClick={()=>navigate('pools')}>Open Pool registry</Button></section>
    <section className="onboarding-grid"><div><small>Problem 01</small><h3>Too much fleet data</h3><p>Raw drives contain heavy temporal redundancy and many low-value frames. Manual browsing does not scale.</p><strong>RoadSift response</strong><p>Version Pool snapshots, score eligible candidates, enforce EXACT-N and preserve selection lineage.</p></div><div><small>Problem 02</small><h3>Hard to prove data value</h3><p>More labeled frames do not automatically mean a better model.</p><strong>RoadSift response</strong><p>Track Dataset versions, external model/evaluation results and controlled strategy comparisons on one fixed holdout.</p></div></section>
    <section className="onboarding-boundary"><div className="ops-section__header"><div><h2>Product boundary</h2><p>RoadSift owns data selection and provenance; specialist systems keep annotation and training.</p></div></div><div className="boundary-flow"><span>Fleet media</span><ArrowRight size={14}/><span>Pool</span><ArrowRight size={14}/><span>Mining</span><ArrowRight size={14}/><span>Selection Batch</span><ArrowRight size={14}/><span className="external">External annotation</span><ArrowRight size={14}/><span>Dataset version</span><ArrowRight size={14}/><span className="external">External training/eval</span></div></section>
    <section className="onboarding-economics"><div><small>Market</small><strong>Perception teams already pay for fleet storage, annotation and retraining; RoadSift targets the data-selection layer between collection and labeling.</strong></div><div><small>ROI</small><strong>Model gain per annotation frame / hour / dollar.</strong><p>Primary value = avoided low-value labels + faster learning at the same annotation budget − Mining compute cost.</p></div></section>
    <section className="onboarding-next"><div><strong>Recommended first workflow</strong><p>Open a Pool → inspect membership → create a Mining run → review the Selection Batch → register the returned Dataset version.</p></div><Button onClick={()=>navigate('mining')}>Open Mining</Button></section>
  </div>;
}
