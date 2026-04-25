import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { Input, Select } from '../FormField';
import { useSyncedInspectorForm } from '../useSyncedInspectorForm';
import { nanoid } from '@/lib/nanoid';
import type { Block } from '@primoria/schema';

const NODE_TYPES = ['start', 'end', 'process', 'decision', 'io'] as const;

const nodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(NODE_TYPES),
});

const edgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});

const schema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

type FormValues = z.infer<typeof schema>;

interface FunctionFlowPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function FunctionFlowPanel({ block, lessonId, pageId }: FunctionFlowPanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as {
    nodes?: Array<{ id: string; label: string; type: string }>;
    edges?: Array<{ id: string; from: string; to: string; label?: string }>;
  };
  const formValues: FormValues = {
    nodes: (c.nodes as FormValues['nodes']) ?? [],
    edges: (c.edges as FormValues['edges']) ?? [],
  };

  const { register, watch, control, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: formValues,
  });

  const { fields: nodeFields, append: appendNode, remove: removeNode } = useFieldArray({
    control,
    name: 'nodes',
  });
  const { fields: edgeFields, append: appendEdge, remove: removeEdge } = useFieldArray({
    control,
    name: 'edges',
  });

  useSyncedInspectorForm({
    entityKey: block.id,
    sourceValues: formValues,
    reset,
    watch,
    onChange: (values) => {
      dispatch(updateBlock({ lessonId, pageId, block: { ...block, content: values } }));
    },
  });

  const nodes = watch('nodes');

  return (
    <div className="space-y-5">
      {/* Nodes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Nodes
          </div>
          <button
            type="button"
            onClick={() => appendNode({ id: nanoid(8), label: '', type: 'process' })}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add node
          </button>
        </div>
        <div className="space-y-2">
          {nodeFields.map((field, i) => (
            <div key={field.id} className="flex gap-2 items-center">
              <Select {...register(`nodes.${i}.type`)} className="w-28 shrink-0">
                {NODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <Input
                {...register(`nodes.${i}.label`)}
                placeholder="Label"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeNode(i)}
                className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {nodeFields.length === 0 && (
            <p className="text-xs text-muted-foreground">No nodes yet.</p>
          )}
        </div>
      </div>

      {/* Edges */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Edges
          </div>
          <button
            type="button"
            onClick={() => appendEdge({ id: nanoid(8), from: '', to: '', label: '' })}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            disabled={nodes.length < 2}
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add edge
          </button>
        </div>
        <div className="space-y-2">
          {edgeFields.map((field, i) => (
            <div key={field.id} className="rounded-md border p-2 space-y-2">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <Select {...register(`edges.${i}.from`)}>
                  <option value="">From…</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label || n.id}
                    </option>
                  ))}
                </Select>
                <span className="text-muted-foreground text-xs">→</span>
                <Select {...register(`edges.${i}.to`)}>
                  <option value="">To…</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label || n.id}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  {...register(`edges.${i}.label`)}
                  placeholder="Label (optional)"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeEdge(i)}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {edgeFields.length === 0 && (
            <p className="text-xs text-muted-foreground">No edges yet.</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Full graph canvas (Konva) coming in Phase 5.
      </p>
    </div>
  );
}
