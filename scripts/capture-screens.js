const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function captureAll() {
  const outputDir = path.resolve(__dirname, '../demo_assets');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('1. Capturing Organ Radar...');
  await page.goto('https://arkiv-umber.vercel.app', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outputDir, '01_radar_hero.png') });

  console.log('2. Opening Harvest Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Harvest Organ') || x.innerText.includes('Harvest'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outputDir, '02_harvest_modal.png') });

  console.log('3. Closing modal and opening Waitlist Tab...');
  await page.evaluate(() => {
    const cancel = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Cancel'));
    if (cancel) cancel.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Waitlist'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outputDir, '03_waitlist_tab.png') });

  console.log('4. Capturing Dispatch Tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Corridor') || x.innerText.includes('Dispatch'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outputDir, '04_dispatch_tab.png') });

  console.log('5. Capturing On-Chain Inspector Tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Inspector'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outputDir, '05_inspector_tab.png') });

  console.log('6. Capturing Arkiv Tiramisu Explorer Verification...');
  await page.goto('https://tiramisu.explorer.arkiv.network/address/0x312d820b86Ab738f62cbEF5bcBb1DAC72660E617', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(outputDir, '06_explorer_proof.png') });

  await browser.close();
  console.log('🎉 All 6 high-res screenshots captured successfully in demo_assets/!');
}

captureAll().catch(console.error);
