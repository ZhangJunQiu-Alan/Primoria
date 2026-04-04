import { useAppDispatch, useAppSelector } from '@/store';
import { updateSettings } from '@/store/editorSlice';
import { FormField, Input, Select } from '../FormField';

const FONT_OPTIONS = [
  { value: '', label: 'System default' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Source Code Pro', label: 'Source Code Pro (mono)' },
];

export function CourseSettingsPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.editor.draft?.settings ?? {});

  return (
    <div className="space-y-4">
      <FormField label="Theme">
        <Select
          value={settings.theme ?? 'light'}
          onChange={(e) =>
            dispatch(updateSettings({ theme: e.target.value as 'light' | 'dark' }))
          }
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </FormField>

      <FormField label="Primary colour">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={settings.primaryColor ?? '#7c3aed'}
            onChange={(e) => dispatch(updateSettings({ primaryColor: e.target.value }))}
            className="h-8 w-12 rounded border cursor-pointer bg-transparent"
          />
          <Input
            value={settings.primaryColor ?? ''}
            onChange={(e) => dispatch(updateSettings({ primaryColor: e.target.value }))}
            placeholder="#7c3aed"
            className="flex-1 font-mono"
          />
        </div>
      </FormField>

      <FormField label="Font family">
        <Select
          value={settings.fontFamily ?? ''}
          onChange={(e) => dispatch(updateSettings({ fontFamily: e.target.value || undefined }))}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
        {settings.fontFamily && (
          <p className="mt-1 text-sm" style={{ fontFamily: settings.fontFamily }}>
            The quick brown fox jumps over the lazy dog
          </p>
        )}
      </FormField>
    </div>
  );
}
