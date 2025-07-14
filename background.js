let currentPrice = "Checking...";
let currentItemName = "Unknown Item";

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

function checkPriceNow() {
  chrome.storage.local.get('trackedUrl', (data) => {
    const url = data.trackedUrl;
    if (!url) {
      console.warn("No URL set in storage.");
      currentPrice = "No URL set";
      currentItemName = "No URL set";
      return;
    }

    fetchPriceFromUrl(url);
  });
}

async function fetchPriceFromUrl(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Extract item name
    const nameMatch = text.match(/<span[^>]*class="base"[^>]*data-ui-id="page-title-wrapper"[^>]*>([^<]+)<\/span>/i);
    if (nameMatch && nameMatch[1]) {
      currentItemName = nameMatch[1].trim();
    } else {
      currentItemName = "Name not found";
    }

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
      console.warn("Could not find price on page.");
    }
  } catch (e) {
    currentPrice = "Error fetching price";
    currentItemName = "Error fetching name";
    console.error("Error fetching price:", e);
  }
}

function notifyPriceChange(oldPrice, newPrice) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Price Updated",
    message: `Old: ${oldPrice}\nNew: ${newPrice}`
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getCurrentPrice") {
    sendResponse({ price: currentPrice, name: currentItemName });
  }
  if (msg.action === "checkPriceNow") {
    checkPriceNow();
  }
});

