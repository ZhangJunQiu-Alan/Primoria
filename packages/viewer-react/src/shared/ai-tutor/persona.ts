import type { ViewerAiTutorPersona } from '@/shared/api/viewer/types';
import type { ViewerLanguage } from '@/shared/i18n/locale';

export const DEFAULT_AI_TUTOR_PERSONA: ViewerAiTutorPersona = 'gentle';

type HomeCompanionActionCopy = {
  label: string;
  subtitle: string;
};

export type AiTutorPersonaDefinition = {
  label: string;
  badge: string;
  description: string;
  examplePrompt: string;
  welcomeTitle: string;
  welcomeBody: string;
  prompts: string[];
  homeTutorCta: string;
  homeCourseDescriptionFallback: string;
  homeNextStepMessage: (durationLabel?: string | null) => string;
  homeSyncingMessage: string;
  homeCompanionTitle: string;
  homeCompanionRecommendPrompt: string;
  homeCompanionRecommendChoices: {
    easier: string;
    same: string;
    harder: string;
  };
  homeCompanionActions: {
    quiz: HomeCompanionActionCopy;
    mindmap: HomeCompanionActionCopy;
    notes: HomeCompanionActionCopy;
    recommend: HomeCompanionActionCopy;
  };
  homeCompanionMessages: {
    noCourse: string;
    review: (courseTitle?: string | null, inactiveDays?: number | null) => string;
    finish: (nextLessonTitle?: string | null) => string;
    continue: (nextLessonTitle?: string | null) => string;
    firstStep: (nextLessonTitle?: string | null) => string;
    default: (nextLessonTitle?: string | null) => string;
  };
};

const zhCompanionActions = {
  quiz: {
    label: '生成练习题',
    subtitle: '围绕当前课程做一次小测',
  },
  mindmap: {
    label: '生成思维导图',
    subtitle: '把重点压成可回顾结构',
  },
  notes: {
    label: '查看课程相关笔记',
    subtitle: '带着课程主题去社区笔记',
  },
  recommend: {
    label: '推荐下一门课程',
    subtitle: '按这门课的体感继续选路',
  },
} satisfies AiTutorPersonaDefinition['homeCompanionActions'];

const enCompanionActions = {
  quiz: {
    label: 'Generate quiz',
    subtitle: 'Create a short practice set for this course',
  },
  mindmap: {
    label: 'Generate mind map',
    subtitle: 'Compress the key points into one structure',
  },
  notes: {
    label: 'Open course notes',
    subtitle: 'Carry this course into Community notes',
  },
  recommend: {
    label: 'Recommend next course',
    subtitle: 'Choose the next track by difficulty feel',
  },
} satisfies AiTutorPersonaDefinition['homeCompanionActions'];

const personaDictionary: Record<ViewerLanguage, Record<ViewerAiTutorPersona, AiTutorPersonaDefinition>> = {
  'zh-CN': {
    gentle: {
      label: '温柔',
      badge: '温柔引导',
      description: '低压、安抚、先帮你把开始门槛降下来，再一点点推进。',
      examplePrompt: '我现在有点乱，可以先带我找到最容易开始的一步吗？',
      welcomeTitle: '你好，我们慢慢把这件事理顺。',
      welcomeBody:
        '我会先帮你把目标收小、把压力降下来，再一起找到最容易开始的一步。你可以先把困惑丢给我，我来陪你拆开。',
      prompts: [
        '我现在有点不知道从哪开始，可以先带我起步吗？',
        '请把这段内容讲得更轻松一点，不要一下给太多。',
        '帮我把今天的任务收成一个容易完成的小目标。',
      ],
      homeTutorCta: '先和温柔导师聊聊',
      homeCourseDescriptionFallback:
        '继续沿着当前课程推进。首页会替你定位下一步，再由温柔导师把重点收拢成更容易开始的一步。',
      homeNextStepMessage: (durationLabel) =>
        `建议先完成这一步，再让温柔导师帮你把重点整理得更清楚。${durationLabel ? `预计 ${durationLabel}。` : ''}`,
      homeSyncingMessage: '正在为你定位第一节未完成的课时。',
      homeCompanionTitle: '导师观察',
      homeCompanionRecommendPrompt: '这门课现在对你来说更像哪一种？',
      homeCompanionRecommendChoices: {
        easier: '有点难',
        same: '刚刚好',
        harder: '太简单',
      },
      homeCompanionActions: zhCompanionActions,
      homeCompanionMessages: {
        noCourse:
          '你还没有锁定当前课程。先去课程库挑一门愿意开始的课，我再帮你把第一步变轻一点。',
        review: (courseTitle, inactiveDays) =>
          `${courseTitle ? `《${courseTitle}》` : '这门课'}已经${inactiveDays ? `${inactiveDays}天` : '有一阵子'}没回来看看了。先做一次轻量复习，把记忆接回来，再继续会更稳。`,
        finish: (nextLessonTitle) =>
          `你已经快收尾了。先把${nextLessonTitle ? `「${nextLessonTitle}」` : '下一步'}完成，这门课会更完整。`,
        continue: (nextLessonTitle) =>
          `你最近还保持着节奏，适合顺着主线继续。先推进${nextLessonTitle ? `「${nextLessonTitle}」` : '下一步'}，别一下分太多支线。`,
        firstStep: (nextLessonTitle) =>
          `这门课才刚起步。先完成${nextLessonTitle ? `「${nextLessonTitle}」` : '第一小步'}，让自己进入状态，比一次学很多更重要。`,
        default: (nextLessonTitle) =>
          `今天适合回到当前课程看一眼进度。我可以继续帮你把${nextLessonTitle ? `「${nextLessonTitle}」` : '下一步'}收成更容易开始的一步。`,
      },
    },
    socratic: {
      label: '苏格拉底',
      badge: '追问引导',
      description: '先用一个问题帮你想清楚，再给结论和结构，不直接替你跳步。',
      examplePrompt: '不要直接告诉我答案，先用一个问题带我想一遍。',
      welcomeTitle: '你好，我们先把问题想清楚。',
      welcomeBody:
        '我会优先用一个关键问题帮你理清思路，再补上结论、结构和下一步。适合你想真正想明白，而不是只想拿到答案的时候。',
      prompts: [
        '不要直接告诉我答案，先用一个问题带我想一遍。',
        '请像导师一样追问我，帮我找到我真正没想清楚的点。',
        '把这个概念拆开，但每次先给我一个思考问题。',
      ],
      homeTutorCta: '先和导师理清问题',
      homeCourseDescriptionFallback:
        '继续沿着当前课程推进。首页会替你定位下一步，再由导师用一个问题帮你把关键点想清楚。',
      homeNextStepMessage: (durationLabel) =>
        `建议先完成这一步，再让导师先用一个问题带你理清关键点。${durationLabel ? `预计 ${durationLabel}。` : ''}`,
      homeSyncingMessage: '正在为你定位最适合继续的那一步。',
      homeCompanionTitle: '导师观察',
      homeCompanionRecommendPrompt: '这门课现在的难度，更像下面哪一种？',
      homeCompanionRecommendChoices: {
        easier: '有点难',
        same: '刚刚好',
        harder: '太简单',
      },
      homeCompanionActions: zhCompanionActions,
      homeCompanionMessages: {
        noCourse:
          '你还没有锁定当前课程。先问自己一个问题：你现在最愿意开始的是哪门课？选定以后，我再帮你往下拆。',
        review: (courseTitle, inactiveDays) =>
          `${courseTitle ? `《${courseTitle}》` : '这门课'}已经停了${inactiveDays ? `${inactiveDays}天` : '一段时间'}。现在你还记得它最核心的一个概念是什么吗？先复习它，再继续。`,
        finish: (nextLessonTitle) =>
          `你已经接近收尾。继续前先想一想：${nextLessonTitle ? `「${nextLessonTitle}」` : '下一步'}和前面内容真正连起来的关键是什么？`,
        continue: (nextLessonTitle) =>
          `你最近还在推进主线。继续前先问自己：${nextLessonTitle ? `「${nextLessonTitle}」` : '下一课'}里，你最想确认的是哪个点？`,
        firstStep: (nextLessonTitle) =>
          `这门课还在起步阶段。先问一个问题：${nextLessonTitle ? `「${nextLessonTitle}」` : '第一小步'}里，你最不确定的到底是哪一句或哪一个概念？`,
        default: (nextLessonTitle) =>
          `先回到当前课程看一眼。你今天最需要澄清的，是${nextLessonTitle ? `「${nextLessonTitle}」里的关键点` : '概念、步骤还是例题'}？`,
      },
    },
    coach: {
      label: '教练',
      badge: '推进模式',
      description: '直接、目标导向、强调现在就做什么和怎样形成完成感。',
      examplePrompt: '按 20 分钟给我一个可以执行的学习冲刺计划。',
      welcomeTitle: '你好，今天我们直接推进主线。',
      welcomeBody:
        '我会直接帮你压缩目标、明确下一步、卡住节奏。适合你想少犹豫一点，尽快进入执行状态的时候。',
      prompts: [
        '按 20 分钟给我一个可以执行的学习冲刺计划。',
        '别讲太虚，直接告诉我现在先做什么。',
        '把这段内容压成 3 个要点和 1 个立即行动。',
      ],
      homeTutorCta: '让导师给我下一步',
      homeCourseDescriptionFallback:
        '继续沿着当前课程推进。首页会替你定位下一步，再由导师把重点压成清晰的下一步行动。',
      homeNextStepMessage: (durationLabel) =>
        `先完成这一步，再让导师把重点压成下一步行动。${durationLabel ? `预计 ${durationLabel}。` : ''}`,
      homeSyncingMessage: '正在为你锁定接下来最该完成的一步。',
      homeCompanionTitle: '训练提示',
      homeCompanionRecommendPrompt: '这门课现在的体感，最接近哪一种？',
      homeCompanionRecommendChoices: {
        easier: '有点难',
        same: '刚刚好',
        harder: '太简单',
      },
      homeCompanionActions: zhCompanionActions,
      homeCompanionMessages: {
        noCourse:
          '你还没有当前课程。先选一门课，锁定主线，再开始推进。',
        review: (courseTitle, inactiveDays) =>
          `${courseTitle ? `《${courseTitle}》` : '这门课'}已经停了${inactiveDays ? `${inactiveDays}天` : '一阵子'}。别空转，先做一次复习，把主线接回来。`,
        finish: (nextLessonTitle) =>
          `现在正适合收尾冲刺。先拿下${nextLessonTitle ? `「${nextLessonTitle}」` : '下一步'}，把这门课推进到更完整的状态。`,
        continue: (nextLessonTitle) =>
          `节奏还在，直接继续主线。先做${nextLessonTitle ? `「${nextLessonTitle}」` : '下一步'}，别分心。`,
        firstStep: (nextLessonTitle) =>
          `这门课还在前段。先把${nextLessonTitle ? `「${nextLessonTitle}」` : '第一小步'}做完，先建立动作感。`,
        default: (nextLessonTitle) =>
          `回到当前课程，先完成${nextLessonTitle ? `「${nextLessonTitle}」` : '下一步'}，再考虑扩展。`,
      },
    },
  },
  en: {
    gentle: {
      label: 'Gentle',
      badge: 'Gentle guide',
      description: 'Calm and low-pressure. Start by making the work feel smaller and easier.',
      examplePrompt: 'I feel a bit scattered. Can you help me find the easiest first step?',
      welcomeTitle: 'Hello. Let’s make this feel lighter first.',
      welcomeBody:
        'I will help shrink the goal, lower the pressure, and find the easiest place to begin. Start with whatever feels messy, and I will help you sort it out.',
      prompts: [
        'I am not sure where to start. Can you help me begin gently?',
        'Explain this in a lighter way without giving me too much at once.',
        'Turn today’s plan into one small goal I can actually finish.',
      ],
      homeTutorCta: 'Talk to the gentle tutor',
      homeCourseDescriptionFallback:
        'Keep moving through the current course. Home will locate the next step, then the gentle tutor can compress the key points into something easier to start.',
      homeNextStepMessage: (durationLabel) =>
        `Finish this step first, then let the gentle tutor help organize the key points more clearly.${durationLabel ? ` Estimated ${durationLabel}.` : ''}`,
      homeSyncingMessage: 'Locating the first unfinished lesson for you.',
      homeCompanionTitle: 'Tutor note',
      homeCompanionRecommendPrompt: 'How does this course feel right now?',
      homeCompanionRecommendChoices: {
        easier: 'A bit hard',
        same: 'Just right',
        harder: 'Too easy',
      },
      homeCompanionActions: enCompanionActions,
      homeCompanionMessages: {
        noCourse:
          'You do not have a current course yet. Pick one from the library first, and I will help make the first step feel lighter.',
        review: (courseTitle, inactiveDays) =>
          `${courseTitle ? `"${courseTitle}"` : 'This course'} has been quiet for ${inactiveDays ? `${inactiveDays} days` : 'a while'}. Start with a light review, then continue once the memory comes back.`,
        finish: (nextLessonTitle) =>
          `You are close to the finish. Complete ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the next step'} and this course will feel much more complete.`,
        continue: (nextLessonTitle) =>
          `Your momentum is still here. Stay on the main track and keep moving through ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the next step'}.`,
        firstStep: (nextLessonTitle) =>
          `This course is still in the opening stretch. Finish ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the first small step'} before trying to carry too much at once.`,
        default: (nextLessonTitle) =>
          `Today is a good day to return to the current course. I can shrink ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the next step'} into something easier to start.`,
      },
    },
    socratic: {
      label: 'Socratic',
      badge: 'Question-first',
      description: 'Lead with one sharp question, then help the learner reason their way through.',
      examplePrompt: 'Do not tell me the answer first. Ask one question to guide my thinking.',
      welcomeTitle: 'Hello. Let’s think the problem through first.',
      welcomeBody:
        'I will usually start with one key question, help you clarify the idea, then add structure and a conclusion. This mode is best when you want to really understand, not just receive an answer.',
      prompts: [
        'Do not tell me the answer first. Ask one question to guide my thinking.',
        'Help me uncover what I have not actually understood yet.',
        'Break this concept down, but start each step with one question.',
      ],
      homeTutorCta: 'Clarify it with the tutor',
      homeCourseDescriptionFallback:
        'Keep moving through the current course. Home will locate the next step, then the tutor can use one question to help you think the key idea through.',
      homeNextStepMessage: (durationLabel) =>
        `Finish this step first, then let the tutor guide you with one question before the explanation.${durationLabel ? ` Estimated ${durationLabel}.` : ''}`,
      homeSyncingMessage: 'Locating the most meaningful next step for you.',
      homeCompanionTitle: 'Tutor note',
      homeCompanionRecommendPrompt: 'Which option best matches the difficulty feel right now?',
      homeCompanionRecommendChoices: {
        easier: 'A bit hard',
        same: 'Just right',
        harder: 'Too easy',
      },
      homeCompanionActions: enCompanionActions,
      homeCompanionMessages: {
        noCourse:
          'You have not locked a current course yet. Start with one question: which course are you actually willing to begin? Once you choose, I will help unpack it.',
        review: (courseTitle, inactiveDays) =>
          `${courseTitle ? `"${courseTitle}"` : 'This course'} has been paused for ${inactiveDays ? `${inactiveDays} days` : 'a while'}. What is the single core idea you still remember? Review that first, then continue.`,
        finish: (nextLessonTitle) =>
          `You are close to the finish. Before continuing, ask yourself: what is the key link between ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the next step'} and the earlier material?`,
        continue: (nextLessonTitle) =>
          `You are still moving on the main track. Before continuing, ask: what is the one point you want to confirm in ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the next lesson'}?`,
        firstStep: (nextLessonTitle) =>
          `This course is still in the opening phase. Start with one question: what exactly feels unclear inside ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the first step'}?`,
        default: (nextLessonTitle) =>
          `Take one look at the current course. What do you most need to clarify today: a concept, a step, or ${nextLessonTitle ? `"${nextLessonTitle}"` : 'an example'}?`,
      },
    },
    coach: {
      label: 'Coach',
      badge: 'Execution mode',
      description: 'Direct and goal-oriented. Focus on the next action and visible progress.',
      examplePrompt: 'Give me a 20-minute study sprint plan I can execute right now.',
      welcomeTitle: 'Hello. Let’s push the main track forward today.',
      welcomeBody:
        'I will keep things direct: compress the goal, name the next step, and keep you moving. This mode works best when you want less hesitation and more execution.',
      prompts: [
        'Give me a 20-minute study sprint plan I can execute right now.',
        'Skip the fluff and tell me what to do first.',
        'Compress this into 3 key points and 1 immediate action.',
      ],
      homeTutorCta: 'Get the next step',
      homeCourseDescriptionFallback:
        'Keep moving through the current course. Home will locate the next step, then the tutor can compress the key points into a clear action.',
      homeNextStepMessage: (durationLabel) =>
        `Finish this step first, then let the tutor turn the key points into the next action.${durationLabel ? ` Estimated ${durationLabel}.` : ''}`,
      homeSyncingMessage: 'Locking onto the most important next step now.',
      homeCompanionTitle: 'Coach note',
      homeCompanionRecommendPrompt: 'How does this course feel right now?',
      homeCompanionRecommendChoices: {
        easier: 'A bit hard',
        same: 'Just right',
        harder: 'Too easy',
      },
      homeCompanionActions: enCompanionActions,
      homeCompanionMessages: {
        noCourse:
          'You do not have a current course yet. Choose one and lock the main track first.',
        review: (courseTitle, inactiveDays) =>
          `${courseTitle ? `"${courseTitle}"` : 'This course'} has been idle for ${inactiveDays ? `${inactiveDays} days` : 'a while'}. Do not drift, run a review first and reconnect the main line.`,
        finish: (nextLessonTitle) =>
          `This is a good moment for a finishing push. Take ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the next step'} now and move the course toward completion.`,
        continue: (nextLessonTitle) =>
          `Momentum is still alive. Stay on the main track and do ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the next step'} now.`,
        firstStep: (nextLessonTitle) =>
          `This course is still early. Complete ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the first small step'} and build motion first.`,
        default: (nextLessonTitle) =>
          `Return to the current course. Finish ${nextLessonTitle ? `"${nextLessonTitle}"` : 'the next step'} before you expand the scope.`,
      },
    },
  },
};

export function normalizeAiTutorPersona(value: unknown): ViewerAiTutorPersona {
  return value === 'socratic' || value === 'coach' || value === 'gentle' ? value : DEFAULT_AI_TUTOR_PERSONA;
}

export function getAiTutorPersonaDefinition(persona: ViewerAiTutorPersona, language: ViewerLanguage) {
  return personaDictionary[language][persona];
}

export function getAiTutorPersonaOptions(language: ViewerLanguage) {
  return (['gentle', 'socratic', 'coach'] as const).map((persona) => ({
    key: persona,
    ...getAiTutorPersonaDefinition(persona, language),
  }));
}
