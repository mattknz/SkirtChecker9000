document.getElementById('saveUrl').addEventListener('click', () => {
  const url = document.getElementById('urlInput').value;
  chrome.storage.local.set({ trackedUrl: url }, () => {
    document.getElementById('status').textContent = 'URL saved!';
    // Trigger price + name check in background
    chrome.runtime.sendMessage({ action: 'checkPriceNow' });
    setTimeout(() => document.getElementById('status').textContent = '', 2000);
  });
});

// Populate the URL field on popup open
chrome.storage.local.get('trackedUrl', (data) => {
  if (data.trackedUrl) {
    document.getElementById('urlInput').value = data.trackedUrl;
  }
});

function getPriceAndName() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getCurrentPrice" }, (response) => {
      resolve({
        price: response?.price,
        name: response?.name
      });
    });
  });
}

async function waitForData(timeout = 5000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const { price, name } = await getPriceAndName();
    if (price && price !== "Checking...") {
      document.getElementById("price").innerText = price;
      document.getElementById("itemName").innerText = name || "Unknown item";
      return;
    }
    document.getElementById("price").innerText = "Loading price...";
    document.getElementById("itemName").innerText = "Loading name...";
    await new Promise(res => setTimeout(res, 500));
  }

  document.getElementById("price").innerText = "Price unavailable";
  document.getElementById("itemName").innerText = "Name unavailable";
}

waitForData().catch(err => {
  console.error(err);
  document.getElementById("price").innerText = "Extension error.";
  document.getElementById("itemName").innerText = "Extension error.";
});
