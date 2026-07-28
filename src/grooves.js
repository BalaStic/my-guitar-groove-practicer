// Groove template-ek definiálása
// 16 lépéses rács (16th notes) minden ütéshez
// 1 = hang megszólal, 0 = szünet

export const grooves = {
  rock: {
    name: "Rock 4/4",
    stepsPerBar: 16,
    drums: {
      // Kick: 1-es és 9-es (alap négynegyedes)
      kick:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      // Snare: 5-ös és 13-as (backbeat)
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      // Hi-hat: minden nyolcadon (eighth notes)
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    },
    bass: {
      // "root" = alaphang, "5th" = kvint, "-" = szünet/tartás
      pattern: ["root", "-", "-", "-", "root", "-", "5th", "-", 
                "root", "-", "-", "-", "root", "-", "5th", "-"]
    }
  },

  blues: {
    name: "Blues Shuffle",
    stepsPerBar: 12, // Triolás (12/8 érzés)
    drums: {
      // Shuffle feel: swing rhythm
      kick:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      // Shuffle hi-hat pattern
      hihat: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1]
    },
    bass: {
      // Blues walking bass alapok
      pattern: ["root", "-", "-", "3rd", "-", "-", 
                "5th", "-", "-", "6th", "-", "-"]
    }
  },

  funk: {
    name: "Funk 16th",
    stepsPerBar: 16,
    drums: {
      // Syncopated kick (funkos ütemezés)
      kick:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      // Tight snare on 2 and 4
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      // 16th hi-hat with accents
      hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    bass: {
      // Syncopated funk bass
      pattern: ["root", "-", "root", "-", "-", "root", "5th", "-", 
                "root", "-", "-", "-", "oct", "-", "5th", "-"]
    }
  }
};

// Note mapping: string alapján milyen intervallumot játszik
export const intervalMap = {
  "root": 0,      // Alaphang
  "3rd": 3,       // Kis terc (blues)
  "5th": 7,       // Kvint
  "6th": 9,       // Szext
  "oct": 12,      // Oktáv
  "-": null       // Szünet/tartás
};
