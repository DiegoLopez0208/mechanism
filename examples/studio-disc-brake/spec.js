// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-disc-brake",
  "fig": "Studio 17",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Disc brake / rotor & caliper",
  "sub": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
  "research": {
    "sources": [
      {
        "id": "request",
        "kind": "user",
        "title": "Request to create new Mechanism Studio objects",
        "received": "2026-10-23",
        "note": "The request supplies the creative brief, not dimensions. Geometry was authored for these studies."
      }
    ],
    "claims": [
      {
        "id": "design",
        "conf": "estimated",
        "text": "Geometry is an authored design; motion is kinematic. No load, wear or efficiency prediction.",
        "why": "A newly authored educational assembly, not a measured or manufacturer-specified product."
      }
    ]
  },
  "parts": [
    {
      "id": "brake-rotor",
      "name": "brake rotor",
      "kind": "flange",
      "p": {
        "r": 36,
        "bore": 9,
        "w": 4,
        "n": 18,
        "hr": 29,
        "hd": 3
      },
      "at": [
        0,
        0,
        0
      ],
      "mat": "steel",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        20
      ],
      "spin": 0.8
    },
    {
      "id": "rotor-hat",
      "name": "rotor hat",
      "kind": "disc",
      "p": {
        "r": 18,
        "w": 10,
        "bore": 8.1
      },
      "at": [
        0,
        0,
        -7
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -20
      ],
      "spin": 0.8
    },
    {
      "id": "hub",
      "name": "hub",
      "kind": "shaft",
      "p": {
        "r": 8,
        "len": 35
      },
      "at": [
        0,
        0,
        -12
      ],
      "mat": "chrome",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -20
      ],
      "spin": 0.8
    },
    {
      "id": "caliper-bridge",
      "name": "caliper bridge",
      "kind": "box",
      "p": {
        "w": 22,
        "d": 33,
        "h": 21,
        "wall": 3
      },
      "at": [
        26,
        0,
        0
      ],
      "mat": "honda-red",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        25,
        0,
        5
      ]
    },
    {
      "id": "pad-front",
      "name": "pad front",
      "kind": "plate",
      "p": {
        "w": 16,
        "h": 21,
        "t": 3,
        "r": 3
      },
      "at": [
        26,
        0,
        4
      ],
      "mat": "graphite",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        25
      ],
      "motion": (s,t)=>({pos:[0,0,1.5*(1+Math.sin(.8*t))]})
    },
    {
      "id": "pad-rear",
      "name": "pad rear",
      "kind": "plate",
      "p": {
        "w": 16,
        "h": 21,
        "t": 3,
        "r": 3
      },
      "at": [
        26,
        0,
        -4
      ],
      "mat": "graphite",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -25
      ],
      "motion": (s,t)=>({pos:[0,0,-1.5*(1+Math.sin(.8*t))]})
    }
  ],
  "stage": {
    "floorY": -65
  },
  "director": {
    "what": "Where does braking torque enter the rotor?",
    "tour": [
      "brake-rotor",
      "rotor-hat",
      "hub"
    ],
    "views": {
      "iso": {
        "yaw": -28,
        "pitch": 25
      },
      "expl": {
        "yaw": -38,
        "pitch": 23
      }
    }
  }
};
