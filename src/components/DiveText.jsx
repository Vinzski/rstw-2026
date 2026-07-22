// Renders `text` with the `nth` occurrence of `word` split into
// per-character inline-block spans (wrapped nowrap so the word can't
// break mid-glyph), landing `charRef` on the character a glyph dive
// anchors to. The rest of the text stays plain so kerning is only lost
// inside the one word. Falls back to plain text when the word is absent —
// the dive machinery then degrades to a center iris on its own.
export default function DiveText({ text, word, charIndex, nth = 0, charRef }) {
  let idx = -1;
  for (let i = 0; i <= nth; i++) {
    idx = text.indexOf(word, idx + 1);
    if (idx === -1) return text;
  }
  const before = text.slice(0, idx);
  const after = text.slice(idx + word.length);
  return (
    <>
      {before}
      <span className="inline-block whitespace-nowrap">
        {word.split("").map((ch, i) => (
          <span
            key={i}
            ref={i === charIndex ? charRef : undefined}
            className="inline-block"
          >
            {ch}
          </span>
        ))}
      </span>
      {after}
    </>
  );
}
