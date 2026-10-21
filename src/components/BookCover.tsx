function hue(str: string) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }

export default function BookCover({ title, author, url, tag }: { title: string; author?: string; url?: string | null; tag?: string }) {
  if (url) {
    return (
      <div className="cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Portada de ${title}`} loading="lazy" />
        {tag && <span className="tag">{tag}</span>}
      </div>
    );
  }
  const h = hue(title);
  return (
    <div className="cover typo" style={{ background: `linear-gradient(160deg,hsl(${h} 45% 34%),hsl(${(h + 28) % 360} 50% 24%))` }}>
      {tag && <span className="tag">{tag}</span>}
      <div className="ct">{title}</div>
      {author && <div className="ca">{author}</div>}
    </div>
  );
}
