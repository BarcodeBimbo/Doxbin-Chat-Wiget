
<div align="center">
  <img src="https://github.com/user-attachments/assets/ebc869a1-c6b0-4b21-88e2-c7ff6f3052a4" alt="Snooper" height="200">
</div>

<p align="center">
  <a href="https://discord.gg/daddy">
    <img src="https://discord.com/api/guilds/319560327719026709/widget.png?style=shield" alt="Discord Server">
  </a>
  <a href="https://www.python.org/downloads/">
    <img alt="PyPI - Python Version" src="https://img.shields.io/pypi/pyversions/Red-Discordbot">
  </a>
</p>

# Doxbin Chat Snooper Web Widget

This is a Flask-based web widget version of the Doxbin Chat Snooper. It allows you to embed a live Doxbin chat monitor on any static HTML site using an iframe.

## Features

- **Minimizable Widget**: Widget appears at the bottom left of the screen and can be minimized/maximized
- **Real-time Updates**: Messages are updated in real-time
- **User Status**: Shows online user count
- **URL Detection**: Automatically converts URLs to clickable links
- **Styling**: Maintains the dark theme and styling of the original application
- **Notification**: Visual notification when new messages arrive while minimized

---

### Preview:
<div align="center">
  <video src="https://github.com/user-attachments/assets/35953510-e767-427b-a41d-23db85ec1a4c.mp4"></video>
</div>

## Requirements

- Python 3.6+
- Flask
- python-socketio[asyncio_client]
- waitress
- requests 

## Installation

1. Clone this repository:
   ```
   git https://github.com/BarcodeBimbo/Doxbin-Chat-Wiget.git
   cd doxbin-chat-widget
   ```

2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

3. Create a `cookies.json` file in the root directory with your Doxbin cookies:
   ```json
   {
     "cf_clearance": "your-cf-clearance-cookie",
     "session": "your-session-cookie"
   }
   ```

4. Create the directory structure:
   ```
   mkdir -p static/css static/js templates
   ```

5. Copy the provided files into their respective directories:
   - `snoop.py` in the root directory
   - HTML files in the `templates` directory
   - CSS files in the `static/css` directory
   - JavaScript files in the `static/js` directory

## Running the Server

1. Start the Flask server:
   ```
   python snoop.py
   ```

2. Visit `http://localhost:5000` in your browser to see the widget demo.

## Embedding in Your Static Site

To embed the chat widget in your static HTML site, add the following iframe:

```html
<iframe src="http://your-server-address:5000/widget" width="100%" height="100%" frameborder="0" style="border:none;position:fixed;bottom:0;left:0;width:100%;height:100%;z-index:999;pointer-events:none;"></iframe>
```

Replace `your-server-address` with the IP address or domain name of your Flask server.

The widget will appear in the bottom left corner of your website with the following features:
- It can be minimized to a small button
- It will show notifications when new messages arrive while minimized
- The iframe uses `pointer-events:none` so users can interact with your website content. Only the widget itself captures clicks.

## Customization

You can customize the appearance of the widget by modifying the CSS files in the `static/css` directory:

- Change colors in `widget.css`
- Adjust the position by modifying the `bottom` and `left` properties in `.chat-widget` and `.chat-widget-minimized`
- Change the size by modifying the `width` and `height` of `.chat-widget`

## Notes

- The widget displays the last 100 messages from the Doxbin chat
- Messages are fetched every 2 seconds, and the online count is updated every 5 seconds
- The widget state (minimized/maximized) is saved in local storage
- You must have valid Doxbin cookies in your `cookies.json` file for the widget to work properly
- This project is for educational purposes only

## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.

## 🧑‍💻 Developer

- **Name:** Joshua 
- **Contact:** @BarcodeBimbo
- **Version:** 1.0.0
- **Updated:** April 04, 2025

## ⚠️ Disclaimer

This is a reverse-engineered, unofficial API tool intended for educational purposes. Use responsibly and ethically.
