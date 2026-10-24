// Original educational assembly. All physical dimensions are authored estimates.
window.SPEC = {
  "id": "studio-jaw-coupling",
  "fig": "Studio 18",
  "kicker": "ORIGINAL 3D DESIGN STUDY",
  "title": "Jaw coupling / compliant interface",
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
      "id": "shaft-left",
      "name": "shaft left",
      "kind": "shaft",
      "p": {
        "r": 6,
        "len": 43
      },
      "at": [
        0,
        0,
        -35
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
      "id": "shaft-right",
      "name": "shaft right",
      "kind": "shaft",
      "p": {
        "r": 6,
        "len": 43
      },
      "at": [
        0,
        0,
        35
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
      "spin": 0.8
    },
    {
      "id": "hub-left",
      "name": "hub left",
      "kind": "disc",
      "p": {
        "r": 23,
        "w": 9,
        "bore": 6.1
      },
      "at": [
        0,
        0,
        -13
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -28
      ],
      "spin": 0.8
    },
    {
      "id": "hub-right",
      "name": "hub right",
      "kind": "disc",
      "p": {
        "r": 23,
        "w": 9,
        "bore": 6.1
      },
      "at": [
        0,
        0,
        13
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        28
      ],
      "spin": 0.8
    },
    {
      "id": "elastomer-spider",
      "name": "elastomer spider",
      "kind": "profile",
      "p": {
        "len": 12,
        "pts": [
          [
            22,
            -6
          ],
          [
            11,
            -6
          ],
          [
            11,
            6
          ],
          [
            22,
            6
          ],
          [
            16.196152422706632,
            16.05255888325765
          ],
          [
            10.696152422706632,
            6.526279441628824
          ],
          [
            0.30384757729336886,
            12.526279441628827
          ],
          [
            5.80384757729337,
            22.05255888325765
          ],
          [
            -5.803847577293363,
            22.052558883257653
          ],
          [
            -0.3038475772933653,
            12.526279441628825
          ],
          [
            -10.696152422706628,
            6.526279441628828
          ],
          [
            -16.196152422706625,
            16.052558883257653
          ],
          [
            -22,
            6.000000000000003
          ],
          [
            -11,
            6.000000000000002
          ],
          [
            -11,
            -5.999999999999998
          ],
          [
            -22,
            -5.999999999999997
          ],
          [
            -16.196152422706643,
            -16.052558883257642
          ],
          [
            -10.696152422706636,
            -6.52627944162882
          ],
          [
            -0.3038475772933742,
            -12.526279441628827
          ],
          [
            -5.8038475772933795,
            -22.05255888325765
          ],
          [
            5.80384757729337,
            -22.05255888325765
          ],
          [
            0.30384757729336886,
            -12.526279441628827
          ],
          [
            10.696152422706632,
            -6.526279441628824
          ],
          [
            16.196152422706632,
            -16.05255888325765
          ]
        ],
        "holes": [
          [
            [
              7,
              0
            ],
            [
              6.865496962822613,
              -1.3656322541128978
            ],
            [
              6.467156727579007,
              -2.6787840265556286
            ],
            [
              5.820287286117817,
              -3.8889916311372152
            ],
            [
              4.949747468305833,
              -4.949747468305832
            ],
            [
              3.888991631137216,
              -5.820287286117817
            ],
            [
              2.678784026555629,
              -6.467156727579007
            ],
            [
              1.3656322541128982,
              -6.865496962822613
            ],
            [
              4.286263797015736e-16,
              -7
            ],
            [
              -1.3656322541128973,
              -6.865496962822613
            ],
            [
              -2.678784026555628,
              -6.467156727579007
            ],
            [
              -3.8889916311372135,
              -5.820287286117818
            ],
            [
              -4.949747468305832,
              -4.949747468305833
            ],
            [
              -5.820287286117818,
              -3.8889916311372152
            ],
            [
              -6.467156727579007,
              -2.678784026555629
            ],
            [
              -6.865496962822613,
              -1.3656322541129002
            ],
            [
              -7,
              -8.572527594031472e-16
            ],
            [
              -6.865496962822613,
              1.3656322541128985
            ],
            [
              -6.467156727579008,
              2.6787840265556278
            ],
            [
              -5.820287286117818,
              3.8889916311372135
            ],
            [
              -4.949747468305834,
              4.949747468305832
            ],
            [
              -3.8889916311372152,
              5.820287286117817
            ],
            [
              -2.678784026555632,
              6.467156727579006
            ],
            [
              -1.3656322541129007,
              6.865496962822612
            ],
            [
              -1.2858791391047208e-15,
              7
            ],
            [
              1.365632254112898,
              6.865496962822613
            ],
            [
              2.67878402655563,
              6.467156727579006
            ],
            [
              3.888991631137213,
              5.820287286117818
            ],
            [
              4.949747468305832,
              4.949747468305834
            ],
            [
              5.820287286117817,
              3.8889916311372152
            ],
            [
              6.467156727579006,
              2.6787840265556326
            ],
            [
              6.865496962822612,
              1.3656322541129011
            ]
          ]
        ]
      },
      "at": [
        0,
        0,
        0
      ],
      "mat": "pom-red",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        22,
        0
      ],
      "spin": 0.8
    },
    {
      "id": "jaw-0-L",
      "name": "jaw 0 L",
      "kind": "block",
      "p": {
        "w": 8,
        "d": 10,
        "h": 12
      },
      "at": [
        16,
        0,
        -4
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -28
      ],
      "motion": function anonymous(s,t
) {
const a=0,r=16;return {pos:[r*(Math.cos(a+.8*t)-Math.cos(a)),r*(Math.sin(a+.8*t)-Math.sin(a)),0],rot:[0,0,a+.8*t]};
}
    },
    {
      "id": "jaw-0-R",
      "name": "jaw 0 R",
      "kind": "block",
      "p": {
        "w": 8,
        "d": 10,
        "h": 12
      },
      "at": [
        8.000000000000002,
        13.856406460551018,
        4
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        28
      ],
      "motion": function anonymous(s,t
) {
const a=1.0471975511965976,r=16;return {pos:[r*(Math.cos(a+.8*t)-Math.cos(a)),r*(Math.sin(a+.8*t)-Math.sin(a)),0],rot:[0,0,a+.8*t]};
}
    },
    {
      "id": "jaw-1-L",
      "name": "jaw 1 L",
      "kind": "block",
      "p": {
        "w": 8,
        "d": 10,
        "h": 12
      },
      "at": [
        -7.9999999999999964,
        13.85640646055102,
        -4
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -28
      ],
      "motion": function anonymous(s,t
) {
const a=2.0943951023931953,r=16;return {pos:[r*(Math.cos(a+.8*t)-Math.cos(a)),r*(Math.sin(a+.8*t)-Math.sin(a)),0],rot:[0,0,a+.8*t]};
}
    },
    {
      "id": "jaw-1-R",
      "name": "jaw 1 R",
      "kind": "block",
      "p": {
        "w": 8,
        "d": 10,
        "h": 12
      },
      "at": [
        -16,
        1.959434878635765e-15,
        4
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        28
      ],
      "motion": function anonymous(s,t
) {
const a=3.141592653589793,r=16;return {pos:[r*(Math.cos(a+.8*t)-Math.cos(a)),r*(Math.sin(a+.8*t)-Math.sin(a)),0],rot:[0,0,a+.8*t]};
}
    },
    {
      "id": "jaw-2-L",
      "name": "jaw 2 L",
      "kind": "block",
      "p": {
        "w": 8,
        "d": 10,
        "h": 12
      },
      "at": [
        -8.000000000000007,
        -13.856406460551016,
        -4
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        -28
      ],
      "motion": function anonymous(s,t
) {
const a=4.1887902047863905,r=16;return {pos:[r*(Math.cos(a+.8*t)-Math.cos(a)),r*(Math.sin(a+.8*t)-Math.sin(a)),0],rot:[0,0,a+.8*t]};
}
    },
    {
      "id": "jaw-2-R",
      "name": "jaw 2 R",
      "kind": "block",
      "p": {
        "w": 8,
        "d": 10,
        "h": 12
      },
      "at": [
        7.999999999999989,
        -13.856406460551025,
        4
      ],
      "mat": "aluminum",
      "conf": "estimated",
      "claims": [
        "design"
      ],
      "explode": [
        0,
        0,
        28
      ],
      "motion": function anonymous(s,t
) {
const a=5.235987755982988,r=16;return {pos:[r*(Math.cos(a+.8*t)-Math.cos(a)),r*(Math.sin(a+.8*t)-Math.sin(a)),0],rot:[0,0,a+.8*t]};
}
    }
  ],
  "stage": {
    "floorY": -65
  },
  "director": {
    "what": "How do two shafts share a flexible element?",
    "tour": [
      "shaft-left",
      "shaft-right",
      "hub-left"
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
