# Course Ops Staffing Desk

Dashboard for the copy-and-paste parts of live-stream staffing. It sends grouped offer emails, sub-request emails, ICA renewal reminders, and the general-inquiry reply, and it flags accepted classes that need a placement within 30 days.

Tutor matching, VTWA calendar checks, and placement (NAT) creation stay manual.

## Run it locally

```bash
npm install
npm test
npm run dev
```

Open [http://127.0.0.1:4177](http://127.0.0.1:4177). The local access key is `preview`.

Without Google credentials the desk runs in **preview mode**:

- Sample classes, subs, and instructors load from a local workbook at `data/store.json` (created on first use).
- Buttons do the real status updates on that workbook.
- Emails are not sent. The full text is stored in the activity log.
- Check **Simulate a failure on the first email** to see a partial offer batch: later tutors still send, and the failed tutor stays marked `Offer`.
- **Reset sample data** restores the original queue.

`npm run netlify` starts the same site through `netlify dev --offline` on port 4177.

## What the buttons do

| Action | Sheet change | Email |
|---|---|---|
| Send offers | Each included row moves from `Offer` to `Waiting for response` only after that tutor's email succeeds | One email per tutor, listing every offered class |
| Send sub request | Subs row becomes `Waiting for response`, note records who was asked | Single-session coverage email |
| Send ICA reminder | Note is stamped; status stays `Not in progress` | Renewal reminder |
| Send inquiry reply | None | Canned “thanks for your interest” reply |
| Check NAT window | None | Optional Slack post in live mode |

If an email fails, that row is left unchanged and the rest of the batch continues. A transient mail error (timeout, rate limit, 5xx) is retried once. If the email succeeds and the sheet update fails, the log is marked `partial` and the desk does not send that email again.

Every send and failure is appended to the **Activity Log** tab. In live mode, failures also post to Slack when `SLACK_WEBHOOK_URL` is set. The daily NAT check runs at 13:00 UTC (8:00am Central).

## Sheet columns

Headers are matched by name, so column order can change. The first matching header wins.

**Working:** Class Name, Schedule, Start Date, Days Until Start, Duration, Subject, Tutor Name, Tutor Email, Status, Notes

**Subs:** Class Name, Date, Time, Duration, Status, Note

**Instructors:** Tutor Name, Tutor Email, Subjects, ICA Status

**Activity Log:** Timestamp, Action, Status, Recipient, Detail, Error

The Activity Log tab is created on the first send if it is missing. These aliases also work: `Course Name`, `Instructor Name`, `Instructor Email`, `Offer Status`, `Meeting Time`.

Status values the desk looks for, exactly:

- Working: `Offer`, `Waiting for response`, `Accepted`, `Not in progress`, `Declined`
- Subs: `Available` or a blank status for open requests

`Days Until Start` is used when it is filled. Otherwise the desk counts calendar days from `Start Date` in America/Chicago.

## Connect the real sheet and Gmail

1. Copy `.env.example` to `.env` for local live mode, or set the same variables in Netlify (Site configuration → Environment variables). Do not commit secrets.
2. Create or reuse a Google Cloud project. Enable the **Google Sheets API** and the **Gmail API**.
3. Create a service account and share the staffing spreadsheet with its email as **Editor**.
4. A Google Workspace admin authorizes the service account's Client ID for domain-wide delegation on `https://www.googleapis.com/auth/gmail.send`, so mail can send as `grouptutors@varsitytutors.com`.
5. Put the service-account JSON on one line in `GOOGLE_SERVICE_ACCOUNT_JSON`:

   ```bash
   node -e "console.log(JSON.stringify(require('./service-account.json')))"
   ```

6. Set `SHEET_ID` from the spreadsheet URL. Leave `DATA_MODE` unset. The desk switches to live mode when both the sheet ID and the service account JSON are present. Set `DATA_MODE=preview` to force the sample workbook, or `DATA_MODE=live` to refuse to start without credentials.
7. Set `DASHBOARD_ACCESS_KEY` to a long random value before deploying. The desk asks for it once and stores it in the browser until sign-out.

`netlify.toml` publishes `public/` and the functions in `netlify/functions/`. The NAT check is scheduled on `check-nat-window` with cron `0 13 * * *`.
