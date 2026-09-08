import { ArrowUpRight, Compass, Sparkles } from "lucide-react";
import type { AboutPageModel } from "@/lib/page-models/info";
import s from "./obsidian.module.css";

export function ObsidianAbout({ model }: { model: AboutPageModel }) {
  const domainName = model.domainName ?? "Aster Reach";
  const hasBody = model.bodyHtml.trim().length > 0;

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
          {domainName} is a shared roleplaying world at the far edge of the
          charted sea: part refuge, part experiment, and wholly shaped by the
          people who choose to live within it.
        </p>
      </section>
      <section className={s.aboutStatement}>
        <div className={s.aboutMark} aria-hidden="true">
          <Compass size={32} strokeWidth={1} />
          <span>{domainName.toUpperCase()}</span>
        </div>
        <div className={s.aboutCopy}>
          {hasBody ? (
            <div dangerouslySetInnerHTML={{ __html: model.bodyHtml }} />
          ) : (
            <>
              <p className={s.lead}>
                {domainName} begins after the voyage. It is a roleplaying
                community about the fragile work of building a life together
                in a place that still feels new.
              </p>
              <p>
                Beyond the silver shoals, the Reach is a coast of stubborn
                settlements, shared harbors, unfinished maps, and people
                carrying histories they may not be ready to name. There is
                wonder here, but it is the wonder of ordinary things made
                meaningful: a lantern left burning, a council decision argued
                late into the night, a route across dangerous water known only
                to a few.
              </p>
              <p>
                We make this world together. Every character arrives with a
                point of view; every relationship, trade, promise, and mistake
                gives the setting another edge. The lore is here to offer a
                common horizon. The stories are what we choose to do beneath
                it.
              </p>
            </>
          )}
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
