import React,{useEffect,useState} from 'react';
import {AlertTriangle,Check,CheckCircle2,FileJson,FileUp,Info,LockKeyhole,X} from 'lucide-react';
import {inspectAnnotations,inspectEvaluation} from './ResultImports.jsx';
import './intake-drawer.css';

const MAX=30*1024*1024;
const acceptedURI=v=>/^(r2|s3):\/\/[^/\s]+\/.+/.test(v.trim());
export function ResultImportDrawer({kind='annotation',context={},onClose,onSave}){
  const annotation=kind==='annotation';
  const [mode,setMode]=useState('file'),[format,setFormat]=useState('json');
  const [fileName,setFileName]=useState(''),[preview,setPreview]=useState(null);
  const [sourceUri,setSourceUri]=useState(''),[error,setError]=useState('');
  const [modelId,setModelId]=useState(context.modelId||''),[datasetId,setDatasetId]=useState(context.datasetId||'');
  const [holdoutId,setHoldoutId]=useState(context.holdoutId||'holdout_v1'),[runId,setRunId]=useState(context.runId||'');
  const [note,setNote]=useState('');
  useEffect(()=>{const escape=e=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[onClose]);
  const inspect=async e=>{
    const f=e.target.files?.[0];if(!f)return;
    setFileName(f.name);setPreview(null);setError('');
    if(f.size>MAX){setError('This browser preview reads files up to 30 MB; use a backend worker for large packages.');return;}
    if(annotation?!/\.json$/i.test(f.name):!new RegExp('\\.'+format+'$','i').test(f.name)){
      setError('File type does not match the selected format.');return;
    }
    try{
      const text=await f.text();
      setPreview(annotation?inspectAnnotations(JSON.parse(text)):inspectEvaluation(text,format));
    }catch(err){setError('Unable to parse result file: '+err.message);}
  };
  const issues=preview?.summary&&!annotation?[
    ...(preview.summary.embeddedModel&&preview.summary.embeddedModel!==modelId?['Embedded model version differs from selected version.']:[]),
    ...(preview.summary.embeddedDataset&&preview.summary.embeddedDataset!==datasetId?['Embedded dataset version differs from selected version.']:[]),
    ...(preview.summary.embeddedHoldout&&preview.summary.embeddedHoldout!==holdoutId?['Embedded holdout differs from selected holdout.']:[])
  ]:[];
  const validFile=mode==='file'&&preview&&!preview.errors.length&&!issues.length;
  const validUri=mode==='uri'&&acceptedURI(sourceUri);
  const saveEnabled=(validFile||validUri)&&(annotation||(modelId&&datasetId&&holdoutId));
  const save=()=>{
    if(!saveEnabled)return;
    const local={
      id:(annotation?'annotation_intake_':'evaluation_intake_')+Date.now().toString(36),
      createdAt:new Date().toISOString(),source:mode,
      fileName:mode==='file'?fileName:null,sourceUri:mode==='uri'?sourceUri.trim():null,
      status:mode==='file'?'Schema checked · unverified':'URI registered · unchecked',
      verifiedMembership:false,contentVerified:false,notes:note.trim()
    };
    if(annotation){
      local.batchId=context.batchId;
      local.jobKey=context.jobKey;
      local.summary=validFile?{format:preview.summary.format,samples:preview.summary.samples,annotations:preview.summary.annotations,classes:preview.summary.classes}:null;
      local.warnings=validFile?preview.warnings:[];
      local.annotatedDatasetVersionId=null;
    }else{
      local.modelVersionId=modelId;local.datasetVersionId=datasetId;local.holdoutId=holdoutId;
      local.runId=runId||null;local.metrics=validFile?preview.summary.metrics:null;
      local.recordType='local_import_preview';local.protocolVerified=false;local.artifactVerified=false;
      local.holdoutVerified=false;local.warnings=validFile?preview.warnings:[];
    }
    onSave(local);
  };
  return <div className="id-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="id-panel" role="dialog" aria-modal="true" aria-label={annotation?'Import annotation return':'Import evaluation result'}>
      <header className="id-header"><div><span className="id-eyebrow">RESULT INTAKE · {annotation?'ANNOTATION':'EVALUATION'}</span>
        <h2>{annotation?'Import returned labels':'Import evaluation result'}</h2>
        <p>{annotation?'Match an annotation result to the selected delivery.':'Attach metrics to a versioned model and evaluation context.'}</p></div>
        <button type="button" aria-label="Close import" onClick={onClose}><X size={19}/></button></header>
      <div className="id-body">
        <div className="id-context"><small>{annotation?'Annotation job':'Evaluation context'}</small><strong>{context.name||context.jobKey||'New evaluation'}</strong>
          <span>{annotation?'Selection batch: '+context.batchId:'Select exact versions below'}</span></div>
        {!annotation&&<div className="id-fields">
          <label>Model version<select aria-label="Import model version" value={modelId} onChange={e=>setModelId(e.target.value)}>
            {(context.models||[]).map(m=><option value={m.id} key={m.id}>{m.name||m.id} · {m.id}</option>)}</select></label>
          <label>Dataset version<select aria-label="Import dataset version" value={datasetId} onChange={e=>setDatasetId(e.target.value)}>
            {(context.datasets||[]).map(d=><option value={d.id} key={d.id}>{d.name||d.id} · {d.id}</option>)}</select></label>
          <label>Holdout<select aria-label="Import evaluation holdout" value={holdoutId} onChange={e=>setHoldoutId(e.target.value)}>
            {(context.holdouts||[{id:'holdout_v1',name:'Fixed Holdout v1'}]).map(h=><option key={h.id} value={h.id}>{h.name||h.id}</option>)}</select></label>
          <label>Related run<select aria-label="Import related run" value={runId} onChange={e=>setRunId(e.target.value)}>
            <option value="">Unlinked</option>{(context.runs||[]).map(r=><option key={r.id} value={r.id}>{r.name} · {r.id}</option>)}</select></label>
        </div>}
        <div className="id-section"><h3>Result source</h3><div className="id-segments">{[['file','Upload file'],['uri','Object URI']].map(([v,l])=>
          <button key={v} type="button" className={v===mode?'active':''} onClick={()=>{setMode(v);setError('');setPreview(null)}}>{l}</button>)}</div>
          {mode==='file'?<>{!annotation&&<label className="id-field">Format<select aria-label="Result format" value={format} onChange={e=>{setFormat(e.target.value);setPreview(null);setFileName('')}}><option value="json">Metrics JSON</option><option value="csv">Simple metric,value CSV</option></select></label>}
            <label className="id-upload"><FileUp size={21}/><strong>{fileName||'Choose a result file'}</strong><span>{annotation?'COCO / RoadSift JSON':'Metrics JSON or CSV'} · Local schema check</span>
              <input type="file" accept={annotation?'.json,application/json':format==='json'?'.json,application/json':'.csv,text/csv'} onChange={inspect}/></label></>:
            <label className="id-field">R2 / S3 object URI<input aria-label="Import object URI" value={sourceUri} onChange={e=>setSourceUri(e.target.value)} placeholder="r2://bucket/returns/result.json"/></label>}
        </div>
        {(preview||error||issues.length>0)&&<div className="id-section id-results"><h3>Inspection</h3>
          {error&&<p className="id-error"><AlertTriangle size={15}/>{error}</p>}
          {preview&&<><div className="id-evidence"><strong>{preview.errors.length?'Schema errors':'Schema check complete'}</strong><span>Not reconciled</span></div>
            {preview.summary&&<div className="id-totals">{annotation?
              <><div><small>Sample references</small><strong>{preview.summary.samples}</strong></div><div><small>Boxes</small><strong>{preview.summary.annotations}</strong></div><div><small>Classes</small><strong>{preview.summary.classes}</strong></div></>:
              Object.entries(preview.summary.metrics).slice(0,4).map(([k,v])=><div key={k}><small>{k}</small><strong>{Number(v).toFixed(3)}</strong></div>)}</div>}
            {[...preview.errors,...issues].map((e,i)=><p className="id-error" key={i}><AlertTriangle size={14}/>{e}</p>)}
            {preview.warnings.slice(0,3).map((e,i)=><p className="id-hint" key={i}><Info size={14}/>{e}</p>)}</>}
        </div>}
        <div className="id-constraints"><LockKeyhole size={16}/><div><strong>Backend verification is separate</strong><p>{annotation?
          'Membership reconciliation, class mapping, label QA and immutable dataset registration happen in the backend.':
          'Holdout provenance, model weights, artifact integrity and evaluation protocol must be verified externally.'}</p></div></div>
        <label className="id-field">Notes (optional)<textarea rows={2} value={note} maxLength={400} onChange={e=>setNote(e.target.value)} placeholder="Where did this result come from?"/></label>
      </div>
      <footer><button type="button" className="id-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="id-primary" disabled={!saveEnabled} onClick={save}>
          <Check size={15}/> Save intake record</button></footer>
    </section>
  </div>;
}
