import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { hotels } from "../data/content";
import SectionHeading from "./SectionHeading";

export default function Hotels() {
  return (
    <section
      id="stay"
      className="relative overflow-hidden bg-gradient-to-b from-paper-50 via-white to-paper-100 py-28 sm:py-36"
    >
      <div className="relative mx-auto max-w-4xl px-6">
        <SectionHeading
          eyebrow="Where to Stay"
          title="Accommodations near the venue"
          description="Placeholder listings — swap in confirmed partner hotels once the venue is finalized."
        />

        <div className="mt-16 border-t border-navy-900/10">
          {hotels.map((h, i) => (
            <motion.a
              key={h.name}
              href="#contact"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex items-center gap-6 border-b border-navy-900/10 py-7 transition-colors duration-300 hover:border-orange-500/40 sm:gap-10 sm:py-9"
            >
              <span className="font-display shrink-0 text-2xl font-semibold text-slate-400 transition-colors duration-300 group-hover:text-orange-600 sm:text-3xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-navy-900/10 bg-white text-orange-600 shadow-sm shadow-navy-900/5 transition-colors duration-300 group-hover:border-orange-500/40 sm:h-12 sm:w-12">
                <h.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-orange-600">
                  {h.area}
                </p>
                <h3 className="font-display mt-1 text-xl font-semibold text-ink sm:text-2xl">
                  {h.name}
                </h3>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-500">
                  {h.copy}
                </p>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 -translate-x-1 translate-y-1 text-slate-400 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-orange-600 group-hover:opacity-100 sm:h-6 sm:w-6" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
