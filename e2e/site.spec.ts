import { expect, Page, test } from '@playwright/test';

const PAGES = ['/', '/events', '/nearby', '/services', '/galleries', '/signin'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1180, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'phone', width: 390, height: 844 },
];

async function signIn(page: Page) {
  await page.goto('/signin');
  await page.fill('input[type=email]', 'tiredofdointm@gmail.com');
  await page.fill('input[type=password]', 'tired123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
}

async function noHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
      bodyW: document.body.scrollWidth,
    };
  });
  expect(overflow.scrollW, `${label}: document scrollWidth ${overflow.scrollW} > clientWidth ${overflow.clientW}`)
    .toBeLessThanOrEqual(overflow.clientW + 1);
  expect(overflow.bodyW, `${label}: body scrollWidth`).toBeLessThanOrEqual(overflow.clientW + 1);
}

test.describe('layout fits at every size', () => {
  for (const vp of VIEWPORTS) {
    for (const path of PAGES) {
      test(`no overflow ${vp.name} ${path}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await noHorizontalOverflow(page, `${vp.name} ${path}`);
      });
    }
  }
});

const SIGNED_PAGES = ['/dashboard', '/tickets', '/orders', '/settings', '/feed', '/covers', '/events/neon-garden', '/galleries/gal_echo'];
test.describe('signed-in layout fits at every size', () => {
  for (const vp of [VIEWPORTS[0], VIEWPORTS[3]]) {
    for (const path of SIGNED_PAGES) {
      test(`no overflow ${vp.name} ${path}`, async ({ page }) => {
        await signIn(page);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await noHorizontalOverflow(page, `${vp.name} ${path}`);
      });
    }
  }
});

test('command palette jumps anywhere', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.event-card'); // app hydrated
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.locator('[aria-label="Search commands"]')).toBeVisible();
  await expect(page.locator('.cp-item').first()).toBeVisible(); // commands loaded
  await page.fill('[aria-label="Search commands"]', 'neon garden');
  await expect(page.locator('.cp-item').first()).toContainText('Neon Garden');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/events/neon-garden');
});

test('hide and unhide photos via smart view', async ({ page }) => {
  await signIn(page);
  await page.goto('/galleries');
  await page.waitForSelector('.vcell');
  await page.waitForLoadState('networkidle');
  const firstName = await page.locator('.vcell').first().getAttribute('title');
  await page.locator('.vcell').first().click();
  await page.click('.selbar .sb-btn:has-text("Hide")');
  await expect(page.locator('.selbar')).toHaveCount(0);
  // hidden view shows it, unhide brings it back
  await page.click('.folder-item:has-text("Hidden")');
  await page.waitForSelector('.vcell');
  await expect(page.locator(`.vcell[title="${firstName}"]`)).toBeVisible();
  await page.locator(`.vcell[title="${firstName}"]`).click();
  await page.click('.selbar .sb-btn:has-text("Unhide")');
  await page.click('.folder-item:has-text("Everything")');
  await page.waitForSelector('.vcell');
  await expect(page.locator(`.vcell[title="${firstName}"]`)).toBeVisible();
});

test('lightbox slideshow advances frames', async ({ page }) => {
  await signIn(page);
  await page.goto('/galleries');
  await page.waitForSelector('.vcell');
  await page.waitForLoadState('networkidle');
  await page.locator('.vcell').nth(1).dblclick();
  await page.waitForSelector('.lightbox');
  const before = await page.locator('.lb-count').textContent();
  await page.click('[title="Play slideshow"]');
  await page.waitForTimeout(4300);
  const after = await page.locator('.lb-count').textContent();
  expect(after).not.toBe(before);
});

test('header consolidates account items into profile menu', async ({ page }) => {
  await signIn(page);
  // items should NOT be loose header links
  const headerNav = page.locator('.header .nav');
  await expect(headerNav).not.toContainText('My tickets');
  await expect(headerNav).not.toContainText('Orders');
  await expect(headerNav).not.toContainText('Settings');
  // profile menu holds them all
  await page.click('.profile-btn');
  const menu = page.locator('.profile-menu');
  await expect(menu).toContainText('Feed');
  await expect(menu).toContainText('My tickets');
  await expect(menu).toContainText('Orders');
  await expect(menu).toContainText('Settings');
  await expect(menu).toContainText('Notifications');
  await expect(menu).toContainText('Sign out');
  await expect(menu).toContainText('tiredofdointm@gmail.com');
  // notifications sub-view works
  await page.click('.profile-menu .menu-item:has-text("Notifications")');
  await expect(page.locator('.notif').first()).toBeVisible();
});

test('dashboard switches between client and host', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('.dash-profile h1')).toContainText('TIRED');
  await expect(page.locator('.mode-switch')).toBeVisible();
  await page.click('.mode-switch button:has-text("Host")');
  await expect(page.getByRole('heading', { name: /Sales — last 14 days/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your events', exact: true })).toBeVisible();
  await page.click('.mode-switch button:has-text("Client")');
  await expect(page.getByRole('heading', { name: /Your next nights/ })).toBeVisible();
});

test('client-only account has no host switch', async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[type=email]', 'guest@tired.events');
  await page.fill('input[type=password]', 'guest123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
  await expect(page.locator('.mode-switch')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Your next nights/ })).toBeVisible();
});

test('gallery grid virtualizes and selection works like a desktop', async ({ page }) => {
  await signIn(page);
  await page.goto('/galleries');
  await page.waitForSelector('.vcell');
  await page.waitForLoadState('networkidle');

  // virtualization: far fewer cells in the DOM than photos indexed
  const cellCount = await page.locator('.vcell').count();
  expect(cellCount).toBeGreaterThan(5);
  expect(cellCount).toBeLessThan(150); // 346 photos indexed — most must be virtualized away

  // plain click selects one
  await page.locator('.vcell').nth(0).click();
  await expect(page.locator('.selbar .count')).toHaveText('1 selected');
  // shift+click selects a range
  await page.locator('.vcell').nth(5).click({ modifiers: ['Shift'] });
  await expect(page.locator('.selbar .count')).toHaveText('6 selected');
  // ctrl+click toggles one off
  await page.locator('.vcell').nth(2).click({ modifiers: ['ControlOrMeta'] });
  await expect(page.locator('.selbar .count')).toHaveText('5 selected');
  // escape clears
  await page.keyboard.press('Escape');
  await expect(page.locator('.selbar')).toHaveCount(0);

  // ctrl+A selects everything in the current filter
  await page.locator('.vgrid-wrap').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ControlOrMeta+a');
  const countText = await page.locator('.selbar .count').textContent();
  expect(parseInt(countText || '0', 10)).toBeGreaterThan(300);
});

test('marquee drag selects photos', async ({ page }) => {
  await signIn(page);
  await page.goto('/galleries');
  await page.waitForSelector('.vcell');
  await page.waitForLoadState('networkidle');
  const grid = page.locator('.vgrid-wrap');
  const box = await grid.boundingBox();
  if (!box) throw new Error('grid not found');
  // rubber-band from anywhere — even starting on a photo — selects the box
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 420, box.y + 260, { steps: 14 });
  await page.mouse.up();
  const countText = await page.locator('.selbar .count').textContent();
  expect(parseInt(countText || '0', 10)).toBeGreaterThan(1);
});

test('rename overlays a display name without touching the file', async ({ page }) => {
  await signIn(page);
  await page.goto('/galleries');
  await page.waitForSelector('.vcell');
  await page.waitForLoadState('networkidle');
  await page.locator('.vcell').nth(3).dblclick();
  await page.waitForSelector('.lightbox');
  const original = await page.locator('.lb-meta').textContent();
  await page.click('.lb-name .icon-btn');
  await page.fill('.lb-name input', 'Renamed by test');
  await page.keyboard.press('Enter');
  await expect(page.locator('.lb-name')).toContainText('Renamed by test');
  // original filename still shown in metadata (file untouched)
  expect(await page.locator('.lb-meta').textContent()).toBe(original);
});

test('gallery share + export endpoints respond', async ({ page, request }) => {
  await signIn(page);
  const media = await request.get('/api/media');
  const { items } = await media.json();
  const ids = items.slice(0, 3).map((i: { id: string }) => i.id);
  const cookies = await page.context().cookies();
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const share = await request.post('/api/shares', { data: { photoIds: ids, name: 'e2e share' }, headers: { cookie } });
  expect(share.ok()).toBeTruthy();
  const { share: created } = await share.json();
  await page.goto(created.url);
  await expect(page.locator('h1')).toContainText('e2e share');
  await page.waitForSelector('.vcell');
  const exportRes = await request.get(`/api/export?ids=${ids.join(',')}`, { headers: { cookie } });
  expect(exportRes.ok()).toBeTruthy();
  expect(exportRes.headers()['content-type']).toContain('zip');
});

test('cart checkout produces ticket', async ({ page }) => {
  await signIn(page);
  await page.goto('/events');
  await page.locator('.event-card').first().click();
  await page.waitForSelector('.buy-box');
  await page.click('.buy-box .btn.primary');
  await page.click('[aria-label^="Cart"]');
  await expect(page.locator('.cart-panel')).toBeVisible();
  await page.click('.cart-panel .btn.primary');
  await page.waitForURL('**/tickets');
  await expect(page.locator('.ticket').first()).toBeVisible();
});

test('event page shows secret venue state', async ({ page }) => {
  await page.goto('/events/warehouse-frequencies');
  await expect(page.locator('.venue-box.secret')).toBeVisible();
  await expect(page.locator('.venue-box')).toContainText('Secret location');
});
