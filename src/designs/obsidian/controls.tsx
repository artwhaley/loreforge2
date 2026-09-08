"use client";
import { DropdownMenu, Dialog, Tooltip } from "radix-ui";
import { ArrowUpRight, Check, ChevronDown, X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import s from "./obsidian.module.css";

export type Action = {
  key: string;
  label: string;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
};
export function ActionMenu({
  label,
  trigger,
  items,
  onAction,
}: {
  label: string;
  trigger: ReactNode;
  items: Action[];
  onAction?: (action: Action) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={s.menuTrigger} aria-label={label}>
          {trigger}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={s.menu} align="end" sideOffset={10}>
          <DropdownMenu.Label className={s.menuLabel}>
            {label}
          </DropdownMenu.Label>
          {items.map((item) =>
            item.href && !onAction && !item.disabled ? (
              <DropdownMenu.Item key={item.key} asChild className={s.menuItem}>
                <a href={item.href}>
                  {item.label}
                  <ArrowUpRight size={14} />
                </a>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                key={item.key}
                disabled={item.disabled}
                className={`${s.menuItem} ${item.danger ? s.danger : ""}`}
                onSelect={() => onAction?.(item)}
              >
                {item.label}
                {item.href && <ArrowUpRight size={14} />}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
export function ChoiceMenu({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={s.choiceTrigger} aria-label={label}>
        {choices.find((c) => c.value === value)?.label}
        <ChevronDown size={15} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={s.menu} align="start" sideOffset={8}>
          <DropdownMenu.Label className={s.menuLabel}>
            {label}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            {choices.map((choice) => (
              <DropdownMenu.RadioItem
                className={s.menuItem}
                key={choice.value}
                value={choice.value}
              >
                {choice.label}
                <DropdownMenu.ItemIndicator>
                  <Check size={15} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
export function Hint({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip.Provider delayDuration={350}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className={s.tooltip} sideOffset={7}>
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content className={s.dialog}
          onOpenAutoFocus={() => { opener.current = document.activeElement as HTMLElement | null; }}
          onCloseAutoFocus={(event) => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); }}>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          {children}
          <Dialog.Close className={s.dialogClose} aria-label="Close dialog">
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
