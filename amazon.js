const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const crawlab = require('crawlab-sdk');
puppeteer.use(StealthPlugin());

async function scrapePage(page) {
    const products = await page.evaluate(() => {
        const productNodes = document.querySelectorAll('.s-result-item[data-asin]');
        const products = [];

        productNodes.forEach((node) => {
            const title = node.querySelector('.a-link-normal .a-text-normal')?.textContent;
            const link = node.querySelector('.a-link-normal')?.href;
            const priceElement = node.querySelector(
                '.a-price .a-offscreen, .a-color-price, span[data-a-color="base"]'
            );
            const rating = node.querySelector('.a-icon-alt')?.textContent;

            let price = 'Price not available';
            if (priceElement) {
                const priceText = priceElement.textContent.trim();
                const priceMatch = priceText.match(/[\d,.]+/);
                if (priceMatch) {
                    price = priceMatch[0].replace(',', '.');
                }
            }

            if (title && link) {
                products.push({ title, link, price, rating });
            }
        });
        crawlab.saveItems(products);
        return products;
    });

    return products;
}

async function scrapeAmazon(keyword, maxPages = 1) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080',
        ],
    });
    const page = await browser.newPage();

    let allProducts = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
        const url = `https://www.amazon.com/s?field-keywords=${encodeURIComponent(
            keyword
        )}&page=${currentPage}`;
        await page.goto(url, { waitUntil: 'networkidle2' });

        const products = await scrapePage(page);
        allProducts = allProducts.concat(products);

        currentPage++;
    }

    await browser.close();
    return allProducts;
}

if (process.argv.length < 3) {
    console.error('Please provide a keyword to search for.');
    process.exit(1);
}

const keyword = process.argv[2];
const maxPages = process.argv[3] ? parseInt(process.argv[3], 10) : 1;

scrapeAmazon(keyword, maxPages)
    .then((products) => {
        console.log('Products:', products);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
