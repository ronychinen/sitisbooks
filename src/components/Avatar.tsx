/** Foto de perfil o, si no hay, un avatar con las iniciales. */
export default function Avatar({ url, name, size = 28 }: { url?: string | null; name?: string | null; size?: number }) {
  const initials = (name ?? "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={url} alt="" width={size} height={size} style={style} />;
  }
  return (
    <span className="avatar avatar-default" style={style} aria-hidden="true">
      {initials || (
        <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
      )}
    </span>
  );
}
