# Project 10x — Pilot Operations Guide

This guide covers how to run a real-world pilot batch from first company to final outcome.

---

## What the pilot is

A controlled test of the full Project 10x workflow using 10–30 real Tanzanian companies from NeST awarded tender data. The goal is to validate:

- Whether the ingestion pipeline produces useful leads
- Whether the demos are convincing enough to generate interest
- Whether the outreach scripts get responses
- How much editing time each lead actually takes
- Where the workflow breaks down under real conditions

---

## The two state files — what each tracks

| File | Answers |
|------|---------|
| `dashboard-state.json` | Is the product ready? (new → generated → published) |
| `pilot-state.json` | What happened in the real world? (outreach → replied → won/lost) |

These are intentionally separate. The technical pipeline and the sales process move at different speeds. Never merge them.

---

## Step-by-step pilot workflow

### 1. Ingestion

Run the NeST scraper or import from CSV:

```
node tools/ingestion/run-ingestion-pipeline.js --max-pages=5
```

Or import from a CSV file:

```
node tools/ingestion/run-ingestion-pipeline.js --from-csv=data/pilot/raw/companies.csv
```

Check `data/ingestion/qualified/` for qualified leads. Review `data/ingestion/rejected/` to understand what was filtered out.

Typical outcome: 40–60% of scraped companies qualify. The rest lack contact data or score too low.

### 2. Import to dashboard

```
node tools/ingestion/import-qualified-to-dashboard.js --dry-run
node tools/ingestion/import-qualified-to-dashboard.js
```

Then sync the dashboard:

```
node dashboard/server.js
# Open http://localhost:3001 → Click Sync
```

New leads appear with `status: new` and `pilotStatus: —`.

### 3. Manual enrichment

This step is **always manual**. For each lead:

1. Verify the phone number is real (call or WhatsApp test)
2. Find the WhatsApp number if different from the listed phone
3. Look up the company on Facebook/Instagram/LinkedIn
4. Check if there is a real website (not just a placeholder)
5. Find the correct decision-maker name if possible

Update the enrichment CSV and re-run `discover-digital-presence.js` if needed, or edit the config directly.

**Mark `phoneVerified` and `websiteVerified` in the Readiness Checklist only after you have personally confirmed these.**

Time budget: 10–20 minutes per lead.

### 4. Config generation

In the dashboard: open the lead → click **Re-run Pipeline**.

This generates:
- The config at `generated/configs/{slug}.json`
- The outreach scripts at `generated/outreach/{slug}-outreach.json`
- Lead status changes from `new` → `generated`

### 5. Config review and editing

Open **Config Editor** (`#/config/:slug`).

Check and manually fix:
- Company name (correct spelling, correct case)
- Tagline (remove anything generic or wrong)
- About section (check body paragraphs for accuracy)
- Services list (remove any that are wrong for this company)
- Contact details (phone, WhatsApp, email, address)
- Hero headline (should reflect what the company actually does)

Mark `copyReviewed` in Readiness Checklist when done.

Time budget: 15–30 minutes per lead (first few will take longer).

### 6. Demo review

Click **Publish Demo** to move the config to `companies/{slug}.json`. Then open the demo at `http://localhost:3001/?company={slug}` (or your live URL).

Check:
- Hero section looks correct
- About section reads naturally
- Contact section has the right details
- No placeholder images in visible sections
- Services section makes sense for this company

**Important:** If `projects.visible`, `gallery.visible`, or `testimonials.visible` are false (they should be for auto-generated configs), those sections are hidden. Do not enable them unless you have real content.

Open in a mobile browser or use browser devtools mobile mode. Mark `mobileChecked` in Readiness Checklist.

### 7. Screenshot check

Take a screenshot of the demo using `?mode=screenshot` mode:

```
http://localhost:3001/?company={slug}&mode=screenshot
```

This disables animations for a stable image. Check the screenshot looks professional.

Mark `screenshotChecked` in Readiness Checklist.

### 8. WhatsApp preview check

Copy the WhatsApp message from the Outreach panel. Paste it into WhatsApp Web (or your phone) to check how it renders. Specifically check:

- The demo link previews correctly (shows company name, not just a raw URL)
- The message is the right length (not cut off)
- The Swahili/English mix feels natural
- No broken characters or formatting issues

Mark `whatsappPreviewChecked` in Readiness Checklist.

### 9. Script review

Read the full outreach script in the Outreach panel. Ask yourself:

- Would a real business owner find this credible?
- Does the WhatsApp message sound like a person or a bot?
- Is the Swahili version natural?
- Is there anything in the script that could be mistaken as a false claim?

Edit the script template files if needed. Mark `scriptReviewed` when satisfied.

**Safety check:** The script must NEVER imply the demo is a finished website, that you are building something for free, or that you are an official government-affiliated service.

Mark `noFakeClaims` only when you are certain the script contains no misleading statements.

### 10. Final readiness check

Open the Readiness Checklist in Lead Detail. All 10 items must be checked:

```
✓ websiteVerified
✓ phoneVerified
✓ demoReviewed
✓ copyReviewed
✓ screenshotChecked
✓ scriptReviewed
✓ noFakeClaims
✓ contactInfoComplete
✓ mobileChecked
✓ whatsappPreviewChecked
```

The dashboard shows **Ready to Send** (✓ indicator in leads list) only when all 10 are checked.

**Do not send outreach to any lead that does not show Ready to Send.**

### 11. Send outreach — manually

All outreach is sent manually. There is no automated sending.

Copy the WhatsApp message from the Outreach panel. Send it from your personal WhatsApp or business WhatsApp to the verified number.

**Do not:**
- Mass-send to multiple leads at once
- Use automated WhatsApp tools or bots
- Send to unverified numbers
- Send to the same person twice within 3 days

### 12. Log the outreach

After sending, go to Lead Detail → Outreach Log → Log New Outreach.

Fill in:
- Method: WhatsApp
- Summary: what you sent (e.g. "Sent initial message with demo link")
- Follow-up date: 3 days from now
- Next action: "Wait for response, follow up if no reply"

Click **Log Outreach**. This automatically marks the lead as contacted in pilot tracking.

### 13. Track responses

When a response comes in:

1. Go to Lead Detail → Pilot Status
2. Check **Replied** and optionally **Interested** or **Meeting Booked**
3. Update Notes with what they said
4. If they expressed interest: update **Priority** to `high` or `urgent`
5. Click **Save Pilot Status**

If they request a follow-up: add a follow-up date in the Outreach Log.

### 14. Follow-ups

The leads list shows a ⏰ indicator for leads with overdue follow-ups.

When following up, log each contact attempt in the Outreach Log. The follow-up count increments automatically.

Standard follow-up schedule:
- Day 0: Initial outreach
- Day 3: First follow-up (if no response)
- Day 7: Second follow-up (if no response)
- Day 14: Archive if still no response

### 15. Record the final outcome

In Pilot Status, mark the final state:
- **Won**: They agreed to proceed (signed up / paid deposit)
- **Lost**: They declined or became unresponsive
- If Lost: fill in the **Lost reason** (e.g. "already has website", "no budget", "wrong person")

The Pilot view (`#/pilot`) updates the metrics in real time.

---

## What NOT to automate

These steps must always remain manual:

| Step | Why |
|------|-----|
| Verifying phone numbers | Automated checks cannot confirm WhatsApp status or reach the right person |
| Sending WhatsApp messages | Automated sending risks account bans and creates legal risk |
| Reviewing demo copy | Only a human can judge if the content is accurate and appropriate |
| Approving outreach scripts | Script quality directly affects conversion; needs human judgment |
| Recording responses | Response interpretation requires context that automation doesn't have |
| Final outcome recording | Won/lost status has commercial implications |

---

## Time estimates (realistic)

Based on expected workflow:

| Step | Time |
|------|------|
| Enrichment (per lead) | 10–20 min |
| Config editing (per lead) | 15–30 min |
| Demo review + screenshot | 10–15 min |
| Script review | 5–10 min |
| Outreach logging | 2–3 min |
| **Total prep per lead** | **40–80 min** |

At 40 min/lead: **~12 leads/day** (solo operator, full-time)
At 60 min/lead: **~8 leads/day**

Expect the first batch to take longer as you learn the workflow.

---

## Real-world failure points to watch for

1. **Phone numbers from NeST are often office landlines** — test on WhatsApp before sending
2. **Generated configs get the services wrong** — always review the services list manually
3. **Swahili scripts may sound slightly formal** — have a native speaker review before sending
4. **Demo placeholder images look unprofessional** — if no real images exist, consider whether to send the demo at all
5. **Follow-up fatigue** — check the ⏰ indicators daily; don't let follow-ups slip
6. **"I'll call you back" responses** — log them as Interested but set a follow-up date
7. **Wrong person** — the NeST contact may be an accountant or clerk; mark `decisionMakerKnown: false` and try to reach the actual director

---

## Batch naming convention

Use descriptive batch names, not just dates:

```
construction-wave-1
dar-contractors-may-2026
tender-round-q2-2026
logistics-pilot-june
```

This makes the Pilot view more readable when you have multiple batches.
