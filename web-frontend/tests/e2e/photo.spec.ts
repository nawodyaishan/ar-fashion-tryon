import { test, expect } from '@playwright/test';

// Synthetic one-pixel PNG, not a personal photograph.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);

test('photo upload, classification, generation and download affordance', async ({
  page,
  context,
}) => {
  let generationCalls = 0;
  const unexpected: string[] = [];
  await context.addInitScript(() => {
    localStorage.setItem(
      'tryon-store-v2',
      JSON.stringify({ state: { activeMode: 'photo', garments: [] }, version: 0 }),
    );
    localStorage.setItem('ar-tryon-onboarding-seen', 'true');
    localStorage.setItem('photo-tryon-onboarding-seen', 'true');
  });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:5100') {
      if (url.pathname === '/health') return route.fulfill({ json: { status: 'ok' } });
      if (url.pathname === '/detect_garment_type') {
        expect(route.request().postData()).toContain('name="garment"');
        return route.fulfill({
          json: {
            label: 'tshirt',
            confidence: 0.95,
            filename: 'fixture.png',
            file_size_bytes: png.length,
            content_type: 'image/png',
          },
        });
      }
      if (url.pathname === '/virtual_tryon') {
        generationCalls++;
        expect(route.request().postData()).toContain('name="person_image"');
        expect(route.request().postData()).toContain('name="garment_image"');
        expect(url.searchParams.get('process_garment')).toBe('true');
        return route.fulfill({
          json: {
            success: true,
            result_url: 'http://127.0.0.1:5100/result.png',
            person_url: 'http://127.0.0.1:5100/result.png',
            garment_url: 'http://127.0.0.1:5100/result.png',
            result_public_id: 'fixture',
            cloth_type: 'upper',
            parameters: {
              num_inference_steps: 50,
              guidance_scale: 2.5,
              seed: 42,
              show_type: 'result only',
            },
          },
        });
      }
      if (url.pathname === '/result.png')
        return route.fulfill({ contentType: 'image/png', body: png });
      unexpected.push(url.pathname);
      return route.abort();
    }
    if (url.origin === 'http://127.0.0.1:3100') return route.continue();
    unexpected.push(url.origin);
    return route.abort();
  });
  await page.goto('/try-on');
  await page.getByRole('tab', { name: /Photo/ }).click();
  await page.getByText('Single Garment', { exact: true }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'body.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'garment.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Generate Try-On', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download Result', exact: true })).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Download Result', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.locator('#resultImage')).toHaveAttribute(
    'src',
    'http://127.0.0.1:5100/result.png',
  );
  await expect(popup.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
  await popup.close();
  expect(generationCalls).toBe(1);
  expect(unexpected).toEqual([]);
});
