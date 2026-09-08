"use client";
import { useState } from "react";
import { Dialog } from "radix-ui";
import { Aperture, ArrowUpRight, Menu, X } from "lucide-react";
import type { DomainShellModel } from "@/lib/page-models/shell";
import s from "./obsidian.module.css";

export function Navigation({
  model,
  active,
}: {
  model: DomainShellModel;
  active?: string;
}) {
  const [open, setOpen] = useState(false);
  const items = [
    ...model.primaryNavigation,
    { label: "Work", href: model.routes.workUrl, segment: "work" },
  ];
  return (
    <div className={s.navigation}>
      <a
        href={model.routes.baseUrl}
        className={s.identity}
        aria-label={`${model.domain.name} Domain home`}
      >
        <span className={s.emblem}>
          {model.domain.logoUrl ? (
            <img src={model.domain.logoUrl} alt="" />
          ) : (
            <Aperture size={27} strokeWidth={1} />
          )}
        </span>
        <span>{model.domain.name}</span>
      </a>
      <nav className={s.desktopNav} aria-label="Primary navigation">
        {items.map((item) => (
          <a
            key={item.segment}
            className={active === item.segment ? s.activeNav : ""}
            aria-current={active === item.segment ? "page" : undefined}
            href={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>
      {model.managementNavigation.length > 0 && (
        <nav className={s.srOnly} aria-label="Management navigation">
          {model.managementNavigation.map((item) => (
            <a key={item.segment} href={item.href}>{item.label}</a>
          ))}
        </nav>
      )}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className={s.mobileMenu} aria-label="Open navigation">
          <Menu size={22} />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={s.overlay} />
          <Dialog.Content className={s.navDrawer}>
            <Dialog.Title>{model.domain.name}</Dialog.Title>
            <Dialog.Description className={s.srOnly}>
              Domain navigation and management
            </Dialog.Description>
            <nav aria-label="Mobile navigation">
              {items.map((item) => (
                <a
                  key={item.segment}
                  href={item.href}
                  aria-current={active === item.segment ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                  <ArrowUpRight size={19} />
                </a>
              ))}
            </nav>
            {model.managementNavigation.length > 0 && (
              <>
                <p className={s.eyebrow}>Manage domain</p>
                <nav aria-label="Mobile management">
                  {model.managementNavigation.map((item) => (
                    <a
                      key={item.segment}
                      href={item.href}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </>
            )}
            <Dialog.Close
              className={s.dialogClose}
              aria-label="Close navigation"
            >
              <X size={22} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
