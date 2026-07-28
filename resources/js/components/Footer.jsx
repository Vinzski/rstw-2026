import LogoMark from "./LogoMark";
import { navLinks } from "../data/content";
import { useLenisRef } from "../lib/lenisContext";
import { scrollToChapter } from "../lib/navigate";
import BrandBorder from "./decor/BrandBorder";
import { el, logos } from "../lib/elements";

export default function Footer() {
  const lenisRef = useLenisRef();

  function goTo(e, href) {
    e.preventDefault();
    scrollToChapter(href.slice(1), lenisRef?.current);
  }

  return (
    <footer className="relative border-t border-navy-900/10 bg-paper-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-14 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex flex-col items-center gap-4 sm:items-start">
          <a href="#intro" onClick={(e) => goTo(e, "#intro")} className="flex items-center gap-2.5">
            <LogoMark size={40} />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold text-ink">
                DOST <span className="text-slate-500">IX</span>
              </span>
              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-orange-600">
                OneDOST4U
              </span>
            </span>
          </a>
          <img src={el(logos.full)} alt="DOST OneDOST4U · Bagong Pilipinas" className="h-9 w-auto opacity-80" />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => goTo(e, l.href)}
              className="text-sm text-slate-600 transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} DOST Zamboanga Peninsula. All rights
          reserved.
        </p>
      </div>
      <BrandBorder className="h-2 sm:h-2.5" />
    </footer>
  );
}
