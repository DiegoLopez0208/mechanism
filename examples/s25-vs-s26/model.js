// generado por scripts/derive-phones.mjs desde data/phones/phones.json (no editar a mano)
window.PHONES = {
 "units": "mm",
 "frame": "x = ancho (0 = borde izquierdo), y = alto (0 = borde inferior), z = espesor (0 = tapa trasera, t = vidrio frontal)",
 "confidence": {
  "spec": "numero publicado por el fabricante o en la ficha de GSMArena",
  "derived": "calculado con una formula a partir de numeros publicados (la formula esta en derive-phones.mjs y se cruza con otro dato publicado)",
  "estimated": "ninguna ficha lo publica: tamano o disposicion ilustrativos, dibujado punteado"
 },
 "conventions": {
  "opticalFormat": "1 pulgada tipo = 16 mm de diagonal de sensor (convencion de la industria): diagonal = 16 / denominador",
  "equivFocal": "la focal equivalente de 35 mm se refiere a una diagonal de 43,27 mm: focal real = equivalente x diagonal / 43,27",
  "entrancePupil": "diametro de la pupila de entrada = focal real / numero f",
  "battery": "supuestos (no publicados): tension nominal 3,85 V y densidad de energia 700 Wh/L; el resultado es solo una estimacion de volumen"
 },
 "devices": [
  {
   "id": "s25",
   "name": "Galaxy S25 Ultra",
   "model": "SM-S938B",
   "sources": [
    "https://www.gsmarena.com/samsung_galaxy_s25_ultra-13322.php",
    "https://www.gsmarena.com/samsung_galaxy_s25_ultra-pictures-13322.php",
    "https://www.techradar.com/phones/samsung-galaxy-phones/samsung-galaxy-s25-ultra-cameras",
    "https://www.androidcentral.com/phones/galaxy-s25-ultra-ifixit-teardown-samsung-repairability"
   ],
   "body": {
    "w": 77.6,
    "h": 162.8,
    "t": 8.2,
    "weightG": 218,
    "corner": 5.6,
    "cornerConf": "measured",
    "ip": "IP68",
    "sim": "nano + eSIM + eSIM (max 2 at a time, INT)"
   },
   "display": {
    "diagIn": 6.9,
    "areaCm2": 116.9,
    "resolution": [
     1440,
     3120
    ],
    "ppi": 498,
    "type": "Dynamic LTPO AMOLED 2X 120 Hz, HDR10+",
    "peakNits": 2600,
    "glass": "Gorilla Armor 2 + DX anti-reflective",
    "active": {
     "w": 73.4,
     "h": 159.1,
     "method": "diag 6.9 in and the 1440 x 3120 px aspect (published)"
    },
    "check": {
     "areaCm2": 116.9,
     "areaPublished": 116.9,
     "ppi": 498,
     "ppiPublished": 498,
     "pixelPitchUm": 51
    },
    "bezelSide": 2.08,
    "bezelEnd": 1.84
   },
   "build": {
    "front": "Gorilla Armor 2",
    "frame": "titanium (grade 5)",
    "back": "Gorilla Glass Victus 2"
   },
   "soc": {
    "name": "Snapdragon 8 Elite for Galaxy",
    "chip": "SM8750",
    "node": "3 nm",
    "cpu": [
     {
      "n": 2,
      "core": "Oryon V2 Phoenix L",
      "ghz": 4.47
     },
     {
      "n": 6,
      "core": "Oryon V2 Phoenix M",
      "ghz": 3.53
     }
    ],
    "gpu": "Adreno 830 (1.2 GHz)",
    "npu": "not listed on the GSMArena spec page",
    "ram": "12 GB (256/512 GB/1 TB) or 16 GB (1 TB)",
    "storage": "256 GB / 512 GB / 1 TB UFS 4.0",
    "size": [
     13,
     13,
     1.1
    ],
    "sizeConf": "estimated",
    "at": [
     40,
     128
    ]
   },
   "battery": {
    "mAh": 5000,
    "chem": "Li-Ion",
    "charge": "45 W wired (65 % in 30 min), 15 W wireless (Qi2 Ready), 4.5 W reverse",
    "at": [
     5,
     18
    ],
    "energyWh": 19.4,
    "volumeCm3": 26.1,
    "size": [
     58,
     90,
     5
    ],
    "impliedWhPerL": 741,
    "sizeConf": "estimated"
   },
   "board": {
    "size": [
     70,
     40,
     1.1
    ],
    "at": [
     4,
     118
    ]
   },
   "cameras": [
    {
     "id": "main",
     "name": "200 MP main",
     "mp": 200,
     "pitchUm": 0.6,
     "format": 1.3,
     "f": 1.7,
     "equivMm": 24,
     "ois": true,
     "note": "1/1.3\", OIS, multi-directional PDAF",
     "at": [
      15,
      148
     ],
     "sensor": {
      "cross": {
       "diagMm": 12.31,
       "method": "1/1.3\" optical format (16 mm per inch-type)",
       "deltaPct": 0.5
      },
      "diagMm": 12.25,
      "w": 9.8,
      "h": 7.35,
      "method": "200 MP x (0.6 um)^2 at 4:3",
      "byFormatOnly": false
     },
     "focalMm": 6.79,
     "pupilMm": 4,
     "equivUsed": 24
    },
    {
     "id": "uw",
     "name": "50 MP ultrawide",
     "mp": 50,
     "pitchUm": 0.7,
     "format": 2.5,
     "f": 1.9,
     "fovDeg": 120,
     "ois": false,
     "note": "1/2.5\", 120 deg, dual pixel PDAF",
     "at": [
      15,
      132
     ],
     "sensor": {
      "cross": {
       "diagMm": 7.2,
       "method": "1/2.5\" optical format (18 mm per inch-type)",
       "deltaPct": 0.8
      },
      "diagMm": 7.14,
      "w": 5.72,
      "h": 4.29,
      "method": "50 MP x (0.7 um)^2 at 4:3",
      "byFormatOnly": false
     },
     "equivDerived": true,
     "focalMm": 2.06,
     "pupilMm": 1.09,
     "equivUsed": 12.5
    },
    {
     "id": "tele3",
     "name": "10 MP tele 3x",
     "mp": 10,
     "pitchUm": 1.12,
     "format": 3.52,
     "f": 2.4,
     "equivMm": 67,
     "ois": true,
     "note": "1/3.52\", OIS",
     "at": [
      15,
      116
     ],
     "sensor": {
      "cross": {
       "diagMm": 5.11,
       "method": "1/3.52\" optical format (18 mm per inch-type)",
       "deltaPct": 0
      },
      "diagMm": 5.11,
      "w": 4.09,
      "h": 3.07,
      "method": "10 MP x (1.12 um)^2 at 4:3",
      "byFormatOnly": false
     },
     "focalMm": 7.92,
     "pupilMm": 3.3,
     "equivUsed": 67
    },
    {
     "id": "tele5",
     "name": "50 MP periscope 5x",
     "mp": 50,
     "pitchUm": 0.7,
     "format": 2.52,
     "f": 3.4,
     "equivMm": 111,
     "ois": true,
     "note": "1/2.52\", OIS, periscope",
     "at": [
      15,
      100
     ],
     "sensor": {
      "cross": {
       "diagMm": 7.14,
       "method": "1/2.52\" optical format (18 mm per inch-type)",
       "deltaPct": 0
      },
      "diagMm": 7.14,
      "w": 5.72,
      "h": 4.29,
      "method": "50 MP x (0.7 um)^2 at 4:3",
      "byFormatOnly": false
     },
     "focalMm": 18.33,
     "pupilMm": 5.39,
     "equivUsed": 111
    }
   ],
   "selfie": {
    "name": "12 MP selfie",
    "mp": 12,
    "pitchUm": 1.12,
    "format": 3.2,
    "f": 2.2,
    "equivMm": 26,
    "note": "1/3.2\", dual pixel PDAF",
    "at": [
     38.8,
     158
    ],
    "sensor": {
     "cross": {
      "diagMm": 5.63,
      "method": "1/3.2\" optical format (18 mm per inch-type)",
      "deltaPct": 0.4
     },
     "diagMm": 5.6,
     "w": 4.48,
     "h": 3.36,
     "method": "12 MP x (1.12 um)^2 at 4:3",
     "byFormatOnly": false
    },
    "focalMm": 3.36,
    "pupilMm": 1.53,
    "equivUsed": 26
   },
   "extras": [
    "Ultrasonic in-display fingerprint",
    "Stereo speakers",
    "Vapor chamber 40 % larger than the S24 Ultra (Samsung claim, via teardown coverage)",
    "UWB",
    "USB Type-C 3.2, DisplayPort 1.2",
    "Wi-Fi 7 tri-band, Bluetooth 5.4, NFC",
    "Stylus listed (S Pen, no Bluetooth per teardown coverage)"
   ],
   "colors": {
    "back": "#c3c7d4",
    "backLow": "#8f95a6",
    "frame": "#cfd0d4",
    "metal": "#e5e6ea",
    "ring": "#c9cbd1",
    "gradTop": "rgba(214,222,242,0.32)",
    "gradBottom": "rgba(50,60,100,0.42)"
   },
   "design": {
    "front": "slim bezels; flat Ultra display; ultrasonic under-display fingerprint",
    "frontSrc": "GSMArena",
    "frame": {
     "kind": "titanium (grade 5) mid-frame, flat sides",
     "corner": 5.6,
     "cornerNote": "measured on the GSMArena render (silhouette fit: top-left 5.5, top-right 6.0, bottom-right 5.3 mm; the other corners are hidden behind the second phone)",
     "sunken": false,
     "antennaLines": "not described"
    },
    "back": {
     "material": "glass (Gorilla Glass Victus 2)",
     "note": "colors: Titanium Silver Blue, Black, White Silver, Gray, Jade Green, Jet Black, Pink Gold",
     "stripes": false
    },
    "island": {
     "kind": "no island: five separate lens openings, each in its own raised metal ring; three large in a left column, two small beside them, flash between the small ones",
     "lenses": 5,
     "layout": "3 large rings + 2 small, flash in between (measured on the render)",
     "rgbRings": null,
     "raiseMm": 2.9,
     "raiseConf": "measured on the render side view (rings stand about 2.9 mm); PhoneArena lists 9.1 mm with the bump, which would be 0.9 mm: the sources conflict and the render was used",
     "flash": "between the two small openings",
     "laser": "one of the two small openings (leak coverage: laser AF, LED flash and the 3x tele sit in the second column)",
     "ringStyle": "thick individual rings (the 'vinyl record' look Samsung dropped on the S26 Ultra)",
     "whichIs": "Samsung does not say which opening is which camera: leaks put main, ultrawide and periscope in the big column, 3x tele and laser AF in the small one; the order is estimated",
     "src": "GSMArena render; TechRadar / leak coverage"
    },
    "buttons": {
     "right": "volume rocker + power, measured on the side render",
     "left": "none"
    },
    "top": "earpiece (stereo)",
    "bottom": "S Pen slot, USB-C, SIM tray, down-firing speaker",
    "punch": {
     "d": 3.3,
     "conf": "measured"
    },
    "sPen": "S Pen present; size and slot position not published: estimated"
   },
   "displayTech": {
    "family": "Dynamic LTPO AMOLED 2X",
    "backplane": "LTPO (variable refresh)",
    "maker": "Samsung Display",
    "refresh": "LTPO, 120 Hz max",
    "pwm": "not published",
    "hdr": "HDR10+",
    "depth": "n/a",
    "brightness": "2600 nits peak (spec)",
    "flat": true,
    "extra": [
     "DX anti-reflective coating (GSMArena)",
     "no Privacy Display: that layer is new in the S26 Ultra (Samsung)"
    ]
   },
   "layout": {
    "src": "GSMArena product render (back, front and side views), scale from the published height 162.8 mm = 648 px (0.2512 mm/px); front width cross-check +1.3 %",
    "island": {
     "shape": "rings",
     "w": 29.3,
     "h": 51.9,
     "cx": 21.7,
     "top": 6.45,
     "raise": 2.9,
     "rim": "titanium rings",
     "conf": "measured",
     "ringW": 1,
     "barrel": 0
    },
    "lenses": [
     {
      "cam": 1,
      "cx": 14.8,
      "cyTop": 14.2,
      "glassD": 15.4,
      "conf": "measured",
      "id": "50 MP ultrawide",
      "idConf": "estimated: Samsung does not say which opening is which"
     },
     {
      "cam": 0,
      "cx": 14.8,
      "cyTop": 32.4,
      "glassD": 15.5,
      "conf": "measured",
      "id": "200 MP main",
      "idConf": "estimated"
     },
     {
      "cam": 3,
      "cx": 14.8,
      "cyTop": 50.6,
      "glassD": 15.5,
      "conf": "measured",
      "id": "50 MP 5x periscope",
      "idConf": "estimated"
     },
     {
      "cam": 2,
      "cx": 31.6,
      "cyTop": 32.4,
      "glassD": 9.5,
      "conf": "measured",
      "id": "10 MP tele 3x",
      "idConf": "estimated",
      "small": true
     }
    ],
    "extras": [
     {
      "k": "flash",
      "cx": 31.5,
      "cyTop": 23.3,
      "d": 2.1
     },
     {
      "k": "laser",
      "cx": 31.6,
      "cyTop": 14.3,
      "d": 9.5,
      "note": "upper small opening: laser AF (estimated from leak coverage)"
     }
    ],
    "texts": [
     {
      "s": "SAMSUNG",
      "cx": 39.4,
      "cyBottom": 31,
      "size": 4.4,
      "rot": 0,
      "w": 600,
      "alpha": 0.5
     }
    ],
    "buttons": [
     {
      "k": "volume",
      "yTop": 30.9,
      "len": 20.9,
      "edge": "front-right"
     },
     {
      "k": "power",
      "yTop": 61.5,
      "len": 11.3,
      "edge": "front-right"
     }
    ],
    "edges": {
     "bottom": {
      "penFront": 9.4,
      "penHole": 5.8,
      "simFront": 24,
      "usbFront": 41,
      "speakerFront": 62,
      "speakerHoles": 8
     },
     "top": {
      "micCxBack": 60,
      "earpieceFront": 39
     }
    },
    "punch": {
     "d": 3.3,
     "cyTop": 5.7,
     "conf": "measured"
    },
    "interior": {
     "conf": "estimated: no photo of the S25 Ultra interior could be read; layout follows teardown facts (modular camera assemblies, battery with pull tabs, sealed S Pen chamber) and assumes the same arrangement as the S26 Ultra",
     "battery": {
      "cx": 44,
      "cyTop": 97,
      "w": 58,
      "h": 90,
      "t": 5,
      "tConf": "estimated"
     },
     "board": {
      "cx": 40,
      "cyTop": 26,
      "w": 68,
      "h": 44
     },
     "socPad": {
      "cx": 44,
      "cyTop": 24,
      "w": 16,
      "h": 16,
      "pkg": 14
     },
     "vapor": {
      "cx": 40,
      "cyTop": 32,
      "w": 56,
      "h": 54
     },
     "pen": {
      "cxFront": 9.4,
      "len": 104,
      "dia": 5.6
     }
    }
   }
  },
  {
   "id": "s26",
   "name": "Galaxy S26 Ultra",
   "model": "SM-S948B",
   "sources": [
    "https://fo.gsmarena.com/samsung_galaxy_s26_ultra-14320.php",
    "https://www.samsung.com/uk/smartphones/galaxy-s26-ultra/"
   ],
   "body": {
    "w": 78.1,
    "h": 163.6,
    "t": 7.9,
    "weightG": 214,
    "corner": 7,
    "cornerConf": "measured",
    "ip": "IP68",
    "sim": "nano + nano + eSIM (max 2 at a time)"
   },
   "display": {
    "diagIn": 6.9,
    "areaCm2": 115.9,
    "resolution": [
     1440,
     3120
    ],
    "ppi": 500,
    "type": "Dynamic LTPO AMOLED 2X 120 Hz, HDR10+, Privacy Display",
    "peakNits": 2600,
    "glass": "Gorilla Armor 2 + DX anti-reflective",
    "active": {
     "w": 73.4,
     "h": 159.1,
     "method": "diag 6.9 in and the 1440 x 3120 px aspect (published)"
    },
    "check": {
     "areaCm2": 116.9,
     "areaPublished": 115.9,
     "ppi": 498,
     "ppiPublished": 500,
     "pixelPitchUm": 51
    },
    "bezelSide": 2.33,
    "bezelEnd": 2.24
   },
   "build": {
    "front": "Gorilla Armor 2",
    "frame": "aluminum",
    "back": "Gorilla Glass Victus 2"
   },
   "soc": {
    "name": "Snapdragon 8 Elite Gen 5 for Galaxy",
    "node": "3 nm",
    "cpu": [
     {
      "n": 2,
      "core": "Oryon V3 Phoenix L",
      "ghz": 4.74
     },
     {
      "n": 6,
      "core": "Oryon V3 Phoenix M",
      "ghz": 3.62
     }
    ],
    "gpu": "Adreno 840 (1.3 GHz)",
    "npu": "NPU +39% vs S25 Ultra (Samsung)",
    "ram": "12 GB (256/512 GB) or 16 GB (1 TB)",
    "storage": "256 GB / 512 GB / 1 TB UFS 4.X",
    "size": [
     13,
     13,
     1.1
    ],
    "sizeConf": "estimated",
    "at": [
     40,
     128
    ]
   },
   "battery": {
    "mAh": 5000,
    "chem": "Li-Ion",
    "charge": "60 W wired, 25 W wireless (Qi2.2), 4.5 W reverse",
    "at": [
     5,
     18
    ],
    "energyWh": 19.4,
    "volumeCm3": 26.1,
    "size": [
     58,
     90,
     5
    ],
    "impliedWhPerL": 741,
    "sizeConf": "estimated"
   },
   "board": {
    "size": [
     70,
     40,
     1.1
    ],
    "at": [
     4,
     118
    ]
   },
   "cameras": [
    {
     "id": "main",
     "name": "200 MP main",
     "mp": 200,
     "pitchUm": 0.6,
     "format": 1.3,
     "f": 1.4,
     "equivMm": 23,
     "ois": true,
     "note": "1/1.3\", OIS, multi-directional PDAF",
     "at": [
      15,
      148
     ],
     "sensor": {
      "cross": {
       "diagMm": 12.31,
       "method": "1/1.3\" optical format (16 mm per inch-type)",
       "deltaPct": 0.5
      },
      "diagMm": 12.25,
      "w": 9.8,
      "h": 7.35,
      "method": "200 MP x (0.6 um)^2 at 4:3",
      "byFormatOnly": false
     },
     "focalMm": 6.51,
     "pupilMm": 4.65,
     "equivUsed": 23
    },
    {
     "id": "uw",
     "name": "50 MP ultrawide",
     "mp": 50,
     "pitchUm": 0.7,
     "format": 2.5,
     "f": 1.9,
     "fovDeg": 120,
     "ois": false,
     "note": "1/2.5\", 120 deg, dual pixel PDAF",
     "at": [
      15,
      132
     ],
     "sensor": {
      "cross": {
       "diagMm": 7.2,
       "method": "1/2.5\" optical format (18 mm per inch-type)",
       "deltaPct": 0.8
      },
      "diagMm": 7.14,
      "w": 5.72,
      "h": 4.29,
      "method": "50 MP x (0.7 um)^2 at 4:3",
      "byFormatOnly": false
     },
     "equivDerived": true,
     "focalMm": 2.06,
     "pupilMm": 1.09,
     "equivUsed": 12.5
    },
    {
     "id": "tele3",
     "name": "10 MP tele 3x",
     "mp": 10,
     "pitchUm": 1,
     "format": 3.94,
     "f": 2.4,
     "equivMm": 67,
     "ois": true,
     "note": "1/3.94\", OIS",
     "at": [
      15,
      116
     ],
     "sensor": {
      "cross": {
       "diagMm": 4.57,
       "method": "1/3.94\" optical format (18 mm per inch-type)",
       "deltaPct": 0.1
      },
      "diagMm": 4.56,
      "w": 3.65,
      "h": 2.74,
      "method": "10 MP x (1 um)^2 at 4:3",
      "byFormatOnly": false
     },
     "focalMm": 7.07,
     "pupilMm": 2.94,
     "equivUsed": 67
    },
    {
     "id": "tele5",
     "name": "50 MP periscope 5x",
     "mp": 50,
     "pitchUm": 0.7,
     "format": 2.52,
     "f": 2.9,
     "equivMm": 111,
     "ois": true,
     "note": "1/2.52\", OIS, periscope",
     "at": [
      15,
      100
     ],
     "sensor": {
      "cross": {
       "diagMm": 7.14,
       "method": "1/2.52\" optical format (18 mm per inch-type)",
       "deltaPct": 0
      },
      "diagMm": 7.14,
      "w": 5.72,
      "h": 4.29,
      "method": "50 MP x (0.7 um)^2 at 4:3",
      "byFormatOnly": false
     },
     "focalMm": 18.33,
     "pupilMm": 6.32,
     "equivUsed": 111
    }
   ],
   "selfie": {
    "name": "12 MP selfie",
    "mp": 12,
    "format": 3.2,
    "f": 2.2,
    "equivMm": 23,
    "note": "1/3.2\", dual pixel PDAF",
    "at": [
     39.05,
     158
    ],
    "sensor": {
     "diagMm": 5.63,
     "w": 4.5,
     "h": 3.38,
     "method": "1/3.2\" optical format (18 mm per inch-type)",
     "byFormatOnly": true
    },
    "focalMm": 2.99,
    "pupilMm": 1.36,
    "equivUsed": 23
   },
   "extras": [
    "Ultrasonic in-display fingerprint",
    "Stereo speakers",
    "Largest vapor chamber yet (size not published)",
    "UWB",
    "USB Type-C 3.2, DisplayPort 1.2",
    "Wi-Fi 7 tri-band, Bluetooth 6.0, NFC",
    "Stylus listed (S Pen size and slot not published)"
   ],
   "colors": {
    "back": "#6d6bb3",
    "backLow": "#44447f",
    "frame": "#8a88cc",
    "metal": "#c8c6e0"
   },
   "design": {
    "front": "slim bezels; flat Ultra display; ultrasonic under-display fingerprint; Privacy Display",
    "frontSrc": "Stuff, GSMArena",
    "frame": {
     "kind": "aluminium (Armor Aluminum) mid-frame, flat sides",
     "corner": 7,
     "cornerNote": "measured from the product render (silhouette fit, 5.5-8.3 mm)",
     "sunken": false,
     "antennaLines": "not described"
    },
    "back": {
     "material": "matte, fingerprint-resistant glass (Gorilla Glass Victus 2)",
     "note": "colors: Black, White, Sky Blue, Cobalt Violet, Pink Gold, Silver Shadow",
     "stripes": false
    },
    "island": {
     "kind": "unified raised vertical pill holding three of the cameras; the fourth camera, the flash and the laser AF sit apart (Stuff, Samsung community, leaks)",
     "lenses": 3,
     "layout": "pill with three lenses; fourth lens below; flash above the fourth lens (leaks)",
     "rgbRings": null,
     "raiseMm": 1.6,
     "raiseConf": "estimated; the bump sticks out more than the S25 Ultra",
     "flash": "separate, above the fourth camera (leaks)",
     "laser": "separate laser AF module",
     "ringStyle": "thin bezels: Samsung dropped the vinyl-record lens surrounds",
     "whichThree": "the sources do not say which three lenses are in the pill: estimated",
     "src": "Stuff review; Samsung community unboxing; GSMArena leak"
    },
    "buttons": {
     "right": "volume rocker + power (not described in the sources: estimated)",
     "left": "none"
    },
    "top": "earpiece tweeter (stereo)",
    "bottom": "S Pen slot, USB-C, SIM tray, down-firing speaker (S Pen pops out of a slot in the bottom edge: Stuff)",
    "punch": {
     "d": 3.2,
     "conf": "estimated"
    },
    "sPen": "S Pen present; size and slot position not published: estimated"
   },
   "displayTech": {
    "family": "Dynamic LTPO AMOLED 2X",
    "backplane": "LTPO (variable refresh)",
    "maker": "Samsung Display",
    "refresh": "LTPO, 120 Hz max",
    "pwm": "not published",
    "hdr": "HDR10+",
    "depth": "n/a",
    "brightness": "2600 nits peak (spec)",
    "flat": true,
    "extra": [
     "Privacy Display: Flex Magic Pixel, wide- and narrow-angle subpixels plus a multilayer black matrix steer light toward the user (Samsung support, SamMobile)",
     "DX anti-reflective coating (GSMArena)",
     "resolution drops while Privacy Display is on (Stuff)"
    ]
   },
   "layout": {
    "src": "GSMArena product render + review photos (S26 Ultra vs S25 Ultra), Android Central teardown hero photo",
    "island": {
     "shape": "pill",
     "w": 20,
     "h": 56.5,
     "cx": 16,
     "top": 4.8,
     "raise": 2,
     "rim": "anodised lavender",
     "conf": "measured",
     "barrel": 1.7,
     "barrelNote": "lens barrels stand out ~1.7 mm beyond the pill (side view)"
    },
    "lenses": [
     {
      "cam": 0,
      "cx": 16.4,
      "cyTop": 15.4,
      "glassD": 16.6,
      "conf": "measured",
      "id": "200 MP main",
      "idConf": "estimated: Samsung does not say which opening is which"
     },
     {
      "cam": 2,
      "cx": 16.1,
      "cyTop": 33.1,
      "glassD": 16.1,
      "conf": "measured",
      "id": "10 MP tele 3x",
      "idConf": "estimated"
     },
     {
      "cam": 3,
      "cx": 15.8,
      "cyTop": 51.5,
      "glassD": 15.6,
      "conf": "measured",
      "id": "50 MP 5x (ALoP)",
      "idConf": "estimated"
     },
     {
      "cam": 1,
      "cx": 33.6,
      "cyTop": 15.1,
      "glassD": 8.4,
      "conf": "measured",
      "id": "50 MP ultrawide",
      "idConf": "estimated",
      "small": true
     }
    ],
    "extras": [
     {
      "k": "flash",
      "cx": 33.7,
      "cyTop": 24.1,
      "d": 3.6
     },
     {
      "k": "laser",
      "cx": 33.6,
      "cyTop": 33.1,
      "d": 8.3,
      "note": "lower small opening: laser AF (Stuff: the fifth opening is a laser AF module)"
     }
    ],
    "texts": [
     {
      "s": "SAMSUNG",
      "cx": 39,
      "cyBottom": 32,
      "size": 4.4,
      "rot": 0,
      "w": 600,
      "alpha": 0.5
     }
    ],
    "buttons": [
     {
      "k": "volume",
      "yTop": 35,
      "len": 25,
      "edge": "front-right"
     },
     {
      "k": "power",
      "yTop": 63.4,
      "len": 13.2,
      "edge": "front-right"
     }
    ],
    "edges": {
     "bottom": {
      "penFront": 9.4,
      "penHole": 5.8,
      "simFront": 24,
      "usbFront": 41,
      "speakerFront": 62,
      "speakerHoles": 8
     },
     "top": {
      "micCxBack": 60,
      "earpieceFront": 39
     }
    },
    "punch": {
     "d": 3.6,
     "cyTop": 4.2,
     "conf": "measured"
    },
    "interior": {
     "conf": "estimated: no photo of the S26 Ultra interior was available; layout follows the teardown facts (vapor chamber wider at the top, sealed S Pen chamber, two battery connectors)",
     "battery": {
      "cx": 44,
      "cyTop": 97,
      "w": 58,
      "h": 90,
      "t": 5,
      "tConf": "estimated"
     },
     "board": {
      "cx": 40,
      "cyTop": 26,
      "w": 68,
      "h": 44
     },
     "socPad": {
      "cx": 44,
      "cyTop": 24,
      "w": 16,
      "h": 16,
      "pkg": 14
     },
     "vapor": {
      "cx": 40,
      "cyTop": 32,
      "w": 62,
      "h": 60
     },
     "pen": {
      "cxFront": 9.4,
      "len": 104,
      "dia": 5.6
     }
    }
   }
  }
 ],
 "designNote": "design = descripcion fisica leida en resenas (GSMArena design review, Stuff, Samsung); donde las fuentes se contradicen se anota. Todo lo que no se publica con medidas queda ESTIMADO.",
 "measuredNote": "layout = medido sobre fotos oficiales (error +/- 1-1.5 mm): GSMArena (render trasero/frontal y fotos de resena), fotos de repuestos oficiales de Xiaomi (spare-parts.mi.com: tapa trasera 6.1 px/mm, modulo de pantalla con marco 6.46 px/mm). Coordenadas VISTAS DESDE ATRAS: x desde el borde izquierdo de la tapa, y desde el borde superior."
};
