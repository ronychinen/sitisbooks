// Detección simple de idioma por palabras frecuentes
const ES = new Set("el la los las de del que y en un una por con para es se su sus al lo como más pero este esta sobre entre cuando también sin muy ya o le".split(" "));
const EN = new Set("the and of to in is that for with on as by this his her are from an be was it you your their into how what will".split(" "));
export function isSpanish(t: string) {
  const ws = t.toLowerCase().match(/[a-záéíóúñü]+/g) ?? [];
  let es = 0, en = 0;
  for (const w of ws) { if (ES.has(w)) es++; if (EN.has(w)) en++; }
  return es >= en;
}

