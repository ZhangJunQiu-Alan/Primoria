"use client";

import type {
  AnalogyBlock,
  CodeBlock,
  CourseBlock,
  TextBlock,
  TransferBlock,
  VisualBlock,
} from "@/lib/courses/types";
import { CourseInlineMarkdown, CourseMarkdown } from "@/components/course/course-markdown";
import { WidgetRenderer } from "@/components/generative-ui/widget-renderer";
import { EChartsRenderer } from "@/components/generative-ui/echarts-renderer";
import { MermaidRenderer } from "@/components/generative-ui/mermaid-renderer";
import { PhysicsSceneRenderer } from "@/components/generative-ui/physics-scene-renderer";

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
      <CourseMarkdown markdown={block.markdown} />
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
            <CourseInlineMarkdown markdown={block.source} className="course-analogy-value" />
          </span>
          <span className="course-analogy-arrow">≈</span>
          <span className="course-analogy-side">
            <em>Target</em>
            <CourseInlineMarkdown markdown={block.target} className="course-analogy-value" />
          </span>
        </div>
        <CourseMarkdown markdown={block.mapping} className="course-analogy-mapping" />
      </div>
    </BlockShell>
  );
}

function TransferBlockView({ block }: { block: TransferBlock }) {
  return (
    <BlockShell kind="transfer" title={block.title}>
      <div className="course-block-transfer">
        <span className="course-transfer-line">
          <CourseInlineMarkdown markdown={block.fromDomain} className="course-transfer-domain" />
          <span>→</span>
          <CourseInlineMarkdown markdown={block.toDomain} className="course-transfer-domain" />
        </span>
        <CourseMarkdown markdown={block.explanation} />
        <div className="course-transfer-example">
          <em>Example.</em> <CourseInlineMarkdown markdown={block.example} />
        </div>
      </div>
    </BlockShell>
  );
}

function VisualBlockView({ block }: { block: VisualBlock }) {
  if (block.engine === "echarts" && block.echartsOption) {
    return (
      <BlockShell kind="visual" title={block.title}>
        <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
        <EChartsRenderer artifact={{ type: "echarts_widget", title: block.title ?? "Chart", description: block.description, option: block.echartsOption, height: block.echartsHeight }} />
      </BlockShell>
    );
  }
  if (block.engine === "mermaid" && block.mermaidDefinition) {
    return (
      <BlockShell kind="visual" title={block.title}>
        <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
        <MermaidRenderer artifact={{ type: "mermaid_diagram", title: block.title ?? "Diagram", definition: block.mermaidDefinition }} />
      </BlockShell>
    );
  }
  if (block.engine === "physics" && block.physicsScene) {
    return (
      <BlockShell kind="visual" title={block.title}>
        <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
        <PhysicsSceneRenderer artifact={{ type: "physics_scene", title: block.title ?? "Simulation", description: block.description, scene: block.physicsScene }} />
      </BlockShell>
    );
  }
  return (
    <BlockShell kind="visual" title={block.title}>
      <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
      <WidgetRenderer title={block.title ?? "Visual"} description={block.description} html={block.html ?? ""} />
    </BlockShell>
  );
}

function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <BlockShell kind="code" title={block.title}>
      <CourseMarkdown markdown={block.explanation} className="course-block-text" />
      <pre className="code-card course-code">
        <span className="course-code-lang">{block.language}</span>
        <code>{block.code}</code>
      </pre>
    </BlockShell>
  );
}
