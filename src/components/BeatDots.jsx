export default function BeatDots({ count, activeIndex, label, fillClass = "bg-orange-500" }) {
  return (
    <div className="absolute inset-x-0 top-10 z-10 flex flex-col items-center gap-3 sm:top-14">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-500">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === activeIndex ? `w-6 ${fillClass}` : "w-1.5 bg-navy-900/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
