import { useState, useEffect, useRef } from 'preact/hooks';
import Fuse from 'fuse.js';
import type { ToolData } from '../types/tool';
import { categories } from '../data/categories';
import { allIntents, defaultIntentChips } from '../data/intents';

interface SearchDialogProps {
  tools: ToolData[];
}

export default function SearchDialog({ tools }: SearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [osShortcut, setOsShortcut] = useState('Ctrl K');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
      setOsShortcut(isMac ? '⌘K' : 'Ctrl K');
    }
  }, []);

  // Configure Fuse for tools
  const toolsFuse = new Fuse(tools, {
    keys: [
      { name: 'name', weight: 0.45 },
      { name: 'slug', weight: 0.35 },
      { name: 'category', weight: 0.1 },
      { name: 'tagline', weight: 0.1 }
    ],
    threshold: 0.48,
    distance: 100,
    minMatchCharLength: 2
  });

  // Configure Fuse for categories
  const categoriesFuse = new Fuse(categories, {
    keys: ['name', 'slug', 'tagline'],
    threshold: 0.45
  });

  // Configure Fuse for natural language intents
  const intentsFuse = new Fuse(allIntents, {
    keys: ['label', 'query', 'description'],
    threshold: 0.5
  });

  const cleanQuery = query.trim();

  // Matched groups
  const matchedTools = cleanQuery.length >= 2
    ? toolsFuse.search(cleanQuery).slice(0, 5).map((r) => r.item)
    : [];

  const matchedCategories = cleanQuery.length >= 2
    ? categoriesFuse.search(cleanQuery).slice(0, 3).map((r) => r.item)
    : [];

  const matchedIntents = cleanQuery.length >= 2
    ? intentsFuse.search(cleanQuery).slice(0, 3).map((r) => r.item)
    : [];

  // Build unified flat navigation list for keyboard arrows
  interface NavItem {
    id: string;
    url: string;
    type: 'tool' | 'category' | 'intent';
  }

  const flatItems: NavItem[] = [
    ...matchedTools.map((t) => ({ id: `tool-${t.slug}`, url: `/tools/${t.slug}`, type: 'tool' as const })),
    ...matchedCategories.map((c) => ({ id: `cat-${c.slug}`, url: `/categories/${c.slug}`, type: 'category' as const })),
    ...matchedIntents.map((i) => ({ id: `intent-${i.targetSlug}`, url: i.targetUrl, type: 'intent' as const }))
  ];

  // Global shortcuts: Cmd+K / Ctrl+K and "/" anywhere
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true';

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === '/' && !isInputActive && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto-focus input on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  function handleInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      e.preventDefault();
      window.location.href = flatItems[selectedIndex].url;
    }
  }

  function handleIntentClick(targetUrl: string) {
    window.location.href = targetUrl;
  }

  let currentIndex = -1;

  return (
    <>
      {/* Search Bar Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        class="inline-flex items-center justify-between gap-2.5 w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-app-surface border border-app-border hover:border-blue-500/50 text-app-muted hover:text-app-text text-xs font-sans transition-all cursor-pointer shadow-xs group"
        aria-label="Open search and suggestion box"
      >
        <span class="flex items-center gap-2 min-w-0">
          <svg class="w-3.5 h-3.5 text-app-subtle group-hover:text-blue-400 shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span class="truncate text-left text-xs text-app-muted group-hover:text-app-text transition-colors">Search 43 tools, sectors, or natural goals...</span>
        </span>
        <div class="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 rounded bg-app-surface-2 border border-app-border text-app-muted">{osShortcut}</kbd>
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 rounded bg-app-surface-2 border border-app-border text-app-muted">/</kbd>
        </div>
      </button>

      {/* Suggest Box Modal */}
      {isOpen && (
        <div
          class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Search and suggestion console"
        >
          <div class="relative w-full max-w-2xl rounded-2xl border border-app-border bg-app-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            
            {/* Input Header */}
            <div class="flex items-center px-4 py-3.5 border-b border-app-border bg-app-surface-2 gap-3 shrink-0">
              <svg class="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onInput={(e) => {
                  setQuery((e.target as HTMLInputElement).value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Type a tool name, category, or natural goal (e.g. google photos alternative)..."
                class="w-full bg-transparent text-sm font-mono text-app-text placeholder:text-app-subtle focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  class="text-xs text-app-subtle hover:text-app-text px-1.5"
                  aria-label="Clear query"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Scrollable Content */}
            <div ref={listRef} class="overflow-y-auto p-4 space-y-5 flex-1">
              
              {/* EMPTY STATE: Show 6 Curated Intent Chips */}
              {!cleanQuery && (
                <div class="space-y-4 py-2">
                  <div class="flex items-center justify-between text-micro text-app-subtle">
                    <span>NATURAL LANGUAGE INTENTS (SUGGESTED DISCOVERIES)</span>
                    <span>DIRECT JUMP</span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {defaultIntentChips.map((chip) => (
                      <button
                        type="button"
                        key={chip.label}
                        onClick={() => handleIntentClick(chip.targetUrl)}
                        class="text-left p-3 rounded-xl border border-app-border bg-app-surface-2 hover:border-blue-500/40 hover:bg-app-bg transition-all group cursor-pointer"
                      >
                        <div class="font-semibold text-xs text-app-text group-hover:text-blue-400 flex items-center justify-between">
                          <span>{chip.label}</span>
                          <span class="text-app-subtle text-[10px] font-mono group-hover:text-app-text">&rarr;</span>
                        </div>
                        <span class="text-[10px] font-mono text-app-subtle block mt-0.5">
                          "{chip.query}"
                        </span>
                      </button>
                    ))}
                  </div>

                  <div class="pt-4 border-t border-app-border/60 text-center">
                    <span class="text-micro text-app-subtle">
                      TIP: PRESS <kbd class="px-1 py-0.5 rounded bg-app-surface-2 border border-app-border">↑</kbd> <kbd class="px-1 py-0.5 rounded bg-app-surface-2 border border-app-border">↓</kbd> TO NAVIGATE, <kbd class="px-1 py-0.5 rounded bg-app-surface-2 border border-app-border">ENTER</kbd> TO OPEN
                    </span>
                  </div>
                </div>
              )}

              {/* SEARCH RESULTS (When query is entered) */}
              {cleanQuery && flatItems.length === 0 && (
                <div class="py-12 text-center text-xs font-mono text-app-subtle">
                  No matching tools, categories, or natural language intents found for "{cleanQuery}".
                </div>
              )}

              {/* GROUP 1: TOOLS */}
              {cleanQuery && matchedTools.length > 0 && (
                <div class="space-y-2">
                  <div class="text-micro text-blue-400 font-bold flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span>EVALUATED TOOLS ({matchedTools.length})</span>
                  </div>

                  <div class="space-y-1.5">
                    {matchedTools.map((tool) => {
                      currentIndex++;
                      const isSelected = selectedIndex === currentIndex;
                      const scoreColor =
                        tool.safety_score >= 80
                          ? 'text-emerald-400'
                          : tool.safety_score >= 50
                            ? 'text-amber-400'
                            : 'text-rose-400';

                      return (
                        <div
                          key={tool.slug}
                          onClick={() => { window.location.href = `/tools/${tool.slug}`; }}
                          class={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500/60 bg-app-surface-2 shadow-md'
                              : 'border-app-border bg-app-bg hover:border-app-border/80 hover:bg-app-surface-2'
                          }`}
                        >
                          <div class="flex-1 min-w-0 pr-3">
                            <div class="flex items-center gap-2">
                              <span class="font-bold text-xs text-app-text truncate">{tool.name}</span>
                              <span class="text-[10px] font-mono text-app-subtle">{tool.repo}</span>
                              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-app-surface border border-app-border text-app-muted">
                                {tool.license_spdx}
                              </span>
                            </div>
                            <p class="text-[11px] text-app-muted truncate mt-0.5">{tool.tagline}</p>
                          </div>

                          <div class="shrink-0 flex items-center gap-3 font-mono text-xs">
                            <span class="text-[11px] text-app-subtle">★ {(tool.stars / 1000).toFixed(1)}k</span>
                            <div class="text-right">
                              <span class={`font-bold ${scoreColor}`}>{tool.safety_score}</span>
                              <span class="text-[10px] text-app-subtle">/100</span>
                            </div>
                            <span class="text-app-subtle text-xs">&rarr;</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GROUP 2: CATEGORIES */}
              {cleanQuery && matchedCategories.length > 0 && (
                <div class="space-y-2 pt-2 border-t border-app-border">
                  <div class="text-micro text-emerald-400 font-bold flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>SECTOR CATEGORIES ({matchedCategories.length})</span>
                  </div>

                  <div class="space-y-1.5">
                    {matchedCategories.map((cat) => {
                      currentIndex++;
                      const isSelected = selectedIndex === currentIndex;

                      return (
                        <div
                          key={cat.slug}
                          onClick={() => { window.location.href = `/categories/${cat.slug}`; }}
                          class={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500/60 bg-app-surface-2 shadow-md'
                              : 'border-app-border bg-app-bg hover:bg-app-surface-2'
                          }`}
                        >
                          <div>
                            <span class="font-bold text-xs text-app-text">{cat.name} Sector</span>
                            <p class="text-[11px] text-app-muted truncate mt-0.5">{cat.tagline}</p>
                          </div>
                          <span class="font-mono text-xs text-emerald-400 flex items-center gap-1">
                            <span>Open Sector</span>
                            <span>&rarr;</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GROUP 3: INTENTS */}
              {cleanQuery && matchedIntents.length > 0 && (
                <div class="space-y-2 pt-2 border-t border-app-border">
                  <div class="text-micro text-purple-400 font-bold flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>CURATED INTENTS & GOALS ({matchedIntents.length})</span>
                  </div>

                  <div class="space-y-1.5">
                    {matchedIntents.map((intent) => {
                      currentIndex++;
                      const isSelected = selectedIndex === currentIndex;

                      return (
                        <div
                          key={intent.label}
                          onClick={() => { window.location.href = intent.targetUrl; }}
                          class={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-purple-500/60 bg-app-surface-2 shadow-md'
                              : 'border-app-border bg-app-bg hover:bg-app-surface-2'
                          }`}
                        >
                          <div>
                            <span class="font-bold text-xs text-purple-300">{intent.label}</span>
                            <p class="text-[11px] text-app-muted truncate mt-0.5">{intent.description}</p>
                          </div>
                          <span class="font-mono text-xs text-purple-400 flex items-center gap-1">
                            <span>Jump to Stack</span>
                            <span>&rarr;</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Shortcuts */}
            <div class="px-4 py-2.5 border-t border-app-border bg-app-surface-2 flex items-center justify-between text-[11px] font-mono text-app-subtle shrink-0">
              <div class="flex items-center gap-3">
                <span><kbd class="px-1.5 py-0.5 rounded bg-app-surface border border-app-border">↑↓</kbd> navigate</span>
                <span><kbd class="px-1.5 py-0.5 rounded bg-app-surface border border-app-border">↵</kbd> select</span>
                <span><kbd class="px-1.5 py-0.5 rounded bg-app-surface border border-app-border">esc</kbd> dismiss</span>
              </div>
              <span class="hidden sm:inline-block uppercase tracking-wider">Zero telemetry phoning home</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
