"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { suggestAction } from "@/app/search-actions";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { Suggestion } from "@/modules/search";

const hrefFor = (s: Suggestion) => (s.type === "product" ? `/dp/${s.slug}` : `/s?c=${encodeURIComponent(s.slug)}`);

/**
 * Header search: a GET form to /s (works without JS) with an accessible combobox of suggestions
 * (debounced, arrow keys, Enter to open a suggestion, Escape to close).
 */
export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    const text = value.trim();
    if (text.length < 2) {
      timer.current = setTimeout(() => setItems([]), 0);
      return () => clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const next = await suggestAction(text);
        setItems(next);
        setActive(-1);
      });
    }, 150);
    return () => clearTimeout(timer.current);
  }, [value]);

  const expanded = open && items.length > 0;
  const activeId = active >= 0 ? `${listId}-${active}` : undefined;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault();
      setOpen(false);
      router.push(hrefFor(items[active]));
    }
  }

  return (
    <form role="search" action="/s" method="get" className="w-full">
      <Popover open={expanded} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="k"
              type="search"
              role="combobox"
              aria-label="Search products"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Search products"
              className="pl-10"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-(--radix-popover-trigger-width) p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement).closest("form[role=search]")) e.preventDefault();
          }}
        >
          <Command shouldFilter={false} value={active >= 0 ? `s-${active}` : ""}>
            <CommandList id={listId} aria-label="Suggestions">
              <CommandGroup>
                {items.map((s, i) => (
                  <CommandItem
                    key={`${s.type}-${s.slug}`}
                    id={`${listId}-${i}`}
                    value={`s-${i}`}
                    className="min-h-11 text-[15px]"
                    onSelect={() => {
                      setOpen(false);
                      router.push(hrefFor(s));
                    }}
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{s.type === "category" ? "Category" : ""}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </form>
  );
}
