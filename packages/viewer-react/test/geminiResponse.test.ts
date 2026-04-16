import { extractNormalizedGeminiCandidateTexts } from '../../../supabase/functions/_shared/geminiResponse';

describe('extractNormalizedGeminiCandidateTexts', () => {
  it('joins JSON split across multiple Gemini parts', () => {
    const payload = {
      candidates: [
        {
          content: {
            parts: [
              { text: '{"title":"Quiz",' },
              { text: '"questions":[{"prompt":"A?"}]}' },
            ],
          },
        },
      ],
    };

    expect(extractNormalizedGeminiCandidateTexts(payload)).toEqual([
      '{"title":"Quiz","questions":[{"prompt":"A?"}]}',
    ]);
  });

  it('strips fenced json blocks after merging parts', () => {
    const payload = {
      candidates: [
        {
          content: {
            parts: [
              { text: '```json\n{"title":"Mind map",' },
              { text: '"root":{"label":"Physics"}}\n```' },
            ],
          },
        },
      ],
    };

    expect(extractNormalizedGeminiCandidateTexts(payload)).toEqual([
      '{"title":"Mind map","root":{"label":"Physics"}}',
    ]);
  });

  it('skips empty candidates and keeps later valid text', () => {
    const payload = {
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: 'application/json' } }],
          },
        },
        {
          content: {
            parts: [{ text: '{"reply":"hello"}' }],
          },
        },
      ],
    };

    expect(extractNormalizedGeminiCandidateTexts(payload)).toEqual(['{"reply":"hello"}']);
  });
});
