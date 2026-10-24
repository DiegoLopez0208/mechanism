// New native Studio design studies. No manufacturer specifications are claimed.
export const studioFilms = [
  {
    "id": "studio-spur-reducer",
    "engine": "studio",
    "source": "examples/studio-spur-reducer",
    "title": "Spur reducer / 18 to 54",
    "question": "How do tooth counts set speed?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "A real tooth mesh",
        "text": "Involute teeth transmit rotation between parallel shafts.",
        "formula": "18 TEETH → 54 TEETH",
        "shot": "cycle"
      },
      {
        "title": "Opposite directions",
        "text": "External gears rotate in opposite directions.",
        "formula": "ω₂ / ω₁ = −18 / 54",
        "shot": "cycle"
      },
      {
        "title": "A slower output",
        "text": "Three input revolutions produce one output revolution.",
        "formula": "SPEED RATIO −1/3",
        "shot": "cycle"
      },
      {
        "title": "Separate the supports",
        "text": "Bearings support the shafts behind the tooth contact.",
        "formula": "CENTRES = (18 + 54) / 2 = 36 mm",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-compound-train",
    "engine": "studio",
    "source": "examples/studio-compound-train",
    "title": "Compound train / two stages",
    "question": "Why do stage ratios multiply?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "Two meshes in depth",
        "text": "The intermediate wheel and pinion share one shaft.",
        "formula": "24:48 × 16:64",
        "shot": "cycle"
      },
      {
        "title": "First reduction",
        "text": "The first mesh halves the angular speed.",
        "formula": "−24 / 48 = −1/2",
        "shot": "cycle"
      },
      {
        "title": "Second reduction",
        "text": "The second mesh reverses direction again.",
        "formula": "(−1/2) × (−1/4) = +1/8",
        "shot": "cycle"
      },
      {
        "title": "One compound arbor",
        "text": "Axial separation keeps the two tooth meshes independent.",
        "formula": "OUTPUT TURNS WITH INPUT",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-idler-train",
    "engine": "studio",
    "source": "examples/studio-idler-train",
    "title": "Idler train / direction & ratio",
    "question": "What does an intermediate gear change?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "Three shafts",
        "text": "Two external contacts connect input to output.",
        "formula": "20 → 30 → 40 TEETH",
        "shot": "cycle"
      },
      {
        "title": "Two reversals",
        "text": "Each external mesh reverses rotation.",
        "formula": "NEGATIVE × NEGATIVE = POSITIVE",
        "shot": "cycle"
      },
      {
        "title": "The idler cancels",
        "text": "The intermediate tooth count cancels from the total ratio.",
        "formula": "(20/30) × (30/40) = 1/2",
        "shot": "cycle"
      },
      {
        "title": "A supporting bridge",
        "text": "The intermediate shaft changes the spacing and direction.",
        "formula": "SAME DIRECTION / HALF SPEED",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-internal-mesh",
    "engine": "studio",
    "source": "examples/studio-internal-mesh",
    "title": "Internal gear / same direction",
    "question": "How does an inside mesh rotate?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "Teeth on the inside",
        "text": "The pinion contacts an internal ring instead of an external wheel.",
        "formula": "20 / 60 TEETH",
        "shot": "cycle"
      },
      {
        "title": "Same direction",
        "text": "An internal mesh preserves the sign of angular velocity.",
        "formula": "ωring / ωpinion = +1/3",
        "shot": "cycle"
      },
      {
        "title": "Difference of radii",
        "text": "Internal centre spacing uses subtraction.",
        "formula": "CENTRES = (60 − 20) / 2",
        "shot": "cycle"
      },
      {
        "title": "Separate the ring",
        "text": "The supporting ring is a design context, not a bearing simulation.",
        "formula": "20 mm CENTRE OFFSET",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-rack-pinion",
    "engine": "studio",
    "source": "examples/studio-rack-pinion",
    "title": "Rack & pinion / linear travel",
    "question": "How does a rotating gear move a rack?",
    "limit": "Synthetic rack geometry and prescribed ideal motion. Backlash, compliance and load are not simulated.",
    "chapters": [
      {
        "title": "A straight pitch line",
        "text": "A rack is a linear tooth sequence rather than a closed wheel.",
        "formula": "MODULE 1 / 24 TEETH",
        "shot": "cycle"
      },
      {
        "title": "Rotation becomes travel",
        "text": "The pitch radius maps angle to linear displacement.",
        "formula": "x = −r θ",
        "shot": "cycle"
      },
      {
        "title": "Reverse the input",
        "text": "The rack reverses when the pinion reverses.",
        "formula": "r = 12 mm / x = 6 sin(0.8t)",
        "shot": "cycle"
      },
      {
        "title": "Expose the guide",
        "text": "The guide supports the rack along its travel axis.",
        "formula": "IDEAL TOOTH KINEMATICS",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-slider-crank",
    "engine": "studio",
    "source": "examples/studio-slider-crank",
    "title": "Slider crank / finite rod length",
    "question": "Why is piston motion not a pure sine?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "One rotating input",
        "text": "The crank pin follows a circular trajectory.",
        "formula": "CRANK RADIUS 14 mm",
        "shot": "cycle"
      },
      {
        "title": "A constant-length rod",
        "text": "The connecting rod constrains the slider to a straight axis.",
        "formula": "L = 48 mm",
        "shot": "cycle"
      },
      {
        "title": "Finite rod correction",
        "text": "The square root keeps both rod endpoints at a fixed distance.",
        "formula": "y = r cosθ + √(L² − r²sin²θ)",
        "shot": "cycle"
      },
      {
        "title": "Expose the linkage",
        "text": "The stroke is twice the crank radius.",
        "formula": "28 mm TOTAL STROKE",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-scotch-yoke",
    "engine": "studio",
    "source": "examples/studio-scotch-yoke",
    "title": "Scotch yoke / harmonic motion",
    "question": "How does a slot remove rod-angle effects?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "The pin follows a circle",
        "text": "The pin moves within the long horizontal slot.",
        "formula": "15 mm CRANK RADIUS",
        "shot": "cycle"
      },
      {
        "title": "The slot absorbs sideways motion",
        "text": "The yoke follows only the vertical component of the pin.",
        "formula": "y = r cosθ",
        "shot": "cycle"
      },
      {
        "title": "A sinusoidal output",
        "text": "The ideal stroke is symmetric about its centre.",
        "formula": "30 mm TOTAL STROKE",
        "shot": "cycle"
      },
      {
        "title": "Separate pin and slot",
        "text": "Clearance is illustrative; no contact force is calculated.",
        "formula": "CIRCULAR INPUT / LINEAR OUTPUT",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-eccentric-cam",
    "engine": "studio",
    "source": "examples/studio-eccentric-cam",
    "title": "Eccentric cam / roller follower",
    "question": "How does an offset circular cam create lift?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "Offset the cam centre",
        "text": "The shaft axis and circular cam centre are separated.",
        "formula": "20 mm CAM / 5 mm OFFSET",
        "shot": "cycle"
      },
      {
        "title": "Roller contact",
        "text": "The follower centre stays one summed radius from the cam centre.",
        "formula": "Rcam + Rroller = 25 mm",
        "shot": "cycle"
      },
      {
        "title": "Compute the lift",
        "text": "The exact circle-contact constraint sets the vertical motion.",
        "formula": "10 mm GEOMETRIC LIFT",
        "shot": "cycle"
      },
      {
        "title": "Expose the return components",
        "text": "The spring is shown as assembly context, not a solved force.",
        "formula": "PRESCRIBED CONTACT / NO DYNAMICS",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-ball-bearing",
    "engine": "studio",
    "source": "examples/studio-ball-bearing",
    "title": "Ball bearing / races & rolling",
    "question": "What moves between the bearing races?",
    "limit": "Authored bearing geometry. Ideal no-slip cage motion; no Hertz stress, fatigue life or manufacturer rating.",
    "chapters": [
      {
        "title": "Two concentric races",
        "text": "The inner race surrounds the shaft; the outer race sits in the housing.",
        "formula": "INNER / OUTER RACE",
        "shot": "cycle"
      },
      {
        "title": "Rolling elements",
        "text": "Ten balls occupy the annular space between the races.",
        "formula": "TEN BALLS / BRASS CAGE",
        "shot": "cycle"
      },
      {
        "title": "Separate rotation rates",
        "text": "A fixed outer ring and rotating inner ring give an intermediate cage speed.",
        "formula": "ωc = ½(1 − d/D) ωi",
        "shot": "cycle"
      },
      {
        "title": "Open the seals",
        "text": "The seal protects the rolling path without becoming a load-bearing race.",
        "formula": "SEALS / RACES / CAGE",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-multiplate-clutch",
    "engine": "studio",
    "source": "examples/studio-multiplate-clutch",
    "title": "Multiplate clutch / friction stack",
    "question": "Why use multiple friction interfaces?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "Alternating plates",
        "text": "Two sets of discs form a compact axial stack.",
        "formula": "SIX PLATES / FIVE INTERFACES",
        "shot": "cycle"
      },
      {
        "title": "Apply axial pressure",
        "text": "The pressure plate closes the assembly.",
        "formula": "CLAMP FORCE ACTS ALONG THE SHAFT",
        "shot": "cycle"
      },
      {
        "title": "Trace the friction interfaces",
        "text": "More surfaces can transmit torque within the same radial envelope.",
        "formula": "TORQUE REQUIRES μ AND NORMAL FORCE",
        "shot": "cycle"
      },
      {
        "title": "Inspect the stack",
        "text": "Different prescribed speeds illustrate slip, not a torque solution.",
        "formula": "ILLUSTRATIVE SLIP / NO FRICTION SOLVER",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-disc-brake",
    "engine": "studio",
    "source": "examples/studio-disc-brake",
    "title": "Disc brake / rotor & caliper",
    "question": "Where does braking torque enter the rotor?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "A rotating friction surface",
        "text": "The perforated rotor rotates with its hub.",
        "formula": "ROTOR / HAT / HUB",
        "shot": "cycle"
      },
      {
        "title": "Pads act on both faces",
        "text": "The stationary caliper supports opposing pads.",
        "formula": "NORMAL FORCES ACROSS THE DISC",
        "shot": "cycle"
      },
      {
        "title": "A tangential reaction",
        "text": "Friction transmits a moment to the caliper mounting.",
        "formula": "M = Ffriction × EFFECTIVE RADIUS",
        "shot": "cycle"
      },
      {
        "title": "Open the caliper",
        "text": "The exploded view separates the pads from the rotor faces.",
        "formula": "NO HEAT OR STOPPING-DISTANCE MODEL",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-jaw-coupling",
    "engine": "studio",
    "source": "examples/studio-jaw-coupling",
    "title": "Jaw coupling / compliant interface",
    "question": "How do two shafts share a flexible element?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "Two separate hubs",
        "text": "Metal hubs connect to opposite shafts.",
        "formula": "INPUT HUB / OUTPUT HUB",
        "shot": "cycle"
      },
      {
        "title": "Interleaved jaws",
        "text": "An elastomer insert occupies the space between the jaws.",
        "formula": "METAL → ELASTOMER → METAL",
        "shot": "cycle"
      },
      {
        "title": "A compliant load path",
        "text": "The insert is shown at matching speed without solving its deformation.",
        "formula": "COAXIAL PRESCRIBED ROTATION",
        "shot": "cycle"
      },
      {
        "title": "Open the coupling",
        "text": "Separating both hubs reveals the replaceable insert.",
        "formula": "NO MISALIGNMENT OR STIFFNESS RATING",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-gear-pump",
    "engine": "studio",
    "source": "examples/studio-gear-pump",
    "title": "Gear pump / trapped volumes",
    "question": "How can meshing gears move fluid?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "Two meshing rotors",
        "text": "Equal external gears rotate at opposite angular velocities.",
        "formula": "20 TEETH / 20 TEETH",
        "shot": "cycle"
      },
      {
        "title": "Volumes travel around the outside",
        "text": "Tooth spaces carry fluid beside the housing rather than through the mesh.",
        "formula": "INLET → OUTER TOOTH SPACES → OUTLET",
        "shot": "cycle"
      },
      {
        "title": "The mesh divides the ports",
        "text": "The central contact separates the nominal inlet and outlet sides.",
        "formula": "ω₂ = −ω₁",
        "shot": "cycle"
      },
      {
        "title": "Open the end cover",
        "text": "Clearances and leakage are not inferred from this cutaway.",
        "formula": "NO CFD / PRESSURE / VOLUMETRIC RATING",
        "shot": "cycle"
      }
    ]
  },
  {
    "id": "studio-lead-screw",
    "engine": "studio",
    "source": "examples/studio-lead-screw",
    "title": "Lead screw / rotary positioning",
    "question": "How does screw lead determine linear feed?",
    "limit": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
    "chapters": [
      {
        "title": "A helical input",
        "text": "The helical ridge rotates around a straight shaft.",
        "formula": "5 mm LEAD / SINGLE START",
        "shot": "cycle"
      },
      {
        "title": "Prevent nut rotation",
        "text": "The guide constrains the carriage to axial travel.",
        "formula": "ONE TURN → 5 mm",
        "shot": "cycle"
      },
      {
        "title": "Angle becomes position",
        "text": "Travel follows the screw lead and signed rotation.",
        "formula": "Δz = −lead × θ / 2π",
        "shot": "cycle"
      },
      {
        "title": "Inspect the interfaces",
        "text": "The thread is a rounded illustrative ridge, not a manufactured thread form.",
        "formula": "NO BACKLASH OR SELF-LOCKING CLAIM",
        "shot": "cycle"
      }
    ]
  }
];
