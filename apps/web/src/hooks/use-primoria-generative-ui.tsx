"use client";

import { z } from "zod";
import {
  useComponent,
  useDefaultRenderTool,
  useFrontendTool,
  useRenderTool,
} from "@copilotkit/react-core/v2";
import { WidgetRenderer, WidgetRendererProps } from "@/components/generative-ui/widget-renderer";

const CourseDraftParams = z.object({
  title: z.string(),
  audience: z.string(),
  duration: z.string(),
  modules: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
});

function CourseDraftCard({ title, audience, duration, modules }: z.infer<typeof CourseDraftParams>) {
  return (
    <div className="tool-card">
      <div className="tool-title">
        <span className="tool-dot" />
        <span>Course draft · Ready for review</span>
      </div>
      <div className="visualizer">
        <strong>{title}</strong>
        <span className="tool-note">
          {audience} · {duration}
        </span>
        <div className="chat-list">
          {modules.map((module, index) => (
            <div key={`${module.title}-${index}`} className="chat-item active">
              <strong>
                {index + 1}. {module.title}
              </strong>
              <span>{module.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function usePrimoriaGenerativeUI() {
  useComponent({
    name: "widgetRenderer",
    description:
      "Render interactive HTML/SVG/CSS/JS learning widgets in a sandboxed iframe. Use for visual explanations, simulations, diagrams, charts, and practice widgets.",
    parameters: WidgetRendererProps,
    render: WidgetRenderer,
  });

  useComponent({
    name: "courseDraftCard",
    description: "Render a generated course draft card for review before saving to the course library.",
    parameters: CourseDraftParams,
    render: CourseDraftCard,
  });

  useRenderTool({
    name: "generate_course",
    parameters: CourseDraftParams,
    render: ({ parameters }) => {
      const parsed = CourseDraftParams.safeParse(parameters);
      if (!parsed.success) {
        return (
          <div className="tool-card">
            <div className="tool-title">
              <span className="tool-dot" />
              <span>Course draft · waiting for complete data</span>
            </div>
          </div>
        );
      }

      return <CourseDraftCard {...parsed.data} />;
    },
  });

  useFrontendTool({
    name: "openLibrary",
    description: "Open the learner course library in the web client.",
    parameters: z.object({}),
    handler: async () => {
      // Placeholder: route to /library once that surface exists.
      console.info("openLibrary");
    },
  });

  useDefaultRenderTool({
    render: ({ name, status }) => (
      <div className="tool-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>
            {name} · {status}
          </span>
        </div>
      </div>
    ),
  });
}
