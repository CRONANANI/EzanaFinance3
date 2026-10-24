/** One headless Chromium load: FCP, LCP, TBT (long tasks over 50 ms) and JS KB. */
export async function chromiumPass(browser, url, headers = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: headers,
  });
  const page = await ctx.newPage();
  let js = 0;
  page.on('response', async (r) => {
    if (r.request().resourceType() === 'script') {
      const len = Number(r.headers()['content-length']);
      if (Number.isFinite(len)) js += len;
      else js += (await r.body().catch(() => Buffer.alloc(0))).length;
    }
  });
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, tbt: 0 };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.tbt += Math.max(0, e.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => ({
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || null,
    lcp: window.__perf.lcp || null,
    tbt: window.__perf.tbt,
  }));
  await ctx.close();
  return { ...m, jsKb: js / 1024 };
}
