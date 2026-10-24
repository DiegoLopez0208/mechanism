// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-scotch-yoke",
  "fig": "Studio 13",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Scotch yoke / harmonic motion",
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
      "id": "drive-disc",
      "name": "drive disc",
      "kind": "disc",
      "p": {
        "r": 22,
        "w": 5,
        "bore": 4.1,
        "holes": [
          [
            0,
            15,
            2.8
          ]
        ]
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
        -20
      ],
      "spin": -0.8
    },
    {
      "id": "yoke",
      "name": "yoke",
      "kind": "profile",
      "p": {
        "pts": [
          [
            -25,
            -9
          ],
          [
            25,
            -9
          ],
          [
            25,
            9
          ],
          [
            -25,
            9
          ]
        ],
        "holes": [
          [
            [
              -19,
              -3
            ],
            [
              -19,
              3
            ],
            [
              19,
              3
            ],
            [
              19,
              -3
            ]
          ]
        ],
        "len": 7
      },
      "at": [
        0,
        0,
        4
      ],
      "mat": "brass",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        20,
        20
      ],
      "motion": (s,t)=>({pos:[0,15*Math.cos(t*.8),0]})
    },
    {
      "id": "roller-pin",
      "name": "roller pin",
      "kind": "shaft",
      "p": {
        "r": 2.7,
        "len": 18
      },
      "at": [
        0,
        0,
        4
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
      "motion": (s,t)=>({pos:[15*Math.sin(t*.8),15*Math.cos(t*.8),0]})
    },
    {
      "id": "slider-stem",
      "name": "slider stem",
      "kind": "plate",
      "p": {
        "w": 7,
        "h": 65,
        "t": 7,
        "r": 3
      },
      "at": [
        0,
        29,
        4
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
      "motion": (s,t)=>({pos:[0,15*Math.cos(t*.8),0]})
    },
    {
      "id": "guide",
      "name": "guide",
      "kind": "plate",
      "p": {
        "w": 22,
        "h": 14,
        "t": 12,
        "r": 3
      },
      "at": [
        0,
        52,
        -1
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
      "id": "input-shaft",
      "name": "input shaft",
      "kind": "shaft",
      "p": {
        "r": 4,
        "len": 26
      },
      "at": [
        0,
        0,
        -13
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
    "what": "How does a slot remove rod-angle effects?",
    "tour": [
      "drive-disc",
      "yoke",
      "roller-pin"
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
