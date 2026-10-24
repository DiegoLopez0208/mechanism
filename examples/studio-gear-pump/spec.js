// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-gear-pump",
  "fig": "Studio 19",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Gear pump / trapped volumes",
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
      "id": "drive",
      "name": "drive",
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
        -10,
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
      "body": "drive"
    },
    {
      "id": "driven",
      "name": "driven",
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
        10,
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
      "body": "driven"
    },
    {
      "id": "pump-case",
      "name": "pump case",
      "kind": "box",
      "p": {
        "w": 50,
        "d": 31,
        "h": 13,
        "wall": 3
      },
      "at": [
        0,
        0,
        -2
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -30
      ],
      "cutaway": true
    },
    {
      "id": "rear-cover",
      "name": "rear cover",
      "kind": "plate",
      "p": {
        "w": 51,
        "h": 34,
        "t": 4,
        "r": 3,
        "holes": [
          [
            -10,
            0,
            3.2
          ]
        ]
      },
      "at": [
        0,
        0,
        -11
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
      "id": "front-cover",
      "name": "front cover",
      "kind": "plate",
      "p": {
        "w": 51,
        "h": 34,
        "t": 4,
        "r": 3
      },
      "at": [
        0,
        0,
        10
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        35
      ],
      "cutaway": true
    },
    {
      "id": "inlet",
      "name": "inlet",
      "kind": "tube",
      "p": {
        "ro": 6,
        "ri": 4,
        "len": 19
      },
      "at": [
        0,
        -24,
        -1
      ],
      "mat": "brass",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        -18,
        0
      ],
      "rot": [
        90,
        0,
        0
      ]
    },
    {
      "id": "outlet",
      "name": "outlet",
      "kind": "tube",
      "p": {
        "ro": 6,
        "ri": 4,
        "len": 19
      },
      "at": [
        0,
        24,
        -1
      ],
      "mat": "brass",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        18,
        0
      ],
      "rot": [
        90,
        0,
        0
      ]
    },
    {
      "id": "input-shaft",
      "name": "input shaft",
      "kind": "shaft",
      "p": {
        "r": 3,
        "len": 34
      },
      "at": [
        -10,
        0,
        -15
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
    "what": "How can meshing gears move fluid?",
    "tour": [
      "drive",
      "driven",
      "pump-case"
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
    "free": "drive",
    "links": [
      {
        "t": "ext",
        "a": "drive",
        "b": "driven"
      }
    ],
    "drive": {
      "rpm": 15,
      "modes": [
        {
          "id": "run",
          "label": "Pump drive",
          "driver": "drive",
          "shell": "driven"
        }
      ]
    }
  }
};
