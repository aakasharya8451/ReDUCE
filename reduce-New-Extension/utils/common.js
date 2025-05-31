// Helper: Capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper: Map download state to friendly user status
function mapStateToFriendlyStatus(state) {
  switch (state) {
    case "in_progress":
      return "Downloading";
    case "paused":
      return "Paused";
    case "complete":
      return "Download Complete";
    case "interrupted":
      return "Download Cancelled";
    default:
      return capitalizeFirstLetter(state || "Unknown");
  }
}

// Create table row for Active or History downloads
function createTableRow(download, isActive = true) {
  const tr = document.createElement("tr");

  // ID Column
  const idTd = document.createElement("td");
  idTd.textContent = download.id;
  tr.appendChild(idTd);

  // Filename Column
  const filenameTd = document.createElement("td");
  filenameTd.textContent = download.filename || "Unknown File";
  tr.appendChild(filenameTd);

  // Status Column
  const statusTd = document.createElement("td");
  statusTd.textContent = mapStateToFriendlyStatus(download.state);
  tr.appendChild(statusTd);

  // Actions Column (only for active downloads)
  if (isActive) {
    const actionsTd = document.createElement("td");

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.className = "cancel-btn";
    cancelButton.onclick = () => {
      chrome.runtime.sendMessage({
        action: "cancelDownload",
        downloadId: download.id,
      });
    };
    actionsTd.appendChild(cancelButton);

    const forceButton = document.createElement("button");
    forceButton.textContent = "Force";
    forceButton.className = "force-btn";
    forceButton.onclick = () => {
      chrome.runtime.sendMessage({
        action: "forceDownload",
        downloadId: download.id,
      });
    };
    actionsTd.appendChild(forceButton);

    tr.appendChild(actionsTd);
  }

  return tr;
}

// Populate Active Downloads Table
function populateActiveDownloads(activeDownloads, tableBody) {
  tableBody.innerHTML = "";

  if (!activeDownloads || Object.keys(activeDownloads).length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No active downloads.";
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  for (const id in activeDownloads) {
    const download = activeDownloads[id];
    const tr = createTableRow(download, true);
    tableBody.appendChild(tr);
  }
}

// Populate Download History Table
function populateDownloadHistory(downloadHistory, tableBody) {
  tableBody.innerHTML = "";

  if (!downloadHistory || downloadHistory.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "No download history.";
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  for (const download of downloadHistory) {
    const tr = createTableRow(download, false);
    tableBody.appendChild(tr);
  }
}

export {
  capitalizeFirstLetter,
  mapStateToFriendlyStatus,
  createTableRow,
  populateActiveDownloads,
  populateDownloadHistory,
};
