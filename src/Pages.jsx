import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Database, Layers, ScanLine, GitBranch, Plus, Search, LayoutGrid, List, Download, Upload, SlidersHorizontal, Check, X, Image, Video, Play, Pause, RotateCcw, Sparkles, Cpu, Cloud, ChartNoAxesCombined, Target, Crosshair, ZoomIn, ZoomOut, Trash2, Save, CheckCircle2, FileText, Monitor, Sun, Moon, MousePointer2, BoxSelect, ArrowLeft, Pickaxe, History as HistoryIcon } from 'lucide-react';
import { Button, Badge, PageHeader, Metric, Segmented, Empty, Panel, DemoNote, Field, Toggle, Modal, TextLink, HelpTip } from './components/UI.jsx';
import { frames, initialDatasets, initialRuns, initialSelectionBatches, metrics, count, date, sceneUrl, fleetPool, pools, seedDataset, seedEvaluation, holdouts, strategies, datasetRegistration, importSimulation, miningConfig, runners, systemServices, strategyComparison, systemRunnerRegistrationDefaults, poolRegistration, batchLifecycle } from './data.js';

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
  const [sourceMode,setSourceMode]=useState('upload');
  const [mode,setMode]=useState(importSimulation.defaultMode);
  const [files,setFiles]=useState([]);
  const [fps,setFps]=useState(importSimulation.defaultFps);
  const [name,setName]=useState(importSimulation.defaultPoolName);
  const [prefix,setPrefix]=useState('r2://roadsift/incoming/hanoi-october/');
  const [validated,setValidated]=useState(false);
  const [status,setStatus]=useState('idle');
  const input=useRef(null);
  const extracted=mode==='videos'?importSimulation.videoFrames:(files.length||importSimulation.imageFramesFallback);
  const sourceReady=sourceMode==='existing'?Boolean(prefix.trim()):files.length>0;
  const validate=()=>{
    const ok=Boolean(name.trim()&&sourceReady);
    setValidated(ok);
    notify(ok?'Ingest preflight passed':'Ingest preflight blocked · resolve source and Pool identity');
  };
  const submit=()=>{
    if(!validated){validate();return;}
    const now=new Date().toISOString(),stamp=Date.now().toString(36);
    const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const eligible=Math.max(0,extracted-importSimulation.duplicatesFlagged-importSimulation.qualityFlagged);
    const record={id:`pool_${slug}_${stamp.slice(-4)}`,name,slug,version:1,snapshot:`pool_snap_${stamp}`,total:extracted,eligible,labeled:0,reserved:0,excluded:extracted-eligible,indexed:now,storage:`${importSimulation.storageRoot}${slug}/`,source:sourceMode==='upload'?`${files.length} staged files`:prefix,status:'Active',eligibleTrend:[eligible],miningRuns7d:0,lastMiningAt:now,composition:{Unclassified:eligible},quality:{Good:eligible},stateBreakdown:{Eligible:eligible,Reserved:0,Labeled:0,Excluded:extracted-eligible},recentSnapshots:[{version:1,eligible,total:extracted,reason:'Ingest job complete',at:now}],sampleScenes:[0,1,2,3]};
    setPools?.(list=>[record,...list]);
    setStatus('complete');
    notify('Ingest job completed · Pool snapshot registered');
  };
  return <div className="page import-enterprise"><PageHeader eyebrow="Data operations" title="Ingest Jobs" description="Bring new unlabeled media into object storage and register a reproducible Pool snapshot." actions={<Button icon={Database} onClick={()=>navigate('pools')}>Pool registry</Button>}/>
    <div className="enterprise-stepper"><span className="active">1 · Source</span><i/><span className={validated?'active':''}>2 · Validate</span><i/><span className={status==='complete'?'active':''}>3 · Register snapshot</span></div>
    <div className="enterprise-form-grid"><section>
      <Panel title="Source" description="Stage local media or reference an existing object-storage prefix."><div className="segmented"><button className={sourceMode==='upload'?'active':''} onClick={()=>{setSourceMode('upload');setValidated(false)}}>Upload files</button><button className={sourceMode==='existing'?'active':''} onClick={()=>{setSourceMode('existing');setValidated(false)}}>Existing storage</button></div>{sourceMode==='upload'?<><div className="segmented compact"><button className={mode==='videos'?'active':''} onClick={()=>setMode('videos')}>MP4 videos</button><button className={mode==='images'?'active':''} onClick={()=>setMode('images')}>Images</button></div><input ref={input} className="sr-only" type="file" multiple accept={mode==='videos'?'video/mp4':'image/*'} onChange={e=>{setFiles([...e.target.files]);setValidated(false)}}/><button className="import-dropzone" onClick={()=>input.current?.click()}><Upload size={24}/><strong>{files.length?`${files.length} files staged`:'Choose source files'}</strong><small>Files are staged before the ingest job is submitted.</small></button>{mode==='videos'&&<Field label="Frame extraction"><select value={fps} onChange={e=>{setFps(e.target.value);setValidated(false)}}>{importSimulation.fpsOptions.map(v=><option key={v} value={v}>{v} FPS</option>)}</select></Field>}</>:<Field label="Object-storage prefix" help="Reference existing media without copying it first."><input value={prefix} onChange={e=>{setPrefix(e.target.value);setValidated(false)}}/></Field>}</Panel>
      <Panel title="Destination" description="Define the Pool identity materialized by this job."><Field label="Pool name"><input value={name} onChange={e=>{setName(e.target.value);setValidated(false)}}/></Field><div className="detail-stats"><StatRow label="Storage root" value={`${importSimulation.storageRoot}${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}/`}/><StatRow label="Manifest" value="manifest.parquet"/><StatRow label="Membership" value="Immutable snapshot"/></div></Panel>
    </section><aside><Panel title="Preflight" description="Submission is blocked until source and destination resolve."><div className="preflight-list"><div className={name.trim()?'pass':'fail'}><Check size={13}/>Pool identity</div><div className={sourceReady?'pass':'fail'}><Check size={13}/>Source resolved</div><div className="pass"><Check size={13}/>R2 destination available</div><div className="pass"><Check size={13}/>Manifest schema configured</div></div><div className="job-spec-preview"><div><span>Ingest contract</span><Badge>{validated?'Ready':'Draft'}</Badge></div><code>source={sourceMode}</code><code>media={mode}</code><code>fps={mode==='videos'?fps:'n/a'}</code><code>pool={name}</code></div><div className="button-row"><Button className="wide" onClick={validate}>Validate</Button><Button variant="primary" className="wide" icon={Upload} onClick={submit}>Submit ingest job</Button></div></Panel></aside></div>
    {status==='complete'&&<div className="completion-card"><span className="completion-card__icon"><Check size={20}/></span><div><small>Ingest job complete</small><h3>{name}</h3><p>{count(extracted)} samples processed · Pool snapshot registered</p></div><Button icon={ArrowRight} onClick={()=>navigate('pools')}>Open Pool</Button></div>}
  </div>;
}

export function Mining({ notify, setRuns, setSelectionBatches, navigate, datasets, pools }) {
  const latestDatasets=Object.values(datasets.reduce((acc,d)=>{ if(!acc[d.name]||d.version>acc[d.name].version) acc[d.name]=d; return acc; },{}));
  const [poolId,setPoolId]=useState(pools[0]?.id||'');
  const [datasetId,setDatasetId]=useState(latestDatasets[0]?.id||'');
  const defaultStrategy=strategies.find(s=>s.id===miningConfig.defaultStrategyId)||strategies[0];
  const [strategy,setStrategy]=useState(defaultStrategy?.name||'');
  const [budget,setBudget]=useState(String(miningConfig.defaultBudget));
  const defaultRunner=runners.find(r=>r.id===miningConfig.defaultRunnerId)||runners[0];
  const [executor,setExecutor]=useState(defaultRunner?.name||'');
  const [status,setStatus]=useState('idle');
  const pool=pools.find(p=>p.id===poolId)||pools[0];
  const base=datasets.find(d=>d.id===datasetId)||latestDatasets[0];
  const acquisitionModel=base?.model||'No registered model';
  const nextRound=(base?.round||base?.version||0)+1;
  const batchName=`${base?.name||'Selection'} · Round ${nextRound} Selection Batch`;
  const exactBudget=Math.min(Number(budget)||0,pool?.eligible||0);
  const ready=Boolean(pool&&base&&base.model&&base.evalId&&exactBudget>0&&executor);
  const runId=()=>`mine_${new Date().toISOString().replace(/[-:T]/g,'').slice(0,12)}_${Date.now().toString(36).slice(-4)}`;
  const start=()=>{
    if(!ready){notify('Mining preflight failed · complete required inputs');return;}
    const id=runId(); const now=new Date().toISOString();
    const batchId=`batch_${(base?.slug||'selection').replace(/-/g,'_')}_r${String(nextRound).padStart(2,'0')}_${Date.now().toString(36).slice(-4)}`;
    const batch={id:batchId,name:`${base?.name||'Selection'} · Round ${nextRound}`,status:'In review',strategy,sourcePoolId:pool.id,sourceSnapshot:pool.snapshot,baseDatasetId:base.id,runId:id,count:exactBudget,schemaVersion:'roadsift.selection-batch.v1',manifestUri:`r2://roadsift/batches/${batchId}/manifest.parquet`,membershipHash:`sha256:${Date.now().toString(36)}`,owner:'Perception Data Ops',createdBy:'mining-orchestrator',createdAt:now,updatedAt:now,review:{reviewed:0,approved:0,rejected:0,deferred:0,finalizedAt:null},handoff:{status:'Not started',destination:null,sentAt:null,manifestUri:null},annotationReturn:{status:'Not started',expected:0,returned:0,validation:null,uri:null,receivedAt:null},audit:[{at:now,actor:'mining-orchestrator',event:'Selection Batch created'}]};
    setStatus('complete');
    setSelectionBatches?.(list=>[batch,...list]);
    setRuns(v=>[{id,type:'Mining',name:`${strategy} · ${pool.name} · Round ${nextRound}`,status:'Complete',source:`${pool.name} p${pool.version}`,dataset:`${base.name} v${base.version}`,output:batchName,frames:pool.eligible,selected:exactBudget,budget:exactBudget,executor,duration:miningConfig.simulatedDuration,date:now,scene:base.scene||0,owner:'Perception Data Ops',createdBy:'mining-orchestrator',updatedAt:now,attempt:1},...v]);
    notify('Mining complete · Selection Batch created');
  };
  return <div className="page mining-page"><PageHeader eyebrow="Active learning operations" title="Mining" description="Configure and execute an immutable acquisition run from registered inputs." actions={<Button icon={HistoryIcon} onClick={()=>navigate('history')}>Runs</Button>}/>

    <div className="enterprise-stepper mining-stepper"><span className="active">1 · Candidate source</span><i/><span className="active">2 · Acquisition context</span><i/><span className="active">3 · Selection policy</span><i/><span className={ready?'active':''}>4 · Preflight</span><i/><span className={status==='complete'?'active':''}>5 · Selection Batch</span></div>
    <div className="mining-context">
      <div><small>Candidate snapshot</small><strong>{pool?.name} · p{pool?.version}</strong><span>{count(pool?.eligible||0)} eligible</span></div>
      <ArrowRight size={15}/>
      <div><small>Base dataset</small><strong>{base?.name} · v{base?.version}</strong><span>{count(base?.count||0)} labeled</span></div>
      <ArrowRight size={15}/>
      <div><small>Acquisition model</small><strong>{acquisitionModel}</strong><span>{base?.evalId||'No evaluation'}</span></div>
      <ArrowRight size={15}/>
      <div><small>Output</small><strong>Selection Batch</strong><span>EXACT-{count(exactBudget)}</span></div>
    </div>

    <div className="mining-builder">
      <section className="mining-builder__main">
        <Panel title="Candidate source" description="Choose the exact immutable Pool snapshot. This becomes part of the run contract."><Field label="Pool snapshot" help="Pins the exact immutable candidate membership used by this run, so results can be reproduced later."><select value={poolId} onChange={e=>setPoolId(e.target.value)}>{pools.map(p=><option key={p.id} value={p.id}>{p.name} · p{p.version} · {count(p.eligible)} eligible</option>)}</select></Field><div className="mining-source-meta"><StatRow label="Snapshot" value={pool?.snapshot}/><StatRow label="Storage" value={pool?.storage}/><StatRow label="Reserved" value={count(pool?.reserved||0)}/><StatRow label="Updated" value={date(pool?.indexed)}/></div></Panel>

        <Panel title="Acquisition context" description="Select the current labeled Dataset version and its registered acquisition model."><Field label="Base dataset version" help="The current labeled state used to define this Active Learning round and its acquisition context."><select value={datasetId} onChange={e=>setDatasetId(e.target.value)}>{latestDatasets.map(d=><option key={d.id} value={d.id}>{d.name} · v{d.version} · {count(d.count)} labeled</option>)}</select></Field><div className="mining-model-card"><div><span className="inline-label-help">Acquisition model <HelpTip>The registered model used to score the unlabeled Pool for uncertainty and other acquisition signals.</HelpTip></span><strong>{acquisitionModel}</strong><code>{base?.evalId}</code></div><Badge>{base?.evaluation?'Evaluated':'Missing eval'}</Badge></div></Panel>

        <Panel title="Selection policy" description="Configure ranking policy and the exact annotation budget for this round."><div className="register-grid"><Field label="Strategy" help="The acquisition policy used to rank eligible samples, such as Hybrid, Entropy, Diversity, or Random Sampling."><select value={strategy} onChange={e=>setStrategy(e.target.value)}>{strategies.map(s=><option key={s.id}>{s.name}</option>)}</select></Field><Field label="Budget" help="EXACT-N target: RoadSift must return exactly this many eligible samples when capacity allows."><select value={budget} onChange={e=>setBudget(e.target.value)}>{miningConfig.budgets.map(v=><option key={v} value={v}>{count(v)} samples</option>)}</select></Field></div>{strategies.find(s=>s.name===strategy)?.weights&&<details className="advanced-config"><summary>Advanced strategy weights</summary><div className="strategy-params">{Object.entries(strategies.find(s=>s.name===strategy).weights).map(([key,value])=><div key={key}><span>{key[0].toUpperCase()+key.slice(1)}</span><strong>{Number(value).toFixed(2)}</strong></div>)}</div></details>}<div className="inline-callout">EXACT-N is enforced. Reserved, labeled and excluded samples are not eligible for reselection.</div></Panel>
      </section>

      <aside className="mining-builder__side">
        <Panel title="Preflight & submit" description="Resolve every dependency before creating an immutable Mining run."><div className="job-spec-preview"><div><span>Immutable job contract</span><Badge>{ready?'Ready':'Blocked'}</Badge></div><code>pool: {pool?.slug}:p{pool?.version}</code><code>snapshot: {pool?.snapshot}</code><code>dataset: {base?.slug}:v{base?.version}</code><code>model: {acquisitionModel}</code><code>strategy: {strategy}</code><code>budget: {exactBudget}</code></div><Field label="Runner" help="The registered compute backend that executes the same immutable Mining job spec, for example Kaggle or a RoadSift Worker."><select value={executor} onChange={e=>setExecutor(e.target.value)}>{runners.filter(r=>r.status==='Ready').map(r=><option key={r.id}>{r.name}</option>)}</select></Field><div className="preflight-list"><div className={pool?'pass':'fail'}><Check size={13}/>Pool snapshot resolved</div><div className={base?'pass':'fail'}><Check size={13}/>Base dataset resolved</div><div className={base?.model?'pass':'fail'}><Check size={13}/>Acquisition model registered</div><div className={base?.evalId?'pass':'fail'}><Check size={13}/>Evaluation attached</div><div className={exactBudget>0?'pass':'fail'}><Check size={13}/>Budget fits eligible capacity</div></div><div className="submit-note"><strong>Output contract</strong><span>Successful execution creates one immutable Selection Batch. It does not create a Dataset version.</span></div><Button variant="primary" className="wide" icon={Play} disabled={!ready} onClick={start}>Submit mining run</Button></Panel>
      </aside>
    </div>

    {status==='complete'&&<div className="mining-result"><div className="mining-result__head"><span className="completion-card__icon"><Check size={20}/></span><div><small>Mining run complete</small><h3>{count(exactBudget)} / {count(exactBudget)} selected</h3><p>{strategy} · {executor} · {miningConfig.exactN?'EXACT-N':'Budgeted'}</p></div><Badge>Selection Batch</Badge></div><div className="result-pipeline">{['Resolve snapshot','Inference','Embedding','Scoring','Exact-N selection','Publish batch'].map(x=><span key={x}><Check size={12}/>{x}</span>)}</div><div className="result-output"><div><small>Created</small><strong>{batchName}</strong><span>{count(exactBudget)} samples reserved · awaiting review</span></div><div><small>Artifacts</small><strong>{miningConfig.artifacts.slice(0,2).join(' · ')}</strong><span>{miningConfig.artifacts.slice(2).join(' · ')}</span></div><Button variant="primary" icon={ArrowRight} onClick={()=>navigate('batches')}>Open Selection Batch</Button></div></div>}
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

export function History({ runs, navigate, notify }) {
  const [query,setQuery]=useState(''), [filter,setFilter]=useState('All'), [selected,setSelected]=useState(null);
  const results=runs.filter(r=>(filter==='All'||r.type===filter)&&(`${r.name} ${r.id} ${r.source} ${r.output}`).toLowerCase().includes(query.toLowerCase()));
  return <div className="page runs-page"><PageHeader eyebrow="Operations registry" title="Runs" description="Audit ingest and Mining jobs across the workspace." actions={<Button variant="primary" icon={Plus} onClick={()=>navigate('mining')}>New mining run</Button>}/>
    <div className="history-toolbar"><div className="search-field"><Search size={16}/><input aria-label="Search runs" placeholder="Run ID, source, output…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="segmented"><button className={filter==='All'?'active':''} onClick={()=>setFilter('All')}>All</button><button className={filter==='Import'?'active':''} onClick={()=>setFilter('Import')}>Ingest</button><button className={filter==='Mining'?'active':''} onClick={()=>setFilter('Mining')}>Mining</button></div><Badge>{results.length} records</Badge></div>
    <section className="catalog"><div className="table-scroll"><table className="dataset-table runs-table"><thead><tr><th>Run</th><th>Type</th><th>Status</th><th>Source</th><th>Output</th><th>Executor</th><th>Started</th><th>Duration</th></tr></thead><tbody>{results.map(r=><tr key={r.id} tabIndex="0" role="button" onClick={()=>setSelected(r)}><td><div className="dataset-name-cell"><strong>{r.name}</strong><small>{r.id}</small></div></td><td>{r.type==='Import'?'Ingest':r.type}</td><td><Badge>{r.status}</Badge></td><td>{r.source}</td><td>{r.output}</td><td>{r.executor}</td><td>{date(r.date)}</td><td>{r.duration}</td></tr>)}</tbody></table></div></section>
    {selected&&<Modal sheet title="Run details" onClose={()=>setSelected(null)} footer={<Button icon={Download} onClick={()=>{downloadJSON(`${selected.id}.json`,{schemaVersion:'roadsift.run.v1',run:selected});notify('Run record exported')}}>Export record</Button>}><div className="detail-heading"><div className="detail-heading__meta"><Badge>{selected.type==='Import'?'Ingest':selected.type}</Badge><Badge>{selected.status}</Badge></div><h2>{selected.name}</h2><code>{selected.id}</code></div><details className="detail-section" open><summary><div><strong>Execution summary</strong><span>Operational state and timing.</span></div></summary><div className="detail-section__body"><div className="detail-stats"><StatRow label="Source" value={selected.source}/><StatRow label="Output" value={selected.output}/><StatRow label="Executor" value={selected.executor}/><StatRow label="Started" value={date(selected.date)}/><StatRow label="Duration" value={selected.duration}/><StatRow label="Status" value={selected.status}/></div></div></details>{selected.status==='Failed'&&<details className="detail-section" open><summary><div><strong>Failure</strong><span>Executor error and retry eligibility.</span></div></summary><div className="detail-section__body"><div className="registration-error"><X size={18}/><div><strong>{selected.errorCode||'RUN_FAILED'}</strong><p>{selected.errorMessage||'The run did not complete.'}</p></div></div>{selected.retryable&&<Button onClick={()=>notify('Retry queued from the same immutable run contract')}>Retry from same contract</Button>}</div></details>}{selected.type==='Mining'&&<><details className="detail-section" open><summary><div><strong>Selection contract</strong><span>Inputs captured by this Active Learning run.</span></div></summary><div className="detail-section__body"><div className="detail-stats"><StatRow label="Base dataset" value={selected.dataset}/><StatRow label="Eligible at start" value={count(selected.frames)}/><StatRow label="Budget" value={count(selected.budget)}/><StatRow label="Selected" value={count(selected.selected)}/></div></div></details><details className="detail-section"><summary><div><strong>Artifacts</strong><span>Immutable outputs from the executor.</span></div></summary><div className="detail-section__body"><div className="run-artifacts">{miningConfig.artifacts.map(a=><span key={a}>{a}</span>)}</div></div></details></>}</Modal>}
  </div>;
}

export function StrategyComparison({ datasets, navigate }) {
  const armA=datasets.filter(d=>d.name===strategyComparison.armA.datasetFamily&&strategyComparison.comparedVersions.includes(d.version)).sort((a,b)=>a.version-b.version);
  const armB=datasets.filter(d=>d.name===strategyComparison.armB.datasetFamily&&strategyComparison.comparedVersions.includes(d.version)).sort((a,b)=>a.version-b.version);
  const roundBudget=miningConfig.defaultBudget;
  const points=[
    {label:'Seed',samples:seedDataset.samples,armA:seedEvaluation.map,armB:seedEvaluation.map},
    ...strategyComparison.comparedVersions.map((version,index)=>({
      label:`Round ${index+1}`,
      samples:seedDataset.samples+roundBudget*(index+1),
      armA:armA.find(d=>d.version===version)?.evaluation?.map ?? seedEvaluation.map,
      armB:armB.find(d=>d.version===version)?.evaluation?.map ?? seedEvaluation.map
    }))
  ];
  const allValues=points.flatMap(p=>[p.armA,p.armB]);
  const minValue=Math.min(...allValues),maxValue=Math.max(...allValues),padding=Math.max(.01,(maxValue-minValue)*.2);
  const chartMin=minValue-padding,chartMax=maxValue+padding;
  const xy=(p,i,key)=>({x:8+i*(84/Math.max(1,points.length-1)),y:88-((p[key]-chartMin)/(chartMax-chartMin))*70});
  const path=key=>points.map((p,i)=>{const q=xy(p,i,key);return `${i?'L':'M'} ${q.x} ${q.y}`}).join(' ');
  const last=points.at(-1), lastA=armA.at(-1), lastB=armB.at(-1);
  const winner=last.armB>=last.armA?strategyComparison.armB.label:strategyComparison.armA.label;
  const winnerEval=last.armB>=last.armA?lastB?.evaluation:lastA?.evaluation;
  const loserEval=last.armB>=last.armA?lastA?.evaluation:lastB?.evaluation;
  const delta=key=>(winnerEval?.[key]??0)-(loserEval?.[key]??0);
  const holdout=holdouts[0];
  const costA=lastA?.cost||0, costB=lastB?.cost||0, hoursA=lastA?.annotationHours||0, hoursB=lastB?.annotationHours||0;
  const gainA=Math.max(0,last.armA-seedEvaluation.map), gainB=Math.max(0,last.armB-seedEvaluation.map);
  const valueA=costA?gainA/costA:0, valueB=costB?gainB/costB:0;
  return <div className="page comparison-page"><PageHeader eyebrow="Active learning evaluation" title="Strategy Comparison" description="Compare acquisition strategies at the same labeled budget on the same fixed holdout." actions={<Button icon={Pickaxe} onClick={()=>navigate('mining')}>New mining run</Button>}/>
    <div className="comparison-contract"><span><small>Initial labeled set</small><strong>{count(seedDataset.samples)} frames</strong></span><span><small>Budget / round</small><strong>{count(roundBudget)} frames</strong></span><span><small>Training recipe</small><strong>{strategyComparison.trainingRecipe}</strong></span><span><small>Evaluation</small><strong>{holdout?.name} · {count(holdout?.samples)}</strong></span></div>
    <div className="comparison-grid"><Panel title="Learning curve" description="Higher mAP50–95 at the same cumulative annotation budget means greater data-selection efficiency."><div className="learning-chart"><div className="learning-chart__legend"><span><i/>{strategyComparison.armA.label}</span><span><i/>{strategyComparison.armB.label}</span></div><svg viewBox="0 0 100 100" role="img" aria-label={`Learning curve comparing ${strategyComparison.armA.label} and ${strategyComparison.armB.label}`}><line x1="8" y1="88" x2="92" y2="88"/><line x1="8" y1="18" x2="8" y2="88"/><path className="curve curve--entropy" d={path('armA')}/><path className="curve curve--hybrid" d={path('armB')}/>{points.map((p,i)=>{const a=xy(p,i,'armA'),b=xy(p,i,'armB');return <g key={p.label}><circle className="dot dot--entropy" cx={a.x} cy={a.y} r="2"/><circle className="dot dot--hybrid" cx={b.x} cy={b.y} r="2"/><text x={a.x} y="97" textAnchor="middle">{Math.round(p.samples/1000)}k</text></g>})}</svg><div className="learning-chart__axis">Cumulative labeled frames</div></div></Panel>
      <Panel title={`${points.at(-1)?.label} result`} description={`Same ${count(last.samples)} labeled-frame budget. Same evaluation set.`}><div className="winner-card"><small>Best observed strategy</small><h3>{winner}</h3><strong>{Math.max(last.armA,last.armB).toFixed(3)} <span>{strategyComparison.metric}</span></strong><p>+{Math.abs(last.armB-last.armA).toFixed(3)} at the same labeled budget.</p></div>{winnerEval&&loserEval&&<div className="comparison-deltas"><StatRow label="mAP50–95" value={`${winnerEval.map.toFixed(3)} vs ${loserEval.map.toFixed(3)} · +${delta('map').toFixed(3)}`}/><StatRow label="Recall" value={`${winnerEval.recall.toFixed(3)} vs ${loserEval.recall.toFixed(3)} · +${delta('recall').toFixed(3)}`}/><StatRow label="VRU Recall" value={`${winnerEval.vru.toFixed(3)} vs ${loserEval.vru.toFixed(3)} · +${delta('vru').toFixed(3)}`}/><StatRow label="Night Recall" value={`${winnerEval.night.toFixed(3)} vs ${loserEval.night.toFixed(3)} · +${delta('night').toFixed(3)}`}/><StatRow label="Rain/Fog Recall" value={`${winnerEval.rain.toFixed(3)} vs ${loserEval.rain.toFixed(3)} · +${delta('rain').toFixed(3)}`}/></div>}</Panel></div>
    <section className="comparison-table-card"><div><h3>Controlled comparison</h3><p>Each row represents a model trained from that strategy's cumulative labeled dataset, then evaluated on {holdout?.name}.</p></div><div className="table-scroll"><table><thead><tr><th>Budget</th><th>{strategyComparison.armA.label}</th><th>{strategyComparison.armB.label}</th><th>Δ</th></tr></thead><tbody>{points.map(p=><tr key={p.label}><td><strong>{count(p.samples)}</strong><small>{p.label}</small></td><td>{p.armA.toFixed(3)}</td><td><strong>{p.armB.toFixed(3)}</strong></td><td>{p.label==='Seed'?'—':`${p.armB-p.armA>=0?'+':''}${(p.armB-p.armA).toFixed(3)}`}</td></tr>)}</tbody></table></div></section>
    <section className="comparison-decision"><div className="ops-section__header"><div><h2>Decision support</h2><p>Performance, annotation effort and cost at the same cumulative labeled budget.</p></div><Badge>{winner} leads</Badge></div><div className="comparison-economics"><div><small>{strategyComparison.armA.label}</small><strong>{last.armA.toFixed(3)} mAP50–95</strong><span>{hoursA} annotation h · $ {count(costA)}</span><span>{valueA.toFixed(6)} mAP gain / $</span></div><div><small>{strategyComparison.armB.label}</small><strong>{last.armB.toFixed(3)} mAP50–95</strong><span>{hoursB} annotation h · $ {count(costB)}</span><span>{valueB.toFixed(6)} mAP gain / $</span></div></div><div className="decision-summary"><CheckCircle2 size={16}/><div><strong>Recommended next round: {winner}</strong><p>Recommendation is based on the shared fixed holdout at equal labeled budget. Treat annotation cost and safety-slice deltas as secondary decision signals, not selection-time inputs.</p></div></div></section>
    <div className="comparison-note"><CheckCircle2 size={16}/><div><strong>Experiment contract</strong><p>RoadSift compares trained models, not datasets directly. Dataset value is inferred from downstream performance under controlled training and the same fixed holdout.</p></div></div>
  </div>;
}


export function SettingsPage({ theme, setTheme, preferences, setPreferences, setDatasets, setPools, setSelectionBatches, setRuns, notify, language='en', setLanguage }) {
  const [resetOpen,setResetOpen]=useState(false);
  const vi=language==='vi';
  const resetWorkspace=()=>{setDatasets(initialDatasets);setPools?.(pools);setSelectionBatches?.(initialSelectionBatches);setRuns(initialRuns);try{localStorage.removeItem('roadsift-mock-annotations')}catch{}setResetOpen(false);notify('Workspace fixture state restored');};
  return <div className="page enterprise-settings"><PageHeader eyebrow="Workspace" title={vi?'Cài đặt':'Settings'} description={vi?'Cấu hình giao diện, ngôn ngữ và trạng thái workspace.':'Configure interface preferences and local workspace state.'}/>
    <div className="settings-shell"><nav className="settings-nav"><a href="#general">General</a><a href="#appearance">Appearance</a><a href="#workspace">Workspace data</a></nav><div className="settings-sections">
      <section id="general" className="settings-section"><div className="settings-section__header"><div><h2>General</h2><p>{vi?'Ngôn ngữ và hành vi mặc định.':'Language and default interface behavior.'}</p></div></div><div className="settings-table"><div className="settings-table__row"><div><strong>{vi?'Ngôn ngữ giao diện':'Interface language'}</strong><p>Technical ML/CV terms remain in English.</p></div><div className="language-switch language-switch--settings"><button aria-pressed={language==='en'} onClick={()=>setLanguage?.('en')}>English</button><button aria-pressed={language==='vi'} onClick={()=>setLanguage?.('vi')}>Tiếng Việt</button></div></div><div className="settings-table__row"><div><strong>{vi?'Danh sách gọn':'Compact tables'}</strong><p>{vi?'Giảm chiều cao row trong registry và operations table.':'Reduce row density in registry and operations tables.'}</p></div><Toggle label="Compact tables" checked={preferences.compact} onChange={value=>setPreferences(p=>({...p,compact:value}))}/></div><div className="settings-table__row"><div><strong>{vi?'Hiệu ứng giao diện':'Interface motion'}</strong><p>{vi?'Bật transition nhẹ cho panel và navigation.':'Enable subtle transitions for panels and navigation.'}</p></div><Toggle label="Interface motion" checked={preferences.animations} onChange={value=>setPreferences(p=>({...p,animations:value}))}/></div></div></section>
      <section id="appearance" className="settings-section"><div className="settings-section__header"><div><h2>{vi?'Giao diện':'Appearance'}</h2><p>{vi?'Theme áp dụng trên toàn workspace.':'Theme applies across the workspace.'}</p></div></div><div className="settings-table"><div className="settings-table__row"><div><strong>Theme</strong><p>{vi?'Chọn giao diện sáng hoặc tối.':'Choose light or dark appearance.'}</p></div><div className="segmented"><button className={theme==='light'?'active':''} onClick={()=>setTheme('light')}><Sun size={14}/> Light</button><button className={theme==='dark'?'active':''} onClick={()=>setTheme('dark')}><Moon size={14}/> Dark</button></div></div></div></section>
      <section id="workspace" className="settings-section"><div className="settings-section__header"><div><h2>{vi?'Dữ liệu workspace':'Workspace data'}</h2><p>{vi?'Trạng thái mock được lưu cục bộ trong browser.':'Workspace state persisted in this browser.'}</p></div></div><div className="settings-table"><div className="settings-table__row"><div><strong>Persistence</strong><p>Browser localStorage · no production backend attached.</p></div><Badge>Local</Badge></div><div className="settings-table__row settings-table__row--danger"><div><strong>{vi?'Reset workspace':'Reset workspace'}</strong><p>{vi?'Khôi phục toàn bộ registry và run fixture về trạng thái ban đầu.':'Restore Pool, Dataset and Run registries to baseline workspace state.'}</p></div><Button icon={RotateCcw} onClick={()=>setResetOpen(true)}>Reset</Button></div></div></section>
    </div></div>
    {resetOpen&&<Modal title="Reset workspace state?" onClose={()=>setResetOpen(false)} footer={<><Button onClick={()=>setResetOpen(false)}>Cancel</Button><Button variant="primary" onClick={resetWorkspace}>Reset workspace</Button></>}><p>This replaces locally created Pools, Dataset versions and Runs with the baseline workspace state. Theme and language are preserved.</p></Modal>}
  </div>;
}

export function SystemPage({ notify }) {
  const [runnerOpen,setRunnerOpen]=useState(false);
  const [runnerName,setRunnerName]=useState(systemRunnerRegistrationDefaults.name);
  const [runnerType,setRunnerType]=useState(systemRunnerRegistrationDefaults.type);
  const [endpoint,setEndpoint]=useState(systemRunnerRegistrationDefaults.endpoint);
  const registerRunner=()=>{setRunnerOpen(false);notify?.(`${runnerName} registered`)};
  return <div className="page system-page"><PageHeader eyebrow="Infrastructure" title="System" description="Execution backends and external service references used by RoadSift." actions={<Button icon={Plus} onClick={()=>setRunnerOpen(true)}>Register runner</Button>}/>
    <section className="ops-section"><div className="ops-section__header"><div><h2>Execution backends</h2><p>Mining runners registered for immutable job execution.</p></div><Badge>{runners.length} runners</Badge></div><div className="table-scroll"><table className="dataset-table system-table"><thead><tr><th>Runner</th><th>Type</th><th>Status</th><th>Heartbeat</th><th>Queue</th><th>Capacity</th></tr></thead><tbody>{runners.map(r=><tr key={r.id}><td><div className="dataset-name-cell"><strong>{r.name}</strong><small>{r.id}</small></div></td><td>{r.type}</td><td><Badge>{r.status}</Badge></td><td>{date(r.lastHeartbeatAt)}</td><td>{r.queueDepth}</td><td>{r.capacity}</td></tr>)}</tbody></table></div></section>
    <section className="ops-section"><div className="ops-section__header"><div><h2>Connected services</h2><p>External systems referenced by workflow records.</p></div></div><div className="system-service-list"><div><span>Artifact storage</span><strong>{systemServices.artifactStorage}</strong><Badge>Connected</Badge></div><div><span>Annotation handoff</span><strong>{systemServices.annotationHandoff}</strong><Badge>External</Badge></div><div><span>Model registry</span><strong>{systemServices.modelRegistry}</strong><Badge>Reference</Badge></div><div><span>Evaluation</span><strong>{systemServices.evaluation}</strong><Badge>Registered</Badge></div></div></section>
    <section className="ops-section"><div className="ops-section__header"><div><h2>Execution contract</h2><p>Every Mining run resolves the same contract regardless of runner.</p></div></div><div className="contract-line"><code>Pool snapshot</code><ArrowRight size={14}/><code>Dataset version</code><ArrowRight size={14}/><code>Acquisition model</code><ArrowRight size={14}/><code>Job spec</code><ArrowRight size={14}/><code>Selection Batch</code></div></section>
    {runnerOpen&&<Modal title="Register runner" onClose={()=>setRunnerOpen(false)} footer={<><Button onClick={()=>setRunnerOpen(false)}>Cancel</Button><Button variant="primary" onClick={registerRunner}>Register runner</Button></>}><Field label="Runner name"><input value={runnerName} onChange={e=>setRunnerName(e.target.value)}/></Field><Field label="Runner type"><select value={runnerType} onChange={e=>setRunnerType(e.target.value)}><option>Kaggle</option><option>RoadSift Worker</option><option>Custom</option></select></Field><Field label="Endpoint / runner URI"><input value={endpoint} onChange={e=>setEndpoint(e.target.value)}/></Field></Modal>}
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
