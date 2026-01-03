import { createPrompt, useState, useKeypress, useMemo, makeTheme, isEnterKey, isSpaceKey, isUpKey, isDownKey } from '@inquirer/core';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import pc from 'picocolors';

const home = homedir();

/** Replace home directory with ~ for display */
function displayPath(path: string): string {
  return path.startsWith(home) ? path.replace(home, '~') : path;
}

/** Get subdirectories of a path */
function getSubdirectories(path: string): string[] {
  try {
    return readdirSync(path)
      .filter((name) => {
        if (name.startsWith('.')) return false;
        try {
          const fullPath = resolve(path, name);
          return statSync(fullPath).isDirectory();
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return [];
  }
}

interface DirectoryItem {
  path: string;
  name: string;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
}

interface BrowserState {
  items: DirectoryItem[];
  cursor: number;
  selected: Set<string>;
  expanded: Set<string>;
}

/** Build visible items list based on expanded state */
function buildVisibleItems(
  rootPaths: string[],
  expanded: Set<string>,
  selected: Set<string>
): DirectoryItem[] {
  const items: DirectoryItem[] = [];

  function addPath(path: string, depth: number): void {
    const name = depth === 0 ? displayPath(path) : basename(path);
    const isSelected = selected.has(path);
    const hasChildren = !isSelected && getSubdirectories(path).length > 0;
    const isExpanded = expanded.has(path);

    items.push({ path, name, depth, isExpanded, hasChildren });

    // Add children if expanded and not selected
    if (isExpanded && !isSelected) {
      for (const child of getSubdirectories(path)) {
        addPath(resolve(path, child), depth + 1);
      }
    }
  }

  for (const rootPath of rootPaths) {
    if (existsSync(rootPath)) {
      addPath(rootPath, 0);
    }
  }

  return items;
}

interface DirectoryBrowserConfig {
  message: string;
  rootPaths: string[];
  defaultSelected?: string[];
  defaultExpanded?: string[];
}

export const directoryBrowser = createPrompt<string[], DirectoryBrowserConfig>((config, done) => {
  const theme = makeTheme({});
  const [state, setState] = useState<BrowserState>(() => {
    const selected = new Set(config.defaultSelected || []);
    const expanded = new Set(config.defaultExpanded || []);
    const items = buildVisibleItems(config.rootPaths, expanded, selected);
    return { items, cursor: 0, selected, expanded };
  });

  const items = useMemo(
    () => buildVisibleItems(config.rootPaths, state.expanded, state.selected),
    [state.expanded, state.selected]
  );

  useKeypress((key) => {
    if (isEnterKey(key)) {
      // Enter: if item has children and not selected, expand/collapse
      // Otherwise: done (if have selections)
      const currentItem = items[state.cursor];
      if (currentItem && !state.selected.has(currentItem.path) && currentItem.hasChildren) {
        // Toggle expand
        const newExpanded = new Set(state.expanded);
        if (newExpanded.has(currentItem.path)) {
          newExpanded.delete(currentItem.path);
        } else {
          newExpanded.add(currentItem.path);
        }
        setState({ ...state, expanded: newExpanded });
      } else if (state.selected.size > 0) {
        // Done
        done(Array.from(state.selected));
      }
    } else if (isSpaceKey(key)) {
      // Toggle selection
      const currentItem = items[state.cursor];
      if (currentItem) {
        const newSelected = new Set(state.selected);
        const newExpanded = new Set(state.expanded);
        if (newSelected.has(currentItem.path)) {
          newSelected.delete(currentItem.path);
        } else {
          newSelected.add(currentItem.path);
          // Collapse when selected (selected items can't be expanded)
          newExpanded.delete(currentItem.path);
        }
        setState({ ...state, selected: newSelected, expanded: newExpanded });
      }
    } else if (isUpKey(key)) {
      const newCursor = state.cursor > 0 ? state.cursor - 1 : items.length - 1;
      setState({ ...state, cursor: newCursor });
    } else if (isDownKey(key)) {
      const newCursor = state.cursor < items.length - 1 ? state.cursor + 1 : 0;
      setState({ ...state, cursor: newCursor });
    } else if (key.name === 'right') {
      // Right arrow: expand
      const currentItem = items[state.cursor];
      if (currentItem && !state.selected.has(currentItem.path) && currentItem.hasChildren) {
        const newExpanded = new Set(state.expanded);
        newExpanded.add(currentItem.path);
        setState({ ...state, expanded: newExpanded });
      }
    } else if (key.name === 'left') {
      // Left arrow: collapse or go to parent
      const currentItem = items[state.cursor];
      if (currentItem) {
        if (state.expanded.has(currentItem.path)) {
          const newExpanded = new Set(state.expanded);
          newExpanded.delete(currentItem.path);
          setState({ ...state, expanded: newExpanded });
        } else if (currentItem.depth > 0) {
          // Find parent and move cursor there
          const parentPath = dirname(currentItem.path);
          const parentIndex = items.findIndex((i) => i.path === parentPath);
          if (parentIndex >= 0) {
            setState({ ...state, cursor: parentIndex });
          }
        }
      }
    } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      // Cancel
      done([]);
    } else if (key.ctrl && key.name === 'd') {
      // Ctrl+D: done
      done(Array.from(state.selected));
    }
  });

  // Render
  const lines: string[] = [];
  lines.push(`${theme.style.message(config.message, 'idle')}`);
  lines.push(pc.dim(`  ↑↓ navigate  Space select  → expand  ← collapse  Enter confirm`));
  lines.push('');

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const isCurrent = i === state.cursor;
    const isSelected = state.selected.has(item.path);

    const indent = '  '.repeat(item.depth);
    const prefix = isCurrent ? pc.cyan('❯ ') : '  ';
    const checkbox = isSelected ? pc.green('●') : pc.dim('○');

    let expandIndicator = '  ';
    if (!isSelected && item.hasChildren) {
      expandIndicator = item.isExpanded ? pc.dim('▼ ') : pc.dim('▶ ');
    }

    const nameDisplay = isSelected ? pc.green(item.name) : isCurrent ? pc.cyan(item.name) : item.name;

    lines.push(`${prefix}${indent}${checkbox} ${expandIndicator}${nameDisplay}`);
  }

  if (items.length === 0) {
    lines.push(pc.dim('  No directories found'));
  }

  lines.push('');
  lines.push(pc.dim(`  Selected: ${state.selected.size} ${state.selected.size === 1 ? 'path' : 'paths'}`));

  return lines.join('\n');
});
