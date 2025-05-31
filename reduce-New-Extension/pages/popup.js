import {
  populateActiveDownloads,
  populateDownloadHistory,
} from "../utils/common.js";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  const popupToggle = document.getElementById("popupToggle");

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.getAttribute("data-tab");
      tabContents.forEach((content) => {
        content.style.display = content.id === target ? "block" : "none";
      });
    });
  });

  // Initialize popupToggle (Enable Download Popups)
  chrome.storage.local.get(["enableDownloadPopups"], (result) => {
    popupToggle.checked = result.enableDownloadPopups !== false; // Default true
  });

  // Save when popup toggle changes
  popupToggle.addEventListener("change", () => {
    const value = popupToggle.checked;
    chrome.storage.local.set({ enableDownloadPopups: value });
  });

  // Populate tables initially
  chrome.runtime.sendMessage({ action: "requestData" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn(
        "Background not available yet:",
        chrome.runtime.lastError.message
      );
      return; // gracefully return if background not ready
    }
    if (response) {
      populateActiveDownloads(
        response.activeDownloads,
        document.querySelector("#active-table tbody")
      );
      populateDownloadHistory(
        response.downloadHistory,
        document.querySelector("#history-table tbody")
      );
    }
  });

  // Listen for updates from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "downloadsUpdated") {
      populateActiveDownloads(
        message.activeDownloads,
        document.querySelector("#active-table tbody")
      );
      populateDownloadHistory(
        message.downloadHistory,
        document.querySelector("#history-table tbody")
      );
    }
  });
});
