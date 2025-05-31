// utils/api.js

async function sendMetadataToBackend(
  id,
  downloadMetaData,
  fetchedMetaData,
  domainDetails,
  partialHash
) {
  try {
    // Step 1: Fetch device info first
    const deviceInfoResponse = await fetch("http://127.0.0.1:5050/device_info");
    const deviceInfo = await deviceInfoResponse.json();
    console.log("[API] Device Info fetched:", deviceInfo);

    // Step 2: Prepare final data payload
    const dataToSend = {
      id: id,
      data: {
        download_meta_data: downloadMetaData,
        fetched_complete_metadata: fetchedMetaData,
        downloadFileNameDomainUrlDetails: domainDetails,
        partial_hash: partialHash,
        device_info: deviceInfo,
      },
    };

    // Step 3: Send it to server
    const response = await fetch("http://127.0.0.1:5050/process_download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    });

    if (!response.ok) {
      console.error(
        "[API] Server responded with an error:",
        response.statusText
      );
      return null;
    }

    const result = await response.json();
    console.log("[API] Server Response:", result);
    return result.action; // Expected values: 0, -1, or 1
  } catch (error) {
    console.error("[API] Communication failed:", error);
    return null;
  }
}

export { sendMetadataToBackend };
