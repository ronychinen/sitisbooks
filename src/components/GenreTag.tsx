import { GENRES } from "@/lib/constants";

/** Etiqueta de color por género. Los colores viven en globals.css (.genre.g-N). */
export default function GenreTag({ genre }: { genre: string }) {
  const i = GENRES.indexOf(genre);
  return <span className={`genre g-${i < 0 ? GENRES.length - 1 : i}`}>{genre}</span>;
}
