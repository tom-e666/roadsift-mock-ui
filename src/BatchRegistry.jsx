import React,{useMemo,useState} from 'react';
import {ArrowRight,CheckCircle2,ClipboardCheck,Filter,Layers3,PackageCheck,Play,Search} from 'lucide-react';
import {Badge,Button} from './components/UI.jsx';
import {count,date} from './data.js';
import './batch-registry.css';

const tabs=[['all','All batches'],['review','Needs review'],['post','Post-review'],['closed','Closed']];
function bucket(b){
  if(b.status==='In review')return 'review';
  if(b.status==='Closed')return 'closed';
  return 'post';
}
function progress(b){return Math.min(100,Math.round(100*(b.review?.reviewed||0)/Math.max(1,b.count||0)));}
function workflow(b){
  if(b.status==='In review')return {title:'Review in progress',hint:'Human decisions outstanding',variant:'review'};
  if(b.status==='Closed')return {title:'Closed',hint:'Registry record',variant:'closed'};
  if(b.status==='Annotation returned')return {title:'Return received',hint:b.annotationReturn?.validation==='Warning'?'Requires reconciliation':'Return registered',variant:'post'};
  if(b.status==='Handed off')return {title:'Handed off',hint:'Annotation handoff recorded',variant:'post'};
  if(b.status==='Curated')return {title:'Review finalized',hint:'Handoff not confirmed',variant:'post'};
  return {title:b.status||'Unknown',hint:'Inspect batch record',variant:'post'};
}
export function BatchRegistry({selectionBatches=[],pools=[],navigate}){
  const [tab,setTab]=useState('all'),[search,setSearch]=useState(''),[strategy,setStrategy]=useState('All');
  const counts=useMemo(()=>({
    all:selectionBatches.length,review:selectionBatches.filter(b=>bucket(b)==='review').length,
    post:selectionBatches.filter(b=>bucket(b)==='post').length,
    closed:selectionBatches.filter(b=>bucket(b)==='closed').length
  }),[selectionBatches]);
  const strategies=['All',...new Set(selectionBatches.map(b=>b.strategy).filter(Boolean))];
  const results=selectionBatches.filter(b=>(tab==='all'||bucket(b)===tab)
    &&(strategy==='All'||b.strategy===strategy)
    &&(b.name+' '+b.id+' '+b.runId+' '+b.strategy).toLowerCase().includes(search.toLowerCase()));
  const open=(b,view='grid')=>navigate('/batches/'+encodeURIComponent(b.id)+'?view='+view+(view==='handoff'&&b.review?.finalizedAt?'&preview=version':''));
  const poolName=b=>pools.find(p=>p.id===b.sourcePoolId)?.name||b.sourcePoolId||'—';
  return <div className="page br-page">
    <header className="br-heading"><div><span className="br-eyebrow">CURATION / BATCH REGISTRY</span><h1>Selection Batches</h1><p>Review and track selection outputs from mining runs through handoff.</p></div>
      <Button icon={Play} onClick={()=>navigate('mining')}>Launch selection run</Button></header>
    <div className="br-stats" aria-label="Batch registry summary">
      <div><Layers3 size={17}/><span>Registered batches</span><strong>{counts.all}</strong></div>
      <div><ClipboardCheck size={17}/><span>Needs review</span><strong>{counts.review}</strong></div>
      <div><PackageCheck size={17}/><span>Post-review</span><strong>{counts.post}</strong></div>
      <div><CheckCircle2 size={17}/><span>Closed</span><strong>{counts.closed}</strong></div>
    </div>
    <section className="br-list">
      <div className="br-list-top">
        <div className="br-tabs" role="tablist" aria-label="Filter batches by workflow phase">
          {tabs.map(([key,name])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'is-active':''} onClick={()=>setTab(key)}>{name}<span>{counts[key]}</span></button>)}
        </div>
        <div className="br-filters"><div className="br-search"><Search size={15}/><input aria-label="Find selection batch" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Batch name, ID, run…"/></div>
          <label><Filter size={14}/><select aria-label="Filter by strategy" value={strategy} onChange={e=>setStrategy(e.target.value)}>{strategies.map(v=><option key={v} value={v}>{v==='All'?'All strategies':v}</option>)}</select></label>
        </div>
      </div>
      <div className="br-table-scroll"><table className="br-table"><thead><tr><th>Batch / Source</th><th>Strategy</th><th>Selected</th><th>Review progress</th><th>Annotation</th><th>Workflow state</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>{results.map(b=>{const step=workflow(b),pct=progress(b);return <tr key={b.id}>
          <td><button type="button" className="br-batch-name" onClick={()=>open(b)}><strong>{b.name}</strong><span>{b.id}</span></button><small title={b.sourcePoolId}>{poolName(b)} · {b.runId}</small></td>
          <td><span className="br-strategy">{b.strategy||'—'}</span></td>
          <td className="br-num">{count(b.count)}</td>
          <td><div className="br-progress"><div><strong>{pct}%</strong><span>{count(b.review?.reviewed||0)} / {count(b.count)}</span></div><div className="br-track"><i style={{width:pct+'%'}}/></div></div></td>
          <td><div className="br-annotation"><strong>{b.annotationReturn?.status||'Not started'}</strong><small>{b.annotationReturn?.validation==='Warning'?'Reconciliation needed':b.annotationReturn?.returned?count(b.annotationReturn.returned)+' returned':'—'}</small></div></td>
          <td><span className={'br-phase is-'+step.variant}>{step.title}</span><small>{step.hint}</small></td>
          <td className="br-date">{b.updatedAt?date(b.updatedAt):'—'}</td>
          <td><div className="br-row-actions"><button className="br-action-primary" onClick={()=>open(b,b.status==='In review'?'grid':'handoff')}>{b.status==='In review'?'Review':'View version'}<ArrowRight size={14}/></button><button className="br-action-secondary" onClick={()=>open(b,'handoff')} title="Open Curated Batch release">Curated</button><button className="br-action-secondary" onClick={()=>open(b,'return')} title="Import external annotation results">Import labels</button></div></td>
        </tr>})}</tbody></table>
        {!results.length&&<div className="br-empty">No batches match your filters. Try another status or strategy.</div>}
      </div>
      <div className="br-foot"><span>{results.length} matching batches</span><span>Only recorded batch states are shown; finalize and delivery require authoritative backend validation.</span></div>
    </section>
  </div>;
}
