import { test, expect } from '@playwright/test';

import { clearEnv, restoreEnv } from '../../__tests__/export/export-side-effects';
import { getRouterE2ERoot } from '../../__tests__/utils';
import { createExpoStart } from '../../utils/expo';
import { pageCollectErrors } from '../page';

test.beforeAll(() => clearEnv());
test.afterAll(() => restoreEnv());

const projectRoot = getRouterE2ERoot();
const inputDir = 'server-loader';

test.describe('server loader in development', () => {
  const expoStart = createExpoStart({
    cwd: projectRoot,
    env: {
      E2E_ROUTER_SRC: inputDir,
      E2E_ROUTER_SERVER_LOADERS: 'true',

      // Ensure CI is disabled otherwise the file watcher won't run.
      CI: '0',
    },
  });

  test.beforeEach(async () => {
    console.time('expo start');
    await expoStart.startAsync();
    console.timeEnd('expo start');
  });
  test.afterEach(async () => {
    await expoStart.stopAsync();
  });

  test('server loader provides data in SSR and hydration', async ({ page }) => {
    // Listen for console logs and errors
    const pageErrors = pageCollectErrors(page);

    // Navigate to the page with the loader
    await page.goto(expoStart.url.href);

    // Check that the loader data is available in the HTML (SSR)
    const html = await page.content();
    expect(html).toContain('window.__EXPO_ROUTER_LOADER_DATA__');

    // Check for the loader data script tag
    const loaderDataScript = await page.evaluate(() => {
      return window.__EXPO_ROUTER_LOADER_DATA__;
    });
    expect(loaderDataScript).toBeDefined();
    expect(loaderDataScript!['/']).toEqual({ foo: 'bar' });

    // Wait for the page to hydrate
    await page.waitForSelector('[data-testid="loader-result"]', { timeout: 5000 });

    // Check that the loader data is displayed correctly
    const loaderDataElement = await page.locator('[data-testid="loader-result"]');
    await expect(loaderDataElement).toHaveText('{"foo":"bar"}');

    // Check that no errors occurred
    expect(pageErrors.all).toEqual([]);
  });

  test('useLoader hook returns data without errors', async ({ page }) => {
    const pageErrors = pageCollectErrors(page);

    // Navigate to the page
    await page.goto(expoStart.url.href);

    // Wait for hydration
    await page.waitForSelector('[data-testid="loader-result"]', { timeout: 5000 });

    // Check that no "Loader data not found" error is thrown
    const consoleErrors = pageErrors.logs.filter((err) => {
      const message = err.text();
      return (
        message.includes('Loader data not found') || message.includes('jsxDEV is not a function')
      );
    });
    expect(consoleErrors).toEqual([]);
  });
});
