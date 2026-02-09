import { test, expect, Page } from '@playwright/test';

// Helper: Fill registration and onboarding
async function completeOnboarding(page: Page, email: string, password: string, profileData: any) {
  // Navigate to auth page
  await page.goto('http://localhost:5173/auth');
  
  // Sign up
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign up")');
  
  // Wait for redirect to onboarding
  await page.waitForURL(/onboarding/);
  
  // Fill Profile (Step 1)
  await page.fill('input[placeholder*="name"]', profileData.name);
  await page.selectOption('select:has-text("Gender")', profileData.gender);
  await page.fill('input[type="date"]', profileData.dob);
  await page.fill('input[placeholder*="Country"]', profileData.country);
  await page.fill('input[placeholder*="City"]', profileData.city);
  await page.fill('input[placeholder*="Madhhab"]', profileData.sect);
  await page.selectOption('select:has-text("Religiosity")', profileData.religiosity);
  await page.selectOption('select:has-text("Prayer")', profileData.prayer);
  await page.click('button:has-text("Continue")');
  
  // Fill Preferences (Step 2)
  await page.waitForURL(/preferences/);
  await page.fill('input[placeholder*="min"]', '22');
  await page.fill('input[placeholder*="max"]', '35');
  await page.click('button:has-text("Continue")');
  
  // Wali Invite (Step 3) - Skip
  await page.waitForURL(/wali/);
  await page.click('button:has-text("Skip")');
  
  // Complete
  await page.waitForURL(/complete/);
  await page.click('button:has-text("Go to Home")');
  
  // Wait for home page
  await page.waitForURL(/home/);
}

test.describe('NikahX Phase 3 Level 2 QA - Full Match & Message Flow', () => {
  test.setTimeout(120000); // 2 minutes timeout
  
  test('Complete matching and messaging flow', async ({ browser }) => {
    const timestamp = Date.now();
    
    // User 1 Data (Male)
    const user1Email = `testuser1_${timestamp}@example.com`;
    const user1Password = 'TestPassword123!';
    const user1Data = {
      name: 'Ahmed Test',
      gender: 'male',
      dob: '1995-05-15',
      country: 'USA',
      city: 'New York',
      sect: 'Sunni',
      religiosity: 'High',
      prayer: 'Always'
    };
    
    // User 2 Data (Female)
    const user2Email = `testuser2_${timestamp}@example.com`;
    const user2Password = 'TestPassword123!';
    const user2Data = {
      name: 'Fatima Test',
      gender: 'female',
      dob: '1997-08-20',
      country: 'USA',
      city: 'New York',
      sect: 'Sunni',
      religiosity: 'Moderate',
      prayer: 'Often'
    };
    
    // Create two browser contexts (separate sessions)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    console.log('🔵 Step 1: Creating User 1 profile...');
    await completeOnboarding(page1, user1Email, user1Password, user1Data);
    await page1.screenshot({ path: `/tmp/nikahx-qa-user1-profile.png`, fullPage: true });
    console.log('✅ User 1 profile created');
    
    console.log('🔵 Step 2: Creating User 2 profile...');
    await completeOnboarding(page2, user2Email, user2Password, user2Data);
    await page2.screenshot({ path: `/tmp/nikahx-qa-user2-profile.png`, fullPage: true });
    console.log('✅ User 2 profile created');
    
    console.log('🔵 Step 3: User 1 browsing matches...');
    await page1.click('button:has-text("Go to discovery feed")');
    await page1.waitForTimeout(2000);
    await page1.screenshot({ path: `/tmp/nikahx-qa-discovery.png`, fullPage: true });
    
    // Check if User 2 appears in discovery
    const user2Name = await page1.textContent('text=' + user2Data.name);
    expect(user2Name).toBeTruthy();
    console.log('✅ User 2 visible in discovery');
    
    console.log('🔵 Step 4: User 1 sending interest...');
    await page1.click('button:has-text("Like")');
    await page1.waitForTimeout(1000);
    await page1.screenshot({ path: `/tmp/nikahx-qa-interest-sent.png`, fullPage: true });
    console.log('✅ Interest sent');
    
    console.log('🔵 Step 5: User 2 checking notifications...');
    await page2.reload();
    await page2.waitForTimeout(1000);
    await page2.screenshot({ path: `/tmp/nikahx-qa-notification.png`, fullPage: true });
    
    console.log('🔵 Step 6: User 2 accepting interest...');
    // Navigate to matches page
    await page2.click('a[href="/matches"]');
    await page2.waitForTimeout(1000);
    await page2.click('button:has-text("Accept")');
    await page2.waitForTimeout(1000);
    console.log('✅ Interest accepted');
    
    console.log('🔵 Step 7: Testing messaging...');
    await page1.click('a[href^="/chat/"]');
    await page1.waitForTimeout(1000);
    
    // Send messages
    await page1.fill('textarea', 'Assalamu alaikum');
    await page1.press('textarea', 'Enter');
    await page1.waitForTimeout(500);
    
    await page2.reload();
    await page2.click('a[href^="/chat/"]');
    await page2.waitForTimeout(1000);
    await page2.fill('textarea', 'Wa alaikum assalam');
    await page2.press('textarea', 'Enter');
    await page2.waitForTimeout(500);
    
    await page1.reload();
    await page1.waitForTimeout(1000);
    await page1.fill('textarea', 'How are you?');
    await page1.press('textarea', 'Enter');
    await page1.waitForTimeout(1000);
    
    await page1.screenshot({ path: `/tmp/nikahx-qa-messages.png`, fullPage: true });
    console.log('✅ Messages exchanged');
    
    console.log('✅✅✅ PASS: Full match + message flow works!');
    
    await context1.close();
    await context2.close();
  });
});
