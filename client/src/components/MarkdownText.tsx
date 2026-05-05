import { cn } from "@/lib/utils";

interface MarkdownTextProps {
  text: string;
  className?: string;
}

function parseInline(text: string): (string | JSX.Element)[] {
  const result: (string | JSX.Element)[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      result.push(text.slice(last, match.index));
    }
    if (match[1] !== undefined) {
      result.push(<strong key={key++} className="font-semibold text-foreground">{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      result.push(<em key={key++} className="italic">{match[2]}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) result.push(text.slice(last));
  return result;
}

export function MarkdownText({ text, className }: MarkdownTextProps) {
  const lines = text.split("\n");

  const elements: JSX.Element[] = [];
  let listItems: JSX.Element[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1 my-1.5 ml-1">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<div key={key++} className="h-1.5" />);
      continue;
    }

    // Heading: # or ##
    if (/^#{1,2}\s/.test(trimmed)) {
      flushList();
      const headingText = trimmed.replace(/^#{1,2}\s/, "");
      elements.push(
        <p key={key++} className="font-semibold text-foreground mt-2 mb-0.5 text-[0.85rem]">
          {parseInline(headingText)}
        </p>
      );
      continue;
    }

    // Bullet: - or * or •
    if (/^[-*•]\s/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s/, "");
      listItems.push(
        <li key={key++} className="flex gap-1.5 items-start">
          <span className="mt-[0.35rem] w-1 h-1 rounded-full bg-cyan-400/60 flex-shrink-0" />
          <span>{parseInline(itemText)}</span>
        </li>
      );
      continue;
    }

    // Numbered list: 1. or 2.
    if (/^\d+\.\s/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s/, "");
      const num = trimmed.match(/^(\d+)/)?.[1] ?? "•";
      listItems.push(
        <li key={key++} className="flex gap-1.5 items-start">
          <span className="flex-shrink-0 text-cyan-400/60 font-medium text-xs mt-0.5 w-4">{num}.</span>
          <span>{parseInline(itemText)}</span>
        </li>
      );
      continue;
    }

    // Regular paragraph — flush any open list first
    flushList();
    elements.push(
      <p key={key++} className="leading-relaxed">
        {parseInline(trimmed)}
      </p>
    );
  }

  flushList();

  return (
    <div className={cn("text-sm space-y-0.5", className)}>
      {elements}
    </div>
  );
}
