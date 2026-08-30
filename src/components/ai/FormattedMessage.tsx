import React from "react";

interface FormattedMessageProps {
  content: string;
}
export function FormattedMessage({ content }: FormattedMessageProps) {
  if (!content) return null;

  const rawLines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let keyCounter = 0;

  function flushList() {
    if (!currentList) return;
    const isOrdered = currentList.type === "ol";
    elements.push(
      isOrdered ? (
        <ol
          key={`list-${keyCounter++}`}
          className="my-2.5 ml-4 list-decimal space-y-1.5 pl-2 text-sm leading-6 text-slate-800"
        >
          {currentList.items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul
          key={`list-${keyCounter++}`}
          className="my-2.5 ml-4 list-disc space-y-1.5 pl-2 text-sm leading-6 text-slate-800"
        >
          {currentList.items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      ),
    );
    currentList = null;
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h4
          key={`h4-${keyCounter++}`}
          className="mt-3.5 mb-1.5 text-base font-black text-slate-950"
        >
          {renderInline(line.replace(/^###\s+/, ""))}
        </h4>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${keyCounter++}`}
          className="mt-4 mb-2 text-lg font-black text-slate-950"
        >
          {renderInline(line.replace(/^##\s+/, ""))}
        </h3>,
      );
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${keyCounter++}`}
          className="mt-4 mb-2 text-xl font-black text-slate-950"
        >
          {renderInline(line.replace(/^#\s+/, ""))}
        </h2>,
      );
      continue;
    }
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }
    const numberMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numberMatch[1]);
      continue;
    }
    flushList();
    elements.push(
      <p
        key={`p-${keyCounter++}`}
        className="my-2 text-sm leading-6 text-slate-800"
      >
        {renderInline(line)}
      </p>,
    );
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
}
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const segments = text.split(regex);

  segments.forEach((seg, idx) => {
    if (!seg) return;
    if (seg.startsWith("**") && seg.endsWith("**")) {
      parts.push(
        <strong key={idx} className="font-bold text-slate-950">
          {seg.slice(2, -2)}
        </strong>,
      );
    } else if (seg.startsWith("`") && seg.endsWith("`")) {
      parts.push(
        <code
          key={idx}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900 border border-slate-200"
        >
          {seg.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(seg);
    }
  });

  return <>{parts}</>;
}