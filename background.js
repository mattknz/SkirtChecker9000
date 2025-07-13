const URL = "https://www.max.co.nz/carrie-tiered-skirt-310909vis-sapphire-night";
let currentPrice = "Checking...";

// Fetch price every hour
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('checkPrice', { periodInMinutes: 60 });
  checkPriceNow(); // Initial run on install
});

// Fetch price on browser startup (service worker wake-up)
chrome.runtime.onStartup.addListener(() => {
  checkPriceNow();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkPrice') {
    checkPriceNow();
  }
});

async function checkPriceNow() {
  try {
    const response = await fetch(URL);
    const text = await response.text();

    let newPrice = null;

    // Try new style price first (newer pages)
    let priceMatch = text.match(/<span[^>]*class="[^"]*price-item--regular[^"]*"[^>]*>([^<]+)<\/span>/i);

    if (priceMatch && priceMatch[1]) {
      newPrice = priceMatch[1].trim();
    } else {
      // Fallback to old style price container parsing (older pages)
      const containerMatch = text.match(/<span class="price-container[^>]*>([\s\S]*?)<\/span><\/span>/i);
      if (containerMatch) {
        const containerHTML = containerMatch[0];
        priceMatch = containerHTML.match(/<span class="price">(.*?)<\/span>/i);
        if (priceMatch && priceMatch[1]) {
          newPrice = priceMatch[1].trim();
        }
      }
    }

    if (newPrice) {
      if (newPrice !== currentPrice) {
        notifyPriceChange(currentPrice, newPrice);
        currentPrice = newPrice;
      }
    } else {
      currentPrice = "Price not found";
    }
  } catch (e) {
    currentPrice = "Error fetching price";
    console.error(e);
  }
}

function notifyPriceChange(oldPrice, newPrice) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Skirt Price Updated",
    message: `Old: ${oldPrice}\nNew: ${newPrice}`
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getCurrentPrice") {
    sendResponse({price: currentPrice});
  }
});
