import { ArrowUpRight, Compass, Sparkles } from "lucide-react";
import type { AboutPageModel } from "./contracts/info";
import s from "./obsidian.module.css";

export function ObsidianAbout({ model }: { model: AboutPageModel }) {
  return (
    <div className={s.publicPage}>
      <section className={s.aboutHero}>
        <p className={s.eyebrow}>
          <Sparkles size={14} /> A WORLD TAKING SHAPE
        </p>
        <h1>
          We came here
          <br />
          <em>to make a home.</em>
        </h1>
        <p>
          Aster Reach is a shared roleplaying world at the far edge of the
          charted sea: part refuge, part experiment, and wholly shaped by the
          people who choose to live within it.
        </p>
      </section>
      <section className={s.aboutStatement}>
        <div className={s.aboutMark} aria-hidden="true">
          <Compass size={32} strokeWidth={1} />
          <span>ASTER REACH</span>
        </div>
        <div className={s.aboutCopy}>
          <div dangerouslySetInnerHTML={{ __html: model.bodyHtml }} />
          {model.editHref && (
            <a href={model.editHref} className={s.quietLink}>
              Edit this page <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </section>
      <nav className={s.aboutDestinations} aria-label="Continue exploring">
        {model.destinations.map((item, index) => (
          <a key={item.segment} href={item.href}>
            <span>0{index + 1}</span>
            <strong>{item.label}</strong>
            <ArrowUpRight size={19} />
          </a>
        ))}
      </nav>
    </div>
  );
}
