export type Caption = { lines: string[] };
export type Voiceover = {
  id: string;
  shot: string;
  text: string;
  offsetFrames: number;
  captions: Caption[];
};

const caption = (...lines: string[]): Caption => ({ lines });

export const voiceovers: Voiceover[] = [
  { id: 'VO01', shot: 'S01', text: 'There has never been more to learn from.', offsetFrames: 20, captions: [caption('There has never been more to learn from.')] },
  { id: 'VO02', shot: 'S02', text: "What's missing isn't information. It's a path.", offsetFrames: 4, captions: [caption("What's missing isn't information."), caption("It's a path.")] },
  { id: 'VO03', shot: 'S03', text: 'Primoria starts with a single question.', offsetFrames: 15, captions: [caption('Primoria starts with a single question.')] },
  { id: 'VO04', shot: 'S05', text: 'It places your goal on a map of knowledge — where every concept knows what comes first.', offsetFrames: 6, captions: [caption('It places your goal on a map of knowledge'), caption('where every concept knows', 'what comes first.')] },
  { id: 'VO05', shot: 'S06', text: 'What you already know is skipped.', offsetFrames: 25, captions: [caption('What you already know is skipped.')] },
  { id: 'VO06', shot: 'S08', text: "What's left becomes a course built for one learner.", offsetFrames: 6, captions: [caption("What's left becomes a course", 'built for one learner.')] },
  { id: 'VO07', shot: 'S09', text: 'Lessons move step by step — analogies, visuals, code you can run…', offsetFrames: 4, captions: [caption('Lessons move step by step'), caption('analogies, visuals, code you can run…')] },
  { id: 'VO08', shot: 'S10', text: '…and forty-nine interactive models you can touch.', offsetFrames: 12, captions: [caption('and forty-nine interactive models', 'you can touch.')] },
  { id: 'VO09', shot: 'S11', text: 'Your tutor teaches the way you think.', offsetFrames: 24, captions: [caption('Your tutor teaches the way you think.')] },
  { id: 'VO10', shot: 'S12', text: 'Mastery is earned, not assumed.', offsetFrames: 22, captions: [caption('Mastery is earned, not assumed.')] },
  { id: 'VO11', shot: 'S13', text: 'Bring your own lectures — they become a map of your subject.', offsetFrames: 4, captions: [caption('Bring your own lectures'), caption('they become a map of your subject.')] },
  { id: 'VO12', shot: 'S14', text: 'Answers grounded in your materials, with sources.', offsetFrames: 12, captions: [caption('Answers grounded in your materials,', 'with sources.')] },
  { id: 'VO13', shot: 'S16', text: 'Primoria. Every question deserves a path.', offsetFrames: 84, captions: [caption('Primoria.'), caption('Every question deserves a path.')] },
];
