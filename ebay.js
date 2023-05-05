const puppeteer = require('puppeteer');
const crawlab = require('crawlab-sdk');

async function scrapeEbay(keyword, pageNumber = 1) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080'
        ]
    });
    const page = await browser.newPage();

    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_sacat=0&_ipg=200&rt=nc&LH_Auction=1&_pgn=${pageNumber}`;
    await page.goto(url, { waitUntil: 'networkidle2' });

    const listings = await page.evaluate(() => {
        const itemNodes = document.querySelectorAll('.srp-results .s-item');
        const items = [];

        itemNodes.forEach(node => {
            const title = node.querySelector('.s-item__info.clearfix span')?.textContent;
            const link = node.querySelector('.s-item__info.clearfix a')?.href;
            const img = node.querySelector('.s-item__image-wrapper img')?.src;
            const price = node.querySelector('.s-item__price')?.textContent;
            const listingType = node.querySelector('.s-item__purchase-options-with-icon span')?.textContent;
            const bids = node.querySelector('.s-item__bidCount span')?.textContent;
            const endingDateTime = node.querySelector('.s-item__time-left')?.textContent;
            const description = node.querySelector('.s-item__summary')?.textContent;
            const shippingPrice = node.querySelector('.s-item__shipping')?.textContent;
            const location = node.querySelector('.s-item__location')?.textContent;
            const seller = node.querySelector('.s-item__seller-info-text')?.textContent;
            const condition = node.querySelector('.SECONDARY_INFO')?.textContent;
            const feedbackScore = node.querySelector('.s-item__feedbackCount')?.textContent;
            const feedbackPercentage = node.querySelector('.s-item__feedbackPercentage')?.textContent;
            const topRated = node.querySelector('.s-item__etrs-text')?.textContent;
            const sponsored = node.querySelector('.s-item__etrs-text.s-item__etrs-text--sponsored')?.textContent;
            const itemID = node.querySelector('.s-item__itemID')?.textContent;
            const timeLeft = node.querySelector('.s-item__time-left')?.textContent;

            if (title && link && img && price) {
                items.push({ title, link, img, price, listingType, bids, endingDateTime, description, shippingPrice, location, seller, condition, feedbackScore, feedbackPercentage, topRated, sponsored, itemID, timeLeft });
            }
        });

        return items;
    });

    await browser.close();
    crawlab.saveItems(listings);
    // Check if there are more than 239 results and move on to the next page
    if (listings.length > 239) {
        const nextPageListings = await scrapeEbay(keyword, pageNumber + 1);
        crawlab.saveItems(nextPageListings);
        return nextPageListings;
    }

    return listings;
}

if (process.argv.length < 3) {
    console.error('Please provide a keyword to search for.');
    process.exit(1);
}

const keyword = process.argv[2];
const pageNumber = process.argv[3] || 1;

scrapeEbay(keyword, pageNumber)
    .then(listings => {
        console.log('Listings:', listings);
    })
    .catch(error => {
        console.error('Error:', error);
    });

