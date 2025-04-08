document.addEventListener('DOMContentLoaded', function() {
    const chatWidget = document.getElementById('chat-widget');
    const chatWidgetMinimized = document.getElementById('chat-widget-minimized');
    const minimizeBtn = document.getElementById('minimize-btn');
    const chatDisplay = document.getElementById('chat-display');
    const onlineCounter = document.getElementById('online-counter');
    const contextMenu = document.getElementById('context-menu');
    const clearChatBtn = document.getElementById('clear-chat');
    const messagePopout = document.getElementById('message-popout');
    const popoutHeader = document.getElementById('popout-header');
    const popoutMessage = document.getElementById('popout-message');
    const viewProfileBtn = document.getElementById('view-profile-btn');
    const copyIdBtn = document.getElementById('copy-id-btn');

    let lastMessageId = 0;
    let isMinimized = false;
    let selectedMessageData = null;

    function minimizeWidget() {
        chatWidget.classList.add('minimized');
        chatWidgetMinimized.classList.add('visible');
        isMinimized = true;
    }

    function maximizeWidget() {
        chatWidget.classList.remove('minimized');
        chatWidgetMinimized.classList.remove('visible');
        isMinimized = false;
    }

    minimizeBtn.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        minimizeWidget();
    });

    chatWidgetMinimized.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        maximizeWidget();
    });

    function fetchMessages() {
        fetch('/messages')
            .then(response => response.json())
            .then(messages => {
                if (messages.length > lastMessageId) {
                    for (let i = lastMessageId; i < messages.length; i++) {
                        displayMessage(messages[i]);
                    }
                    lastMessageId = messages.length;
                    if (!isMinimized) {
                        chatDisplay.scrollTop = chatDisplay.scrollHeight;
                    }
                }
            })
            .catch(error => console.error('Error fetching messages:', error));
    }

    function fetchOnlineCount() {
        fetch('/online')
            .then(response => response.json())
            .then(data => {
                onlineCounter.textContent = data.count;
            })
            .catch(error => console.error('Error fetching online count:', error));
    }

    function linkify(text) {
        const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(urlPattern, function(url) {
            return `<a href="${url}" target="_blank" style="color: #66ccff; text-decoration: underline;">${url}</a>`;
        });
    }

    function displayMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';

        let usernameColor = '#0099FF';
        let suffix = '';
        let suffixColor = '';
        let rankStyle = '';

        if (data.usernameColor) {
            usernameColor = data.usernameColor;
        }
        if (data.rankData && data.rankData.rankColor) {
            suffixColor = data.rankData.rankColor;
        }
        if (data.rankData && data.rankData.suffix) {
            suffix = data.rankData.suffix;
        }
        if (data.rankData && data.rankData.style) {
            rankStyle = data.rankData.style;
        }

        const isSystemMessage = data.displayName === 'Doxbin' && suffix === '[System]';
        if (isSystemMessage) {
            usernameColor = 'red';
            suffixColor = 'red';
            rankStyle = 'font-weight: bold;';
        }

        messageDiv.dataset.createdAt = data.createdAt;
        messageDiv.dataset.displayName = data.displayName;
        messageDiv.dataset.usernameColor = usernameColor;
        messageDiv.dataset.suffix = suffix;
        messageDiv.dataset.content = data.content;
        messageDiv.dataset.messageId = data.messageID || '';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = data.createdAt + ' ';
        messageDiv.appendChild(timeSpan);

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.style.color = usernameColor;
        if (rankStyle) usernameSpan.style.cssText += rankStyle;
        usernameSpan.textContent = data.displayName;
        messageDiv.appendChild(usernameSpan);

        if (suffix) {
            const suffixSpan = document.createElement('span');
            suffixSpan.className = 'suffix';
            suffixSpan.style.color = suffixColor;
            if (rankStyle) suffixSpan.style.cssText += rankStyle;
            suffixSpan.textContent = suffix;
            messageDiv.appendChild(suffixSpan);
        }

        const separatorSpan = document.createElement('span');
        separatorSpan.textContent = ': ';
        messageDiv.appendChild(separatorSpan);

        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.innerHTML = linkify(data.content);
        messageDiv.appendChild(contentSpan);

        chatDisplay.appendChild(messageDiv);
    }

    function checkForNewMessages() {
        if (isMinimized && lastMessageId > 0) {
            chatWidgetMinimized.classList.add('notification');
            setTimeout(() => {
                chatWidgetMinimized.classList.remove('notification');
            }, 1000);
        }
    }

    chatDisplay.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const messageDiv = e.target.closest('.message');
        if (messageDiv) {
            selectedMessageData = messageDiv.dataset;
            popoutHeader.innerHTML = `${selectedMessageData.createdAt} <span style="color:${selectedMessageData.usernameColor}">${selectedMessageData.displayName}${selectedMessageData.suffix || ''}</span>`;
            popoutMessage.textContent = selectedMessageData.content;
            messagePopout.style.display = 'block';
        } else {
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function() {
        contextMenu.style.display = 'none';
        messagePopout.style.display = 'none';
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            contextMenu.style.display = 'none';
            messagePopout.style.display = 'none';
        }
    });

    clearChatBtn.addEventListener('click', function() {
        chatDisplay.innerHTML = '';
        lastMessageId = 0;
    });

    viewProfileBtn.addEventListener('click', function() {
        if (selectedMessageData && selectedMessageData.displayName) {
            const profileUrl = `https://doxbin.net/user/${encodeURIComponent(selectedMessageData.displayName)}`;
            window.open(profileUrl, '_blank');
        }
    });

    copyIdBtn.addEventListener('click', function() {
        if (selectedMessageData && selectedMessageData.messageId) {
            navigator.clipboard.writeText(selectedMessageData.messageId)
                .then(() => console.log('Message ID copied:', selectedMessageData.messageId));
        }
    });

    fetchMessages();
    fetchOnlineCount();
    setInterval(fetchMessages, 2000);
    setInterval(fetchOnlineCount, 5000);
    setInterval(checkForNewMessages, 2000);

    const socket = io();
    socket.on('message', (raw) => {
        if (typeof raw !== 'string' || !raw.startsWith('42')) return;
        try {
            const [event, data] = JSON.parse(raw.slice(2));
            if (event === 'send_message' && data) {
                displayMessage(data);
            }
        } catch (err) {
            console.error('WebSocket parse error:', err);
        }
    });
});
