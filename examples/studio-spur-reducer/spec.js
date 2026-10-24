// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-spur-reducer",
  "fig": "Studio 07",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Spur reducer / 18 to 54",
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
      "id": "input",
      "name": "input",
      "kind": "gear",
      "p": {
        "m": 1,
        "z": 18,
        "width": 7,
        "bore": 3,
        "hub": {
          "r": 6,
          "w": 10
        }
      },
      "at": [
        -18,
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
      "body": "input"
    },
    {
      "id": "output",
      "name": "output",
      "kind": "gear",
      "p": {
        "m": 1,
        "z": 54,
        "width": 7,
        "bore": 3,
        "hub": {
          "r": 6,
          "w": 10
        }
      },
      "at": [
        18,
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
      "body": "output"
    },
    {
      "id": "backplate",
      "name": "backplate",
      "kind": "plate",
      "p": {
        "w": 114,
        "h": 78,
        "t": 4,
        "r": 3,
        "holes": [
          [
            -18,
            0,
            3.2
          ],
          [
            18,
            0,
            3.2
          ]
        ]
      },
      "at": [
        0,
        0,
        -16
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
      "id": "bearing-0",
      "name": "bearing 0",
      "kind": "bearing",
      "p": {
        "ri": 3.2,
        "ro": 7,
        "w": 5,
        "balls": 8
      },
      "at": [
        -18,
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
        -24
      ]
    },
    {
      "id": "axle-0",
      "name": "axle 0",
      "kind": "shaft",
      "p": {
        "r": 3,
        "len": 34
      },
      "at": [
        -18,
        0,
        -3
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
    },
    {
      "id": "bearing-1",
      "name": "bearing 1",
      "kind": "bearing",
      "p": {
        "ri": 3.2,
        "ro": 7,
        "w": 5,
        "balls": 8
      },
      "at": [
        18,
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
        -24
      ]
    },
    {
      "id": "axle-1",
      "name": "axle 1",
      "kind": "shaft",
      "p": {
        "r": 3,
        "len": 34
      },
      "at": [
        18,
        0,
        -3
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
    "what": "How do tooth counts set speed?",
    "tour": [
      "input",
      "output",
      "backplate"
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
    "free": "input",
    "links": [
      {
        "t": "ext",
        "a": "input",
        "b": "output"
      }
    ],
    "drive": {
      "rpm": 15,
      "modes": [
        {
          "id": "run",
          "label": "Reduction",
          "driver": "input",
          "shell": "output"
        }
      ]
    }
  }
};
