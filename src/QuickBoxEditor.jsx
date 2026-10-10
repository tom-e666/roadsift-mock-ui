import React, {useEffect,useRef,useState} from 'react';
import {MousePointer2, Square, Trash2, Undo2, Redo2, Save, ZoomIn, ZoomOut} from 'lucide-react';
import {SampleMedia} from './SampleMedia.jsx';
import './quick-box-editor.css';
const DEFAULT_CLASSES=['car','person','cyclist','truck','bus','motorcycle'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function at(evt,element){
  const r=element.getBoundingClientRect();
  return {x:clamp((evt.clientX-r.left)/r.width*1000,0,1000),y:clamp((evt.clientY-r.top)/r.height*562,0,562)};
}
export function QuickBoxEditor({sample,initialBoxes=[],onSave,onToolChange=()=>{},onDirtyChange=()=>{},editable=true}){
  const [boxes,setBoxes]=useState(initialBoxes);
  const [selected,setSelected]=useState(null);
  const [tool,setTool]=useState('select');
  const [label,setLabel]=useState('car');
  const [undoStack,setUndoStack]=useState([]),[redoStack,setRedoStack]=useState([]);
  const [dirty,setDirty]=useState(false),[zoom,setZoom]=useState(1);
  const gesture=useRef(null),canvas=useRef(null);
  useEffect(()=>onDirtyChange(dirty),[dirty,onDirtyChange]);
  const keep=()=>{setUndoStack(old=>[...old,boxes.map(b=>({...b}))].slice(-30));setRedoStack([]);};
  const point=evt=>at(evt,canvas.current);
  const onStart=(evt,boxId=null,handle=null)=>{
    if(!editable||evt.button!==0)return;
    if(tool==='draw'&&boxId===null){
      keep();
      const p=point(evt),id='draft_'+Date.now().toString(36);
      setBoxes(current=>[...current,{id,label,x:p.x,y:p.y,w:1,h:1}]);
      setSelected(id);gesture.current={kind:'draw',id,start:p};setDirty(true);
    }else if(boxId){
      setSelected(boxId);
      if(tool!=='select')return;
      keep();
      const existing=boxes.find(b=>b.id===boxId);
      gesture.current={kind:handle?'resize':'move',id:boxId,origin:existing,start:point(evt),handle};
    }else setSelected(null);
    if(gesture.current){evt.currentTarget.setPointerCapture?.(evt.pointerId);evt.preventDefault();}
  };
  const onMove=evt=>{
    const g=gesture.current;if(!g)return;
    const p=point(evt);
    setBoxes(old=>old.map(b=>{
      if(b.id!==g.id)return b;
      if(g.kind==='draw'){return {...b,x:Math.min(g.start.x,p.x),y:Math.min(g.start.y,p.y),
        w:Math.max(1,Math.abs(p.x-g.start.x)),h:Math.max(1,Math.abs(p.y-g.start.y))};}
      const dx=p.x-g.start.x,dy=p.y-g.start.y,o=g.origin;
      if(g.kind==='move')return {...b,x:clamp(o.x+dx,0,1000-o.w),y:clamp(o.y+dy,0,562-o.h)};
      const x2=o.x+o.w,y2=o.y+o.h;
      return {...b,w:Math.max(8,clamp(x2+dx,0,1000)-o.x),h:Math.max(8,clamp(y2+dy,0,562)-o.y)};
    }));
    setDirty(true);
  };
  const onEnd=evt=>{
    if(!gesture.current)return;
    gesture.current=null;
    if(evt.currentTarget.hasPointerCapture?.(evt.pointerId))evt.currentTarget.releasePointerCapture(evt.pointerId);
    setBoxes(old=>old.filter(b=>b.w>=8&&b.h>=8));
  };
  const historyMove=(stack,setStack,other,setOther)=>{
    if(!stack.length)return;
    setOther(prev=>[...prev,boxes.map(b=>({...b}))]);
    setBoxes(stack[stack.length-1]);
    setStack(prev=>prev.slice(0,-1));
    setDirty(true);
  };
  const remove=()=>{
    if(!selected||!editable)return;keep();setBoxes(old=>old.filter(b=>b.id!==selected));setSelected(null);setDirty(true);
  };
  const relabel=value=>{
    setLabel(value);
    if(selected&&editable){keep();setBoxes(old=>old.map(b=>b.id===selected?{...b,label:value}:b));setDirty(true);}
  };
  return <div className="qb-editor qb-studio">
    <div className="qb-studio-layout">
      <aside className="qb-rail" role="toolbar" aria-label="CVAT-inspired annotation tools">
        <button type="button" disabled={!editable} aria-pressed={tool==='select'} title="Select and move (V)" onClick={()=>{setTool('select');onToolChange(false)}}><MousePointer2 size={18}/><small>Select</small></button>
        <button type="button" disabled={!editable} aria-pressed={tool==='draw'} title="Draw box (B)" onClick={()=>{setTool('draw');onToolChange(true)}}><Square size={18}/><small>Box</small></button>
        <span className="qb-rail-divider"/>
        <button type="button" disabled={!editable||!selected} title="Delete selected box" onClick={remove}><Trash2 size={17}/><small>Delete</small></button>
        <button type="button" disabled={!editable||!undoStack.length} title="Undo" onClick={()=>historyMove(undoStack,setUndoStack,redoStack,setRedoStack)}><Undo2 size={17}/><small>Undo</small></button>
        <button type="button" disabled={!editable||!redoStack.length} title="Redo" onClick={()=>historyMove(redoStack,setRedoStack,undoStack,setUndoStack)}><Redo2 size={17}/><small>Redo</small></button>
      </aside>
      <div className="qb-stage-column">
        <div className="qb-toolbar">
          <div className="qb-toolbar-title"><strong>Image canvas</strong><small>{sample.id} · {editable?'Quick Edit':'Read only'}</small></div>
          <div className="qb-tools"><button type="button" onClick={()=>setZoom(z=>Math.max(1,z-.2))} aria-label="Zoom out"><ZoomOut size={15}/></button>
            <span className="qb-zoom-label">{Math.round(zoom*100)}%</span>
            <button type="button" onClick={()=>setZoom(z=>Math.min(2,z+.2))} aria-label="Zoom in"><ZoomIn size={15}/></button>
            <button type="button" onClick={()=>setZoom(1)}>Fit</button></div>
        </div>
        <div className="qb-canvas-viewport">
          <div className="qb-stage" style={{transform:'scale('+zoom+')'}}>
            <SampleMedia sample={sample} large/>
            <svg ref={canvas} viewBox="0 0 1000 562" preserveAspectRatio="none" className="qb-svg"
              onPointerDown={e=>onStart(e)} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}>
              {boxes.map(box=><g key={box.id}>
                <rect x={box.x} y={box.y} width={box.w} height={box.h}
                  fill={selected===box.id?'#268dff1d':'transparent'} stroke={selected===box.id?'#fff':'#52a7ff'} strokeWidth="2.5"
                  onPointerDown={e=>{e.stopPropagation();onStart(e,box.id);}}/>
                <rect x={box.x} y={Math.max(0,box.y-23)} width={Math.max(54,box.label.length*13)} height="21" fill="#1769a9" pointerEvents="none"/>
                <text x={box.x+6} y={Math.max(16,box.y-7)} fontSize="15" fill="white" pointerEvents="none">{box.label}</text>
                {selected===box.id&&editable&&tool==='select'&&<rect x={box.x+box.w-7} y={box.y+box.h-7} width="14" height="14" fill="white" stroke="#268dff" strokeWidth="2"
                  onPointerDown={e=>{e.stopPropagation();onStart(e,box.id,'corner');}}/>}
              </g>)}
            </svg>
          </div>
        </div>
        <div className="qb-footer"><span>{dirty?'Unsaved draft changes · ':''}{tool==='draw'?'Drag to draw a box':'Select a box to move / resize'} · No imported model predictions</span>
          <button type="button" disabled={!editable||!dirty} onClick={()=>{onSave(boxes.map(b=>({...b})));setDirty(false)}}><Save size={15}/> Save Draft</button></div>
      </div>
      <aside className="qb-objects" aria-label="Draft annotation objects">
        <header><div><strong>Objects</strong><small>Human draft layer</small></div><span>{boxes.length}</span></header>
        <div className="qb-object-scroll">
          {boxes.length?boxes.map((box,i)=><button type="button" key={box.id} className={'qb-object'+(selected===box.id?' is-selected':'')}
            onClick={()=>{setSelected(box.id);setTool('select');onToolChange(false)}}>
            <span className="qb-object-icon"><Square size={14}/></span><span><strong>{box.label}</strong><small>Box {i+1} · {Math.round(box.w)} × {Math.round(box.h)}</small></span></button>):
            <p className="qb-empty-objects">No draft boxes yet. Choose <strong>Box</strong> in the toolbar and drag over the image.</p>}
        </div>
        {selected&&<div className="qb-object-properties"><strong>Selected object</strong><label>Class<select value={boxes.find(b=>b.id===selected)?.label||label} disabled={!editable} aria-label="Selected object class" onChange={e=>relabel(e.target.value)}>{DEFAULT_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
          <span>Selection handles let you move and resize geometry.</span></div>}
        <footer>Drafts are separate from model predictions and become valid annotations only after a review workflow.</footer>
      </aside>
    </div>
  </div>;
}
