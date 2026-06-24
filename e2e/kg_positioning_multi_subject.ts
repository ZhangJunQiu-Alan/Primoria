import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Define the 30 broad queries
const queries = [
  "我想学微积分",
  "I want to learn calculus",
  "微积分入门",
  "Calculus",
  "我想学线性代数",
  "I want to learn linear algebra",
  "线性代数",
  "Linear Algebra basics",
  "学习数值分析",
  "Numerical Analysis",
  "我想学软件工程",
  "Software Engineering",
  "零基础学Python",
  "Python programming",
  "Python",
  "数据结构与算法怎么学",
  "Data structures and algorithms",
  "计算机架构",
  "Computer Architecture",
  "离散数学基础",
  "Discrete Mathematics",
  "想学计算机导论",
  "Introduction to Computer Science",
  "人工智能",
  "Artificial Intelligence",
  "机器学习",
  "Machine Learning for beginners",
  "我想学深度学习",
  "Deep learning tutorial",
  "Web开发"
];

function detectKgLanguage(text: string): "zh" | "en" {
  if (text && /[一-鿿㐀-䶿]/.test(text)) return "zh";
  return "en";
}

async function runTest() {
  console.log("Starting Multilingual Cross-Subject Broad Positioning Test Simulation...");
  const baseUrl = process.env.PRIMORIA_E2E_BASE_URL ?? "http://localhost:3000";
  const email = process.env.PRIMORIA_E2E_EMAIL;
  const password = process.env.PRIMORIA_E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("Set PRIMORIA_E2E_EMAIL and PRIMORIA_E2E_PASSWORD before running this test.");
  }
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.error(`[Browser Error] ${error.message}`));

  try {
    console.log(`1. Navigating to ${baseUrl}/auth/sign-in`);
    await page.goto(`${baseUrl}/auth/sign-in`);

    console.log("   Logging in...");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    console.log("   Waiting for session initialization...");
    await page.waitForURL(/.*\/library/, { timeout: 15000 }).catch(() => console.log("   [Warning] Redirect to /library timed out, trying to proceed anyway."));

    console.log("2. Navigating to homepage...");
    await page.goto(`${baseUrl}/`);
    await page.waitForLoadState('networkidle');

    console.log("3. Executing queries via authenticated browser fetch...");

    const results: string[] = [
      "# 知识图谱定位测试结果 (30个宽泛目标)",
      `测试时间: ${new Date().toISOString()}`,
      ""
    ];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const lang = detectKgLanguage(query);
      console.log(`   [${i + 1}/${queries.length}] Querying: "${query}" (lang: ${lang})...`);

      try {
        const responseData = await page.evaluate(async (payload) => {
          const res = await fetch("/api/knowledge-graph/position", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API returned ${res.status}: ${errText}`);
          }
          return res.json();
        }, { query, language: lang });

        // Format result block
        results.push(`## ${i + 1}. 输入: ${query}`);
        results.push(`- 反馈的定位:`);
        results.push(`  - 分支: ${responseData.branch}`);
        results.push(`  - 知识图谱 ID: ${responseData.graphId || "N/A"}`);

        if (responseData.branch === "broad") {
          results.push(`  - 推荐 Topic 列表:`);
          if (responseData.menu && responseData.menu.length > 0) {
            for (const item of responseData.menu) {
              results.push(`    - ${item.name} (${item.topicId})`);
            }
          } else {
            results.push(`    - (空列表)`);
          }
        } else if (responseData.branch === "specific") {
          results.push(`  - 起始 Topic ID: ${responseData.startTopicId || "N/A"}`);
          results.push(`  - 目标 Concept ID: ${responseData.targetConceptId || "N/A"}`);
        } else if (responseData.branch === "fallback") {
          results.push(`  - 提示消息: ${responseData.message || "N/A"}`);
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

    const testMdPath = path.resolve(process.cwd(), 'temple', 'test.md');
    fs.writeFileSync(testMdPath, results.join("\n"));
    console.log(`\nTest results written to ${testMdPath}`);

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await browser.close();
  }
}

runTest();
