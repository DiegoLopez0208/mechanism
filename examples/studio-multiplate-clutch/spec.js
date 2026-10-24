// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-multiplate-clutch",
  "fig": "Studio 16",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Multiplate clutch / friction stack",
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
      "id": "input-shaft",
      "name": "input shaft",
      "kind": "shaft",
      "p": {
        "r": 7,
        "len": 68
      },
      "at": [
        0,
        0,
        -10
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
      "id": "back-pressure",
      "name": "back pressure",
      "kind": "disc",
      "p": {
        "r": 30,
        "w": 5,
        "bore": 7.2
      },
      "at": [
        0,
        0,
        -19
      ],
      "mat": "steel",
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
      "id": "pressure-plate",
      "name": "pressure plate",
      "kind": "disc",
      "p": {
        "r": 30,
        "w": 5,
        "bore": 7.2
      },
      "at": [
        0,
        0,
        19
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
      "motion": (s,t)=>({pos:[0,0,3*(1-Math.cos(t*.8))],rot:[0,0,.8*t]})
    },
    {
      "id": "clutch-plate-0",
      "name": "clutch plate 0",
      "kind": "disc",
      "p": {
        "r": 27,
        "w": 2,
        "bore": 7.2
      },
      "at": [
        0,
        0,
        -10
      ],
      "mat": "copper",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -32.5
      ],
      "spin": 0.8
    },
    {
      "id": "clutch-plate-1",
      "name": "clutch plate 1",
      "kind": "disc",
      "p": {
        "r": 27,
        "w": 2,
        "bore": 7.2
      },
      "at": [
        0,
        0,
        -6
      ],
      "mat": "steel",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -19.5
      ],
      "spin": 0.4
    },
    {
      "id": "clutch-plate-2",
      "name": "clutch plate 2",
      "kind": "disc",
      "p": {
        "r": 27,
        "w": 2,
        "bore": 7.2
      },
      "at": [
        0,
        0,
        -2
      ],
      "mat": "copper",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -6.5
      ],
      "spin": 0.8
    },
    {
      "id": "clutch-plate-3",
      "name": "clutch plate 3",
      "kind": "disc",
      "p": {
        "r": 27,
        "w": 2,
        "bore": 7.2
      },
      "at": [
        0,
        0,
        2
      ],
      "mat": "steel",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        6.5
      ],
      "spin": 0.4
    },
    {
      "id": "clutch-plate-4",
      "name": "clutch plate 4",
      "kind": "disc",
      "p": {
        "r": 27,
        "w": 2,
        "bore": 7.2
      },
      "at": [
        0,
        0,
        6
      ],
      "mat": "copper",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        19.5
      ],
      "spin": 0.8
    },
    {
      "id": "clutch-plate-5",
      "name": "clutch plate 5",
      "kind": "disc",
      "p": {
        "r": 27,
        "w": 2,
        "bore": 7.2
      },
      "at": [
        0,
        0,
        10
      ],
      "mat": "steel",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        32.5
      ],
      "spin": 0.4
    },
    {
      "id": "spring-0",
      "name": "spring 0",
      "kind": "spring",
      "p": {
        "r": 3,
        "wire": 0.7,
        "turns": 6,
        "len": 14
      },
      "at": [
        21,
        0,
        31
      ],
      "mat": "steel",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        38
      ]
    },
    {
      "id": "spring-1",
      "name": "spring 1",
      "kind": "spring",
      "p": {
        "r": 3,
        "wire": 0.7,
        "turns": 6,
        "len": 14
      },
      "at": [
        1.2858791391047208e-15,
        21,
        31
      ],
      "mat": "steel",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        38
      ]
    },
    {
      "id": "spring-2",
      "name": "spring 2",
      "kind": "spring",
      "p": {
        "r": 3,
        "wire": 0.7,
        "turns": 6,
        "len": 14
      },
      "at": [
        -21,
        2.5717582782094417e-15,
        31
      ],
      "mat": "steel",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        38
      ]
    },
    {
      "id": "spring-3",
      "name": "spring 3",
      "kind": "spring",
      "p": {
        "r": 3,
        "wire": 0.7,
        "turns": 6,
        "len": 14
      },
      "at": [
        -3.857637417314163e-15,
        -21,
        31
      ],
      "mat": "steel",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        38
      ]
    }
  ],
  "stage": {
    "floorY": -65,
    "bloom": 0.012,
    "exposure": 0.9
  },
  "director": {
    "what": "Why use multiple friction interfaces?",
    "tour": [
      "input-shaft",
      "back-pressure",
      "pressure-plate"
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
