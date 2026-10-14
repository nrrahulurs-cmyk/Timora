"use client";

import * as React from "react";

interface TimoMarkdownProps {
  content: string;
  className?: string;
}

/**
 * High-performance, lightweight markdown parser for Timo AI Companion.
 * Beautifully renders:
 * - Markdown tables into styled HTML tables with frosted glass headers
 * - Headers (###, ##) into styled subheadings with icons
 * - Bold text (**text**)
 * - Code snippets (`code`)
 * - Bullet lists (- item)
 * - Numbered lists (1. item)
 * Zero external markdown parser dependencies.
 */
export function TimoMarkdown({ content, className = "" }: TimoMarkdownProps) {
  const elements = React.useMemo(() => {
    return parseMarkdownBlocks(content);
  }, [content]);

  return <div className={`space-y-2.5 text-xs text-slate-800 leading-relaxed ${className}`}>{elements}</div>;
}

function parseMarkdownBlocks(raw: string): React.ReactNode[] {
  const lines = raw.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Table Detection (| col1 | col2 |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        nodes.push(renderTableBlock(tableLines, `table-${i}`));
        continue;
      }
    }

    // 2. Headings (### or ##)
    if (line.startsWith("### ")) {
      nodes.push(
        <h4 key={`h4-${i}`} className="text-xs font-bold text-slate-900 tracking-tight pt-1 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-coral shrink-0" />
          {formatInline(line.replace("### ", ""))}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-slate-900 tracking-tight pt-1.5">
          {formatInline(line.replace("## ", ""))}
        </h3>
      );
      i++;
      continue;
    }

    // 3. Bullet list (- or *)
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const bulletItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        bulletItems.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }

      nodes.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-1 pl-1">
          {bulletItems.map((item, bIdx) => (
            <li key={bIdx} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
              <span className="text-slate-700">{formatInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 4. Numbered list (1. 2. etc.)
    const numMatch = line.trim().match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      const numItems: Array<{ num: string; text: string }> = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^(\d+)\.\s+(.+)$/);
        if (!m) break;
        numItems.push({ num: m[1], text: m[2] });
        i++;
      }

      nodes.push(
        <ol key={`ol-${i}`} className="space-y-1.5 my-1 pl-1">
          {numItems.map((item, nIdx) => (
            <li key={nIdx} className="flex items-start gap-2">
              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 shrink-0 mt-0.5 border border-slate-200/80">
                {item.num}
              </span>
              <span className="text-slate-700 flex-1">{formatInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 5. Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // 6. Regular paragraph
    nodes.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return nodes;
}

/**
 * Render a markdown table into a styled HTML table with frosted glass headers
 */
function renderTableBlock(lines: string[], key: string): React.ReactNode {
  // Parse rows safely: remove leading and trailing pipes, then split by '|'
  const parseRow = (rowStr: string) =>
    rowStr
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const headerCells = parseRow(lines[0]);
  const bodyRows = lines
    .slice(1)
    .filter((l) => {
      const clean = l.replace(/[\s|:-]/g, "");
      return clean.length > 0; // Filter out separator line |---|---|
    })
    .map(parseRow);

  return (
    <div
      key={key}
      className="my-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/90 text-slate-700 font-semibold">
              {headerCells.map((h, idx) => (
                <th key={idx} className="px-3 py-2.5 whitespace-nowrap">
                  {formatInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bodyRows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-indigo-50/30 transition-colors"
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-slate-700 font-normal">
                    {formatInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Format inline markdown: bold, code, em
 */
function formatInline(text: string): React.ReactNode[] {
  // Regex splitting by bold (**...**) and inline code (`...`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 text-slate-800 border border-slate-200/80 font-medium"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} className="italic text-slate-600">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
