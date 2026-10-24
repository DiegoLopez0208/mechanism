// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-eccentric-cam",
  "fig": "Studio 14",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Eccentric cam / roller follower",
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
      "id": "eccentric-cam",
      "name": "eccentric cam",
      "kind": "disc",
      "p": {
        "r": 20,
        "w": 8,
        "holes": [
          [
            0,
            -5,
            3.1
          ]
        ]
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
        0,
        0
      ],
      "motion": (s,t)=>({pos:[5*Math.sin(t*.8),5*Math.cos(t*.8),0],rot:[0,0,-t*.8]})
    },
    {
      "id": "cam-shaft",
      "name": "cam shaft",
      "kind": "shaft",
      "p": {
        "r": 3,
        "len": 32
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
      ]
    },
    {
      "id": "roller",
      "name": "roller",
      "kind": "disc",
      "p": {
        "r": 5,
        "w": 7,
        "bore": 3
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
      ],
      "motion": (s,t)=>({pos:[0,5*Math.cos(.8*t)+Math.sqrt(25**2-(5*Math.sin(.8*t))**2),0]})
    },
    {
      "id": "follower",
      "name": "follower",
      "kind": "plate",
      "p": {
        "w": 6,
        "h": 32,
        "t": 6,
        "r": 3
      },
      "at": [
        0,
        16,
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
      "motion": (s,t)=>({pos:[0,5*Math.cos(.8*t)+Math.sqrt(25**2-(5*Math.sin(.8*t))**2),0]})
    },
    {
      "id": "return-spring",
      "name": "return spring",
      "kind": "spring",
      "p": {
        "r": 5,
        "wire": 0.8,
        "turns": 7,
        "len": 22
      },
      "at": [
        0,
        50,
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
      "rot": [
        90,
        0,
        0
      ]
    },
    {
      "id": "follower-guide",
      "name": "follower guide",
      "kind": "plate",
      "p": {
        "w": 20,
        "h": 7,
        "t": 12,
        "r": 3
      },
      "at": [
        0,
        45,
        -4
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
      "id": "base",
      "name": "base",
      "kind": "plate",
      "p": {
        "w": 67,
        "h": 95,
        "t": 4,
        "r": 3
      },
      "at": [
        0,
        23,
        -18
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
    }
  ],
  "stage": {
    "floorY": -65
  },
  "director": {
    "what": "How does an offset circular cam create lift?",
    "tour": [
      "eccentric-cam",
      "cam-shaft",
      "roller"
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
