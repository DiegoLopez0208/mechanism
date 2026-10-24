(function(g){
  'use strict';
  const {T,P,tau,mat,mesh,group,at,circle,extrude,profile,ring,cylinder,box,gear,sector,bolt,link,spring,helix,model}=g.RevisionGeometry,B=g.RevisionModels;
  const axisY=o=>{const q=group(o);q.rotation.x=-Math.PI/2;return q;},axisX=o=>{const q=group(o);q.rotation.y=Math.PI/2;return q;};
  B.universal=()=>{
    const m=model();
    function fork(sign){const q=group(at(ring(3,9,17,mat.dark),0,0,sign*19));for(let s of [-1,1]){q.add(at(box(5,10,14,mat.steel),s*7,0,sign*7));q.add(at(axisX(ring(2.6,5,5,mat.steel)),s*7,0,0));}return q;}
    const a=m.part('input fork',fork(-1),[0,0,0],[0,0,-16]),b=m.part('output fork',fork(1),[0,0,0],[7,0,16]);
    const cross=group(box(7,7,7,mat.bronze),axisX(cylinder(2.4,20)),axisY(cylinder(2.4,20)));
    const x=m.part('pivot block',cross,[0,0,0],[0,0,0]);
    const beta=20*Math.PI/180,axis=new T.Vector3(Math.sin(beta),0,Math.cos(beta));let err=0;
    m.pose=t=>{const theta=t*.65,u=new T.Vector3(Math.cos(theta),Math.sin(theta),0),v=new T.Vector3().crossVectors(axis,u).normalize(),w=new T.Vector3().crossVectors(u,v).normalize();a.rotation.z=theta;b.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(v,new T.Vector3().crossVectors(axis,v).normalize(),axis));x.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(u,v,w));err=Math.abs(u.dot(v))+Math.abs(v.dot(axis));};
    m.check=()=>({shaftAngleDegrees:20,pivotOrthogonalityError:err});return m;
  };
  B.screw=()=>{
    const m=model(),shaft=group(cylinder(6,112),helix(6,8,4,108));
    const s=m.part('trapezoidal screw',shaft,[0,0,0],[0,0,0]);
    const female=group(ring(8.35,15,20,mat.bronze,0,Math.PI),helix(8.35,6.3,4,16,mat.bronze,0,Math.PI,Math.PI*1.5));
    female.add(at(ring(8.4,20,3,mat.bronze,0,Math.PI),0,0,-8));
    const nut=m.part('sectioned nut',female,[0,0,0],[22,0,0]);
    m.part('support bearing',ring(6.2,13,8,mat.dark),[0,0,-48],[0,0,-13]);m.part('support bearing end',ring(6.2,13,8,mat.dark),[0,0,48],[0,0,13]);
    m.pose=t=>{s.rotation.z=t*1.2;nut.position.z=-4*s.rotation.z/tau+4;};
    m.view={yaw:-49,pitch:26,roll:-.38};m.check=()=>({lead:4,threadIncludedAngle:30,angle:s.rotation.z,nutZ:nut.position.z,error:nut.position.z-(4-4*s.rotation.z/tau)});return m;
  };
  B.pump=()=>{
    const m=model(),p1=m.part('driving gear',gear(16,1.3,12,mat.steel,3.1),[-10.4,0,0],[0,0,9]),p2=m.part('driven gear',gear(16,1.3,12,mat.bronze,3.1),[10.4,0,0],[0,0,9]);
    // Casing cavity is the union of two intersecting circles, not a solid box.
    const R=12.1,c=10.4,theta=Math.acos((c-4)/R),sidePoints=[[-4,19],[-27,19],[-30,16],[-30,-16],[-27,-19],[-4,-19]];
    for(let i=0;i<=160;i++){const a=tau-theta-(tau-2*theta)*i/160;sidePoints.push([-c+R*Math.cos(a),R*Math.sin(a)]);}
    const left=profile(sidePoints,15,mat.blue),right=profile(sidePoints.map(([x,y])=>[-x,y]).reverse(),15,mat.blue);
    m.part('open pump casing',group(left,right),[0,0,0],[0,0,-8]);
    const cover=group(box(60,38,4,mat.dark));for(const x of [-24,24])for(const y of [-14,14])cover.add(at(bolt(1.4,7),x,y,0));
    const cap=m.part('end cover',cover,[0,0,10],[24,0,28]);
    m.part('rear cover',box(60,38,4,mat.blue),[0,0,-10],[0,0,-20]);
    m.part('inlet stub',axisY(ring(4,6.5,15,mat.dark)),[0,24,0],[0,10,0]);m.part('outlet stub',axisY(ring(4,6.5,15,mat.dark)),[0,-24,0],[0,-10,0]);
    for(const x of [-10.4,10.4])m.part('shaft '+x,cylinder(3,30),[x,0,-5],[0,0,-20]);
    const dots=[];for(let i=0;i<10;i++){dots.push(m.part('transport marker '+i,mesh(new T.SphereGeometry(.65,12,8),new T.MeshBasicMaterial({color:i<5?'#78cde5':'#e6ae61'}))));}
    m.pose=(t,chapter)=>{p1.rotation.z=t*.7;p2.rotation.z=-t*.7+Math.PI/16;cap.visible=chapter===2;dots.forEach((d,i)=>{d.visible=chapter===1;const side=i<5?-1:1,u=(t*.13+(i%5)/5)%1,a=side<0?Math.PI/2+u*Math.PI:Math.PI/2-u*Math.PI;d.position.set(side*10.4+11.65*Math.cos(a),11.65*Math.sin(a),8);});};
    m.check=()=>({gearCentres:p1.position.distanceTo(p2.position),target:20.8,ratio:-1,flow:'illustrative outer path, not CFD'});return m;
  };
  B.butterfly=()=>{
    const m=model();
    const body=group(ring(26,34,15,mat.red,Math.PI*1.5,Math.PI*1.5),at(box(17,18,15,mat.red),0,40,0),at(axisY(ring(3.3,7,22,mat.red)),0,36,0));
    for(const x of [-29,29])body.add(at(ring(2.5,6,15,mat.red),x,-18,0));
    m.part('body section',body,[0,0,0],[0,0,-12]);
    m.part('resilient seat',ring(24,26,12,mat.rubber,Math.PI*1.5,Math.PI*1.5),[0,0,0],[0,0,12]);
    const discGeo=group(cylinder(23.8,2.5),axisY(cylinder(3,64)),at(box(30,3,7,mat.dark),13,51,0));
    const disc=m.part('disc and stem',discGeo,[0,0,0],[0,18,25]);
    m.pose=(t,chapter)=>{disc.rotation.y=chapter===2?.65:(.5-.5*Math.cos(t*.8))*Math.PI/2;};m.check=()=>({discDegrees:disc.rotation.y*180/Math.PI,travelRange:[0,90]});return m;
  };
  B.ball=()=>{
    const m=model(),R=16,bore=9,zmax=Math.sqrt(R*R-bore*bore),ps=[];
    for(let i=0;i<=96;i++){const z=-zmax+2*zmax*i/96;ps.push(new T.Vector2(Math.sqrt(R*R-z*z),z));}ps.push(new T.Vector2(bore,zmax),new T.Vector2(bore,-zmax),ps[0].clone());
    const sphereGeo=new T.LatheGeometry(ps,160);sphereGeo.rotateX(Math.PI/2);
    const ball=m.part('bored ball',group(mesh(sphereGeo),axisY(cylinder(3,32)),at(box(30,3,7,mat.blue),12,32,0)),[0,0,0],[0,12,0]);
    const shell=group(ring(17.5,23,33,mat.dark,Math.PI*1.5,Math.PI*1.5));
    for(const x of [-18,18])for(const y of [-18,18])shell.add(at(bolt(1.5,44),x,y,0));
    m.part('body section',shell,[0,0,0],[0,0,-8]);
    for(const side of [-1,1]){
      m.part('seat '+side,ring(9.1,16,3,mat.white),[0,0,side*14.5],[0,0,side*13]);
      const flangeShape=new T.Shape([new T.Vector2(-22,-25),new T.Vector2(22,-25),new T.Vector2(25,-22),new T.Vector2(25,22),new T.Vector2(22,25),new T.Vector2(-22,25),new T.Vector2(-25,22),new T.Vector2(-25,-22)]);flangeShape.holes.push(circle(9.1));for(const x of [-18,18])for(const y of [-18,18])flangeShape.holes.push(circle(1.8,x,y));
      m.part('end body '+side,group(extrude(flangeShape,5),at(ring(9.1,13,14),0,0,side*9.5)),[0,0,side*20],[0,0,side*24]);
    }
    m.pose=(t,chapter)=>{ball.rotation.y=chapter===2?.55:(.5-.5*Math.cos(t*.7))*Math.PI/2;};m.view={yaw:-35,pitch:24};m.check=()=>({ballRadius:16,bore:18,angleDegrees:ball.rotation.y*180/Math.PI});return m;
  };
  B.check=()=>{
    const m=model(),body=m.part('sectioned body',ring(11,17,58,mat.steel,Math.PI*1.5,Math.PI*1.5),[0,0,0],[0,0,0]);
    m.part('inlet seat',ring(6.5,11,4,mat.white),[0,0,-20],[0,0,-12]);
    const pp=[[0,-1],[9,-1],[9,1],[6,3],[6,5],[0,5],[0,-1]].map(p=>new T.Vector2(...p)),pg=new T.LatheGeometry(pp,96);pg.rotateX(Math.PI/2);
    const pop=m.part('poppet',group(mesh(pg,mat.dark),at(cylinder(2,19),0,0,10)),[0,0,-17],[15,0,0]);
    const sp=m.part('spring',spring(6,.9,9,30),[0,0,3],[0,0,20]);
    m.part('spring stop',ring(2.5,10,3,mat.bronze),[0,0,19],[0,0,28]);
    m.part('inlet connector',ring(6.5,13,11),[0,0,-31],[0,0,-17]);m.part('outlet connector',ring(6.5,13,11),[0,0,31],[0,0,20]);
    let lift=0;m.pose=(t,chapter)=>{lift=chapter===2?3:4*(.5-.5*Math.cos(t*.9));pop.position.z=-17+lift;sp.position.z=3+lift/2;sp.scale.z=(30-lift)/30;};m.view={yaw:-42,pitch:20,roll:-.3};m.check=()=>({lift,springLength:30-lift,forces:'not simulated'});return m;
  };
  B.brake=()=>{
    const m=model(),rotor=group(at(ring(25,48,2.5,mat.steel),0,0,-3.5),at(ring(25,48,2.5,mat.steel),0,0,3.5),at(ring(6,26,3,mat.dark),0,0,-5));
    for(let i=0;i<28;i++){const a=i*tau/28,v=box(18,1.2,5,mat.dark);v.rotation.z=a;rotor.add(at(v,36*Math.cos(a),36*Math.sin(a),0));}
    for(let i=0;i<6;i++){const a=i*tau/6;rotor.add(at(bolt(1.5,5),18*Math.cos(a),18*Math.sin(a),-5));}
    const disc=m.part('ventilated rotor',rotor,[0,0,0],[0,0,-9]),calipers=[],pads=[],pistons=[];
    for(const side of [-1,1]){
      const sh=new T.Shape([new T.Vector2(26,-24),new T.Vector2(49,-24),new T.Vector2(53,-16),new T.Vector2(53,16),new T.Vector2(49,24),new T.Vector2(26,24)]);
      for(const y of [-11,11])sh.holes.push(circle(7.5,37,y));
      calipers.push(m.part('caliper half '+side,extrude(sh,7,mat.red,.45),[0,0,side*13],[0,0,side*18]));
      pads.push(m.part('friction pad '+side,sector(29,46,-.43,.43,2.5,mat.friction),[0,0,side*7],[0,0,side*10]));
      for(const y of [-11,11])pistons.push(m.part('piston '+side+' '+y,cylinder(7.15,5,mat.steel),[37,y,side*12],[0,0,side*21]));
    }
    for(const y of [-24,24])m.part('bridge '+y,box(15,5,30,mat.red),[40,y,0],[8,Math.sign(y)*8,0]);
    m.pose=(t,chapter)=>{const closing=(.5-.5*Math.cos(t*.9));disc.rotation.z=t*.3;pads.forEach((p,i)=>p.position.z=(i?1:-1)*(7-closing*.8));pistons.forEach((p,i)=>p.position.z=(i<2?-1:1)*(12-closing*.8));if(chapter===1)calipers[1].visible=false;};m.check=()=>({rotorOuterDiameter:96,pistonCount:4,mechanics:'prescribed pad motion; no torque or heat simulation'});return m;
  };
  B.clutch=()=>{
    const m=model(),basket=group(at(ring(6,31,4,mat.dark),0,0,-15));
    for(let i=0;i<12;i++){const a=i*tau/12;basket.add(sector(28.5,31,a-.075,a+.075,29,mat.blue));}
    const drum=m.part('outer basket',basket,[0,0,0],[0,0,-23]);
    const hub=group(ring(5,13,32,mat.steel));for(let i=0;i<12;i++){const a=i*tau/12;hub.add(sector(12.7,14.2,a-.075,a+.075,28,mat.steel));}
    const inner=m.part('inner splined hub',hub,[0,0,0],[0,0,20]),plates=[];
    for(let i=0;i<9;i++){
      const friction=i%2===0,sh=new T.Shape();sh.absarc(0,0,friction?27:26.8,0,tau,false);
      if(friction)sh.holes.push(circle(14.6));else{const hp=[];for(let j=0;j<12;j++){const a=j*tau/12;for(const [da,r]of [[-.11,13.3],[-.11,14.5],[.11,14.5],[.11,13.3],[tau/12-.11,13.3]])hp.push(new T.Vector2(r*Math.cos(a+da),r*Math.sin(a+da)));}sh.holes.push(new T.Path(hp));}
      const pack=group(extrude(sh,1.3,mat.steel,.06));
      if(friction){for(let j=0;j<12;j++){const a=j*tau/12;pack.add(sector(17,26.7,a+.015,a+tau/12-.015,.22,mat.friction));pack.children.at(-1).position.z=.72;pack.add(sector(17,26.7,a+.015,a+tau/12-.015,.22,mat.friction));pack.children.at(-1).position.z=-.72;pack.add(sector(26.7,29,a+.12,a+tau/12-.12,1.3,mat.steel));}}
      plates.push(m.part((friction?'friction':'steel')+' plate '+i,pack,[0,0,(i-4)*2],[0,0,(i-4)*5]));
    }
    const pressure=m.part('pressure ring',ring(14.6,27.2,3,mat.steel),[0,0,12],[0,0,28]);
    m.pose=(t,chapter)=>{const closing=.5-.5*Math.cos(t*.7),angle=t*.25;drum.rotation.z=angle;inner.rotation.z=angle;plates.forEach((p,i)=>{p.position.z=(i-4)*(2-.2*closing);p.rotation.z=angle;});pressure.position.z=12-closing*.8;};
    m.check=()=>({plates:9,frictionPlates:5,counterplates:4,contact:'pack spacing illustrative; no friction solution'});return m;
  };
})(window);
