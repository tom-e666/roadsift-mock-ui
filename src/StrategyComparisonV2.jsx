import React,{useState} from 'react';
import {AlertTriangle,ArrowRight,CheckCircle2,ChevronDown,Download,Info,Layers3,Lock,Play,ShieldCheck} from 'lucide-react';
import {Badge,Button} from './components/UI.jsx';
import {comparisonExperiments,evaluationRegistry,count} from './data.js';
import './strategy-comparison.css';
const METRICS=[['map','mAP50–95'],['recall','Recall'],['vru','VRU Recall'],['night','Night Recall'],['rain','Rain / Fog Recall']];
const fmt=(v,d=3)=>Number.isFinite(v)?Number(v).toFixed(d):'Not recorded';
const pct=v=>Number.isFinite(v)?(v*100).toFixed(1)+'%':'Not recorded';
const money=v=>Number.isFinite(v)?'$'+Number(v).toLocaleString('en-US',{maximumFractionDigits:0}):'Not recorded';
const colors=['#4096ee','#ab82e3'];
const get=(rows,arm,round)=>rows.find(x=>x.armId===arm&&x.round===round);
function checksFor(exp,rows){
  if(!exp)return [{name:'Experiment exists',ok:false}];
  const arms=exp.arms||[],rounds=[...new Set(rows.map(r=>r.round))].sort((a,b)=>a-b);
  return [
    {name:'Same initial labeled dataset',ok:Boolean(exp.initialDatasetVersionId&&rows.length&&rows.every(r=>r.initialDatasetVersionId===exp.initialDatasetVersionId))},
    {name:'Same immutable pool snapshot',ok:Boolean(exp.candidatePoolSnapshotId&&rows.length&&rows.every(r=>r.candidatePoolSnapshotId===exp.candidatePoolSnapshotId))},
    {name:'Same training recipe and seed',ok:Boolean(exp.recipeId&&Number.isInteger(exp.trainingSeed)&&rows.length&&rows.every(r=>r.recipeId===exp.recipeId&&r.trainingSeed===exp.trainingSeed))},
    {name:'Same fixed holdout',ok:Boolean(exp.holdoutId&&rows.length&&rows.every(r=>r.holdoutId===exp.holdoutId))},
    {name:'Paired EXACT-N checkpoints',ok:Boolean(arms.length===2&&rounds.length===exp.expectedRounds+1&&rounds.every(r=>arms.every(a=>{const e=get(rows,a.id,r);return e&&e.cumulativeLabeled===8000+r*exp.expectedRoundBudget&&e.budgetIncrement===(r===0?0:exp.expectedRoundBudget)})))},
    {name:'Evaluation provenance',ok:Boolean(rows.length&&rows.every(r=>r.recordType==='synthetic_fixture'&&Number.isFinite(r.metrics?.map)))}
  ];
}
function download(exp,rows,checks,metric,round,baseline){
  const payload={schemaVersion:'roadsift.comparison-preview.v2',syntheticFixture:true,notExperimentEvidence:true,
    experiment:exp,evaluationRecords:rows,checks,metric,round,baseline};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=exp.id+'-comparison-preview.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function LinePlot({arms,rows,metric,selectedRound}){
  const rounds=[...new Set(rows.map(r=>r.round))].sort((a,b)=>a-b);
  const series=rounds.map(round=>arms.map(a=>get(rows,a.id,round)?.metrics?.[metric]));
  const vals=series.flat().filter(Number.isFinite);
  if(rounds.length<2||!vals.length)return <p className="sc-empty">No measured checkpoints available.</p>;
  const lo=Math.max(0,Math.min(...vals)-.035),hi=Math.min(1,Math.max(...vals)+.035);
  const x=i=>60+i*610/Math.max(1,rounds.length-1),y=v=>210-(v-lo)/Math.max(.001,hi-lo)*160;
  return <svg className="sc-lineplot" viewBox="0 0 730 257" role="img" aria-label="Synthetic learning curve across cumulative labeled samples">
    {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="60" x2="680" y1={210-t*160} y2={210-t*160} stroke="currentColor" opacity=".11"/><text x="52" y={214-t*160} textAnchor="end" fontSize="10" fill="currentColor" opacity=".55">{(lo+t*(hi-lo)).toFixed(2)}</text></g>)}
    {arms.map((arm,j)=><g key={arm.id}><path fill="none" stroke={colors[j]} strokeWidth="2.6" d={series.map((s,i)=>(i?'L':'M')+x(i)+','+y(s[j])).join(' ')}/>
      {series.map((s,i)=><circle key={i} cx={x(i)} cy={y(s[j])} r={rounds[i]===selectedRound?5.2:3.4} fill={colors[j]}/>)}</g>)}
    {rounds.map((r,i)=><g key={r}><text x={x(i)} y="229" fill="currentColor" fontSize="10" textAnchor="middle">{r?'R'+r:'Seed'}</text><text x={x(i)} y="245" fill="currentColor" opacity=".5" fontSize="9" textAnchor="middle">{Math.round((get(rows,arms[0].id,r)?.cumulativeLabeled||0)/1000)}k</text></g>)}
  </svg>;
}
export function StrategyComparisonV2({navigate}){
  const [experimentId,setExperimentId]=useState(comparisonExperiments[0]?.id||'');
  const [baseline,setBaseline]=useState('entropy'),[round,setRound]=useState(8),[metric,setMetric]=useState('map');
  const exp=comparisonExperiments.find(e=>e.id===experimentId),rows=evaluationRegistry.filter(r=>r.experimentId===experimentId);
  const arms=exp?.arms||[],base=arms.some(a=>a.id===baseline)?baseline:arms[0]?.id;
  const ordered=[...arms].sort((a,b)=>a.id===base?-1:b.id===base?1:0);
  const checks=checksFor(exp,rows),comparable=checks.every(c=>c.ok),rounds=[...new Set(rows.map(r=>r.round))].sort((a,b)=>a-b);
  const selectedRound=rounds.includes(round)?round:rounds.at(-1)||0;
  const current=ordered.map(a=>get(rows,a.id,selectedRound));
  const totals=ordered.map(a=>rows.filter(r=>r.armId===a.id&&r.round<=selectedRound).reduce((n,r)=>({hours:n.hours+(r.annotationHoursIncrement||0),cost:n.cost+(r.annotationCostUsdIncrement||0)}),{hours:0,cost:0}));
  const delta=key=>comparable&&current.length===2&&Number.isFinite(current[0]?.metrics?.[key])&&Number.isFinite(current[1]?.metrics?.[key])?current[1].metrics[key]-current[0].metrics[key]:null;
  const quality=[
    ['Requested budget at checkpoint',current.map(r=>r?.budgetIncrement),v=>Number.isFinite(v)?count(v)+' frames':'Not recorded'],
    ['Cumulative labeled samples',current.map(r=>r?.cumulativeLabeled),v=>Number.isFinite(v)?count(v):'Not recorded'],
    ['Approval rate',ordered.map(()=>null),()=> 'Not recorded'],
    ['Diversity score',ordered.map(()=>null),()=> 'Not recorded'],
    ['Redundancy score',ordered.map(()=>null),()=> 'Not recorded'],
    ['Annotation hours',totals.map(t=>t.hours),v=>count(v)+' h'],
    ['Annotation cost',totals.map(t=>t.cost),money]
  ];
  return <div className="page sc-page">
    <header className="sc-header"><div><span className="sc-kicker">ANALYTICS / ACTIVE LEARNING</span><h1>Strategy Comparison</h1><p>Controlled comparison of acquisition strategies, costs and downstream evaluation.</p></div>
      <div className="sc-header-actions"><Button icon={Download} onClick={()=>exp&&download(exp,rows,checks,metric,selectedRound,base)}>Export preview evidence</Button><Button icon={Play} onClick={()=>navigate('mining')}>New mining run</Button></div></header>
    <div className="sc-fixture"><Info size={16}/><span><strong>Synthetic fixture.</strong> This experiment contains two arms and paired checkpoints. All evaluation values are illustrative; missing selection-quality metrics remain unreported.</span></div>
    <section className="sc-scope"><div className="sc-head"><div><h2>01 · Comparison scope</h2><p>Choose a protocol before comparing results.</p></div><Badge>Experiment setup</Badge></div>
      <div className="sc-scope-fields">
        <label>Experiment<select value={experimentId} onChange={e=>{setExperimentId(e.target.value);setRound(8)}}>{comparisonExperiments.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <div><small>Pool snapshot</small><strong>{exp?.candidatePoolSnapshotId||'Incompatible'}</strong></div>
        <div><small>Budget / round</small><strong>{count(exp?.expectedRoundBudget||0)} · EXACT-N</strong></div>
        <div><small>Holdout</small><strong>{exp?.holdoutId||'Missing'}</strong></div>
        <div><small>Recipe / seed</small><strong>{exp?.recipeId||'Missing'} · {exp?.trainingSeed??'—'}</strong></div>
      </div></section>
    <section className="sc-runs"><div className="sc-head"><div><h2>02 · Strategies to compare</h2><p>Set your baseline and select an evaluation checkpoint.</p></div>
      <label className="sc-checkpoint">Checkpoint <select value={selectedRound} onChange={e=>setRound(Number(e.target.value))}>{rounds.map(r=><option value={r} key={r}>{r?'Round '+r:'Seed'}</option>)}</select></label></div>
      <div className="sc-arm-row">{ordered.map((a,i)=><button type="button" className={'sc-arm '+(i===0?'is-baseline':'')} aria-pressed={a.id===base} key={a.id} onClick={()=>setBaseline(a.id)}><i style={{background:colors[i]}}/><span><strong>{a.label}</strong><small>{a.id} · synthetic fixture</small></span><em>{a.id===base?'Baseline':'Set as baseline'}</em></button>)}</div>
      <div className={'sc-validity '+(comparable?'is-pass':'is-blocked')}><div>{comparable?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>}<span><strong>{comparable?'Matched comparison configuration':'Not directly comparable'}</strong><small>{comparable?'Same dataset, snapshot, budget, seed and holdout. Significance still unknown.':'Different or missing experiment conditions; comparative conclusions are disabled.'}</small></span></div>
        <details><summary>Protocol checks <ChevronDown size={14}/></summary><ul>{checks.map(c=><li key={c.name}>{c.ok?'✓':'×'} {c.name}</li>)}</ul></details></div>
    </section>
    <div className="sc-priority">
      <section className="sc-card"><div className="sc-head"><div><h2>03 · Key metrics comparison</h2><p>Selection quality and annotation effort at the chosen checkpoint.</p></div><Badge>Table first</Badge></div>
        <div className="sc-table-scroll"><table><thead><tr><th>Metric</th>{ordered.map((a,i)=><th key={a.id}><i style={{background:colors[i]}}/>{a.label}{i===0?' · baseline':''}</th>)}</tr></thead><tbody>
          {quality.map(([name,vals,format])=><tr key={name}><th>{name}</th>{vals.map((v,i)=><td key={i} className={v==null?'sc-unavailable':''}>{format(v)}</td>)}</tr>)}
        </tbody></table></div><p className="sc-note"><Info size={14}/> Approval, diversity and redundancy require verified selection/review evidence; no missing results are fabricated.</p>
      </section>
      <aside className="sc-card sc-overlap"><h2>Selection overlap</h2><div><Layers3 size={25}/><strong>Not recorded</strong><p>Pairwise overlap requires selected sample IDs and immutable membership snapshots for both arms.</p></div><h3>Selected-data coverage</h3><p>No selected-sample slice counts are recorded. Holdout recall by slice is shown below, but is not the same metric.</p></aside>
    </div>
    <div className="sc-analysis">
      <section className="sc-card"><div className="sc-head"><div><h2>04 · Learning curve</h2><p>Metric vs cumulative labeled samples · synthetic fixture.</p></div>
        <select aria-label="Learning curve metric" value={metric} onChange={e=>setMetric(e.target.value)}>{METRICS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
        {comparable?<LinePlot arms={ordered} rows={rows} metric={metric} selectedRound={selectedRound}/>:<div className="sc-empty"><Lock size={18}/> Chart disabled because conditions differ.</div>}
        <div className="sc-legend">{ordered.map((a,i)=><span key={a.id}><i style={{background:colors[i]}}/>{a.label}</span>)}</div>
      </section>
      <section className="sc-card"><div className="sc-head"><div><h2>05 · Evaluation by slice</h2><p>Holdout recall, not selected-sample coverage.</p></div><Badge>Demo evaluation</Badge></div>
        {METRICS.filter(([k])=>k!=='map').map(([k,l])=><div className="sc-slice" key={k}><strong>{l}</strong>{ordered.map((a,i)=><div className="sc-slice-arm" key={a.id}><span>{a.label}</span><div className="sc-bar"><i style={{background:colors[i],width:(comparable&&Number.isFinite(current[i]?.metrics?.[k])?current[i].metrics[k]*100:0)+'%'}}/></div><em>{comparable?pct(current[i]?.metrics?.[k]):'—'}</em></div>)}</div>)}
      </section>
    </div>
    <section className="sc-card sc-eval"><div className="sc-head"><div><h2>06 · Downstream evaluation</h2><p>Illustrative model metrics; confidence intervals and paired statistical tests are unavailable.</p></div><Badge>No verified claim</Badge></div>
      <div className="sc-table-scroll"><table><thead><tr><th>Metric</th>{ordered.map(a=><th key={a.id}>{a.label}</th>)}<th>Δ candidate − baseline</th></tr></thead><tbody>
        {METRICS.map(([k,l])=><tr key={k}><th>{l}</th>{current.map((r,i)=><td key={i}>{comparable?fmt(r?.metrics?.[k]):'—'}</td>)}<td>{delta(k)==null?'—':(delta(k)>=0?'+':'')+delta(k).toFixed(3)}</td></tr>)}
        <tr><th>95% CI / paired test</th>{ordered.map(a=><td className="sc-unavailable" key={a.id}>Not recorded</td>)}<td>Inconclusive</td></tr>
      </tbody></table></div>
      <p className="sc-note"><ShieldCheck size={16}/> No strategy winner is declared without recorded holdout evidence, uncertainty bounds and reproducible cost accounting.</p>
    </section>
    <footer className="sc-footer"><span>{exp?.id||'—'} · {rows.length} synthetic records · checkpoint {selectedRound?'R'+selectedRound:'Seed'}</span><button type="button" onClick={()=>navigate('history')}>Browse Runs <ArrowRight size={15}/></button></footer>
  </div>;
}
