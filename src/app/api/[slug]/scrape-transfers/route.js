import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Navegando al sitio...');
    await page.goto('https://www.bancolombia.com/personas');
    await page.screenshot({ path: 'step-1.png' });
    await page.click('#mobile-button');
    await page.click('#btn-transaccional-mobile');

    console.log('Ingresando credenciales...');
    await page.setDefaultTimeout(30000);
    await page.type('username', 'yamidjhonatan1');
    await page.click('#btnGo');
    await page.type('#password', 'mi_contraseña');
    await page.screenshot({ path: 'step-2.png' });

    console.log('Iniciando sesión...');
    await page.click('#btn-transaccional');
    await page.waitForNavigation();
    await page.screenshot({ path: 'step-3.png' });

    console.log('Navegando al historial de transferencias...');
    await page.goto('https://www.bancolombia.com/transfers/history');
    await page.screenshot({ path: 'step-4.png' });

    console.log('Script ejecutado correctamente.');
    await browser.close();
  } catch (error) {
    console.error('Error en el script:', error);
  }
})();
