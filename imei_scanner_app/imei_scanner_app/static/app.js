    // Utilities
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const toast = (msg) => {
      const t = $('#toast');
      t.textContent = msg;
      t.hidden = false;
      setTimeout(() => (t.hidden = true), 2200);
    };

    const overlay = {
      show: (msg = 'Processing…') => {
        $('#overlay').hidden = false;
        $('#overlay .overlay-text').textContent = msg;
      },
      hide: () => { $('#overlay').hidden = true; }
    };

    // Camera modal controls
    const modal = {
      open(role) {
        $('#scan-role').textContent = role;
        $('#camera-modal').hidden = false;
        startCamera();
      },
      close() {
        stopCamera();
        $('#camera-modal').hidden = true;
      }
    };

    let currentRole = 'Buyer';
    let stream = null;

    async function startCamera() {
      const constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = $('#video');
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        console.error(err);
        toast('Camera access failed. Check permissions.');
      }
    }

    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      const video = $('#video');
      video.pause?.();
      video.srcObject = null;
    }

    // OCR capture
    async function captureAndRecognize() {
      const video = $('#video');
      const canvas = $('#canvas');
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        toast('Video not ready, try again.');
        return { imeis: [], raw: '' };
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));

      overlay.show('Reading text…');
      const { createWorker } = Tesseract;
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(blob);
      await worker.terminate();
      overlay.hide();

      const imeis = extractIMEIs(text);
      return { imeis, raw: text };
    }

    // Extract IMEIs: Find lines with IMEI and also 15-digit sequences
    function extractIMEIs(raw) {
      const lines = raw.split(/?
/).map(s => s.trim()).filter(Boolean);
      const found = new Set();

      const imeiFromStr = (s) => {
        // Prefer lines containing 'IMEI'
        const m1 = s.match(/IMEI\s*[:#-]?\s*([0-9]{14,17})/i);
        if (m1) {
          return m1[1];
        }
        // Fallback: any 15-digit standalone sequence
        const m2 = s.match(/(?<!\d)\d{15}(?!\d)/);
        return m2 ? m2[0] : null;
      };

      for (const line of lines) {
        const val = imeiFromStr(line);
        if (val) found.add(val);
      }

      // Heuristic cleanup: strip common OCR confusions
      const cleaned = Array.from(found).map(v => v.replace(/O/g, '0').replace(/[Il]/g, '1')).map(v => v.replace(/[^0-9]/g, ''));
      // Deduplicate true 15-digit values
      const finalVals = Array.from(new Set(cleaned.filter(v => /^\d{15}$/.test(v))));
      return finalVals;
    }

    // Copy helper
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        toast('IMEIs copied to clipboard');
      } catch (e) {
        console.warn('Clipboard write failed', e);
        toast('Copy failed (permissions?)');
      }
    }

    // Save record
    async function saveRecord(role, name, imeis, rawText) {
      if (!name) { toast('Please enter a name'); return; }
      if (!imeis.length) { toast('No IMEIs to save'); return; }

      const payload = { role, name, imeis, raw_text: rawText };

      try {
        if (window.SAVE_VIA === 'server') {
          const res = await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || 'Save failed');
        } else if (window.SAVE_VIA === 'client') {
          const url = window.GOOGLE_SHEETS_WEBAPP_URL || '';
          if (!url) { throw new Error('Google Sheets Web App URL not set in config.js'); }
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }) });
          if (!res.ok) throw new Error('Save failed (Apps Script response not ok)');
        } else {
          throw new Error('Unknown SAVE_VIA mode');
        }
        toast('Saved to Google Sheet ✅');
      } catch (e) {
        console.error(e);
        toast('Save failed: ' + e.message);
      }
    }

    // Wire up UI
    window.addEventListener('DOMContentLoaded', () => {
      // Open modal buttons
      $('#btn-scan-buyer').addEventListener('click', () => { currentRole = 'Buyer'; modal.open('Buyer'); });
      $('#btn-scan-seller').addEventListener('click', () => { currentRole = 'Seller'; modal.open('Seller'); });

      // Close modal
      $('#btn-close-modal').addEventListener('click', () => modal.close());

      // Capture/recognize
      $('#btn-capture').addEventListener('click', async () => {
        const { imeis, raw } = await captureAndRecognize();
        const ta = currentRole === 'Buyer' ? $('#buyer-imeis') : $('#seller-imeis');
        ta.value = imeis.join('
');
        if (imeis.length) {
          copyText(imeis.join('
'));
          toast(`${imeis.length} IMEI(s) detected`);
        } else {
          toast('No IMEI detected. Try again.');
        }
        modal.close();
        // Store raw text on the element so we can save it
        ta.dataset.rawText = raw;
      });

      // Copy buttons
      $('#btn-copy-buyer').addEventListener('click', () => {
        const ta = $('#buyer-imeis');
        copyText(ta.value || '');
      });
      $('#btn-copy-seller').addEventListener('click', () => {
        const ta = $('#seller-imeis');
        copyText(ta.value || '');
      });

      // Save buttons
      $('#btn-save-buyer').addEventListener('click', () => {
        const name = $('#buyer-name').value.trim();
        const ta = $('#buyer-imeis');
        const imeis = ta.value.split(/?
/).map(s => s.trim()).filter(Boolean);
        saveRecord('Buyer', name, imeis, ta.dataset.rawText || '');
      });
      $('#btn-save-seller').addEventListener('click', () => {
        const name = $('#seller-name').value.trim();
        const ta = $('#seller-imeis');
        const imeis = ta.value.split(/?
/).map(s => s.trim()).filter(Boolean);
        saveRecord('Seller', name, imeis, ta.dataset.rawText || '');
      });
    });
