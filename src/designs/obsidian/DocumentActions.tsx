"use client";
import { MoreHorizontal } from "lucide-react";
import { ActionMenu, type Action } from "./controls";
export function DocumentActions({
  items,
  onAction,
}: {
  items: Action[];
  onAction: (action: Action) => void;
}) {
  return (
    <ActionMenu
      label="Document actions"
      trigger={
        <>
          <MoreHorizontal size={18} />
          Actions
        </>
      }
      items={items}
      onAction={onAction}
    />
  );
}
