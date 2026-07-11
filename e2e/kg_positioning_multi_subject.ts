import * as path from 'path';
import * as fs from 'fs';
import { positionLearningGoal } from '../apps/web/src/lib/knowledge-graph/position-learning-goal';

// Load environmental variables directly from apps/web/.env.local
loadEnvFile(path.resolve(__dirname, '../apps/web/.env.local'));

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

// Define the 30 broad queries
const queries = [
  "我想学导数和微积分",
  "help me learn basic calculus",
  "微积分极限定理怎么学",
  "Advanced calculus topics",
  "学一下矩阵和线性代数",
  "Matrix algebra introduction",
  "线性代数几何意义",
  "Vector spaces and eigenvalues",
  "数值计算方法",
  "Error analysis in computing",
  "软件开发工程怎么入门",
  "Software design patterns and specifications",
  "Python新手教程",
  "Python scripting for beginners",
  "用Python写写简单的程序",
  "排序算法和链表怎么写",
  "Algorithms and complex data structures",
  "CPU是怎么工作的",
  "RISC-V architecture and logic",
  "集合论与离散数学",
  "Discrete math tutorials",
  "操作系统与计算机系统结构",
  "Computer systems programming",
  "计算机科学导论怎么学",
  "CS50 introduction to computer science",
  "AI人工智能从零开始",
  "Artificial intelligence search algorithms",
  "我想学机器学习的回归模型",
  "Supervised and unsupervised learning basics",
  "神经网络和深度学习"
];

function detectKgLanguage(text: string): "zh" | "en" {
  if (text && /[一-鿿㐀-䶿]/.test(text)) return "zh";
  return "en";
}

async function runTest() {
  console.log("Starting Multilingual Cross-Subject Broad Positioning Test Simulation (Direct Process Run)...");

  const results: string[] = [
    "# 知识图谱定位测试结果 (30个宽泛目标)",
    `测试时间: ${new Date().toISOString()}`,
    `使用的提供商: ${process.env.AI_PROVIDER || 'openai-compatible'}`,
    `使用的模型: ${process.env.AI_PROVIDER === 'anthropic-compatible' ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL}`,
    ""
  ];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const lang = detectKgLanguage(query);
    console.log(`   [${i + 1}/${queries.length}] Querying: "${query}" (lang: ${lang})...`);

    try {
      const responseData = await positionLearningGoal({ query, language: lang });
      const res = responseData.result;

      // Format result block
      results.push(`## ${i + 1}. 输入: ${query}`);
      results.push(`- 反馈的定位:`);
      results.push(`  - 分支: ${res.branch}`);
      results.push(`  - 知识图谱 ID: ${res.graphId || "N/A"}`);

      if (res.branch === "broad") {
        results.push(`  - 推荐 Topic 列表:`);
        if (res.menu && res.menu.length > 0) {
          for (const item of res.menu) {
            results.push(`    - ${item.name} (${item.topicId})`);
          }
        } else {
          results.push(`    - (空列表)`);
        }
      } else if (res.branch === "specific") {
        results.push(`  - 起始 Topic ID: ${res.startTopicId || "N/A"}`);
        results.push(`  - 目标 Concept ID: ${res.targetConceptId || "N/A"}`);
      } else if (res.branch === "fallback") {
        results.push(`  - 提示消息: ${res.message || "N/A"}`);
      }
      results.push("");

    } catch (err: any) {
      console.error(`   Failed to query "${query}":`, err.message);
      results.push(`## ${i + 1}. 输入: ${query}`);
      results.push(`- 反馈的定位:`);
      results.push(`  - 错误: 接口请求失败 - ${err.message}`);
      results.push("");
    }
  }

  const testMdPath = path.resolve(__dirname, '../docs/qa/kg-positioning-multi-subject-test.md');
  fs.mkdirSync(path.dirname(testMdPath), { recursive: true });
  fs.writeFileSync(testMdPath, results.join("\n"));
  console.log(`\nTest results written to ${testMdPath}`);

  // Close any database pool active in global state
  const globalForKnowledgeGraph = globalThis as any;
  if (globalForKnowledgeGraph.primoriaKnowledgeGraphPool) {
    await globalForKnowledgeGraph.primoriaKnowledgeGraphPool.end();
  }
}

runTest();
