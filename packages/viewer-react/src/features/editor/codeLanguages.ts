export const CODE_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'c', label: 'C / C++' },
  { value: 'go', label: 'Go' },
] as const;

export function getSafeCodeLanguage(value: unknown) {
  const normalized = typeof value === 'string' ? value : '';
  return CODE_LANGUAGES.some((language) => language.value === normalized)
    ? normalized
    : 'python';
}
