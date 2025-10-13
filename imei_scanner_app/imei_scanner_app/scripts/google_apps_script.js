    /**
     * Google Apps Script: Deploy as Web App (POST) to append to a Google Sheet
     * How to use:
     * 1) Set SHEET_ID below.
     * 2) Deploy as Web App (execute as Me, accessible to Anyone/Anyone with link).
     * 3) Use the deployment URL in this app's config.
     */

    const SHEET_ID = '1-gnLWWsuR49t5JbzOWzK3kCpgURNdaqW91i1FHlGZkA'; // e.g. 1AbCDefGhIjKlmNoPqrStuVWxyz1234567890
    const SHEET_NAME = 'IMEI';

    function doOptions(e) {
      return _cors();
    }

    function doGet(e) {
      return _cors(ContentService.createTextOutput('OK'));
    }

    function doPost(e) {
      try {
        const body = e.postData && e.postData.contents ? e.postData.contents : '{}';
        const data = JSON.parse(body);

        const ss = SpreadsheetApp.openById(SHEET_ID);
        const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

        const timestamp = data.timestamp || new Date().toISOString();
        const role = data.role || '';
        const name = data.name || '';
        const imeis = Array.isArray(data.imeis) ? data.imeis.join('
') : '';
        const rawText = data.raw_text || '';
        const userAgent = data.user_agent || '';

        sheet.appendRow([timestamp, role, name, imeis, rawText, userAgent]);

        return _cors(ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON));
      } catch (err) {
        return _cors(ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON));
      }
    }

    function _cors(output) {
      output = output || ContentService.createTextOutput('');
      return output.setMimeType(ContentService.MimeType.TEXT)
        .setHeader('Access-Control-Allow-Origin', '*')
        .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        .setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
