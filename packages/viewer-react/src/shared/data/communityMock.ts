export type CommunityMessage = {
  id: string;
  author: string;
  body: string;
};

export type CommunityConversation = {
  id: string;
  title: string;
  preview: string;
  messages: CommunityMessage[];
};

export type CommunityStudyRoom = {
  id: string;
  name: string;
  members: number;
  status: string;
};

export type CommunityTrendingItem = {
  id: string;
  title: string;
  likes: number;
  comments: number;
};

export type CommunityNote = {
  id: string;
  title: string;
  body: string;
};

export const communitySections = ['Dashboard', 'Our Study', 'Messages', 'Trending', 'Notes'] as const;

export const communityConversations: CommunityConversation[] = [
  {
    id: 'conv-1',
    title: 'React learner squad',
    preview: 'Did everyone finish the lesson runtime task?',
    messages: [
      { id: 'm-1', author: 'Mia', body: 'Did everyone finish the lesson runtime task?' },
      { id: 'm-2', author: 'Noah', body: 'I am on the result screen now.' },
    ],
  },
  {
    id: 'conv-2',
    title: 'Physics review group',
    preview: 'Let’s compare our quiz answers tonight.',
    messages: [{ id: 'm-3', author: 'Ava', body: 'Let’s compare our quiz answers tonight.' }],
  },
];

export const communityStudyRooms: CommunityStudyRoom[] = [
  { id: 'room-1', name: 'Weekly build review', members: 4, status: 'Open now' },
  { id: 'room-2', name: 'Physics sprint', members: 3, status: 'Starts in 20m' },
];

export const communityTrending: CommunityTrendingItem[] = [
  {
    id: 'trend-1',
    title: 'How should the viewer shell handle role redirects?',
    likes: 14,
    comments: 5,
  },
  {
    id: 'trend-2',
    title: 'Best way to keep the community workspace mock-first?',
    likes: 9,
    comments: 2,
  },
];

export const communityNotes: CommunityNote[] = [
  { id: 'note-1', title: 'Lesson runtime notes', body: 'Track gating, page reset, and completion summary.' },
];
