(function(g){
  'use strict';
  const {T,P,tau,mat,mesh,group,at,circle,extrude,profile,ring,cylinder,box,gear,sector,bolt,link,spring,helix,model}=g.RevisionGeometry;
  const B={};
  const axisY=o=>{const q=group(o);q.rotation.x=-Math.PI/2;return q;};
  const axisX=o=>{const q=group(o);q.rotation.y=Math.PI/2;return q;};
  function supports(m,x,y=0){m.part('bearing seat '+x,ring(3.2,8,7,mat.dark),[x,y,-13],[0,0,-10]);m.part('shaft '+x,cylinder(3,37),[x,y,-4],[0,0,-18]);}
  B.spur=()=>{
    const m=model(),a=m.part('24 tooth pinion',gear(24,1,8,mat.steel,3.1),[-18,0,0],[0,0,12]),b=m.part('48 tooth wheel',gear(48,1,8,mat.bronze,3.1,true),[18,0,0],[0,0,-12]);
    supports(m,-18);supports(m,18);
    m.part('pinion hub',ring(3.1,6,12),[-18,0,0],[0,0,16]);m.part('wheel hub',ring(3.1,7,12,mat.bronze),[18,0,0],[0,0,-15]);
    m.pose=t=>{a.rotation.z=t*.7;b.rotation.z=-t*.35+Math.PI/48;};
    m.check=()=>({teeth:[24,48],centreDistance:a.position.distanceTo(b.position),ratio:-.5});return m;
  };
  B.planetary=()=>{
    const m=model(),s=m.part('sun 18',gear(18,1,8,mat.steel,3.1),[0,0,0],[0,0,22]),r=m.part('ring 54',P.ring({m:1,z:54,ro:32,width:10,mat:mat.dark}),[0,0,0],[0,0,-16]);
    const planets=[];
    for(let i=0;i<3;i++){const a=i*tau/3;planets.push(m.part('planet '+i,gear(18,1,8,mat.bronze,2.1),[18*Math.cos(a),18*Math.sin(a),0],[0,0,7]));}
    const outline=[],holes=[circle(3.2)],delta=Math.asin(3/7),join=Math.sqrt(49-9);
    for(let i=0;i<3;i++){const a=i*tau/3,rot=(x,y)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];outline.push(rot(join,-3),rot(18,-3));for(let j=1;j<=24;j++){const q=-Math.PI/2+j*Math.PI/24;outline.push(rot(18+3*Math.cos(q),3*Math.sin(q)));}outline.push(rot(join,3));for(let j=1;j<=24;j++){const q=a+delta+(tau/3-2*delta)*j/24;outline.push([7*Math.cos(q),7*Math.sin(q)]);}holes.push(circle(2.1,18*Math.cos(a),18*Math.sin(a)));}
    const c=group(profile(outline,3,mat.blue,holes));
    for(let i=0;i<3;i++){const a=i*tau/3;c.add(at(cylinder(2,12),18*Math.cos(a),18*Math.sin(a),6),at(bolt(1.6,4),18*Math.cos(a),18*Math.sin(a),-3));}
    const carrier=m.part('carrier',c,[0,0,-9],[0,0,-30]);m.part('sun shaft',cylinder(3,38),[0,0,1],[0,0,30]);
    m.pose=t=>{const input=t*.65,ca=input/4;s.rotation.z=input;r.rotation.z=Math.PI/54;carrier.rotation.z=ca;planets.forEach((p,i)=>{const a=i*tau/3+ca;p.position.set(18*Math.cos(a),18*Math.sin(a),0);p.rotation.z=2*i*tau/3+Math.PI/18-input/2;});};
    m.check=()=>({sun:18,planet:18,ring:54,assemblyCondition:(18+54)/3,carrierRatio:.25,planetCentres:planets.map(p=>Math.hypot(p.position.x,p.position.y))});return m;
  };
  B.rack=()=>{
    const m=model(),pts=[[-56,-7],[56,-7],[56,-1.25]],pitch=Math.PI,top=Math.PI/2-2*Math.tan(Math.PI/9),bottom=Math.PI/2+2.5*Math.tan(Math.PI/9);
    for(let i=17;i>=-18;i--){const x=(i+.5)*pitch;pts.push([x+bottom/2,-1.25],[x+top/2,1],[x-top/2,1],[x-bottom/2,-1.25]);}pts.push([-56,-1.25]);
    const r=m.part('rack',profile(pts,8,mat.steel),[0,0,0],[0,-9,14]),p=m.part('pinion 20',gear(20,1,10,mat.bronze,3.1),[0,10,0],[0,0,22]);supports(m,0,10);
    const detailPts=[[-25,-7],[25,-7],[25,-1.25],...pts.slice(3,-1).filter(([x])=>Math.abs(x)<25),[-25,-1.25]];
    const detail=m.part('shortened rack section',profile(detailPts,8,mat.steel));
    const guides=[m.part('guide back',box(120,10,5,mat.blue),[0,-5,-9],[0,0,-15]),m.part('upper guide lip',box(120,2,4,mat.dark),[0,-1,-5],[0,7,-10])];
    m.pose=(t,chapter)=>{const a=Math.sin(t*.8)*1.5;p.rotation.z=a;r.position.x=10*a;detail.position.x=10*a;r.visible=chapter!==1;detail.visible=chapter===1;guides.forEach(p=>p.visible=chapter!==1);};m.check=()=>({pitchRadius:10,angle:p.rotation.z,displacement:r.position.x,error:r.position.x-10*p.rotation.z});return m;
  };
  B.slider=()=>{
    const m=model(),crank=m.part('crank',group(cylinder(18,5,mat.dark),at(cylinder(3,12),0,14,7)),[0,0,0],[0,0,-15]);
    const rod=m.part('connecting rod',link(46,8,5,mat.steel),[0,0,9],[0,0,12]);
    const pistonGeo=group(axisY(cylinder(11,17)),at(axisY(ring(10.7,11.3,1.1,mat.dark)),0,5,0),at(axisY(ring(10.7,11.3,1.1,mat.dark)),0,2.8,0));
    const piston=m.part('piston',pistonGeo,[0,46,9],[0,18,0]);
    m.part('sectioned cylinder',axisY(ring(11.5,15.5,62,mat.blue,Math.PI/2,Math.PI)),[0,55,9],[16,0,-8]);
    const pin=m.part('wrist pin',cylinder(2.2,25),[0,46,9],[0,0,20]);m.part('crank shaft',cylinder(3,28),[0,0,-8],[0,0,-22]);
    let A,Bp;
    m.pose=t=>{const a=t*.8,x=14*Math.sin(a),y=14*Math.cos(a),sy=y+Math.sqrt(46**2-x*x);crank.rotation.z=-a;rod.position.set(x/2,(y+sy)/2,9);rod.rotation.z=-Math.atan2(-x,sy-y);piston.position.y=sy;pin.position.y=sy;A=[x,y];Bp=[0,sy];};
    m.check=()=>({rod:Math.hypot(Bp[0]-A[0],Bp[1]-A[1]),target:46,stroke:28});return m;
  };
  B.cam=()=>{
    const m=model(),camShape=new T.Shape();camShape.absarc(0,4,18,0,tau,false);camShape.holes.push(circle(3.1));
    const wheel=m.part('eccentric',group(extrude(camShape,8,mat.bronze),ring(3.1,6,11,mat.dark)),[0,0,0],[0,0,-18]);
    const fork=group(axisY(cylinder(2.2,27)),at(box(6,3,14),0,-10.5,0));
    for(const side of [-1,1])fork.add(at(profile([[-3,-6],[3,-6],[3,6],[-3,6]],2,mat.steel,[circle(1.9,0,-3)]),0,-16.5,side*6));
    const roll=m.part('follower roller',group(ring(2,5,9),cylinder(1.7,16,mat.dark)),[0,27,0],[0,0,17]),stem=m.part('follower stem',fork,[0,46.5,0],[0,12,0]);
    const cap=m.part('spring seat',axisY(cylinder(6,2,mat.dark)),[0,37,0],[0,12,0]);
    const springObj=m.part('return spring',axisY(spring(4.2,.9,7,18)),[0,47,0],[0,18,0]);
    m.part('guide',axisY(ring(2.6,7,9,mat.blue)),[0,57,0],[0,16,0]);m.part('shaft',cylinder(3,32),[0,0,-6],[0,0,-20]);
    let centre=[0,4];m.pose=t=>{const a=t*.75,cx=-4*Math.sin(a),cy=4*Math.cos(a),y=cy+Math.sqrt(23**2-cx*cx);centre=[cx,cy];wheel.rotation.z=a;roll.position.y=y;roll.rotation.z=-a*3.6;stem.position.y=y+19.5;cap.position.y=y+10;const len=55-(y+11);springObj.position.y=(55+y+11)/2;springObj.scale.y=len/18;};
    m.check=()=>({contactDistance:Math.hypot(centre[0],centre[1]-roll.position.y),target:23,guideX:roll.position.x});return m;
  };
  B.geneva=()=>{
    const m=model(),c=35,r=c/Math.sqrt(2),Ro=28,lockR=18,half=1.7,inner=9,delta=Math.asin(half/Ro),pts=[];
    function edge(a){let R=Ro;for(let k=0;k<4;k++){let d=Math.atan2(Math.sin(a-(k+.5)*Math.PI/2),Math.cos(a-(k+.5)*Math.PI/2));if(Math.abs(c*Math.sin(d))<lockR&&Math.cos(d)>0)R=Math.min(R,c*Math.cos(d)-Math.sqrt(lockR**2-c*c*Math.sin(d)**2));}return R;}
    for(let i=0;i<4;i++){const a=i*Math.PI/2,rot=(x,y)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];pts.push(rot(Math.sqrt(Ro**2-half**2),-half),rot(inner,-half));for(let j=1;j<=16;j++){const q=-Math.PI/2-j*Math.PI/16;pts.push(rot(inner+half*Math.cos(q),half*Math.sin(q)));}pts.push(rot(Math.sqrt(Ro**2-half**2),half));for(let j=1;j<=80;j++){const q=a+delta+(Math.PI/2-2*delta)*j/80,Rq=edge(q);pts.push([Rq*Math.cos(q),Rq*Math.sin(q)]);}}
    const wheel=m.part('four slot wheel',profile(pts,5,mat.steel,[circle(3.1)]),[c,0,0],[0,0,18]);
    const driver=m.part('driver',group(at(cylinder(r+2,3,mat.blue),0,0,-6),at(sector(.1,lockR,75*Math.PI/180,285*Math.PI/180,4,mat.dark),0,0,0),at(cylinder(1.35,13),r,0,0)),[0,0,0],[0,0,-16]);
    m.part('input shaft',cylinder(3,28),[0,0,-13],[0,0,-20]);m.part('output shaft',cylinder(3,28),[c,0,-13],[0,0,-20]);
    let phase=0,output=0; m.pose=t=>{const theta=t*.8,cycles=Math.floor((theta+Math.PI/4)/tau),a=theta-cycles*tau;phase=a;if(a<=Math.PI/4){const q=Math.atan2(r*Math.sin(a),r*Math.cos(a)-c);output=(q>0?q-tau:q)+Math.PI-cycles*Math.PI/2;}else output=-Math.PI/4-cycles*Math.PI/2;driver.rotation.z=theta;wheel.rotation.z=output;};
    m.check=()=>({centreDistance:c,crankRadius:r,slots:4,driverAngle:driver.rotation.z,wheelAngle:output,phase});return m;
  };
  B.jaw=()=>{
    const m=model(),hubs=[];
    for(let side of [-1,1]){const hub=group(ring(4,15,11,mat.dark));for(let i=0;i<3;i++){const a=i*tau/3+(side>0?Math.PI/3:0);hub.add(at(sector(8.3,15,a-.30,a+.30,11,mat.steel),0,0,-side*11));}hub.add(at(bolt(1.2,5),10,0,0));hubs.push(m.part(side<0?'input hub':'output hub',hub,[0,0,side*12],[0,0,side*19]));}
    const spider=group(ring(4.5,8.25,10,mat.orange));for(let i=0;i<6;i++){const a=(i+.5)*Math.PI/3;spider.add(sector(7.7,14.8,a-.20,a+.20,10,mat.orange));}
    const s=m.part('elastomer spider',spider,[0,0,0],[0,0,0]);m.pose=(t,chapter)=>{const a=t*.45;hubs.forEach(p=>p.rotation.z=a);s.rotation.z=a;if(chapter===1)hubs[1].visible=false;};m.check=()=>({hubDiameter:30,overallLength:35,hubLength:11,spiderWidth:10});return m;
  };
  g.RevisionModels=B;
})(window);
