// Configure how to save records
// 'client'  -> front-end will POST directly to Google Apps Script URL
// 'server'  -> front-end will POST to /save (Flask), which forwards to Apps Script URL from config.json/env
window.SAVE_VIA = 'server';

// Place your Google Apps Script Web App URL here when SAVE_VIA = 'client'
window.GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycby7QuYGdGvol1CeoDptZ7de77QQlo0APTYNtC0IMyAvsYFpcce8cFuKkglZW63TEOrGJw/exec';
