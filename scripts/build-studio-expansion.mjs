// Fourteen original design studies, compiled by Mechanism's native Studio.
// Dimensions are authored estimates, never measurements or product specifications.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const models=[];
const part=(id,kind,p,at=[0,0,0],mat='steel',extra={})=>({id,name:id.replaceAll('-',' '),kind,p,at,mat,conf:'estimated',claims:['design'],explode:[0,0,at[2]>=0?20:-20],...extra});
const disc=(id,r,w,at,mat='brass',extra={})=>part(id,'disc',{r,w,bore:3},at,mat,extra);
const shaft=(id,r,len,at,extra={})=>part(id,'shaft',{r,len},at,'chrome',extra);
const plate=(id,w,h,t,at,mat='aluminum-dark',extra={})=>part(id,'plate',{w,h,t,r:3},at,mat,extra);
const gear=(id,z,at,mat='brass')=>part(id,'gear',{m:1,z,width:7,bore:3,hub:{r:6,w:10}},at,mat,{body:id});
const circle=(n,r,fn)=>Array.from({length:n},(_,i)=>fn(2*Math.PI*i/n,i,r));
function bearings(parts,centers){
  const support=parts.find(p=>p.kind==='plate');
  if(support)support.p.holes=centers.map(([x,y])=>[x-support.at[0],y-support.at[1],3.2]);
  centers.forEach(([x,y],i)=>{
  parts.push(part('bearing-'+i,'bearing',{ri:3.2,ro:7,w:5,balls:8},[x,y,-10],'chrome',{explode:[0,0,-24]}));
  parts.push(shaft('axle-'+i,3,34,[x,y,-3]));
});}
function add(id,title,question,parts,chapters,mechanism=null,notes='Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.'){
  const spec={id,fig:'Studio '+String(models.length+7).padStart(2,'0'),kicker:'ORIGINAL 3D DESIGN STUDY',title,sub:notes,
    research:{sources:[{id:'request',kind:'user',title:'Request to create new Mechanism Studio objects',received:'2026-10-23',note:'The request supplies the creative brief, not dimensions. Geometry was authored for these studies.'}],
      claims:[{id:'design',conf:'estimated',text:notes,why:'A newly authored educational assembly, not a measured or manufacturer-specified product.'}]},
    parts,stage:{floorY:-65},director:{what:question,tour:parts.filter(p=>p.tour!==false).slice(0,3).map(p=>p.id),views:{iso:{yaw:-28,pitch:25},expl:{yaw:-38,pitch:23}}}};
  if(mechanism)spec.mechanism=mechanism;
  models.push({id,engine:'studio',source:'examples/'+id,title,question,limit:notes,chapters:chapters.map(([title,text,formula])=>({title,text,formula,shot:'cycle'})),spec});
}
const chapters=(a,b,c,d)=>[a,b,c,d];
{
  const p=[gear('input',18,[-18,0,0]),gear('output',54,[18,0,0],'steel'),plate('backplate',114,78,4,[0,0,-16])];bearings(p,[[-18,0],[18,0]]);
  add('studio-spur-reducer','Spur reducer / 18 to 54','How do tooth counts set speed?',p,chapters(
    ['A real tooth mesh','Involute teeth transmit rotation between parallel shafts.','18 TEETH → 54 TEETH'],
    ['Opposite directions','External gears rotate in opposite directions.','ω₂ / ω₁ = −18 / 54'],
    ['A slower output','Three input revolutions produce one output revolution.','SPEED RATIO −1/3'],
    ['Separate the supports','Bearings support the shafts behind the tooth contact.','CENTRES = (18 + 54) / 2 = 36 mm']),
    {free:'input',links:[{t:'ext',a:'input',b:'output'}],drive:{rpm:15,modes:[{id:'run',label:'Reduction',driver:'input',shell:'output'}]}});
}
{
  const p=[gear('input',24,[-36,0,-5]),gear('wheel',48,[0,0,-5],'steel'),gear('pinion',16,[0,0,8]),gear('output',64,[40,0,8],'steel'),plate('backplate',150,90,4,[0,0,-24])];bearings(p,[[-36,0],[0,0],[40,0]]);
  add('studio-compound-train','Compound train / two stages','Why do stage ratios multiply?',p,chapters(
    ['Two meshes in depth','The intermediate wheel and pinion share one shaft.','24:48 × 16:64'],
    ['First reduction','The first mesh halves the angular speed.','−24 / 48 = −1/2'],
    ['Second reduction','The second mesh reverses direction again.','(−1/2) × (−1/4) = +1/8'],
    ['One compound arbor','Axial separation keeps the two tooth meshes independent.','OUTPUT TURNS WITH INPUT']),
    {free:'input',links:[{t:'ext',a:'input',b:'wheel'},{t:'same',a:'wheel',b:'pinion'},{t:'ext',a:'pinion',b:'output'}],drive:{rpm:18,modes:[{id:'run',label:'Compound reduction',driver:'input',shell:'output'}]}});
}
{
  const p=[gear('input',20,[-25,0,0]),gear('idler',30,[0,0,0],'steel'),gear('output',40,[35,0,0]),plate('bridge',130,65,4,[5,0,-16])];bearings(p,[[-25,0],[0,0],[35,0]]);
  add('studio-idler-train','Idler train / direction & ratio','What does an intermediate gear change?',p,chapters(
    ['Three shafts','Two external contacts connect input to output.','20 → 30 → 40 TEETH'],
    ['Two reversals','Each external mesh reverses rotation.','NEGATIVE × NEGATIVE = POSITIVE'],
    ['The idler cancels','The intermediate tooth count cancels from the total ratio.','(20/30) × (30/40) = 1/2'],
    ['A supporting bridge','The intermediate shaft changes the spacing and direction.','SAME DIRECTION / HALF SPEED']),
    {free:'input',links:[{t:'ext',a:'input',b:'idler'},{t:'ext',a:'idler',b:'output'}],drive:{rpm:15,modes:[{id:'run',label:'Idler transmission',driver:'input',shell:'output'}]}});
}
{
  const p=[part('ring','ring',{m:1,z:60,ro:35,width:8},[0,0,0],'steel',{body:'ring'}),gear('pinion',20,[20,0,0]),disc('support-ring',37,4,[0,0,-14],'aluminum',{p:{r:37,w:4,bore:27}}),shaft('pinion-shaft',3,32,[20,0,-5])];
  add('studio-internal-mesh','Internal gear / same direction','How does an inside mesh rotate?',p,chapters(
    ['Teeth on the inside','The pinion contacts an internal ring instead of an external wheel.','20 / 60 TEETH'],
    ['Same direction','An internal mesh preserves the sign of angular velocity.','ωring / ωpinion = +1/3'],
    ['Difference of radii','Internal centre spacing uses subtraction.','CENTRES = (60 − 20) / 2'],
    ['Separate the ring','The supporting ring is a design context, not a bearing simulation.','20 mm CENTRE OFFSET']),
    {free:'pinion',links:[{t:'int',a:'ring',b:'pinion'}],drive:{rpm:15,modes:[{id:'run',label:'Internal mesh',driver:'pinion',shell:'ring'}]}});
}
{
  const teeth=Array.from({length:38},(_,i)=>{const x=(i-19)*Math.PI;const s=1.25*Math.tan(Math.PI/9);return [[x-Math.PI/4-s,-1.25],[x-Math.PI/4+s,1],[x+Math.PI/4-s,1],[x+Math.PI/4+s,-1.25]];}).flat();
  const p=[gear('pinion',24,[0,0,0]),part('rack','profile',{pts:[[-64,-8],[64,-8],[64,-1.25],...teeth.slice().reverse(),[-64,-1.25]],len:7},[0,-12,0],'steel',
    {motion:(s,t)=>({pos:[6*Math.sin(t*.8),0,0]}),explode:[0,-18,0]}),plate('rack-slide',150,12,5,[0,-24,-6]),shaft('drive-shaft',3,32,[0,0,-6])];
  p[0].motion=(s,t)=>({rot:[0,0,-.5*Math.sin(t*.8)]});
  add('studio-rack-pinion','Rack & pinion / linear travel','How does a rotating gear move a rack?',p,chapters(
    ['A straight pitch line','A rack is a linear tooth sequence rather than a closed wheel.','MODULE 1 / 24 TEETH'],
    ['Rotation becomes travel','The pitch radius maps angle to linear displacement.','x = −r θ'],
    ['Reverse the input','The rack reverses when the pinion reverses.','r = 12 mm / x = 6 sin(0.8t)'],
    ['Expose the guide','The guide supports the rack along its travel axis.','IDEAL TOOTH KINEMATICS']),null,'Synthetic rack geometry and prescribed ideal motion. Backlash, compliance and load are not simulated.');
}
{
  const p=[disc('flywheel',22,6,[0,0,0],'steel',{spin:.8}),shaft('crank-pin',3,10,[0,0,7],{motion:(s,t)=>({pos:[14*Math.sin(.8*t),14*Math.cos(.8*t),0]})}),
    plate('connecting-rod',7,48,5,[0,0,9],'brass',{motion:(s,t)=>{const a=.8*t,x=14*Math.sin(a),y=14*Math.cos(a),h=Math.sqrt(48**2-x*x);return {pos:[x/2,y+h/2,0],rot:[0,0,Math.asin(x/48)]};}}),
    part('slider','block',{w:22,d:16,h:12},[0,0,9],'aluminum',{motion:(s,t)=>({pos:[0,14*Math.cos(.8*t)+Math.sqrt(48**2-(14*Math.sin(.8*t))**2),0]})}),
    plate('guide-left',5,72,9,[-17,50,3]),plate('guide-right',5,72,9,[17,50,3]),plate('base',68,112,5,[0,33,-14]),shaft('main-shaft',4,30,[0,0,-5])];
  add('studio-slider-crank','Slider crank / finite rod length','Why is piston motion not a pure sine?',p,chapters(
    ['One rotating input','The crank pin follows a circular trajectory.','CRANK RADIUS 14 mm'],
    ['A constant-length rod','The connecting rod constrains the slider to a straight axis.','L = 48 mm'],
    ['Finite rod correction','The square root keeps both rod endpoints at a fixed distance.','y = r cosθ + √(L² − r²sin²θ)'],
    ['Expose the linkage','The stroke is twice the crank radius.','28 mm TOTAL STROKE']));
}
{
  const yoke=[[-25,-9],[25,-9],[25,9],[-25,9]], hole=[[-19,-3],[-19,3],[19,3],[19,-3]];
  const p=[disc('drive-disc',22,5,[0,0,-6],'steel',{spin:.8}),part('yoke','profile',{pts:yoke,holes:[hole],len:7},[0,0,4],'brass',{motion:(s,t)=>({pos:[0,15*Math.cos(t*.8),0]}),explode:[0,20,20]}),
    shaft('roller-pin',2.7,10,[0,0,4],{motion:(s,t)=>({pos:[15*Math.sin(t*.8),15*Math.cos(t*.8),0]})}),
    plate('slider-stem',7,65,7,[0,29,4],'chrome',{motion:(s,t)=>({pos:[0,15*Math.cos(t*.8),0]})}),plate('guide',22,14,12,[0,52,-1]),shaft('input-shaft',4,26,[0,0,-13])];
  add('studio-scotch-yoke','Scotch yoke / harmonic motion','How does a slot remove rod-angle effects?',p,chapters(
    ['The pin follows a circle','The pin moves within the long horizontal slot.','15 mm CRANK RADIUS'],
    ['The slot absorbs sideways motion','The yoke follows only the vertical component of the pin.','y = r cosθ'],
    ['A sinusoidal output','The ideal stroke is symmetric about its centre.','30 mm TOTAL STROKE'],
    ['Separate pin and slot','Clearance is illustrative; no contact force is calculated.','CIRCULAR INPUT / LINEAR OUTPUT']));
}
{
  const p=[disc('eccentric-cam',20,8,[0,0,0],'brass',{motion:(s,t)=>({pos:[5*Math.sin(t*.8),5*Math.cos(t*.8),0],rot:[0,0,-t*.8]}),explode:[0,0,0]}),shaft('cam-shaft',3,32,[0,0,-6]),
    disc('roller',5,7,[0,0,0],'chrome',{motion:(s,t)=>({pos:[0,5*Math.cos(.8*t)+Math.sqrt(25**2-(5*Math.sin(.8*t))**2),0]})}),
    plate('follower',6,32,6,[0,16,0],'steel',{motion:(s,t)=>({pos:[0,5*Math.cos(.8*t)+Math.sqrt(25**2-(5*Math.sin(.8*t))**2),0]})}),
    part('return-spring','spring',{r:5,wire:.8,turns:7,len:22},[0,50,0],'steel',{rot:[90,0,0]}),plate('follower-guide',20,7,12,[0,45,-4]),plate('base',67,95,4,[0,23,-18])];
  add('studio-eccentric-cam','Eccentric cam / roller follower','How does an offset circular cam create lift?',p,chapters(
    ['Offset the cam centre','The shaft axis and circular cam centre are separated.','20 mm CAM / 5 mm OFFSET'],
    ['Roller contact','The follower centre stays one summed radius from the cam centre.','Rcam + Rroller = 25 mm'],
    ['Compute the lift','The exact circle-contact constraint sets the vertical motion.','10 mm GEOMETRIC LIFT'],
    ['Expose the return components','The spring is shown as assembly context, not a solved force.','PRESCRIBED CONTACT / NO DYNAMICS']));
}
{
  const p=[part('bearing','bearing',{ri:12,ro:28,w:12,balls:10},[0,0,0],'chrome'),shaft('inner-shaft',11.7,58,[0,0,-6],{spin:.8}),
    part('rear-seal','tube',{ri:13.8,ro:25.5,len:1.5},[0,0,-7],'rubber',{explode:[0,0,-25]}),part('front-seal','tube',{ri:13.8,ro:25.5,len:1.5},[0,0,7],'rubber',{cutaway:true,explode:[0,0,25]}),
    part('shaft-collar','tube',{ri:11.8,ro:15,len:5},[0,0,20],'brass',{spin:.8,explode:[0,0,30]})];
  add('studio-ball-bearing','Ball bearing / races & rolling','What moves between the bearing races?',p,chapters(
    ['Two concentric races','The inner race surrounds the shaft; the outer race sits in the housing.','INNER / OUTER RACE'],
    ['Rolling elements','Ten balls occupy the annular space between the races.','TEN BALLS / BRASS CAGE'],
    ['Separate rotation rates','A fixed outer ring and rotating inner ring give an intermediate cage speed.','ωc = ½(1 − d/D) ωi'],
    ['Open the seals','The seal protects the rolling path without becoming a load-bearing race.','SEALS / RACES / CAGE']),null,'Authored bearing geometry. Ideal no-slip cage motion; no Hertz stress, fatigue life or manufacturer rating.');
}
{
  const p=[shaft('input-shaft',7,100,[0,0,-10],{spin:.8}),disc('back-pressure',30,5,[0,0,-19],'steel',{spin:.8}),disc('pressure-plate',30,5,[0,0,19],'aluminum',{motion:(s,t)=>({pos:[0,0,3*(1-Math.cos(t*.8))],rot:[0,0,.8*t]})})];
  for(let i=0;i<6;i++)p.push(disc('clutch-plate-'+i,27,2,[0,0,-10+i*4],i%2?'steel':'copper',{spin:i%2?.4:.8,explode:[0,0,(i-2.5)*13]}));
  circle(4,21,(a,i,r)=>p.push(part('spring-'+i,'spring',{r:3,wire:.7,turns:6,len:14},[r*Math.cos(a),r*Math.sin(a),31],'steel',{explode:[0,0,38]})));
  add('studio-multiplate-clutch','Multiplate clutch / friction stack','Why use multiple friction interfaces?',p,chapters(
    ['Alternating plates','Two sets of discs form a compact axial stack.','SIX PLATES / FIVE INTERFACES'],
    ['Apply axial pressure','The pressure plate closes the assembly.','CLAMP FORCE ACTS ALONG THE SHAFT'],
    ['Trace the friction interfaces','More surfaces can transmit torque within the same radial envelope.','TORQUE REQUIRES μ AND NORMAL FORCE'],
    ['Inspect the stack','Different prescribed speeds illustrate slip, not a torque solution.','ILLUSTRATIVE SLIP / NO FRICTION SOLVER']));
}
{
  const p=[part('brake-rotor','flange',{r:36,bore:9,w:4,n:18,hr:29,hd:3},[0,0,0],'steel',{spin:.8}),disc('rotor-hat',18,10,[0,0,-7],'aluminum',{spin:.8}),shaft('hub',8,35,[0,0,-12],{spin:.8}),
    part('caliper-bridge','box',{w:22,d:33,h:21,wall:3},[26,0,0],'honda-red',{explode:[25,0,5]}),
    plate('pad-front',16,21,3,[26,0,4],'graphite',{motion:(s,t)=>({pos:[0,0,1.5*(1+Math.sin(.8*t))]}),explode:[0,0,25]}),
    plate('pad-rear',16,21,3,[26,0,-4],'graphite',{motion:(s,t)=>({pos:[0,0,-1.5*(1+Math.sin(.8*t))]}),explode:[0,0,-25]})];
  add('studio-disc-brake','Disc brake / rotor & caliper','Where does braking torque enter the rotor?',p,chapters(
    ['A rotating friction surface','The perforated rotor rotates with its hub.','ROTOR / HAT / HUB'],
    ['Pads act on both faces','The stationary caliper supports opposing pads.','NORMAL FORCES ACROSS THE DISC'],
    ['A tangential reaction','Friction transmits a moment to the caliper mounting.','M = Ffriction × EFFECTIVE RADIUS'],
    ['Open the caliper','The exploded view separates the pads from the rotor faces.','NO HEAT OR STOPPING-DISTANCE MODEL']));
}
{
  const p=[shaft('shaft-left',6,43,[0,0,-35],{spin:.8}),shaft('shaft-right',6,43,[0,0,35],{spin:.8}),
    disc('hub-left',23,9,[0,0,-13],'aluminum',{spin:.8,explode:[0,0,-28]}),disc('hub-right',23,9,[0,0,13],'aluminum',{spin:.8,explode:[0,0,28]}),
    part('elastomer-spider','cross',{arm:38,thick:12,len:12},[0,0,0],'pom-red',{spin:.8,explode:[0,22,0]})];
  circle(3,16,(a,i,r)=>{for(const side of [-1,1])p.push(part('jaw-'+i+'-'+(side>0?'R':'L'),'block',{w:8,d:10,h:12},[r*Math.cos(a+(side>0?Math.PI/3:0)),r*Math.sin(a+(side>0?Math.PI/3:0)),side*4],'aluminum',
    {motion:Function('s','t',`const a=${a+(side>0?Math.PI/3:0)},r=16;return {pos:[r*(Math.cos(a+.8*t)-Math.cos(a)),r*(Math.sin(a+.8*t)-Math.sin(a)),0],rot:[0,0,a+.8*t]};`),explode:[0,0,side*28]}));});
  add('studio-jaw-coupling','Jaw coupling / compliant interface','How do two shafts share a flexible element?',p,chapters(
    ['Two separate hubs','Metal hubs connect to opposite shafts.','INPUT HUB / OUTPUT HUB'],
    ['Interleaved jaws','An elastomer insert occupies the space between the jaws.','METAL → ELASTOMER → METAL'],
    ['A compliant load path','The insert is shown at matching speed without solving its deformation.','COAXIAL PRESCRIBED ROTATION'],
    ['Open the coupling','Separating both hubs reveals the replaceable insert.','NO MISALIGNMENT OR STIFFNESS RATING']));
}
{
  const p=[gear('drive',20,[-10,0,0]),gear('driven',20,[10,0,0],'steel'),part('pump-case','box',{w:50,d:31,h:13,wall:3},[0,0,-2],'aluminum',{cutaway:true,explode:[0,0,-30]}),
    plate('rear-cover',51,34,4,[0,0,-11]),plate('front-cover',51,34,4,[0,0,10],'aluminum',{cutaway:true,explode:[0,0,35]}),
    part('inlet','tube',{ro:6,ri:4,len:19},[0,-24,-1],'brass',{rot:[90,0,0],explode:[0,-18,0]}),part('outlet','tube',{ro:6,ri:4,len:19},[0,24,-1],'brass',{rot:[90,0,0],explode:[0,18,0]}),shaft('input-shaft',3,34,[-10,0,-15])];
  add('studio-gear-pump','Gear pump / trapped volumes','How can meshing gears move fluid?',p,chapters(
    ['Two meshing rotors','Equal external gears rotate at opposite angular velocities.','20 TEETH / 20 TEETH'],
    ['Volumes travel around the outside','Tooth spaces carry fluid beside the housing rather than through the mesh.','INLET → OUTER TOOTH SPACES → OUTLET'],
    ['The mesh divides the ports','The central contact separates the nominal inlet and outlet sides.','ω₂ = −ω₁'],
    ['Open the end cover','Clearances and leakage are not inferred from this cutaway.','NO CFD / PRESSURE / VOLUMETRIC RATING']),
    {free:'drive',links:[{t:'ext',a:'drive',b:'driven'}],drive:{rpm:15,modes:[{id:'run',label:'Pump drive',driver:'drive',shell:'driven'}]}});
}
{
  const p=[shaft('screw-core',5,100,[0,0,0],{spin:.8}),part('helical-thread','spring',{r:6,wire:2,turns:20,len:100},[0,0,0],'steel',{spin:.8}),
    part('travelling-nut','nut',{af:25,h:14,bore:7.1},[0,0,0],'brass',{motion:(s,t)=>({pos:[0,0,5-5*.8*t/(2*Math.PI)]}),explode:[0,24,0]}),
    part('guide-rail','shaft',{r:3,len:100},[19,0,0],'chrome'),part('carriage','block',{w:35,d:12,h:9},[10,0,0],'aluminum',{motion:(s,t)=>({pos:[0,0,5-5*.8*t/(2*Math.PI)]}),explode:[15,10,0]}),
    disc('end-support-L',13,5,[0,0,-55],'aluminum',{explode:[0,0,-22]}),disc('end-support-R',13,5,[0,0,55],'aluminum',{explode:[0,0,22]})];
  add('studio-lead-screw','Lead screw / rotary positioning','How does screw lead determine linear feed?',p,chapters(
    ['A helical input','The helical ridge rotates around a straight shaft.','5 mm LEAD / SINGLE START'],
    ['Prevent nut rotation','The guide constrains the carriage to axial travel.','ONE TURN → 5 mm'],
    ['Angle becomes position','Travel follows the screw lead and signed rotation.','Δz = −lead × θ / 2π'],
    ['Inspect the interfaces','The thread is a rounded illustrative ridge, not a manufactured thread form.','NO BACKLASH OR SELF-LOCKING CLAIM']));
}
// Finish shaft passages and attachment details before compiling the models.
const get=(id,partId)=>models.find(m=>m.id===id).spec.parts.find(p=>p.id===partId);
const flywheel=get('studio-slider-crank','flywheel');flywheel.spin=-.8;flywheel.p.bore=4.1;flywheel.p.holes=[[0,14,3.1]];
const yokeDisc=get('studio-scotch-yoke','drive-disc');yokeDisc.spin=-.8;yokeDisc.p.bore=4.1;yokeDisc.p.holes=[[0,15,2.8]];
get('studio-scotch-yoke','roller-pin').p.len=18;
get('studio-eccentric-cam','eccentric-cam').p={r:20,w:8,holes:[[0,-5,3.1]]};
get('studio-rack-pinion','pinion').rot=[0,0,7.5];
for(const p of models.find(m=>m.id==='studio-multiplate-clutch').spec.parts.filter(p=>p.kind==='disc'))p.p.bore=7.2;
models.find(m=>m.id==='studio-multiplate-clutch').spec.stage.bloom=.012;
models.find(m=>m.id==='studio-multiplate-clutch').spec.stage.exposure=.9;
get('studio-multiplate-clutch','input-shaft').p.len=68;
for(const id of ['hub-left','hub-right'])get('studio-jaw-coupling',id).p.bore=6.1;
// Six alternating jaw recesses, with 1 mm illustrative assembly clearance.
// A four-arm cross would intersect this three-jaw-per-hub arrangement.
const spider=get('studio-jaw-coupling','elastomer-spider');
spider.kind='profile';
spider.p={len:12,pts:circle(6,1,(a)=>[[22,-6],[11,-6],[11,6],[22,6]].map(([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)])).flat(),
  holes:[circle(32,7,(a,i,r)=>[r*Math.cos(a),-r*Math.sin(a)])]};
get('studio-disc-brake','rotor-hat').p.bore=8.1;
get('studio-gear-pump','rear-cover').p.holes=[[-10,0,3.2]];
get('studio-lead-screw','carriage').kind='plate';
get('studio-lead-screw','carriage').p={w:42,h:18,t:9,r:2,holes:[[-10,0,7.2],[9,0,3.2]]};
for(const id of ['end-support-L','end-support-R'])get('studio-lead-screw',id).p.bore=5.1;
models.find(m=>m.id==='studio-lead-screw').spec.stage={floorY:-65,bloom:.005,exposure:.85,envIntensity:.55};
get('studio-lead-screw','screw-core').mat='steel-dark';
for(const id of ['end-support-L','end-support-R'])get('studio-lead-screw',id).mat='aluminum-dark';
const encode=value=>JSON.stringify(value,(k,v)=>typeof v==='function'?'__FN__'+v.toString():v,2).replace(/"__FN__((?:\\.|[^"\\])*)"/g,(_,s)=>JSON.parse('"'+s+'"'));
const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'kit/manifest.js'),'utf8'),context);
const modules=context.MX_MANIFEST.pageModules();
const catalog=models.map(({spec,...film})=>film);
fs.mkdirSync(path.join(root,'films'),{recursive:true});
fs.writeFileSync(path.join(root,'films/studio-catalog.mjs'),'// New native Studio design studies. No manufacturer specifications are claimed.\nexport const studioFilms = '+JSON.stringify(catalog,null,2)+';\n');
for(const model of models){
  const dir=path.join(root,model.source);fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'spec.js'),'// Original educational assembly. All physical dimensions are authored estimates.\nwindow.SPEC = '+encode(model.spec)+';\n');
  const filmDir=path.join(root,'films',model.id);fs.mkdirSync(filmDir,{recursive:true});
  const rel=name=>path.relative(filmDir,path.join(root,name)).replaceAll('\\','/');
  const scripts=modules.map(m=>rel('kit/'+m)).concat(rel(model.source+'/spec.js'),rel('kit/spec.js'),rel('kit/studio-expansion-film.js'));
  const data=JSON.stringify({...catalog.find(f=>f.id===model.id),number:String(models.indexOf(model)+7).padStart(2,'0')}).replaceAll('<','\\u003c');
  fs.writeFileSync(path.join(filmDir,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${model.title}</title><style>html,body{margin:0;background:#09192b;display:grid;place-items:center;min-height:100vh}canvas{display:block;max-width:100vw;max-height:100vh;object-fit:contain}#native-canvas{display:none}</style></head><body><canvas id="c"></canvas><script>window.TECHNICAL_FILM=${data};</script><script src="../../kit/boot.js" data-scripts="${scripts.join(',')}"></script></body></html>\n`);
  // Native interactive page keeps the original Studio controls, not a video canvas.
  fs.writeFileSync(path.join(filmDir,'view.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${model.title} / Studio viewer</title><style>html,body{margin:0;background:#09192b}canvas{max-width:100vw;max-height:100vh;object-fit:contain}</style></head><body><canvas id="c"></canvas><script>const q=new URLSearchParams(location.search);q.set('explore','');q.set('theme','dossier');history.replaceState(null,'',location.pathname+'?'+q);</script><script src="../../kit/boot.js" data-scripts="${scripts.slice(0,-1).concat('../studio-viewer.js').join(',')}"></script></body></html>\n`);
  const viewSource=fs.readFileSync(path.join(filmDir,'view.html'),'utf8').replace('<title>','<link rel="icon" href="data:,"><title>');
  fs.writeFileSync(path.join(filmDir,'view.html'),viewSource);
  fs.writeFileSync(path.join(dir,'index.html'),viewSource.replace('../studio-viewer.js','../../films/studio-viewer.js')
    .replace("q.set('explore','');", "if(!q.has('render'))q.set('explore','');else q.delete('explore');"));
}
console.log('Built '+models.length+' new Studio objects, film pages and native viewers.');
