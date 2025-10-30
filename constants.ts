
// 2024 Federal Poverty Level (FPL) Guidelines for the 48 Contiguous States and D.C.
// Source: https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines/2024-poverty-guidelines
export const FEDERAL_POVERTY_LEVELS: { [key: number]: number } = {
  1: 15060,
  2: 20440,
  3: 25820,
  4: 31200,
  5: 36580,
  6: 41960,
  7: 47340,
  8: 52720,
};

// For households with more than 8 persons, add this amount for each additional person.
export const FPL_ADDITIONAL_PERSON_AMOUNT = 5380;
