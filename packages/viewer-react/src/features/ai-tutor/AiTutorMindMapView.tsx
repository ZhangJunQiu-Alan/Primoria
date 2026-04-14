import type { LegacyMindMapNode } from '@/shared/api/viewer/types';

function nodeTone(depth: number) {
  if (depth === 0) {
    return 'border-[#d3c2a8] bg-[linear-gradient(145deg,#fff8ef_0%,#f1e3cb_100%)] text-[#4a3a2a] shadow-[0_16px_30px_rgba(126,92,56,0.12)]';
  }

  if (depth === 1) {
    return 'border-[#d8d8c8] bg-[linear-gradient(145deg,#f9fbf3_0%,#eef3e1_100%)] text-[#485437]';
  }

  return 'border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] text-[#4d4239]';
}

function LogicChartBranch({
  node,
  depth = 0,
}: {
  node: LegacyMindMapNode;
  depth?: number;
}) {
  const children = node.children ?? [];

  return (
    <div className="flex items-center gap-8">
      <div
        className={`max-w-[18rem] min-w-[10rem] rounded-[22px] border px-4 py-3 text-sm font-semibold leading-6 ${nodeTone(depth)}`}
      >
        {node.label}
      </div>
      {children.length ? (
        <div className="relative flex flex-col gap-4 pl-8 before:absolute before:bottom-4 before:left-0 before:top-4 before:w-px before:bg-[#d9cdbd]">
          {children.map((child) => (
            <div
              key={child.id}
              className="relative before:absolute before:left-[-2rem] before:top-1/2 before:h-px before:w-8 before:bg-[#d9cdbd]"
            >
              <LogicChartBranch node={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AiTutorMindMapView({ root }: { root: LegacyMindMapNode }) {
  return (
    <div className="overflow-auto rounded-[28px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(246,240,229,0.92)_100%)] p-5">
      <div className="inline-flex min-w-full items-start pb-2 pr-8 pt-2">
        <LogicChartBranch node={root} />
      </div>
    </div>
  );
}
