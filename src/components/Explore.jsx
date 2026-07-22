import { explore } from "../data/content";
import { el } from "../lib/elements";
import SectionHeading from "./SectionHeading";
import { WeaveBand } from "./decor/Decor";

function PlaceCard({ place, index }) {
  return (
    <div className="group relative h-80 w-64 shrink-0 overflow-hidden rounded-3xl shadow-lg shadow-navy-900/10 sm:h-96 sm:w-80">
      <img
        src={el(place.image)}
        alt={place.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
      <span className="absolute left-5 top-5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="absolute right-5 top-5 rounded-full bg-white/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
        {place.tag}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-6">
        <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
          {place.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          {place.copy}
        </p>
      </div>
    </div>
  );
}

// A continuously right-to-left moving carousel rather than a
// user-dragged strip: the track holds two back-to-back copies of the
// place list and animates from translateX(0) to translateX(-50%) — since
// the two copies are pixel-identical, the loop point is invisible and it
// reads as an endless ribbon of cards drifting past, not a scroller with
// a beginning and end. Pauses on hover so a card can actually be read.
export default function Explore() {
  return (
    <section
      id="explore"
      className="relative overflow-hidden bg-gradient-to-b from-paper-100 via-white to-paper-50 py-28 sm:py-36"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow={explore.eyebrow}
          title={explore.title}
          description={explore.description}
        />

        <WeaveBand color="yellow" className="mt-10 h-2.5 w-full max-w-xl rounded-full opacity-70" />
      </div>

      <div className="relative mt-10 overflow-hidden">
        <div className="animate-marquee flex w-max gap-5 px-6">
          {[...explore.places, ...explore.places].map((place, i) => (
            <PlaceCard key={`${place.key}-${i}`} place={place} index={i % explore.places.length} />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-paper-100 to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-paper-50 to-transparent sm:w-32" />
      </div>
    </section>
  );
}
