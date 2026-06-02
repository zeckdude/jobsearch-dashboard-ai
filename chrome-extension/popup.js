const DEFAULT_APP_URL = "http://localhost:3000";
const STORAGE_KEYS = ["jobSearchOsToken", "jobSearchOsAppUrl", "jobSearchOsLastSavedJob"];
const fields = {
  title: document.querySelector("#title"),
  company: document.querySelector("#company"),
  location: document.querySelector("#location"),
  description: document.querySelector("#description"),
  apiUrl: document.querySelector("#apiUrl"),
  token: document.querySelector("#token"),
};
const statusElement = document.querySelector("#status");
const captureButton = document.querySelector("#capture");
const applyNowButton = document.querySelector("#applyNow");
const fillApplicationButton = document.querySelector("#fillApplication");
const openJobLink = document.querySelector("#openJob");
let capturedPayload = null;
let lastSavedJob = null;

function setStatus(message) {
  statusElement.textContent = message;
}

function normalizeAppUrl(value) {
  return (value || DEFAULT_APP_URL).trim().replace(/\/+$/, "");
}

function captureEndpoint() {
  return `${normalizeAppUrl(fields.apiUrl.value)}/api/jobs/capture`;
}

function assistantPackageByUrlEndpoint(pageUrl) {
  return `${normalizeAppUrl(fields.apiUrl.value)}/api/applications/assistant-package/by-url?url=${encodeURIComponent(pageUrl)}`;
}

function applyNowEndpoint(jobId) {
  return `${normalizeAppUrl(fields.apiUrl.value)}/api/jobs/${encodeURIComponent(jobId)}/apply-now`;
}

function setOpenJobLink(jobUrl) {
  if (!jobUrl) {
    openJobLink.hidden = true;
    openJobLink.href = "#";
    return;
  }
  openJobLink.href = `${normalizeAppUrl(fields.apiUrl.value)}${jobUrl}`;
  openJobLink.hidden = false;
}

function setApplyNowJob(job) {
  lastSavedJob = job?.jobId ? job : null;
  applyNowButton.hidden = !lastSavedJob;
  applyNowButton.textContent = lastSavedJob ? `Apply Now: ${lastSavedJob.company || "saved job"}` : "Apply Now";
}

function savedJobFromCaptureResponse(payload) {
  if (!payload?.jobId) return null;
  return {
    jobId: payload.jobId,
    jobUrl: payload.jobUrl || `/jobs/${payload.jobId}`,
    company: payload.company || payload.job?.company || "",
    title: payload.title || payload.job?.title || "",
    savedAt: new Date().toISOString(),
  };
}

function currentPayload() {
  return {
    ...capturedPayload,
    title: fields.title.value.trim(),
    company: fields.company.value.trim(),
    location: fields.location.value.trim(),
    description: fields.description.value.trim(),
    sourceName: "Chrome Capture",
  };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadCapture() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEYS);
    fields.apiUrl.value = stored.jobSearchOsAppUrl || DEFAULT_APP_URL;
    fields.token.value = stored.jobSearchOsToken || "";
    setApplyNowJob(stored.jobSearchOsLastSavedJob || null);
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error("No active tab found.");
    const payload = await chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_JOB_PAGE" });
    capturedPayload = payload;
    fields.title.value = payload.title || "";
    fields.company.value = payload.company || "";
    fields.location.value = payload.location || "";
    fields.description.value = payload.description || "";
    setOpenJobLink(null);
    const applyText = lastSavedJob ? " Apply Now is available for the last saved job." : "";
    setStatus(`Review fields before saving.${applyText}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to inspect this tab.");
  }
}

async function saveCapture() {
  captureButton.disabled = true;
  setStatus("Saving...");
  try {
    const token = fields.token.value.trim();
    const appUrl = normalizeAppUrl(fields.apiUrl.value);
    await chrome.storage.local.set({ jobSearchOsToken: token, jobSearchOsAppUrl: appUrl });
    const response = await fetch(captureEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-job-search-os-token": token } : {}),
      },
      body: JSON.stringify(currentPayload()),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to save job.");
    setOpenJobLink(payload.jobUrl);
    const savedJob = savedJobFromCaptureResponse(payload);
    if (savedJob) {
      await chrome.storage.local.set({ jobSearchOsLastSavedJob: savedJob });
      setApplyNowJob(savedJob);
    }
    const displayedMatchCount = Number.isFinite(payload.initialMatchCount) ? payload.initialMatchCount : payload.matchCount;
    const matchText = Number.isFinite(displayedMatchCount) ? ` ${displayedMatchCount} matching profiles.` : "";
    const profileText = payload.profileCreated && payload.profileName ? ` Created search profile: ${payload.profileName}.` : "";
    setStatus(`${payload.message || "Saved."}${matchText}${profileText}`);
  } catch (error) {
    setOpenJobLink(null);
    setStatus(error instanceof Error ? error.message : "Unable to save job.");
  } finally {
    captureButton.disabled = false;
  }
}

async function applyNow() {
  if (!lastSavedJob?.jobId) {
    setStatus("Save a job first, then navigate to the application page and click Apply Now.");
    return;
  }
  applyNowButton.disabled = true;
  setStatus("Preparing resume and cover letter, then launching assistant...");
  try {
    const token = fields.token.value.trim();
    const appUrl = normalizeAppUrl(fields.apiUrl.value);
    await chrome.storage.local.set({ jobSearchOsToken: token, jobSearchOsAppUrl: appUrl });
    const tab = await getActiveTab();
    if (!tab?.url) throw new Error("No active application tab URL found.");
    const response = await fetch(applyNowEndpoint(lastSavedJob.jobId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-job-search-os-token": token } : {}),
      },
      body: JSON.stringify({
        applicationUrl: tab.url,
        pageUrl: tab.url,
        atsProvider: capturedPayload?.atsProvider,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to launch Apply Now.");
    setStatus(payload.message || "Assistant launched. Review the browser and submit manually.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to launch Apply Now.");
  } finally {
    applyNowButton.disabled = false;
  }
}

async function fillApplicationFromPackage() {
  fillApplicationButton.disabled = true;
  setStatus("Loading application package...");
  try {
    const token = fields.token.value.trim();
    const appUrl = normalizeAppUrl(fields.apiUrl.value);
    await chrome.storage.local.set({ jobSearchOsToken: token, jobSearchOsAppUrl: appUrl });
    const tab = await getActiveTab();
    if (!tab?.id || !tab.url) throw new Error("No active application tab found.");
    const response = await fetch(assistantPackageByUrlEndpoint(tab.url), {
      headers: {
        ...(token ? { "x-job-search-os-token": token } : {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to load an application package for this page.");
    const result = await chrome.tabs.sendMessage(tab.id, { type: "FILL_APPLICATION_FROM_PACKAGE", package: payload });
    const filled = Number(result?.filled || 0);
    const skipped = Number(result?.skipped || 0);
    const uploads = Number(result?.uploads || 0);
    const warning = uploads ? ` ${uploads} upload field(s) still need manual file selection.` : "";
    setStatus(`Filled ${filled} field(s). Skipped ${skipped}.${warning} Review and submit manually.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to fill this application.");
  } finally {
    fillApplicationButton.disabled = false;
  }
}

captureButton.addEventListener("click", () => {
  void saveCapture();
});

applyNowButton.addEventListener("click", () => {
  void applyNow();
});

fillApplicationButton.addEventListener("click", () => {
  void fillApplicationFromPackage();
});

void loadCapture();
