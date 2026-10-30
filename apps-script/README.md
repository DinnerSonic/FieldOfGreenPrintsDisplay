# Commission backend: iPad → Google Drive → your PC

When a customer submits a request on the kiosk, the iPad sends it (with the photo) to a small Google
Apps Script that you own. The script puts each request in its own folder in your Google Drive:

```
My Drive/
  Field of Green Prints Commissions/
    Commission log            ← spreadsheet: one row per request (Status, Price, Notes are yours)
    2026-11-02 1432 - Sam/
      photo.jpg
      request.txt
```

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
formatting), then **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
That keeps the same URL, so the kiosk doesn't need to change.

## Notes

- "Anyone" access is needed so the iPad can post without signing in. The URL and the
  `SHARED_KEY` both end up in the public web page, so treat them as a spam filter, not a
  password. Nobody can *read* your Drive through this script; it can only add requests.
- If you change `SHARED_KEY` in `Code.gs`, change `APPS_SCRIPT_KEY` in `src/config.js` to match.
- Requests that fail are retried. The script ignores repeats of the same request ID, so you
  won't get duplicate folders.
