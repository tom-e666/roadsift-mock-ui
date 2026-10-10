import React from 'react';
import {sceneUrl} from './data.js';
import './sample-media.css';

// Shared display primitive: Explorer and Batch Review use the same media presentation.
// These fixture scenes are NOT verified batch members, model predictions, or annotations.
export function SampleMedia({sample,overlay=false,className='',children,large=false}){
  if(!sample)return <div className="rs-media rs-media--empty">No sample selected</div>;
  return <div className={'rs-media '+className+(large?' rs-media--large':'')}>
    <img src={sceneUrl(sample.scene)} alt={'Illustrative driving scene for '+sample.id} loading={large?'eager':'lazy'}/>
    {overlay&&<div className="rs-media-demo-overlay" aria-hidden="true">
      <span className="rs-box rs-box--car">car · demo</span>
      <span className="rs-box rs-box--person">person · demo</span>
    </div>}
    {children}
  </div>;
}
