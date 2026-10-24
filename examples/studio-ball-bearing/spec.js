// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-ball-bearing",
  "fig": "Studio 15",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Ball bearing / races & rolling",
  "sub": "Authored bearing geometry. Ideal no-slip cage motion; no Hertz stress, fatigue life or manufacturer rating.",
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
        "text": "Authored bearing geometry. Ideal no-slip cage motion; no Hertz stress, fatigue life or manufacturer rating.",
        "why": "A newly authored educational assembly, not a measured or manufacturer-specified product."
      }
    ]
  },
  "parts": [
    {
      "id": "bearing",
      "name": "bearing",
      "kind": "bearing",
      "p": {
        "ri": 12,
        "ro": 28,
        "w": 12,
        "balls": 10
      },
      "at": [
        0,
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
      "id": "inner-shaft",
      "name": "inner shaft",
      "kind": "shaft",
      "p": {
        "r": 11.7,
        "len": 58
      },
      "at": [
        0,
        0,
        -6
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
      "id": "rear-seal",
      "name": "rear seal",
      "kind": "tube",
      "p": {
        "ri": 13.8,
        "ro": 25.5,
        "len": 1.5
      },
      "at": [
        0,
        0,
        -7
      ],
      "mat": "rubber",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -25
      ]
    },
    {
      "id": "front-seal",
      "name": "front seal",
      "kind": "tube",
      "p": {
        "ri": 13.8,
        "ro": 25.5,
        "len": 1.5
      },
      "at": [
        0,
        0,
        7
      ],
      "mat": "rubber",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        25
      ],
      "cutaway": true
    },
    {
      "id": "shaft-collar",
      "name": "shaft collar",
      "kind": "tube",
      "p": {
        "ri": 11.8,
        "ro": 15,
        "len": 5
      },
      "at": [
        0,
        0,
        20
      ],
      "mat": "brass",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        30
      ],
      "spin": 0.8
    }
  ],
  "stage": {
    "floorY": -65
  },
  "director": {
    "what": "What moves between the bearing races?",
    "tour": [
      "bearing",
      "inner-shaft",
      "rear-seal"
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
