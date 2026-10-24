// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-lead-screw",
  "fig": "Studio 20",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Lead screw / rotary positioning",
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
      "id": "screw-core",
      "name": "screw core",
      "kind": "shaft",
      "p": {
        "r": 5,
        "len": 100
      },
      "at": [
        0,
        0,
        0
      ],
      "mat": "steel-dark",
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
      "id": "helical-thread",
      "name": "helical thread",
      "kind": "spring",
      "p": {
        "r": 6,
        "wire": 2,
        "turns": 20,
        "len": 100
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
      "id": "travelling-nut",
      "name": "travelling nut",
      "kind": "nut",
      "p": {
        "af": 25,
        "h": 14,
        "bore": 7.1
      },
      "at": [
        0,
        0,
        0
      ],
      "mat": "brass",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        24,
        0
      ],
      "motion": (s,t)=>({pos:[0,0,5-5*.8*t/(2*Math.PI)]})
    },
    {
      "id": "guide-rail",
      "name": "guide rail",
      "kind": "shaft",
      "p": {
        "r": 3,
        "len": 100
      },
      "at": [
        19,
        0,
        0
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
      ]
    },
    {
      "id": "carriage",
      "name": "carriage",
      "kind": "plate",
      "p": {
        "w": 42,
        "h": 18,
        "t": 9,
        "r": 2,
        "holes": [
          [
            -10,
            0,
            7.2
          ],
          [
            9,
            0,
            3.2
          ]
        ]
      },
      "at": [
        10,
        0,
        0
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        15,
        10,
        0
      ],
      "motion": (s,t)=>({pos:[0,0,5-5*.8*t/(2*Math.PI)]})
    },
    {
      "id": "end-support-L",
      "name": "end support L",
      "kind": "disc",
      "p": {
        "r": 13,
        "w": 5,
        "bore": 5.1
      },
      "at": [
        0,
        0,
        -55
      ],
      "mat": "aluminum-dark",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -22
      ]
    },
    {
      "id": "end-support-R",
      "name": "end support R",
      "kind": "disc",
      "p": {
        "r": 13,
        "w": 5,
        "bore": 5.1
      },
      "at": [
        0,
        0,
        55
      ],
      "mat": "aluminum-dark",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        22
      ]
    }
  ],
  "stage": {
    "floorY": -65,
    "bloom": 0.005,
    "exposure": 0.85,
    "envIntensity": 0.55
  },
  "director": {
    "what": "How does screw lead determine linear feed?",
    "tour": [
      "screw-core",
      "helical-thread",
      "travelling-nut"
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
