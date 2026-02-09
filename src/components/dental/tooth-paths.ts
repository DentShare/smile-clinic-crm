// Anatomical tooth SVG paths with separate crown and root sections
// Based on FDI numbering system

export interface ToothPaths {
  crown: string;
  root: string;
  viewBox: string;
}

// Upper teeth - roots point UP
const upperMolar: ToothPaths = {
  crown: `M4,28 L4,20 Q4,16 8,14 L8,14 Q10,14 12,16 L12,20 
          Q14,18 16,18 Q18,18 20,20 L20,16 Q22,14 24,14 
          Q28,16 28,20 L28,28 Q28,32 24,32 L8,32 Q4,32 4,28 Z`,
  root: `M8,14 L6,6 Q5,2 7,2 L9,2 Q11,2 10,6 L8,14 Z
         M16,18 L16,8 Q16,4 18,4 Q20,4 20,8 L20,18 Z
         M24,14 L26,6 Q27,2 25,2 L23,2 Q21,2 22,6 L24,14 Z`,
  viewBox: '0 0 32 34'
};

const upperPremolar: ToothPaths = {
  crown: `M6,28 L6,18 Q6,14 10,14 L10,14 Q12,14 14,16 
          Q18,14 22,14 Q26,14 26,18 L26,28 Q26,32 22,32 L10,32 Q6,32 6,28 Z`,
  root: `M12,14 L10,6 Q9,2 12,2 Q15,2 14,6 L12,14 Z
         M20,14 L22,6 Q23,2 20,2 Q17,2 18,6 L20,14 Z`,
  viewBox: '0 0 32 34'
};

const upperCanine: ToothPaths = {
  crown: `M8,28 L8,18 Q8,12 16,12 Q24,12 24,18 L24,28 Q24,32 20,32 L12,32 Q8,32 8,28 Z`,
  root: `M16,12 L16,4 Q16,1 16,1 Q16,1 16,4 L16,12 Z
         M14,12 L12,4 Q11,1 14,1 L18,1 Q21,1 20,4 L18,12 Z`,
  viewBox: '0 0 32 34'
};

const upperIncisorCentral: ToothPaths = {
  crown: `M9,28 L9,16 Q9,12 16,12 Q23,12 23,16 L23,28 Q23,32 19,32 L13,32 Q9,32 9,28 Z`,
  root: `M16,12 L14,5 Q13,2 16,2 Q19,2 18,5 L16,12 Z`,
  viewBox: '0 0 32 34'
};

const upperIncisorLateral: ToothPaths = {
  crown: `M10,28 L10,16 Q10,12 16,12 Q22,12 22,16 L22,28 Q22,32 18,32 L14,32 Q10,32 10,28 Z`,
  root: `M16,12 L14,5 Q13,2 16,2 Q19,2 18,5 L16,12 Z`,
  viewBox: '0 0 32 34'
};

// Lower teeth - roots point DOWN
const lowerMolar: ToothPaths = {
  crown: `M4,4 L4,12 Q4,16 8,18 L8,18 Q10,18 12,16 L12,12 
          Q14,14 16,14 Q18,14 20,12 L20,16 Q22,18 24,18 
          Q28,16 28,12 L28,4 Q28,0 24,0 L8,0 Q4,0 4,4 Z`,
  root: `M8,18 L6,26 Q5,30 7,30 L9,30 Q11,30 10,26 L8,18 Z
         M24,18 L26,26 Q27,30 25,30 L23,30 Q21,30 22,26 L24,18 Z`,
  viewBox: '0 0 32 32'
};

const lowerPremolar: ToothPaths = {
  crown: `M6,4 L6,14 Q6,18 10,18 L10,18 Q14,18 16,16 
          Q18,18 22,18 Q26,18 26,14 L26,4 Q26,0 22,0 L10,0 Q6,0 6,4 Z`,
  root: `M16,18 L16,28 Q16,32 16,32 Q16,32 16,28 L16,18 Z
         M14,18 L12,28 Q11,32 16,32 Q21,32 20,28 L18,18 Z`,
  viewBox: '0 0 32 34'
};

const lowerCanine: ToothPaths = {
  crown: `M8,4 L8,14 Q8,20 16,20 Q24,20 24,14 L24,4 Q24,0 20,0 L12,0 Q8,0 8,4 Z`,
  root: `M16,20 L16,28 Q16,32 16,32 Q16,32 16,28 L16,20 Z
         M14,20 L12,28 Q11,32 14,32 L18,32 Q21,32 20,28 L18,20 Z`,
  viewBox: '0 0 32 34'
};

const lowerIncisorCentral: ToothPaths = {
  crown: `M10,4 L10,14 Q10,18 16,18 Q22,18 22,14 L22,4 Q22,0 18,0 L14,0 Q10,0 10,4 Z`,
  root: `M16,18 L14,27 Q13,30 16,30 Q19,30 18,27 L16,18 Z`,
  viewBox: '0 0 32 32'
};

const lowerIncisorLateral: ToothPaths = {
  crown: `M10,4 L10,14 Q10,18 16,18 Q22,18 22,14 L22,4 Q22,0 18,0 L14,0 Q10,0 10,4 Z`,
  root: `M16,18 L14,27 Q13,30 16,30 Q19,30 18,27 L16,18 Z`,
  viewBox: '0 0 32 32'
};

// Deciduous teeth (smaller)
const deciduousMolarUpper: ToothPaths = {
  crown: `M6,26 L6,18 Q6,14 10,14 Q12,14 14,16 Q18,14 22,14 Q26,14 26,18 L26,26 Q26,30 22,30 L10,30 Q6,30 6,26 Z`,
  root: `M10,14 L8,6 Q7,3 10,3 L12,3 Q14,3 13,6 L10,14 Z
         M22,14 L24,6 Q25,3 22,3 L20,3 Q18,3 19,6 L22,14 Z`,
  viewBox: '0 0 32 32'
};

const deciduousCanineUpper: ToothPaths = {
  crown: `M10,26 L10,16 Q10,12 16,12 Q22,12 22,16 L22,26 Q22,30 18,30 L14,30 Q10,30 10,26 Z`,
  root: `M16,12 L14,5 Q13,2 16,2 Q19,2 18,5 L16,12 Z`,
  viewBox: '0 0 32 32'
};

const deciduousIncisorUpper: ToothPaths = {
  crown: `M11,26 L11,16 Q11,12 16,12 Q21,12 21,16 L21,26 Q21,30 18,30 L14,30 Q11,30 11,26 Z`,
  root: `M16,12 L15,5 Q14,2 16,2 Q18,2 17,5 L16,12 Z`,
  viewBox: '0 0 32 32'
};

const deciduousMolarLower: ToothPaths = {
  crown: `M6,6 L6,14 Q6,18 10,18 Q12,18 14,16 Q18,18 22,18 Q26,18 26,14 L26,6 Q26,2 22,2 L10,2 Q6,2 6,6 Z`,
  root: `M10,18 L8,26 Q7,29 10,29 L12,29 Q14,29 13,26 L10,18 Z
         M22,18 L24,26 Q25,29 22,29 L20,29 Q18,29 19,26 L22,18 Z`,
  viewBox: '0 0 32 32'
};

const deciduousCanineLower: ToothPaths = {
  crown: `M10,6 L10,14 Q10,18 16,18 Q22,18 22,14 L22,6 Q22,2 18,2 L14,2 Q10,2 10,6 Z`,
  root: `M16,18 L14,27 Q13,30 16,30 Q19,30 18,27 L16,18 Z`,
  viewBox: '0 0 32 32'
};

const deciduousIncisorLower: ToothPaths = {
  crown: `M11,6 L11,14 Q11,18 16,18 Q21,18 21,14 L21,6 Q21,2 18,2 L14,2 Q11,2 11,6 Z`,
  root: `M16,18 L15,27 Q14,30 16,30 Q18,30 17,27 L16,18 Z`,
  viewBox: '0 0 32 32'
};

// Get tooth paths based on FDI number
export const getToothPaths = (
  toothNumber: number,
  isDeciduous: boolean = false
): ToothPaths => {
  const lastDigit = toothNumber % 10;
  const quadrant = Math.floor(toothNumber / 10);
  const isUpper = isDeciduous 
    ? (quadrant === 5 || quadrant === 6)
    : (quadrant === 1 || quadrant === 2);

  if (isDeciduous) {
    // Deciduous teeth: 51-55, 61-65, 71-75, 81-85
    if (lastDigit >= 4) {
      return isUpper ? deciduousMolarUpper : deciduousMolarLower;
    }
    if (lastDigit === 3) {
      return isUpper ? deciduousCanineUpper : deciduousCanineLower;
    }
    return isUpper ? deciduousIncisorUpper : deciduousIncisorLower;
  }

  // Permanent teeth
  // Molars: 6, 7, 8
  if (lastDigit >= 6) {
    return isUpper ? upperMolar : lowerMolar;
  }
  
  // Premolars: 4, 5
  if (lastDigit >= 4) {
    return isUpper ? upperPremolar : lowerPremolar;
  }
  
  // Canines: 3
  if (lastDigit === 3) {
    return isUpper ? upperCanine : lowerCanine;
  }
  
  // Central incisors: 1
  if (lastDigit === 1) {
    return isUpper ? upperIncisorCentral : lowerIncisorCentral;
  }
  
  // Lateral incisors: 2
  return isUpper ? upperIncisorLateral : lowerIncisorLateral;
};
