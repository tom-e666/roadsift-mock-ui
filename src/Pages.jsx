import React, { useEffect, useRef, useState } from 'react';
import { RunDetails } from './RunDetails.jsx';
import { SampleMedia } from './SampleMedia.jsx';
import './launchpad.css';
import selectionRunnerSource from '../worker/selection_runner.py?raw';
import { listSamplePreviews } from './mock-api.js';
import { ArrowRight, ArrowUpRight, Database, Layers, ScanLine, GitBranch, Plus, Search, LayoutGrid, List, Download, Upload, SlidersHorizontal, Check, X, Copy, Image, Video, Play, Pause, RotateCcw, Sparkles, Cpu, Cloud, ChartNoAxesCombined, Target, Crosshair, ZoomIn, ZoomOut, Trash2, Save, CheckCircle2, FileText, Monitor, Sun, Moon, MousePointer2, BoxSelect, ChevronDown, ArrowLeft, CircleAlert, Pickaxe, History as HistoryIcon } from 'lucide-react';
import { Button, Badge, PageHeader, Metric, Segmented, Empty, Panel, DemoNote, Field, Toggle, Modal, TextLink, HelpTip } from './components/UI.jsx';
import { frames, initialDatasets, initialRuns, initialSelectionBatches, metrics, count, date, sceneUrl, fleetPool, pools, seedDataset, seedEvaluation, holdouts, strategies, datasetRegistration, importSimulation, miningConfig, miningPlugins, runners, modelRegistry, systemServices, strategyComparison, comparisonExperiments, evaluationRegistry, systemRunnerRegistrationDefaults, poolRegistration, batchLifecycle } from './data.js';

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

export function Pools({ navigate, pools, setPools, notify, routePath }) {
  const [query,setQuery]=useState('');
  const selectedId=routePath?.startsWith('/pools/')?decodeURIComponent(routePath.slice('/pools/'.length)):null;
  const selected=pools.find(x=>x.id===selectedId)||null;
  const openPool=pool=>navigate(`/pools/${encodeURIComponent(pool.id)}`);
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
    const record={id:`pool_${slug.replace(/-/g,'_')}_${stamp.slice(-4)}`,name:poolDraft.name.trim(),slug,version:1,snapshot:`pool_snap_${stamp}`,total,eligible,labeled:0,reserved:0,excluded,indexed:now,storage:poolDraft.storageUri.trim(),manifestUri:poolDraft.manifestUri.trim(),source:poolDraft.source.trim(),status:'Active',eligibleTrend:[eligible],miningRuns7d:0,lastMiningAt:now,composition:{Unclassified:eligible},quality:{Good:eligible},stateBreakdown:{Eligible:eligible,Reserved:0,Labeled:0,Excluded:excluded},recentSnapshots:[{version:1,eligible,total,reason:'Pool registered',at:now}],sampleScenes:[0,1,2,3]};
    setPools(list=>[record,...list]); setCreateOpen(false); setPoolValidation(null); notify(`${record.name} created`);
  };
  const results=pools.filter(p=>`${p.name} ${p.snapshot} ${p.source}`.toLowerCase().includes(query.toLowerCase()));
  const sparkline = values => {
    const width=88,height=28,pad=2;
    const min=Math.min(...values),max=Math.max(...values),range=Math.max(1,max-min);
    return values.map((v,i)=>`${pad+(i*(width-pad*2))/Math.max(1,values.length-1)},${height-pad-((v-min)/range)*(height-pad*2)}`).join(' ');
  };
  const barWidth=(value,total)=>`${Math.max(2,Math.round((Number(value||0)/Math.max(1,Number(total||1)))*100))}%`;
  return <div className="page pools-page">{!selected&&<PageHeader eyebrow="Candidate registry" title="Pools" description="Versioned snapshots of unlabeled fleet data available for mining." actions={<Button variant="secondary" icon={Plus} onClick={()=>{setPoolDraft({name:'',source:'',storageUri:'',manifestUri:'',total:'',eligible:'',validated:false});setPoolValidation(null);setCreateOpen(true)}}>Create pool</Button>} />}
    {!selected&&<><section className="catalog"><div className="catalog__heading"><div><h2>Candidate pools</h2></div></div>
      <div className="catalog__filters"><div className="search-field"><Search size={16}/><input aria-label="Search pools" placeholder="Search pools…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}</div></div>
      {results.length?<div className="table-scroll"><table className="dataset-table pool-registry-table"><thead><tr><th>Pool</th><th>Snapshot <HelpTip>An immutable version of Pool membership used to reproduce a Mining run.</HelpTip></th><th>Total</th><th>Eligible <HelpTip>Samples currently allowed to be selected by Mining.</HelpTip></th><th>Reserved <HelpTip>Samples already selected into a Selection Batch or under review, so they are temporarily unavailable.</HelpTip></th><th>Eligible trend <HelpTip>How the number of eligible candidates changed across recent Pool snapshots.</HelpTip></th><th>Mining <HelpTip>Recent Mining activity using this Pool as the candidate source.</HelpTip></th><th>Updated</th></tr></thead><tbody>{results.map(p=><tr key={p.id} tabIndex="0" role="button" onClick={()=>openPool(p)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPool(p)}}}><td><div className="dataset-name-cell"><strong>{p.name}</strong><small>{p.source}</small></div></td><td><code className="artifact-ref">{p.slug || p.id}:p{p.version}</code></td><td className="tabular">{count(p.total)}</td><td className="tabular">{count(p.eligible)}</td><td className="tabular">{count(p.reserved)}</td><td><div className="pool-trend" title={(p.eligibleTrend||[]).map((v,i)=>`p${Math.max(1,p.version-(p.eligibleTrend.length-1)+i)}: ${count(v)} eligible`).join(' · ')}><svg viewBox="0 0 88 28" role="img" aria-label={`${p.name} eligible trend`}><polyline points={sparkline(p.eligibleTrend||[p.eligible])}/><circle cx="86" cy={(() => { const values=p.eligibleTrend||[p.eligible]; const min=Math.min(...values),max=Math.max(...values),range=Math.max(1,max-min); return 26-((values.at(-1)-min)/range)*24; })()} r="2"/></svg></div></td><td><div className="pool-activity"><strong>{p.miningRuns7d} runs</strong><small>last {date(p.lastMiningAt)}</small></div></td><td className="table-muted">{date(p.indexed)}</td></tr>)}</tbody></table></div>:<Empty title="No matching pools" detail="Try a different search."/>}
    </section>

    </>}
    {selected&&<section className="pool-detail-workspace pool-overview-single">
      <div className="dataset-detail-top">
        <Button icon={ArrowLeft} onClick={()=>navigate('pools')}>All pools</Button>
        <div className="dataset-detail-actions"><Button icon={ScanLine} onClick={()=>navigate('data-explorer',{kind:'pool',id:selected.id})}>Browse samples</Button></div>
      </div>
      <div className="dataset-detail-heading">
        <div><p className="eyebrow">Candidate Pool · <span className="pool-current-version">{selected.slug||selected.id}:p{selected.version}</span></p><h2>{selected.name}</h2><p>{selected.source||'Candidate registry'} · Updated {date(selected.indexed)}</p></div>
        <div className="dataset-detail-hero-metrics"><div><small>Total frames</small><strong>{count(selected.total)}</strong></div><div><small>Available to mine</small><strong>{count(selected.eligible)}</strong></div></div>
      </div>
      <Panel title="Pool membership">
        <div className="pool-composition-track" role="img" aria-label="Pool membership split by lifecycle state">{[['eligible',selected.eligible],['reserved',selected.reserved],['labeled',selected.labeled],['excluded',selected.excluded]].map(([key,value])=><span key={key} className={`pool-part--${key}`} style={{flex:Math.max(0,Number(value)||0)}} title={`${key}: ${count(value||0)}`}/>)}</div>
        <div className="pool-composition-legend">{[['Eligible',selected.eligible],['Reserved',selected.reserved],['Labeled',selected.labeled],['Excluded',selected.excluded]].map(([key,value])=><div key={key}><span className={`pool-legend-dot pool-part--${key.toLowerCase()}`}/><small>{key}</small><strong>{count(value||0)}</strong><span className="pool-share">{selected.total>0?(100*Number(value||0)/Number(selected.total)).toFixed(2)+'%':'—'}</span></div>)}</div>
        {Number(selected.total)!==Number(selected.eligible||0)+Number(selected.reserved||0)+Number(selected.labeled||0)+Number(selected.excluded||0)&&<p className="mining-inline-error">Pool membership counts need review: states do not reconcile with Total.</p>}
        <div className="pool-mining-action"><div><strong>Ready for selection</strong><span>{count(selected.eligible)} eligible frames · p{selected.version}</span></div><Button variant="primary" icon={Pickaxe} disabled={!selected.eligible} onClick={()=>navigate('mining',{kind:'pool',id:selected.id})}>Start mining</Button></div>
      </Panel>
      <div className="pool-overview-two-columns">
        <Panel title="Candidate composition">
          <div className="pool-breakdown">{Object.entries(selected.composition||{}).map(([label,value])=><div className="pool-breakdown__row" key={label}><div><span>{label.replace(/([A-Z])/g,' $1').trim()}</span><strong>{count(value)} <small>· {selected.eligible>0?(100*Number(value)/Number(selected.eligible)).toFixed(1):"0.0"}%</small></strong></div><div className="pool-breakdown__track"><i style={{width:selected.eligible>0?`${100*Number(value)/Number(selected.eligible)}%`:"0%"}}/></div></div>)}</div>
        </Panel>
        <Panel title="Quality & review flags">
          <div className="pool-quality-list">{Object.entries(selected.quality||{}).map(([key,value])=><div key={key} className={`pool-quality-${key.toLowerCase()}`}><span>{key.replace(/([A-Z])/g,' $1').trim()}</span><strong>{count(value)}</strong></div>)}</div>
          <p className="pool-hint">Flags can overlap. Usable hard cases remain in the Pool.</p>
        </Panel>
      </div>
      <Panel title="Sample preview">
        <div className="pool-overview-previews">{(selected.sampleScenes||[0,1,2,3]).slice(0,4).map((scene,index)=><div key={index} className="pool-overview-preview"><Scene scene={scene} alt={`Sample preview ${index+1}`}/></div>)}</div>
      </Panel>
      <Panel title="Recent snapshots">
        <div className="pool-snapshot-timeline">{(selected.recentSnapshots||[]).map((snapshot,index,array)=>{
          const previous=array[index+1];
          const current=snapshot.version===selected.version;
          const eligibleDelta=previous&&Number.isFinite(snapshot.eligible)&&Number.isFinite(previous.eligible)?Number(snapshot.eligible)-Number(previous.eligible):null;
          const totalDelta=previous&&Number.isFinite(snapshot.total)&&Number.isFinite(previous.total)?Number(snapshot.total)-Number(previous.total):null;
          const deltaText=value=>value===null?'Not recorded':`${value>0?'+':''}${count(value)}`;
          return <div key={snapshot.version} className="pool-snapshot-event">
            <div className="pool-snapshot-rail"><span className={current?'pool-snapshot-marker current':'pool-snapshot-marker'}/></div>
            <div className="pool-snapshot-event-main">
              <div className="pool-snapshot-event-top"><div><strong>{selected.slug||selected.id}:p{snapshot.version}</strong>{current&&<Badge>Current</Badge>}</div><time dateTime={snapshot.at}>{date(snapshot.at)}</time></div>
              <p>{snapshot.reason||'Change reason not registered'}</p>
              <div className="pool-snapshot-numbers"><span><b>{count(snapshot.eligible||0)}</b> eligible</span>{previous&&<><span>Δ eligible <b className={eligibleDelta>0?'pool-positive':eligibleDelta<0?'pool-negative':''}>{deltaText(eligibleDelta)}</b></span><span>Δ total <b>{deltaText(totalDelta)}</b></span></>}</div>

            </div>
          </div>
        })}</div>
        <details className="advanced-config"><summary>Snapshot provenance</summary><p className="pool-hint">Net deltas are not ingest counts. Job IDs and membership transitions are not registered for these versions.</p></details>
      </Panel>
      <details className="panel mining-accordion pool-technical-section"><summary className="mining-accordion__summary"><strong>Technical metadata</strong><small>Snapshot references · activity</small></summary>
        <div className="panel__body"><div className="detail-stats"><StatRow label="Current version" value={`${selected.slug||selected.id}:p${selected.version}`}/><StatRow label="Snapshot ID" value={selected.snapshot}/>{selected.manifestUri&&<StatRow label="Manifest URI" value={selected.manifestUri}/>}
          {selected.storage&&<StatRow label="Storage URI" value={selected.storage}/>}<StatRow label="Mining runs · 7 days" value={String(selected.miningRuns7d||0)}/><StatRow label="Last mining" value={date(selected.lastMiningAt)}/></div>
        </div>
      </details>
    </section>}
    {createOpen&&<Modal title="Create pool" onClose={()=>setCreateOpen(false)} footer={<><Button onClick={()=>setCreateOpen(false)}>Cancel</Button><Button onClick={validatePool}>Validate</Button><Button variant="primary" onClick={createPool}>Create pool</Button></>}><div className="register-intro"><div><p className="modal-intro">Register an existing unlabeled candidate collection as a versioned Pool. Use Import Data when you still need to upload or extract media first.</p></div><Button icon={Sparkles} onClick={autofillPool}>Autofill</Button></div><Field label="Pool name"><input value={poolDraft.name} onChange={e=>patchPoolDraft({name:e.target.value})} placeholder="Central Vietnam Fleet Pool"/></Field><Field label="Source description"><input value={poolDraft.source} onChange={e=>patchPoolDraft({source:e.target.value})} placeholder="Existing R2 collection"/></Field><Field label="Storage URI"><input value={poolDraft.storageUri} onChange={e=>patchPoolDraft({storageUri:e.target.value})} placeholder="r2://roadsift/pools/central-vietnam/"/></Field><Field label="Manifest URI" help="Canonical membership reference for this Pool snapshot."><input value={poolDraft.manifestUri} onChange={e=>patchPoolDraft({manifestUri:e.target.value})} placeholder="r2://roadsift/pools/central-vietnam/manifest.parquet"/></Field><div className="register-grid"><Field label="Total samples"><input inputMode="numeric" value={poolDraft.total} onChange={e=>patchPoolDraft({total:e.target.value})}/></Field><Field label="Eligible samples" help="Samples currently allowed to enter Mining."><input inputMode="numeric" value={poolDraft.eligible} onChange={e=>patchPoolDraft({eligible:e.target.value})}/></Field></div>{poolValidation&&<div className={poolValidation.tone==='success'?'registration-valid':'registration-error'}>{poolValidation.tone==='success'?<CheckCircle2 size={18}/>:<X size={18}/>}<div><strong>{poolValidation.tone==='success'?'Validation passed':'Validation failed'}</strong><p>{poolValidation.message}</p></div></div>}</Modal>}

  </div>;
}

export function Datasets({ datasets, setDatasets, pools, navigate, notify, routePath }) {
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
  useEffect(()=>{
    const routeId=routePath?.startsWith('/datasets/')?decodeURIComponent(routePath.slice('/datasets/'.length)):null;
    const next=routeId?datasets.find(d=>d.id===routeId)||null:null;
    setSelected(next);
  },[routePath,datasets]);
  const openDetails=dataset=>navigate(`/datasets/${encodeURIComponent(dataset.id)}`);
  const closeDetails=()=>navigate('datasets');
  const selectedFamily = selected ? datasets.filter(d => d.name === selected.name).sort((a,b)=>(b.version||0)-(a.version||0)) : [];
  const selectedPool = selected ? pools.find(p => p.id === selected.pool) : null;
  const selectedParent = selected ? datasets.find(d => d.id === selected.parent) : null;
  const historyCount = selectedFamily.length + (selectedFamily.some(d => d.version === 0) ? 0 : 1);
  return <div className="page datasets-page">{!selected&&<PageHeader eyebrow="Your library" title="Datasets" description="A home for your data. A clear path to your next model." actions={<Button variant="secondary" icon={Plus} onClick={openImport}>Register dataset</Button>} />}
    {!selected&&<>
    <section className="catalog"><div className="catalog__heading"><div><h2>All datasets</h2></div></div>
      <div className="catalog__filters"><div className="search-field"><Search size={16} /><input aria-label="Search datasets" placeholder="Search datasets…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</div></div>
      {results.length ? <div className="table-scroll"><table className="dataset-table dataset-registry-table"><thead><tr><th className="dataset-image-header">Image</th><th>Dataset</th><th>Current version</th><th>Samples</th><th>Strategy</th><th>Updated</th></tr></thead><tbody>{results.map(d => <tr key={d.id} tabIndex="0" role="button" onClick={() => openDetails(d)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetails(d)}}}><td className="dataset-image-cell"><div className="dataset-thumbnail">{Number.isInteger(d.scene)&&d.scene>=0?<Scene scene={d.scene} alt="" />:<Image size={18} aria-hidden="true"/>}</div></td><td><div className="dataset-name-cell"><strong>{d.name}</strong><small>{d.domain || 'Mixed driving domain'}</small></div></td><td><div className="dataset-version-cell"><code className="artifact-ref">{d.slug || d.id}:v{d.version}</code>{(d.aliases||[]).length>0&&<small className="artifact-aliases">aliases: {(d.aliases||[]).join(', ')}</small>}</div></td><td className="tabular">{count(d.count)}</td><td>{d.strategy || 'External registration'}</td><td className="table-muted">{date(d.date)}</td></tr>)}</tbody></table></div> : <Empty title="No matching datasets" detail="Try a different search." action={<Button onClick={() => setQuery('')}>Clear search</Button>} />}
    </section>
    </>}
    {selected&&<section className="dataset-full-page dataset-overview-single" aria-label={`Dataset details for ${selected.name}`}>
      <div className="dataset-detail-top"><Button icon={ArrowLeft} onClick={closeDetails}>All datasets</Button><Button icon={Download} onClick={()=>exportDatasetMetadata(selected)}>Export metadata</Button></div>
      <div className="dataset-detail-heading">
        <div><p className="eyebrow">Dataset · <span className="pool-current-version">{selected.slug||selected.id}:v{selected.version}</span></p><h2>{selected.name}</h2><p>{selected.domain||'Mixed'} · {selected.task||datasetRegistration.defaultTask} · Updated {date(selected.updatedAt||selected.date)}</p></div>
        <div className="dataset-version-control">
          <label htmlFor="dataset-version-select">Dataset version</label>
          <select id="dataset-version-select" aria-label="Select dataset version" value={selected.id} onChange={event=>{const version=selectedFamily.find(item=>item.id===event.target.value);if(version)openDetails(version)}}>
            {selectedFamily.map(version=><option key={version.id} value={version.id}>v{version.version} · {count(version.count)} samples</option>)}
          </select>
          <span>{count(selected.count||0)} labeled samples{selectedFamily[0]?.id!==selected.id?' · Historical version':' · Latest version'}</span>
        </div>
      </div>
      <Panel title="Evaluation & release status">
        <div className="dataset-evaluation-overview">
          <div className="dataset-eval-primary"><small>mAP50–95</small><strong>{selected.evalId&&Number.isFinite(selected.evaluation?.map)?selected.evaluation.map.toFixed(3):'—'}</strong><span>{selected.evalId?'Registered evaluation':'No evaluation recorded'}</span></div>
          <div className="dataset-eval-slices">{[['Recall','recall'],['VRU Recall','vru'],['Night','night'],['Rain / Fog','rain']].map(([label,key])=><div key={key}><small>{label}</small><strong>{selected.evalId&&Number.isFinite(selected.evaluation?.[key])?selected.evaluation[key].toFixed(3):'—'}</strong></div>)}</div>
          <div className="dataset-release-status" role="status"><span>Release gate</span><strong className="dataset-gate-pending"><CheckCircle2 size={14}/> Not assessed</strong><small>Release eligibility unknown · no gate decision recorded.</small></div>
        </div>
        <div className="dataset-eval-footer">
          <div className="dataset-eval-model"><span>Model</span><strong>{selected.model||'Not registered'}</strong><span>{selected.holdoutId?holdouts.find(h=>h.id===selected.holdoutId)?.name||selected.holdoutId:'Holdout not verified'}</span></div>
          <div className="dataset-inline-actions"><Button icon={ArrowRight} onClick={()=>navigate('data-explorer',selected)}>Explore samples</Button><Button onClick={openModelImport}>Register model reference</Button><Button onClick={openEvalImport}>Record evaluation</Button></div>
        </div>
      </Panel>
      <div className="dataset-overview-split">
        <Panel title="Dataset overview">
          <div className="detail-stats">{selected.strategy&&<StatRow label="Selection strategy" value={selected.strategy}/>}<StatRow label="Format" value={selected.format||datasetRegistration.defaultFormat}/>{selected.owner&&<StatRow label="Owner" value={selected.owner}/>}<StatRow label="Parent version" value={selectedParent?`${selectedParent.name} v${selectedParent.version}`:'Initial version'}/></div>
          
        </Panel>
        <Panel title="Lineage">
          <div className="dataset-lineage-flow dataset-lineage-flow--compact" aria-label="Registered lineage">
            {[
              ['Pool',selectedPool?selectedPool.name:'Not linked',!!selectedPool],
              ['Run',selected.run?'Linked':'Not linked',!!selected.run],
              ['Batch',selected.sourceBatch?'Linked':'Not linked',!!selected.sourceBatch],
              ['Dataset',`v${selected.version}`,true],
              ['Model',selected.model||'Not linked',!!selected.model]
            ].map(([label,value,linked],index)=><React.Fragment key={label}>
              {index>0&&<ArrowRight size={14} className="dataset-flow-arrow" aria-hidden="true"/>}
              <div className={linked?'dataset-flow-item':'dataset-flow-item dataset-flow-item--missing'}><span>{label}</span><strong>{value}</strong></div>
            </React.Fragment>)}
          </div>
          <details className="advanced-config"><summary>Lineage references</summary><div className="detail-stats">{selected.run&&<StatRow label="Run" value={selected.run}/>} {selected.sourceBatch&&<StatRow label="Batch" value={selected.sourceBatch}/>} {selected.evalId&&<StatRow label="Evaluation" value={selected.evalId}/>} {selectedParent&&<Button onClick={()=>openDetails(selectedParent)}>Open parent version</Button>}</div></details>
        </Panel>
      </div>
      <Panel title="Version tree" description="Version lineage · select a version using the dropdown above">
        <div className="dataset-version-tree" role="list" aria-label="Dataset version lineage">
          {[...selectedFamily].reverse().map((version,index,ordered)=>{
            const parent=version.parent?datasets.find(d=>d.id===version.parent):null;
            const previous=ordered[index-1];
            const linkedFromPrevious=!!previous&&version.parent===previous.id;
            const externalParent=version.parent&&!ordered.some(v=>v.id===version.parent);
            return <React.Fragment key={version.id}>
              {index===0&&externalParent&&<div className="dataset-version-tree__external"><GitBranch size={14}/><span>Source: {parent?parent.name+' · v'+parent.version:version.parent}</span><small>Outside this dataset family</small></div>}
              {index>0&&<div className={linkedFromPrevious?'dataset-version-tree__connector':'dataset-version-tree__connector dataset-version-tree__connector--broken'} aria-label={linkedFromPrevious?'Parent linked':'No direct parent relationship'}>{linkedFromPrevious?'↓':'⋯'}</div>}
              <div className={version.id===selected.id?'dataset-version-tree__node dataset-version-tree__node--current':'dataset-version-tree__node'} role="listitem" aria-current={version.id===selected.id?'true':undefined}>
                <span className="dataset-version-tree__dot" aria-hidden="true"/>
                <div className="dataset-version-tree__node-main"><strong>v{version.version}</strong><span>{count(version.count||0)} samples</span><small>{date(version.date)}</small></div>
                {version.id===selected.id&&<span className="dataset-version-tree__tag">Viewing</span>}
                {version.id===selectedFamily[0]?.id&&<span className="dataset-version-tree__tag dataset-version-tree__tag--latest">Latest</span>}
                {(version.aliases||[]).length>0&&<span className="dataset-version-tree__aliases">{version.aliases.join(' · ')}</span>}
                {!linkedFromPrevious&&index>0&&<small className="dataset-version-tree__unlinked">Parent: {parent?parent.name+' v'+parent.version:version.parent||'unknown'}</small>}
              </div>
            </React.Fragment>;
          })}
        </div>
      </Panel>
      <div className="dataset-id-strip"><div><span>Dataset ID</span><code>{selected.id}</code><button aria-label="Copy Dataset ID" title="Copy Dataset ID" onClick={()=>navigator.clipboard?.writeText(selected.id).then(()=>notify('Dataset ID copied')).catch(()=>notify('Clipboard unavailable'))}><Copy size={14}/></button></div>{selected.evalId&&<div><span>Evaluation ID</span><code>{selected.evalId}</code><button aria-label="Copy Evaluation ID" title="Copy Evaluation ID" onClick={()=>navigator.clipboard?.writeText(selected.evalId).then(()=>notify('Evaluation ID copied')).catch(()=>notify('Clipboard unavailable'))}><Copy size={14}/></button></div>}</div>
      <details className="panel mining-accordion dataset-technical-collapse"><summary className="mining-accordion__summary"><strong>Technical metadata</strong><small>Storage references · integrity · IDs</small></summary>
        <div className="panel__body"><div className="detail-stats"><StatRow label="Dataset ID" value={selected.id}/>{selected.manifestUri&&<StatRow label="Manifest" value={selected.manifestUri}/>} {selected.annotationUri&&<StatRow label="Annotations" value={selected.annotationUri}/>} {selected.schemaVersion&&<StatRow label="Schema" value={selected.schemaVersion}/>} {selected.membershipHash&&<StatRow label="Membership hash (unverified fixture)" value={selected.membershipHash}/>} {selected.evalId&&<StatRow label="Evaluation ID" value={selected.evalId}/>}</div></div>
      </details>
    </section>}
    {importOpen && <Modal title="Register dataset" onClose={() => setImportOpen(false)} footer={<><Button onClick={() => setImportOpen(false)}>Cancel</Button><Button onClick={validateRegistration}>Validate</Button><Button variant="primary" onClick={registerDataset}>Register dataset</Button></>}><div className="register-intro"><div><p className="modal-intro">Register an existing labeled dataset by reference. RoadSift keeps its identity, version, membership and annotation lineage without copying the underlying media.</p></div><div className="register-intro__actions"><input ref={metadataInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={importDatasetMetadata}/><Button icon={Upload} onClick={()=>metadataInputRef.current?.click()}>Import metadata</Button><Button icon={Sparkles} onClick={autofillRegistration}>Autofill</Button></div></div><Field label="Dataset name"><input value={registration.name} onChange={e=>patchRegistration({name:e.target.value})} placeholder="Night & Rain Fleet" /></Field><Field label="Manifest URI" hint="Canonical sample membership; Parquet or JSONL."><input value={registration.manifestUri} onChange={e=>patchRegistration({manifestUri:e.target.value})} placeholder="r2://roadsift/datasets/night-rain/v3/manifest.parquet" /></Field><Field label="Annotation URI"><input value={registration.annotationUri} onChange={e=>patchRegistration({annotationUri:e.target.value})} placeholder="r2://roadsift/annotations/night-rain/v3/annotations.json" /></Field><div className="register-grid"><Field label="Task"><select value={registration.task} onChange={e=>{const task=e.target.value;patchRegistration({task,format:taskFormats[task][0]})}}>{Object.keys(taskFormats).map(task=><option key={task}>{task}</option>)}</select></Field><Field label="Dataset / annotation format" help="The external annotation schema RoadSift will validate and map into its internal dataset contract."><select value={registration.format} onChange={e=>patchRegistration({format:e.target.value})}>{taskFormats[registration.task].map(format=><option key={format}>{format}</option>)}</select></Field></div><Field label="Base dataset version" help="The previous labeled dataset version. The new version inherits its membership before adding newly labeled samples." hint="The new version inherits all samples from the base dataset."><select value={registration.parentId} onChange={e=>patchRegistration({parentId:e.target.value})}><option value="">Select base version…</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.name} · v{d.version} · {count(d.count)} samples</option>)}</select></Field><Field label="Source selection batch (optional)" help="The reviewed Selection Batch whose samples were externally annotated and are now being added to this dataset version." hint="Links the newly labeled samples back to the Mining batch that selected them."><input value={registration.sourceBatch} onChange={e=>patchRegistration({sourceBatch:e.target.value})} placeholder="batch_northern_highway_corridor_r13_ab12c" /></Field>{registrationValidation&&<div className={registrationValidation.tone==='success'?'registration-valid':'registration-error'}>{registrationValidation.tone==='success'?<CheckCircle2 size={18}/>:<X size={18}/>}<div><strong>{registrationValidation.tone==='success'?'Validation passed':'Validation failed'}</strong><p>{registrationValidation.message}</p></div></div>}</Modal>}
    {modelImportOpen&&<Modal title="Import model artifact" onClose={()=>setModelImportOpen(false)} footer={<><Button onClick={()=>setModelImportOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveModelImport}>Import model</Button></>}><div className="register-intro"><p className="modal-intro">Reference an externally trained model artifact. RoadSift stores the model identity and URI; it does not train the model here.</p><Button icon={Sparkles} onClick={()=>setModelDraft({name:`YOLO11m · ${selected?.slug||selected?.id}-v${selected?.version}`,uri:`r2://roadsift/models/${selected?.slug||selected?.id}/v${selected?.version}/model.pt`})}>Autofill</Button></div><Field label="Model name"><input value={modelDraft.name} onChange={e=>setModelDraft(v=>({...v,name:e.target.value}))}/></Field><Field label="Artifact URI"><input value={modelDraft.uri} onChange={e=>setModelDraft(v=>({...v,uri:e.target.value}))}/></Field></Modal>}
    {evalImportOpen&&<Modal title="Import evaluation result" onClose={()=>setEvalImportOpen(false)} footer={<><Button onClick={()=>setEvalImportOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveEvalImport}>Import evaluation</Button></>}><div className="register-intro"><p className="modal-intro">Register externally computed metrics against the fixed holdout. These metrics are evaluation-only and never feed sample selection.</p><Button icon={Sparkles} onClick={()=>setEvalDraft({id:`eval_${selected?.slug||selected?.id}_v${selected?.version}_${Date.now().toString(36).slice(-4)}`,holdoutId:holdouts[0]?.id||'',map:String(selected?.evaluation?.map??seedEvaluation.map),recall:String(selected?.evaluation?.recall??seedEvaluation.recall),vru:String(selected?.evaluation?.vru??seedEvaluation.vru),night:String(selected?.evaluation?.night??seedEvaluation.night),rain:String(selected?.evaluation?.rain??seedEvaluation.rain)})}>Autofill</Button></div><Field label="Evaluation ID"><input value={evalDraft.id} onChange={e=>setEvalDraft(v=>({...v,id:e.target.value}))}/></Field><Field label="Fixed holdout"><select value={evalDraft.holdoutId} onChange={e=>setEvalDraft(v=>({...v,holdoutId:e.target.value}))}>{holdouts.map(h=><option key={h.id} value={h.id}>{h.name} · {count(h.samples)} frames</option>)}</select></Field><div className="register-grid"><Field label="mAP50–95"><input value={evalDraft.map} onChange={e=>setEvalDraft(v=>({...v,map:e.target.value}))}/></Field><Field label="Recall"><input value={evalDraft.recall} onChange={e=>setEvalDraft(v=>({...v,recall:e.target.value}))}/></Field><Field label="VRU Recall"><input value={evalDraft.vru} onChange={e=>setEvalDraft(v=>({...v,vru:e.target.value}))}/></Field><Field label="Night Recall"><input value={evalDraft.night} onChange={e=>setEvalDraft(v=>({...v,night:e.target.value}))}/></Field><Field label="Rain/Fog Recall"><input value={evalDraft.rain} onChange={e=>setEvalDraft(v=>({...v,rain:e.target.value}))}/></Field></div></Modal>}

  </div>;
}

export function Explorer({datasets,pools,selectionBatches,setSelectionBatches,contextDataset,notify,navigate,routePath}) {
  const routeParams=new URLSearchParams((routePath?.split('?')[1]||''));
  const routedBatchId=routeParams.get('batchId');
  const routedBatch=selectionBatches?.find(b=>b.id===routedBatchId)||null;
  const reviewMode=false; // Selection decisions live in the dedicated Batch Workspace, not in Explorer.
  const initialType=routedBatch?'batch':contextDataset?.kind==='pool'?'pool':contextDataset?.id&&datasets.some(d=>d.id===contextDataset.id)?'dataset':'pool';
  const [sourceType,setSourceType]=useState(initialType);
  const [sourceId,setSourceId]=useState(routedBatch?.id||contextDataset?.id||pools[0]?.id||'');
  const [sourceOpen,setSourceOpen]=useState(false);
  const [sourceSearch,setSourceSearch]=useState('');
  const sourceMenu=useRef(null);
  const [state,setState]=useState('All');
  const [query,setQuery]=useState('');
  const [domain,setDomain]=useState('All');
  const [weather,setWeather]=useState('All');
  const [quality,setQuality]=useState('All');
  const [minObjects,setMinObjects]=useState('');
  const [maxUncertainty,setMaxUncertainty]=useState('');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [active,setActive]=useState(null);
  const [selectedIds,setSelectedIds]=useState([]);
  const [lastClicked,setLastClicked]=useState(-1);
  const [detections,setDetections]=useState(false);
  const [view,setView]=useState('grid');
  const [inspectorTab,setInspectorTab]=useState('overview');
  const [records,setRecords]=useState([]);
  const [cursor,setCursor]=useState('0');
  const [loading,setLoading]=useState(false);
  const [pageError,setPageError]=useState('');
  const [reviewDecisions,setReviewDecisions]=useState({});
  const requestId=useRef(0);
  const loadingSentinel=useRef(null);
  useEffect(()=>{
    if(routedBatch){setSourceType('batch');setSourceId(routedBatch.id);return;}
    if(contextDataset?.id){setSourceType(contextDataset.kind==='pool'?'pool':'dataset');setSourceId(contextDataset.id)}
  },[contextDataset,routedBatchId]);
  useEffect(()=>{const handler=e=>{if(sourceMenu.current&&!sourceMenu.current.contains(e.target))setSourceOpen(false)};document.addEventListener('pointerdown',handler);return()=>document.removeEventListener('pointerdown',handler)},[]);
  const sourceList=sourceType==='pool'?pools:sourceType==='batch'?(selectionBatches||[]):datasets;
  const source=sourceList.find(x=>x.id===sourceId)||sourceList[0]||null;
  const batchContext=sourceType==='batch'?source:null;
  const reviewPct=batch=>Math.round(((batch?.review?.reviewed||0)/Math.max(1,batch?.count||0))*100);
  const normalizedState=s=>({Raw:'Eligible',Selected:'Reserved',Labeled:'Labeled',Excluded:'Excluded'})[s]||s;
  const demoFrames=frames;
  const filtered=demoFrames.filter(f=>(state==='All'||normalizedState(f.state)===state)
    &&(domain==='All'||f.domain===domain)&&(weather==='All'||f.weather===weather)
    &&(quality==='All'||f.quality===quality)
    &&(minObjects===''||f.objects>=Number(minObjects))
    &&(maxUncertainty===''||f.uncertainty<=Number(maxUncertainty))
    &&`${f.id} ${f.domain} ${f.video}`.toLowerCase().includes(query.toLowerCase()));
  const visible=records;
  // Preview API contract: cursor pagination, filtering, and stable sample IDs.
  const mockQuery=JSON.stringify({sourceType,sourceId,state,domain,weather,quality,minObjects,maxUncertainty,query});
  const fetchNext=async()=>{
    if(loading||cursor===null)return;
    setLoading(true);setPageError('');
    const version=requestId.current,after=cursor;
    try{
      const result=await listSamplePreviews({cursor:after,sourceType,sourceId,state,domain,weather,quality,minObjects,maxUncertainty,search:query});
      if(version!==requestId.current)return;
      setRecords(previous=>[...previous,...result.items.filter(item=>!previous.some(p=>p.id===item.id))]);
      setCursor(result.nextCursor);
    }catch{if(version===requestId.current)setPageError('Could not load samples. Retry.');}
    finally{if(version===requestId.current)setLoading(false)}
  };
  const resetView=()=>{setState('All');setQuery('');setDomain('All');setWeather('All');setQuality('All');setMinObjects('');setMaxUncertainty('');setSelectedIds([]);setLastClicked(-1);setActive(null)};
  useEffect(()=>{requestId.current+=1;setRecords([]);setCursor('0');setLoading(false);setPageError('');setSelectedIds([]);setLastClicked(-1)},[mockQuery]);
  useEffect(()=>{
    const target=loadingSentinel.current;
    if(!target||cursor===null||loading||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting))fetchNext()},{rootMargin:'250px'});
    observer.observe(target);return()=>observer.disconnect();
  },[cursor,loading,mockQuery]);
  const aggregate=sourceType==='pool'?{All:source?.total,Eligible:source?.eligible,Reserved:source?.reserved,Labeled:source?.labeled,Excluded:source?.excluded}:sourceType==='batch'?{All:source?.count}:{All:source?.count,Labeled:source?.count};
  const tabs=sourceType==='pool'?['All','Eligible','Reserved','Labeled','Excluded']:sourceType==='batch'?['All']:['All','Labeled'];
  const checked=id=>selectedIds.includes(id);
  const pick=(frame,index,shift)=>{
    const ids=shift&&lastClicked>=0?filtered.slice(Math.min(lastClicked,index),Math.max(lastClicked,index)+1).map(x=>x.id):[frame.id];
    setSelectedIds(old=>{const next=new Set(old);if(ids.length===1&&next.has(frame.id))next.delete(frame.id);else ids.forEach(id=>next.add(id));return [...next]});
    setLastClicked(index);
  };
  const exportSelection=()=>{const chosen=frames.filter(f=>selectedIds.includes(f.id));downloadJSON('roadsift-preview-selection.json',{schemaVersion:'roadsift.preview-selection.v1',fixtureOnly:true,sourceType,sourceId:source?.id,samples:chosen});notify('Exported selected preview metadata')};
  return <div className="page data-browser data-browser--reworked">
    <PageHeader eyebrow={reviewMode?'Selection review':'Library'} title={reviewMode?'Batch Review · Data Explorer':'Data Explorer'} description={reviewMode?'Inspect immutable batch membership and record review decisions in the shared explorer.':'Browse frames and sample metadata.'} actions={batchContext?<Button icon={ArrowLeft} onClick={()=>navigate('batches')}>Back to batches</Button>:null}/>
    {batchContext&&<div className="batch-review-banner"><div><small>Selection Batch · immutable membership</small><strong>{batchContext.name}</strong><span>{batchContext.id} · {count(batchContext.count)} samples · {batchContext.strategy}</span></div><div className="batch-review-banner__progress"><span>{reviewMode?'Review progress':'Batch scope'}</span><strong>{reviewMode?`${reviewPct(batchContext)}%`:'Read-only'}</strong>{reviewMode&&<div className="batch-progress"><i style={{width:`${reviewPct(batchContext)}%`}}/></div>}</div></div>}
    <div className="explorer-source-panel">
      {batchContext?<div className="explorer-source-lock"><Badge>{reviewMode?'Review mode':'Batch scope'}</Badge><span>Source locked to this Selection Batch</span></div>:<div className="explorer-source-switch" role="group" aria-label="Source type"><button aria-pressed={sourceType==='pool'} onClick={()=>{setSourceType('pool');setSourceId(pools[0]?.id||'');resetView()}}>Candidate Pools</button><button aria-pressed={sourceType==='dataset'} onClick={()=>{setSourceType('dataset');setSourceId(datasets[0]?.id||'');resetView()}}>Labeled Datasets</button></div>}
      <div className="explorer-source-select" ref={sourceMenu}><label>{sourceType==='pool'?'Pool Snapshot':sourceType==='batch'?'Selection Batch':'Dataset Version'}</label><button type="button" className="explorer-select-trigger" aria-haspopup="listbox" aria-expanded={sourceOpen} disabled={sourceType==='batch'} onClick={()=>{if(sourceType!=='batch'){setSourceOpen(x=>!x);setSourceSearch('')}}}><strong>{source?sourceType==='batch'?source.name:`${source.name} · ${sourceType==='pool'?'p':'v'}${source.version}`:'Select a source'}</strong>{sourceType!=='batch'&&<ChevronDown size={15}/>}</button>
        {sourceOpen&&<div className="explorer-select-menu"><div className="search-field"><Search size={14}/><input autoFocus aria-label="Search source" placeholder="Search registered resources" value={sourceSearch} onChange={e=>setSourceSearch(e.target.value)}/></div><div role="listbox" aria-label="Available sources">{sourceList.filter(x=>x.name.toLowerCase().includes(sourceSearch.toLowerCase())).map(x=><button role="option" aria-selected={source?.id===x.id} key={x.id} onClick={()=>{setSourceId(x.id);setSourceOpen(false);resetView()}}><strong>{x.name}</strong><small>{sourceType==='pool'?`Snapshot p${x.version} · ${count(x.eligible)} eligible`:`Version ${x.version} · ${count(x.count)} labeled`}</small></button>)}</div></div>}
      </div>
      <div className="explorer-source-stat"><small>{sourceType==='pool'?'Registered Pool total':sourceType==='batch'?'Immutable batch membership':'Registered Dataset membership'}</small><strong>{count(aggregate.All||0)} samples</strong></div>
    </div>
    <div className="state-tabs-wrap"><div className="state-tabs">{tabs.map(s=><button key={s} className={state===s?'state-tab state-tab--active':'state-tab'} onClick={()=>setState(s)}><span>{s}</span><b>{aggregate[s]!=null?count(aggregate[s]):'N/A'}</b></button>)}</div></div>
    <div className="explorer-toolbar browser-filters explorer-consolidated-filters"><div className="search-field"><Search size={15}/><input aria-label="Search preview samples" placeholder="Find sample ID or source video…" value={query} onChange={e=>setQuery(e.target.value)}/></div><Button icon={SlidersHorizontal} onClick={()=>setFiltersOpen(x=>!x)}>{filtersOpen?'Hide filters':'Filters'}</Button><Button icon={BoxSelect} onClick={()=>setView(v=>v==='grid'?'list':'grid')}>{view==='grid'?'List view':'Grid view'}</Button><Button icon={ScanLine} onClick={()=>setDetections(v=>!v)}>{detections?'Hide boxes':'Show boxes'}</Button></div>
    {filtersOpen&&<div className="explorer-extra-filters"><Field label="Domain"><select value={domain} onChange={e=>setDomain(e.target.value)}>{['All',...new Set(frames.map(f=>f.domain))].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Weather"><select value={weather} onChange={e=>setWeather(e.target.value)}>{['All',...new Set(frames.map(f=>f.weather))].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Quality"><select value={quality} onChange={e=>setQuality(e.target.value)}>{['All',...new Set(frames.map(f=>f.quality))].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Min objects"><input type="number" min="0" value={minObjects} onChange={e=>setMinObjects(e.target.value)}/></Field><Field label="Max uncertainty"><input type="number" min="0" max="1" step=".05" value={maxUncertainty} onChange={e=>setMaxUncertainty(e.target.value)}/></Field><Button onClick={resetView}>Reset filters</Button></div>}
    <div className="section-caption"><span><strong>{visible.length} of {filtered.length} preview samples</strong> · {count(aggregate[state]||0)} registered {sourceType==='batch'?'in batch':state==='All'?'in source':state.toLowerCase()}</span><span title="Mock preview records are not server-verified members">{sourceType==='batch'?'Mock batch-scoped preview · membership API not connected':'Preview gallery · 36 sample records'}</span></div>
    {!!selectedIds.length&&<div className="explorer-bulk-toolbar"><strong>{selectedIds.length} selected previews</strong><Button onClick={exportSelection} icon={Download}>Export metadata</Button><Button disabled title="Requires backend membership and versioned Pool mutation">Exclude / Quarantine</Button><Button disabled title="Requires server-side candidate constraint contract">Send to Mining</Button><Button onClick={()=>setSelectedIds([])}>Clear</Button></div>}
    <div className={view==='grid'?'frame-grid':'frame-list'}>{visible.map((frame,index)=><article className="frame-card browser-frame explorer-frame" key={frame.id}><button type="button" className="frame-card__preview" aria-label={`Inspect ${frame.id}`} onClick={()=>{setActive(frame);setInspectorTab('overview')}}><SampleMedia sample={frame}/>{detections&&frame.state!=='Raw'&&frame.state!=='Excluded'&&<><span className="mock-box mock-box--car">car</span><span className="mock-box mock-box--person">person</span></>}<span className={`sample-state sample-state--${frame.state.toLowerCase()}`}>{reviewMode?(reviewDecisions[frame.id]||'Pending review'):normalizedState(frame.state)}</span></button><label className="explorer-select-checkbox" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={checked(frame.id)} onChange={e=>pick(frame,index,e.nativeEvent?.shiftKey||false)} aria-label={`Select ${frame.id}`}/></label><div className="frame-card__meta"><strong>{frame.id}</strong><span>{frame.domain}</span></div><div className="frame-card__foot"><span>{frame.weather} · {frame.objects} objects</span><span>{frame.video}</span></div></article>)}</div>
    <div ref={loadingSentinel} className="explorer-load-status">{pageError?<Button onClick={fetchNext}>Retry loading</Button>:loading?'Loading…':cursor!==null?<Button onClick={fetchNext}>Load more</Button>:`${visible.length} samples shown`}</div>
    {!filtered.length&&<Empty title="No preview samples match" detail="Change filters to see more samples."/>}
    {active&&<Modal sheet title={`Sample · ${active.id}`} onClose={()=>setActive(null)} footer={<>{}<Button icon={Download} onClick={()=>{downloadJSON(`${active.id}.metadata.json`,{schemaVersion:'roadsift.sample.v1',sample:active,reviewDecision:reviewDecisions[active.id]||null,fixtureOnly:true});notify('Sample preview metadata exported')}}>Export metadata</Button></>}><div className="inspector-scene inspector-scene--large"><SampleMedia sample={active} large/>{detections&&active.state!=='Raw'&&active.state!=='Excluded'&&<><span className="mock-box mock-box--car">car · 0.91</span><span className="mock-box mock-box--person">person · 0.78</span></>}</div><div className="inspector-title"><div><h3>{active.id}</h3><p>{active.video} · {active.time}</p></div><Badge>{normalizedState(active.state)}</Badge></div><div className="inspector-tabs">{['overview','provenance','quality','predictions','acquisition','annotation'].map(t=><button key={t} className={inspectorTab===t?'active':''} onClick={()=>setInspectorTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div><div className="inspector-tab-body">{inspectorTab==='overview'&&<div className="detail-stats"><StatRow label="Context" value={source?.name}/><StatRow label="State" value={normalizedState(active.state)}/><StatRow label="Domain" value={active.domain}/><StatRow label="Weather" value={active.weather}/><StatRow label="Objects" value={active.objects}/></div>}{inspectorTab==='provenance'&&<div className="detail-stats"><StatRow label="Sample ID" value={active.id}/><StatRow label="Video" value={active.video}/><StatRow label="Timestamp" value={active.time}/><StatRow label="Verified source membership" value={sourceType==='batch'?'Mock only · backend membership API required':'Unavailable'}/>{sourceType==='batch'&&<><StatRow label="Selection Batch" value={batchContext?.id}/><StatRow label="Membership hash" value={batchContext?.membershipHash||'—'}/></>}</div>}{inspectorTab==='quality'&&<div className="detail-stats"><StatRow label="Quality" value={active.quality}/><StatRow label="Blur" value={active.blur.toFixed(2)}/><StatRow label="Brightness" value={active.brightness.toFixed(2)}/></div>}{inspectorTab==='predictions'&&<div className="detail-stats"><StatRow label="Predictions" value="Detection preview"/><StatRow label="Object count" value={active.objects}/></div>}{inspectorTab==='acquisition'&&<div className="score-bars"><ScoreBar label="Uncertainty" value={active.uncertainty}/><ScoreBar label="Safety" value={active.safety}/><ScoreBar label="Diversity" value={active.diversity}/><ScoreBar label="Redundancy" value={active.redundancy}/></div>}{inspectorTab==='annotation'&&<div className="detail-stats"><StatRow label="Lifecycle state" value={normalizedState(active.state)}/><StatRow label="Annotation reference" value="Not available"/>{reviewMode&&<><StatRow label="Review decision" value={reviewDecisions[active.id]||'Pending'}/><StatRow label="Privacy preview" value="Anonymized derivative · mock verified"/></>}</div>}</div></Modal>}
  </div>;
}

export function ImportData({notify,navigate,pools,contextDataset}) {
  const [adapter,setAdapter]=useState('local');
  const [storageUri,setStorageUri]=useState('');
  const [manifestFormat,setManifestFormat]=useState('Parquet');
  const [mediaKind,setMediaKind]=useState('video');
  const [files,setFiles]=useState([]);
  const [fileError,setFileError]=useState('');
  const [destination,setDestination]=useState('existing');
  const [poolId,setPoolId]=useState(contextDataset?.kind==='pool'&&pools.some(p=>p.id===contextDataset.id)?contextDataset.id:pools[0]?.id||'');
  const [poolName,setPoolName]=useState('');
  const [fps,setFps]=useState(importSimulation.defaultFps);
  const [validation,setValidation]=useState(false);
  const [draftSubmitted,setDraftSubmitted]=useState(false);
  const picker=useRef(null);
  const worker=importSimulation.workerPolicy;
  const currentPool=pools.find(p=>p.id===poolId);
  const uriOk=/^(r2|s3):\/\/[^\s/]+\/.+/i.test(storageUri.trim());
  const extensionOk=adapter!=='manifest'||/\.(csv|jsonl|parquet)$/i.test(storageUri.trim());
  const filesOk=files.length>0&&files.every(f=>mediaKind==='video'?f.type.startsWith('video/')||/\.(mp4|mov|mkv|webm)$/i.test(f.name):f.type.startsWith('image/')||/\.(jpe?g|png|webp)$/i.test(f.name));
  const sourceOk=adapter==='local'?filesOk:uriOk&&extensionOk;
  const destinationOk=destination==='existing'?!!currentPool:poolName.trim().length>=2;
  const isVideo=adapter!=='manifest'&&mediaKind==='video';
  const markEdited=()=>{setValidation(false);setDraftSubmitted(false)};
  const chooseFiles=list=>{
    const picked=Array.from(list||[]);
    const valid=picked.filter(f=>mediaKind==='video'?f.type.startsWith('video/')||/\.(mp4|mov|mkv|webm)$/i.test(f.name):f.type.startsWith('image/')||/\.(jpe?g|png|webp)$/i.test(f.name));
    setFiles(old=>[...old,...valid.filter(f=>!old.some(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified))]);
    setFileError(picked.length!==valid.length?`${picked.length-valid.length} unsupported file(s) skipped`:'');
    markEdited();
  };
  const configure=(setter,value)=>{setter(value);markEdited()};
  const check=()=>{
    if(!sourceOk||!destinationOk){setValidation(false);notify('Complete the source and Pool destination');return;}
    setValidation(true);notify('Draft validated locally · storage access not checked');
  };
  const spec={
    schemaVersion:'roadsift.ingest-job.v1',
    operation:isVideo?'process-raw-media':'register-existing-frames',
    sampleUnit:'frame',
    source:{adapter,kind:adapter==='manifest'?'frames':mediaKind,
      ...(adapter==='local'?{localFiles:files.map(f=>({name:f.name,sizeBytes:f.size,mimeType:f.type}))}:{uri:storageUri.trim()}),
      ...(adapter==='manifest'?{manifestFormat}: {})},
    processing:{extractFrames:isVideo, ...(isVideo?{fps:Number(fps)}:{}),qualityChecks:worker.qualityChecks,deduplication:worker.deduplication,metadataIndex:worker.metadataIndex},
    destination:destination==='existing'?{mode:'append',poolId:currentPool?.id||null,parentSnapshotId:currentPool?.snapshot||null}:{mode:'create',poolName:poolName.trim()},
    output:{sampleUnit:'frame',publishNewImmutableSnapshot:true}
  };
  const submit=()=>{
    if(!validation||!sourceOk||!destinationOk)return;
    setDraftSubmitted(true);
    downloadJSON('roadsift-ingest-job.json',spec);
    notify('Job specification downloaded · submit to API after staging and source verification');
  };
  const storageCheck=adapter==='local'?'Local files selected · not staged to R2':'Source URI entered · access not verified';
  return <div className="page ingest-simple">
    <PageHeader eyebrow="Data operations" title="Import data" description="Add videos or images to a Candidate Pool." actions={<Button icon={Database} onClick={()=>navigate('pools')}>Pool registry</Button>}/>
    <div className="ingest-single-column ingest-workflow">
      <Panel title="1. Where is your data?" description="Choose a source and the type of media to import.">
        <div className="ingest-source-cards" role="group" aria-label="Data source">
          {[['local','Upload files','Media on your computer',Upload],['storage','Cloud storage','R2 / S3 bucket or prefix',Cloud],['manifest','Import manifest','Advanced · CSV / JSONL / Parquet',FileText]].map(([id,label,description,Icon])=>
            <button type="button" key={id} aria-pressed={adapter===id} className={adapter===id?'ingest-source-card active':'ingest-source-card'} onClick={()=>{setAdapter(id);setFiles([]);setStorageUri('');setFileError('');markEdited()}}>
              <Icon size={19} strokeWidth={1.7}/><strong>{label}</strong><span>{description}</span>
            </button>)}
        </div>
        {adapter!=='manifest'&&<div className="ingest-inline-choice ingest-media-kind"><span>What are you importing?</span><div className="segmented compact" role="group" aria-label="Media type">
          <button aria-pressed={mediaKind==='video'} className={mediaKind==='video'?'active':''} onClick={()=>{configure(setMediaKind,'video');setFiles([]);setFileError('')}}>Videos</button>
          <button aria-pressed={mediaKind==='images'} className={mediaKind==='images'?'active':''} onClick={()=>{configure(setMediaKind,'images');setFiles([]);setFileError('')}}>Images / frames</button>
        </div></div>}
        {adapter==='local'?<div className="ingest-file-manager">
          <input ref={picker} type="file" className="sr-only" multiple accept={mediaKind==='video'?'video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm':'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'} onChange={e=>{chooseFiles(e.target.files);e.target.value=''}}/>
          <button type="button" className="ingest-dropzone-new" onClick={()=>picker.current?.click()}><Upload size={20}/><strong>Choose {mediaKind==='video'?'videos':'images'}</strong><span>{mediaKind==='video'?'MP4 · MOV · MKV · WebM':'JPG · PNG · WebP'}</span></button>
          {fileError&&<p className="mining-inline-error" role="alert">{fileError}</p>}
          {!!files.length&&<><p className="ingest-file-count">{files.length} {files.length===1?'file':'files'} selected · Not uploaded</p><div className="ingest-files">{files.map((file,i)=><div key={`${file.name}-${i}`}><FileText size={16}/><span title={file.name}>{file.name}</span><small>{(file.size/1024/1024).toFixed(1)} MB</small><button type="button" aria-label={`Remove ${file.name}`} onClick={()=>{setFiles(old=>old.filter((_,j)=>i!==j));markEdited()}}><X size={14}/></button></div>)}</div></>}
          <p className="ingest-disclaimer">Files are selected locally, not uploaded. Production requires R2 staging.</p>
        </div>:<div className="ingest-source-fields">
          <Field label={adapter==='manifest'?'Frame manifest URI *':'Storage prefix *'}><input value={storageUri} onChange={e=>configure(setStorageUri,e.target.value)} placeholder={adapter==='manifest'?'r2://fleet/manifests/frames.parquet':mediaKind==='video'?'r2://fleet/raw/videos/':'r2://fleet/frames/oct-07/'}/></Field>
          {adapter==='manifest'&&<Field label="Format"><select value={manifestFormat} onChange={e=>configure(setManifestFormat,e.target.value)}>{importSimulation.manifestFormats.map(format=><option key={format}>{format}</option>)}</select></Field>}
          {storageUri.trim()&&!sourceOk&&<p className="mining-inline-error" role="alert">Enter a valid R2/S3 {adapter==='manifest'?'manifest URI (.csv, .jsonl or .parquet)':'prefix'}.</p>}
          {adapter==='manifest'&&<p className="ingest-disclaimer">References existing frames; no video extraction needed.</p>}
        </div>}
      </Panel>
      <Panel title="2. Add to Pool">
        <div className="ingest-inline-choice"><span>Candidate Pool</span><div className="segmented compact"><button className={destination==='existing'?'active':''} onClick={()=>configure(setDestination,'existing')}>Existing Pool</button><button className={destination==='new'?'active':''} onClick={()=>configure(setDestination,'new')}>New Pool</button></div></div>
        {destination==='existing'?<Field label="Select Pool"><select value={poolId} onChange={e=>configure(setPoolId,e.target.value)}>{pools.map(pool=><option key={pool.id} value={pool.id}>{pool.name} · p{pool.version}</option>)}</select></Field>:<Field label="New Pool name"><input value={poolName} onChange={e=>configure(setPoolName,e.target.value)} placeholder="Northern Fleet Pool"/></Field>}
        <div className="ingest-destination-note"><Database size={16}/><span>{destination==='existing'&&currentPool?`Worker publishes ${currentPool.slug}:p${currentPool.version+1} after validation`:'Worker publishes the first Pool Snapshot (p1) after validation'}</span></div>
      </Panel>
      <details className="panel mining-accordion"><summary className="mining-accordion__summary"><strong>Processing options</strong><small>{isVideo?`Extract at ${fps} FPS · `:''}Quality · Dedup</small></summary>
        <div className="panel__body">{isVideo&&<Field label="Frame extraction rate"><select value={fps} onChange={e=>configure(setFps,e.target.value)}>{importSimulation.fpsOptions.map(rate=><option key={rate} value={rate}>{rate} FPS</option>)}</select></Field>}
          <div className="worker-policy-list">{[['Quality checks',worker.qualityChecks],['Deduplication',worker.deduplication],['Metadata indexing',worker.metadataIndex]].map(([name,enabled])=><div key={name}><Check size={14}/><span>{name}</span><strong>{enabled?'On':'Off'}</strong></div>)}</div>
        </div>
      </details>
      <Panel title="3. What will happen">
        <div className="ingest-output-steps"><div><FileText size={16}/><strong>{isVideo?`Extract frames · ${fps} FPS`:adapter==='manifest'?'Register frame references':'Validate images'}</strong></div><ArrowRight size={14}/><div><Database size={16}/><strong>{destination==='existing'&&currentPool?`${currentPool.slug}:p${currentPool.version+1}`:'New Pool · p1'}</strong></div></div>
        <p className="ingest-disclaimer">Raw videos remain Source Assets. Only frame samples become Pool members. A new snapshot is published after worker success.</p>
      </Panel>
      <details className="panel mining-accordion"><summary className="mining-accordion__summary"><strong>Job specification</strong><small>JSON · read-only</small></summary><div className="panel__body"><Button icon={Download} onClick={()=>downloadJSON('roadsift-ingest-job.json',spec)}>Download JSON</Button><pre className="mining-code-block"><code>{JSON.stringify(spec,null,2)}</code></pre></div></details>
      <div className="ingest-action-bar"><div><strong>{!sourceOk?'Source required':!destinationOk?'Destination required':validation?'Configuration ready':'Review inputs'}</strong><span>{validation?storageCheck:adapter==='local'?'Select supported files':'Provide the existing storage reference'}</span>{draftSubmitted&&<span>Specification downloaded; no remote job has started.</span>}</div><div><Button onClick={check} disabled={!sourceOk||!destinationOk}>Check configuration</Button><Button icon={Download} variant="primary" disabled={!validation||!sourceOk||!destinationOk} onClick={submit}>Export job spec</Button></div></div>
    </div>
  </div>;
}

export function Mining({ notify, setRuns, runs, navigate, routePath, definitions, datasets, pools, contextDataset, runnerRegistry, modelRegistryState, algorithmRegistry }) {
  const routeDefinitionId = new URLSearchParams((routePath || '').split('?')[1] || '').get('definition');
  const availableDefinitions=(definitions||[]).filter(d=>d.status==='published');
  const [definitionId,setDefinitionId]=useState(routeDefinitionId||'al-selection-v1');
  const launchDefinition=availableDefinitions.find(d=>d.id===definitionId)||availableDefinitions.find(d=>d.id==='al-selection-v1')||availableDefinitions[0];
  const getImplementation=type=>launchDefinition?.stages?.find(s=>s.enabled!==false&&s.type===type)?.implementation||null;
  const definitionSelectionImplementation=getImplementation('selection');
  const canExecuteDefinition=launchDefinition?.id==='al-selection-v1'&&definitionSelectionImplementation==='hybrid';
  const [configMode,setConfigMode]=useState('form');
  const [jsonDraft,setJsonDraft]=useState('');
  const [jsonIssue,setJsonIssue]=useState('');
  useEffect(()=>{if(routeDefinitionId&&availableDefinitions.some(d=>d.id===routeDefinitionId))setDefinitionId(routeDefinitionId)},[routeDefinitionId]);

  const [poolId,setPoolId]=useState(contextDataset?.kind==='pool'&&pools.some(p=>p.id===contextDataset.id)?contextDataset.id:pools[0]?.id||'');
  const [parentId,setParentId]=useState('');
  const algorithmId=definitionSelectionImplementation||miningConfig.defaultStrategyId;
  const [budget,setBudget]=useState(String(miningConfig.defaultBudget));
  const [modelId,setModelId]=useState(miningConfig.defaultModelId||'');
  const [runnerId,setRunnerId]=useState('auto');
  // Implementation choices belong to the immutable published definition.
  // This demo adapter maps high-level stage implementations onto its known worker plugins.
  const dedupId=getImplementation('dedup')==='none'?'none':miningPlugins.defaults.dedup;
  const embeddingId=getImplementation('embedding')||miningPlugins.defaults.embedding;
  const uncertaintyId=getImplementation('uncertainty')||miningPlugins.defaults.uncertainty;
  const diversityId=getImplementation('diversity')==='facility-location'?'facility':'kcenter';
  const [submittedId,setSubmittedId]=useState(null);
  const privacyModelId='model_privacy_demo_v1';
  const privacyMethod='gaussian-blur';
  const privacyScope='faces-plates';
  const [previewFormat,setPreviewFormat]=useState('python');
  const pool=pools.find(p=>p.id===poolId);
  const parent=datasets.find(d=>d.id===parentId);
  const algorithm=algorithmRegistry.find(s=>s.id===algorithmId);
  const dedup=miningPlugins.dedup.find(p=>p.id===dedupId);
  const embedding=miningPlugins.embedding.find(p=>p.id===embeddingId);
  const uncertainty=miningPlugins.uncertainty.find(p=>p.id===uncertaintyId);
  const diversity=miningPlugins.diversity.find(p=>p.id===diversityId);
  const needsPredictions=Boolean(algorithm?.requiresPredictionModel);
  const needsEmbeddings=Boolean(algorithm?.requiresEmbedding||dedup?.requiresEmbedding);
  const needsUncertainty=algorithmId==='entropy'||algorithmId==='hybrid';
  const needsDiversity=algorithmId==='diversity'||algorithmId==='hybrid';
  const model=modelRegistryState.find(m=>m.id===modelId);
  const validModel=Boolean(model&&model.status==='Registered'&&model.capabilities?.includes('predictions')&&model.artifactUri);
  const candidateModels=modelRegistryState.filter(m=>m.status==='Registered'&&m.capabilities?.includes('predictions'));
  const privacyModels=modelRegistryState.filter(m=>m.status==='Registered'&&m.capabilities?.includes('privacy')&&m.artifactUri);
  const privacyModel=privacyModels.find(m=>m.id===privacyModelId);
  const validPrivacyModel=Boolean(privacyModel&&privacyModel.artifactUri&&privacyModel.version);
  const n=Number(budget);
  const validBudget=budget.trim()!==''&&Number.isSafeInteger(n)&&n>0&&n<=(pool?.eligible||0);
  const assignedJobs=runs.filter(r=>r.type==='Mining'&&['Queued','Running','Validating'].includes(r.status));
  const isRunnerReady=r=>{
    if(!r||r.status!=='Ready'||r.verified===false||!r.lastHeartbeatAt)return false;
    const time=Date.parse(r.lastHeartbeatAt);
    if(!Number.isFinite(time))return false;
    return r.fixture===true;
  };
  const supported=r=>Boolean(r?.allowedStrategyIds?.includes(algorithmId)&&(!needsPredictions||r.capabilities?.includes('predictions'))&&(!needsEmbeddings||r.capabilities?.includes('embedding')));
  const compatible=runnerRegistry.filter(r=>isRunnerReady(r)&&supported(r));
  const activeCount=r=>assignedJobs.filter(job=>job.runnerId===r.id).length;
  const freeSlots=r=>Math.max(0,(r.maxConcurrent||1)-activeCount(r));
  const resolvedRunner=runnerId==='auto'?compatible.find(r=>freeSlots(r)>0):runnerRegistry.find(r=>r.id===runnerId);
  const runnerValid=Boolean(resolvedRunner&&compatible.some(r=>r.id===resolvedRunner.id)&&freeSlots(resolvedRunner)>0);
  const checks=[
    {label:'Choose a registered Pool Snapshot with a manifest',ok:Boolean(pool?.snapshot&&pool?.manifestUri),where:'Data source'},
    {label:'Requested sample count must fit the Pool (EXACT-N)',ok:validBudget,where:'Selection pipeline'},
    {label:'Definition strategy is compatible with the installed worker adapter',ok:Boolean(canExecuteDefinition&&algorithm&&algorithm.enabled!==false&&algorithm.version),where:'Selection pipeline'},
    {label:'Configure the required pipeline components',ok:Boolean(dedup&&(!needsEmbeddings||embedding)&&(!needsUncertainty||uncertainty)&&(!needsDiversity||diversity)),where:'Selection pipeline'},
    {label:'Select a registered prediction model',ok:!needsPredictions||validModel,where:'Prediction model'},
    {label:'Select a registered privacy detection model',ok:validPrivacyModel,where:'Privacy Anonymization'},
    {label:'Configure privacy anonymization',ok:Boolean(privacyMethod&&privacyScope),where:'Privacy Anonymization'},
    {label:'Assign a compatible runner with available capacity',ok:runnerValid,where:'Execution'}
  ];
  const ready=checks.every(x=>x.ok)&&canExecuteDefinition;
  const weights=algorithm?.weights||{};
  const plugin=p=>p?{id:p.id,version:p.version}:null;
  const stages=[
    {step:'eligibility',plugin:{id:'pool-eligibility',version:'1.0.0'},enabled:true},
    {step:'deduplication',plugin:plugin(dedup),enabled:dedupId!=='none'},
    {step:'prediction',plugin:needsPredictions?{id:'registered-detector',version:model?.version||null}:null,enabled:needsPredictions},
    {step:'embedding',plugin:needsEmbeddings?plugin(embedding):null,enabled:needsEmbeddings},
    {step:'uncertainty',plugin:needsUncertainty?plugin(uncertainty):null,enabled:needsUncertainty},
    {step:'diversity',plugin:needsDiversity?plugin(diversity):null,enabled:needsDiversity},
    {step:'selection',plugin:plugin(algorithm),enabled:true},
    {step:'privacy',plugin:{id:'privacy-anonymization',version:'1.0.0'},enabled:true,modelRef:privacyModel?{id:privacyModel.id,version:privacyModel.version}:null}
  ];
  const contract={
    schemaVersion:miningConfig.contractSchema,
    source:{poolId:pool?.id||null,snapshotId:pool?.snapshot||null,manifestUri:pool?.manifestUri||null,
      parentDatasetVersionId:parent?.id||null},
    pipeline:{steps:stages,budget:n,exactN:true,
      scoringWeights:algorithmId==='hybrid'?weights:null,
      modelRef:needsPredictions?{id:model?.id||null,version:model?.version||null,artifactUri:model?.artifactUri||null}:null,
      privacy:{required:true,detectorRef:privacyModel?{id:privacyModel.id,version:privacyModel.version,artifactUri:privacyModel.artifactUri}:null,
        targets:privacyScope==='faces-plates-persons'?['face','license_plate','person']:['face','license_plate'],
        scope:privacyScope,method:privacyMethod,verification:'fail-closed',onFailure:'block-export',preserveRaw:true}},
    execution:{assignment:runnerId==='auto'?'auto':'manual',runnerId:resolvedRunner?.id||null}
  };
  const fingerprint=value=>{
    const json=JSON.stringify(value);let hash=2166136261;
    for(let i=0;i<json.length;i++){hash^=json.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return 'fnv1a-'+(hash>>>0).toString(16).padStart(8,'0');
  };
  const configFingerprint=fingerprint(contract);
  const spec={...contract,configFingerprint};
  const json=JSON.stringify(spec,null,2);
  const jsonConfig={
    definition_id:launchDefinition?.id||null,
    definition_version:launchDefinition?.version||null,
    input:{pool_id:poolId,parent_dataset_version_id:parentId||null},
    overrides:{target_samples:n,model_id:needsPredictions?modelId:null},
    execution:{runner_id:runnerId},
    inherited:{selection_strategy:algorithmId,stages:(launchDefinition?.stages||[]).filter(x=>x.enabled!==false).map(x=>({id:x.id,implementation:x.implementation,params:x.params||{}}))}
  };
  const effectiveJSON=JSON.stringify(jsonConfig,null,2);
  const openJSON=()=>{setJsonDraft(effectiveJSON);setJsonIssue('');setConfigMode('json')};
  const applyJSON=()=>{
    try {
      const parsed=JSON.parse(jsonDraft);
      if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error('Expected a run configuration object.');
      if(Object.keys(parsed).some(k=>!['definition_id','definition_version','input','overrides','execution','inherited'].includes(k)))
        throw Error('Unknown top-level configuration fields.');
      if(parsed.definition_id!==launchDefinition?.id||parsed.definition_version!==launchDefinition?.version)
        throw Error('Definition ID and version are immutable.');
      if(JSON.stringify(parsed.inherited)!==JSON.stringify(jsonConfig.inherited))
        throw Error('Inherited stage implementations cannot be changed here. Publish a new pipeline version.');
      const inp=parsed.input||{},ov=parsed.overrides||{},exec=parsed.execution||{};
      if(Object.keys(inp).some(k=>!['pool_id','parent_dataset_version_id'].includes(k)))
        throw Error('Input fields are restricted.');
      if(Object.keys(ov).some(k=>!['target_samples','model_id'].includes(k)))
        throw Error('Only target_samples and model_id are run-overridable.');
      if(Object.keys(exec).some(k=>k!=='runner_id'))throw Error('Execution fields are restricted.');
      if(!pools.some(p=>p.id===inp.pool_id))throw Error('Unknown candidate pool.');
      if(inp.parent_dataset_version_id&&!datasets.some(d=>d.id===inp.parent_dataset_version_id))
        throw Error('Unknown parent dataset version.');
      if(!Number.isSafeInteger(ov.target_samples)||ov.target_samples<1)
        throw Error('Target samples must be a positive integer.');
      if(ov.model_id!=null&&!candidateModels.some(m=>m.id===ov.model_id))
        throw Error('Unknown or unregistered prediction model.');
      if(!['auto',...runnerRegistry.map(r=>r.id)].includes(exec.runner_id))
        throw Error('Unknown executor.');
      setPoolId(inp.pool_id);setParentId(inp.parent_dataset_version_id||'');
      setBudget(String(ov.target_samples));
      if(ov.model_id)setModelId(ov.model_id);
      setRunnerId(exec.runner_id);
      setJsonIssue('');setConfigMode('form');notify('Permitted run overrides applied');
    }catch(error){setJsonIssue(error.message);}
  };
  const pythonPreview=selectionRunnerSource;
  const submitted=runs.find(r=>r.id===submittedId);
  const submit=()=>{
    if(!ready){notify('Resolve preflight issues or choose an executable pipeline');return;}
    const now=new Date().toISOString(),nonce=Date.now().toString(36);
    const id=`mine_${now.replace(/[-:T]/g,'').slice(0,12)}_${nonce.slice(-5)}`;
    const batchId=`batch_${pool.slug.replace(/-/g,'_')}_${nonce.slice(-6)}`;
    const batchName=`${pool.name} · ${algorithm.name} · ${count(n)} samples`;
    const plannedBatch={id:batchId,name:batchName,status:'In review',strategy:algorithm.name,
      algorithmId:algorithm.id,sourcePoolId:pool.id,sourceSnapshot:pool.snapshot,
      baseDatasetId:parent?.id||null,registeredModelId:needsPredictions?model.id:null,
      runId:id,count:n,schemaVersion:'roadsift.selection-batch.v1',
      manifestUri:`r2://roadsift/batches/${batchId}/manifest.parquet`,
      membershipHash:`simulated:${fingerprint({batchId,runId:id,count:n})}`,
      owner:'Perception Data Ops',createdBy:'mock-worker',
      review:{reviewed:0,approved:0,rejected:0,deferred:0,finalizedAt:null},
      handoff:{status:'Not started',destination:null,sentAt:null,manifestUri:null},
      annotationReturn:{status:'Not started',expected:0,returned:0,validation:null,uri:null,receivedAt:null}};
    const record={id,type:'Mining',pipelineDefinitionId:launchDefinition?.id || null,pipelineDefinitionVersion:launchDefinition?.version || null,pipelineDefinitionSnapshot:launchDefinition ? JSON.parse(JSON.stringify(launchDefinition)) : null,name:`${algorithm.name} · ${pool.name}`,status:'Queued',
      executionMode:'mock-worker',source:`${pool.name} p${pool.version}`,
      sourcePoolId:pool.id,dataset:parent?`${parent.name} v${parent.version}`:'None',
      output:'Pending worker execution',plannedBatch,frames:pool.eligible,
      selected:0,budget:n,executor:resolvedRunner.name,runnerId:resolvedRunner.id,
      duration:'—',date:now,updatedAt:now,owner:'Perception Data Ops',
      createdBy:'mining-orchestrator',attempt:1,retryable:true,simulateFailure:false,
      contract:spec,configFingerprint,outputBatchId:null};
    setRuns(old=>[record,...old]);setSubmittedId(id);
    notify('Selection run queued · local worker will process it');
    navigate('/runs/'+encodeURIComponent(id));
  };
  const copySpec=async()=>{
    try{
      if(!navigator.clipboard?.writeText){notify('Clipboard unavailable. Use Download JSON instead.');return;}
      await navigator.clipboard.writeText(json);notify('Job specification copied');
    }catch{notify('Clipboard permission unavailable. Use Download JSON instead.');}
  };
  return <div className="page lp-page">
    <div className="lp-header"><div><div className="lp-eyebrow">PIPELINES / LAUNCHPAD</div><h1>Launch Pipeline Run</h1><p>Set inputs and run-level overrides without changing the published definition.</p></div><Button icon={HistoryIcon} onClick={()=>navigate('history')}>View Runs</Button></div>
    <section className="lp-definition"><div className="lp-def-icon"><GitBranch size={19}/></div><div className="lp-def-main">
      <label htmlFor="lp-definition">Pipeline Definition</label>
      <select id="lp-definition" value={launchDefinition?.id||''} onChange={e=>{setDefinitionId(e.target.value);setConfigMode('form');}}>
        {availableDefinitions.map(d=><option key={d.id} value={d.id}>{d.name} · v{d.version}</option>)}
      </select>
      <span>Published v{launchDefinition?.version||'—'} · {launchDefinition?.stages?.filter(x=>x.enabled).length||0} stages · Run settings do not mutate the definition</span>
    </div><Button onClick={()=>navigate('pipelines/'+(launchDefinition?.id||'al-selection-v1'))}>View definition</Button></section>
    <div className="lp-builder">
      <div className="lp-main">
        {!canExecuteDefinition&&<div className="lp-warning"><CircleAlert size={18}/><div><strong>Execution adapter unavailable</strong><p>You can inspect this definition's inputs and parameters, but this preview only simulates the published Hybrid Active Learning Selection v1 adapter. No unsupported workflow will be launched.</p></div></div>}
        <div className="lp-mode-row"><h2>Run Configuration</h2><div role="tablist" aria-label="Configuration mode" className="lp-mode">
          <button role="tab" aria-selected={configMode==='form'} className={configMode==='form'?'active':''} onClick={()=>setConfigMode('form')}>Form</button>
          <button role="tab" aria-selected={configMode==='json'} className={configMode==='json'?'active':''} onClick={openJSON}>JSON</button>
        </div></div>
        {configMode==='json'?<section className="lp-panel"><header><FileText size={17}/><h3>Advanced Run Configuration</h3></header>
          <p className="lp-help">Edit inputs and permitted overrides. Configuration is validated before applying. Editing JSON does not modify the pipeline definition.</p>
          <textarea className="lp-json-editor" spellCheck={false} aria-label="JSON Run Configuration" value={jsonDraft} onChange={e=>setJsonDraft(e.target.value)} />
          {jsonIssue&&<p className="lp-json-error"><X size={15}/>{jsonIssue}</p>}
          <div className="lp-json-buttons"><Button onClick={()=>{setJsonDraft(effectiveJSON);setJsonIssue('')}}>Reset</Button><Button variant="primary" onClick={applyJSON}>Apply configuration</Button></div>
        </section>:<>
          <section className="lp-panel"><header><Database size={18}/><h3>1. Inputs</h3><small>Choose immutable source versions</small></header>
            <div className="lp-panel-body">
              <div className="lp-input-group"><label htmlFor="lp-pool">Candidate Pool Snapshot *</label><select id="lp-pool" value={poolId} onChange={e=>setPoolId(e.target.value)}>{pools.map(p=><option key={p.id} value={p.id}>{p.name} · p{p.version} · {count(p.eligible)} eligible</option>)}</select></div>
              <div className="lp-input-group"><label htmlFor="lp-parent">Parent Dataset Version · Optional</label><select id="lp-parent" value={parentId} onChange={e=>setParentId(e.target.value)}><option value="">None · independent selection</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.name} · v{d.version}</option>)}</select></div>
              <div className="lp-inline-meta"><span>Snapshot: <strong>{pool?.snapshot||'Missing'}</strong></span><span>Eligible: <strong>{count(pool?.eligible||0)}</strong></span></div>
            </div>
          </section>
          <section className="lp-panel"><header><SlidersHorizontal size={18}/><h3>2. Run Parameters &amp; Overrides</h3><small>Published defaults are immutable</small></header>
            <div className="lp-panel-body">
              {canExecuteDefinition&&<>
                <div className="lp-input-row">
                  <div className="lp-input-group"><label>Selection Strategy · Inherited</label><div className="lp-locked-field"><strong>{algorithm?.name||algorithmId}</strong><span>Locked</span></div></div>
                  <div className="lp-input-group"><label htmlFor="lp-budget">Target Samples · EXACT-N *</label><input id="lp-budget" type="number" min="1" step="1" value={budget} onChange={e=>setBudget(e.target.value)}/></div>
                </div>
                {needsPredictions&&<div className="lp-input-group"><label htmlFor="lp-model">Prediction Model · Run Input</label><select id="lp-model" value={modelId} onChange={e=>setModelId(e.target.value)}><option value="">Choose registered model</option>{candidateModels.map(m=><option key={m.id} value={m.id}>{m.name} · {m.version}</option>)}</select></div>}
                <p className="lp-help">Target budget and registered prediction model can vary per run. Strategy and implementation are fixed by this published definition.</p>
              </>}
              <details className="lp-advanced"><summary>Definition stage configuration <span>Read-only <ChevronDown size={15}/></span></summary>
                <div className="lp-definition-stages">
                  {(launchDefinition?.stages||[]).filter(stage=>stage.enabled!==false).map(stage=><div key={stage.id}>
                    <div><strong>{stage.label}</strong><small>{stage.type}</small></div>
                    <div className="lp-inherited-value"><strong>{stage.implementation}</strong><span>Inherited</span></div>
                    {!!Object.keys(stage.params||{}).length&&<pre className="lp-inherited-json">{JSON.stringify(stage.params,null,2)}</pre>}
                  </div>)}
                </div>
                <p className="lp-help">To change an algorithm, dependency or stage parameter, edit the Pipeline Definition and publish a new version. Advanced JSON also enforces this lock.</p>
              </details>
              <div className="lp-inline-meta"><span>Privacy Gate: <strong>Required · fail closed</strong></span><span>Effective strategy: <strong>{algorithmId}</strong></span></div>
              {!canExecuteDefinition&&<p className="lp-help">This definition does not have a compatible simulated worker adapter. Its settings are read-only in Launchpad.</p>}
            </div>
          </section>
          <section className="lp-panel"><header><Cpu size={18}/><h3>3. Execution</h3><small>Choose a compatible executor</small></header><div className="lp-panel-body">
            <div className="lp-input-group"><label htmlFor="lp-runner">Executor</label><select id="lp-runner" value={runnerId} onChange={e=>setRunnerId(e.target.value)}><option value="auto">Automatic · recommended</option>{runnerRegistry.map(r=><option key={r.id} value={r.id}>{r.name} · {r.status}</option>)}</select></div>
            <div className="lp-inline-meta"><span>Assigned runner: <strong>{resolvedRunner?.name||'Unavailable'}</strong></span><span>Free slots: <strong>{resolvedRunner?freeSlots(resolvedRunner):0}</strong></span></div>
            <p className="lp-help">Executor compatibility checks use the local registry. No remote GPU job is submitted from this preview.</p>
          </div></section>
        </>}
      </div>
      <aside className="lp-summary"><div className="lp-summary-card"><header><h3>Run Summary</h3><small>Effective selection request</small></header>
        <div className="lp-summary-fields"><div><span>Definition</span><strong>{launchDefinition?.name||'—'} · v{launchDefinition?.version||'—'}</strong></div>
          <div><span>Input</span><strong>{pool?.name||'Not selected'}</strong></div>
          <div><span>Strategy</span><strong>{canExecuteDefinition?algorithm?.name||'Not selected':'Definition-specific'}</strong></div>
          <div><span>Target samples</span><strong>{validBudget?count(n):'Invalid'}</strong></div>
          <div><span>Prediction model</span><strong>{needsPredictions?model?.name||'Missing':'Not needed'}</strong></div>
          <div><span>Executor</span><strong>{resolvedRunner?.name||'Unavailable'}</strong></div>
          <div><span>Run overrides</span><strong>{(budget!==String(miningConfig.defaultBudget)?1:0)+(modelId!==miningConfig.defaultModelId?1:0)} modified</strong></div>
        </div>
        <div className="lp-preflight"><strong>{canExecuteDefinition?(ready?'Local preflight passed':checks.filter(x=>!x.ok).length+' issues to resolve'):'No executor for this definition'}</strong>
          {canExecuteDefinition&&checks.filter(x=>!x.ok).map(c=><div key={c.label}><CircleAlert size={13}/>{c.label}</div>)}
          {ready&&<p>Validated against mock registry only. No backend preflight was performed.</p>}
        </div>
        <Button icon={Play} variant="primary" className="lp-launch-button" disabled={!ready} onClick={submit}>Launch Run <ArrowRight size={15}/></Button>
        <p className="lp-note">Launch creates a simulated local run, then opens its Run Details page.</p>
      </div></aside>
    </div>
  </div>;
}

export function SelectionBatches({ selectionBatches, setSelectionBatches, datasets, pools, navigate, notify, routePath }) {
  const requestedBatch=new URLSearchParams((routePath||'').split('?')[1]||'').get('batch');
  const [query,setQuery]=useState(''), [status,setStatus]=useState('All'),
    [selected,setSelected]=useState(()=>selectionBatches.find(b=>b.id===requestedBatch)||null);
  useEffect(()=>{if(requestedBatch)setSelected(selectionBatches.find(b=>b.id===requestedBatch)||null)},[requestedBatch]);
  const statuses=['All',...batchLifecycle.map(x=>x.label)];
  const results=selectionBatches.filter(b=>(status==='All'||b.status===status)&&(`${b.name} ${b.id} ${b.runId}`).toLowerCase().includes(query.toLowerCase()));
  const poolOf=b=>pools.find(p=>p.id===b.sourcePoolId);
  const datasetOf=b=>datasets.find(d=>d.id===b.baseDatasetId);
  const reviewPct=b=>Math.round(((b.review?.reviewed||0)/Math.max(1,b.count))*100);
  return <div className="page batches-page"><PageHeader eyebrow="Curation operations" title="Selection Batches" description="Review, freeze, hand off and reconcile the immutable outputs of Mining runs." actions={<Button icon={Pickaxe} onClick={()=>navigate('mining')}>New mining run</Button>}/>
    <div className="history-toolbar"><div className="search-field"><Search size={16}/><input placeholder="Batch ID, run, dataset…" value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select><Badge>{results.length} batches</Badge></div>
    <section className="catalog"><div className="table-scroll"><table className="dataset-table batches-table"><thead><tr><th>Batch</th><th>Status</th><th>Source</th><th>Base dataset</th><th>Membership</th><th>Review</th><th>Handoff</th><th>Updated</th><th>Workspace</th></tr></thead><tbody>{results.map(b=><tr key={b.id} tabIndex="0" role="button" onClick={()=>setSelected(b)}><td><div className="dataset-name-cell"><strong>{b.name}</strong><small>{b.id}</small></div></td><td><Badge>{b.status}</Badge></td><td>{poolOf(b)?.name||b.sourcePoolId}</td><td>{datasetOf(b)?.name||b.baseDatasetId}</td><td>{count(b.count)}</td><td><div className="batch-review-cell"><strong>{reviewPct(b)}%</strong><span>{count(b.review?.reviewed||0)} / {count(b.count)}</span></div></td><td>{b.handoff?.status||'Not started'}</td><td>{date(b.updatedAt)}</td><td onClick={e=>e.stopPropagation()}><Button variant="primary" onClick={()=>navigate('/batches/'+encodeURIComponent(b.id)+'?view=grid')}>Open Workspace</Button></td></tr>)}</tbody></table></div></section>
    {selected&&<Modal sheet title="Selection Batch" onClose={()=>setSelected(null)} footer={<>
      <Button icon={Download} onClick={()=>{downloadJSON(selected.id+'.metadata.json',{schemaVersion:selected.schemaVersion,batch:selected});notify('Batch metadata exported')}}>Export metadata</Button>
      <Button variant="primary" icon={ArrowRight} onClick={()=>navigate('/batches/'+encodeURIComponent(selected.id)+'?view=grid')}>Open Workspace</Button>
    </>}>
      <div className="detail-heading"><div className="detail-heading__meta"><Badge>{selected.status}</Badge><code>{selected.id}</code></div><h2>{selected.name}</h2>
        <p>Selection Batch overview. Review, quick-edit drafts, and validation-gated handoff are available in its workspace.</p></div>
      <div className="detail-stats">
        <StatRow label="Mining run" value={selected.runId}/>
        <StatRow label="Source Pool Snapshot" value={selected.sourceSnapshot}/>
        <StatRow label="Membership" value={count(selected.count)}/>
        <StatRow label="Membership hash (recorded)" value={selected.membershipHash||'Not recorded'}/>
        <StatRow label="Reviewed (recorded)" value={count(selected.review?.reviewed||0)}/>
        <StatRow label="Approved (recorded)" value={count(selected.review?.approved||0)}/>
        <StatRow label="Privacy clearance" value="Not validated by this mock"/>
        <StatRow label="Handoff record" value={selected.handoff?.status||'Not started'}/>
      </div>
      <div className="section-actions">
        <Button onClick={()=>navigate('/batches/'+encodeURIComponent(selected.id)+'?view=review')}>Open Focus Review</Button>
        <Button onClick={()=>navigate('/batches/'+encodeURIComponent(selected.id)+'?view=handoff')}>Check Finalize &amp; Handoff</Button>
      </div>
    </Modal>}
  </div>;
}
export function History({runs,setRuns,navigate,notify,routePath,selectionBatches,pools}) {
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('All');
  const [detailTab,setDetailTab]=useState('overview');
  const [selectedId,setSelectedId]=useState(()=>{
    const search=new URLSearchParams(window.location.search);
    return search.get('selected');
  });
  const fullId=routePath?.startsWith('/runs/')?decodeURIComponent(routePath.split('?')[0].slice('/runs/'.length)):null;
  const selected=runs.find(r=>r.id===(fullId||selectedId));
  const full=Boolean(fullId);
  useEffect(()=>{
    if(fullId){setSelectedId(null);return;}
    setSelectedId(new URLSearchParams(window.location.search).get('selected'));
  },[routePath,fullId]);
  useEffect(()=>{
    const sync=()=>setSelectedId(new URLSearchParams(window.location.search).get('selected'));
    window.addEventListener('popstate',sync);
    return()=>window.removeEventListener('popstate',sync);
  },[]);
  const choose=id=>{
    const url=new URL(window.location.href);
    if(id)url.searchParams.set('selected',id);
    else url.searchParams.delete('selected');
    window.history.pushState({},'',url.pathname+url.search);
    setSelectedId(id);
  };
  const retry=run=>{
    if(!run.contract||!run.plannedBatch){notify('No replayable job configuration. Create a new selection run.');return;}
    const now=new Date().toISOString(),id=`mine_retry_${Date.now().toString(36)}`;
    const batchId=`batch_retry_${Date.now().toString(36)}`;
    const attempt={...run,id,status:'Queued',date:now,updatedAt:now,attempt:(run.attempt||1)+1,
      retryOf:run.id,selected:0,output:'Pending worker execution',completedAt:null,
      simulateFailure:false,errorCode:null,errorMessage:null,outputBatchId:null,
      plannedBatch:{...run.plannedBatch,id:batchId,runId:id,
        manifestUri:`r2://roadsift/batches/${batchId}/manifest.parquet`,membershipHash:`simulated:${id}`}};
    setRuns(list=>[attempt,...list]);
    if(full)navigate('/runs/'+encodeURIComponent(id));else choose(id);
    notify('Retry queued');
  };
  const exportRun=run=>{downloadJSON(`${run.id}.json`,{schemaVersion:'roadsift.run.v1',run});notify('Run record exported')};
  const runsFiltered=runs.filter(r=>(filter==='All'||r.type===filter)&&`${r.name} ${r.id} ${r.source} ${r.output}`.toLowerCase().includes(query.toLowerCase()));
  const summary=run=><div className="run-summary-fields">
    <StatRow label="Status" value={run.status}/>
    <StatRow label="Source" value={run.source||'Not registered'}/>
    <StatRow label="Output" value={run.output||'Pending'}/>
    {run.pipelineDefinitionId&&<StatRow label="Definition" value={run.pipelineDefinitionId+" · v"+run.pipelineDefinitionVersion}/>}
    <StatRow label="Runner" value={run.executor||'Not assigned'}/>
    <StatRow label="Started" value={date(run.date)}/>
    {run.duration&&<StatRow label="Duration" value={run.duration}/>}
    {run.type==='Mining'&&<><StatRow label="Target" value={count(run.budget||0)}/><StatRow label="Selected" value={count(run.selected||0)}/></>}
  </div>;
  const failure=run=>run.status==='Failed'&&<div className="registration-error"><X size={16}/><div><strong>{run.errorCode||'Run failed'}</strong><p>{run.errorMessage||'No additional error details recorded.'}</p>{run.retryable&&<Button disabled={!run.contract||!run.plannedBatch} onClick={()=>retry(run)}>Retry run</Button>}</div></div>;
  return <div className="page runs-page">
    {!full&&<><PageHeader eyebrow="Operations" title="Runs" description="Job history and execution status." actions={<Button icon={Plus} onClick={()=>navigate('mining')}>New selection run</Button>}/>
      <div className="history-toolbar"><div className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Find runs" placeholder="Search runs…"/></div><div className="segmented">{[['All','All'],['Import','Ingest'],['Mining','Mining']].map(([key,label])=><button key={key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}</button>)}</div><Badge>{runsFiltered.length} runs</Badge></div>
      <section className="catalog"><div className="table-scroll"><table className="dataset-table runs-table"><thead><tr><th>Run</th><th>Type</th><th>Status</th><th>Source</th><th>Output</th><th>Runner</th><th>Started</th><th aria-label="Quick preview">Preview</th></tr></thead><tbody>{runsFiltered.map(run=><tr key={run.id} className="run-list-row" onClick={()=>navigate('/runs/'+encodeURIComponent(run.id))}>
        <td><button className="run-list-link" onClick={e=>{e.stopPropagation();navigate('/runs/'+encodeURIComponent(run.id));}}><strong>{run.name}</strong><small>{run.id}</small></button></td>
        <td>{run.type==='Import'?'Ingest':run.type}</td><td><Badge>{run.status}</Badge></td><td>{run.source}</td><td>{run.output}</td><td>{run.executor}</td><td>{date(run.date)}</td>
        <td><button className="run-list-preview" type="button" title={'Quick preview '+run.name} aria-label={'Quick preview '+run.name}
          onClick={e=>{e.stopPropagation();choose(run.id);}}><Search size={16}/></button></td>
      </tr>)}</tbody></table></div></section>
      {selectedId&&selected&&<aside className="run-quick-drawer" aria-label="Run preview"><header><div><span>Run preview</span><strong>{selected.name}</strong></div><button aria-label="Close preview" onClick={()=>choose(null)}><X size={18}/></button></header><div className="run-quick-content">
        <div className="run-preview-badges"><Badge>{selected.type==='Import'?'Ingest':selected.type}</Badge><Badge>{selected.status}</Badge></div>
        {summary(selected)}{failure(selected)}
        <details className="advanced-config"><summary>Identifiers</summary><div className="detail-stats"><StatRow label="Run ID" value={selected.id}/>{selected.configFingerprint&&<StatRow label="Config fingerprint" value={selected.configFingerprint}/>}</div></details>
      </div><footer><Button icon={Download} onClick={()=>exportRun(selected)}>Export</Button><Button variant="primary" icon={ArrowUpRight} onClick={()=>navigate('/runs/'+encodeURIComponent(selected.id))}>Open Run Details</Button></footer></aside>}
    </>}
    {full&&(selected?<RunDetails run={selected} selectionBatches={selectionBatches||[]} pools={pools||[]}
      navigate={navigate} notify={notify} onRetry={retry} onExport={exportRun}/>:
      <section className="run-full-detail"><Button icon={ArrowLeft} onClick={()=>navigate('history')}>Back to runs</Button><Empty title="Run not found" detail="This run is not in the current registry."/></section>)}
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
    <PageHeader eyebrow="Active learning evaluation" title="Strategy Comparison" description="Compare acquisition strategies across evaluation rounds." actions={<><Button onClick={exportEvidence} icon={Download}>Export evidence</Button><Button icon={Pickaxe} onClick={()=>navigate('mining')}>New mining run</Button></>}/>
    <div className="comparison-experiment-picker"><Field label="Experiment"><select value={experimentId} onChange={e=>{setExperimentId(e.target.value);setSelectedRound(8)}}>{comparisonExperiments.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><div><Badge>Sample data</Badge></div></div>
    <div className="comparison-contract comparison-contract--new"><span><small>Seed Dataset</small><strong>{exp?.initialDatasetVersionId||'Missing'}</strong></span><span><small>Pool snapshot</small><strong>{exp?.candidatePoolSnapshotId||'Incompatible'}</strong></span><span><small>Recipe</small><strong>{exp?.recipeId||'Missing'}</strong></span><span><small>Holdout</small><strong>{exp?.holdoutId||'Missing'}</strong></span></div>
    <section className="comparison-validity"><div><h2>Validity checks</h2><p>{valid?'Common setup confirmed.':'Incompatible experiment records.'}</p></div><Badge>{valid?'Checks passed':'Blocked'}</Badge><div className="comparison-checks">{checks.map(c=><div className={c.ok?'pass':'fail'} key={c.label}><span>{c.ok?'✓':'×'}</span>{c.label}</div>)}</div></section>
    {valid?<><section className="comparison-curve-panel"><div className="ops-section__header"><div><h2>Learning curve</h2><p>{points.length} evaluation checkpoints</p></div><Field label="Metric"><select value={metric} onChange={e=>setMetric(e.target.value)}>{metrics.map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></Field></div>
      <div className="comparison-line-legend"><span><i className="comparison-key-a"/>{arms[0]?.label}</span><span><i className="comparison-key-b"/>{arms[1]?.label}</span></div>
      <div className="comparison-svg-wrap"><svg viewBox="0 0 860 270" role="img" aria-label={`${metrics.find(x=>x[0]===metric)?.[1]} across ${points.length} evaluated rounds`}>
        {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="64" x2="810" y1={218-t*178} y2={218-t*178} stroke="currentColor" opacity=".1"/><text x="55" y={222-t*178} textAnchor="end" fontSize="11" fill="currentColor" opacity=".55">{(low+t*(high-low)).toFixed(3)}</text></g>)}
        <path d={path('a')} fill="none" stroke="#0071e3" strokeWidth="2.5"/><path d={path('b')} fill="none" stroke="#c17835" strokeWidth="2.5"/>
        {points.map((p,i)=><g key={p.round}><circle cx={px(i)} cy={py(p.a)} r={chosen?.round===p.round?5.5:4} fill="#0071e3"/><circle cx={px(i)} cy={py(p.b)} r={chosen?.round===p.round?5.5:4} fill="#c17835"/><text x={px(i)} y="240" textAnchor="middle" fontSize="11" fill="currentColor">{p.label}</text><text x={px(i)} y="254" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".55">{Math.round(p.samples/1000)}k</text></g>)}
      </svg></div>
      <div className="comparison-round-selector"><span>Inspect checkpoint</span>{points.map(p=><button key={p.round} className={chosen?.round===p.round?'active':''} onClick={()=>setSelectedRound(p.round)}>{p.label}</button>)}</div>
    </section>
    <div className="comparison-grid"><Panel title={`Checkpoint · ${chosen?.label}`} description="Matched cumulative labeled budget"><div className="comparison-checkpoint"><div><small>{arms[0].label}</small><strong>{format(chosen?.a)}</strong></div><div><small>{arms[1].label}</small><strong>{format(chosen?.b)}</strong></div><div><small>Δ B − A</small><strong>{delta>=0?'+':''}{format(delta)}</strong></div></div><StatRow label="Cumulative labeled" value={count(chosen?.samples||0)}/><StatRow label="Registered evaluations" value={`${selectedA?.id} · ${selectedB?.id}`}/></Panel>
      <Panel title="Safety slice metrics" description="Fixed holdout metrics">{metrics.filter(x=>x[0]!=='map').map(([key,label])=><div className="comparison-slice-row" key={key}><span>{label}</span><strong>{format(selectedA?.metrics[key])}</strong><strong>{format(selectedB?.metrics[key])}</strong></div>)}</Panel></div>
    <section className="comparison-table-card"><div><h3>Evaluation records</h3><p>Metrics by round</p></div><div className="table-scroll"><table><thead><tr><th>Round</th><th>Labeled frames</th><th>{arms[0].label}</th><th>{arms[1].label}</th><th>Δ B − A</th></tr></thead><tbody>{points.map(p=><tr key={p.round}><td>{p.label}</td><td>{count(p.samples)}</td><td>{format(p.a)}</td><td>{format(p.b)}</td><td>{p.round===0?'—':`${p.b-p.a>=0?'+':''}${format(p.b-p.a)}`}</td></tr>)}</tbody></table></div></section>
    <section className="comparison-efficiency"><div className="ops-section__header"><div><h2>Labeling efficiency</h2><p>Cumulative cost and annotation hours.</p></div></div><div className="comparison-checkpoint">{arms.map(arm=><div key={arm.id}><small>{arm.label}</small><strong>${count(sumCost(arm.id,chosen.round))}</strong><span>{count(sumHours(arm.id,chosen.round))} annotation hours</span><span>{chosen.round?format((record(arm.id,chosen.round)?.metrics.map-record(arm.id,0)?.metrics.map)/Math.max(1,sumHours(arm.id,chosen.round))*1000):'—'} mAP gain / 1,000 h</span></div>)}</div></section>
    <section className="comparison-validity"><div><h2>Decision</h2><p>Statistical evidence unavailable.</p></div><Badge>Inconclusive</Badge></section>
    </>:<section className="comparison-blocked"><X size={22}/><h2>Comparison blocked</h2><p>Fix the experiment configuration to compare results.</p></section>}
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
        capabilities:form.modelTask==='Privacy Detection'?['privacy']:['predictions','uncertainty','safety'],createdAt:new Date().toISOString()}]);
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
          <><Field label="Model task"><select value={form.modelTask} onChange={e=>patch('modelTask',e.target.value)}><option>Object Detection</option><option>Privacy Detection</option></select></Field><Field label="Artifact URI *"><input value={form.artifactUri} onChange={e=>patch('artifactUri',e.target.value)} placeholder="r2://roadsift/models/model.pt"/></Field><Field label="Training Dataset version (optional)"><input value={form.datasetVersionId} onChange={e=>patch('datasetVersionId',e.target.value)} placeholder="huc-v7"/></Field></>}
        {error&&<p className="mining-inline-error" role="alert">{error}</p>}
        <p className="mining-simulation-disclaimer">Saving registry metadata does not verify an endpoint, artifact, capability or live heartbeat. A backend verification service is required to mark this resource Ready.</p>
      </div>
    </Modal>}
  </div>;
}

export function Onboarding() {
  const qrRows=["000000000000000000000000000000000","000000000000000000000000000000000","001111111010101110101100111111100","001000001001110111000100100000100","001011101000111010011000101110100","001011101010101000100010101110100","001011101011101000000000101110100","001000001010001000001100100000100","001111111010101010101010111111100","000000000010000101111000000000000","001000101110111101100101111100100","001111010010111111000001111111100","001010111010001001111001100000100","001101010001100010110110001101100","001100111011111110010010000001000","001000010101010000111100111111100","000101111010000111001010011110100","000000100100111100011111010001100","001000111001000100010011010001000","001001010011101111110000111101100","000011101101010001110010101010100","000011110110000011011110001001100","001110111101011110100011111100100","000000000010011001101110001000100","001111111011101111001110101110100","001000001001100101011010001000000","001011101011100100110111111100000","001011101000001111000011000000100","001011101000111001011101000111100","001000001001001100110010011101100","001111111011111010111010011101000","000000000000000000000000000000000","000000000000000000000000000000000"];
  return <div className="page onboarding-page onboarding-deck">
    <section className="onboarding-slide onboarding-slide--hero">
      <div className="onboarding-kicker">ACTIVE LEARNING · DATA CURATION · LINEAGE</div>
      <h1>RoadSift</h1>
      <p>Chọn đúng dữ liệu, hiểu dữ liệu đã chọn, biết mỗi vòng có đang đi đúng hướng.</p>
    </section>

    <section className="onboarding-slide onboarding-slide--problem">
      <h2>Bài toán</h2>
      <div className="onboarding-problem-flow">
        <div><strong>Vài TB</strong><span>pool ảnh thô</span></div>
        <ArrowRight size={42}/>
        <div className="accent"><strong>~10 GB</strong><span>giá trị nhất để train</span></div>
      </div>
      <p className="onboarding-slide-note">Đội labeling và training không xử lý hết. Câu hỏi: lấy những frame nào?</p>
    </section>

    <section className="onboarding-slide">
      <h2>Vòng lặp Active Learning</h2>
      <div className="al-rounds">
        {[['ROUND 1','Dataset v1','Chọn v1'],['ROUND 2','Dataset v2','Chọn v2'],['ROUND 3','Dataset v3','Chọn v3']].map(([round,dataset,select],index)=><div className="al-round" key={round}>
          <div className="al-round-label"><small>{round}</small><strong>{dataset}</strong></div>
          <div className="al-node">Pool</div><ArrowRight size={18}/>
          <div className="al-node al-node--accent">{select}</div><ArrowRight size={18}/>
          <div className="al-node">Gắn nhãn</div><ArrowRight size={18}/>
          <div className="al-node">Train + eval</div>
          {index<2&&<div className="al-feedback">↓ Evaluation quay lại pool, chọn batch cho round sau</div>}
        </div>)}
      </div>
      <p className="onboarding-slide-note">⋮ v4, v5... Làm sao biết các batch sau vẫn còn tốt?</p>
    </section>

    <section className="onboarding-slide">
      <h2>RoadSift gồm hai phần</h2>
      <div className="onboarding-two-part">
        <div className="onboarding-part-card">
          <small>PHẦN 1</small>
          <h3>Data curation pipeline</h3>
          <p>Từ hàng triệu frame, lọc tập nhỏ giá trị cao bằng bốn tín hiệu:</p>
          <div className="signal-chips"><span>Uncertainty</span><span>Diversity</span><span>Safety</span><span>Redundancy</span></div>
        </div>
        <div className="onboarding-part-card">
          <small>PHẦN 2</small>
          <h3>Quản lý AL lineage</h3>
          <p>Pool, dataset version, batch, strategy, model, evaluation, lịch sử từng round.</p>
          <div className="lineage-questions"><span>Dataset v3 tạo từ model nào?</span><span>Vì sao batch này được chọn?</span><span>Thêm batch xong mAP tăng hay giảm?</span><span>Round sau có nên giữ strategy này?</span></div>
        </div>
      </div>
    </section>

    <section className="onboarding-slide">
      <h2>RoadSift nằm ở đầu pipeline</h2>
      <div className="position-pipeline"><span>Pool</span><span>Dataset</span><span>Train</span><span>Model</span></div>
      <div className="position-map">
        <div className="position-road"><strong>RoadSift</strong><span>Chọn gì từ pool, vì sao chọn</span></div>
        <div className="position-dvc"><strong>DVC</strong><span>Version dữ liệu</span></div>
        <div className="position-mlflow"><strong>MLflow</strong><span>Track experiment, model, metric</span></div>
      </div>
    </section>

    <section className="onboarding-slide">
      <h2>Kiến trúc đơn giản</h2>
      <div className="onboarding-architecture">
        <div><strong>Web UI</strong><span>Engineer thao tác</span></div>
        <div><strong>FastAPI</strong><span>Backend, điều phối job</span></div>
        <div><strong>ML workers</strong><span>Inference, embedding, selection, privacy. Kaggle hoặc GPU riêng</span></div>
        <div className="accent"><strong>Lưu trữ</strong><span>Cloudflare R2: media, frame, curated batch.<br/>Supabase: metadata, auth, DB</span></div>
      </div>
      <p className="onboarding-slide-note">Dữ liệu lớn nằm ở R2, metadata và lineage nằm ở Supabase.</p>
    </section>

    <section className="onboarding-slide onboarding-slide--review">
      <div>
        <div className="onboarding-kicker">SAU DEMO</div>
        <h2>Review giúp bọn mình nhé</h2>
        <p>Review hữu ích nhất nhận một coupon mua sắm. GPT-5.6 sẽ chọn review tốt nhất.</p>
      </div>
      <a className="onboarding-qr-card" href="https://forms.gle/oNqqE1ToyGt35tgB8" target="_blank" rel="noreferrer">
        <svg viewBox="0 0 33 33" role="img" aria-label="QR code mở form review">{qrRows.flatMap((row,y)=>[...row].map((cell,x)=>cell==='1'?<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1"/>:null))}</svg>
        <strong>Quét QR để điền khảo sát</strong>
        <span>forms.gle/oNqqE1ToyGt35tgB8</span>
      </a>
    </section>
  </div>;
}
