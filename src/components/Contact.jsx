import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2 } from "lucide-react";
import { contactInfo } from "../data/content";
import SectionHeading from "./SectionHeading";
import { WeaveBand } from "./decor/Decor";

function FieldInput({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        {...props}
        className="w-full border-b border-navy-900/15 bg-transparent px-0.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-orange-500"
      />
    </label>
  );
}

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-gradient-to-b from-paper-100 via-white to-paper-50 py-28 sm:py-36"
    >
      <div className="bg-grid absolute inset-0 opacity-35" />

      <div className="relative mx-auto max-w-5xl px-6">
        <SectionHeading
          eyebrow="Get in Touch"
          title="See You There!"
          description="Questions about exhibiting, sponsoring, or attending? Reach out to DOST Zamboanga Peninsula."
        />
        <WeaveBand color="blue" className="mt-10 h-2.5 w-full max-w-xl rounded-full opacity-70" />

        <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-5 lg:gap-10">
          <div className="flex flex-col gap-8 border-t border-navy-900/10 pt-8 lg:col-span-2">
            {contactInfo.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, scale: 0.88 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex items-start gap-4"
              >
                <c.icon className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {c.label}
                  </p>
                  <p className="mt-1 text-base text-slate-700">{c.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex h-full min-h-[280px] flex-col items-center justify-center border-t border-navy-900/10 pt-8 text-center"
              >
                <CheckCircle2 className="h-10 w-10 text-orange-600" />
                <p className="font-display mt-4 text-xl font-semibold text-ink">
                  Message received
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  This form is a static placeholder — wire it up to your
                  backend or form service when ready.
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-7 border-t border-navy-900/10 pt-8">
                <FieldInput
                  label="Name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  type="text"
                  placeholder="Juan Dela Cruz"
                />
                <FieldInput
                  label="Email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                  placeholder="you@example.com"
                />
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Message
                  </span>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={3}
                    placeholder="How can we help?"
                    className="w-full resize-none border-b border-navy-900/15 bg-transparent px-0.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-orange-500"
                  />
                </label>
                <button
                  type="submit"
                  className="group mt-2 inline-flex w-fit items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-700 px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02]"
                >
                  Send Message
                  <Send className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </motion.form>
        </div>
      </div>
    </section>
  );
}
