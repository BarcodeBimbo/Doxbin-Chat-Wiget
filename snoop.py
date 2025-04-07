from flask import Flask, render_template, jsonify
import socketio, json, datetime, threading, asyncio, uuid, waitress, re, requests

snoop = Flask(__name__)
sio = socketio.AsyncClient()
message_history = []
online_count = "0"
unread_count = 0

def strip_html_tags(text):
    if not text:
        return text
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

def current_utc_time():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%H:%M UTC")

async def socket_client():
    cookies = load_cookies_from_json("cookies.json")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Sec-WebSocket-Version": "13",
        "Origin": "https://doxbin.net",
        "Sec-WebSocket-Extensions": "permessage-deflate",
        "Sec-WebSocket-Key": str(uuid.uuid4()),
        "Connection": "keep-alive, Upgrade",
        "Cookie": cookies
    }

    try:
        await sio.connect("https://doxbin.net", transports=["websocket"], headers=headers, socketio_path="/gateway/")
        system_message = {
            "createdAt": current_utc_time(),
            "displayName": "Doxbin",
            "content": "Connected to doxbin gateway.",
            "rankData": {"suffix": "[System]", "rankColor": "red", "rankStyle": "bold"}
        }
        message_history.append(system_message)
        await sio.wait()
    except Exception as e:
        print(f"Connection error: {e}")
        system_message = {
            "createdAt": current_utc_time(),
            "displayName": "Doxbin",
            "content": f"Connection error: {str(e)}",
            "rankData": {"suffix": "[System]", "rankColor": "red", "rankStyle": "bold"}
        }
        message_history.append(system_message)

def load_cookies_from_json(json_path="cookies.json"):
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        cf_clearance = data.get("cf_clearance", "")
        session_val = data.get("session", "")
        return f"cf_clearance={cf_clearance}; session={session_val}"
    except FileNotFoundError:
        print(f"Cookie file {json_path} not found")
        return ""
    except json.JSONDecodeError:
        print(f"Invalid JSON in {json_path}")
        return ""

@sio.event
async def connect():
    system_message = {
        "createdAt": current_utc_time(),
        "displayName": "Doxbin",
        "content": "Connected to doxbin gateway.",
        "rankData": {"suffix": "[System]", "rankColor": "red", "rankStyle": "bold"}
    }
    message_history.append(system_message)

@sio.event
async def disconnect():
    system_message = {
        "createdAt": current_utc_time(),
        "displayName": "Doxbin",
        "content": "Disconnected from doxbin gateway.",
        "rankData": {"suffix": "[System]", "rankColor": "red", "rankStyle": "bold"}
    }
    message_history.append(system_message)

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

def start_background_tasks():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(socket_client())

if __name__ == '__main__':
    threading.Thread(target=start_background_tasks, daemon=True).start()
    waitress.serve(snoop, host='0.0.0.0', port=5000)
