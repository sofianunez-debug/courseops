# Course Ops

Staffing desk for group live-stream classes. Sign in with a Varsity Tutors Google account. The person works in the app. The Google Sheet is the data store. Make.com sends every email.

Tutor matching is a suggestion the person confirms. The VTWA calendar is not checked, and the placement is not created here.

## What the desk does

- Shows Offered rows, sub requests, ICA holds, and the 30-day NAT window from the published workbook.
- Suggests a tutor for a class or sub request that has no email, using the instructor list and courses people already teach. The reason is a subject match. When `AI_ENABLED=yes`, Netlify AI (`gpt-4o-mini`) rewrites that reason.
- **Assign** writes the tutor name and email back to that sheet row.
- **Test mail goes to** saves an address on the app. Test sends go to that address. Tutor emails in the sheet stay as they are.
- **Send test offers** asks the sheet script to post Offered rows to Make. The spreadsheet menu is not required.

## Sheet script

Paste both files into one Apps Script project:

- `scripts/sheet-email/Code.gs` owns `onOpen` and the send menus.
- `scripts/sheet-sync/Code.gs` publishes the workbook and receives writes from the app.

Deploy the web app as **Execute as me**, **Who has access: Anyone**. Use the `https://script.google.com/macros/s/.../exec` URL. Put that URL in `SHEET_WEBAPP_URL` and the same secret in `SHEET_PUBLISH_SECRET` and the script property `PUBLISH_SECRET`.

Keep those variables on a **preview** deploy while testing. Leave production Netlify variables on the live sheet until the test is accepted.

The live working sheet stays untouched. Testing uses a copy whose title contains “Copy of” or “Test”, with `TEST_COPY=yes`. That copy publishes `data/workbook-test.json` and does not call the live Make webhooks. It sends only when `ALLOW_SEND_FROM_COPY=yes` and `OFFER_WEBHOOK_URL` is the Make clone:

`https://hook.us1.make.celonis.com/oxwi9afa54a7cg61e2aqoqq8tl7uql4e`

The live scenario “LS/GC - Courses Staffing Emails” stays on. Do not point the test copy at its webhooks.

## Run it locally

```bash
npm install
npm test
npm run dev
```

Open [http://127.0.0.1:4177](http://127.0.0.1:4177). Google sign-in works on the deployed site.
