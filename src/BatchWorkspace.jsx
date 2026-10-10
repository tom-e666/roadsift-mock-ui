import React, {useEffect,useMemo,useState} from 'react';
import {ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Download, Edit3, Grid2X2, LockKeyhole, PackageCheck, Search, ListFilter, X} from 'lucide-react';
import {Button, Badge} from './components/UI.jsx';
import {frames,count,date} from './data.js';
import {SampleMedia} from './SampleMedia.jsx';
import {QuickBoxEditor} from './QuickBoxEditor.jsx';
import './batch-workspace.css';

const REVIEW=['Pending','Approved','Rejected','Deferred'];
const choices={Approved:'approved',Rejected:'rejected',Deferred:'deferred'};
const formatDecision=v=>v?.decision||'Pending';
function downloadPlan(name,data){
  const uri=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=uri;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(uri),1000);
}
function Metric({label,value,detail}){return <div className="bw-metric"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>}
function Rule({ok,heading,detail}){return <div className={'bw-rule '+(ok?'is-good':'is-blocked')}><span>{ok?<CheckCircle2 size={18}/>:<CircleAlert size={18}/>}</span><div><strong>{heading}</strong><p>{detail}</p></div></div>}
function Score({label,value}){return <div className="bw-score"><span>{label}</span><strong>{Number(value||0).toFixed(2)}</strong><div><i style={{width:Math.max(0,Math.min(100,Number(value||0)*100))+'%'}}/></div></div>}

export function BatchWorkspace({selectionBatches=[],setSelectionBatches,navigate,notify,routePath}){
  const raw=routePath.split('?')[0].split('/')[2]||'';
  const id=decodeURIComponent(raw);
  const batch=selectionBatches.find(b=>b.id===id);
  const viewFromUrl=new URLSearchParams(routePath.split('?')[1]||'').get('view');
  const [view,setView]=useState(['grid','review','handoff'].includes(viewFromUrl)?viewFromUrl:'grid');
  const [query,setQuery]=useState(''),[domain,setDomain]=useState('All'),[statusFilter,setStatusFilter]=useState('All'),[sort,setSort]=useState('uncertainty');
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(20);
  const [selectedIds,setSelectedIds]=useState([]);
  const [activeId,setActiveId]=useState(null),[previewId,setPreviewId]=useState(null),[reason,setReason]=useState('');
  const [inspectorTab,setInspectorTab]=useState('scores'),[editMode,setEditMode]=useState(false),[editorDirty,setEditorDirty]=useState(false);
  const [purpose,setPurpose]=useState('annotation'),[target,setTarget]=useState('manifest');
  const [destination,setDestination]=useState('download');
  const [destinationPath,setDestinationPath]=useState('curated/'+id);
  const [curatedName,setCuratedName]=useState('curated_'+id.replace(/[^a-zA-Z0-9_-]/g,'_'));
  const [versionLabel,setVersionLabel]=useState('v1');
  const [exportJobName,setExportJobName]=useState('export_'+id.replace(/[^a-zA-Z0-9_-]/g,'_'));
  const [handoffNotes,setHandoffNotes]=useState('');
  const [includes,setIncludes]=useState({metadata:true,reviewDecisions:false});
  useEffect(()=>{if(viewFromUrl&&['grid','review','handoff'].includes(viewFromUrl))setView(viewFromUrl)},[viewFromUrl,id]);
  useEffect(()=>{setSelectedIds([]);setActiveId(null);setEditMode(false)},[id]);
  useEffect(()=>{setEditMode(false);setEditorDirty(false)},[activeId,view]);
  const openTab=next=>{
    if(view==='review'&&next!==view&&editorDirty&&!window.confirm('Unsaved bounding boxes will be lost. Leave Focus Review?'))return;
    setView(next);navigate('/batches/'+encodeURIComponent(id)+'?view='+next);
  };
  const workspace=batch?.reviewWorkspace||{};
  const decisions=workspace.decisions||{},edits=workspace.edits||{};
  const isOpen=batch?.status==='In review';
  const viewable=frames; // the shared fixture gallery; the backend must supply verified batch members later
  const filtered=useMemo(()=>viewable.filter(f=>
    (domain==='All'||f.domain===domain) &&
    (statusFilter==='All'||formatDecision(decisions[f.id])===statusFilter) &&
    (String(f.id)+' '+f.video+' '+f.domain).toLowerCase().includes(query.toLowerCase())
  ).sort((a,b)=>sort==='uncertainty'?b.uncertainty-a.uncertainty:
    sort==='safety'?b.safety-a.safety:
    sort==='id'?a.id.localeCompare(b.id):0),[viewable,query,domain,statusFilter,sort,decisions]);
  useEffect(()=>{setPage(1)},[domain,statusFilter,sort,query,pageSize]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
  const currentPage=Math.min(page,pageCount);
  const startIndex=(currentPage-1)*pageSize;
  const pageSamples=filtered.slice(startIndex,startIndex+pageSize);
  const pageSelected=pageSamples.length>0&&pageSamples.every(item=>selectedIds.includes(item.id));
  const previewCounts=Object.fromEntries(['All',...REVIEW].map(key=>[key,key==='All'?viewable.length:viewable.filter(f=>formatDecision(decisions[f.id])===key).length]));
  const togglePage=()=>setSelectedIds(previous=>{
    const next=new Set(previous);
    if(pageSelected)pageSamples.forEach(item=>next.delete(item.id));
    else pageSamples.forEach(item=>next.add(item.id));
    return [...next];
  });
  const preview=filtered.find(x=>x.id===previewId)||filtered[0]||null;
  const active=frames.find(x=>x.id===activeId)||filtered[0]||null;
  const activeIndex=filtered.findIndex(x=>x.id===active?.id);
  const selectedCount=selectedIds.length;
  const progress=batch?Math.min(100,Math.round(100*(batch.review?.reviewed||0)/Math.max(1,batch.count))):0;
  const reviewedInPreview=Object.values(decisions).filter(v=>v?.decision&&v.decision!=='Pending').length;
  const updateWorkspace=change=>{
    if(!batch||!isOpen){notify('This batch is not open for review');return;}
    setSelectionBatches(list=>list.map(b=>{
      if(b.id!==id)return b;
      const previous=b.reviewWorkspace||{};
      return {...b,updatedAt:new Date().toISOString(),
        reviewWorkspace:{...previous,...change(previous)}};
    }));
  };
  const decide=(ids,decision)=>{
    if(!isOpen)return;
    const reasonText=reason.trim();
    if(decision==='Rejected'&&!reasonText){notify('Add a rejection reason first');return;}
    updateWorkspace(old=>{
      const next={...(old.decisions||{})};
      ids.forEach(sampleId=>{next[sampleId]={decision,reason:decision==='Rejected'?reasonText:null,updatedAt:new Date().toISOString(),scope:'fixture-preview'};});
      return {decisions:next};
    });
    notify(ids.length+' preview sample(s) marked '+decision+'. These decisions are not verified membership approvals.');
    if(view==='review'&&ids.length===1&&!editorDirty){const position=filtered.findIndex(s=>s.id===ids[0]);setActiveId(filtered[(position+1)%filtered.length]?.id||ids[0]);}
    else if(view==='review'&&editorDirty)notify('Decision saved in preview; save box drafts before moving to another sample.');
  };
  const toggle=id=>setSelectedIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const nextSample=delta=>{
    if(editorDirty&&!window.confirm('This image contains unsaved box edits. Discard changes and navigate?'))return;
    if(filtered.length)setActiveId(filtered[(Math.max(0,activeIndex)+delta+filtered.length)%filtered.length].id);
  };
  const saveBoxes=boxes=>{
    if(!active)return;
    updateWorkspace(old=>({edits:{...(old.edits||{}),[active.id]:boxes}}));
    notify('Draft bounding boxes saved locally for '+active.id+'; not registered as ground truth.');
  };
  useEffect(()=>{
    if(view!=='review'||!isOpen)return;
    const handler=e=>{
      if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.closest?.('.qb-editor')||e.metaKey||e.ctrlKey||e.altKey)return;
      if(e.key==='ArrowRight'){e.preventDefault();nextSample(1)}
      if(e.key==='ArrowLeft'){e.preventDefault();nextSample(-1)}
      if(editMode)return;
      const action={a:'Approved',r:'Rejected',d:'Deferred'}[e.key.toLowerCase()];
      if(action&&active){e.preventDefault();decide([active.id],action)}
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[view,isOpen,active,activeIndex,filtered,editMode,reason,decisions]);
  if(!batch)return <div className="page bw-page"><Button icon={ArrowLeft} onClick={()=>navigate('batches')}>Back to Selection Batches</Button><div className="bw-notice">Selection Batch not found.</div></div>;
  // Finalize validates approved membership; export validates frozen bytes and destination.
  // These stages have different preconditions: a not-yet-created artifact cannot be verified before Freeze.
  const pending=Math.max(0,batch.count-(batch.review?.reviewed||0));
  const freezeChecks=[
    {heading:'Immutable source membership',ok:false,detail:'A backend-verified sample ID list and pool snapshot are required; fixture gallery images are not source membership.'},
    {heading:'Review decisions & membership accounting',ok:false,detail:'Official aggregate: '+count(batch.review?.reviewed||0)+'/'+count(batch.count)+' reviewed, '+count(pending)+' pending. Sample-level decisions and the final eligible subset must be reconciled.'},
    {heading:'Privacy clearance for eligible samples',ok:false,detail:'A verified per-sample privacy pass/block ledger is required before releasing images outside the controlled workspace.'},
    {heading:'Finalize policy / EXACT-N shortfall',ok:false,detail:'The backend must confirm whether the approved safe subset may be frozen below target or requires top-up.'}
  ];
  const formatOptions=purpose==='training'
    ?[['manifest','Manifest + metadata'],['zip','ZIP · images + labels'],['coco','COCO · verified 2D annotations'],['yolo','YOLO · verified 2D annotations']]
    :[['manifest','Manifest + metadata'],['zip','ZIP · images + manifest']];
  const effectiveIncludes={
    manifest:true,sampleIds:true,metadata:includes.metadata,
    sourceImages:target!=='manifest',
    reviewDecisions:includes.reviewDecisions,
    verifiedAnnotations:purpose==='training'
  };
  const namePattern=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
  const configIssues=[
    ...(!namePattern.test(curatedName)?['Curated name must be 1–64 letters, numbers, dots, hyphens or underscores.']:[]),
    ...(!namePattern.test(versionLabel)?['Requested version label is invalid.']:[]),
    ...(!namePattern.test(exportJobName)?['Export job name is invalid.']:[]),
    ...(destination==='r2'&&!destinationPath.trim()?['Choose a destination prefix for R2.']:[])
  ];
  const freezeReady=freezeChecks.every(x=>x.ok)&&configIssues.length===0;
  const exportChecks=[
    {heading:'Curated version frozen',ok:false,detail:'An authoritative immutable curated version ID must exist.'},
    {heading:'Manifest & artifact integrity',ok:false,detail:'After Freeze, verify generated manifest and output artifact bytes (SHA-256).'},
    {heading:'Destination availability',ok:false,detail:destination==='r2'?'R2 bucket/prefix credentials and connectivity are not configured in this preview.':'Actual export jobs are not connected in this frontend preview.'},
    {heading:'Verified annotation coverage',ok:purpose!=='training',detail:purpose==='training'?'Labels must pass schema, provenance and completeness validation before training export.':'Optional for annotation handoff.'}
  ];
  const exportReady=false; // Never create a real export without a validated frozen version and working backend.
  const exportPlan=()=>{
    downloadPlan(batch.id+'-handoff-plan-preview.json',{
      schemaVersion:'roadsift.handoff-preview.v2',previewOnly:true,notAnExport:true,
      source:{batchId:batch.id,runId:batch.runId,poolSnapshot:batch.sourceSnapshot||null,
        membershipHashRecorded:batch.membershipHash||null,requestedCount:batch.count,recordedReviewSummary:batch.review||null},
      curatedVersionRequest:{name:curatedName,requestedLabel:versionLabel,notes:handoffNotes.trim()},
      exportRequest:{name:exportJobName,purpose,format:target,destination:{type:destination,
        ...(destination==='r2'?{prefix:destinationPath.trim()}: {})},
        includes:effectiveIncludes,previewOnly:true},
      // Preview decisions are deliberately not represented as verified selection membership or ground truth.
      previewDecisionsIncluded:includes.reviewDecisions,
      previewDecisionCount:includes.reviewDecisions?Object.keys(decisions).length:0,
      validation:{freezeReady,exportReady,freezeBlockers:freezeChecks.filter(x=>!x.ok).map(x=>x.heading),
        exportBlockers:exportChecks.filter(x=>!x.ok).map(x=>x.heading),configurationIssues:configIssues}
    });
    notify('Preview handoff plan downloaded; no curated version or export artifact was created.');
  };
  return <div className="page bw-page">
    <div className="bw-breadcrumb"><button onClick={()=>navigate('batches')}><ArrowLeft size={14}/> Selection Batches</button><span>/</span>{batch.id}</div>
    <header className="bw-header bw-header--compact">
      <div className="bw-header-title">
        <div className="bw-heading-line"><h1>{batch.name}</h1><Badge>{batch.status}</Badge></div>
        <div className="bw-subhead"><span>{batch.id}</span><span className="bw-meta-separator">·</span><span>Run {batch.runId}</span><span className="bw-meta-separator">·</span><span>{count(batch.count)} selected samples</span></div>
      </div>
      <div className="bw-header-actions">
        <Button onClick={()=>openTab('handoff')}>Finalize &amp; Handoff</Button>
        <Button variant="primary" onClick={()=>openTab('review')} icon={Edit3}>Open Focus Review</Button>
      </div>
    </header>
    <section className="bw-overview" aria-label="Batch review summary">
      <div className="bw-overview-progress">
        <div className="bw-progress-heading"><span>Review progress <small>· recorded batch aggregate</small></span><strong>{count(batch.review?.reviewed||0)} / {count(batch.count)} <em>{progress}%</em></strong></div>
        <div className="bw-progress-track" role="progressbar" aria-label="Recorded review progress" aria-valuemin={0} aria-valuemax={batch.count} aria-valuenow={batch.review?.reviewed||0}><i style={{width:progress+'%'}}/></div>
      </div>
      <div className="bw-overview-stats">
        <div><i className="bw-status-dot is-approved"/><span>Approved</span><strong>{count(batch.review?.approved||0)}</strong></div>
        <div><i className="bw-status-dot is-rejected"/><span>Rejected</span><strong>{count(batch.review?.rejected||0)}</strong></div>
        <div><i className="bw-status-dot is-deferred"/><span>Deferred</span><strong>{count(batch.review?.deferred||0)}</strong></div>
        <div><i className="bw-status-dot is-pending"/><span>Pending</span><strong>{count(Math.max(0,batch.count-(batch.review?.reviewed||0)))}</strong></div>
      </div>
    </section>
    <div className="bw-tabs" role="tablist" aria-label="Selection batch workspace">
      {[['grid','Review Queue',Grid2X2],['review','Focus Review & Quick Edit',Edit3],['handoff','Finalize & Handoff',PackageCheck]].map(([key,label,Icon])=>
        <button key={key} type="button" role="tab" aria-selected={view===key} className={view===key?'active':''} onClick={()=>openTab(key)}><Icon size={15}/>{label}</button>)}
    </div>
    {view!=='handoff'&&<div className="bw-data-note"><CircleAlert size={14}/><span><strong>Preview gallery</strong> · {frames.length} illustrative frames, not verified members of this batch. Local review edits do not change official progress.</span></div>}
    {view==='grid'&&<div className="bw-queue-layout">
      <aside className="bw-queue-sidebar" aria-label="Review queue filters">
        <div className="bw-queue-heading"><ListFilter size={15}/><strong>Review queue</strong></div>
        <div className="bw-queue-filter-title">PREVIEW STATUS</div>
        <div className="bw-status-filters">
          {['All',...REVIEW].map(key=><button type="button" key={key} aria-pressed={statusFilter===key} className={statusFilter===key?'is-active':''} onClick={()=>setStatusFilter(key)}>
            <span>{key!=='All'&&<i className={'bw-status-dot is-'+key.toLowerCase()}/>} {key==='All'?'All samples':key}</span><strong>{previewCounts[key]}</strong>
          </button>)}
        </div>
        <div className="bw-queue-filter-title">DOMAIN</div>
        <select aria-label="Filter preview samples by domain" value={domain} onChange={e=>setDomain(e.target.value)}><option value="All">All domains</option>{[...new Set(frames.map(f=>f.domain))].map(x=><option key={x} value={x}>{x}</option>)}</select>
        <div className="bw-queue-help">Status counts above refer to the local preview gallery, not the complete batch.</div>
        <button className="bw-clear-filters" type="button" onClick={()=>{setDomain('All');setStatusFilter('All');setQuery('');setSort('uncertainty')}}>Reset filters</button>
      </aside>
      <section className="bw-gallery-main" aria-label="Preview sample gallery">
        <div className="bw-gallery-top">
          <div><h2>Sample review queue</h2><p>{filtered.length} preview samples · {reviewedInPreview} local decisions</p></div>
          <div className="bw-gallery-controls">
            <div className="bw-search"><Search size={15}/><input aria-label="Search gallery" placeholder="Search ID, video, domain…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
            <label className="bw-sort-label">Sort <select aria-label="Sort preview samples" value={sort} onChange={e=>setSort(e.target.value)}><option value="uncertainty">Uncertainty ↓</option><option value="safety">Safety ↓</option><option value="id">Sample ID</option></select></label>
          </div>
        </div>
        <div className="bw-queue-actions">
          <label className="bw-page-select"><input type="checkbox" checked={pageSelected} onChange={togglePage} disabled={!pageSamples.length} aria-label="Select all samples on current page"/> Select page</label>
          <span className="bw-queue-count">{startIndex+Math.min(1,pageSamples.length)}–{startIndex+pageSamples.length} of {filtered.length}</span>
          {selectedCount>0&&<span className="bw-selected-count">{selectedCount} selected</span>}
          <div className="bw-queue-spacer"/>
          <span className="bw-queue-caption">Click an image to inspect and quick-edit</span>
        </div>
        {selectedCount>0&&<div className="bw-bulk"><strong>{selectedCount} selected</strong><input aria-label="Bulk rejection reason" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for rejection…"/>
          <Button disabled={!isOpen} onClick={()=>decide(selectedIds,'Approved')}>Approve</Button>
          <Button disabled={!isOpen} onClick={()=>decide(selectedIds,'Deferred')}>Defer</Button>
          <Button disabled={!isOpen} onClick={()=>decide(selectedIds,'Rejected')}>Reject</Button>
          <Button onClick={()=>setSelectedIds([])}>Clear</Button>
        </div>}
        <div className="bw-grid">
          {pageSamples.map(sample=><article key={sample.id} className={'bw-sample'+(selectedIds.includes(sample.id)?' is-selected':'')+(preview?.id===sample.id?' is-inspected':'')}>
            <button className="bw-card-media" type="button" onClick={()=>setPreviewId(sample.id)} onDoubleClick={()=>{setActiveId(sample.id);openTab('review')}} aria-label={'Preview '+sample.id+' (double click for Focus Review)'}>
              <SampleMedia sample={sample} overlay={false}/>
              <span className="bw-score-pill" title="Uncertainty score">{sample.uncertainty.toFixed(2)}</span>
            </button>
            <label className="bw-check" onClick={e=>e.stopPropagation()}><input aria-label={'Select '+sample.id} type="checkbox" checked={selectedIds.includes(sample.id)} onChange={()=>toggle(sample.id)}/></label>
            <div className="bw-card-details">
              <div className="bw-card-mainline"><strong>{sample.id}</strong><span className={'bw-review-tag is-'+formatDecision(decisions[sample.id]).toLowerCase()}>{formatDecision(decisions[sample.id])}</span></div>
              <p>{sample.domain} <span>·</span> {sample.weather} <span>·</span> Safety {sample.safety.toFixed(2)}</p>
            </div>
          </article>)}
        </div>
        {!filtered.length&&<p className="bw-empty">No samples match these preview filters. Try clearing a filter.</p>}
        <footer className="bw-grid-footer">
          <span>Preview gallery · page {currentPage} of {pageCount}</span>
          <div className="bw-page-controls">
            <label>Per page <select aria-label="Samples per page" value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option value={20}>20</option><option value={30}>30</option><option value={50}>50</option></select></label>
            <button type="button" disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} aria-label="Previous page"><ChevronLeft size={16}/></button>
            <span>{currentPage} / {pageCount}</span>
            <button type="button" disabled={currentPage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))} aria-label="Next page"><ChevronRight size={16}/></button>
          </div>
        </footer>
      </section>
      <aside className="bw-queue-preview" aria-label="Selected sample preview">
        <div className="bw-queue-preview-head"><h3>Sample details</h3><small>Fixture preview</small></div>
        {preview?<><SampleMedia sample={preview} large/>
          <div className="bw-queue-preview-info"><strong>{preview.id}</strong><span className={'bw-review-tag is-'+formatDecision(decisions[preview.id]).toLowerCase()}>{formatDecision(decisions[preview.id])}</span></div>
          <dl className="bw-preview-meta">
            <dt>Domain</dt><dd>{preview.domain}</dd>
            <dt>Weather</dt><dd>{preview.weather}</dd>
            <dt>Uncertainty</dt><dd>{preview.uncertainty.toFixed(2)}</dd>
            <dt>Safety</dt><dd>{preview.safety.toFixed(2)}</dd>
            <dt>Privacy</dt><dd>Not verified</dd>
            <dt>Draft boxes</dt><dd>{(edits[preview.id]||[]).length}</dd>
          </dl>
          <Button variant="primary" onClick={()=>{setActiveId(preview.id);openTab('review')}}>Open in Focus Review <ArrowRight size={15}/></Button>
          <p className="bw-preview-help">Demo media and scores only. This preview does not establish batch membership or privacy clearance.</p>
        </>:<p className="bw-empty">No preview sample selected.</p>}
      </aside>
    </div>}
    {view==='review'&&<div className="bw-review">
      <div className="bw-review-main">
        <div className="bw-review-navigation"><div><strong>{active?.id||'No sample'}</strong><span>{active?.video||'—'} · {active?.domain||'—'}</span></div>
          <div className="bw-review-switch"><button onClick={()=>nextSample(-1)} aria-label="Previous sample"><ChevronLeft size={17}/></button><span>{activeIndex+1} / {filtered.length}</span><button onClick={()=>nextSample(1)} aria-label="Next sample"><ChevronRight size={17}/></button></div></div>
        {active?<QuickBoxEditor key={active.id} sample={active} initialBoxes={edits[active.id]||[]} editable={isOpen} onSave={saveBoxes} onToolChange={setEditMode} onDirtyChange={setEditorDirty}/>:<p className="bw-empty">No samples match the current filters. Return to Grid and clear filters.</p>}
        <div className="bw-review-actionbar"><div><span>Selection decision</span><strong>{active?formatDecision(decisions[active.id]):'—'}</strong><small>Independent from annotation drafts</small></div>
          <input aria-label="Rejection reason" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Rejection reason…"/>
          <Button disabled={!isOpen||!active} onClick={()=>decide([active.id],'Deferred')}>Defer <kbd>D</kbd></Button>
          <Button disabled={!isOpen||!active} onClick={()=>decide([active.id],'Rejected')}>Reject <kbd>R</kbd></Button>
          <Button disabled={!isOpen||!active} variant="primary" onClick={()=>decide([active.id],'Approved')}>Approve <kbd>A</kbd></Button>
        </div>
      </div>
      <aside className="bw-inspector"><header><h3>Sample Inspector</h3><Badge>{active?formatDecision(decisions[active.id]):'Pending'}</Badge></header>
        <div className="bw-inspector-tabs">{[['scores','Selection'],['metadata','Metadata'],['privacy','Privacy']].map(([key,label])=>
          <button key={key} className={inspectorTab===key?'active':''} onClick={()=>setInspectorTab(key)}>{label}</button>)}</div>
        {active&&inspectorTab==='scores'&&<div className="bw-inspector-body"><div className="bw-primary-score"><small>Uncertainty</small><strong>{active.uncertainty.toFixed(3)}</strong></div>
          <Score label="Safety" value={active.safety}/><Score label="Diversity" value={active.diversity}/><Score label="Redundancy" value={active.redundancy}/>
          <p>Scores are fixture values. The full selection formula and production explanation are not connected.</p></div>}
        {active&&inspectorTab==='metadata'&&<div className="bw-inspector-body"><dl>
          <dt>Sample ID</dt><dd>{active.id}</dd><dt>Video</dt><dd>{active.video}</dd><dt>Timestamp</dt><dd>{active.time}</dd><dt>Domain</dt><dd>{active.domain}</dd><dt>Weather</dt><dd>{active.weather}</dd><dt>Quality</dt><dd>{active.quality}</dd><dt>Draft boxes</dt><dd>{(edits[active.id]||[]).length} local</dd>
          </dl></div>}
        {active&&inspectorTab==='privacy'&&<div className="bw-inspector-body"><Rule ok={false} heading="Privacy not verified" detail="Preview media and local edits have no sample-level backend privacy clearance. Approval cannot authorize export."/></div>}
        <div className="bw-inspector-foot"><strong>Shortcut help</strong><p>←/→ navigation · A approve · R reject · D defer. Keys are disabled while editing box geometry or typing.</p></div>
      </aside>
    </div>}
    {view==='handoff'&&<div className="bw-handoff-workflow">
      <div className="bw-handoff-topline"><div><h2>Finalize &amp; Handoff</h2><p>Validate an eligible subset, freeze its version, then configure a separate delivery job.</p></div>
        <Badge>{freezeReady?'Backend preflight ready':'Backend validation required'}</Badge></div>
      <nav className="bw-handoff-stepper" aria-label="Curated batch handoff workflow">
        {[
          ['01','Validate','Eligibility & privacy'],
          ['02','Configure','Output plan'],
          ['03','Freeze version','Immutable manifest'],
          ['04','Export','Delivery job']
        ].map(([num,name,desc],i)=><div key={num} className={'bw-handoff-step'+(i===0?' is-active':'')}>
          <span>{num}</span><div><strong>{name}</strong><small>{desc}</small></div>
        </div>)}
      </nav>
      <div className="bw-handoff">
        <section className="bw-handoff-checks bw-handoff-summary">
          <div className="bw-section-head"><h2>Finalize readiness</h2><span className="bw-pending-label">2 verifications needed</span></div>
          <p className="bw-intro">RoadSift will freeze the approved, eligible subset. These are the only readiness items a reviewer needs to track here.</p>
          <div className="bw-eligible-summary">
            <div><small>Selected</small><strong>{count(batch.count)}</strong></div>
            <div><small>Approved</small><strong>{count(batch.review?.approved||0)}</strong></div>
            <div><small>Deferred</small><strong>{count(batch.review?.deferred||0)}</strong></div>
            <div><small>Pending</small><strong>{count(pending)}</strong></div>
          </div>
          <div className="bw-readiness-simple">
            <div className="bw-ready-row">
              <CheckCircle2 size={19} className="bw-ready-icon is-recorded"/>
              <div><strong>Review summary</strong><p>{count(batch.review?.reviewed||0)} / {count(batch.count)} recorded as reviewed. The final approved subset still needs authoritative confirmation.</p></div>
              <span className="bw-ready-state is-recorded">Recorded</span>
            </div>
            <div className="bw-ready-row">
              <CircleAlert size={19} className="bw-ready-icon"/>
              <div><strong>Eligible sample membership</strong><p>Verify the exact approved sample IDs against the saved pool snapshot.</p></div>
              <span className="bw-ready-state">Needs verification</span>
            </div>
            <div className="bw-ready-row">
              <CircleAlert size={19} className="bw-ready-icon"/>
              <div><strong>Privacy clearance</strong><p>Confirm eligible samples satisfy the export privacy policy.</p></div>
              <span className="bw-ready-state">Needs verification</span>
            </div>
          </div>
          <div className="bw-finalize-explainer"><LockKeyhole size={18}/><div><strong>Finalize becomes available after validation.</strong><p>RoadSift must also reconcile any EXACT-N shortfall under the configured policy. No production preflight is connected in this demo.</p></div></div>
          <details className="bw-readiness-details"><summary>Technical validation details <span>{freezeChecks.length+exportChecks.length} rules <ChevronDown size={15}/></span></summary>
            <div className="bw-details-group"><h3>Before Freeze</h3>{freezeChecks.map(check=><Rule key={check.heading} {...check}/>)}</div>
            <div className="bw-details-group"><h3>Before Export</h3>{exportChecks.map(check=><Rule key={check.heading} {...check}/>)}</div>
          </details>
          <details className="bw-readiness-details"><summary>Source lineage <ChevronDown size={15}/></summary>
            <div className="bw-handoff-lineage"><dl>
              <div><dt>Selection batch</dt><dd>{batch.id}</dd></div>
              <div><dt>Mining run</dt><dd>{batch.runId}</dd></div>
              <div><dt>Pool snapshot</dt><dd>{batch.sourceSnapshot||'Not recorded'}</dd></div>
              <div><dt>Recorded membership hash</dt><dd>{batch.membershipHash||'Not recorded'}</dd></div>
            </dl></div>
          </details>
        </section>
        <aside className="bw-handoff-settings">
          <h2>2. Handoff configuration</h2>
          <p className="bw-config-intro">Describe the version to freeze and the delivery package to generate. This does not change selection or review decisions.</p>
          <div className="bw-config-group"><h3>Purpose &amp; output</h3>
            <label>Purpose<select aria-label="Handoff purpose" value={purpose} onChange={e=>{setPurpose(e.target.value);if(e.target.value==='annotation'&&!['manifest','zip'].includes(target))setTarget('manifest');}}>
              <option value="annotation">Annotation handoff</option><option value="training">Training handoff</option></select></label>
            <label>Export format<select aria-label="Export format" value={target} onChange={e=>setTarget(e.target.value)}>
              {formatOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select></label>
            <p className="bw-config-hint">{purpose==='training'?'Training export requires confirmed labels and compatible media / annotation schema.':'Annotation handoff permits unlabeled samples; no annotation is fabricated.'}</p>
          </div>
          <div className="bw-config-group"><h3>Destination</h3>
            <label>Delivery target<select aria-label="Export destination" value={destination} onChange={e=>setDestination(e.target.value)}>
              <option value="download">Local download</option><option value="r2">Cloudflare R2</option>
              <option value="cvat" disabled>CVAT integration · not configured</option>
            </select></label>
            {destination==='r2'&&<label>Bucket prefix<input aria-label="R2 object prefix" type="text" value={destinationPath} onChange={e=>setDestinationPath(e.target.value)} placeholder="curated/batch-id"/></label>}
            <p className="bw-config-hint">No connected delivery executor in this frontend preview. Selecting a destination does not initiate upload.</p>
          </div>
          <div className="bw-config-group"><h3>Names &amp; version</h3>
            <label>Curated batch name<input aria-label="Curated batch name" type="text" maxLength={64} value={curatedName} onChange={e=>setCuratedName(e.target.value)}/></label>
            <div className="bw-config-inline"><label>Requested version label<input aria-label="Requested version label" type="text" maxLength={64} value={versionLabel} onChange={e=>setVersionLabel(e.target.value)}/></label>
              <label>Export job name<input aria-label="Export job name" type="text" maxLength={64} value={exportJobName} onChange={e=>setExportJobName(e.target.value)}/></label></div>
            <label>Notes (optional)<textarea aria-label="Handoff notes" rows={2} maxLength={500} value={handoffNotes} onChange={e=>setHandoffNotes(e.target.value)} placeholder="e.g. Round 2 VRU annotation handoff"/></label>
            <p className="bw-config-hint">Names are proposed identifiers; the backend must assign and validate the final immutable version.</p>
            {!!configIssues.length&&<div className="bw-config-issues" role="alert">{configIssues.map(t=><p key={t}><CircleAlert size={13}/>{t}</p>)}</div>}
          </div>
          <div className="bw-config-group"><h3>Includes</h3>
            <label className="bw-config-check"><input type="checkbox" checked disabled/><span><strong>Manifest &amp; sample IDs</strong><small>Required for provenance</small></span></label>
            <label className="bw-config-check"><input type="checkbox" checked={includes.metadata} onChange={e=>setIncludes(v=>({...v,metadata:e.target.checked}))}/><span><strong>Sample metadata</strong><small>Domain, scores and source references</small></span></label>
            <label className="bw-config-check"><input type="checkbox" checked={target!=='manifest'} disabled/><span><strong>Source images</strong><small>{target==='manifest'?'Manifest references only; no image bytes':'Required by this output format'}</small></span></label>
            <label className="bw-config-check"><input type="checkbox" checked={includes.reviewDecisions} onChange={e=>setIncludes(v=>({...v,reviewDecisions:e.target.checked}))}/><span><strong>Review decision records</strong><small>Optional audit data; subject to access controls</small></span></label>
            <label className="bw-config-check"><input type="checkbox" checked={purpose==='training'} disabled/><span><strong>Verified annotations</strong><small>{purpose==='training'?'Required for training, blocked until validated':'Not required for annotation handoff'}</small></span></label>
            <p className="bw-config-hint">Unsaved box drafts and model predictions are never silently exported as ground truth.</p>
          </div>
          <div className="bw-handoff-action"><div className="bw-handoff-action-head"><LockKeyhole size={17}/><strong>3. Freeze curated version</strong></div>
            <p>Server validation must succeed before storing an immutable membership snapshot and content-hashed manifest.</p>
            <button disabled={!freezeReady} title="Unavailable until backend preflight verifies membership, review, privacy and policy">Finalize Curated Batch</button>
          </div>
          <div className="bw-handoff-action"><div className="bw-handoff-action-head"><LockKeyhole size={17}/><strong>4. Export frozen version</strong></div>
            <p>Requires a frozen version, verified bytes, valid format and an active destination.</p>
            <button disabled={!exportReady} title="Requires frozen version and verified artifacts">Create export job</button>
            <Button icon={Download} onClick={exportPlan}>Download plan (preview JSON)</Button>
          </div>
          {batch.review?.finalizedAt&&<p className="bw-existing"><CheckCircle2 size={15}/> Historical fixture records a finalized review on {date(batch.review.finalizedAt)}; this is not proof of a verified exported artifact.</p>}
        </aside>
      </div>
    </div>}

  </div>;
}
