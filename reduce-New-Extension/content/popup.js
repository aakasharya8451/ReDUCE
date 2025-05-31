// content/popup.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showPopup") {
    chrome.storage.local.get(["enableDownloadPopups"], (result) => {
      if (result.enableDownloadPopups !== false) {
        createFloatingPopup(
          message.downloadId,
          message.message,
          message.filename
        );
      } else {
        console.log(
          "[Content] Popups are disabled by user settings. Not showing."
        );
      }
    });
  } else if (message.action === "closePopup") {
    removePopup(message.downloadId);
  }
});

function createFloatingPopup(downloadId, messageText, filename) {
  if (document.getElementById(`popup-${downloadId}`)) return;

  const container = document.createElement("div");
  container.id = `popup-${downloadId}`;
  container.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 99999;
    background: #ffffff;
    color: #333333;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0px 2px 10px rgba(0,0,0,0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 300px;
    text-align: center;
    border: 1px solid #ccc;
  `;

  const title = document.createElement("h3");
  title.textContent = "Duplicate Download Detected!";
  title.style.marginBottom = "10px";
  title.style.fontSize = "18px";
  container.appendChild(title);

  const fileInfo = document.createElement("p");
  fileInfo.textContent = `File: ${filename || "Unknown"}`;
  fileInfo.style.fontSize = "14px";
  fileInfo.style.marginBottom = "15px";
  container.appendChild(fileInfo);

  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.justifyContent = "space-around";

  const actionButton = document.createElement("button");
  actionButton.textContent = "Action";
  actionButton.style = `
    padding: 8px 15px;
    background: #007bff;
    border: none;
    border-radius: 5px;
    color: white;
    cursor: pointer;
    font-size: 14px;
  `;
  actionButton.onclick = () => {
    console.log("[Popup] Action button clicked!");

    // Phase 3.3: Will open main popup (chrome.action.openPopup)
    chrome.runtime.sendMessage({
      action: "openManagerPopup",
    });

    // Optionally remove this floating popup after clicking Action
    removePopup(downloadId);
  };
  buttonContainer.appendChild(actionButton);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style = `
    padding: 8px 15px;
    background: #6c757d;
    border: none;
    border-radius: 5px;
    color: white;
    cursor: pointer;
    font-size: 14px;
  `;
  closeButton.onclick = () => {
    chrome.runtime.sendMessage({
      action: "popupClosed",
      downloadId: downloadId,
    });
    removePopup(downloadId);
  };
  buttonContainer.appendChild(closeButton);

  container.appendChild(buttonContainer);

  document.body.appendChild(container);
}

function removePopup(downloadId) {
  const popup = document.getElementById(`popup-${downloadId}`);
  if (popup) {
    popup.remove();
  }
}
