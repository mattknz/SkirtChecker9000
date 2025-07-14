document.getElementById('saveUrl').addEventListener('click', () => {
  const url = document.getElementById('urlInput').value;
  chrome.storage.local.set({ trackedUrl: url }, () => {
    document.getElementById('status').textContent = 'URL saved!';
        // 👇 New: Trigger price check in background
    chrome.runtime.sendMessage({ action: 'checkPriceNow' });
    setTimeout(() => document.getElementById('status').textContent = '', 2000);
  });
});

// Populate field with saved URL
chrome.storage.local.get('trackedUrl', (data) => {
  if (data.trackedUrl) {
    document.getElementById('urlInput').value = data.trackedUrl;
  }
});

function getPrice() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getCurrentPrice" }, (response) => {
      resolve(response?.price);
    });
  });
}

async function waitForPrice(timeout = 5000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const price = await getPrice();
    if (price && price !== "Checking...") {
      document.getElementById("price").innerText = price;
      return;
    }
    document.getElementById("price").innerText = "Loading price...";
    await new Promise(res => setTimeout(res, 500));
  }

  document.getElementById("price").innerText = "Price unavailable";
}

waitForPrice().catch(err => {
  console.error(err);
  document.getElementById("price").innerText = "Extension error.";
});
