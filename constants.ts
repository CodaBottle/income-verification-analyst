
// 2024 Federal Poverty Level (FPL) Guidelines for the 48 Contiguous States and D.C.
// These are 100% FPL values (200% FPL is used for eligibility determination)
export const FEDERAL_POVERTY_LEVELS: { [key: number]: number } = {
  1: 15650,
  2: 21150,
  3: 26650,
  4: 32150,
  5: 37650,
  6: 43150,
  7: 48650,
  8: 54150,
};

// For households with more than 8 persons, add this amount for each additional person.
export const FPL_ADDITIONAL_PERSON_AMOUNT = 5500;
