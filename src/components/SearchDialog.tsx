import { useState, useEffect, useRef } from 'preact/hooks';
import Fuse from 'fuse.js';
import type { ToolData } from '../types/tool';

interface SearchDialogProps {
  tools: ToolData[];
}

export default function SearchDialog({ tools }: SearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Configure Fuse for typo-tolerant fuzzy search
  const fuse = new Fuse(tools, {
    keys: [
      { name: 'name', weight: 0.45 },
      { name: 'slug', weight: 0.35 },
      { name: 'category', weight: 0.1 },
      { name: 'tagline', weight: 0.1 }
    ],
    threshold: 0.48, // Typo tolerant (e.g. "upptime" -> "uptime-kuma", "jelifyn" -> "jellyfin")
    distance: 100,
    minMatchCharLength: 2
  });

  const results: ToolData[] = query.trim().length >= 2
    ? fuse.search(query).map((res) => res.item)
    : tools.slice(0, 6); // Show top default picks when query is short

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle arrow navigation in results
  function handleInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      window.location.href = `/tools/${results[selectedIndex].slug}`;
    }
  }

  return (
    <>
      {/* Trigger Button (renders in header or hero) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        class="inline-flex items-center justify-between gap-3 w-full max-w-md px-3.5 py-2 rounded-lg bg-app-surface border border-app-border hover:border-app-border-hover text-app-muted hover:text-app-text text-xs transition-colors cursor-pointer"
        aria-label="Open search dialog"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4 text-app-subtle shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search 35+ tools with Safety Scores...</span>
        </span>
        <kbd class="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-app-bg border border-app-border text-app-subtle">
          ⌘K
        </kbd>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Search tools"
        >
          <div class="relative w-full max-w-xl rounded-xl border border-app-border bg-app-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Input Header */}
            <div class="flex items-center px-4 py-3 border-b border-app-border bg-app-surface gap-3">
              <svg class="w-4 h-4 text-app-subtle shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                placeholder="Search tools, categories, or keywords (e.g. upptime, bitwarden)..."
                class="w-full bg-transparent text-sm text-app-text placeholder:text-app-subtle focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  class="text-xs text-app-subtle hover:text-app-text"
                  aria-label="Clear query"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Results List */}
            <div class="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <div class="py-8 text-center text-xs text-app-subtle">
                  No tools found matching "{query}".
                </div>
              ) : (
                <ul ref={listRef} class="space-y-1" role="listbox">
                  {results.map((tool, idx) => {
                    const isSelected = idx === selectedIndex;
                    const scoreColor =
                      tool.safety_score >= 80
                        ? 'text-emerald-400'
                        : tool.safety_score >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400';

                    return (
                      <li
                        key={tool.slug}
                        role="option"
                        aria-selected={isSelected}
                        class={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-app-surface-hover border border-app-border text-app-text'
                            : 'hover:bg-app-surface-hover/50 text-app-muted'
                        }`}
                        onClick={() => {
                          window.location.href = `/tools/${tool.slug}`;
                        }}
                      >
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-xs text-app-text truncate">
                              {tool.name}
                            </span>
                            <span class="text-[10px] font-mono text-app-subtle">
                              {tool.category}
                            </span>
                          </div>
                          <p class="text-[11px] text-app-muted truncate mt-0.5">
                            {tool.tagline}
                          </p>
                        </div>

                        <div class="shrink-0 flex items-center gap-2">
                          <div class="font-mono text-xs font-bold">
                            <span class={scoreColor}>{tool.safety_score}</span>
                            <span class="text-app-subtle text-[10px]">/100</span>
                          </div>
                          <span class="text-app-subtle text-xs">→</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer tips */}
            <div class="px-4 py-2 border-t border-app-border bg-app-bg/50 flex items-center justify-between text-[11px] font-mono text-app-subtle">
              <div class="flex items-center gap-3">
                <span><kbd class="px-1 py-0.5 rounded bg-app-surface border border-app-border">↑↓</kbd> navigate</span>
                <span><kbd class="px-1 py-0.5 rounded bg-app-surface border border-app-border">↵</kbd> open</span>
                <span><kbd class="px-1 py-0.5 rounded bg-app-surface border border-app-border">esc</kbd> close</span>
              </div>
              <span>{results.length} results</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

