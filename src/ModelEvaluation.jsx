import React,{useState} from 'react';
import {ArrowRight,ArrowUpRight,BarChart3,CheckCircle2,ChevronRight,Database,FileJson,Filter,Info,Plus,Search,ShieldCheck,UploadCloud} from 'lucide-react';
import {evaluationRegistry,count,date,holdouts} from './data.js';
import {ResultImportDrawer} from './ResultImportDrawer.jsx';
import './model-evaluation.css';

const names={map:'mAP50–95',map50_95:'mAP50–95',recall:'Recall',precision:'Precision',ap50:'AP50',vru:'VRU recall',vru_recall:'VRU recall',night:'Night recall',rain:'Rain / fog recall',ece:'ECE'};
const pct=(n)=>Number.isFinite(n)?Number(n).toFixed(3):'—';
const statusFor=r=>r.recordType==='synthetic_fixture'?'Synthetic fixture':r.status||'Unverified';
const labelModel=r=>r.modelVersionId||'Model not recorded';
const fields=['map','recall','vru','night','rain'];
export function ModelEvaluation({navigate,routePath='',evaluationImports=[],setEvaluationImports=()=>{},modelRegistryState=[],datasets=[],runs=[],notify}){
  const params=new URLSearchParams(routePath.split('?')[1]||'');
  const records=[...evaluationImports.map(r=>({...r,sourceType:'local'})),...evaluationRegistry.map(r=>({...r,sourceType:'fixture'}))];
  const [recordId,setRecordId]=useState(params.get('record')||records[0]?.id||'');
  const [query,setQuery]=useState(''),[statusFilter,setStatusFilter]=useState('all');
  const [tab,setTab]=useState('metrics');
  const [drawer,setDrawer]=useState(params.get('import')==='1');
  const selected=records.find(r=>r.id===recordId)||records[0];
  const listed=records.filter(r=>(statusFilter==='all'||(statusFilter==='fixture'&&r.sourceType==='fixture')||(statusFilter==='local'&&r.sourceType==='local'))
    &&([r.id,r.modelVersionId,r.datasetVersionId,r.holdoutId,r.experimentId].join(' ').toLowerCase().includes(query.toLowerCase())));
  const metrics=selected?.metrics||{};
  const local=selected?.sourceType==='local';
  const evalFields=Object.entries(metrics).filter(([key])=>!['training_seed','round'].includes(key));
  const openRecord=r=>{setRecordId(r.id);setTab('metrics');navigate('/model-evaluation?record='+encodeURIComponent(r.id));};
  const onSave=r=>{setEvaluationImports(prev=>[...prev,r]);setRecordId(r.id);setDrawer(false);setTab('metrics');
    navigate('/model-evaluation?record='+encodeURIComponent(r.id));
    notify?.('Evaluation intake saved locally; no verified evaluation record created.');};
  return <div className="page me-page">
    <header className="me-title"><div><span className="me-overline">MODELS / EVALUATION</span><h1>Model Evaluation</h1><p>Browse evaluation records, inspect metrics and receive external model results.</p></div>
      <div className="me-top-actions"><button type="button" className="me-ghost" onClick={()=>navigate('comparison')}>Strategy Comparison <ArrowUpRight size={15}/></button>
        <button type="button" className="me-primary" onClick={()=>setDrawer(true)}><Plus size={16}/> Import evaluation</button></div></header>
    <div className="me-summary">
      <div><span>Recorded evaluations</span><strong>{records.length}</strong></div>
      <div><span>Illustrative fixtures</span><strong>{evaluationRegistry.length}</strong></div>
      <div><span>Local intake records</span><strong>{evaluationImports.length}</strong></div>
      <div><span>Backend verified</span><strong>0</strong><small>Preview only</small></div>
    </div>
    <div className="me-workspace">
      <section className="me-list">
        <div className="me-section-header"><div><h2>Evaluation records</h2><p>Model × dataset × holdout</p></div>
          <div className="me-search"><Search size={15}/><input aria-label="Search evaluation records" placeholder="Search model, dataset, run…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
        <div className="me-pills" role="group" aria-label="Record source">{[['all','All'],['fixture','Synthetic fixtures'],['local','Local imports']].map(([k,l])=>
          <button key={k} type="button" className={statusFilter===k?'active':''} onClick={()=>setStatusFilter(k)}>{l}</button>)}</div>
        <div className="me-record-table"><table><thead><tr><th>Model / Evaluation</th><th>Dataset</th><th>mAP50–95</th><th>Status</th><th></th></tr></thead>
          <tbody>{listed.map(r=><tr key={r.id} className={selected?.id===r.id?'selected':''} onClick={()=>openRecord(r)}>
            <td><strong>{labelModel(r)}</strong><small>{r.id}</small></td><td>{r.datasetVersionId||'—'}<small>{r.holdoutId||'Holdout unrecorded'}</small></td>
            <td className="me-number">{pct(r.metrics?.map50_95??r.metrics?.map)}</td><td><span className={'me-status '+(r.sourceType==='local'?'is-local':'is-fixture')}>{statusFor(r)}</span></td><td><ChevronRight size={16}/></td></tr>)}</tbody></table>
          {!listed.length&&<p className="me-empty">No evaluation records match your filters.</p>}</div>
        <div className="me-list-foot">{listed.length} results · Synthetic values cannot be used as verified model evidence</div>
      </section>
      <section className="me-details">
        {selected?<><header className="me-detail-heading"><div><span>SELECTED EVALUATION</span><h2>{labelModel(selected)}</h2><p>{selected.id}</p></div>
          <span className={'me-status '+(local?'is-local':'is-fixture')}>{statusFor(selected)}</span></header>
          <div className="me-context"><div><span>Dataset version</span><strong>{selected.datasetVersionId||'Not recorded'}</strong></div>
            <div><span>Holdout</span><strong>{selected.holdoutId||'Not recorded'}</strong></div></div>
          <div className="me-detail-tabs" role="tablist" aria-label="Evaluation detail tabs">
            {[['metrics','Metrics'],['classes','Per-class'],['slices','Safety slices'],['artifacts','Artifacts'],['provenance','Provenance']].map(([k,l])=><button type="button" role="tab" aria-selected={tab===k} className={tab===k?'active':''} key={k} onClick={()=>setTab(k)}>{l}</button>)}
          </div>
          {tab==='metrics'&&<div className="me-metrics">
            <div className="me-metric-cards">{[['map50_95','mAP50–95'],['recall','Recall'],['vru_recall','VRU recall']].map(([key,label])=>{
              const val=metrics[key]??metrics[{map50_95:'map',vru_recall:'vru'}[key]];
              return <div key={key}><span>{label}</span><strong>{pct(val)}</strong></div>})}</div>
            <h3>Recorded scalar metrics</h3>
            {evalFields.length?<div className="me-metric-list">{evalFields.map(([k,v])=><div key={k}><span>{names[k]||k.replaceAll('_',' ')}</span><strong>{pct(v)}</strong></div>)}</div>:
              <p className="me-empty">No metric values recorded. A remote-URI intake must be fetched and validated by the backend.</p>}
          </div>}
          {tab==='classes'&&<div className="me-empty-tab"><BarChart3 size={25}/><h3>Per-class evaluation not recorded</h3><p>Class AP and recall require an evaluation artifact with an explicit class schema and matched holdout.</p></div>}
          {tab==='slices'&&<div className="me-metrics"><h3>Recorded evaluation slices</h3>
            {['vru','night','rain'].some(k=>Number.isFinite(metrics[k]))?<div className="me-slice-list">{[['vru','VRU recall'],['night','Night recall'],['rain','Rain / fog recall']].map(([k,l])=><div key={k}><span>{l}</span><div><i style={{width:Math.min(100,Math.max(0,(metrics[k]||0)*100))+'%'}}/></div><strong>{pct(metrics[k])}</strong></div>)}</div>:
              <p className="me-empty">No slice-level metrics in this record. This is not a statement about selected sample coverage.</p>}</div>}
          {tab==='artifacts'&&<div className="me-empty-tab"><FileJson size={25}/><h3>Artifact verification unavailable</h3>
            <p>{selected.artifactUri?'Recorded URI: '+selected.artifactUri:'No downloadable artifact was registered.'} A backend worker must retrieve and hash bytes before allowing verified exports.</p></div>}
          {tab==='provenance'&&<div className="me-provenance"><h3>Evaluation provenance</h3>
            {[['Record type',selected.recordType||'Unknown'],['Experiment',selected.experimentId||'Not linked'],['Training recipe',selected.recipeId||'Not recorded'],['Model',selected.modelVersionId||'Not recorded'],
              ['Dataset',selected.datasetVersionId||'Not recorded'],['Holdout',selected.holdoutId||'Not recorded'],['Training seed',selected.trainingSeed??'Not recorded'],['Source',selected.sourceType]].map(([k,v])=>
              <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>}
          <div className="me-trust"><Info size={16}/><span>{local?'Imported locally; metric structure was checked but the holdout, weights and artifacts were not verified.':'Synthetic benchmark record. The displayed figures are fictional and are not measured RoadSift performance.'}</span></div>
        </>:<p className="me-empty">Choose an evaluation record to inspect.</p>}
      </section>
    </div>
    {drawer&&<ResultImportDrawer kind="evaluation" onClose={()=>setDrawer(false)} onSave={onSave}
      context={{name:'External evaluation',modelId:modelRegistryState[0]?.id,datasetId:datasets[0]?.id,holdoutId:'holdout_v1',
        models:modelRegistryState,datasets,holdouts:Array.isArray(holdouts)?holdouts:[{id:'holdout_v1',name:'Fixed Holdout v1'}],runs}}/>}
  </div>;
}
