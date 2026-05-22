"use client";

import type {
  AnalogyBlock,
  CodeBlock,
  CourseBlock,
  TextBlock,
  TransferBlock,
  VisualBlock,
} from "@/lib/courses/types";
import { WidgetRenderer } from "@/components/generative-ui/widget-renderer";

export function BlockRenderer({ block }: { block: CourseBlock }) {
  if (block.type === "text") return <TextBlockView block={block} />;
  if (block.type === "analogy") return <AnalogyBlockView block={block} />;
  if (block.type === "transfer") return <TransferBlockView block={block} />;
  if (block.type === "visual") return <VisualBlockView block={block} />;
  if (block.type === "code") return <CodeBlockView block={block} />;
  return null;
}

function BlockShell({
  kind,
  title,
  children,
}: {
  kind: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`course-block course-block-${kind}`}>
      <div className="course-block-meta">
        <span className={`course-block-tag course-block-tag-${kind}`}>{kind}</span>
        {title ? <strong>{title}</strong> : null}
      </div>
      <div className="course-block-body">{children}</div>
    </div>
  );
}

function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <BlockShell kind="text" title={block.title}>
      <div className="course-block-text">
        {block.markdown.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </BlockShell>
  );
}

function AnalogyBlockView({ block }: { block: AnalogyBlock }) {
  return (
    <BlockShell kind="analogy" title={block.title}>
      <div className="course-block-analogy">
        <div className="course-analogy-pair">
          <span className="course-analogy-side">
            <em>Familiar</em>
            <strong>{block.source}</strong>
          </span>
          <span className="course-analogy-arrow">≈</span>
          <span className="course-analogy-side">
            <em>Target</em>
            <strong>{block.target}</strong>
          </span>
        </div>
        <p className="course-analogy-mapping">{block.mapping}</p>
      </div>
    </BlockShell>
  );
}

function TransferBlockView({ block }: { block: TransferBlock }) {
  return (
    <BlockShell kind="transfer" title={block.title}>
      <div className="course-block-transfer">
        <span className="course-transfer-line">
          <strong>{block.fromDomain}</strong>
          <span>→</span>
          <strong>{block.toDomain}</strong>
        </span>
        <p>{block.explanation}</p>
        <p className="course-transfer-example">
          <em>Example.</em> {block.example}
        </p>
      </div>
    </BlockShell>
  );
}

function VisualBlockView({ block }: { block: VisualBlock }) {
  return (
    <BlockShell kind="visual" title={block.title}>
      <p className="course-block-text course-visual-caption">{block.description}</p>
      <WidgetRenderer title={block.title ?? "Visual"} description={block.description} html={block.html} />
    </BlockShell>
  );
}

function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <BlockShell kind="code" title={block.title}>
      <p className="course-block-text">{block.explanation}</p>
      <pre className="code-card course-code">
        <span className="course-code-lang">{block.language}</span>
        <code>{block.code}</code>
      </pre>
    </BlockShell>
  );
}
