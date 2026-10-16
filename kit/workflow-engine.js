/* Workflow: independent Canvas2D process/factory renderer. It never constructs
 * an object mesh, camera, light, WebGL context or a Studio frame. */
(function (g) {
  'use strict';
  const MX = g.MX = g.MX || {}, E = MX.workflowEngine = {}, P = MX.presentation;
  const { text, line, box, smooth, clamp } = P.util;
  E.layout = (count, W, H) => {
    const positions = [], cols = 2, origin = H < 1600 ? 255 : 295;
    const rowH = Math.min(255, (H * (H < 1600 ? .59 : .64) - origin - 150) / Math.max(1, Math.ceil(count / cols) - 1));
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols), col = row % 2 ? 1 - i % cols : i % cols;
      positions.push({ x: W * (col ? .71 : .29), y: origin + row * rowH });
    }
    return positions;
  };
  function polygon(c, points, fill, stroke) {
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  }
  function conveyor(c, from, to, T, t, active) {
    c.save(); c.lineJoin = 'round';
    const side=from.x>500?1:-1;
    const points = from.x===to.x ? [[from.x+side*130,from.y+58],[from.x+side*170,from.y+58],[to.x+side*170,to.y+58],[to.x+side*130,to.y+58]] : [[from.x,from.y+42],[to.x,to.y+42]];
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p));
    c.strokeStyle = T.plateEdge; c.lineWidth = 28; c.stroke();
    c.strokeStyle = T.paper; c.lineWidth = 20; c.stroke();
    c.setLineDash([3, 14]); c.lineDashOffset = -t * 22; c.strokeStyle = active ? T.teal : T.mute; c.lineWidth = 12; c.stroke(); c.setLineDash([]);
    if (active) {
      const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
      let distance=((t*.55)%1)*lengths.reduce((s,n)=>s+n,0),segment=0;
      while(segment<lengths.length-1&&distance>lengths[segment])distance-=lengths[segment++];
      const a=points[segment],b=points[segment+1],u=distance/Math.max(.001,lengths[segment]);
      const x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u;
      box(c, x - 20, y - 13, 40, 26, T.teal, null, 4);
      line(c, [x - 9, y - 4], [x + 9, y - 4], T.paper, 3); line(c, [x - 9, y + 4], [x + 4, y + 4], T.paper, 3);
    }
    c.restore();
  }
  function machine(c, at, item, index, active, T, t, available, compact) {
    const x = at.x, y = at.y, w = compact ? 240 : 260, h = compact ? 90 : 118, d = 26;
    c.save(); c.globalAlpha = available;
    polygon(c, [[x-w/2,y],[x+w/2,y],[x+w/2+d,y-d],[x-w/2+d,y-d]], MX.mix(T.plate, T.ink, .08), T.plateEdge);
    polygon(c, [[x+w/2,y],[x+w/2+d,y-d],[x+w/2+d,y+h-d],[x+w/2,y+h]], MX.mix(T.plate, T.ink, .17), T.plateEdge);
    box(c, x-w/2, y, w, h, T.plate, active ? T.teal : T.plateEdge, 5);
    box(c, x-w/2+18, y+18, w-36, 48, T.paper, T.plateEdge, 4);
    // The mechanism symbol rotates as the operation runs; it is explicitly a
    // process metaphor, not a physical machine specified by the object evidence.
    c.save(); c.translate(x-83, y+42); c.rotate(active ? t * 1.3 : 0);
    for (let k=0;k<8;k++) { c.rotate(Math.PI/4); c.fillStyle=active?T.teal:T.mute;c.fillRect(12,-3,8,6); }
    c.beginPath();c.arc(0,0,12,0,Math.PI*2);c.strokeStyle=active?T.teal:T.mute;c.lineWidth=3;c.stroke();c.restore();
    text(c, 'OP '+String(index+1).padStart(2,'0'), x-50, y+49, 24, 150, T.ink, 700);
    text(c, item.title, x-w/2, y+h+32, compact?21:24, w+24, T.ink, active?700:500);
    c.fillStyle=active?T.teal:T.plateEdge;c.beginPath();c.arc(x+w/2-20,y+h-26,6,0,Math.PI*2);c.fill();
    for(let k=0;k<6;k++) {c.fillStyle=T.plateEdge;c.fillRect(x-w/2+20+k*22,y+h-30,12,4);}
    c.restore();
  }
  E.run = ({ spec, validation, config, W, H, length }) => {
    const plan = P.plan(spec, 'workflow', length), T = MX.THEME;
    const capacity = H < 1600 ? 4 : 6;
    return P.mount({ plan, spec, validation, config, W, H, engine: 'workflow-canvas2d',
      diagnostics: t => {const a=P.at(plan,t);return {operation:a.index,sourceStep:a.item.index,renderer:'canvas2d',studioFrames:0};},
      draw(c, a) {
        c.save(); c.fillStyle=T.paper;c.fillRect(0,0,W,H);
        const short = H < 1600, factoryBottom = H * (short ? .59 : .64), start = Math.floor(a.index/capacity)*capacity;
        const items=plan.items.slice(start,start+capacity), stations=E.layout(items.length,W,H);
        // Architectural plant floor and a conveyor network occupy the scene.
        c.save();c.beginPath();c.rect(42,210,W-84,factoryBottom-190);c.clip();
        for(let x=-H;x<W+H;x+=72) line(c,[x,210],[x+H*.6,factoryBottom+50],MX.rgba(T.ink,.05),1);
        for(let y=220;y<factoryBottom;y+=60) line(c,[42,y],[W-42,y],MX.rgba(T.ink,.05),1);
        c.restore();
        for(let j=1;j<stations.length;j++) conveyor(c,stations[j-1],stations[j],T,a.t,start+j<=a.index&&!a.intro);
        items.forEach((item,j)=>machine(c,stations[j],item,start+j,start+j===a.index&&!a.closing,T,a.t,smooth((a.t-.25-j*.16)/.6),short));
        text(c,'WORKFLOW / PROCESS LINE',64,66,19,W-128,T.teal,700);
        text(c,spec.title,64,124,40,W-128,T.ink,700);
        text(c,'ILLUSTRATIVE FLOW • OPERATIONS FROM THE SPEC',64,185,17,W-128,T.mute);
        const y0=factoryBottom+24;
        c.fillStyle=T.teal;c.fillRect(64,y0,72,5);
        let y=y0+55;
        y+=text(c,a.closing?'OUTPUT / CHECK':a.intro?'INPUT / START':'OPERATION '+String(a.index+1).padStart(2,'0'),64,y,20,W-128,T.teal,700)+22;
        y+=text(c,a.closing?(validation.verdict?.state||'NOTHING CHECKED'):a.item.title,64,y,short?34:44,W-128,T.ink,700)+22;
        y+=text(c,a.closing?'The evidence verdict comes from the gate; station movement is illustrative.':a.item.formula,64,y,short?24:30,W-128,T.mute)+22;
        if(!a.closing) text(c,a.item.value||'',64,y,short?32:42,W-128,T.teal,700);
        else {
          const checks=validation.verdict?.checked||0;
          text(c,checks+' published comparisons • '+(validation.verdict?.estimated||0)+' estimated claims',64,y,24,W-128,T.ink);
        }
        // Schematic routing timeline, visually unrelated to Studio's object HUD.
        const bottom=H-80;line(c,[64,bottom],[W-64,bottom],T.plateEdge,4);
        const amount=clamp((a.t-plan.begin)/(plan.end-plan.begin));line(c,[64,bottom],[64+(W-128)*amount,bottom],T.teal,4);
        text(c,config.background.toUpperCase()+' / '+(a.index+1)+' OF '+plan.items.length,64,H-35,16,W-128,T.mute);
        c.restore();
      },
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
