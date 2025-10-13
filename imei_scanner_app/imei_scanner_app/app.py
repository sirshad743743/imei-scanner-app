import json
import os
from datetime import datetime
from urllib import request

from flask import Flask, render_template, request as flask_request, jsonify

app = Flask(__name__)

# Load config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        try:
            CONFIG = json.load(f)
        except Exception:
            CONFIG = {}
else:
    CONFIG = {}

GOOGLE_SHEETS_WEBAPP_URL = os.environ.get('GOOGLE_SHEETS_WEBAPP_URL') or CONFIG.get('GOOGLE_SHEETS_WEBAPP_URL') or ''

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    return {'status': 'ok'}

@app.route('/save', methods=['POST', 'OPTIONS'])
def save():
    # CORS preflight support
    if flask_request.method == 'OPTIONS':
        resp = app.make_response(('', 204))
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return resp

    try:
        data = flask_request.get_json(force=True)
    except Exception:
        return jsonify({'ok': False, 'error': 'Invalid JSON'}), 400

    payload = {
        'timestamp': datetime.utcnow().isoformat(timespec='seconds') + 'Z',
        'role': data.get('role'),
        'name': data.get('name'),
        'imeis': data.get('imeis', []),
        'raw_text': data.get('raw_text', ''),
        'user_agent': flask_request.headers.get('User-Agent', '')
    }

    if GOOGLE_SHEETS_WEBAPP_URL:
        try:
            req = request.Request(GOOGLE_SHEETS_WEBAPP_URL, method='POST')
            req.add_header('Content-Type', 'application/json')
            body = json.dumps(payload).encode('utf-8')
            with request.urlopen(req, body, timeout=20) as resp:
                resp_text = resp.read().decode('utf-8', errors='ignore')
            return jsonify({'ok': True, 'forwarded': True, 'apps_script_response': resp_text})
        except Exception as e:
            return jsonify({'ok': False, 'error': f'Forwarding to Google Apps Script failed: {e}'}), 502
    else:
        # local CSV fallback
        try:
            import csv
            csv_path = os.path.join(os.path.dirname(__file__), 'data.csv')
            new_file = not os.path.exists(csv_path)
            with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                if new_file:
                    writer.writerow(['timestamp', 'role', 'name', 'imeis', 'raw_text', 'user_agent'])
                writer.writerow([
                    payload['timestamp'],
                    payload['role'],
                    payload['name'],
                    '\n'.join(payload['imeis']),
                    payload['raw_text'],
                    payload['user_agent']
                ])
            return jsonify({'ok': True, 'forwarded': False, 'saved_to': 'data.csv'})
        except Exception as e:
            return jsonify({'ok': False, 'error': f'Local save failed: {e}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
