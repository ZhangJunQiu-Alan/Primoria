import { chromium } from 'playwright';
import { performance } from 'perf_hooks';

async function measureNavigation() {
  console.log("=== Launching Playwright Performance Benchmarking ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs and errors
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.error(`[Browser Error] ${error.message}`));

  // Set default navigation timeout to 300 seconds (5 minutes) to allow for on-demand Next dev compiling
  page.setDefaultNavigationTimeout(300000);
  page.setDefaultTimeout(300000);

  try {
    const randomEmail = `perf_test_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
    const password = 'TestPassword12345';

    // Warm up sign-up page
    console.log("Warming up sign-up page: calling page.goto...");
    let tStart = performance.now();
    await page.goto('http://localhost:3000/auth/sign-up');
    console.log(`Warm up page.goto took: ${(performance.now() - tStart).toFixed(2)} ms`);

    console.log("Warm up: waiting for load state...");
    tStart = performance.now();
    await page.waitForLoadState('load');
    console.log(`Warm up waitForLoadState took: ${(performance.now() - tStart).toFixed(2)} ms`);

    // 1. Measure load of sign-up page (warm)
    console.log("\n1. Measuring load of sign-up page (warm): calling page.goto...");
    const t0 = performance.now();
    await page.goto('http://localhost:3000/auth/sign-up');
    console.log(`Measurement page.goto took: ${(performance.now() - t0).toFixed(2)} ms`);

    console.log("Measurement: waiting for load state...");
    const t_load = performance.now();
    await page.waitForLoadState('load');
    console.log(`Measurement waitForLoadState took: ${(performance.now() - t_load).toFixed(2)} ms`);
    const t1 = performance.now();
    console.log(`   Total load took: ${(t1 - t0).toFixed(2)} ms`);

    // 2. Perform registration
    console.log(`\n2. Performing registration with email: ${randomEmail}...`);
    await page.fill('input[placeholder="Ada"]', 'TestUser');
    await page.fill('input[placeholder="you@example.com"]', randomEmail);
    await page.fill('input[id="auth-password"]', password);

    // First signup (warm up target page /library)
    console.log("   Waiting for registration button click...");
    const t2 = performance.now();
    await page.click('button[type="submit"]');
    console.log("   Waiting for redirect to /library...");
    await page.waitForURL(/.*\/library/, { timeout: 300000 });
    console.log("   Waiting for /library load state...");
    await page.waitForLoadState('load');
    const t3 = performance.now();
    console.log(`   Registration & redirect to /library took: ${(t3 - t2).toFixed(2)} ms`);

    // Warm up homepage /
    console.log("\n3. Warming up homepage /...");
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('load');
    console.log("   Homepage / is warm.");

    // Go back to /library
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('load');

    // 4. Navigate from /library to / (homepage) via page.goto (warm)
    console.log("\n4. Measuring navigation from /library to / (homepage) via page.goto (warm)...");
    const t4 = performance.now();
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('load');
    const t5 = performance.now();
    console.log(`   Hard navigation to / took: ${(t5 - t4).toFixed(2)} ms`);

    // 5. Client-side transition from / back to /library via sidebar click (Next.js SPA routing - warm)
    console.log("\n5. Measuring client-side (SPA) navigation from / to /library via Sidebar click...");
    const libraryLink = page.locator('a[href="/library"]').first();
    await libraryLink.waitFor({ state: 'visible', timeout: 300000 });

    const t6 = performance.now();
    await libraryLink.click();
    await page.waitForURL(/.*\/library/);
    await page.waitForLoadState('domcontentloaded');
    const t7 = performance.now();
    console.log(`   Client-side SPA transition to /library took: ${(t7 - t6).toFixed(2)} ms`);

    // 6. Navigate to /account (if exists in sidebar)
    console.log("\n6. Measuring client-side navigation from /library to /account...");
    const accountLink = page.locator('a[href="/account"]').first();
    const hasAccountLink = await accountLink.count().then(c => c > 0);
    if (hasAccountLink) {
      // Warm up account page
      console.log("   Warming up /account page...");
      await accountLink.click();
      await page.waitForURL(/.*\/account/);
      await page.waitForLoadState('load');
      console.log("   /account page is warm.");

      // Go back to library
      await page.goto('http://localhost:3000/library');
      await page.waitForLoadState('load');

      // Measure
      const accountLink2 = page.locator('a[href="/account"]').first();
      const t8 = performance.now();
      await accountLink2.click();
      await page.waitForURL(/.*\/account/);
      await page.waitForLoadState('domcontentloaded');
      const t9 = performance.now();
      console.log(`   Client-side SPA transition to /account took: ${(t9 - t8).toFixed(2)} ms`);
    } else {
      console.log("   No /account link found in sidebar, skipping.");
    }

    // 7. Navigation to the first course in library if any
    console.log("\n7. Measuring navigation to a course page...");
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    const courseCard = page.locator('a[href*="/course/"]').first();
    const hasCourse = await courseCard.count().then(c => c > 0);
    if (hasCourse) {
      const courseHref = await courseCard.getAttribute('href');
      console.log(`   Found course link: ${courseHref}. Warming up...`);
      // Click once to warm up
      await courseCard.click();
      await page.waitForURL(/.*\/course\/.*/);
      await page.waitForLoadState('load');
      console.log("   Course page is warm.");

      // Go back to library
      await page.goto('http://localhost:3000/library');
      await page.waitForLoadState('networkidle');

      // Measure
      console.log("   Measuring client-side SPA transition to course page...");
      const courseCard2 = page.locator('a[href*="/course/"]').first();
      const t10 = performance.now();
      await courseCard2.click();
      await page.waitForURL(/.*\/course\/.*/);
      await page.waitForLoadState('load');
      const t11 = performance.now();
      console.log(`   Client-side SPA transition took: ${(t11 - t10).toFixed(2)} ms`);
    } else {
      console.log("   No course cards found in library, skipping course page test.");
    }

    console.log("\n=== Benchmarking completed successfully ===");

  } catch (err) {
    console.error("\nBenchmark run failed:", err);
  } finally {
    await browser.close();
  }
}

measureNavigation();
