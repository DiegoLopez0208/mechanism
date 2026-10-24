// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-idler-train",
  "fig": "Studio 09",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Idler train / direction & ratio",
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
        "z": 20,
        "width": 7,
        "bore": 3,
        "hub": {
          "r": 6,
          "w": 10
        }
      },
      "at": [
        -25,
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
      "id": "idler",
      "name": "idler",
      "kind": "gear",
      "p": {
        "m": 1,
        "z": 30,
        "width": 7,
        "bore": 3,
        "hub": {
          "r": 6,
          "w": 10
        }
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
      "body": "idler"
    },
    {
      "id": "output",
      "name": "output",
      "kind": "gear",
      "p": {
        "m": 1,
        "z": 40,
        "width": 7,
        "bore": 3,
        "hub": {
          "r": 6,
          "w": 10
        }
      },
      "at": [
        35,
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
      "body": "output"
    },
    {
      "id": "bridge",
      "name": "bridge",
      "kind": "plate",
      "p": {
        "w": 130,
        "h": 65,
        "t": 4,
        "r": 3,
        "holes": [
          [
            -30,
            0,
            3.2
          ],
          [
            -5,
            0,
            3.2
          ],
          [
            30,
            0,
            3.2
          ]
        ]
      },
      "at": [
        5,
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
        -25,
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
        -25,
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
        0,
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
      "id": "bearing-2",
      "name": "bearing 2",
      "kind": "bearing",
      "p": {
        "ri": 3.2,
        "ro": 7,
        "w": 5,
        "balls": 8
      },
      "at": [
        35,
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
      "id": "axle-2",
      "name": "axle 2",
      "kind": "shaft",
      "p": {
        "r": 3,
        "len": 34
      },
      "at": [
        35,
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
    "what": "What does an intermediate gear change?",
    "tour": [
      "input",
      "idler",
      "output"
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
        "b": "idler"
      },
      {
        "t": "ext",
        "a": "idler",
        "b": "output"
      }
    ],
    "drive": {
      "rpm": 15,
      "modes": [
        {
          "id": "run",
          "label": "Idler transmission",
          "driver": "input",
          "shell": "output"
        }
      ]
    }
  }
};
