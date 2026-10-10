import React,{useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,BarChart3,CheckCircle2,ChevronDown,Database,GitCompare,Info,Layers3,Plus,Search,ShieldAlert,Trash2,X} from 'lucide-react';
import {Badge} from './components/UI.jsx';
import {count,frames} from './data.js';
import {SampleMedia} from './SampleMedia.jsx';
import {StrategyComparisonV2} from './StrategyComparisonV2.jsx';
import './run-comparison.css';

const tabs=[['selection','Selection Results'],['samples','Sample Differences'],['impact','Model Impact']];
const num=v=>Number.isFinite(v)?count(v):'Not recorded';
const plural=(n,word)=>n+' '+word+(n===1?'':'s');
const scopeId=(r,b)=>r?.contract?.source?.snapshotId||b?.sourceSnapshot||null;
function members(b){
  const src=b?.membershipSampleIds||b?.sampleIds||b?.selectionMembership?.sampleIds;
  return Array.isArray(src)&&src.every(id=>typeof id==='string')?src:null;
}
function selectedCount(r,b){return Number.isFinite(r?.selected)?r.selected:Number.isFinite(b?.count)?b.count:null}
function reviewRate(b){return b?.review?.reviewed>0?b.review.approved/b.review.reviewed*100:null}
function comparableIssue(items){
  if(items.length<2)return ['Select at least two runs'];
  const first=items[0];
  const allKnown=key=>items.every(x=>x[key]!==null&&x[key]!==undefined&&x[key]!=='');
  const equal=key=>items.every(x=>x[key]===first[key]);
  const checks=[
    ['Pool snapshot',allKnown('snapshot'),equal('snapshot')],
    ['Selection budget',allKnown('budget'),equal('budget')],
    ['Prediction model',allKnown('model'),equal('model')]
  ];
  const missing=checks.filter(x=>!x[1]).map(x=>x[0]+' not recorded');
  const diff=checks.filter(x=>x[1]&&!x[2]).map(x=>x[0]+' differs');
  return [...diff,...missing,'Paired evaluation protocol not linked to these runs'];
}
function MetricTable({items,comparable}){
  const rows=[
    ['Selected samples','Candidate selection size',x=>num(selectedCount(x.run,x.batch))],
    ['Approved','Registered review aggregate',x=>num(x.batch?.review?.approved)],
    ['Approval rate','Approved / reviewed; not accuracy',x=>reviewRate(x.batch)!==null?reviewRate(x.batch).toFixed(1)+'%':'Not recorded'],
    ['Rejected','Registered review aggregate',x=>num(x.batch?.review?.rejected)],
    ['Deferred','Registered review aggregate',x=>num(x.batch?.review?.deferred)],
    ['Review progress','Reviewed / selected',x=>Number.isFinite(x.batch?.review?.reviewed)&&Number.isFinite(x.batch?.count)?Math.round(100*x.batch.review.reviewed/Math.max(1,x.batch.count))+'%':'Not recorded'],
    ['Execution duration','Recorded wall-clock time',x=>x.run?.duration||'Not recorded'],
    ['Near duplicates','Requires per-sample redundancy evidence',()=> 'Not recorded'],
    ['Safety slice coverage','Requires member-level domain labels',()=> 'Not recorded'],
    ['Annotation hours','Requires reviewed annotation time ledger',()=> 'Not recorded']
  ];
  return <div className="rc-metric-section"><div className="rc-pane-head"><div><h3>Selection Results</h3><p>Registered run and batch aggregates. Selection quality is not model performance.</p></div><Badge>{comparable?'Compatible scope':'Descriptive only'}</Badge></div>
    <div className="rc-table-scroller"><table className="rc-metric-table"><thead><tr><th>Metric</th>{items.map((x,i)=><th key={x.run.id}><span className="rc-head-index">{i+1}</span><strong>{x.strategy}</strong>{i===0&&<small>Baseline</small>}</th>)}</tr></thead>
      <tbody>{rows.map(([metric,desc,fn])=><tr key={metric}><th><strong>{metric}</strong><small>{desc}</small></th>{items.map(x=><td key={x.run.id} className={fn(x)==='Not recorded'?'rc-unknown':''}>{fn(x)}</td>)}</tr>)}</tbody>
    </table></div><p className="rc-muted-note"><Info size={14}/> Source: recorded mock run and batch summaries. No ranking or uplift claims while experiment conditions are unmatched or unverified.</p>
  </div>;
}
function SampleTile({sampleId}){
  const sample=frames.find(f=>f.id===sampleId);
  return <div className="rc-sample-tile">{sample?<SampleMedia sample={sample}/>:<div className="rc-no-media"><Database size={16}/><span>No loaded image</span></div>}<span>{sampleId}</span></div>;
}
function Differences({items,navigate,initialDemo=false}){
  const [candidateId,setCandidateId]=useState(items[1]?.run.id||'');
  const [demo,setDemo]=useState(initialDemo);
  const candidate=items.find(x=>x.run.id===candidateId)||items[1];
  const rawA=members(items[0]?.batch),rawB=members(candidate?.batch);
  // This optional interactive gallery deliberately uses synthetic fixture subsets.
  // It must never be used as evidence about the selected mining runs.
  const exampleA=frames.filter((_,i)=>i%3!==0).slice(0,18).map(f=>f.id);
  const exampleB=frames.filter((_,i)=>i%3!==1).slice(0,18).map(f=>f.id);
  const a=demo?exampleA:rawA,b=demo?exampleB:rawB;
  const supported=Array.isArray(a)&&Array.isArray(b);
  const sa=new Set(a||[]),sb=new Set(b||[]);
  const common=(a||[]).filter(id=>sb.has(id)),onlyA=(a||[]).filter(id=>!sb.has(id)),onlyB=(b||[]).filter(id=>!sa.has(id));
  return <section className="rc-differences"><div className="rc-pane-head"><div><h3>Sample Differences</h3><p>Inspect the actual images one strategy selected and another missed.</p></div>
    {items.length>2&&<label>Compare baseline with <select value={candidate?.run.id} onChange={e=>setCandidateId(e.target.value)}>{items.slice(1).map(x=><option key={x.run.id} value={x.run.id}>{x.strategy}</option>)}</select></label>}</div>
    {!supported?<div className="rc-missing-membership"><div className="rc-missing-illustration"><Layers3 size={31}/><div className="rc-sample-ghost"/><div className="rc-sample-ghost"/></div>
      <h4>Sample-level membership isn't available yet</h4><p>Comparing selected images requires immutable sample ID lists for both runs. The 36 Data Explorer fixture images are not verified members and cannot be used to invent overlap.</p>
      <div className="rc-membership-status">
        {[items[0],candidate].filter(Boolean).map(x=><div key={x.run.id}><span>{x.strategy}</span><strong>{members(x.batch)?'Member IDs available':'Only aggregate count'}</strong>
          {x.batch&&<button type="button" onClick={()=>navigate('/batches/'+encodeURIComponent(x.batch.id)+'?view=grid')}>Open batch <ArrowUpRight size={13}/></button>}</div>)}
      </div>
      <small>When source manifests are connected, this pane will show Common, Baseline-only and Candidate-only samples, with actual media previews.</small>
      <button className="rc-demo-button" type="button" onClick={()=>setDemo(true)}>Preview sample-comparison layout using illustrative frames <ArrowRight size={15}/></button>
    </div>:<div className="rc-overlap-demo">
      {demo&&<div className="rc-demo-warning"><Info size={16}/><span><strong>Illustrative UI demonstration only.</strong> These image groups were constructed from generic fixture frames, not selected-run membership. Counts and overlap here are not experimental results.</span><button type="button" onClick={()=>setDemo(false)}>Exit demo</button></div>}
      <div className="rc-overlap-groups">
      {[[common,'Shared by both'],[onlyA,'Baseline only'],[onlyB,'Candidate only']].map(([ids,title])=><div key={title}><header><h4>{title}</h4><strong>{count(ids.length)}</strong></header><div className="rc-difference-list">{ids.slice(0,24).map(id=><SampleTile sampleId={id} key={id}/>)}</div>
        {ids.length>24&&<p>Showing 24 of {count(ids.length)} IDs</p>}{ids.length===0&&<p>No samples in this group.</p>}</div>)}
      </div></div>}
  </section>;
}
function Impact({items,onBenchmark}){
  return <section className="rc-impact"><div className="rc-pane-head"><div><h3>Model Impact</h3><p>Training value must be evaluated separately from selection scores.</p></div><Badge>Evidence required</Badge></div>
    <div className="rc-impact-grid"><div className="rc-impact-empty"><BarChart3 size={32}/><h4>No paired holdout evaluation linked</h4><p>The selected mining runs do not contain compatible training/evaluation records. This is not evidence of improvement or degradation.</p>
        <button type="button" onClick={onBenchmark}>Open separate synthetic benchmark example <ArrowRight size={15}/></button></div>
      <div className="rc-impact-protocol"><h4>Evidence required</h4><div><CheckCircle2 size={15}/>Same fixed evaluation holdout</div><div><CheckCircle2 size={15}/>Controlled training recipe and seed</div>
        <div><CheckCircle2 size={15}/>Paired metrics + uncertainty intervals</div><div><CheckCircle2 size={15}/>Annotation cost accounting</div>
        <small>Model impact results will appear here only after the exact versions are linked and validation passes.</small></div></div>
  </section>;
}
export function RunComparisonWorkspace({navigate,runs=[],selectionBatches=[],routePath=''}){
  const sampleDemo=new URLSearchParams(routePath.split('?')[1]||'').get('demo')==='samples';
  const selectable=runs.filter(r=>r.type==='Mining'&&r.status==='Complete');
  const [selectedIds,setSelectedIds]=useState(()=>selectable.slice(0,2).map(r=>r.id));
  const [tab,setTab]=useState(sampleDemo?'samples':'selection');
  const [benchmark,setBenchmark]=useState(false);
  const [showAdd,setShowAdd]=useState(false),[search,setSearch]=useState('');
  const ids=selectedIds.filter(id=>selectable.some(r=>r.id===id));
  const chosen=ids.map(id=>{
    const run=selectable.find(r=>r.id===id),batch=selectionBatches.find(b=>b.runId===id);
    return {run,batch,strategy:batch?.strategy||run?.name?.split(' · ')[0]||'Unspecified',
      snapshot:scopeId(run,batch),budget:run?.budget??batch?.count??null,
      model:run?.contract?.pipeline?.modelRef?.id||run?.contract?.pipeline?.modelRef||null};
  }).filter(x=>x.run);
  const issues=comparableIssue(chosen),scopeComparable=issues.length===1&&issues[0].startsWith('Paired evaluation');
  const addable=selectable.filter(r=>!ids.includes(r.id)&&
    (r.id+' '+r.name+' '+r.source).toLowerCase().includes(search.toLowerCase()));
  const updateOne=(position,id)=>setSelectedIds(old=>old.map((value,i)=>i===position?id:value));
  if(benchmark)return <div className="rc-benchmark"><button className="rc-back" onClick={()=>setBenchmark(false)}><ArrowLeft size={15}/> Back to run comparison</button>
    <div className="rc-example-banner"><Info size={16}/> Separate synthetic benchmark: these checkpoints are NOT derived from the selected mining runs.</div>
    <StrategyComparisonV2 navigate={navigate}/></div>;
  return <div className="page rc-page">
    <header className="rc-header"><div><span className="rc-eyebrow">ANALYTICS / SELECTION STRATEGIES</span><h1>Compare selection runs</h1>
      <p>Choose two or more runs, inspect their selection results, then explore what they selected differently.</p></div><button type="button" className="rc-outline" onClick={()=>setBenchmark(true)}>Example benchmark <ArrowUpRight size={15}/></button></header>
    <section className="rc-run-picker"><div className="rc-picker-header"><div><h2>Runs to compare</h2><p>2–5 completed selection runs. The first run is the baseline.</p></div>
      <button className="rc-add-button" disabled={ids.length>=5||addable.length===0} onClick={()=>setShowAdd(v=>!v)}><Plus size={15}/> Add run</button></div>
      <div className="rc-run-cards">{chosen.map((x,i)=><article key={i} className="rc-run-card">
        <header><span>RUN {i+1} {i===0?'· BASELINE':''}</span>{i>=2&&<button aria-label={'Remove '+x.run.name} onClick={()=>setSelectedIds(old=>old.filter(id=>id!==x.run.id))}><X size={15}/></button>}</header>
        <select aria-label={'Comparison run '+(i+1)} value={x.run.id} onChange={e=>updateOne(i,e.target.value)}>
          {selectable.filter(r=>r.id===x.run.id||!ids.includes(r.id)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <div className="rc-run-detail"><strong>{x.strategy}</strong><small>{x.batch?.id||'No registered batch'} · {num(selectedCount(x.run,x.batch))} selected</small></div>
        <button type="button" className="rc-run-link" onClick={()=>navigate('/runs/'+encodeURIComponent(x.run.id))}>Run Details <ArrowUpRight size={13}/></button>
      </article>)}</div>
      {showAdd&&<div className="rc-add-dialog"><div><Search size={15}/><input aria-label="Search available runs" placeholder="Find by strategy, pool or run ID…" value={search} onChange={e=>setSearch(e.target.value)}/><button type="button" onClick={()=>setShowAdd(false)} aria-label="Close run picker"><X size={15}/></button></div>
        <div>{addable.map(r=><button type="button" key={r.id} onClick={()=>{setSelectedIds(old=>[...old,r.id]);setShowAdd(false);setSearch('')}}>{r.name}<small>{r.id}</small><Plus size={15}/></button>)}{!addable.length&&<p>No more matching runs.</p>}</div></div>}
      <div className={'rc-scope-status '+(scopeComparable?'is-compatible':'is-warning')}><div>{scopeComparable?<CheckCircle2 size={17}/>:<ShieldAlert size={17}/>}<span><strong>{scopeComparable?'Selection scope matches':'Not directly comparable'}</strong>
        <small>{scopeComparable?'Shared pool snapshot and budget. Other experimental controls still require verification.':issues.slice(0,2).join(' · ')}</small></span></div>
        <details><summary>Comparison conditions <ChevronDown size={15}/></summary>{issues.map(issue=><p key={issue}>{issue}</p>)}</details>
      </div>
    </section>
    <nav className="rc-tabs" role="tablist" aria-label="Comparison views">
      {tabs.map(([id,label])=><button type="button" role="tab" aria-selected={tab===id} className={tab===id?'is-active':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}
    </nav>
    {tab==='selection'&&<MetricTable items={chosen} comparable={scopeComparable}/>}
    {tab==='samples'&&<Differences key={ids.join('|')} items={chosen} navigate={navigate} initialDemo={sampleDemo}/>}
    {tab==='impact'&&<Impact items={chosen} onBenchmark={()=>setBenchmark(true)}/>}
    <footer className="rc-footer"><Info size={15}/> These are fixture run summaries. Stable membership and linked evaluation are needed for reproducible comparisons.</footer>
  </div>;
}
