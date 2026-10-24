(function(g){
  'use strict';const MX=g.MX,T=g.THREE,W=1600,H=900,qs=new URLSearchParams(location.search),id=qs.get('item')||'spur',meta=g.STUDIO_REVISION.find(x=>x.id===id);
  if(!meta||!g.RevisionModels[id])throw Error('Unknown Studio revision '+id);
  const m=g.RevisionModels[id](),st=MX.gl.stage({w:W,h:H,fov:32,renderScale:1,environment:'room',exposure:.95,envIntensity:.85,ao:.55,bloom:.015,ssr:false,toneMap:'agx'});
  st.floor.visible=false;st.key.position.set(-70,100,150);st.key.intensity=2.1;st.fill.position.set(80,15,70);st.fill.intensity=.9;st.rim.position.set(20,70,-90);st.rim.color.set('#9ecfff');st.rim.intensity=2;
  const bg=document.createElement('canvas');bg.width=W;bg.height=H;const bx=bg.getContext('2d'),grad=bx.createRadialGradient(910,390,40,900,440,950);grad.addColorStop(0,'#263f53');grad.addColorStop(.65,'#101e2f');grad.addColorStop(1,'#060e1a');bx.fillStyle=grad;bx.fillRect(0,0,W,H);st.scene.background=new T.CanvasTexture(bg);st.scene.background.colorSpace=T.SRGBColorSpace;
  st.scene.add(m.root);
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const text=(ctx,s,x,y,size,color='#e3edf3',weight=500)=>{ctx.fillStyle=color;ctx.font=`${weight} ${size}px Inter`;ctx.fillText(s,x,y);};
  const b=new T.Box3(),centre=new T.Vector3();let diagnostics={};
  // Determine one stable centre from the assembled object, never recenter each
  // rotating frame. Fit each chapter once across sampled poses to prevent crop.
  function pose(t){const chapter=Math.min(2,Math.floor(t/4)),u=(t%4)/4;m.reset();m.pose(t,chapter);m.explode(chapter===2?smooth(u*1.5):0);m.root.updateMatrixWorld(true);return{chapter,u};}
  pose(2);b.setFromObject(m.root);b.getCenter(centre);m.root.position.sub(centre);
  if(m.view?.roll)m.root.rotation.z=m.view.roll;
  const views=[{yaw:m.view?.yaw??-24,pitch:m.view?.pitch??20},{yaw:(m.view?.yaw??-24)+14,pitch:(m.view?.pitch??20)+6},{yaw:(m.view?.yaw??-24)-13,pitch:(m.view?.pitch??20)-3}],zooms=[];
  function bounds(){const p=new T.Vector3(),v=new T.Vector3();const box=[Infinity,Infinity,-Infinity,-Infinity];m.root.traverse(o=>{if(!o.isMesh||!o.visible)return;let parent=o.parent;while(parent&&parent!==m.root){if(!parent.visible)return;parent=parent.parent;}const a=o.geometry.attributes.position;for(let i=0;i<a.count;i+=Math.max(1,Math.floor(a.count/2500))){v.fromBufferAttribute(a,i);p.copy(v).applyMatrix4(o.matrixWorld).project(st.camera);box[0]=Math.min(box[0],(p.x+1)*W/2);box[1]=Math.min(box[1],(1-p.y)*H/2);box[2]=Math.max(box[2],(p.x+1)*W/2);box[3]=Math.max(box[3],(1-p.y)*H/2);}});return box;}
  for(let ch=0;ch<3;ch++){
    let low=.5,high=22;
    for(let iter=0;iter<11;iter++){const z=(low+high)/2;let fits=true;for(const t of [ch*4+.01,ch*4+1,ch*4+2.5,ch*4+3.99]){const {u}=pose(t);st.setView({...views[ch],yaw:views[ch].yaw+5*(smooth(u)-.5),zoom:z,cx:1005,cy:465});m.root.updateMatrixWorld(true);const a=bounds();if(a[0]<550||a[1]<147||a[2]>1495||a[3]>795)fits=false;}if(fits)low=z;else high=z;}zooms.push(low*.975);
  }
  function paint(ctx,t){
    const {chapter,u}=pose(t),view={...views[chapter],yaw:views[chapter].yaw+5*(smooth(u)-.5),zoom:zooms[chapter],cx:1005,cy:465};st.setView(view);m.root.updateMatrixWorld(true);st.render();st.blit(ctx);
    text(ctx,'MECHANISM / STUDIO',65,57,18,'#9ab7c8',650);text(ctx,meta.title,65,147,meta.title.length>20?33:38,'#e4eef5',650);
    const copy=meta.chapters[chapter];text(ctx,copy[0],68,201,23,'#d8e8f0',600);copy.slice(1).forEach((s,i)=>text(ctx,s,68,238+i*32,20,'#9eb7c6'));
    text(ctx,meta.reference,65,814,16,'#a5c5d7');text(ctx,'SOURCE-BACKED PRINCIPLE · DIMENSIONS / INTERNAL DETAILS APPROXIMATED',65,856,14,'#92adbf');text(ctx,`0${chapter+1} / 03`,1440,856,18,'#a4c6d7');
    const fade=Math.max(0,1-Math.min(t%4,4-t%4)/.10);if(t>3.8&&t<8.2&&fade){ctx.fillStyle=`rgba(7,15,27,${fade})`;ctx.fillRect(0,0,W,H);}
    diagnostics={id,t,chapter,renderer:'original-studio',parts:m.parts.length,screenBounds:bounds(),contextLost:st.renderer.getContext().isContextLost(),...m.check()};
  }
  g.__revision={m,st,meta,zooms};g.__revisionDiagnostics=()=>diagnostics;g.__specInfo=()=>({duration:12,source:meta.source,known:meta.known,estimated:meta.estimated,engine:'studio'});
  MX.run({w:W,h:H,fps:30,duration:12,draw:paint});
})(window);
