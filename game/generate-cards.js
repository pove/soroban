//
// ============================================================
//  SETTINGS (with defaults)
//  These values can be edited by UI controls or replaced when
//  calling generateCards(customSettings)
// ============================================================
//

const DEFAULT_SETTINGS = {
  numPerCombination: 10,
  maxGameValue: 9999999,

  cardTypes: ["Añade-Quita", "Representar", "Sumar", "Restar"],

  difficulties: [
    { key: "muy fácil",  borderColor: "#2bcdee" },
    { key: "fácil",  borderColor: "#10b40e" },
    { key: "medio",  borderColor: "#feb22f" },
    { key: "difícil", borderColor: "#ff2424" }
  ],

  ranges: {
    "Añade-Quita": {
      "muy fácil":   [1, 5],
      "fácil":   [1, 20],
      "medio":   [50, 200],
      "difícil": [200, 999]
    },
    "Representar": {
      "muy fácil":   [1, 10],
      "fácil":   [1, 99],
      "medio":   [100, 999],
      "difícil": [10000, 9999999]
    },
    "Sumar": {
      "muy fácil":   [1, 5],
      "fácil":   [1, 20],
      "medio":   [10, 99],
      "difícil": [100, 999]
    },
    "Restar": {
      "muy fácil":   [1, 5],
      "fácil":   [1, 20],
      "medio":   [10, 99],
      "difícil": [100, 999]
    }
  },

  baseTemplates: {
    "Añade-Quita": {
      width: 90, height: 65,
      borderRadius: 8, borderThickness: 8,
      backgroundColor: "#ffffff",
      frontTopText: "Añade", frontTopColor: "#0a0fa3", frontTopSize: 30,
      frontBottomColor: "#000000", frontBottomSize: 80,
      frontShowSVG: false, frontSVGNumber: 0, frontSVGSize: 0,
      rearTopText: "Quita", rearTopColor: "#0a0fa3", rearTopSize: 30,
      rearBottomColor: "#000000", rearBottomSize: 80,
      rearShowSVG: false, rearSVGNumber: 0, rearSVGSize: 0
    },
    "Representar": {
      width: 90, height: 65,
      borderRadius: 8, borderThickness: 8,
      backgroundColor: "#ffffff",
      frontTopText: "Interpreta", frontTopColor: "#0a0fa3", frontTopSize: 30,
      frontBottomText: "Bottom Text", frontBottomColor: "#000000", frontBottomSize: 0,
      frontShowSVG: true, frontSVGSize: 130,
      rearTopText: "Representa", rearTopColor: "#0a0fa3", rearTopSize: 30,
      rearBottomColor: "#000000", rearBottomSize: 60,
      rearShowSVG: false, rearSVGNumber: 0, rearSVGSize: 0
    },
    "Sumar": {
      width: 90, height: 65,
      borderRadius: 8, borderThickness: 8,
      backgroundColor: "#ffffff",
      frontTopText: "Sumar", frontTopColor: "#0a0fa3", frontTopSize: 30,
      frontBottomColor: "#000000", frontBottomSize: 65,
      frontShowSVG: false, frontSVGNumber: 0, frontSVGSize: 0,
      rearTopText: "Sumar - Respuesta", rearTopColor: "#666666", rearTopSize: 20,
      rearBottomColor: "#000000", rearBottomSize: 30,
      rearShowSVG: true, rearSVGSize: 130
    },
    "Restar": {
      width: 90, height: 65,
      borderRadius: 8, borderThickness: 8,
      backgroundColor: "#ffffff",
      frontTopText: "Restar", frontTopColor: "#0a0fa3", frontTopSize: 30,
      frontBottomColor: "#000000", frontBottomSize: 65,
      frontShowSVG: false, frontSVGNumber: 0, frontSVGSize: 0,
      rearTopText: "Restar - Respuesta", rearTopColor: "#666666", rearTopSize: 20,
      rearBottomColor: "#000000", rearBottomSize: 30,
      rearShowSVG: true, rearSVGSize: 130
    }
  }
};


//
// ============================================================
//  UTILITY FUNCTIONS
// ============================================================
//

function rndInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function uniqueInts(lo, hi, n) {
  const total = hi - lo + 1;
  const target = Math.min(n, total);

  const set = new Set();
  let attempts = 0;
  const maxAttempts = total * 3;

  while (set.size < target && attempts < maxAttempts) {
    set.add(rndInt(lo, hi));
    attempts++;
  }

  return [...set];
}

function downloadJSON(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

//
// Load a settings JSON file selected via <input type="file">
//
function loadSettings(event, callback) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      callback(obj);
    } catch (e) {
      alert("Invalid settings file");
    }
  };
  reader.readAsText(file);
}

//
// ============================================================
//  MAIN: generateCards(settings)
//  - If settings is missing, uses DEFAULT_SETTINGS
// ============================================================
//

function generateCards(customSettings) {
  const S = structuredClone(customSettings || DEFAULT_SETTINGS);

  const cards = [];

  for (const type of S.cardTypes) {
    for (const diff of S.difficulties) {
      const difficultyKey = diff.key;
      const borderColor = diff.borderColor;

      const [lo, hi] = S.ranges[type][difficultyKey];
      const base = S.baseTemplates[type];

      //
      // AÑADIR / QUITAR
      //
      if (type === "Añade-Quita") {
        const nums = uniqueInts(lo, hi, S.numPerCombination);
        nums.forEach(n => {
          cards.push({
            ...base,
            cardType: `${type} ${difficultyKey}`,
            borderColor,
            frontBottomText: `+ ${n}`,
            rearBottomText: `- ${n}`
          });
        });

      //
      // REPRESENTAR
      //
      } else if (type === "Representar") {
        const nums = uniqueInts(lo, hi, S.numPerCombination);
        nums.forEach(n => {
          cards.push({
            ...base,
            cardType: `${type} ${difficultyKey}`,
            borderColor,
            frontSVGNumber: n,
            rearBottomText: String(n)
          });
        });

      //
      // SUMAR
      //
      } else if (type === "Sumar") {
        let created = 0;
        const used = new Set();

        const maxAttempts = (hi - lo + 1) ** 2 * 3; 
        let attempts = 0;

        while (created < S.numPerCombination && attempts < maxAttempts) {
            attempts++;

            const a = rndInt(lo, hi);
            const b = rndInt(lo, hi);
            const key = `${a}|${b}`;

            if (used.has(key)) continue;
            const res = a + b;
            if (res > S.maxGameValue) continue;

            used.add(key);
            created++;

            cards.push({
                ...base,
                cardType: `${type} ${difficultyKey}`,
                borderColor,
                frontBottomText: `${a} + ${b}`,
                rearBottomText: String(res),
                rearSVGNumber: res
            });
        }


      //
      // RESTAR
      //
      } else if (type === "Restar") {
        let created = 0;
        const used = new Set();
        const maxAttempts = (hi - lo + 1) ** 2 * 3;
        let attempts = 0;

        while (created < S.numPerCombination && attempts < maxAttempts) {
          attempts++;
          let a = rndInt(lo, hi);
          let b = rndInt(lo, hi);
          if (b > a) [a, b] = [b, a];

          const key = `${a}|${b}`;
          if (used.has(key)) continue;

          const res = a - b;
          if (res > S.maxGameValue) continue;

          used.add(key);
          created++;

          cards.push({
            ...base,
            cardType: `${type} ${difficultyKey}`,
            borderColor,
            frontBottomText: `${a} - ${b}`,
            rearBottomText: String(res),
            rearSVGNumber: res
          });
        }
      }
    }
  }

  return {
    version: 1,
    cards,
    savedDate: new Date().toISOString()
  };
}

//
// ============================================================
//  Public helper: Generate + automatically download JSON
// ============================================================
//
function generateAndDownload(customSettings) {
  const json = generateCards(customSettings);
  downloadJSON("cartas_generadas.json", json);
}

//
// ============================================================
//  Download current settings
// ============================================================
//
function downloadSettings(settingsObj = DEFAULT_SETTINGS) {
  downloadJSON("card_settings.json", settingsObj);
}
