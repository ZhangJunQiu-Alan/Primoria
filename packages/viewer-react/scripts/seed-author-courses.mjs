import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

await loadRootEnv();

const DEFAULT_COUNT = 3;
const DEFAULT_PASSWORD = process.env.SEED_AUTHOR_PASSWORD?.trim() || 'PrimoriaBatch!2026';
const DEFAULT_TIMEOUT = 30_000;
const PUBLIC_DIR = path.join(repoRoot, 'packages/viewer-react/public');

const BLOCK_TYPES = [
  'text',
  'image',
  'code-block',
  'code-playground',
  'code-execution',
  'function-flow',
  'multiple-choice',
  'fill-blank',
  'true-false',
  'matching',
  'interactive-visual',
  'video',
];

const CourseSchema = z.object({
  $schema: z.string().optional(),
  schema_version: z.string(),
  course_id: z.string(),
  metadata: z.object({
    title: z.string(),
    description: z.string().optional(),
    author: z
      .object({
        userId: z.string(),
        displayName: z.string(),
      })
      .optional(),
    tags: z.array(z.string()).optional(),
    difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    estimated_minutes: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    version: z.string().optional(),
    thumbnail: z.string().optional(),
  }),
  settings: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      primaryColor: z.string().optional(),
      fontFamily: z.string().optional(),
    })
    .optional(),
  lessons: z.array(
    z.object({
      lesson_id: z.string(),
      title: z.string(),
      pages: z.array(
        z.object({
          page_id: z.string(),
          order: z.number(),
          blocks: z.array(
            z.object({
              id: z.string(),
              type: z.enum(BLOCK_TYPES),
              position: z.object({ order: z.number() }),
              style: z
                .object({
                  spacing: z.enum(['none', 'sm', 'md', 'lg']).optional(),
                  alignment: z.enum(['left', 'center', 'right']).optional(),
                  width: z.number().optional(),
                  height: z.number().optional(),
                })
                .optional(),
              visibilityRule: z.enum(['always', 'afterPreviousCorrect']).optional(),
              content: z.record(z.unknown()),
            }),
          ),
        }),
      ),
    }),
  ),
});

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';

const COURSE_SEEDS = [
  {
    index: 1,
    email: 'primoria-seed-author-01@primoria.test',
    displayName: 'Primoria Seed Author 01',
    username: 'primoria-seed-author-01',
    profileBio: 'Seed author account for deterministic batch publishing workflows.',
    courseId: '70000000-0000-0000-0000-000000000001',
    coverAssetPath: 'course-covers/python-debugging-studio.svg',
    course: {
      title: 'Python Debugging Studio',
      description:
        'Build debugging instincts through short Python lessons that combine explanation, quick checks, and code practice.',
      difficulty: 'beginner',
      estimatedMinutes: 125,
      tags: ['python', 'debugging', 'coding'],
      lessons: [
        {
          title: 'Variables and Output',
          introText:
            'Variables give names to values so you can inspect them, print them, and change them without losing track of what each value means.',
          introVisual: { template: 'generic', title: 'Track variables through a simple script' },
          mc: {
            question: 'What is the main reason to store a value in a variable?',
            options: [
              'To make the value easier to reuse and inspect later',
              'To stop the program from running',
              'To remove the need for output statements',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'A variable lets you give a ___ to a value.',
            answer: 'name',
            alternatives: ['label'],
          },
          practice: {
            kind: 'code-block',
            language: 'python',
            code: "student_name = 'Mia'\nscore = 8\nprint(student_name)\nprint(score)\n",
          },
          summaryCheck: {
            statement: 'Printing a variable shows the value currently stored in it.',
            isTrue: true,
          },
        },
        {
          title: 'Branching and Conditions',
          introText:
            'Conditions help a program choose between paths. Clear branching starts with a simple question and a predictable true or false answer.',
          introVisual: { template: 'generic', title: 'Follow the if/else decision path' },
          mc: {
            question: 'When does an if block run?',
            options: [
              'On every line of the program',
              'Only when its condition evaluates to true',
              'Only after a loop finishes',
            ],
            correctIndex: 1,
          },
          fillBlank: {
            template: 'An if statement runs a block when the condition is ___ .',
            answer: 'true',
          },
          practice: {
            kind: 'code-playground',
            language: 'python',
            starterCode:
              "temperature = 31\nif temperature > 30:\n    print('Take water')\nelse:\n    print('You are fine')\n",
          },
          summaryCheck: {
            statement: 'An else block is used to handle the path when the if condition is false.',
            isTrue: true,
          },
        },
        {
          title: 'Loops and Patterns',
          introText:
            'Loops repeat a small set of instructions. The debugging trick is to track what changes and what stays constant on each pass.',
          introVisual: { template: 'generic', title: 'Watch each loop iteration advance' },
          mc: {
            question: 'What is a good first debugging question for a loop?',
            options: [
              'Which variable changes each iteration?',
              'What color should the terminal be?',
              'Can I delete the loop entirely?',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'A loop is useful when the same steps must run ___ times.',
            answer: 'many',
            alternatives: ['multiple'],
          },
          practice: {
            kind: 'matching',
            pairs: [
              ['for i in range(3)', 'Repeats three times'],
              ['break', 'Stops the loop early'],
              ['i += 1', 'Moves a counter forward'],
            ],
          },
          summaryCheck: {
            statement: 'A loop is harder to debug if you do not track how the counter changes.',
            isTrue: true,
          },
        },
        {
          title: 'Functions and Reuse',
          introText:
            'Functions package a repeatable action behind a name. Good debugging starts by checking the inputs, the returned value, and the lines inside the function body.',
          introVisual: { template: 'generic', title: 'See data flow into and out of a function' },
          mc: {
            question: 'Why would you move repeated logic into a function?',
            options: [
              'To make the code easier to reuse and test',
              'To stop variables from existing',
              'To avoid every bug automatically',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'A function can accept input through ___ .',
            answer: 'parameters',
            alternatives: ['arguments'],
          },
          practice: {
            kind: 'code-playground',
            language: 'python',
            starterCode:
              "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('Ava'))\n",
          },
          summaryCheck: {
            statement: 'A function can return a value for the rest of the program to use.',
            isTrue: true,
          },
        },
        {
          title: 'Debugging a Mini Script',
          introText:
            'When a script fails, reduce the problem into checkpoints: inspect inputs, verify each step, and compare the actual output against the expected result.',
          introVisual: { template: 'generic', title: 'Break a script into debug checkpoints' },
          mc: {
            question: 'Which step is most useful when the final output looks wrong?',
            options: [
              'Print intermediate values to see where the result changes',
              'Rename every variable immediately',
              'Delete the output line first',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'A useful debugging habit is to inspect ___ values, not only the final answer.',
            answer: 'intermediate',
          },
          practice: {
            kind: 'code-block',
            language: 'python',
            code:
              "prices = [8, 12, 5]\ntotal = 0\nfor price in prices:\n    total += price\nprint('Total:', total)\n",
          },
          summaryCheck: {
            statement: 'Debugging gets easier when you compare expected behavior with observed behavior step by step.',
            isTrue: true,
          },
        },
      ],
    },
  },
  {
    index: 2,
    email: 'primoria-seed-author-02@primoria.test',
    displayName: 'Primoria Seed Author 02',
    username: 'primoria-seed-author-02',
    profileBio: 'Seed author account for deterministic batch publishing workflows.',
    courseId: '70000000-0000-0000-0000-000000000002',
    coverAssetPath: 'course-covers/physics-motion-forces-lab.svg',
    course: {
      title: 'Physics Motion and Forces Lab',
      description:
        'Use graphs, force diagrams, and short checks to build clearer intuition for motion, acceleration, and energy.',
      difficulty: 'intermediate',
      estimatedMinutes: 125,
      tags: ['physics', 'motion', 'forces'],
      lessons: [
        {
          title: 'Reading Motion Graphs',
          introText:
            'A motion graph becomes easier once you focus on what the axes mean and what a slope tells you about change over time.',
          introVisual: { template: 'generic', title: 'Interpret slope on a motion graph' },
          mc: {
            question: 'On a position-time graph, the slope represents which quantity?',
            options: ['Velocity', 'Mass', 'Temperature'],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'On a position-time graph, a steeper slope means a larger ___ .',
            answer: 'velocity',
            alternatives: ['speed'],
          },
          practice: {
            kind: 'matching',
            pairs: [
              ['Flat line', 'No change in position'],
              ['Positive slope', 'Moving in the positive direction'],
              ['Steeper slope', 'Greater velocity magnitude'],
            ],
          },
          summaryCheck: {
            statement: 'A horizontal line on a position-time graph can represent an object at rest.',
            isTrue: true,
          },
        },
        {
          title: 'Speed and Acceleration',
          introText:
            'Speed tells you how fast motion is happening, while acceleration tells you how quickly the velocity itself is changing.',
          introVisual: { template: 'generic', title: 'Separate speed from acceleration' },
          mc: {
            question: 'What does acceleration describe?',
            options: [
              'A change in velocity over time',
              'The color of a moving object',
              'The amount of force stored in mass',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'Acceleration is the rate of change of ___ .',
            answer: 'velocity',
          },
          practice: {
            kind: 'interactive-visual',
            template: 'generic',
            title: 'Compare steady motion and changing motion',
          },
          summaryCheck: {
            statement: 'An object can have velocity even when its acceleration is zero.',
            isTrue: true,
          },
        },
        {
          title: 'Forces and Free-Body Diagrams',
          introText:
            'Free-body diagrams work best when you isolate one object and only draw forces that truly act on that object.',
          introVisual: { template: 'generic', title: 'Map the forces acting on a single object' },
          mc: {
            question: 'What is the first step in drawing a free-body diagram?',
            options: [
              'Choose the object of interest',
              'Add acceleration arrows first',
              'Calculate energy before identifying forces',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'A free-body diagram should show the forces acting on one ___ .',
            answer: 'object',
            alternatives: ['body'],
          },
          practice: {
            kind: 'matching',
            pairs: [
              ['Weight', 'Acts downward because of gravity'],
              ['Normal force', 'Acts perpendicular to a surface'],
              ['Friction', 'Acts parallel to a surface and resists sliding'],
            ],
          },
          summaryCheck: {
            statement: 'A free-body diagram should include forces that belong to other objects in the scene.',
            isTrue: false,
          },
        },
        {
          title: "Newton's Laws in Action",
          introText:
            "Newton's laws connect force, motion, and inertia. Strong reasoning comes from linking the net force to the resulting acceleration.",
          introVisual: { template: 'generic', title: 'Relate net force to acceleration' },
          mc: {
            question: 'If the net force on an object points right, what can you conclude?',
            options: [
              'Its acceleration points right',
              'Its velocity must point left',
              'Its mass becomes larger',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: "Newton's second law is commonly written as F = m x ___ .",
            answer: 'a',
            alternatives: ['acceleration'],
          },
          practice: {
            kind: 'code-block',
            language: 'python',
            code:
              "net_force = 12\nmass = 3\nacceleration = net_force / mass\nprint('Acceleration:', acceleration)\n",
          },
          summaryCheck: {
            statement: 'Doubling the net force while keeping mass constant doubles the acceleration.',
            isTrue: true,
          },
        },
        {
          title: 'Energy and Transfer',
          introText:
            'Energy methods help when motion changes across height, springs, or collisions. The key is to track where energy starts and where it goes.',
          introVisual: { template: 'generic', title: 'Track energy as it changes form' },
          mc: {
            question: 'When a falling object speeds up with negligible air resistance, gravitational potential energy is mainly converted into what?',
            options: ['Kinetic energy', 'Mass', 'Temperature only'],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'In a simple falling-motion problem, gravitational potential energy can convert into ___ energy.',
            answer: 'kinetic',
          },
          practice: {
            kind: 'interactive-visual',
            template: 'generic',
            title: 'Compare energy at the top and bottom of a track',
          },
          summaryCheck: {
            statement: 'Energy reasoning is useful when you care about states before and after motion, not every force at every instant.',
            isTrue: true,
          },
        },
      ],
    },
  },
  {
    index: 3,
    email: 'primoria-seed-author-03@primoria.test',
    displayName: 'Primoria Seed Author 03',
    username: 'primoria-seed-author-03',
    profileBio: 'Seed author account for deterministic batch publishing workflows.',
    courseId: '70000000-0000-0000-0000-000000000003',
    coverAssetPath: 'course-covers/data-ai-foundations-workshop.svg',
    course: {
      title: 'Data and AI Foundations Workshop',
      description:
        'Learn the core language of data, models, prompting, and safe evaluation through compact, interactive lessons.',
      difficulty: 'intermediate',
      estimatedMinutes: 125,
      tags: ['data', 'ai', 'prompting'],
      lessons: [
        {
          title: 'Data vs Information',
          introText:
            'Raw data becomes useful information once it is organized, interpreted, and connected to a decision or question.',
          introVisual: { template: 'generic', title: 'From raw observations to useful information' },
          mc: {
            question: 'What turns raw data into useful information?',
            options: [
              'Context and interpretation',
              'A larger file size',
              'Random formatting changes',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'Data becomes more useful when we add ___ and meaning.',
            answer: 'context',
          },
          practice: {
            kind: 'matching',
            pairs: [
              ['Temperature readings', 'Raw data'],
              ['Average weekly temperature', 'Summarized information'],
              ['Decision about crop watering', 'Action informed by data'],
            ],
          },
          summaryCheck: {
            statement: 'Information usually answers a question more directly than raw data alone.',
            isTrue: true,
          },
        },
        {
          title: 'Features and Labels',
          introText:
            'In supervised learning, features describe the input and labels describe the outcome you want a model to predict.',
          introVisual: { template: 'generic', title: 'Separate inputs from target outcomes' },
          mc: {
            question: 'In a supervised learning dataset, what is a label?',
            options: [
              'The target answer the model should learn to predict',
              'Any random note about the dataset',
              'The name of the spreadsheet tab',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'Features are the model inputs, while the ___ is the target output.',
            answer: 'label',
            alternatives: ['target'],
          },
          practice: {
            kind: 'code-block',
            language: 'python',
            code:
              "row = {'study_hours': 4, 'practice_quizzes': 2, 'passed_exam': True}\nfeatures = ['study_hours', 'practice_quizzes']\nlabel = 'passed_exam'\nprint(features, label)\n",
          },
          summaryCheck: {
            statement: 'Labels are the same as features because both are model inputs.',
            isTrue: false,
          },
        },
        {
          title: 'Training and Evaluation',
          introText:
            'Training adjusts a model using examples, while evaluation checks how well it performs on data that was not used to fit it.',
          introVisual: { template: 'generic', title: 'Keep training and evaluation separate' },
          mc: {
            question: 'Why do we evaluate on separate data?',
            options: [
              'To estimate how the model generalizes beyond the training set',
              'To make the model train faster automatically',
              'To remove the need for metrics',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'Evaluation data should be kept ___ from the training data.',
            answer: 'separate',
          },
          practice: {
            kind: 'interactive-visual',
            template: 'generic',
            title: 'Compare training accuracy with evaluation accuracy',
          },
          summaryCheck: {
            statement: 'A model that memorizes training data perfectly can still perform poorly on new examples.',
            isTrue: true,
          },
        },
        {
          title: 'Prompting and Error Analysis',
          introText:
            'Prompting improves when you make the task explicit, provide the right context, and then study failure cases instead of guessing why the result drifted.',
          introVisual: { template: 'generic', title: 'Tighten a prompt and inspect failure cases' },
          mc: {
            question: 'What is a strong first step when an AI response is vague?',
            options: [
              'Clarify the task, format, and constraints in the prompt',
              'Ask a completely unrelated question',
              'Assume the model cannot improve',
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'Prompt quality usually improves when the desired ___ is made explicit.',
            answer: 'output',
            alternatives: ['format'],
          },
          practice: {
            kind: 'code-playground',
            language: 'markdown',
            starterCode:
              "Task: Summarize the article in 3 bullet points.\nAudience: Busy project manager.\nConstraint: Mention one risk and one next step.\n",
          },
          summaryCheck: {
            statement: 'Error analysis means reviewing wrong or weak outputs to find patterns you can fix.',
            isTrue: true,
          },
        },
        {
          title: 'Bias and Safe Use',
          introText:
            'Safer AI use starts by asking who might be affected, what harm could occur, and what checks should happen before acting on a model output.',
          introVisual: { template: 'generic', title: 'Spot risk and add safety checks' },
          mc: {
            question: 'Which practice improves safety when using AI outputs?',
            options: [
              'Review sensitive outputs with human judgment before acting',
              'Trust every output automatically',
              "Hide the model's limitations from users",
            ],
            correctIndex: 0,
          },
          fillBlank: {
            template: 'A safe workflow adds human ___ before using high-stakes AI outputs.',
            answer: 'review',
            alternatives: ['judgment'],
          },
          practice: {
            kind: 'matching',
            pairs: [
              ['Bias check', 'Look for uneven impact across groups'],
              ['Human review', 'Add oversight before high-stakes decisions'],
              ['Clear disclosure', 'Explain that AI output can be imperfect'],
            ],
          },
          summaryCheck: {
            statement: 'AI outputs should be treated with extra care in sensitive or high-stakes contexts.',
            isTrue: true,
          },
        },
      ],
    },
  },
];

async function loadRootEnv() {
  const envPath = path.join(repoRoot, '.env');
  if (
    (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY || !process.env.SUPABASE_ANON_KEY) &&
    typeof process.loadEnvFile === 'function'
  ) {
    try {
      process.loadEnvFile(envPath);
      return;
    } catch {
      // Fall through to manual parsing.
    }
  }

  try {
    const content = await fs.readFile(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex < 0) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      if (!key || process.env[key]) continue;
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // Ignore missing .env and rely on existing environment.
  }
}

function parseArgs(argv) {
  const options = {
    count: DEFAULT_COUNT,
    dryRun: false,
    password: DEFAULT_PASSWORD,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--count') {
      const raw = argv[index + 1];
      if (!raw) throw new Error('--count requires a value.');
      options.count = Number.parseInt(raw, 10);
      index += 1;
      continue;
    }
    if (arg.startsWith('--count=')) {
      options.count = Number.parseInt(arg.split('=')[1] ?? '', 10);
      continue;
    }
    if (arg === '--password') {
      const raw = argv[index + 1];
      if (!raw) throw new Error('--password requires a value.');
      options.password = raw;
      index += 1;
      continue;
    }
    if (arg.startsWith('--password=')) {
      options.password = arg.split('=').slice(1).join('=');
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!Number.isInteger(options.count) || options.count < 1 || options.count > COURSE_SEEDS.length) {
    throw new Error(`--count must be an integer between 1 and ${COURSE_SEEDS.length}.`);
  }
  if (!options.password || options.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  return options;
}

function logStep(status, detail) {
  const prefix = `[${status}]`;
  console.log(`${prefix} ${detail}`);
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const candidate = {};
    for (const key of ['message', 'code', 'details', 'hint', 'status', 'name']) {
      if (key in error && error[key] != null) {
        candidate[key] = error[key];
      }
    }
    if (Object.keys(candidate).length > 0) {
      return JSON.stringify(candidate);
    }
    return JSON.stringify(error);
  }
  return String(error);
}

function buildCourseSlug(title, courseId) {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const fallback = normalized.length > 0 ? normalized : 'course';
  const suffix = courseId.split('-')[0] ?? courseId;
  return `${fallback}-${suffix}`;
}

const coverDataUriCache = new Map();

async function getCoverDataUri(assetPath) {
  if (coverDataUriCache.has(assetPath)) {
    return coverDataUriCache.get(assetPath);
  }
  const absolutePath = path.join(PUBLIC_DIR, assetPath);
  const svg = await fs.readFile(absolutePath, 'utf8');
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  coverDataUriCache.set(assetPath, dataUri);
  return dataUri;
}

function lessonUuid(courseIndex, lessonIndex) {
  return `71000000-0000-0000-0000-00000000${String(courseIndex)}${String(lessonIndex).padStart(3, '0')}`;
}

function textBlock(id, order, text) {
  return {
    id,
    type: 'text',
    position: { order },
    content: {
      format: 'richtext',
      value: { ops: [{ insert: `${text}\n` }] },
    },
  };
}

function multipleChoiceBlock(id, order, question, options, correctIndex) {
  return {
    id,
    type: 'multiple-choice',
    position: { order },
    content: {
      question,
      options: options.map((option, index) => ({
        id: `${id}-opt-${index + 1}`,
        text: option,
        isCorrect: index === correctIndex,
      })),
    },
  };
}

function fillBlankBlock(id, order, template, answer, alternatives = []) {
  return {
    id,
    type: 'fill-blank',
    position: { order },
    content: {
      template,
      blanks: [
        {
          id: `${id}-blank-1`,
          answer,
          ...(alternatives.length > 0 ? { alternatives } : {}),
        },
      ],
    },
  };
}

function matchingBlock(id, order, pairs) {
  return {
    id,
    type: 'matching',
    position: { order },
    content: {
      pairs: pairs.map(([left, right], index) => ({
        id: `${id}-pair-${index + 1}`,
        left,
        right,
      })),
    },
  };
}

function codeBlock(id, order, language, code) {
  return {
    id,
    type: 'code-block',
    position: { order },
    content: {
      language,
      code,
    },
  };
}

function codePlaygroundBlock(id, order, language, starterCode) {
  return {
    id,
    type: 'code-playground',
    position: { order },
    content: {
      language,
      starterCode,
      initialCode: starterCode,
      runnable: true,
    },
  };
}

function interactiveVisualBlock(id, order, template, title) {
  return {
    id,
    type: 'interactive-visual',
    position: { order },
    content: {
      template,
      title,
    },
  };
}

function trueFalseBlock(id, order, statement, isTrue) {
  return {
    id,
    type: 'true-false',
    position: { order },
    content: {
      statement,
      isTrue,
    },
  };
}

function videoBlock(id, order, url) {
  return {
    id,
    type: 'video',
    position: { order },
    content: {
      provider: 'youtube',
      url,
      caption: 'Short recap clip',
    },
  };
}

function buildPracticeBlocks(seed, lessonIndex, practice) {
  const blockId = `${seed.username}-l${lessonIndex + 1}-p4`;
  switch (practice.kind) {
    case 'matching':
      return [
        textBlock(`${blockId}-intro`, 0, 'Match each concept with the outcome or explanation that fits it best.'),
        matchingBlock(`${blockId}-match`, 1, practice.pairs),
      ];
    case 'code-block':
      return [
        textBlock(`${blockId}-intro`, 0, 'Read the snippet and explain how each line supports the lesson idea.'),
        codeBlock(`${blockId}-code`, 1, practice.language, practice.code),
      ];
    case 'code-playground':
      return [
        textBlock(`${blockId}-intro`, 0, 'Run through the starter code and edit one value to see how the behavior changes.'),
        codePlaygroundBlock(`${blockId}-play`, 1, practice.language, practice.starterCode),
      ];
    case 'interactive-visual':
      return [
        textBlock(`${blockId}-intro`, 0, 'Use the visual as a checkpoint: describe what changes, what stays fixed, and why that matters.'),
        interactiveVisualBlock(`${blockId}-visual`, 1, practice.template, practice.title),
      ];
    default:
      throw new Error(`Unsupported practice kind: ${practice.kind}`);
  }
}

function buildCourse(seed, authorUserId) {
  const now = new Date().toISOString();
  const baseCourse = {
    $schema: 'https://primoria.com/course-schema/v1.json',
    schema_version: '1.0.0',
    course_id: seed.courseId,
    metadata: {
      title: seed.course.title,
      description: seed.course.description,
      author: {
        userId: authorUserId ?? `seed-author-${seed.index}`,
        displayName: seed.displayName,
      },
      tags: seed.course.tags,
      difficulty_level: seed.course.difficulty,
      estimated_minutes: seed.course.estimatedMinutes,
      createdAt: now,
      updatedAt: now,
      version: '1.0.0',
    },
    settings: {
      theme: 'light',
      primaryColor: 'blue',
      fontFamily: 'system',
    },
    lessons: seed.course.lessons.map((lesson, lessonIndex) => {
      const lessonId = lessonUuid(seed.index, lessonIndex + 1);
      return {
        lesson_id: lessonId,
        title: lesson.title,
        pages: [
          {
            page_id: `${seed.username}-l${lessonIndex + 1}-p1`,
            order: 0,
            blocks: [
              textBlock(`${seed.username}-l${lessonIndex + 1}-p1-text`, 0, lesson.introText),
              interactiveVisualBlock(
                `${seed.username}-l${lessonIndex + 1}-p1-visual`,
                1,
                lesson.introVisual.template,
                lesson.introVisual.title,
              ),
            ],
          },
          {
            page_id: `${seed.username}-l${lessonIndex + 1}-p2`,
            order: 1,
            blocks: [
              multipleChoiceBlock(
                `${seed.username}-l${lessonIndex + 1}-p2-mc`,
                0,
                lesson.mc.question,
                lesson.mc.options,
                lesson.mc.correctIndex,
              ),
            ],
          },
          {
            page_id: `${seed.username}-l${lessonIndex + 1}-p3`,
            order: 2,
            blocks: [
              fillBlankBlock(
                `${seed.username}-l${lessonIndex + 1}-p3-fill`,
                0,
                lesson.fillBlank.template,
                lesson.fillBlank.answer,
                lesson.fillBlank.alternatives ?? [],
              ),
            ],
          },
          {
            page_id: `${seed.username}-l${lessonIndex + 1}-p4`,
            order: 3,
            blocks: buildPracticeBlocks(seed, lessonIndex, lesson.practice),
          },
          {
            page_id: `${seed.username}-l${lessonIndex + 1}-p5`,
            order: 4,
            blocks: [
              trueFalseBlock(
                `${seed.username}-l${lessonIndex + 1}-p5-tf`,
                0,
                lesson.summaryCheck.statement,
                lesson.summaryCheck.isTrue,
              ),
              videoBlock(`${seed.username}-l${lessonIndex + 1}-p5-video`, 1, YOUTUBE_URL),
            ],
          },
        ],
      };
    }),
  };

  const parsed = CourseSchema.safeParse(baseCourse);
  if (!parsed.success) {
    throw new Error(`Course validation failed for "${seed.course.title}": ${parsed.error.message}`);
  }
  return parsed.data;
}

async function findUserByEmail(admin, email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const result = await admin.auth.admin.listUsers({ page, perPage });
    if (result.error) {
      throw result.error;
    }
    const users = result.data.users ?? [];
    const found = users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      return found;
    }
    if (users.length < perPage) {
      return null;
    }
    page += 1;
  }
}

async function ensureAuthorUser(admin, seed, password) {
  const metadata = {
    name: seed.displayName,
    username: seed.username,
    display_name: seed.displayName,
  };
  const existing = await findUserByEmail(admin, seed.email);
  if (existing) {
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (updated.error) {
      throw updated.error;
    }
    return updated.data.user ?? existing;
  }

  const created = await admin.auth.admin.createUser({
    email: seed.email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (created.error) {
    throw created.error;
  }
  if (!created.data.user) {
    throw new Error(`Auth user creation returned no user for ${seed.email}.`);
  }
  return created.data.user;
}

async function ensureProfile(admin, seed, userId) {
  const profileRow = {
    id: userId,
    username: seed.username,
    bio: seed.profileBio,
    role: 'author',
    last_active_at: new Date().toISOString(),
  };
  const { error } = await admin.from('profiles').upsert(profileRow, { onConflict: 'id' });
  if (error) {
    throw error;
  }
}

async function upsertCourse(admin, seed, userId, course, coverDataUri) {
  const now = new Date().toISOString();
  const slug = buildCourseSlug(course.metadata.title, course.course_id);

  const { error: courseError } = await admin.from('courses').upsert(
    {
      id: course.course_id,
      author_id: userId,
      slug,
      title: course.metadata.title,
      description: course.metadata.description ?? null,
      thumbnail_url: coverDataUri,
      difficulty_level: course.metadata.difficulty_level ?? 'beginner',
      estimated_minutes: course.metadata.estimated_minutes ?? 0,
      tags: course.metadata.tags ?? [],
      price_tier: 'free',
      price: 0,
      status: 'published',
      published_at: now,
      updated_at: now,
      content_language: 'en',
      animation_style: 'minimal',
      planning_json: {
        source: 'seed-author-courses',
        lesson_count: course.lessons.length,
        pages_per_lesson: 5,
      },
    },
    { onConflict: 'id' },
  );
  if (courseError) {
    throw courseError;
  }

  const expectedLessonIds = course.lessons.map((lesson) => lesson.lesson_id);
  const lessonRows = course.lessons.map((lesson, index) => ({
    id: lesson.lesson_id,
    course_id: course.course_id,
    title: lesson.title,
    type: 'interactive',
    sort_key: 1000 + index * 1000,
    xp_reward: 120 + index * 10,
    duration_seconds: 900,
    content_json: {
      lesson_id: lesson.lesson_id,
      title: lesson.title,
      pages: lesson.pages,
    },
    is_locked: false,
    unlock_type: 'none',
    prerequisite_lesson_id: null,
    paywall_product_id: null,
    updated_at: now,
  }));

  const { error: lessonError } = await admin.from('lessons').upsert(lessonRows, { onConflict: 'id' });
  if (lessonError) {
    throw lessonError;
  }

  const { data: existingLessons, error: existingError } = await admin
    .from('lessons')
    .select('id')
    .eq('course_id', course.course_id);
  if (existingError) {
    throw existingError;
  }

  const toDelete = (existingLessons ?? [])
    .map((row) => row.id)
    .filter((lessonId) => !expectedLessonIds.includes(lessonId));
  if (toDelete.length > 0) {
    const { error: deleteError } = await admin.from('lessons').delete().in('id', toDelete);
    if (deleteError) {
      throw deleteError;
    }
  }

  return { courseId: course.course_id, courseSlug: slug };
}

function readPages(contentJson) {
  if (!contentJson || Array.isArray(contentJson) || typeof contentJson !== 'object') {
    return [];
  }
  return Array.isArray(contentJson.pages) ? contentJson.pages : [];
}

async function verifySeed(admin, anon, seed, userId, courseId, courseSlug) {
  const [profileResult, courseResult, lessonResult] = await Promise.all([
    admin.from('profiles').select('id,username,role').eq('id', userId).maybeSingle(),
    admin
      .from('courses')
      .select('id,author_id,slug,status,published_at,thumbnail_url')
      .eq('id', courseId)
      .maybeSingle(),
    admin
      .from('lessons')
      .select('id,title,content_json')
      .eq('course_id', courseId)
      .order('sort_key', { ascending: true }),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (courseResult.error) throw courseResult.error;
  if (lessonResult.error) throw lessonResult.error;

  const profile = profileResult.data;
  if (!profile || profile.username !== seed.username || profile.role !== 'author') {
    throw new Error(`Profile verification failed for ${seed.email}.`);
  }

  const course = courseResult.data;
  if (!course || course.author_id !== userId || course.status !== 'published' || course.slug !== courseSlug) {
    throw new Error(`Course verification failed for ${seed.email}.`);
  }
  if (typeof course.thumbnail_url !== 'string' || !course.thumbnail_url.startsWith('data:image/svg+xml')) {
    throw new Error(`Thumbnail verification failed for ${seed.email}.`);
  }

  const lessons = lessonResult.data ?? [];
  if (lessons.length !== 5) {
    throw new Error(`Expected 5 lessons for ${seed.email}, received ${lessons.length}.`);
  }

  const pagesPerLesson = lessons.map((lesson) => readPages(lesson.content_json).length);
  if (pagesPerLesson.some((count) => count !== 5)) {
    throw new Error(`Page count verification failed for ${seed.email}: ${pagesPerLesson.join(', ')}.`);
  }

  if (anon) {
    const publicResult = await anon
      .from('courses')
      .select('id,slug,status')
      .eq('slug', courseSlug)
      .eq('status', 'published')
      .maybeSingle();
    if (publicResult.error) {
      throw publicResult.error;
    }
    if (!publicResult.data || publicResult.data.id !== courseId) {
      throw new Error(`Anon verification failed for ${courseSlug}.`);
    }
  }

  return {
    lessonCount: lessons.length,
    pagesPerLesson,
  };
}

async function ensureEnv(options) {
  if (!process.env.SUPABASE_URL?.trim()) {
    throw new Error('SUPABASE_URL is required.');
  }
  if (!options.dryRun && !process.env.SUPABASE_SECRET_KEY?.trim()) {
    throw new Error('SUPABASE_SECRET_KEY is required unless --dry-run is used.');
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await ensureEnv(options);

  const selectedSeeds = COURSE_SEEDS.slice(0, options.count);
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const artifactDir = path.join(repoRoot, 'test-results', `seed-author-courses-${runId}`);
  const report = {
    startedAt: new Date().toISOString(),
    target: process.env.SUPABASE_URL,
    dryRun: options.dryRun,
    requestedCount: options.count,
    accounts: [],
  };

  await fs.mkdir(artifactDir, { recursive: true });

  const admin =
    options.dryRun || !process.env.SUPABASE_SECRET_KEY
      ? null
      : createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(DEFAULT_TIMEOUT) }) },
        });
  const anon = process.env.SUPABASE_ANON_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(DEFAULT_TIMEOUT) }) },
      })
    : null;

  let hadFailures = false;

  for (const seed of selectedSeeds) {
    let userId = null;
    let courseSlug = buildCourseSlug(seed.course.title, seed.courseId);
    try {
      logStep('RUN', `${options.dryRun ? 'Validating' : 'Seeding'} ${seed.email} -> ${seed.course.title}`);

      userId = `dry-run-${seed.username}`;
      if (admin) {
        const user = await ensureAuthorUser(admin, seed, options.password);
        userId = user.id;
        await ensureProfile(admin, seed, user.id);
      }

      const course = buildCourse(seed, userId);
      const coverDataUri = await getCoverDataUri(seed.coverAssetPath);
      const expectedPages = course.lessons.map((lesson) => lesson.pages.length);
      courseSlug = buildCourseSlug(course.metadata.title, course.course_id);

      if (admin) {
        await upsertCourse(admin, seed, userId, course, coverDataUri);
      }

      const verification = admin
        ? await verifySeed(admin, anon, seed, userId, course.course_id, courseSlug)
        : { lessonCount: course.lessons.length, pagesPerLesson: expectedPages };

      report.accounts.push({
        email: seed.email,
        password: options.password,
        userId,
        courseId: course.course_id,
        courseSlug,
        lessonCount: verification.lessonCount,
        pagesPerLesson: verification.pagesPerLesson,
        status: 'success',
        error: null,
      });
      logStep('PASS', `${seed.email} ready with ${verification.lessonCount} lessons`);
    } catch (error) {
      hadFailures = true;
      const message = formatError(error);
      report.accounts.push({
        email: seed.email,
        password: options.password,
        userId,
        courseId: seed.courseId,
        courseSlug,
        lessonCount: 0,
        pagesPerLesson: [],
        status: 'error',
        error: message,
      });
      logStep('FAIL', `${seed.email}: ${message}`);
    }
  }

  report.finishedAt = new Date().toISOString();
  const reportPath = path.join(artifactDir, 'report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report saved to ${reportPath}`);

  if (hadFailures) {
    process.exitCode = 1;
  }
}

await main();
