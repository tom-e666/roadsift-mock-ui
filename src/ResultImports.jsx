import React,{useMemo,useState} from 'react';
import {AlertTriangle,ArrowLeft,ArrowRight,CheckCircle2,ChevronDown,ClipboardCheck,Database,FileJson,FileText,FileUp,Info,Layers,Link2,LockKeyhole,PackageCheck,RotateCcw,ShieldAlert,UploadCloud} from 'lucide-react';
import {count,date} from './data.js';
import './result-imports.css';

const MAX_BYTES=30*1024*1024;
const unique=a=>[...new Set(a)];
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const errText=e=>e instanceof Error?e.message:String(e);
const stringId=v=>String(v??'').trim();
const normalize=x=>x.toLowerCase().replace(/[\s-]+/g,'_');
const num=x=>x===null||x===undefined||x===''?null:Number(x);

export function inspectAnnotations(json){
  const errors=[],warnings=[];
  if(!object(json))return {errors:['Top-level JSON must be an object.'],warnings,summary:null};
  let refs=[],boxes=0,invalidBoxes=0,classes=0,kind='';
  if(Array.isArray(json.images)&&Array.isArray(json.annotations)&&Array.isArray(json.categories)){
    kind='COCO JSON';
    const ids=json.images.map(i=>i?.id).filter(x=>x!==undefined&&x!==null);
    const idSet=new Set(ids.map(String));
    const names=json.images.map(i=>stringId(i?.sample_id||i?.file_name||i?.id)).filter(Boolean);
    refs=names;
    if(idSet.size!==ids.length)errors.push('Duplicate COCO image IDs.');
    if(names.length!==json.images.length)errors.push('Each image needs a sample_id, file_name or id.');
    const categories=new Set(json.categories.filter(c=>c?.id!==undefined).map(c=>String(c.id)));
    classes=categories.size;
    if(!categories.size)errors.push('Missing COCO categories.');
    const seenAnnotations=new Set();
    for(const a of json.annotations){
      if(!a||!idSet.has(String(a.image_id))) {invalidBoxes++;continue;}
      if(!categories.has(String(a.category_id))||!Array.isArray(a.bbox)||a.bbox.length!==4||a.bbox.some(v=>!Number.isFinite(v))||a.bbox[2]<=0||a.bbox[3]<=0) {invalidBoxes++;continue;}
      if(a.id!==undefined){if(seenAnnotations.has(String(a.id)))invalidBoxes++;seenAnnotations.add(String(a.id));}
      boxes++;
    }
  }else if(Array.isArray(json.samples)){
    kind='RoadSift JSON';
    refs=json.samples.map(s=>stringId(s?.sample_id||s?.sampleId)).filter(Boolean);
    if(refs.length!==json.samples.length)errors.push('Every sample must have sample_id.');
    const classSet=new Set();
    for(const item of json.samples){
      const annotations=item?.annotations??[];
      if(!Array.isArray(annotations)){errors.push('annotations must be an array for each sample.');continue;}
      for(const a of annotations){
        const b=a?.bbox;
        if(!Array.isArray(b)||b.length!==4||b.some(v=>!Number.isFinite(v))||b[2]<=0||b[3]<=0||!stringId(a?.label)){invalidBoxes++;continue;}
        boxes++;classSet.add(String(a.label));
      }
    }
    classes=classSet.size;
  }else{
    errors.push('Expected COCO {images, annotations, categories} or RoadSift {samples:[{sample_id,annotations:[]}]} JSON.');
    return {errors,warnings,summary:null};
  }
  if(refs.length===0)errors.push('No referenced sample IDs in the annotation result.');
  if(new Set(refs).size!==refs.length)errors.push('Duplicate mapped sample IDs or filenames.');
  if(invalidBoxes)errors.push(invalidBoxes+' invalid or unmapped annotation records.');
  if(!boxes)warnings.push('No bounding boxes found. Empty annotations may be valid negatives; verify coverage policy.');
  warnings.push('Sample-level membership and class mapping against the authoritative Curated Batch have not been verified.');
  return {errors,warnings,summary:{format:kind,samples:refs.length,annotations:boxes,classes,uniqueSampleIds:new Set(refs).size,
    previewIds:refs.slice(0,6),sampleIds:refs}};
}

export function inspectEvaluation(text,format){
  const errors=[],warnings=[];
  let doc=null;
  if(format==='csv'){
    const lines=text.trim().split(/\r?\n/).filter(Boolean).map(x=>x.trim());
    if(!lines.length)return {errors:['CSV is empty.'],warnings,summary:null};
    const head=lines[0].split(',').map(x=>normalize(x.replaceAll('"','').trim()));
    const iName=head.indexOf('metric'),iValue=head.indexOf('value');
    if(iName<0||iValue<0)return {errors:['CSV requires metric,value columns (no embedded commas).'],warnings,summary:null};
    doc={metrics:{}};
    for(const line of lines.slice(1)){
      const values=line.split(',').map(s=>s.trim().replace(/^"|"$/g,''));
      if(!values[iName]||values[iValue]===undefined){errors.push('Missing metric or value in CSV row.');continue;}
      const k=normalize(values[iName]);
      if(k in doc.metrics)errors.push('Duplicate metric: '+k);
      doc.metrics[k]=values[iValue];
    }
    warnings.push('Simple two-column CSV parser; nested or quoted-comma CSV requires a backend parser.');
  }else{
    try{doc=JSON.parse(text)}catch(e){return {errors:['Invalid JSON: '+errText(e)],warnings,summary:null};}
  }
  if(!object(doc))return {errors:['Evaluation document must be an object.'],warnings,summary:null};
  const src=object(doc.metrics)?doc.metrics:doc;
  const allowed={
    map50_95:['map50_95','map','map5095','m_ap50_95','map_50_95','box_map'],
    ap50:['ap50','map50','map_50','ap_50'],
    recall:['recall','overall_recall'],
    precision:['precision','overall_precision'],
    vru_recall:['vru_recall','vru'],
    ece:['ece','expected_calibration_error']
  };
  const normalized=Object.fromEntries(Object.entries(src).map(([k,v])=>[normalize(k),v]));
  const metrics={};
  for(const [dest,aliases] of Object.entries(allowed)){
    const values=aliases.filter(key=>normalized[key]!==undefined);
    if(values.length>1)warnings.push('Multiple aliases for '+dest+'; first one used.');
    if(values.length){
      const v=num(normalized[values[0]]);
      if(!Number.isFinite(v)||v<0||v>1)errors.push(dest+' must be a finite fraction between 0 and 1.');
      else metrics[dest]=v;
    }
  }
  if(!Object.keys(metrics).length)errors.push('No supported numeric evaluation metrics found.');
  if(!('map50_95' in metrics))warnings.push('mAP50–95 is missing.');
  if(!('recall' in metrics))warnings.push('Recall is missing.');
  warnings.push('Model weight digest, holdout membership, protocol and metric provenance require backend verification.');
  return {errors,warnings,summary:{metrics,metricsCount:Object.keys(metrics).length,
    embeddedModel:stringId(doc.modelVersionId||doc.model_version_id)||null,
    embeddedDataset:stringId(doc.datasetVersionId||doc.dataset_version_id)||null,
    embeddedHoldout:stringId(doc.holdoutId||doc.holdout_id)||null}};
}
function SectionHead({label,description,number}){return <div className="ri-section-head"><span className="ri-section-number">{number}</span><div><h3>{label}</h3><p>{description}</p></div></div>}
function ResultBox({preview,kind}){
  if(!preview)return <div className="ri-empty-preview"><FileText size={23}/><strong>No file inspected</strong><span>Choose a local result file to inspect its structure, counts and mapping requirements.</span></div>;
  return <div className="ri-validation">
    <div className="ri-validation-title"><strong>{preview.errors.length?'Schema validation failed':'Local schema check complete'}</strong>
      <span className={preview.errors.length?'ri-state-error':'ri-state-caution'}>{preview.errors.length?preview.errors.length+' errors':'Not backend verified'}</span></div>
    {preview.summary&&<div className="ri-preview-metrics">{kind==='annotation'?
      <><div><small>Samples referenced</small><strong>{count(preview.summary.samples)}</strong></div><div><small>Boxes</small><strong>{count(preview.summary.annotations)}</strong></div><div><small>Classes</small><strong>{count(preview.summary.classes)}</strong></div></>:
      <><div><small>Metrics parsed</small><strong>{preview.summary.metricsCount}</strong></div><div><small>mAP50–95</small><strong>{preview.summary.metrics.map50_95?.toFixed(3)||'—'}</strong></div><div><small>Recall</small><strong>{preview.summary.metrics.recall?.toFixed(3)||'—'}</strong></div></>}
    </div>}
    {preview.errors.map((x,i)=><p className="ri-error" key={'e'+i}><AlertTriangle size={14}/>{x}</p>)}
    {preview.warnings.map((x,i)=><p className="ri-warning" key={'w'+i}><Info size={14}/>{x}</p>)}
    {preview.summary&&<details className="ri-inspect-meta"><summary>Parsed details <ChevronDown size={15}/></summary><pre>{JSON.stringify(kind==='annotation'?{format:preview.summary.format,uniqueSampleIds:preview.summary.uniqueSampleIds,previewSampleIds:preview.summary.previewIds}:preview.summary,null,2)}</pre></details>}
  </div>;
}
function downloadTemplate(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function StatusChip({children}){return <span className="ri-status-chip">{children}</span>}
function History({entries,kind,onOpen}){
  return <section className="ri-history"><div className="ri-section-head"><Layers size={17}/><div><h3>Local import records</h3><p>Saved in this browser only, not an authoritative dataset or evaluation registry.</p></div></div>
    {entries.length?<div className="ri-history-list">{entries.slice(0,12).map(r=><div key={r.id}><div><strong>{r.fileName||'URI reference'}</strong><small>{r.id} · {date(r.createdAt)}</small></div>
        <StatusChip>{r.status}</StatusChip><button type="button" onClick={()=>onOpen(r)}>Inspect</button></div>)}</div>:<p className="ri-history-empty">No local {kind==='annotation'?'annotation returns':'evaluation results'} saved yet.</p>}
  </section>;
}

export function AnnotationReturnImport({batch,annotationImports=[],setAnnotationImports=()=>{},notify,navigate}){
  const [source,setSource]=useState('file'),[fileName,setFileName]=useState(''),[preview,setPreview]=useState(null),[sourceUri,setSourceUri]=useState('');
  const [fileError,setFileError]=useState(''),[record,setRecord]=useState(null);
  const history=annotationImports.filter(r=>r.batchId===batch.id).slice().reverse();
  const expected=batch.annotationReturn?.expected||batch.review?.approved||null;
  const memberIds=Array.isArray(batch.membershipSampleIds)?batch.membershipSampleIds:null;
  const inspectFile=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    setRecord(null);setPreview(null);setFileError('');setFileName(file.name);
    if(!/\.json$/i.test(file.name)){setFileError('Only COCO or RoadSift JSON is parsed in the browser preview.');return;}
    if(file.size>MAX_BYTES){setFileError('Local preview parser supports files up to 30 MB; larger packages need the backend importer.');return;}
    try{let parsed=JSON.parse(await file.text()),result=inspectAnnotations(parsed);
      if(memberIds&&result.summary){
        const extra=result.summary.sampleIds.filter(id=>!memberIds.includes(id));
        if(extra.length)result.warnings.unshift(extra.length+' preview sample IDs not found in listed batch members.');
      }
      setPreview(result);
    }catch(err){setFileError('Unable to read annotation JSON: '+errText(err));}
  };
  const save=()=>{
    if(source==='file'&&(!preview||preview.errors.length))return;
    if(source==='uri'&&!/^(r2|s3):\/\/[^/\s]+\/.+/.test(sourceUri.trim()))return;
    const item={id:'annotation_intake_'+Date.now().toString(36),batchId:batch.id,createdAt:new Date().toISOString(),
      fileName:source==='file'?fileName:null,uri:source==='uri'?sourceUri.trim():null,source,
      status:source==='file'?'Schema checked · needs reconciliation':'URI registered · unchecked',
      summary:preview?.summary?{format:preview.summary.format,samples:preview.summary.samples,annotations:preview.summary.annotations,classes:preview.summary.classes}:null,
      warnings:source==='file'?preview.warnings:[],verifiedMembership:false,contentVerified:false,annotatedDatasetVersionId:null};
    setAnnotationImports(prev=>[...prev,item]);setRecord(item);
    notify?.('Saved local annotation intake record. No dataset version created.');
  };
  return <section className="ri-page" aria-label="Import annotation results">
    <div className="ri-heading"><div><span className="ri-eyebrow">ANNOTATION / RETURN</span><h2>Import Annotation Results</h2><p>Receive labels from CVAT or an external annotation team and reconcile them with a Curated Batch.</p></div>
      <button type="button" className="ri-plain-button" onClick={()=>navigate('/batches/'+encodeURIComponent(batch.id)+'?view=handoff')}><ArrowLeft size={15}/> Curated Batch</button></div>
    <div className="ri-reference"><PackageCheck size={20}/><div><strong>{batch.name}</strong><span>{batch.id} · {count(expected||0)} expected returned samples (recorded aggregate)</span></div><StatusChip>{batch.annotationReturn?.status||'Not started'}</StatusChip></div>
    <div className="ri-layout"><div className="ri-main">
      <section className="ri-card"><SectionHead number="01" label="Result source" description="Choose an annotation JSON file or register an R2/S3 URI for a later backend import."/>
        <div className="ri-segment">{[['file','Upload result JSON'],['uri','Register object URI']].map(([v,l])=><button type="button" key={v} className={source===v?'active':''} onClick={()=>{setSource(v);setRecord(null)}}>{l}</button>)}</div>
        {source==='file'?<label className="ri-drop"><FileUp size={23}/><strong>{fileName||'Choose COCO / RoadSift annotation JSON'}</strong><span>COCO: images, annotations, categories · RoadSift: samples with sample_id</span>
          <input type="file" accept=".json,application/json" aria-label="Annotation result JSON" onChange={inspectFile}/></label>:
          <label className="ri-field">Storage URI<input value={sourceUri} onChange={e=>{setSourceUri(e.target.value);setRecord(null)}} placeholder="r2://bucket/annotation-returns/batch/result.json" aria-label="Annotation result URI"/></label>}
        {fileError&&<p className="ri-error"><AlertTriangle size={14}/>{fileError}</p>}
        <div className="ri-template"><button type="button" onClick={()=>downloadTemplate('annotation-coco-template.json',{images:[{id:1,file_name:'frame_001.jpg'}],categories:[{id:1,name:'car'}],annotations:[{id:1,image_id:1,category_id:1,bbox:[10,20,100,50]}]})}><FileJson size={14}/> Download COCO template</button></div>
        <p className="ri-muted">YOLO ZIP / CVAT task packages and large results require a backend importer; selecting a URI does not fetch or hash the object.</p>
      </section>
      <section className="ri-card"><SectionHead number="02" label="Validation preview" description="Check annotation structure first. Membership, class mapping and ground-truth quality need authoritative reconciliation."/>
        {source==='file'?<ResultBox preview={preview} kind="annotation"/>:<div className="ri-info"><Info size={17}/>URI-only import: content, counts, schema and checksum cannot be inspected until a backend worker fetches the object.</div>}
      </section>
    </div>
    <aside className="ri-side">
      <section className="ri-card"><SectionHead number="03" label="Reconcile & save" description="Preserve the result as a local intake record without modifying the canonical dataset."/>
        <div className="ri-checks"><div><CheckCircle2 size={17}/><span>Target batch selected</span></div>
          <div><ShieldAlert size={17}/><span>Exact sample membership · Not verified</span></div>
          <div><ShieldAlert size={17}/><span>Class map & label QA · Not verified</span></div>
          <div><LockKeyhole size={17}/><span>Artifact digest · Not verified</span></div></div>
        <button type="button" className="ri-primary" disabled={source==='file'?(!preview||preview.errors.length>0):!/^(r2|s3):\/\/[^/\s]+\/.+/.test(sourceUri.trim())} onClick={save}>Save local intake record <ArrowRight size={15}/></button>
        <button type="button" className="ri-disabled" disabled>Create Annotated Dataset Version</button>
        <p className="ri-muted">Only backend reconciliation can register a version of annotations against immutable membership. Schema checks are not validation of ground truth.</p>
        {record&&<div className="ri-success"><ClipboardCheck size={17}/><span>Saved <strong>{record.id}</strong> as <em>{record.status}</em></span></div>}
      </section>
    </aside></div>
    <History kind="annotation" entries={history} onOpen={setRecord}/>
    {record&&<details className="ri-record-inspector" open><summary>Selected intake record <ChevronDown size={15}/></summary><pre>{JSON.stringify(record,null,2)}</pre></details>}
  </section>;
}

export function EvaluationResultImport({evaluationImports=[],setEvaluationImports=()=>{},modelRegistryState=[],datasets=[],runs=[],notify,navigate}){
  const detectionModels=modelRegistryState.filter(m=>m.task==='Object Detection'||m.capabilities?.includes('predictions'));
  const [modelId,setModelId]=useState(detectionModels[0]?.id||''),[datasetId,setDatasetId]=useState(datasets[0]?.id||'');
  const [holdoutId,setHoldoutId]=useState('holdout_v1'),[runId,setRunId]=useState('');
  const [format,setFormat]=useState('json'),[fileName,setFileName]=useState(''),[preview,setPreview]=useState(null),[sourceUri,setSourceUri]=useState(''),[mode,setMode]=useState('file'),[error,setError]=useState(''),[active,setActive]=useState(null);
  const history=evaluationImports.slice().reverse();
  const file=async e=>{
    const f=e.target.files?.[0];if(!f)return;setFileName(f.name);setPreview(null);setError('');setActive(null);
    if(f.size>MAX_BYTES){setError('Preview parser supports files up to 30 MB.');return;}
    if(format==='json'&&!/\.json$/i.test(f.name)||format==='csv'&&!/\.csv$/i.test(f.name)){setError('File extension does not match the chosen format.');return;}
    try{const result=inspectEvaluation(await f.text(),format);setPreview(result);}catch(e){setError(errText(e))}
  };
  const embeddedIssues=preview?.summary?[
    ...(preview.summary.embeddedModel&&preview.summary.embeddedModel!==modelId?['Embedded model version differs from selected Model.']:[]),
    ...(preview.summary.embeddedDataset&&preview.summary.embeddedDataset!==datasetId?['Embedded dataset version differs from selected Dataset.']:[]),
    ...(preview.summary.embeddedHoldout&&preview.summary.embeddedHoldout!==holdoutId?['Embedded holdout differs from selected Holdout.']:[])
  ]:[];
  const valid=(mode==='file'&&preview&&!preview.errors.length&&!embeddedIssues.length)||(mode==='uri'&&/^(r2|s3):\/\/[^/\s]+\/.+/.test(sourceUri.trim()));
  const save=()=>{
    if(!valid||!modelId||!datasetId||!holdoutId)return;
    const item={id:'evaluation_intake_'+Date.now().toString(36),createdAt:new Date().toISOString(),
      status:mode==='file'?'Schema checked · unverified':'URI registered · unchecked',
      source:mode,fileName:mode==='file'?fileName:null,sourceUri:mode==='uri'?sourceUri.trim():null,
      modelVersionId:modelId,datasetVersionId:datasetId,holdoutId,runId:runId||null,
      metrics:mode==='file'?preview.summary.metrics:null,protocolVerified:false,artifactVerified:false,holdoutVerified:false,
      warnings:mode==='file'?preview.warnings:[],recordType:'local_import_preview'};
    setEvaluationImports(prev=>[...prev,item]);setActive(item);
    notify?.('Saved local evaluation intake record. No trusted evaluation evidence was registered.');
  };
  return <div className="page ri-page">
    <div className="ri-heading"><div><span className="ri-eyebrow">EVALUATION / INTAKE</span><h1>Import Evaluation Results</h1><p>Register model evaluation outputs from an external trainer or evaluator.</p></div>
      <button className="ri-plain-button" onClick={()=>navigate('comparison')}><ArrowLeft size={15}/> Strategy Comparison</button></div>
    <div className="ri-notice"><Info size={16}/><span>Local schema parsing only. This screen does not run a detector, check model weights, verify holdout leakage, or hash external artifacts.</span></div>
    <div className="ri-layout"><div className="ri-main">
      <section className="ri-card"><SectionHead number="01" label="Evaluation context" description="Explicitly select the model and dataset versions that produced these results."/>
        <div className="ri-fields-grid"><label className="ri-field">Model version<select aria-label="Evaluation model version" value={modelId} onChange={e=>setModelId(e.target.value)}>{detectionModels.map(m=><option value={m.id} key={m.id}>{m.name} · {m.id}</option>)}</select></label>
          <label className="ri-field">Dataset version<select aria-label="Evaluation dataset version" value={datasetId} onChange={e=>setDatasetId(e.target.value)}>{datasets.map(d=><option key={d.id} value={d.id}>{d.name} · {d.id}</option>)}</select></label>
          <label className="ri-field">Holdout<select aria-label="Evaluation holdout" value={holdoutId} onChange={e=>setHoldoutId(e.target.value)}><option value="holdout_v1">Fixed Holdout v1</option></select></label>
          <label className="ri-field">Related run (optional)<select value={runId} onChange={e=>setRunId(e.target.value)} aria-label="Related training or mining run"><option value="">Not linked</option>{runs.map(r=><option key={r.id} value={r.id}>{r.name} · {r.id}</option>)}</select></label></div>
      </section>
      <section className="ri-card"><SectionHead number="02" label="Result source" description="Read metrics JSON or a simple metric,value CSV, or register a remote URI."/>
        <div className="ri-segment">{[['file','Upload metrics'],['uri','Register result URI']].map(([v,l])=><button type="button" key={v} className={mode===v?'active':''} onClick={()=>{setMode(v);setPreview(null);setActive(null)}}>{l}</button>)}</div>
        {mode==='file'?<><label className="ri-field">Format<select value={format} onChange={e=>{setFormat(e.target.value);setPreview(null);setFileName('')}} aria-label="Metrics format"><option value="json">Metrics JSON</option><option value="csv">Metric / value CSV</option></select></label>
          <label className="ri-drop"><UploadCloud size={23}/><strong>{fileName||'Choose evaluation result file'}</strong><span>mAP50–95, AP50, precision, recall, VRU recall and ECE supported</span><input type="file" accept={format==='json'?'.json,application/json':'.csv,text/csv'} onChange={file} aria-label="Evaluation results file"/></label></>:
          <label className="ri-field">Storage URI<input aria-label="Evaluation result URI" value={sourceUri} onChange={e=>setSourceUri(e.target.value)} placeholder="r2://bucket/evaluations/run/report.json"/></label>}
        {error&&<p className="ri-error"><AlertTriangle size={14}/>{error}</p>}
        <div className="ri-template"><button type="button" onClick={()=>downloadTemplate('evaluation-metrics-template.json',{modelVersionId:modelId,datasetVersionId:datasetId,holdoutId,metrics:{map50_95:0.42,ap50:0.67,recall:0.72,precision:0.78,vru_recall:0.63}})}><FileJson size={14}/> Download metrics template</button></div>
      </section>
      <section className="ri-card"><SectionHead number="03" label="Validation preview" description="Review parsed metrics and surface provenance mismatches before saving the intake record."/>
        {mode==='file'?<ResultBox kind="evaluation" preview={preview}/>:<div className="ri-info"><Info size={17}/>Remote object content and checksum are not verified by this UI. Backend import remains pending.</div>}
        {embeddedIssues.map(m=><p key={m} className="ri-error"><AlertTriangle size={14}/>{m}</p>)}
      </section>
    </div><aside className="ri-side"><section className="ri-card"><SectionHead number="04" label="Register intake" description="Save a traceable local record. A verified Evaluation Record requires the external backend checks."/>
      <div className="ri-checks"><div><CheckCircle2 size={17}/>Model, dataset and holdout selected</div><div><ShieldAlert size={17}/>Fixed holdout version · Not verified</div>
        <div><ShieldAlert size={17}/>Evaluation protocol and model digest · Not verified</div><div><LockKeyhole size={17}/>Artifact integrity · Not verified</div></div>
      <button type="button" className="ri-primary" disabled={!valid||!modelId||!datasetId||!holdoutId} onClick={save}>Save local evaluation intake <ArrowRight size={15}/></button>
      <button type="button" className="ri-disabled" disabled>Publish verified Evaluation Record</button>
      <p className="ri-muted">Saved metrics can be inspected in Strategy Comparison as unverified intake, not used to claim uplift.</p>
      {active&&<div className="ri-success"><ClipboardCheck size={17}/>Saved <strong>{active.id}</strong></div>}
    </section></aside></div>
    <History kind="evaluation" entries={history} onOpen={setActive}/>
    {active&&<details className="ri-record-inspector" open><summary>Selected evaluation intake record <ChevronDown size={15}/></summary><pre>{JSON.stringify(active,null,2)}</pre></details>}
  </div>;
}
