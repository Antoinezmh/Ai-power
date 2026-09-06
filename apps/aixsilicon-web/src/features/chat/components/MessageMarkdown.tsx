import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code className="agent-md-inline-code" key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}

export function MessageMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p className="agent-md-p" key={`p-${blocks.length}`}>{inline(paragraph.join('\n'))}</p>);
      paragraph = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push(<pre className="agent-md-codeblock" key={`code-${index}`}><code>{code.join('\n')}</code></pre>);
        code = null;
      } else {
        flushParagraph();
        code = [];
      }
      continue;
    }
    if (code) { code.push(line); continue; }
    const heading = /^(#{2,5})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const Heading = `h${level}` as keyof JSX.IntrinsicElements;
      blocks.push(<Heading className={`agent-md-h${level}`} key={`h-${index}`}>{inline(heading[2])}</Heading>);
    } else if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [line.replace(/^\s*[-*]\s+/, '')];
      while (index + 1 < lines.length && /^\s*[-*]\s+/.test(lines[index + 1])) items.push(lines[++index].replace(/^\s*[-*]\s+/, ''));
      blocks.push(<ul className="agent-md-ul" key={`ul-${index}`}>{items.map((item) => <li key={item}>{inline(item)}</li>)}</ul>);
    } else if (line.trim()) paragraph.push(line);
    else flushParagraph();
  }
  if (code) blocks.push(<pre className="agent-md-codeblock" key="code-end"><code>{code.join('\n')}</code></pre>);
  flushParagraph();
  return <div className="agent-md">{blocks}</div>;
}
