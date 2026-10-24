// Each chapter is an editorial explanation of the linked spec, not an extra gate check.
const c = (title, text, formula, shot) => ({ title, text, formula, shot });
export const edition = 'technical-2026-10';
export const films = [
  {
    id: 'enigma-signal', engine: 'studio', source: 'examples/enigma', title: 'Enigma / signal & stepping',
    question: 'Why does the same letter encrypt differently?',
    limit: 'Wiring and test vectors share a source. Housing dimensions are estimated.',
    chapters: [
      c('A changing electrical path', 'A key closes a circuit through the entry wheel, three rotors and reflector. The signal returns through different contacts.', 'KEY → ROTORS → REFLECTOR → LAMP', 'assembled'),
      c('Test the complete machine', 'With rotors I–II–III, reflector B, rings AAA and start AAA, the model must reproduce the published five-letter test.', 'AAAAA → BDZGO', 'mode:0'),
      c('The middle rotor double-steps', 'The notch and pawl interaction advances the middle rotor on consecutive keypresses. Watch the rotor windows, not a generic spin.', 'ADU → ADV → AEW → BFX', 'mode:1'),
      c('Reversibility has conditions', 'Reset to the same settings before decrypting. Reciprocity belongs to the wiring and reflector; it is not a promise of modern security.', 'SAME SETTINGS / REVERSE THE MESSAGE', 'mode:3'),
    ],
  },
  {
    id: 'rubik-superflip', engine: 'studio', source: 'examples/rubik', title: 'Rubik / state & superflip',
    question: 'What changes when a face turns?', limit: 'An ideal cubie model; internal hardware and friction are not simulated.',
    chapters: [
      c('Twenty-six visible pieces', 'Six centres, twelve edges and eight corners form the visible cube. A face turn moves a layer and changes piece orientations.', '6 CENTRES + 12 EDGES + 8 CORNERS', 'assembled'),
      c('A sequence acts on a state', 'The model applies R U R′ U′ to the actual cubie state. Repeating the sequence six times returns to the starting state.', '(R U R′ U′) × 6', 'mode:0'),
      c('Superflip', 'The published sequence takes twenty face turns. Every edge is flipped while the pieces keep their positions; the corners remain solved.', '20 MOVES / 12 FLIPPED EDGES', 'mode:2'),
      c('Combinatorics, not animation', 'The arrangement count includes orientation and parity constraints. A convincing animation alone does not establish this number.', '8! × 3⁷ × (12! / 2) × 2¹¹', 'exploded'),
    ],
  },
  {
    id: 'cherry-travel', engine: 'studio', source: 'examples/switch', title: 'Cherry MX2A / travel & force',
    question: 'Where does an electrical keypress happen?',
    limit: 'Internal geometry is partly estimated. The end-force interpretation is an inference.',
    chapters: [
      c('A linear switch', 'The stem guides a spring-loaded stroke inside the housing. Linear describes the feel; the datasheet specifies no click.', 'MX2A RED / LINEAR', 'assembled'),
      c('Actuation is not bottom-out', 'The published pre-travel is 2 mm. The complete stroke is 4 mm. These are distinct positions in the same motion.', '2 mm ACTUATION / 4 mm TOTAL', 'mode:0'),
      c('Compare the published force points', 'The spec records 30 cN initially, 45 cN at actuation and 100 cN at the end. A single linear spring does not fit all three.', '30 → 45 → 100 cN', 'mode:1'),
      c('Keep the inference visible', 'The model suggests the final force includes contact with the housing. That interpretation is disclosed, not attributed to Cherry as a fact.', 'DATASHEET POINTS ≠ COMPLETE FORCE MODEL', 'exploded'),
    ],
  },
  {
    id: 'hub-ratios', engine: 'studio', source: 'examples/hub', title: 'Planetary hub / three ratios',
    question: 'How can one gear train give three speeds?', limit: 'Ratios are checked; module and several physical dimensions remain estimates.',
    chapters: [
      c('One train, several constraints', 'A sun, ring and planet carrier form a coupled system. The active input and output determine the ratio.', 'SUN / PLANETS / RING / CARRIER', 'assembled'),
      c('Direct drive', 'The middle mode transmits rotation at one-to-one. A different constraint changes the role of the same components.', 'GEAR 2 / 1.000', 'mode:0'),
      c('Overdrive', 'With the sun fixed, ring speed is carrier speed multiplied by the sum of ring and sun teeth divided by ring teeth.', '(60 + 20) / 60 = 1.333…', 'mode:1'),
      c('Reduction', 'Reversing the input/output roles gives the reciprocal ratio. The gate compares all three modes with the published values.', '60 / (60 + 20) = 0.750', 'mode:2'),
    ],
  },
  {
    id: 'k20a-cycle', engine: 'studio', source: 'examples/k20a', title: 'K20A / crank & firing order',
    question: 'What does the crankshaft force the pistons to do?',
    limit: 'Rod length and valve timings include estimates; no combustion or fluid simulation.',
    chapters: [
      c('Constrain the motion', 'The crank radius is half the stroke. The connecting rod constrains the piston to move along the cylinder axis.', '86 mm STROKE / 43 mm CRANK RADIUS', 'assembled'),
      c('Check the swept volume', 'Four cylinders share an 86 mm bore and stroke. The computed swept volume is compared with the published displacement.', '4 × π/4 × 86² × 86 ≈ 1,998 cm³', 'mode:0'),
      c('A possible firing sequence', 'The crank throws restrict which piston can be at the top at each event. The gate rejects a firing order incompatible with that geometry.', '1 → 3 → 4 → 2', 'mode:1'),
      c('Separate kinematics from performance', 'This explains geometric motion and event order. It does not predict power, torque, temperature or airflow.', 'KINEMATICS / NOT A COMBUSTION SOLVER', 'exploded'),
    ],
  },
  {
    id: 'lock-assembly', engine: 'studio', source: 'examples/lock', title: 'Pin tumbler / assembly & blocking',
    question: 'Why does one wrong cut stop the plug?', limit: 'Pin diameters and driver lengths include estimates. Educational mechanism model.',
    chapters: [
      c('Two pins per chamber', 'Each stack has a key pin, driver pin and spring. The split between the pins must meet the boundary between plug and housing.', 'FIVE STACKS / ONE SHEAR LINE', 'assembled'),
      c('The key lifts the stacks', 'The bitting controls the key-pin heights. The model reads those heights from the declared key profile.', 'CUT DEPTH + KEY PIN = STACK HEIGHT', 'mode:0'),
      c('One incorrect cut blocks rotation', 'When one split misses the shear line, a pin spans the rotating and fixed bodies. The model reports the obstruction.', 'MISALIGNED SPLIT → BLOCKED PLUG', 'mode:1'),
      c('The correct key aligns every split', 'The checked quantities include the published stack relation and spacing. Agreement with one keying table remains CONSISTENT.', 'ALL SPLITS ON THE SHEAR LINE', 'mode:4'),
    ],
  },
  {
    id: 'react-reconcile', engine: 'workflow', source: 'examples/react', title: 'React / from click to DOM',
    question: 'Does a state update rebuild the entire page?',
    limit: 'Recorded React 18.3.1 fixture, not every React workload. Animation time is illustrative.',
    chapters: [
      c('A click changes state', 'The counter advances from zero to one. React calls the component again to obtain the next element description.', 'STATE 0 → 1', 'item:0'),
      c('Compare descriptions', 'In this fixture the element types and positions stay the same. The model predicts which existing nodes can remain.', '8 NODES / SAME TYPES & POSITIONS', 'item:2'),
      c('Rewrite the changed text', 'A MutationObserver recording from real React is compared with the model. One node is touched; seven stay untouched.', '1 TOUCHED / 7 UNTOUCHED', 'item:3'),
      c('Check the observed result', 'No node is created or removed in this counter update. This result is scoped to the recorded fixture.', '0 CREATED / 0 REMOVED', 'item:4'),
    ],
  },
  {
    id: 'deflate-tokens', engine: 'workflow', source: 'examples/winrar', title: 'DEFLATE / literals & back-references',
    question: 'How do 49 bytes reconstruct 119 bytes?', limit: 'A recorded fixed-Huffman sample, not a depiction of every compression strategy.',
    chapters: [
      c('Read a literal', 'A Huffman code selects either a literal or a length symbol. A literal writes one byte to the output buffer.', 'BITSTREAM → SYMBOL → BYTE', 'item:0'),
      c('Copy from previous output', 'A length/distance pair reads bytes already produced. The model records which input bits each token consumed.', 'LENGTH + DISTANCE → COPY', 'item:15'),
      c('Reconstruct the complete text', 'The fixture contains 34 literals and seven copies plus the end marker. The reconstructed output is compared byte for byte.', '49 PACKED BYTES → 119 OUTPUT BYTES', 'item:36'),
      c('Use an independent decoder', 'Node zlib inflates the same stream; the recorded WinRAR extraction and header CRC provide additional comparisons.', 'CRC-32 / BYTE EQUALITY / ZLIB', 'item:41'),
    ],
  },
  {
    id: 'rar5-bytes', engine: 'workflow', source: 'examples/rar5', title: 'RAR5 / archive anatomy',
    question: 'Can a format model rebuild a real archive?', limit: 'The shipped sample and supported block types; not a complete RAR implementation.',
    chapters: [
      c('Recognise the container', 'The model parses the signature and block headers of a recorded archive. Fields are read from bytes, not inferred from appearance.', 'SIGNATURE → MAIN → FILE → END', 'item:0'),
      c('Check the CRC implementation', 'The CRC-32 control string 123456789 must produce 0xCBF43926. This checks the checksum routine used when rebuilding the sample.', '123456789 → 0xCBF43926', 'item:1'),
      c('Rebuild the archive', 'The format model serialises the sample again. The gate compares its output with the archive produced by the real tool.', 'PARSE → MODEL → SERIALISE → COMPARE', 'item:3'),
      c('Ask the real tool to accept it', 'The fixture records UnRAR testing and extracting the model-built archive. That evidence applies to this sample.', 'UNRAR ACCEPTS THE REBUILT SAMPLE', 'item:4'),
    ],
  },
  {
    id: 'rtx4090-arithmetic', engine: 'workflow', source: 'examples/rtx4090', title: 'RTX 4090 / published arithmetic',
    question: 'Which specifications can be recomputed?',
    limit: 'Theoretical peak arithmetic, not measured application performance or sustained clocks.',
    chapters: [
      c('Count work per clock', 'The FP32 figure comes from core count, two operations per fused multiply-add and the published boost clock.', '16,384 × 2 × 2.52 / 1000 TFLOPS', 'item:0'),
      c('Convert memory bandwidth', 'Multiply the bus width by the per-pin data rate and divide bits by eight to express bytes per second.', '384 × 21 / 8 = 1,008 GB/s', 'item:4'),
      c('Relate bus and memory packages', 'The declared 32-bit package interface and 2 GB package capacity reproduce the published memory total.', '384 / 32 × 2 = 24 GB', 'item:5'),
      c('Keep the boundary explicit', 'A matching spec-sheet calculation does not predict gaming speed. Thermal limits, workload and utilisation are outside this model.', 'PEAK SPECIFICATION ≠ BENCHMARK RESULT', 'item:6'),
    ],
  },
  {
    id: 'mos6502-addressing', engine: 'workflow', source: 'examples/mos6502', title: 'MOS 6502 / buses & address space',
    question: 'How does a 16-bit address bus reach 64 KiB?', limit: 'Pinout and arithmetic model; no transistor-level or cycle-accurate CPU emulation.',
    chapters: [
      c('Count the address lines', 'The pinout identifies A0 through A15. Each independent binary line doubles the set of possible addresses.', 'A0 … A15 / 16 ADDRESS LINES', 'item:0'),
      c('Count the data lines separately', 'D0 through D7 carry an eight-bit value. Data width and address width describe different functions.', 'D0 … D7 / 8 DATA LINES', 'item:1'),
      c('Derive the address space', 'Sixteen binary address signals select 65,536 locations. This calculation is compared with the published capacity.', '2¹⁶ = 65,536 BYTES = 64 KiB', 'item:2'),
      c('Bound the opcode count', 'There are 256 possible eight-bit opcode values. The declared table uses 151; the remaining 105 are reported as undefined.', '256 − 151 = 105', 'item:3'),
    ],
  },
  {
    id: 'floppy-capacity', engine: 'workflow', source: 'docs/benchmark/floppy', title: 'Floppy disk / tracks to bytes',
    question: 'What does the “1.44 MB” label count?',
    limit: 'The ECMA-125 format and recorded spec; not a magnetic field or read-channel simulation.',
    chapters: [
      c('Describe the format', 'The formatted capacity comes from sides, tracks per side, sectors per track and bytes per sector.', '2 × 80 × 18 × 512', 'item:0'),
      c('Add the payload bytes', 'Multiplying those counts gives the byte capacity. Headers, gaps and modulation overhead are not user payload.', '1,474,560 PAYLOAD BYTES', 'item:0'),
      c('Resolve the historical label', 'The familiar 1.44 label uses a mixed convention: divide the byte count by 1024, then by 1000.', '1,474,560 / 1024 / 1000 = 1.44', 'item:1'),
      c('Keep the storage layers distinct', 'Track geometry, raw recording capacity and formatted payload are related quantities with different definitions.', 'RAW RECORDING ≠ FORMATTED PAYLOAD', 'item:5'),
    ],
  },
  {
    id: 'rpi4-drawing', engine: 'paper', source: 'examples/rpi4-board', title: 'Raspberry Pi 4 / board drawing',
    question: 'Which dimensions locate the mounting holes?',
    limit: 'Board outline and holes only. Sheet fitted for screen; use the SVG for declared scale.',
    chapters: [
      c('Start with the published outline', 'The declared drawing uses the maker’s board outline. Geometry and evidence remain separate from electronic behaviour.', '85 × 56 mm / R3 CORNERS', 'item:0'),
      c('Locate the hole pattern', 'Four mounting holes are positioned by the declared 58 by 49 mm spacing. Their location matters as much as diameter.', '58 × 49 mm HOLE SPACING', 'item:0'),
      c('Compare the actual drawing', 'The gate checks declared dimensions against the referenced mechanical drawing rather than trusting a caption.', '4 × Ø2.7 mm', 'item:0'),
      c('State what was checked', 'The source PDF and DXF belong to the same maker. The evidence state stays CONSISTENT; the sheet is not a manufacturing drawing.', 'SOURCE AGREEMENT / NO TOLERANCE CLAIM', 'item:0'),
    ],
  },
  {
    id: 'lock-section', engine: 'paper', source: 'examples/lock', title: 'Pin tumbler / the shear-line section',
    question: 'What must line up before the plug turns?', limit: 'A source-backed mechanism section with estimated diameters and driver lengths.',
    chapters: [
      c('Read the section', 'The cut view separates housing, plug, springs and pins. The highlighted boundary is the shear line.', 'FIXED HOUSING / ROTATING PLUG', 'item:0'),
      c('Relate cut depth to pin length', 'The published keying table gives complementary cut depths and pin lengths. The drawing derives their stack positions.', 'KEY PIN + CUT DEPTH = 0.501 in', 'item:2'),
      c('Find the blocked chamber', 'A wrong cut leaves one pin crossing the shear line. The drawing makes the obstruction visible without hiding the section.', 'ONE WRONG CUT → ONE BLOCKED CHAMBER', 'item:4'),
      c('Show alignment, not certification', 'The correct key aligns all splits. This is an explanatory section, not a specification for manufacturing a lock.', 'EXPLANATORY SECTION / NOT TO SCALE', 'item:3'),
    ],
  },
  {
    id: 'plate-geometry', engine: 'paper', source: 'examples/demo-plate', title: 'Mounting plate / parametric features',
    question: 'Can the drawing come entirely from geometry?', limit: 'Synthetic demonstration dimensions. No published product or manufacturing approval.',
    chapters: [
      c('Declare a contour', 'A rounded rectangular outline defines the material boundary. The sheet is generated from geometry rather than hand-placed strokes.', '160 × 100 mm / DECLARED DEMO', 'item:0'),
      c('Subtract the features', 'Four mounting holes, a cable window and a pilot hole remove material from that outline.', 'OUTLINE − HOLES = NET MATERIAL', 'item:0'),
      c('Generate a repeated pattern', 'Five vents are defined by a linear pattern. A parameter change updates their positions and the derived drawing.', '5 FEATURES / ONE PATTERN RULE', 'item:0'),
      c('Check geometry without inventing evidence', 'Containment and overlap checks can pass while the evidence state remains NOTHING CHECKED. These numbers were chosen for a demonstration.', 'GEOMETRY CHECK ≠ PRODUCT VERIFICATION', 'item:0'),
    ],
  },
  {
    id: 'flange-pattern', engine: 'paper', source: 'examples/demo-flange', title: 'Circular flange / polar pattern',
    question: 'How does a bolt circle constrain every hole?', limit: 'Synthetic demonstration dimensions. No fits, tolerances or load calculation.',
    chapters: [
      c('Separate rim and bore', 'The circular boundary and centre bore define a ring of material. Both belong to the declared synthetic geometry.', 'CIRCULAR OUTLINE / CENTRAL BORE', 'item:0'),
      c('Define a polar pattern', 'Each repeated hole is located by a shared radius and angular spacing. The drawing is generated from those constraints.', 'ONE CENTRE / ONE RADIUS / REPEATED ANGLES', 'item:0'),
      c('Inspect remaining material', 'Geometry checks look for holes outside the rim or overlapping other cutouts. They do not establish structural strength.', 'CONTAINMENT / OVERLAP / NET AREA', 'item:0'),
      c('Export exact vector geometry', 'The SVG keeps circles and arcs as vectors. Its declared scale is separate from this screen-fitted film.', 'VECTOR OUTPUT / DEMONSTRATION ONLY', 'item:0'),
    ],
  },
  {
    id: 'bracket-section', engine: 'paper', source: 'examples/demo-section', title: 'Stepped bracket / section A–A',
    question: 'What does a section reveal that a silhouette hides?', limit: 'Synthetic bracket, chosen to demonstrate sections. Not a measured commercial part.',
    chapters: [
      c('Read the external views', 'A projection shows the outline from one direction. It does not reveal every internal step or cut.', 'FRONT / TOP / SIDE', 'item:0'),
      c('Choose the cutting plane', 'The declared A–A section intersects the geometry. Its position is part of the drawing data.', 'SECTION A–A', 'item:0'),
      c('Distinguish solid and void', 'The cut view uses section conventions to distinguish intersected material from removed areas.', 'CUT MATERIAL / OPEN SPACE', 'item:0'),
      c('Keep construction data honest', 'Dimensions are generated from the declared model. The example demonstrates drafting capability, not product verification.', 'PARAMETRIC DRAWING / SYNTHETIC VALUES', 'item:0'),
    ],
  },
  {
    id: 'antikythera-construction', engine: 'paper', source: 'docs/benchmark/antikythera-refined',
    title: 'Antikythera / reconstruction limits', question: 'Which parts of a reconstruction are actually constrained?',
    limit: 'Incomplete reconstruction: several tooth counts are estimates and the lunar anomaly is omitted.',
    chapters: [
      c('Read a reconstruction as a hypothesis', 'The orthographic construction comes from the refined benchmark spec. Surviving evidence does not determine every missing part.', 'SURVIVING EVIDENCE + EXPLICIT ASSUMPTIONS', 'item:0'),
      c('Follow a constrained gear train', 'Declared tooth counts and links determine ratios. The gate compares six outputs with the cited reconstruction data.', 'TEETH → LINKS → RATIOS', 'item:1'),
      c('Expose estimated components', 'Several lost gears have estimated tooth counts. Agreement of their outputs can show consistency without proving historical accuracy.', 'ESTIMATED PARTS REMAIN ESTIMATED', 'item:2'),
      c('Report the boundary', 'The lunar anomaly, several displays and other components remain outside this model. The verdict is CONSISTENT, not a complete historical reconstruction.', 'CONSISTENT / INCOMPLETE RECONSTRUCTION', 'item:3'),
    ],
  },
];
