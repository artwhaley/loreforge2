import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Layers3,
  UsersRound,
  Compass,
} from "lucide-react";
import type { HomePageModel } from "@/lib/page-models/home";
import s from "./obsidian.module.css";

const icons = {
  about: Compass,
  lore: BookOpen,
  departments: UsersRound,
  records: Layers3,
};
export function ObsidianHome({
  model,
  atmosphereImage,
  atmosphereCaption,
}: {
  model: HomePageModel;
  atmosphereImage: string | null;
  atmosphereCaption?: string;
}) {
  return (
    <>
      <section className={s.hero}>
        {atmosphereImage && (
          <img
            className={s.heroImage}
            src={atmosphereImage}
            alt=""
            fetchPriority="high"
          />
        )}
        <div className={s.heroShade} />
        <div className={s.heroContent}>
          <p className={s.eyebrow}>
            <span className={s.liveDot} /> THE DOMAIN ARCHIVE
          </p>
          <h1>
            {model.domain.name.split(" ").slice(0, -1).join(" ")}
            <br />
            <em>{model.domain.name.split(" ").at(-1)}</em>
          </h1>
          <p className={s.heroMotto}>{model.domain.motto}</p>
          <a href={`${model.baseUrl}/records`} className={s.primaryButton}>
            Enter the archive <ArrowUpRight size={18} />
          </a>
        </div>
        <a href="#welcome" className={s.heroScroll}>
          <ArrowDown size={16} />
          <span>Explore the domain</span>
        </a>
        {atmosphereCaption && (
          <span className={s.heroCaption}>{atmosphereCaption}</span>
        )}
      </section>
      <div className={s.homeContent}>
        <section id="welcome" className={s.welcome}>
          <div>
            <p className={s.eyebrow}>A SHARED WORLD</p>
            <h2>
              A place.
              <br />A people.
              <br />
              <em>A living record.</em>
            </h2>
          </div>
          <div className={s.welcomeBody}>
            {model.welcome.html ? (
              <div dangerouslySetInnerHTML={{ __html: model.welcome.html }} />
            ) : (
              <p>This is where your domain’s story begins.</p>
            )}
            {model.welcome.editHref && (
              <a href={model.welcome.editHref} className={s.quietLink}>
                Edit welcome <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </section>
        <nav className={s.destinations} aria-label="Explore the domain">
          {model.destinations.map((item, i) => {
            const Icon = icons[item.segment as keyof typeof icons] ?? Compass;
            return (
              <a key={item.segment} href={item.href}>
                <span className={s.destinationTop}>
                  <Icon size={24} strokeWidth={1.2} />
                  <span>0{i + 1}</span>
                </span>
                <span className={s.destinationName}>
                  {item.label}
                  <ArrowUpRight size={20} />
                </span>
              </a>
            );
          })}
        </nav>
        <section className={s.recentSection}>
          <div className={s.sectionHeading}>
            <div>
              <p className={s.eyebrow}>THE LATEST CHAPTER</p>
              <h2>Recently recorded</h2>
            </div>
            <a className={s.quietLink} href={`${model.baseUrl}/records`}>
              All records <ArrowRight size={17} />
            </a>
          </div>
          {model.recentRecords.length ? (
            <div className={s.recentGrid}>
              {model.recentRecords.slice(0, 3).map((record, index) => (
                <a
                  className={s.recentCard}
                  key={record.id}
                  href={`${model.baseUrl}/documents/${record.id}`}
                >
                  <span className={s.recentTop}>
                    <span>{record.type}</span>
                    <span className={s.recordOrdinal}>0{index + 1}</span>
                  </span>
                  <h3>{record.title}</h3>
                  <span className={s.recentBottom}>
                    {record.activity}
                    <ArrowUpRight size={20} />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className={s.empty}>
              <Layers3 size={30} />
              <h3>Your archive is ready.</h3>
              <p>No records have been filed yet.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
