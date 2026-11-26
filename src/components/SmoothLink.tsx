"use client";

/** Enlace a un ancla de la misma página con un desplazamiento suave y lento (easing). */
export default function SmoothLink({ to, className, children, duration = 900, offset = 84 }: {
  to: string; className?: string; children: React.ReactNode; duration?: number; offset?: number;
}) {
  function go(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = document.getElementById(to);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = window.scrollY;
    const target = el.getBoundingClientRect().top + from - offset;
    if (reduce) { window.scrollTo(0, target); return; }
    const t0 = performance.now();
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, from + (target - from) * ease(p));
      if (p < 1) requestAnimationFrame(step);
      else history.replaceState(null, "", `#${to}`);
    };
    requestAnimationFrame(step);
  }
  return <a href={`#${to}`} className={className} onClick={go}>{children}</a>;
}
