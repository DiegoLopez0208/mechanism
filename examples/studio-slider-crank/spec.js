// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-slider-crank",
  "fig": "Studio 12",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Slider crank / finite rod length",
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
      "id": "flywheel",
      "name": "flywheel",
      "kind": "disc",
      "p": {
        "r": 22,
        "w": 6,
        "bore": 4.1,
        "holes": [
          [
            0,
            14,
            3.1
          ]
        ]
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
      "spin": -0.8
    },
    {
      "id": "crank-pin",
      "name": "crank pin",
      "kind": "shaft",
      "p": {
        "r": 3,
        "len": 10
      },
      "at": [
        0,
        0,
        7
      ],
      "mat": "chrome",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        20
      ],
      "motion": (s,t)=>({pos:[14*Math.sin(.8*t),14*Math.cos(.8*t),0]})
    },
    {
      "id": "connecting-rod",
      "name": "connecting rod",
      "kind": "plate",
      "p": {
        "w": 7,
        "h": 48,
        "t": 5,
        "r": 3
      },
      "at": [
        0,
        0,
        9
      ],
      "mat": "brass",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        20
      ],
      "motion": (s,t)=>{const a=.8*t,x=14*Math.sin(a),y=14*Math.cos(a),h=Math.sqrt(48**2-x*x);return {pos:[x/2,y+h/2,0],rot:[0,0,Math.asin(x/48)]};}
    },
    {
      "id": "slider",
      "name": "slider",
      "kind": "block",
      "p": {
        "w": 22,
        "d": 16,
        "h": 12
      },
      "at": [
        0,
        0,
        9
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        20
      ],
      "motion": (s,t)=>({pos:[0,14*Math.cos(.8*t)+Math.sqrt(48**2-(14*Math.sin(.8*t))**2),0]})
    },
    {
      "id": "guide-left",
      "name": "guide left",
      "kind": "plate",
      "p": {
        "w": 5,
        "h": 72,
        "t": 9,
        "r": 3
      },
      "at": [
        -17,
        50,
        3
      ],
      "mat": "aluminum-dark",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        20
      ]
    },
    {
      "id": "guide-right",
      "name": "guide right",
      "kind": "plate",
      "p": {
        "w": 5,
        "h": 72,
        "t": 9,
        "r": 3
      },
      "at": [
        17,
        50,
        3
      ],
      "mat": "aluminum-dark",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        20
      ]
    },
    {
      "id": "base",
      "name": "base",
      "kind": "plate",
      "p": {
        "w": 68,
        "h": 112,
        "t": 5,
        "r": 3
      },
      "at": [
        0,
        33,
        -14
      ],
      "mat": "aluminum-dark",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -20
      ]
    },
    {
      "id": "main-shaft",
      "name": "main shaft",
      "kind": "shaft",
      "p": {
        "r": 4,
        "len": 30
      },
      "at": [
        0,
        0,
        -5
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
      ]
    }
  ],
  "stage": {
    "floorY": -65
  },
  "director": {
    "what": "Why is piston motion not a pure sine?",
    "tour": [
      "flywheel",
      "crank-pin",
      "connecting-rod"
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
