import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { useSyncedInspectorForm } from '@/features/editor/properties/useSyncedInspectorForm';

type TestValues = {
  title: string;
};

function TestInspectorForm({
  entityKey,
  sourceValues,
  onChange,
}: {
  entityKey: string;
  sourceValues: TestValues;
  onChange: (values: TestValues) => void;
}) {
  const { register, watch, reset } = useForm<TestValues>({
    defaultValues: sourceValues,
  });

  useSyncedInspectorForm({
    entityKey,
    sourceValues,
    reset,
    watch,
    onChange,
  });

  return <input aria-label="Title" {...register('title')} />;
}

describe('useSyncedInspectorForm', () => {
  it('does not echo local form updates back into a reset loop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <TestInspectorForm
        entityKey="block-1"
        sourceValues={{ title: 'Original' }}
        onChange={onChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Title' });
    await user.clear(input);
    await user.type(input, 'Edited');

    expect(onChange).toHaveBeenLastCalledWith({ title: 'Edited' });
    const localCallCount = onChange.mock.calls.length;

    rerender(
      <TestInspectorForm
        entityKey="block-1"
        sourceValues={{ title: 'Edited' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Edited');
    expect(onChange).toHaveBeenCalledTimes(localCallCount);
  });

  it('resets the form when the external snapshot changes for the same entity', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TestInspectorForm
        entityKey="block-1"
        sourceValues={{ title: 'Original' }}
        onChange={onChange}
      />,
    );

    rerender(
      <TestInspectorForm
        entityKey="block-1"
        sourceValues={{ title: 'Remote overwrite' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Remote overwrite');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('resets the form when switching to a different entity', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TestInspectorForm
        entityKey="block-1"
        sourceValues={{ title: 'First block' }}
        onChange={onChange}
      />,
    );

    rerender(
      <TestInspectorForm
        entityKey="block-2"
        sourceValues={{ title: 'Second block' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Second block');
    expect(onChange).not.toHaveBeenCalled();
  });
});
