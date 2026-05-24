import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const markdownComponents: Components = {
  a({ children, ...props }) {
    return (
      <a {...props} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="course-markdown-table-wrap">
        <table {...props}>{children}</table>
      </div>
    );
  },
  pre({ children, ...props }) {
    return (
      <pre {...props} className="course-markdown-pre">
        {children}
      </pre>
    );
  },
  code({ children, className, ...props }) {
    const isInline = !className;
    return (
      <code {...props} className={isInline ? "course-markdown-inline-code" : className}>
        {children}
      </code>
    );
  },
};

export function CourseMarkdown({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={["course-markdown", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

const inlineMarkdownComponents: Components = {
  ...markdownComponents,
  p({ children }) {
    return <>{children}</>;
  },
};

export function CourseInlineMarkdown({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <span className={["course-markdown", "course-markdown-inline", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={inlineMarkdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </span>
  );
}
