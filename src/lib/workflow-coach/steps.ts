export type StepTiming = "morning" | "midday" | "evening" | "weekly" | "setup";

export type SpotlightHint = {
  target: string; // matches data-workflow-target="..."
  instruction: string;
  /**
   * How this step is confirmed before the user can advance:
   * "click"   — listen for a DOM click on the target element (auto-advances)
   * "observe" — show a button the user must explicitly click (requires confirmLabel)
   */
  confirmType: "click" | "observe";
  /** Button label shown for "observe" hints (e.g. "I've read the Daily Plan") */
  confirmLabel?: string;
  /**
   * CSS selector — this hint is only shown when the selector matches a DOM element.
   * Evaluated each time the user advances a step.
   */
  showIfSelector?: string;
  /**
   * CSS selector — this hint is hidden when the selector matches a DOM element.
   * Evaluated each time the user advances a step.
   */
  hideIfSelector?: string;
};

export type WorkflowStep = {
  key: string;
  label: string;
  description: string;
  route: string;
  timing: StepTiming;
  timeEstimateMin: number;
  hints: SpotlightHint[];
  /** steps that can be done multiple times per day */
  repeatable?: boolean;
  /** for weekly steps: only surfaces Wed–Fri */
  weeklySmartCadence?: boolean;
};

export type SetupStep = WorkflowStep & { timing: "setup" };

export const SETUP_STEPS: SetupStep[] = [
  {
    key: "setup-resume",
    label: "Upload your resume",
    description: "Upload a resume file so the system can parse your work history and build your evidence library.",
    route: "/resume",
    timing: "setup",
    timeEstimateMin: 2,
    hints: [
      { target: "resume-import-btn", instruction: "Click Import from PDF to upload your resume file, or enter your work history manually below.", confirmType: "observe", confirmLabel: "I've started my resume" },
    ],
  },
  {
    key: "setup-profile",
    label: "Fill in your candidate profile",
    description: "Add your LinkedIn URL, master summary, and core skills so materials can be tailored to you.",
    route: "/resume",
    timing: "setup",
    timeEstimateMin: 5,
    hints: [
      { target: "profile-summary-field", instruction: "Write a 2–3 sentence master summary of your professional background. This is used to tailor every cover letter and resume.", confirmType: "observe", confirmLabel: "I've written my summary" },
      { target: "profile-linkedin-field", instruction: "Paste your full LinkedIn profile URL here (e.g. linkedin.com/in/yourname).", confirmType: "observe", confirmLabel: "I've added my LinkedIn URL" },
      { target: "profile-save-btn", instruction: "Click Save to store your profile. You'll see a confirmation when it's saved.", confirmType: "click" },
    ],
  },
  {
    key: "setup-search-profiles",
    label: "Create a search profile",
    description: "Tell the system what roles and locations to search for. At least one profile must be enabled.",
    route: "/profiles",
    timing: "setup",
    timeEstimateMin: 5,
    hints: [
      { target: "create-profile-btn", instruction: "Click Create Profile to start configuring your first search. Each profile represents a role + location combo you're targeting.", confirmType: "click" },
      { target: "profile-titles-field", instruction: "Add the exact job titles you're targeting (e.g. 'Senior Product Manager', 'Head of Product'). Be specific — these drive search quality.", confirmType: "observe", confirmLabel: "I've added my target titles" },
      { target: "profile-enable-toggle", instruction: "Make sure this toggle is ON (green). Only enabled profiles run during the daily search.", confirmType: "observe", confirmLabel: "Toggle is enabled" },
    ],
  },
  {
    key: "setup-sources",
    label: "Enable job sources",
    description: "Enable at least one job source (Greenhouse, Lever, etc.) so the daily search has somewhere to look.",
    route: "/sources",
    timing: "setup",
    timeEstimateMin: 3,
    hints: [
      { target: "source-enable-toggle", instruction: "Flip this toggle to enable a job source. Enabled sources are crawled every time the daily search runs.", confirmType: "observe", confirmLabel: "I've enabled a source" },
      { target: "add-source-btn", instruction: "Or click here to add a brand-new source by pasting its Greenhouse / Lever / Ashby URL.", confirmType: "click" },
    ],
  },
  {
    key: "setup-openai",
    label: "Configure OpenAI API key",
    description: "An OpenAI API key is required for scoring, resume generation, and Jolene. Add it in Settings.",
    route: "/settings",
    timing: "setup",
    timeEstimateMin: 2,
    hints: [
      { target: "service-health-panel", instruction: "Check the Service Health panel. OpenAI should show a green checkmark. If it's red, add your OPENAI_API_KEY to your .env file and restart the server.", confirmType: "observe", confirmLabel: "OpenAI shows green" },
    ],
  },
];

export const DAILY_STEPS: WorkflowStep[] = [
  // Morning
  {
    key: "command-center",
    label: "Command Center",
    description: "Read the Daily Plan, check the overnight Search Run and Agency Run results.",
    route: "/dashboard",
    timing: "morning",
    timeEstimateMin: 5,
    hints: [
      // If no plan exists yet, explain what it is and ask them to generate one
      { target: "run-daily-plan-btn", instruction: "The Daily Plan is an AI-generated priority list built from your current jobs and applications — it tells you exactly what to focus on each morning. No plan has been generated yet, so click Generate Daily Plan now to create today's.", confirmType: "click", hideIfSelector: '[data-workflow-target="daily-plan-section"][data-plan-generated="true"]' },
      // Once a plan exists (or was just generated), prompt them to read it
      { target: "daily-plan-section", instruction: "Read the Daily Plan above — it tells you exactly what the AI thinks you should focus on today. Take a moment to absorb the priorities before moving on.", confirmType: "observe", confirmLabel: "I've read the Daily Plan", showIfSelector: '[data-workflow-target="daily-plan-section"][data-plan-generated="true"]' },
      { target: "search-run-section", instruction: "Check the Search Run panel. Did the overnight cron find new jobs? Note how many were fetched, matched, and saved.", confirmType: "observe", confirmLabel: "I've checked the Search Run" },
      { target: "agency-run-section", instruction: "Check the Agency Run panel. Did the agency prepare any new application packets overnight?", confirmType: "observe", confirmLabel: "I've checked the Agency Run" },
    ],
  },
  {
    key: "needs-me",
    label: "Needs Me",
    description: "Resolve any open blockers — this is the highest-priority action as blockers stop work from moving forward.",
    route: "/needs-me",
    timing: "morning",
    timeEstimateMin: 5,
    hints: [
      // No blockers — single step telling user to come back later
      { target: "needs-me-status", instruction: "Great news — no blockers right now. Agents can keep working on their own without needing anything from you. Come back here later in the day; if an agent gets stuck and needs your input, it will appear on this page.", confirmType: "observe", confirmLabel: "Got it, I'll check back later", hideIfSelector: '[data-has-blockers="true"]' },
      // Blockers exist — full 3-step flow
      { target: "blocker-list", instruction: "Review each open blocker from top to bottom. Blockers are questions or decisions the AI is waiting on before it can continue working for you.", confirmType: "observe", confirmLabel: "I've reviewed the blockers", showIfSelector: '[data-has-blockers="true"]' },
      { target: "blocker-answer-field", instruction: "Type your answer or decision in this field for the current blocker. Be specific — the AI will use your response to proceed.", confirmType: "observe", confirmLabel: "I've entered my answer", showIfSelector: '[data-has-blockers="true"]' },
      { target: "blocker-resolve-btn", instruction: "Click Resolve to clear this blocker and allow the agent to continue. Repeat for each open blocker.", confirmType: "click", showIfSelector: '[data-has-blockers="true"]' },
    ],
  },
  {
    key: "jobs-review",
    label: "Jobs Review",
    description: "Sort by score, approve 85+ matches, and reject the rest with a reason to teach the system.",
    route: "/jobs",
    timing: "morning",
    timeEstimateMin: 10,
    hints: [
      { target: "sort-score-btn", instruction: "Click the Score column header to sort jobs from highest to lowest match score. This brings your best opportunities to the top.", confirmType: "click" },
      { target: "job-card", instruction: "Click a job card to read its full scoring breakdown. The AI explains why it matched — review it so you can make an informed decision.", confirmType: "click" },
      { target: "approve-btn", instruction: "Click Approve on any job with an 85+ score that genuinely interests you. Approved jobs move into the application pipeline.", confirmType: "click" },
      { target: "reject-btn", instruction: "Click Reject on lower-scored or irrelevant jobs. Always select a rejection reason — this directly teaches the system what to filter out in the future.", confirmType: "click" },
    ],
  },
  // Midday
  {
    key: "apply-sprint",
    label: "Apply Sprint",
    description: "Find applications showing 'Ready to Apply' and launch the browser assistant for each one.",
    route: "/applications/assistant",
    timing: "midday",
    timeEstimateMin: 10,
    repeatable: true,
    hints: [
      { target: "ready-to-apply-list", instruction: "These applications are fully prepared — the AI has already drafted your materials. Review the list so you know what you're about to apply for.", confirmType: "observe", confirmLabel: "I see my ready applications" },
      { target: "launch-assistant-btn", instruction: "Click Launch Assistant to open the browser extension and start filling the application form. Work through them one at a time.", confirmType: "click" },
      { target: "needs-me-prompt", instruction: "If a 'Needs Me' prompt appears here, answer it to unblock the assistant — it needs a decision from you before it can continue.", confirmType: "observe", confirmLabel: "I've answered the prompt" },
    ],
  },
  {
    key: "check-jolene",
    label: "Check in with Jolene",
    description: "Ask Jolene what's on your plate — she can surface follow-ups, status, and anything you might have missed.",
    route: "/dashboard",
    timing: "midday",
    timeEstimateMin: 2,
    hints: [
      { target: "jolene-fab", instruction: "Click the Jolene button in the bottom-right corner to open the chat panel.", confirmType: "click" },
      { target: "jolene-input", instruction: "Ask: \"What's my status today?\" or \"Are there any applications I should follow up on?\" — read Jolene's full response before moving on.", confirmType: "observe", confirmLabel: "I've read Jolene's response" },
    ],
  },
  // Evening
  {
    key: "email-sync",
    label: "Email Sync",
    description: "In production, email syncs automatically every hour. Locally, trigger a manual sync from Settings.",
    route: "/settings",
    timing: "evening",
    timeEstimateMin: 2,
    hints: [
      { target: "email-sync-card", instruction: "Scroll to find the Inbound Email Sync card in Settings. It shows when the last sync ran and how many emails were processed.", confirmType: "observe", confirmLabel: "I found the Email Sync card" },
      { target: "email-sync-now-btn", instruction: "Click Sync Now to pull in the latest emails. The system will auto-detect rejections, interview invites, and other job-related messages.", confirmType: "click" },
    ],
  },
  {
    key: "update-applications",
    label: "Update Applications",
    description: "Log any interviews or conversations, update statuses, and generate thank-you drafts after calls.",
    route: "/applications",
    timing: "evening",
    timeEstimateMin: 5,
    hints: [
      { target: "application-list", instruction: "Scan your full application pipeline. Look for anything that moved today — interviews scheduled, calls completed, or responses received.", confirmType: "observe", confirmLabel: "I've scanned my pipeline" },
      { target: "application-status-btn", instruction: "Click an application that needs updating, then change its status to reflect what happened today (e.g. Interviewing, Offer, Rejected).", confirmType: "click" },
      { target: "thankyou-draft-btn", instruction: "If you had a call or interview today, click Generate Thank-You Draft to create a personalized follow-up email you can send right away.", confirmType: "click" },
    ],
  },
  // Weekly
  {
    key: "market-intelligence",
    label: "Market Intelligence",
    description: "Run a weekly brief on demand trends, top skills, and what your pipeline reveals about the market.",
    route: "/profiles",
    timing: "weekly",
    timeEstimateMin: 5,
    weeklySmartCadence: true,
    hints: [
      { target: "market-intelligence-section", instruction: "Scroll down to the Market Intelligence section. This is where the AI compiles weekly insights from your job data.", confirmType: "observe", confirmLabel: "I found the Market Intelligence section" },
      { target: "run-market-intel-btn", instruction: "Click Run Market Intelligence Brief to generate this week's summary of demand trends, top required skills, and pipeline health.", confirmType: "click" },
    ],
  },
  {
    key: "outcome-calibration",
    label: "Outcome Calibration",
    description: "Review any proposed scoring changes based on your real callback rates and reject/accept them.",
    route: "/settings",
    timing: "weekly",
    timeEstimateMin: 5,
    weeklySmartCadence: true,
    hints: [
      { target: "outcome-calibration-card", instruction: "Find the Outcome Calibration card in Settings. It shows proposals the AI has generated based on which jobs you got callbacks from.", confirmType: "observe", confirmLabel: "I found the Calibration card" },
      { target: "calibration-proposal", instruction: "Read each proposal carefully — it explains exactly what scoring weight the system wants to change and why, based on your real results.", confirmType: "observe", confirmLabel: "I've read the proposals" },
      { target: "calibration-accept-btn", instruction: "Accept or reject each proposal. Accepting immediately updates the scoring model so future job matches reflect your real callback patterns.", confirmType: "click" },
    ],
  },
  {
    key: "tune-profiles",
    label: "Tune Search Profiles",
    description: "Review any search profile that has been producing too many low-quality matches and adjust its settings.",
    route: "/profiles",
    timing: "weekly",
    timeEstimateMin: 10,
    weeklySmartCadence: true,
    hints: [
      { target: "profile-list", instruction: "Look through your search profiles. Check each one's Health Score and recent match quality — a low score means poor signal from that profile.", confirmType: "observe", confirmLabel: "I've reviewed the profile scores" },
      { target: "profile-open-btn", instruction: "Open the profile that needs the most attention to review and adjust its settings.", confirmType: "click" },
      { target: "profile-min-score-field", instruction: "If you're getting too many low-quality matches, raise the Minimum Match Score threshold. This filters out weaker results before they reach you.", confirmType: "observe", confirmLabel: "I've reviewed the min score" },
      { target: "profile-titles-field", instruction: "If the job titles feel off, refine them here. Add, remove, or reword titles to better target the roles you actually want.", confirmType: "observe", confirmLabel: "I've reviewed the titles" },
    ],
  },
];

export const ALL_STEPS: WorkflowStep[] = [...SETUP_STEPS, ...DAILY_STEPS];

export function getStepByKey(key: string): WorkflowStep | undefined {
  return ALL_STEPS.find((s) => s.key === key);
}

/** Returns which weekly steps should be visible today based on smart cadence.
 *  Hidden Mon–Tue; shown Wed–Thu; urgent (highlighted) on Fri if not done.
 *  Always shown if done this week (to display the checkmark). */
export function weeklyStepVisibility(dayOfWeek: number): "hidden" | "normal" | "urgent" {
  // dayOfWeek: 0=Sun,1=Mon,...,6=Sat
  if (dayOfWeek === 1 || dayOfWeek === 2) return "hidden"; // Mon, Tue
  if (dayOfWeek === 5 || dayOfWeek === 0) return "urgent"; // Fri, Sun
  return "normal"; // Wed, Thu, Sat
}
