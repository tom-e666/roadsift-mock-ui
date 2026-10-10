import React, {useMemo, useState} from 'react';
import {Activity, AlertTriangle, Archive, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, CircleDot, Clock3, Copy, Cpu, Database, Download, GitBranch, Layers3, ListFilter, Network, RotateCcw, ShieldCheck, Workflow, X, XCircle} from 'lucide-react';
import {Button} from './components/UI.jsx';
import {count, date, sceneUrl} from './data.js';
import './run-details.css';

const ICONS={source:Database,eligibility:ListFilter,dedup:Layers3,deduplication:Layers3,domain:Network,prediction:Cpu,embedding:Network,uncertainty:Activity,diversity:GitBranch,selection:CheckCircle2,privacy:ShieldCheck,output:Archive};
const NAMES={source:'Pool Snapshot',eligibility:'Eligibility',dedup:'Quality & Dedup',deduplication:'Quality & Dedup',domain:'Domain Partitioning',prediction:'Prediction',embedding:'Embedding',uncertainty:'Uncertainty',diversity:'Diversity',selection:'Sample Selection',privacy:'Privacy Gate',output:'Selection Batch'};
const done=s=>['Complete','Completed','Succeeded','Success'].includes(s);
const failed=s=>['Failed','Error','Cancelled','Canceled'].includes(s);

function snapshotStages(run){
  const recorded=run.pipelineDefinitionSnapshot?.stages;
  if(!Array.isArray(recorded)||!recorded.length)return [];
  return recorded.filter(s=>s.enabled!==false).map(s=>({
    id:s.id,type:s.type,label:s.label||NAMES[s.type]||s.id,
    implementation:s.implementation||null,dependsOn:Array.isArray(s.dependsOn)?s.dependsOn:[],
    params:s.params||{}
  }));
}
function stageEventOf(run,stageId){
  const events=Array.isArray(run.stageEvents)?run.stageEvents:[];
  return [...events].reverse().find(e=>e.stageId===stageId||e.stage===stageId)||null;
}
function stageStatus(event){
  if(!event||!event.status)return 'Not reported';
  return event.status;
}
function StatusIcon({value}){
  return done(value)?<CheckCircle2 size={15}/>:failed(value)?<XCircle size={15}/>:<CircleDot size={15}/>;
}
function KV({label,value}){return <div className="rd-kv"><span>{label}</span><strong title={String(value??'—')}>{value??'—'}</strong></div>}
function ExecutionGraph({stages,run,selectedId,onSelect}){
  const positions=useMemo(()=>{
    const byId=Object.fromEntries(stages.map(s=>[s.id,s])),memo={};
    const depth=(n,visited=new Set())=>{
      if(memo[n.id]!=null)return memo[n.id];
      if(visited.has(n.id))return 0;
      const seen=new Set(visited);seen.add(n.id);
      return memo[n.id]=Math.max(0,...n.dependsOn.map(id=>byId[id]?1+depth(byId[id],seen):0));
    };
    const columns={};
    stages.forEach(s=>{const d=depth(s);(columns[d]??=[]).push(s)});
    const maxRows=Math.max(1,...Object.values(columns).map(items=>items.length));
    const placement={};
    for(const [d,items] of Object.entries(columns)){
      items.forEach((s,i)=>{placement[s.id]={x:30+Number(d)*220,y:34+(maxRows-items.length)*48+i*96};});
    }
    return {placement,width:90+(Math.max(0,...Object.keys(columns).map(Number))+1)*220,
      height:100+maxRows*96};
  },[stages]);
  return <div className="rd-execution-scroll" tabIndex={0} aria-label="Read-only execution dependencies graph. Scroll horizontally to inspect all stages.">
    <div className="rd-execution-world" style={{width:positions.width,height:positions.height}}>
      <svg className="rd-execution-edges" width={positions.width} height={positions.height} viewBox={'0 0 '+positions.width+' '+positions.height} aria-hidden="true">
        <defs><marker id="rd-edge-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0 0 L5 3.5 L0 7" fill="none" stroke="currentColor" strokeWidth="1.3"/>
        </marker></defs>
        {stages.flatMap(s=>(s.dependsOn||[]).filter(id=>positions.placement[id]).map(id=>{
          const a=positions.placement[id],b=positions.placement[s.id];
          return <path key={id+'--'+s.id} fill="none" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#rd-edge-arrow)"
            d={'M'+(a.x+172)+' '+(a.y+35)+' C'+(a.x+198)+' '+(a.y+35)+' '+(b.x-24)+' '+(b.y+35)+' '+b.x+' '+(b.y+35)}/>;
        }))}
      </svg>
      {stages.map(s=>{
        const Icon=ICONS[s.type]||Workflow,event=stageEventOf(run,s.id);
        const eventStatus=event?.status;
        return <button key={s.id} type="button"
          className={'rd-execution-node'+(selectedId===s.id?' is-selected':'')}
          style={{left:positions.placement[s.id].x,top:positions.placement[s.id].y}}
          aria-label={'Inspect '+s.label} aria-pressed={selectedId===s.id}
          onClick={()=>onSelect(s.id)}>
          <Icon size={17}/>
          <span><small>{s.type?.toUpperCase()||'STAGE'}</small><strong>{s.label}</strong>
            <em>{eventStatus?eventStatus:'No stage event'}</em>
          </span>
          <span className={'rd-node-dot'+(eventStatus&&done(eventStatus)?' is-done':eventStatus&&failed(eventStatus)?' is-failed':'')}
            title={eventStatus?'Recorded: '+eventStatus:'No recorded stage status'}><StatusIcon value={eventStatus}/></span>
        </button>;
      })}
    </div>
  </div>;
}
function StageInspector({stage,run,onClose}){
  const event=stageEventOf(run,stage.id);
  return <aside className="rd-stage-inspector" aria-label="Selected execution stage">
    <header><div><small>STAGE INSPECTOR</small><h3>{stage.label}</h3><span>{stage.id}</span></div>
      <button type="button" aria-label="Close stage inspector" onClick={onClose}><X size={17}/></button></header>
    <div className="rd-inspector-content">
      <KV label="Implementation" value={stage.implementation||'Not recorded'}/>
      <KV label="Upstream stages" value={stage.dependsOn.join(', ')||'None'}/>
      <KV label="Recorded status" value={stageStatus(event)}/>
      <KV label="Duration" value={event?.duration||'Not recorded'}/>
      <KV label="Started" value={event?.startedAt?date(event.startedAt):'Not recorded'}/>
      <KV label="Completed" value={event?.completedAt?date(event.completedAt):'Not recorded'}/>
      <KV label="Artifacts" value={event?.artifactIds?.join(', ')||'Not registered'}/>
      <details className="rd-stage-config"><summary>Definition parameters <ChevronDown size={14}/></summary><pre>{JSON.stringify(stage.params||{},null,2)}</pre></details>
      <p className="rd-note">Only recorded worker events are displayed. A completed run does not establish this stage's status.</p>
    </div>
  </aside>;
}
export function RunDetails({run,selectionBatches=[],pools=[],navigate,notify,onRetry,onExport}){
  const [tab,setTab]=useState('graph'),[selectedId,setSelectedId]=useState(null);
  const stages=useMemo(()=>snapshotStages(run),[run.pipelineDefinitionSnapshot]);
  const selected=stages.find(s=>s.id===selectedId)||null;
  const hasCapturedGraph=stages.length>0;
  const batch=selectionBatches.find(b=>b.runId===run.id)||selectionBatches.find(b=>b.id===run.outputBatchId);
  const pool=pools.find(p=>p.id===run.sourcePoolId);
  const hasBatch=Boolean(batch);
  const canReview=hasBatch&&done(run.status)&&['In review','Review','Open'].includes(batch.status);
  const canRetry=Boolean(run.contract&&run.plannedBatch);
  const effectiveConfig=run.contract?JSON.stringify(run.contract,null,2):null;
  const copyConfig=()=>{
    if(!effectiveConfig||!navigator.clipboard?.writeText){notify('Clipboard unavailable');return;}
    navigator.clipboard.writeText(effectiveConfig).then(()=>notify('Configuration copied')).catch(()=>notify('Clipboard unavailable'));
  };
  return <div className="rd-page">
    <div className="rd-breadcrumb"><button onClick={()=>navigate('history')}><ArrowLeft size={15}/> Runs</button><span>/</span><strong>{run.id}</strong></div>
    <header className="rd-header">
      <div className="rd-head-content">
        <div className="rd-heading"><span className={'rd-status'+(done(run.status)?' is-done':failed(run.status)?' is-failed':'')}><StatusIcon value={run.status}/>{done(run.status)?'Completed':run.status||'Unknown'}</span><h1>{run.id}</h1></div>
        <p className="rd-subtitle"><Workflow size={15}/>{run.pipelineDefinitionSnapshot?.name||run.name||'Pipeline Run'}{run.pipelineDefinitionVersion?' · v'+run.pipelineDefinitionVersion:''}</p>
        <div className="rd-meta"><span><Clock3 size={14}/>{run.date?date(run.date):'Not recorded'}</span><span><Database size={14}/>{run.source||'No source'}</span><span><Cpu size={14}/>{run.executor||'Not assigned'}</span></div>
      </div>
      <div className="rd-actions"><Button icon={Download} onClick={()=>onExport(run)}>Export record</Button>
        {canRetry&&<Button icon={RotateCcw} onClick={()=>onRetry(run)}>Rerun</Button>}
      </div>
    </header>
    <div className="rd-metrics">
      <div><small>Input samples</small><strong>{run.frames!=null?count(run.frames):'—'}</strong><span>Candidate pool</span></div>
      <div><small>Selected samples</small><strong>{run.selected!=null?count(run.selected):'—'}</strong><span>{run.budget!=null?'Target '+count(run.budget):'No target recorded'}</span></div>
      <div><small>Duration</small><strong>{run.duration||'—'}</strong><span>Recorded duration</span></div>
      <div><small>Stages in snapshot</small><strong>{hasCapturedGraph?stages.length:'—'}</strong><span>{hasCapturedGraph?'Definition captured at launch':'Execution graph not captured'}</span></div>
    </div>
    <div className="rd-grid">
      <main className="rd-primary">
        <div className="rd-tabs" role="tablist" aria-label="Run detail views">
          {[['graph','Pipeline Progress'],['logs','Logs'],['artifacts','Artifacts']].map(([key,label])=>
            <button key={key} role="tab" type="button" aria-selected={tab===key} className={tab===key?'active':''}
              onClick={()=>{setTab(key);setSelectedId(null);}}>{label}</button>)}
        </div>
        {tab==='graph'&&<section className="rd-card rd-graph-panel">
          <div className="rd-card-head"><div><h2>Execution Graph</h2><p>Read-only stage dependencies · Click a node to inspect recorded evidence</p></div>
            {hasCapturedGraph&&<span>{stages.length} stages</span>}</div>
          {hasCapturedGraph?<div className={'rd-graph-layout'+(selected?' has-inspector':'')}>
            <ExecutionGraph stages={stages} run={run} selectedId={selectedId} onSelect={setSelectedId}/>
            {selected&&<StageInspector stage={selected} run={run} onClose={()=>setSelectedId(null)}/>}
          </div>:<div className="rd-no-graph"><AlertTriangle size={22}/><div><strong>Execution graph not recorded</strong>
            <p>This run has no immutable pipeline DAG snapshot. Run-level results are available, but individual stage dependencies, statuses and timing cannot be verified.</p>
            {run.contract?.pipeline?.steps?.length>0&&<p>A job configuration was captured. Its stage list does not establish the executed dependency graph.</p>}
          </div></div>}
          {hasCapturedGraph&&<p className="rd-note">Node status reflects recorded stage events only; no status is inferred from overall run completion. Scroll inside the graph to inspect all nodes.</p>}
        </section>}
        {tab==='logs'&&<section className="rd-card"><div className="rd-card-head"><h2>Execution Events</h2><span>Recorded events only</span></div>
          <div className="rd-event-list">{[['Created',run.date],['Updated',run.updatedAt],['Completed',run.completedAt]].filter(x=>x[1]).map(([label,t])=><div key={label}><Clock3 size={15}/><strong>{label}</strong><span>{date(t)}</span></div>)}
            {(run.stageEvents||[]).map((e,i)=><div key={i}><Activity size={15}/><strong>{e.stageId||e.stage||'Stage'}</strong><span>{e.message||e.status||'Recorded'}</span></div>)}</div>
          {!run.stageEvents?.length&&<p className="rd-empty">Detailed worker logs have not been registered.</p>}
          {run.errorMessage&&<p className="rd-error"><AlertTriangle size={17}/>{run.errorMessage}</p>}
        </section>}
        {tab==='artifacts'&&<section className="rd-card"><div className="rd-card-head"><h2>Output Artifacts</h2></div>
          {batch?.manifestUri?<div className="rd-artifact"><Archive size={20}/><div><strong>Selection Batch manifest</strong><span>{batch.manifestUri}</span><small>Registered reference · content integrity not verified in this view</small></div><button onClick={()=>navigate('batches?batch='+encodeURIComponent(batch.id))}>Open batch <ArrowRight size={15}/></button></div>:
          <p className="rd-empty">{run.plannedBatch?.manifestUri?'Planned output '+run.plannedBatch.manifestUri+' · not registered':'No output artifacts registered for this run.'}</p>}
        </section>}
        {failed(run.status)&&<section className="rd-card rd-error"><AlertTriangle size={18}/><div><strong>{run.errorCode||'Run failed'}</strong><p>{run.errorMessage||'No additional error information.'}</p></div></section>}
      </main>
      <aside className="rd-sidebar">
        <section className="rd-card"><div className="rd-card-head"><h2>Run Summary</h2></div>
          <KV label="Status" value={done(run.status)?'Completed':run.status||'Unknown'}/>
          <KV label="Definition" value={run.pipelineDefinitionVersion?'v'+run.pipelineDefinitionVersion:'Not recorded'}/>
          <KV label="Started" value={run.date?date(run.date):'—'}/>
          <KV label="Completed" value={run.completedAt?date(run.completedAt):'Not recorded'}/>
          <KV label="Executor" value={run.executor||'—'}/>
          <KV label="Batch" value={batch?.id||'Not created'}/>
          {hasBatch?<Button className="rd-wide" variant="primary" icon={ArrowRight} onClick={()=>navigate('batches?batch='+encodeURIComponent(batch.id))}>{canReview?'Go to Batch Review':'Open Selection Batch'}</Button>:
            <p className="rd-note">Batch Review becomes available when this run has a registered Selection Batch.</p>}
        </section>
        {pool?.sampleScenes?.length>0&&<section className="rd-card"><div className="rd-card-head"><h2>Source Frames</h2><span>Illustrative</span></div><div className="rd-previews">{pool.sampleScenes.slice(0,6).map((n,i)=><img key={i} src={sceneUrl(n)} alt={'Representative source frame '+(i+1)} loading="lazy"/>)}</div><p className="rd-note">Representative pool frames, not verified selected samples.</p></section>}
        <section className="rd-card rd-config-card"><details><summary><strong>Effective Run Configuration</strong><ChevronDown size={15}/></summary>
          {effectiveConfig?<><div className="rd-config-actions"><button onClick={copyConfig}><Copy size={15}/> Copy JSON</button></div><pre className="rd-json">{effectiveConfig}</pre><p className="rd-note">Captured at launch; definition and run parameters are not editable here.</p></>:
            <p className="rd-empty">No run configuration recorded.</p>}
        </details></section>
      </aside>
    </div>
  </div>;
}
