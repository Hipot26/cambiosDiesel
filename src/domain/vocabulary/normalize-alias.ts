// Normalización compartida de alias del vocabulario (03 §7.1; 01 "Integración con el screener").
// Exactamente como lo hace el archivo de Toya: todo lo que no sea letra ni número (Unicode) se
// vuelve un espacio, minúsculas, espacios colapsados, extremos recortados. Por eso existen claves
// como "6 7 cummins", "ec 60" y "s r". Ojo: "+" no es puntuación para \p{P}; por eso la regla
// es "no letra ni número", no "puntuación".
const NOT_LETTER_OR_DIGIT = /[^\p{L}\p{N}]+/gu;

export function normalizeAlias(text: string): string {
  return text.replace(NOT_LETTER_OR_DIGIT, ' ').toLowerCase().replace(/ +/g, ' ').trim();
}
