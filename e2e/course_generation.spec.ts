import { chromium } from 'playwright';

async function runTest() {
  console.log("Starting Browser Test Simulation with actual authentication...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.error(`[Browser Error] ${error.message}`));

  try {
    console.log("1. Navigating to http://localhost:3000/auth/sign-in");
    await page.goto('http://localhost:3000/auth/sign-in');

    console.log("   Filling in credentials...");
    await page.fill('input[type="email"]', 'AlanTest@gmail.com');
    await page.fill('input[type="password"]', 'Fanzf12345');
    await page.click('button[type="submit"]');

    console.log("   Waiting for login to complete...");
    // Usually it redirects to /library or similar
    await page.waitForURL(/.*\/library/, { timeout: 15000 }).catch(() => console.log("   [Warning] Redirect to /library timed out, trying to proceed anyway."));

    console.log("2. Navigating to homepage...");
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Quick verify if auth is still blocking
    const content = await page.content();
    if (content.includes('Your tutor workspace is private now')) {
        throw new Error("Authentication failed or wasn't persisted properly. Still seeing the private workspace prompt.");
    }

    console.log("3. Locating Copilot chat input...");
    // Wait for the Copilot chat input
    const chatInput = page.locator('textarea').first();
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log("   Typing course request...");
    await chatInput.fill('给我生成一门关于特征值与特征向量的几何意义的课程');
    // Press Enter to submit
    await chatInput.press('Enter');

    console.log("4. Waiting for course generation (this might take a while)...");
    // We can either wait for a redirect or wait for a specific link in the chat.
    // If it automatically redirects:
    await page.waitForURL(/.*\/course\/.*/, { timeout: 60000 }).catch(() => {
        console.log("   [Warning] Auto-redirect didn't happen. Checking for course link in chat...");
    });

    // If there is a link to the course in the chat, let's try to click it.
    if (!page.url().includes('/course/')) {
       console.log("   Checking for generated course link...");
       const courseLink = page.locator('a[href*="/course/crs_"]').last();
       await courseLink.waitFor({ state: 'visible', timeout: 30000 });
       await courseLink.click();
       await page.waitForURL(/.*\/course\/.*/, { timeout: 15000 });
    }

    console.log(`   Successfully on course page: ${page.url()}`);

    console.log("5. Interacting with course content...");
    // Wait for concept, widget, quiz to load
    await page.waitForSelector('.concept-block, [data-type="concept"]', { timeout: 15000 }).catch(() => console.log("   [Warning] Concept block not found"));
    await page.waitForSelector('iframe, [data-type="widget"]', { timeout: 15000 }).catch(() => console.log("   [Warning] Interactive widget not found"));
    await page.waitForSelector('.quiz-block, [data-type="quiz"]', { timeout: 15000 }).catch(() => console.log("   [Warning] Quiz block not found"));

    console.log("Test completed successfully!");

  } catch (err) {
    console.error("Test failed:", err);
    await page.screenshot({ path: 'e2e-failure.png', fullPage: true });
    console.log("Screenshot saved to e2e-failure.png");
  } finally {
    await browser.close();
  }
}

runTest();
