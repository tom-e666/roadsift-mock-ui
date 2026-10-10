import React,{useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,ChevronDown,ChevronRight,Download,FileJson,FileText,Info,Layers3,LockKeyhole,PackageCheck,Send,ShieldCheck,X} from 'lucide-react';
import {Badge} from './components/UI.jsx';
import {count,date} from './data.js';
import './curated-release.css';

const legal=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
function downloadJson(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}
export function CuratedRelease({batch,onReview,onImportReturn,notify,initialPreview=false}){
  const approved=batch.review?.approved||0,rejected=batch.review?.rejected||0,deferred=batch.review?.deferred||0;
  const pending=Math.max(0,batch.count-(batch.review?.reviewed||0));
  const [versionPreview,setVersionPreview]=useState(initialPreview);
  const [curatedName,setCuratedName]=useState('curated_'+batch.id);
  const [version,setVersion]=useState('v1');
  const [drawer,setDrawer]=useState(null);
  const [purpose,setPurpose]=useState('annotation');
  const [format,setFormat]=useState('manifest');
  const [destination,setDestination]=useState('download');
  const [prefix,setPrefix]=useState('curated/'+batch.id);
  const [metadata,setMetadata]=useState(true);
  const [reviewAudit,setReviewAudit]=useState(false);
  const [notes,setNotes]=useState('');
  useEffect(()=>{if(!drawer)return;
    const onKey=e=>{if(e.key==='Escape')setDrawer(null)};
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[drawer]);
  const canPreview=legal.test(curatedName)&&legal.test(version);
  const previewVersionName=(curatedName||'curated_batch')+' / '+(version||'v1');
  const requiresImageBytes=format!=='manifest';
  const requiresPrivacy=requiresImageBytes && (destination==='download'||destination==='r2');
  const requiresLabels=purpose==='training';
  const formatChoices=purpose==='annotation'?[['manifest','Manifest + sample IDs'],['zip','Images + manifest (ZIP)']]:
    [['manifest','Manifest + metadata'],['zip','Images + labels (ZIP)'],['coco','COCO · verified 2D labels'],['yolo','YOLO · verified 2D labels']];
  const formatLabel=formatChoices.find(([value])=>value===format)?.[1]||format;
  const outputErrors=[
    ...(!legal.test(curatedName)?['Invalid curated batch name']:[]),
    ...(!legal.test(version)?['Invalid version label']:[]),
    ...(destination==='r2'&&!prefix.trim()?['R2 prefix is required']:[])
  ];
  const openDrawer=next=>{
    setPurpose(next);setFormat(next==='annotation'?'zip':'coco');setDestination('download');setDrawer(next);
  };
  const exportPlan=()=>{
    downloadJson('handoff-'+batch.id+'-preview.json',{
      schemaVersion:'roadsift.delivery-plan-preview.v3',previewOnly:true,notAnExport:true,noCuratedVersionCreated:true,
      source:{batchId:batch.id,runId:batch.runId,poolSnapshot:batch.sourceSnapshot||null,
        recordedApproved:approved,recordedRejected:rejected,recordedDeferred:deferred,recordedPending:pending},
      requestedVersion:{name:curatedName,label:version,approvalMembership:'unverified'},
      delivery:{purpose,format,destination,prefix:destination==='r2'?prefix:null,
        includes:{manifest:true,sampleIds:true,metadata,reviewAudit,images:requiresImageBytes,
          verifiedAnnotations:requiresLabels},notes:notes.trim()},
      readiness:{membershipVerified:false,privacyVerified:false,annotationVerified:false,
        canFinalize:false,canExport:false,requiredPrivacyForSelectedOutput:requiresPrivacy,
        requiredAnnotationsForSelectedOutput:requiresLabels}
    });
    notify?.('Downloaded a configuration preview only. No Curated Batch or export job was created.');
  };
  return <section className="cr-page" aria-label="Curated batch and delivery">
    <div className="cr-title-row"><div><span className="cr-eyebrow">CURATION / RELEASE</span>
      <h2>{versionPreview?'Curated Batch · version preview':'Create Curated Batch'}</h2>
      <p>{versionPreview?'Version workspace preview. No immutable artifact was created.':'Freeze the approved subset first; deliver it only when needed.'}</p></div>
      <Badge>{versionPreview?'Design preview':'Not finalized here'}</Badge></div>
    {!versionPreview?<div className="cr-create-layout">
      <div className="cr-create-main">
        <div className="cr-source-card"><div className="cr-card-title"><h3>Review outcome</h3><button type="button" onClick={onReview}>Open Focus Review <ArrowRight size={14}/></button></div>
          <div className="cr-metrics">
            <div className="cr-metric cr-metric--primary"><small>Approved candidates</small><strong>{count(approved)}</strong><span>Candidate curated subset</span></div>
            <div className="cr-metric"><small>Rejected</small><strong>{count(rejected)}</strong><span>Excluded</span></div>
            <div className="cr-metric"><small>Deferred</small><strong>{count(deferred)}</strong><span>Left for later</span></div>
            <div className="cr-metric"><small>Pending</small><strong>{count(pending)}</strong><span>Not approved</span></div>
          </div>
          <div className="cr-progress"><div style={{width:(batch.count?approved/batch.count*100:0)+'%'}} className="cr-progress-approved"/><div style={{width:(batch.count?rejected/batch.count*100:0)+'%'}} className="cr-progress-rejected"/><div style={{width:(batch.count?deferred/batch.count*100:0)+'%'}} className="cr-progress-deferred"/></div>
          <p className="cr-subtle">{count(batch.count)} samples selected by the pipeline · EXACT-N is not necessarily the approved export count.</p>
        </div>
        <div className="cr-information-card"><div className="cr-card-title"><h3>What happens when you finalize?</h3></div>
          <div className="cr-outcome-list">
            <div><CheckCircle2 size={17}/><span>Freeze the eligible Approved sample IDs into a new immutable version.</span></div>
            <div><CheckCircle2 size={17}/><span>Keep Rejected and Deferred samples out of that version.</span></div>
            <div><Info size={17}/><span>Privacy and label checks are evaluated later for the particular delivery destination and format.</span></div>
          </div>
          <details className="cr-technical"><summary>Source provenance <ChevronDown size={15}/></summary><dl>
            <div><dt>Selection batch</dt><dd>{batch.id}</dd></div>
            <div><dt>Mining run</dt><dd>{batch.runId}</dd></div>
            <div><dt>Pool snapshot</dt><dd>{batch.sourceSnapshot||'Not recorded'}</dd></div>
            <div><dt>Recorded membership hash</dt><dd>{batch.membershipHash||'Not recorded'}</dd></div>
          </dl></details>
        </div>
      </div>
      <aside className="cr-create-side"><h3>New curated version</h3><p>Confirm the name; source membership is pinned automatically by the system.</p>
        <label>Curated batch name<input aria-label="Curated batch name" maxLength={64} value={curatedName} onChange={e=>setCuratedName(e.target.value)}/></label>
        <label>Version label<input aria-label="Requested version label" maxLength={64} value={version} onChange={e=>setVersion(e.target.value)}/></label>
        <div className="cr-summary-line"><span>Membership source</span><strong>Approved subset</strong></div>
        <div className="cr-summary-line"><span>Recorded candidates</span><strong>{count(approved)}</strong></div>
        <div className="cr-status"><LockKeyhole size={17}/><p><strong>Membership evidence not connected</strong>
          The backend must verify the exact approved sample list and permitted subset policy. A count or recorded hash alone is not proof.</p></div>
        <button className="cr-primary" type="button" disabled title="Requires an authoritative membership snapshot">Create Curated Batch</button>
        <button className="cr-secondary" type="button" disabled={!canPreview} onClick={()=>setVersionPreview(true)}>Preview version workspace <ArrowRight size={15}/></button>
        <small>Preview opens a UI demonstration; it does not finalize anything.</small>
      </aside>
    </div>:<div className="cr-version">
      <div className="cr-demo"><Info size={17}/><span><strong>Illustrative version view.</strong> The real immutable version, manifest and integrity evidence do not exist in this demo. All actions below are delivery previews.</span>
        <button onClick={()=>setVersionPreview(false)}>Back to finalize</button></div>
      <div className="cr-version-summary"><div><span className="cr-eyebrow">CURATED VERSION · PREVIEW ONLY</span><h3>{previewVersionName}</h3><p>Would be created from <strong>{batch.id}</strong> · recorded approved candidates: {count(approved)}</p></div>
        <span className="cr-version-chip"><LockKeyhole size={14}/> Not actually frozen</span></div>
      <div className="cr-delivery-actions">
        <button type="button" onClick={()=>openDrawer('annotation')}><Send size={22}/><strong>Send for annotation</strong><span>Send samples to a labeling workflow</span><ArrowRight size={17}/></button>
        <button type="button" onClick={()=>openDrawer('training')}><PackageCheck size={22}/><strong>Export dataset</strong><span>Generate images and verified labels</span><ArrowRight size={17}/></button>
      </div>
      <section className="cr-history"><div className="cr-card-title"><h3>Annotation return</h3><button type="button" className="cr-annotation-intake" onClick={onImportReturn}>Import returned labels <ArrowRight size={14}/></button></div>
        <p>Receive COCO or RoadSift annotations from an external labeling workflow, then reconcile sample IDs and create a new annotated version after authoritative validation.</p>
        <div className="cr-annotation-intake-summary"><span>Recorded return status</span><strong>{batch.annotationReturn?.status||'Not started'}</strong></div>
      </section>
      <section className="cr-history"><div className="cr-card-title"><h3>Delivery history</h3><span>Recorded batch data</span></div>
        {batch.handoff?.status&&batch.handoff.status!=='Not started'?
          <div className="cr-history-item"><FileText size={18}/><span><strong>{batch.handoff.status}</strong><small>{batch.handoff.destination||'Destination not recorded'} · {date(batch.handoff.sentAt)}</small></span><em>Historical fixture · unverified</em></div>:
          <p>No deliveries recorded. An exported preview plan is not a delivery job.</p>}
      </section>
    </div>}
    {drawer&&<div className="cr-backdrop" role="presentation" onClick={()=>setDrawer(null)}>
      <div className="cr-drawer" role="dialog" aria-modal="true" aria-label="Configure delivery" onClick={e=>e.stopPropagation()}>
        <header><div><span className="cr-eyebrow">DELIVERY / {purpose.toUpperCase()}</span><h3>{purpose==='annotation'?'Send for annotation':'Export dataset'}</h3><p>Configure one delivery from the selected curated version.</p></div><button aria-label="Close delivery configuration" onClick={()=>setDrawer(null)}><X size={19}/></button></header>
        <div className="cr-drawer-content"><div className="cr-linked-version"><Layers3 size={16}/><span><strong>{previewVersionName}</strong><small>UI preview · version not created</small></span></div>
          <label>Delivery purpose<select aria-label="Delivery purpose" value={purpose} onChange={e=>{setPurpose(e.target.value);setFormat(e.target.value==='annotation'?'zip':'coco')}}><option value="annotation">Annotation</option><option value="training">Training</option></select></label>
          <label>Package format<select aria-label="Delivery format" value={format} onChange={e=>setFormat(e.target.value)}>{formatChoices.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Destination<select aria-label="Delivery destination" value={destination} onChange={e=>setDestination(e.target.value)}>
            <option value="download">Local download</option><option value="r2">Cloudflare R2</option><option value="cvat" disabled>CVAT · not connected</option></select></label>
          {destination==='r2'&&<label>R2 object prefix<input aria-label="R2 delivery prefix" value={prefix} onChange={e=>setPrefix(e.target.value)}/></label>}
          <div className="cr-include"><h4>Included in package</h4>
            <p><CheckCircle2 size={14}/> Manifest and sample IDs (required)</p>
            <label><input type="checkbox" checked={metadata} onChange={e=>setMetadata(e.target.checked)}/> Sample metadata</label>
            <label><input type="checkbox" checked={reviewAudit} onChange={e=>setReviewAudit(e.target.checked)}/> Review audit log</label>
            <p><CheckCircle2 size={14}/> {requiresImageBytes?'Images required by the chosen format':'Manifest references only; no image bytes'}</p>
            {requiresLabels&&<p><CheckCircle2 size={14}/> Verified annotations required</p>}
          </div>
          <label>Delivery notes (optional)<textarea rows={2} value={notes} maxLength={500} onChange={e=>setNotes(e.target.value)} placeholder="Purpose and recipient context…"/></label>
          <div className="cr-delivery-gate"><strong>Delivery readiness for this package</strong>
            <div><LockKeyhole size={16}/><span>Curated version · <b>Not created</b></span></div>
            {requiresPrivacy&&<div><ShieldCheck size={16}/><span>Sanitized image artifacts · <b>Not verified</b></span></div>}
            {requiresLabels&&<div><Info size={16}/><span>Confirmed annotation coverage · <b>Not verified</b></span></div>}
            {!requiresPrivacy&&!requiresLabels&&<p>Image-privacy and training-label gates do not apply to this output. Recipient access controls still apply.</p>}
            <small>Backend delivery, privacy status and artifact integrity are not connected in this preview.</small></div>
          {outputErrors.map(err=><p className="cr-error" key={err}>{err}</p>)}
        </div>
        <footer><button className="cr-secondary" type="button" onClick={exportPlan} disabled={outputErrors.length>0}><FileJson size={15}/> Download plan JSON</button>
          <button className="cr-primary" type="button" disabled title="Requires a real verified curated version and delivery backend">Create export job</button></footer>
      </div>
    </div>}
  </section>;
}
