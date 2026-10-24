// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-internal-mesh",
  "fig": "Studio 10",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Internal gear / same direction",
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
      "id": "ring",
      "name": "ring",
      "kind": "ring",
      "p": {
        "m": 1,
        "z": 60,
        "ro": 35,
        "width": 8
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
      "body": "ring"
    },
    {
      "id": "pinion",
      "name": "pinion",
      "kind": "gear",
      "p": {
        "m": 1,
        "z": 20,
        "width": 7,
        "bore": 3,
        "hub": {
          "r": 6,
          "w": 10
        }
      },
      "at": [
        20,
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
        0,
        20
      ],
      "body": "pinion"
    },
    {
      "id": "support-ring",
      "name": "support ring",
      "kind": "disc",
      "p": {
        "r": 37,
        "w": 4,
        "bore": 27
      },
      "at": [
        0,
        0,
        -14
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
      ]
    },
    {
      "id": "pinion-shaft",
      "name": "pinion shaft",
      "kind": "shaft",
      "p": {
        "r": 3,
        "len": 32
      },
      "at": [
        20,
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
    "what": "How does an inside mesh rotate?",
    "tour": [
      "ring",
      "pinion",
      "support-ring"
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
  },
  "mechanism": {
    "free": "pinion",
    "links": [
      {
        "t": "int",
        "a": "ring",
        "b": "pinion"
      }
    ],
    "drive": {
      "rpm": 15,
      "modes": [
        {
          "id": "run",
          "label": "Internal mesh",
          "driver": "pinion",
          "shell": "ring"
        }
      ]
    }
  }
};
