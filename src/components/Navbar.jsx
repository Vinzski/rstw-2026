import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navLinks } from "../data/content";
import { useLenisRef } from "../lib/lenisContext";
import { scrollToChapter } from "../lib/navigate";
import LogoMark from "./LogoMark";
import BrandBorder from "./decor/BrandBorder";

export default function Navbar({ active }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const lenisRef = useLenisRef();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function goTo(e, href) {
    e.preventDefault();
    setOpen(false);
    scrollToChapter(href.slice(1), lenisRef?.current);
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50">
        <BrandBorder className="h-[5px] sm:h-[7px]" />
        <header
          className={`transition-all duration-500 ${
            scrolled
              ? "border-b border-navy-900/10 bg-paper-50/85 backdrop-blur-xl"
              : "border-b border-transparent bg-transparent"
          }`}
        >
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a
              href="#intro"
              onClick={(e) => goTo(e, "#intro")}
              className="flex items-center gap-2.5"
            >
              <LogoMark size={46} />
              <span className="flex flex-col leading-tight">
                <span className="font-display text-lg font-semibold tracking-tight text-ink">
                  DOST <span className="text-slate-500">IX</span>
                </span>
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-orange-600">
                  OneDOST4U
                </span>
              </span>
            </a>

            <button
              onClick={() => setOpen(true)}
              className="group flex items-center gap-3 rounded-full border border-navy-900/15 py-2 pl-4 pr-2 text-ink transition-colors duration-300 hover:border-orange-500/50"
              aria-label="Open menu"
            >
              <span className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 group-hover:text-ink sm:inline">
                Menu
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-900/[0.06]">
                <Menu className="h-3.5 w-3.5" />
              </span>
            </button>
          </nav>
        </header>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-paper-100"
            initial={{ clipPath: "circle(2% at 92% 6%)" }}
            animate={{ clipPath: "circle(150% at 92% 6%)" }}
            exit={{ clipPath: "circle(2% at 92% 6%)" }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bg-grid absolute inset-0 opacity-40" />
            <button
              onClick={() => setOpen(false)}
              className="absolute right-6 top-5 grid h-10 w-10 place-items-center rounded-full border border-navy-900/15 text-ink"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative flex flex-col items-center gap-5">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => goTo(e, link.href)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.05 }}
                  className={`font-display text-2xl font-semibold transition-colors sm:text-3xl ${
                    active === link.href.slice(1)
                      ? "text-gradient"
                      : "text-slate-600 hover:text-ink"
                  }`}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href="#contact"
                onClick={(e) => goTo(e, "#contact")}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + navLinks.length * 0.05 }}
                className="mt-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-700 px-8 py-3 text-sm font-semibold text-white"
              >
                Register
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
