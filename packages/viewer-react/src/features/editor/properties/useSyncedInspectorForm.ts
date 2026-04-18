import { useEffect, useRef } from 'react';
import type { FieldValues, UseFormReset, UseFormWatch } from 'react-hook-form';

export function useSyncedInspectorForm<TFormValues extends FieldValues>({
  entityKey,
  sourceValues,
  reset,
  watch,
  onChange,
}: {
  entityKey: string;
  sourceValues: TFormValues;
  reset: UseFormReset<TFormValues>;
  watch: UseFormWatch<TFormValues>;
  onChange: (values: TFormValues) => void;
}) {
  const serializedSource = JSON.stringify(sourceValues);
  const lastAppliedSourceRef = useRef<{ entityKey: string; serialized: string } | null>(null);
  const pendingLocalSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    const nextSnapshot = { entityKey, serialized: serializedSource };
    if (pendingLocalSerializedRef.current === serializedSource) {
      pendingLocalSerializedRef.current = null;
      lastAppliedSourceRef.current = nextSnapshot;
      return;
    }

    if (
      lastAppliedSourceRef.current?.entityKey === entityKey &&
      lastAppliedSourceRef.current?.serialized === serializedSource
    ) {
      return;
    }

    lastAppliedSourceRef.current = nextSnapshot;
    pendingLocalSerializedRef.current = null;
    reset(sourceValues);
  }, [entityKey, reset, serializedSource, sourceValues]);

  useEffect(() => {
    const subscription = watch((rawValues) => {
      const nextValues = rawValues as TFormValues;
      const serializedNext = JSON.stringify(nextValues);

      if (
        lastAppliedSourceRef.current?.entityKey === entityKey &&
        lastAppliedSourceRef.current?.serialized === serializedNext
      ) {
        return;
      }

      pendingLocalSerializedRef.current = serializedNext;
      onChange(nextValues);
    });

    return () => subscription.unsubscribe();
  }, [entityKey, onChange, watch]);
}
