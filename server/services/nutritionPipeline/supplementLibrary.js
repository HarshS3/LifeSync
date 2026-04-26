const SUPPLEMENT_LIBRARY = {
  'Whey Protein (1 Scoop)': {
    calories: 120,
    protein: 25,
    carbs: 3,
    fat: 1.5,
    calcium: 150,
  },
  'Creatine Monohydrate (5g)': {
    protein: 0, // Creatine is non-protein nitrogen, but often counted as such by some, we keep it 0 for cal math.
  },
  'Multivitamin (Standard)': {
    vitaminA: 900, // ug
    vitaminC: 90, // mg
    vitaminD: 20, // ug (800IU)
    vitaminE: 15, // mg
    vitaminB12: 2.4, // ug
    folate: 400, // ug
    iron: 18, // mg
    zinc: 11, // mg
    selenium: 55, // ug
    magnesium: 100, // mg
  },
  'Omega-3 Fish Oil (1000mg)': {
    fat: 1,
    omega3: 300, // mg (EPA+DHA)
  },
  'Vitamin D3 (2000IU)': {
    vitaminD: 50, // ug
  },
  'Magnesium Glycinate (200mg)': {
    magnesium: 200,
  },
  'Zinc Gluconate (30mg)': {
    zinc: 30,
  },
  'B-Complex (High Dose)': {
    vitaminB1: 50,
    vitaminB2: 50,
    vitaminB3: 50,
    vitaminB6: 50,
    vitaminB12: 100,
    folate: 400,
  }
};

module.exports = { SUPPLEMENT_LIBRARY };
