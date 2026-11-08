# Commission backend: iPad → Google Drive → your PC

When a customer submits a request on the kiosk, the iPad sends it to a small Google Apps
Script that you own. The script puts each request in its own folder in your Google Drive:

```
My Drive/
  Field of Green Prints Commissions/
    Commission log            ← spreadsheet: one row per request (Status, Price, Notes are yours)
    _Phone uploads (temporary)/  ← phone photos wait here until their request is submitted
    2026-11-02 1432 - Sam/
      photo.jpg               ← selfie from the iPad, if they took one
      phone-1.jpg, phone-2…   ← full-size photos sent from their phone
      request.txt
```

Phone photos are sent by the customer's phone directly to this script (via the QR code on
the kiosk), so they keep their original size. Ones that never get attached to a request
are moved to the trash after a day.

New requests appear a few seconds after the customer taps **Submit request**. You can browse them at
<https://drive.google.com>, or keep the "Commission log" sheet open in a tab. Optionally,
install **Google Drive for desktop** on the booth PC to get the folder in File Explorer, so
photos open straight in other apps and synced files stay available if the internet drops.

If the iPad has no internet, requests (photos included) wait on the iPad and upload on their
own once it's back online. The tiny build stamp in the bottom-left corner shows
"· N waiting to upload" while anything is pending.

## One-time setup (about 5 minutes)

1. Go to <https://script.google.com> while signed in to the Google account whose Drive you
   want to use, and click **New project**. Rename it "FoGP commissions".
2. Delete the sample code and paste in everything from [`Code.gs`](Code.gs). Save.
3. In the function dropdown at the top, pick **`setup`** and click **Run**.
   Google will ask for permission. Because it's your own unpublished script, you'll see
   "Google hasn't verified this app" — click **Advanced → Go to FoGP commissions** and allow.
   The log shows links to the new folder and sheet.
4. Click **Deploy → New deployment**. Click the gear next to "Select type" and pick
   **Web app**. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Open that URL in a browser. You should see `{"ok":true,"app":"fogp-commissions"}`.
6. Paste the URL into `APPS_SCRIPT_URL` in [`src/config.js`](../src/config.js), commit and push.
   Anything already saved on the iPad uploads automatically the next time the app opens.

## Handling requests

Work from the **Commission log** sheet. Each new request arrives with Status **New**. Use the
Status dropdown (New, Quoted, Accepted, Printing, Done, Declined), type the Price, and add
Notes. **Open photo** and **Open folder** jump to the files. Sort and filter freely. You can
also reorder columns or add your own: the script finds its columns by header name, so just
don't rename the existing headers.

## Changing the script later

Paste in the new code and save, run **`setup`** once (it upgrades the sheet's columns and
formatting, installs the daily cleanup, and asks for any new permissions), then
**Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
That keeps the same URL, so the kiosk doesn't need to change.

## Remote control

`control.html` on the kiosk's site (for example
<https://dinnersonic.github.io/FieldOfGreenPrintsDisplay/control.html>) lets you watch and
drive the kiosk from your computer: what it's showing, its theme and build, switching screens
and themes, reloading the app, and running performance logs. Every log the kiosk finishes is
saved to `Field of Green Prints Commissions/_Kiosk performance logs/` and can be opened,
copied or downloaded from the control page.

The kiosk checks in every few seconds while the control page has been used in the last 10
minutes, otherwise every 30 seconds, and never while the app is in the background. So the
first command after opening the page can take up to 30 seconds; after that, a few seconds.

To turn it on (once):

1. Paste in the new `Code.gs` and save.
2. Click the gear (**Project Settings**) on the left. Under **Script properties**, click
   **Add script property**: name `CONTROL_PASSWORD`, value a password of at least 8 characters
   that you'll type on the control page. Save. (It's stored in your script, never in the app.)
3. Back in the editor, run **`setup`** (it creates the logs folder and confirms the password
   is set in its log).
4. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy.**

To change the password later, edit the script property; no new deployment needed.

## Notes

- "Anyone" access is needed so the iPad can post without signing in. The URL and the
  `SHARED_KEY` both end up in the public web page, so treat them as a spam filter, not a
  password. Nobody can *read* your Drive through this script; it can only add requests.
  The one exception is the remote control, which needs `CONTROL_PASSWORD` and can only read
  the kiosk's status and the files in the performance-log folder.
- If you change `SHARED_KEY` in `Code.gs`, change `APPS_SCRIPT_KEY` in `src/config.js` to match.
- Requests that fail are retried. The script ignores repeats of the same request ID, so you
  won't get duplicate folders.
