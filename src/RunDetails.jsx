import React, {useMemo, useState} from 'react';
import {Activity, AlertTriangle, Archive, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, CircleDot, Clock3, Copy, Cpu, Database, Download, GitBranch, Layers3, ListFilter, Network, RotateCcw, ShieldCheck, Workflow, XCircle} from 'lucide-react';
import {Button} from './components/UI.jsx';
import {count, date, sceneUrl} from './data.js';
import './run-details.css';

const ICONS={source:Database,eligibility:ListFilter,dedup:Layers3,deduplication:Layers3,domain:Network,prediction:Cpu,embedding:Network,uncertainty:Activity,diversity:GitBranch,selection:CheckCircle2,privacy:ShieldCheck,output:Archive};
const NAMES={source:'Pool Snapshot',eligibility:'Eligibility',dedup:'Quality & Dedup',deduplication:'Quality & Dedup',domain:'Domain Partitioning',prediction:'Prediction',embedding:'Embedding',uncertainty:'Uncertainty',diversity:'Diversity',selection:'Sample Selection',privacy:'Privacy Gate',output:'Selection Batch'};
const FALLBACK=['source','eligibility','dedup','prediction','embedding','uncertainty','diversity','selection','privacy','output'];
const done=s=>['Complete','Completed','Succeeded','Success'].includes(s);
function runStages(run){
  const stored=run.pipelineDefinitionSnapshot?.stages;
  if(stored?.length)return stored.filter(s=>s.enabled).map(s=>({id:s.id,type:s.type,dependsOn:s.dependsOn||[],implementation:s.implementation}));
  const steps=run.contract?.pipeline?.steps?.filter(x=>x.enabled!==false);
  if(steps?.length){
    const result=[{id:'source',type:'source',dependsOn:[],implementation:'pool-registry'}];
    steps.forEach((s,i)=>result.push({id:s.step,type:s.step==='deduplication'?'dedup':s.step,implementation:s.plugin?.id||s.step,dependsOn:[i?steps[i-1].step:'source']}));
    result.push({id:'output',type:'output',implementation:'selection-batch',dependsOn:[steps.at(-1).step]});
    return result;
  }
  return run.type==='Mining'?FALLBACK.map((type,i)=>({id:type,type,dependsOn:i?[FALLBACK[i-1]]:[],implementation:'Not recorded'})):[];
}
function KV({label,value}){return <div className="rd-kv"><span>{label}</span><strong title={String(value??'—')}>{value??'—'}</strong></div>}
function Dag({stages,onSelect,selected}){
  const nodes=Object.fromEntries(stages.map(s=>[s.id,s])),depths={};
  function depth(n,seen=new Set()){
    if(depths[n.id]!=null)return depths[n.id];
    if(seen.has(n.id))return 0;
    const next=new Set(seen);next.add(n.id);
    return depths[n.id]=Math.max(0,...(n.dependsOn||[]).map(k=>nodes[k]?1+depth(nodes[k],next):0));
  }
  const groups={};stages.forEach(s=>{const d=depth(s);(groups[d]??=[]).push(s)});
  return <div className="rd-dag-scroll" tabIndex={0} aria-label="Scrollable execution graph"><div className="rd-dag">
    {Object.keys(groups).map((k,i)=><React.Fragment key={k}>
      {i>0&&<ArrowRight className="rd-dag-arrow" size={18}/>}
      <div className="rd-dag-column">{groups[k].map(s=>{
        const Icon=ICONS[s.type]||Workflow;return <button key={s.id} className={'rd-stage-node'+(selected===s.id?' is-selected':'')} onClick={()=>onSelect(s.id)}>
          <Icon size={19}/><span><small>{s.type.toUpperCase()}</small><strong>{NAMES[s.type]||s.type}</strong></span><CircleDot size={13}/></button>;
      })}</div>
    </React.Fragment>)}
  </div></div>;
}
export function RunDetails({run,selectionBatches=[],pools=[],navigate,notify,onRetry,onExport}){
  const [tab,setTab]=useState('progress'),[stageId,setStageId]=useState(null);
  const stages=useMemo(()=>runStages(run),[run]);
  const current=stages.find(s=>s.id===stageId)||stages[0];
  const stageEvent=(run.stageEvents||[]).find(e=>e.stageId===current?.id);
  const batch=selectionBatches.find(b=>b.runId===run.id)||selectionBatches.find(b=>b.id===run.outputBatchId);
  const pool=pools.find(p=>p.id===run.sourcePoolId);
  const status=done(run.status)?'Completed':run.status||'Unknown',hasBatch=Boolean(batch);
  const canReview=hasBatch&&done(run.status)&&['In review','Review','Open'].includes(batch.status);
  const copyConfig=()=>{
    if(!navigator.clipboard?.writeText){notify('Clipboard unavailable');return;}
    navigator.clipboard.writeText(JSON.stringify(run.contract,null,2)).then(()=>notify('Configuration copied')).catch(()=>notify('Clipboard unavailable'));
  };
  return <div className="rd-page">
    <div className="rd-breadcrumb"><button onClick={()=>navigate('history')}><ArrowLeft size={15}/> Runs</button><span>/</span>{run.id}</div>
    <header className="rd-header">
      <div><div className="rd-heading"><span className={'rd-status'+(done(run.status)?' is-done':run.status==='Failed'?' is-failed':'')} >{done(run.status)?<CheckCircle2 size={14}/>:run.status==='Failed'?<XCircle size={14}/>:<CircleDot size={14}/>} {status}</span><h1>{run.id}</h1></div>
        <p className="rd-subtitle"><Workflow size={15}/>{run.pipelineDefinitionSnapshot?.name||run.name}{run.pipelineDefinitionVersion?' · v'+run.pipelineDefinitionVersion:''}</p>
        <div className="rd-meta"><span><Clock3 size={14}/>{date(run.date)}</span><span><Database size={14}/>{run.source||'No source'}</span><span><Cpu size={14}/>{run.executor||'Not assigned'}</span></div>
      </div>
      <div className="rd-actions"><Button icon={Download} onClick={()=>onExport(run)}>Export record</Button>{run.contract&&<Button icon={RotateCcw} onClick={()=>onRetry(run)}>Rerun</Button>}</div>
    </header>
    <div className="rd-metrics">
      <div><small>Stages defined</small><strong>{stages.length||'—'}</strong><span>Stage status not reported</span></div>
      <div><small>Input samples</small><strong>{run.frames!=null?count(run.frames):'—'}</strong><span>Candidate pool</span></div>
      <div><small>Selected samples</small><strong>{run.selected!=null?count(run.selected):'—'}</strong><span>{run.budget!=null?'Target '+count(run.budget):'No budget'}</span></div>
      <div><small>Duration</small><strong>{run.duration||'—'}</strong><span>Recorded duration</span></div>
      <div><small>Executor</small><strong className="rd-executor">{run.executor||'—'}</strong><span>{run.executionMode==='mock-worker'?'Local simulation':'Registered runner'}</span></div>
    </div>
    <div className="rd-grid"><div className="rd-primary">
      <div className="rd-tabs" role="tablist">{[['progress','Pipeline Progress'],['stages','Stage Details'],['logs','Logs'],['artifacts','Artifacts']].map(([v,name])=><button key={v} role="tab" aria-selected={tab===v} className={tab===v?'active':''} onClick={()=>setTab(v)}>{name}</button>)}</div>
      {tab==='progress'&&<section className="rd-card"><div className="rd-card-head"><div><h2>Execution Graph</h2><p>Definition structure · Select a stage for details</p></div><span>{stages.length} stages</span></div>
        {stages.length?<Dag stages={stages} selected={current?.id} onSelect={id=>{setStageId(id);setTab('stages')}}/>:<p className="rd-empty">No pipeline definition was stored with this run.</p>}
        <p className="rd-note">Stage-level execution status is not available without recorded worker events. Nodes do not imply success.</p>
      </section>}
      {(tab==='progress'||tab==='stages')&&<section className="rd-card"><div className="rd-card-head"><h2>Stage Details</h2><span>Inspection</span></div>
        {stages.length?<div className="rd-stage-detail"><div className="rd-stage-list">{stages.map((s,i)=>{const Icon=ICONS[s.type]||Workflow;return <button key={s.id} className={current?.id===s.id?'active':''} onClick={()=>setStageId(s.id)}><small>{String(i+1).padStart(2,'0')}</small><Icon size={16}/><span>{NAMES[s.type]||s.type}</span><ChevronDown size={14}/></button>})}</div>
          <div className="rd-stage-inspector"><h3>{NAMES[current?.type]||current?.type}</h3><KV label="Stage ID" value={current?.id}/><KV label="Implementation" value={current?.implementation||'—'}/><KV label="Dependencies" value={(current?.dependsOn||[]).join(', ')||'None'}/><KV label="Recorded status" value={stageEvent?.status||'Not reported'}/><KV label="Recorded duration" value={stageEvent?.duration||'Not reported'}/><KV label="Outputs" value={stageEvent?.artifactIds?.join(', ')||'Not registered'}/></div>
        </div>:<p className="rd-empty">No stage information available.</p>}
      </section>}
      {tab==='logs'&&<section className="rd-card"><div className="rd-card-head"><h2>Execution Events</h2><span>Recorded events only</span></div>
        <div className="rd-event-list">{[['Created',run.date],['Updated',run.updatedAt],['Completed',run.completedAt]].filter(x=>x[1]).map(([label,t])=><div key={label}><Clock3 size={15}/><strong>{label}</strong><span>{date(t)}</span></div>)}
          {(run.stageEvents||[]).map((e,i)=><div key={i}><Activity size={15}/><strong>{e.stageId||'Stage'}</strong><span>{e.message||e.status||'Recorded'}</span></div>)}</div>
        {!run.stageEvents?.length&&<p className="rd-empty">Detailed worker logs have not been registered.</p>}
        {run.errorMessage&&<p className="rd-error"><AlertTriangle size={17}/>{run.errorMessage}</p>}
      </section>}
      {tab==='artifacts'&&<section className="rd-card"><div className="rd-card-head"><h2>Output Artifacts</h2></div>
        {batch?.manifestUri?<div className="rd-artifact"><Archive size={20}/><div><strong>Selection Batch manifest</strong><span>{batch.manifestUri}</span><small>Registered reference · integrity not verified here</small></div><button onClick={()=>navigate('batches?batch='+encodeURIComponent(batch.id))}>Open batch <ArrowRight size={15}/></button></div>:
        <p className="rd-empty">{run.plannedBatch?.manifestUri?'Planned output '+run.plannedBatch.manifestUri+' · not registered':'No verified or registered artifacts for this run.'}</p>}
      </section>}
      {run.status==='Failed'&&<section className="rd-card rd-error"><AlertTriangle size={18}/><div><strong>{run.errorCode||'Run failed'}</strong><p>{run.errorMessage||'No additional error information.'}</p></div></section>}
    </div>
    <aside className="rd-sidebar">
      <section className="rd-card"><div className="rd-card-head"><h2>Run Summary</h2></div>
        <KV label="Run ID" value={run.id}/><KV label="Definition" value={run.pipelineDefinitionVersion?'v'+run.pipelineDefinitionVersion:'Not recorded'}/><KV label="Status" value={status}/><KV label="Started" value={date(run.date)}/><KV label="Completed" value={run.completedAt?date(run.completedAt):'—'}/><KV label="Duration" value={run.duration||'—'}/><KV label="Executor" value={run.executor||'—'}/><KV label="Selected" value={run.selected!=null?count(run.selected):'—'}/><KV label="Batch" value={batch?.id||'Not created'}/>
        {hasBatch?<Button className="rd-wide" variant="primary" icon={ArrowRight} onClick={()=>navigate('batches?batch='+encodeURIComponent(batch.id))}>{canReview?'Go to Batch Review':'Open Selection Batch'}</Button>:
          <p className="rd-note">Batch Review is available after a Selection Batch is registered.</p>}
      </section>
      {pool?.sampleScenes?.length>0&&<section className="rd-card"><div className="rd-card-head"><h2>Source Frames</h2><span>Illustrative</span></div><div className="rd-previews">{pool.sampleScenes.slice(0,6).map((n,i)=><img key={i} src={sceneUrl(n)} alt={'Representative source frame '+(i+1)} loading="lazy"/>)}</div><p className="rd-note">Source illustrations, not verified selected samples.</p></section>}
      <section className="rd-card"><div className="rd-card-head"><h2>Effective Configuration</h2>{run.contract&&<button onClick={copyConfig}><Copy size={15}/> Copy</button>}</div>{run.contract?<><pre className="rd-json">{JSON.stringify(run.contract,null,2)}</pre><p className="rd-note">Immutable configuration captured with this run.</p></>:<p className="rd-empty">No run configuration recorded.</p>}</section>
    </aside></div>
  </div>;
}