import type { ExecutableToolManifest, ToolRendererRegistration } from "@primoria/contracts/agent";

export class ToolRegistry {
  private readonly tools = new Map<string, ExecutableToolManifest>();

  register(tool: ExecutableToolManifest): ExecutableToolManifest {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    return tool;
  }

  get(name: string): ExecutableToolManifest | undefined {
    return this.tools.get(name);
  }

  list(): ExecutableToolManifest[] {
    return Array.from(this.tools.values());
  }

  select(names: string[]): ExecutableToolManifest[] {
    const selected: ExecutableToolManifest[] = [];
    for (const name of names) {
      const tool = this.tools.get(name);
      if (tool) selected.push(tool);
    }
    return selected;
  }
}

export function createToolRegistry(tools: ExecutableToolManifest[] = []) {
  const registry = new ToolRegistry();
  for (const tool of tools) registry.register(tool);
  return registry;
}

export class ToolRendererRegistry {
  private readonly renderers = new Map<string, ToolRendererRegistration>();

  register(renderer: ToolRendererRegistration): ToolRendererRegistration {
    if (this.renderers.has(renderer.key)) {
      throw new Error(`Tool renderer already registered: ${renderer.key}`);
    }
    this.renderers.set(renderer.key, renderer);
    return renderer;
  }

  get(key: string): ToolRendererRegistration | undefined {
    return this.renderers.get(key);
  }

  findForTool(toolName: string): ToolRendererRegistration | undefined {
    return this.list().find((renderer) => renderer.toolName === toolName);
  }

  findForArtifact(artifactType: string): ToolRendererRegistration | undefined {
    return this.list().find((renderer) => renderer.artifactType === artifactType);
  }

  list(): ToolRendererRegistration[] {
    return Array.from(this.renderers.values());
  }
}

export function createToolRendererRegistry(renderers: ToolRendererRegistration[] = []) {
  const registry = new ToolRendererRegistry();
  for (const renderer of renderers) registry.register(renderer);
  return registry;
}
