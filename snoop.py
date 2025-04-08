from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from waitress import serve
import socketio, json, datetime, threading, asyncio, uuid, eventlet, re, os, warnings, time

warnings.filterwarnings("ignore", category=RuntimeWarning)

snoop = Flask(__name__)
snoop.secret_key = str(uuid.uuid4)

ADMIN_KEY = "your_admin_password_here"
FAILED_ATTEMPTS = {}
LOCKOUT_TIME = 300
MAX_ATTEMPTS = 5

sio = socketio.AsyncClient()

message_history = []
online_count = "0"
unread_count = 0
socket_task = None
main_asyncio_loop = None
last_cookies_content = None

def strip_html_tags(text):
    if not text:
        return text
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

def current_utc_time():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%H:%M UTC")

def load_cookies_from_json(json_path="cookies.json"):
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        cf_clearance = data.get("cf_clearance", "")
        session_val = data.get("session", "")
        return f"cf_clearance={cf_clearance}; session={session_val}"
    except (FileNotFoundError, json.JSONDecodeError):
        print(f"[Error] Cannot load or parse {json_path}")
        return ""

def add_system_message(content):
    system_message = {
        "createdAt": current_utc_time(),
        "displayName": "Doxbin",
        "content": content,
        "rankData": {"suffix": "[System]", "rankColor": "red", "rankStyle": "bold"}
    }
    message_history.append(system_message)

@snoop.route('/')
def index():
    return render_template('index.html')

@snoop.route('/widget')
def widget():
    return render_template('widget.html')

@snoop.route('/messages')
def get_messages():
    global unread_count
    unread_count = 0
    return jsonify(message_history)

@snoop.route('/online')
def get_online():
    return jsonify({"count": online_count})

@snoop.route('/unread')
def get_unread():
    return jsonify({"count": unread_count})

@snoop.route('/admin_login', methods=['GET', 'POST'])
def admin_login():
    ip = request.remote_addr
    now = time.time()

    if ip in FAILED_ATTEMPTS:
        attempts, last_attempt = FAILED_ATTEMPTS[ip]
        if attempts >= MAX_ATTEMPTS and now - last_attempt < LOCKOUT_TIME:
            flash('Too many failed attempts. Try again later.', 'error')
            return render_template('admin_login.html')

    if request.method == 'POST':
        key = request.form.get('key')
        if key == ADMIN_KEY:
            session['admin_logged_in'] = True
            FAILED_ATTEMPTS.pop(ip, None)
            flash('Successfully logged in!', 'login_success')
            return redirect(url_for('update_cookies_admin'))
        else:
            attempts, _ = FAILED_ATTEMPTS.get(ip, (0, now))
            FAILED_ATTEMPTS[ip] = (attempts + 1, now)
            flash('Invalid admin key.', 'error')
            return redirect(url_for('admin_login'))
    return render_template('admin_login.html')

@snoop.route('/update_cookies_admin', methods=['GET', 'POST'])
def update_cookies_admin():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))

    if request.method == 'POST':
        cf_clearance = request.form.get('cf_clearance')
        session_cookie = request.form.get('session')

        if cf_clearance and session_cookie:
            try:
                with open('cookies.json', 'w', encoding='utf-8') as f:
                    json.dump({
                        "cf_clearance": cf_clearance,
                        "session": session_cookie
                    }, f, indent=4)
                flash('Cookies updated successfully.', 'cookies_success')
                return redirect(url_for('update_cookies_admin'))
            except Exception as e:
                flash(f'Error saving cookies: {str(e)}', 'error')
        else:
            flash('Both fields are required.', 'error')

    return render_template('update_cookies_admin.html')

@snoop.route('/admin_logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    flash('Logged out successfully.', 'success')
    return redirect(url_for('admin_login'))

@sio.event
async def connect():
    print("[Socket.IO] Connected")
    add_system_message("Connected to doxbin gateway.")

@sio.event
async def disconnect():
    print("[Socket.IO] Disconnected")
    add_system_message("Disconnected from doxbin gateway.")

@sio.on("send_message")
async def on_send_message(data):
    global unread_count
    if 'content' in data:
        data['content'] = strip_html_tags(data['content'])
    message_history.append(data)
    unread_count += 1
    if len(message_history) > 100:
        message_history.pop(0)

@sio.on("online")
async def on_online(data):
    global online_count
    online_count = str(data)

async def socket_client():
    cookies = load_cookies_from_json("cookies.json")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
        "Cookie": cookies,
        "Origin": "https://doxbin.net",
        "Connection": "keep-alive, Upgrade"
    }

    try:
        await sio.connect("https://doxbin.net", transports=["websocket"], headers=headers, socketio_path="/gateway/")
        await sio.wait()
    except Exception as e:
        print(f"[Socket.IO] Connection error: {e}")
        add_system_message(f"Connection error: {str(e)}")

async def reconnect_socket():
    try:
        if sio.connected:
            await sio.disconnect()
            await asyncio.sleep(1)
        await socket_client()
    except Exception as e:
        print(f"[Reconnect] Error during reconnect: {e}")

def start_socket_client():
    global socket_task, main_asyncio_loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    main_asyncio_loop = loop
    socket_task = loop.create_task(socket_client())
    loop.run_forever()

def monitor_cookies():
    global last_cookies_content

    while True:
        try:
            if os.path.exists('cookies.json'):
                with open('cookies.json', 'r', encoding='utf-8') as f:
                    cookies_content = f.read()

                if last_cookies_content is None:
                    last_cookies_content = cookies_content

                if cookies_content != last_cookies_content:
                    print("[Watcher] Detected cookies.json change. Reconnecting...")
                    last_cookies_content = cookies_content
                    asyncio.run_coroutine_threadsafe(reconnect_socket(), main_asyncio_loop)

        except Exception as e:
            print(f"[Watcher] Error checking cookies.json: {e}")

        threading.Event().wait(15)

if __name__ == '__main__':
    threading.Thread(target=start_socket_client, daemon=True).start()
    threading.Thread(target=monitor_cookies, daemon=True).start()
    serve(snoop, host='127.0.0.1', port=5000)