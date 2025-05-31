import {
  fetchHeadData,
  computePartialHash,
  extractDomain,
} from "../utils/downloadUtils.js";
import { sendMetadataToBackend } from "../utils/api.js";

// Maps and Objects
const downloadDetailsMap = new Map();
const activeDownloads = {};
const downloadHistory = [];

// ⏫ Added: Load persisted state
async function loadState() {
  const data = await chrome.storage.local.get([
    "activeDownloads",
    "downloadHistory",
  ]);
  Object.assign(activeDownloads, data.activeDownloads || {});
  downloadHistory.splice(
    0,
    downloadHistory.length,
    ...(data.downloadHistory || [])
  );
}
(async function initObserver() {
  await loadState();
  broadcastDownloads();
})();


// ✅ Update and persist download state
function broadcastDownloads() {
  chrome.runtime.sendMessage(
    {
      action: "downloadsUpdated",
      activeDownloads,
      downloadHistory,
    },
    () => {
      if (chrome.runtime.lastError) {
        // Happens if no listeners are ready
        if (
          !chrome.runtime.lastError.message.includes(
            "Receiving end does not exist"
          )
        ) {
          console.warn(
            "[Observer] Message failed:",
            chrome.runtime.lastError.message
          );
        }
      }
    }
  );

  chrome.storage.local.set({ activeDownloads, downloadHistory });
}


// Function to show floating popup on all tabs
function sendPopupToAllTabs(downloadId, messageText, filename) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && /^https?:\/\//.test(tab.url)) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["content/popup.js"],
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.warn(
                `[Observer] Injection failed for tab ${tab.id}:`,
                chrome.runtime.lastError.message
              );
              return;
            }
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: "showPopup",
                downloadId,
                message: messageText,
                filename,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.warn(
                    `[Observer] Sending showPopup failed for tab ${tab.id}:`,
                    chrome.runtime.lastError.message
                  );
                }
              }
            );
          }
        );
      }
    }
  });
}

// Function to close floating popup on all tabs
function broadcastClosePopup(downloadId) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && /^https?:\/\//.test(tab.url)) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["content/popup.js"],
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.warn(
                `[Observer] Injection failed for tab ${tab.id}:`,
                chrome.runtime.lastError.message
              );
              return;
            }
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: "closePopup",
                downloadId,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.warn(
                    `[Observer] Sending closePopup failed for tab ${tab.id}:`,
                    chrome.runtime.lastError.message
                  );
                }
              }
            );
          }
        );
      }
    }
  });
}

// Event: Determining filename (capture domain details early)
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  const domain = extractDomain(downloadItem.url);
  const fileName = downloadItem.filename || "Unknown File";

  const downloadFileNameDomainUrlDetails = {
    id: downloadItem.id,
    downloadFileName: fileName,
    domain: domain,
  };

  console.log(
    "[Observer] Captured downloadFileNameDomainUrlDetails:",
    downloadFileNameDomainUrlDetails
  );

  downloadDetailsMap.set(downloadItem.id, downloadFileNameDomainUrlDetails);

  // If activeDownloads already exists, update its filename immediately.
  if (activeDownloads[downloadItem.id]) {
    activeDownloads[downloadItem.id].filename = fileName;
    broadcastDownloads();
  }

  suggest(); // Proceed normally
});

// Event: When new download is created
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  console.log("[Observer] New download detected:", downloadItem);
  if (!downloadItem || !downloadItem.id) return;

  const domainDetails = downloadDetailsMap.get(downloadItem.id);

  // Add to active downloads using proper filename (falling back if needed)
  activeDownloads[downloadItem.id] = {
    id: downloadItem.id,
    filename:
      domainDetails?.downloadFileName ||
      downloadItem.filename ||
      "Unknown File",
    state: downloadItem.state || "in_progress",
  };
  broadcastDownloads();

  // Pause the download first
  chrome.downloads.pause(downloadItem.id, async () => {
    if (chrome.runtime.lastError) {
      console.error(
        "[Observer] Error pausing:",
        chrome.runtime.lastError.message
      );
      return;
    }
    console.log(`[Observer] Download paused: ${downloadItem.id}`);

    // Explicitly mark it as paused so popup shows "Paused"
    if (activeDownloads[downloadItem.id]) {
      activeDownloads[downloadItem.id].state = "paused";
      broadcastDownloads();
    }

    // Prepare metadata
    const downloadMetaData = {
      id: downloadItem.id,
      url: downloadItem.url,
      filename: downloadItem.filename || "Unknown",
      mime: downloadItem.mime || "Unknown",
      totalBytes: downloadItem.totalBytes || "Unknown",
      state: downloadItem.state || "in_progress",
      startTime: downloadItem.startTime || new Date().toISOString(),
      referrer: downloadItem.referrer || "None",
      finalUrl: downloadItem.finalUrl || downloadItem.url,
    };

    // Fetch additional HEAD metadata
    const fetchedMetaData = await fetchHeadData(
      downloadItem.finalUrl || downloadItem.url,
      downloadItem.id
    );

    // Get domain and fileName info (if not already updated)
    const downloadFileNameDomainUrlDetails = downloadDetailsMap.get(
      downloadItem.id
    ) || {
      id: downloadItem.id,
      downloadFileName: downloadItem.filename || "Unknown",
      domain: extractDomain(downloadItem.url),
    };
    downloadDetailsMap.delete(downloadItem.id); // Clean up

    // Compute partial hash
    const partialHash = await computePartialHash(
      downloadItem.url,
      downloadItem.totalBytes
    );

    // Send metadata to backend
    const backendResponse = await sendMetadataToBackend(
      downloadItem.id,
      downloadMetaData,
      fetchedMetaData,
      downloadFileNameDomainUrlDetails,
      partialHash
    );
    console.log("[Observer] Backend response received:", backendResponse);

    // Handle backend response
    if (backendResponse === 1) {
      console.log("[Observer] Duplicate detected. Showing popup...");
      sendPopupToAllTabs(
        downloadItem.id,
        "Duplicate download detected!",
        downloadFileNameDomainUrlDetails.downloadFileName
      );
    } else if (backendResponse === 0) {
      console.log("[Observer] Normal download. Resuming...");
      chrome.downloads.resume(downloadItem.id, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "[Observer] Error resuming download:",
            chrome.runtime.lastError.message
          );
        } else {
          console.log(`[Observer] Download resumed: ${downloadItem.id}`);
        }
      });
    }
  });
});

// Event: When download changes (status update)
chrome.downloads.onChanged.addListener((delta) => {
  if (!delta || !delta.id) return;
  if (delta.state && delta.state.current) {
    const newState = delta.state.current;
    if (activeDownloads[delta.id]) {
      activeDownloads[delta.id].state = newState;
      if (newState === "complete" || newState === "interrupted") {
        downloadHistory.push(activeDownloads[delta.id]);
        delete activeDownloads[delta.id];
      }
      broadcastDownloads();
    }
  }
});

// Unified Message Listener (for all popup ← background communication)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "requestData" || message.action === "getDownloads") {
    sendResponse({ activeDownloads, downloadHistory });
  }
  if (message.action === "cancelDownload") {
    chrome.downloads.cancel(message.downloadId);
  }
  if (message.action === "forceDownload") {
    chrome.downloads.resume(message.downloadId);
  }
  if (message.action === "popupClosed") {
    console.log(
      `[Observer] User clicked Close. Removing popups for ID: ${message.downloadId}`
    );
    broadcastClosePopup(message.downloadId);
  }
  if (message.action === "openManagerPopup") {
    console.log("[Observer] Received openManagerPopup request.");
    chrome.action
      .openPopup()
      .then(() => {
        console.log("[Observer] Manager Popup opened successfully.");
      })
      .catch((error) => {
        console.error("[Observer] Failed to open Manager Popup:", error);
      });
  }
});
