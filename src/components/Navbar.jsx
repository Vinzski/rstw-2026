import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLenisRef } from "../lib/lenisContext";
import { scrollToChapter } from "../lib/navigate";
import LogoMark from "./LogoMark";
import BrandBorder from "./decor/BrandBorder";

export default function Navbar({ hidden = false }) {
  const [scrolled, setScrolled] = useState(false);
  const lenisRef = useLenisRef();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function goTo(e, href) {
    e.preventDefault();
    scrollToChapter(href.slice(1), lenisRef?.current);
  }

  return (
    <motion.div
      className={`fixed inset-x-0 top-0 z-50 ${hidden ? "pointer-events-none" : ""}`}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? -16 : 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
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
        </nav>
      </header>
    </motion.div>
  );
}
