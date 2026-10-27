"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { useState, type ReactNode } from "react";
import {
  BoldIcon,
  BulletListIcon,
  ChevronDownIcon,
  ItalicIcon,
  OrderedListIcon,
  RedoIcon,
  UnderlineIcon,
  UndoIcon,
} from "@/components/ui/icons";

type BlockType = "paragraph" | "h1" | "h2" | "h3";

const BLOCK_OPTIONS: { value: BlockType; label: string; keys: string }[] = [
  { value: "paragraph", label: "Paragraph", keys: "Mod+Alt+0" },
  { value: "h1", label: "Heading 1", keys: "Mod+Alt+1" },
  { value: "h2", label: "Heading 2", keys: "Mod+Alt+2" },
  { value: "h3", label: "Heading 3", keys: "Mod+Alt+3" },
];

const isMacPlatform = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** "Mod+Shift+Z" → "Ctrl+Shift+Z" or "⌘⇧Z". */
function formatKeys(keys: string, mac: boolean): string {
  if (!mac) return keys.replace("Mod", "Ctrl");
  return keys
    .replace("Mod", "⌘")
    .replace("Alt", "⌥")
    .replace("Shift", "⇧")
    .replace(/\+/g, "");
}

function ToolbarButton({
  label,
  keys,
  mac,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  keys: string;
  mac: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const shortcut = formatKeys(keys, mac);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      aria-keyshortcuts={keys.replace("Mod", mac ? "Meta" : "Control")}
      title={`${label} (${shortcut})`}
      disabled={disabled}
      // Keep the editor selection: don't let the button steal focus on mouse down.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-35 ${
        active ? "bg-brand-soft text-brand" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden="true" className="mx-1 h-5 w-px bg-zinc-200" />;

export function Toolbar({ editor }: { editor: Editor }) {
  const [mac] = useState(isMacPlatform);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      block: (e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "paragraph") as BlockType,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setBlock = (value: BlockType) => {
    const chain = editor.chain().focus();
    if (value === "paragraph") chain.setParagraph().run();
    else chain.setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
  };

  const blockKeys = BLOCK_OPTIONS.map((o) => `${o.label} ${formatKeys(o.keys, mac)}`).join(", ");

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-xs"
    >
      <ToolbarButton label="Undo" keys="Mod+Z" mac={mac} disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton label="Redo" keys="Mod+Shift+Z" mac={mac} disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <RedoIcon />
      </ToolbarButton>
      <Divider />
      <div className="relative">
        <label htmlFor="block-type" className="sr-only">
          Text style
        </label>
        <select
          id="block-type"
          value={state.block}
          onChange={(e) => setBlock(e.target.value as BlockType)}
          title={`Text style (${blockKeys})`}
          className="h-8 appearance-none rounded-md bg-transparent ps-2.5 pe-7 text-sm text-zinc-800 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-brand"
        >
          {BLOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute end-2 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
      </div>
      <Divider />
      <ToolbarButton label="Bold" keys="Mod+B" mac={mac} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton label="Italic" keys="Mod+I" mac={mac} active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton label="Underline" keys="Mod+U" mac={mac} active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Bullet list"
        keys="Mod+Shift+8"
        mac={mac}
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <BulletListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        keys="Mod+Shift+7"
        mac={mac}
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <OrderedListIcon />
      </ToolbarButton>
    </div>
  );
}
