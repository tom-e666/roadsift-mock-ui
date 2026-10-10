import React,{useState} from 'react';
import {ArrowRight,ArrowUpRight,CheckCircle2,ChevronRight,ClipboardCheck,FileCheck2,FileWarning,Filter,Layers3,PackageCheck,Search,Send,UploadCloud} from 'lucide-react';
import {count,date} from './data.js';
import {ResultImportDrawer} from './ResultImportDrawer.jsx';
import './annotation-jobs.css';

export function AnnotationJobs({selectionBatches=[],annotationImports=[],setAnnotationImports=()=>{},navigate,routePath='',notify}){
  const params=new URLSearchParams(routePath.split('?')[1]||'');
  const sourceBatches=selectionBatches.filter(b=>b.handoff?.status&&b.handoff.status!=='Not started');
  const jobs=sourceBatches.map(b=>{
    const intakes=annotationImports.filter(x=>x.batchId===b.id);
    const a=b.annotationReturn||{};
    const expected=Number.isFinite(a.expected)?a.expected:(b.review?.approved||0);
    const returned=Number.isFinite(a.returned)?a.returned:0;
    const gap=Math.max(0,expected-returned);
    const isReconcile=a.status==='Needs reconciliation'||a.validation==='Warning'||(returned>0&&gap>0);
    const state=isReconcile?'Needs reconciliation':intakes.length?'Local intake saved':a.status==='Validated'?'Returned · fixture':returned>0?'Returned · fixture':'Awaiting return';
    return{key:'job:'+b.id,batch:b,intakes,expected,returned,gap,state,
      source:b.handoff?.destination||'External annotator',sentAt:b.handoff?.sentAt||null};
  });
  const defaultJob=jobs.find(j=>j.state==='Needs reconciliation')?.key||jobs[0]?.key||'';
  const requested=params.get('job');
  const [selected,setSelected]=useState(requested?(requested.startsWith('job:')?requested:'job:'+requested):defaultJob);
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [drawer,setDrawer]=useState(params.get('import')==='1');
  const [selectedIntake,setSelectedIntake]=useState(null);
  const active=jobs.find(j=>j.key===selected)||jobs[0];
  const available=jobs.filter(j=>(filter==='all'||(filter==='action'&&j.state==='Needs reconciliation')||(filter==='waiting'&&j.state==='Awaiting return')||(filter==='received'&&j.returned>0))
    &&(j.batch.name+' '+j.batch.id+' '+j.source).toLowerCase().includes(query.toLowerCase()));
  const pick=j=>{setSelected(j.key);setSelectedIntake(null);navigate('/annotation-jobs?job='+encodeURIComponent(j.batch.id));};
  const save=record=>{
    setAnnotationImports(prev=>[...prev,record]);
    setSelectedIntake(record);setDrawer(false);
    notify?.('Local annotation intake saved; server reconciliation remains pending.');
  };
  return <div className="page aj-page">
    <header className="aj-header"><div><span className="aj-eyebrow">ANNOTATION / OPERATIONS</span><h1>Annotation Jobs</h1><p>Track delivered batches, inspect returned labels and resolve reconciliation issues.</p></div>
      <button className="aj-header-link" onClick={()=>navigate('batches')}><Layers3 size={16}/> Selection Batches <ArrowUpRight size={14}/></button></header>
    <div className="aj-summary">
      <div><Send size={16}/><span>Deliveries recorded</span><strong>{jobs.length}</strong></div>
      <div><FileWarning size={16}/><span>Needs reconciliation</span><strong>{jobs.filter(j=>j.state==='Needs reconciliation').length}</strong></div>
      <div><FileCheck2 size={16}/><span>Return recorded</span><strong>{jobs.filter(j=>j.returned>0).length}</strong></div>
      <div><ClipboardCheck size={16}/><span>Local intakes</span><strong>{annotationImports.length}</strong></div>
    </div>
    <div className="aj-shell">
      <section className="aj-registry">
        <div className="aj-list-toolbar"><div><h2>Annotation deliveries</h2><p>Recorded fixture deliveries and local intake activity</p></div>
          <div className="aj-filter"><Search size={14}/><input aria-label="Search annotation jobs" placeholder="Search delivery, batch or vendor..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
        <nav className="aj-tabs" aria-label="Annotation job status">
          {[['all','All jobs'],['action','Needs attention'],['received','Returned'],['waiting','Awaiting return']].map(([id,l])=>
            <button type="button" key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{l}</button>)}
        </nav>
        <div className="aj-table-wrap"><table className="aj-table"><thead><tr><th>Job / Source</th><th>Returned</th><th>Status</th><th>Sent</th><th></th></tr></thead>
          <tbody>{available.map(j=><tr key={j.key} className={active?.key===j.key?'selected':''} onClick={()=>pick(j)}>
            <td><strong>{j.batch.name}</strong><small>{j.batch.id}</small><small>{j.source}</small></td>
            <td><strong>{j.returned?count(j.returned):'—'}</strong><small>of {count(j.expected)} expected</small></td>
            <td><span className={'aj-chip '+(j.state==='Needs reconciliation'?'warning':j.returned>0?'complete':'waiting')}>{j.state}</span></td>
            <td>{date(j.sentAt)}</td><td><ChevronRight size={16}/></td>
          </tr>)}</tbody></table>{!available.length&&<div className="aj-none">No deliveries match these filters.</div>}</div>
        <div className="aj-list-bottom">{available.length} matching jobs · fixtures are illustrative records</div>
      </section>
      <aside className="aj-detail">
        {active?<><div className="aj-detail-header"><span>SELECTED DELIVERY</span><span className={'aj-chip '+(active.state==='Needs reconciliation'?'warning':active.returned>0?'complete':'waiting')}>{active.state}</span></div>
          <h2>{active.batch.name}</h2><p>{active.source}</p>
          <div className="aj-progress-info"><div><small>Expected</small><strong>{count(active.expected)}</strong></div>
            <div><small>Returned</small><strong>{count(active.returned)}</strong></div>
            <div><small>Difference</small><strong>{count(active.gap)}</strong></div></div>
          <div className="aj-progress-track"><i style={{width:(active.expected?Math.min(100,active.returned/active.expected*100):0)+'%'}}/></div>
          {active.state==='Needs reconciliation'?<div className="aj-exception"><FileWarning size={18}/><div><strong>{count(active.gap)} expected samples not counted as returned</strong>
            <p>The fixture records a count mismatch. Exact missing sample IDs, unknown classes and invalid boxes cannot be inferred until a returned file and membership manifest are compared.</p></div></div>:
            <div className="aj-note"><CheckCircle2 size={17}/><span>{active.returned>0?'Return count is recorded in the fixture. Content integrity is not verified here.':'No returned file has been registered.'}</span></div>}
          <div className="aj-detail-info"><h3>Delivery context</h3><dl><div><dt>Selection batch</dt><dd>{active.batch.id}</dd></div><div><dt>Dispatched</dt><dd>{date(active.sentAt)}</dd></div><div><dt>Return URI</dt><dd>{active.batch.annotationReturn?.uri||'Not recorded'}</dd></div></dl></div>
          <div className="aj-actions"><button className="aj-primary" onClick={()=>setDrawer(true)}><UploadCloud size={16}/> Import return</button>
            <button className="aj-secondary" onClick={()=>navigate('/batches/'+encodeURIComponent(active.batch.id)+'?view=handoff&preview=version')}>View curated batch <ArrowRight size={14}/></button></div>
          {active.intakes.length>0&&<div className="aj-intakes"><h3>Local intake history</h3>{active.intakes.slice().reverse().map(record=><button key={record.id} onClick={()=>setSelectedIntake(record)}>
            <span><strong>{record.fileName||record.sourceUri}</strong><small>{record.status} · {date(record.createdAt)}</small></span><ChevronRight size={15}/></button>)}</div>}
          {selectedIntake&&<div className="aj-selected-record"><strong>Local intake · {selectedIntake.id}</strong>
            <p>{selectedIntake.summary?count(selectedIntake.summary.samples)+' referenced samples; '+count(selectedIntake.summary.annotations)+' boxes':'Object URI registered, content not fetched'}</p>
            <p>Exact membership, class mapping and artifact bytes still require backend verification.</p></div>}
        </>:<div className="aj-note">No recorded annotation delivery exists yet. New handoffs will appear here.</div>}
      </aside>
    </div>
    {drawer&&active&&<ResultImportDrawer kind="annotation" context={{jobKey:active.key,batchId:active.batch.id,name:active.batch.name}}
      onSave={save} onClose={()=>setDrawer(false)}/>}
  </div>;
}
