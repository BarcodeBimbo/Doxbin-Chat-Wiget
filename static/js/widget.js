document.addEventListener('DOMContentLoaded', function() {
    const chatDisplay = document.getElementById('chat-display');
    const onlineCounter = document.getElementById('online-counter');
    const minimizeBtn = document.getElementById('minimize-btn');
    const chatWidget = document.getElementById('chat-widget');
    const chatWidgetMinimized = document.getElementById('chat-widget-minimized');

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
        localStorage.setItem('doxbinChatMinimized', 'true');
    }

    function maximizeWidget() {
        chatWidget.classList.remove('minimized');
        chatWidgetMinimized.classList.remove('visible');
        isMinimized = false;
        localStorage.setItem('doxbinChatMinimized', 'false');
        setTimeout(() => {
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }, 300);
    }

    if (localStorage.getItem('doxbinChatMinimized') === 'true') {
        minimizeWidget();
    } else {
        maximizeWidget();
    }

    minimizeBtn.addEventListener('click', minimizeWidget);
    chatWidgetMinimized.addEventListener('click', maximizeWidget);

    function fetchMessages() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        fetch('/messages', { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                return response.json();
            })
            .then(messages => {
                if (chatDisplay.children.length > 150) {
                    window.location.reload();
                    return;
                }
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
            .catch(error => {
                console.error('Error fetching messages:', error);
                window.location.reload();
            });
    }

    function fetchOnlineCount() {
        fetch('/online')
            .then(response => response.json())
            .then(data => {
                onlineCounter.textContent = data.count;
            })
            .catch(error => console.error('Error fetching online count:', error));
    }

    function displayMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.dataset.createdAt = data.createdAt;
        messageDiv.dataset.displayName = data.displayName;
        messageDiv.dataset.usernameColor = data.usernameColor || (data.rankData && data.rankData.rankColor) || '#0099FF';
        messageDiv.dataset.suffix = (data.rankData && data.rankData.suffix) || '';
        messageDiv.dataset.content = data.content;
        messageDiv.dataset.messageId = data.messageID || '';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = data.createdAt + ' ';
        messageDiv.appendChild(timeSpan);

        if (data.displayName === 'Doxbin' && data.rankData && data.rankData.suffix === '[System]') {
            const systemSenderSpan = document.createElement('span');
            systemSenderSpan.className = 'system-sender';
            systemSenderSpan.textContent = data.displayName + data.rankData.suffix;
            messageDiv.appendChild(systemSenderSpan);
        } else {
            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'username';
            let usernameColor = data.usernameColor || (data.rankData && data.rankData.rankColor) || '#0099FF';
            let displayName = data.displayName;
            if (!data.usernameColor && !data.rankData) {
                usernameColor = '#FFFFFF';
                displayName += '[Anonymous]';
            }
            usernameSpan.style.color = usernameColor;
            usernameSpan.textContent = displayName;
            messageDiv.appendChild(usernameSpan);

            if (data.rankData && data.rankData.suffix) {
                const suffixSpan = document.createElement('span');
                suffixSpan.className = 'suffix';
                suffixSpan.style.color = data.rankData.rankColor || '#FFFFFF';
                if (data.rankData.rankStyle) {
                    if (data.rankData.rankStyle.includes('bold')) {
                        suffixSpan.style.fontWeight = 'bold';
                    }
                    if (data.rankData.rankStyle.includes('italic')) {
                        suffixSpan.style.fontStyle = 'italic';
                    }
                }
                suffixSpan.textContent = data.rankData.suffix;
                messageDiv.appendChild(suffixSpan);
            }
        }

        const separatorSpan = document.createElement('span');
        separatorSpan.textContent = ': ';
        messageDiv.appendChild(separatorSpan);

        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const content = data.content;
        let lastIndex = 0;
        let match;

        while ((match = urlRegex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                contentSpan.appendChild(document.createTextNode(content.substring(lastIndex, match.index)));
            }
            const link = document.createElement('a');
            link.href = match[0];
            link.textContent = match[0];
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            contentSpan.appendChild(link);
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < content.length) {
            contentSpan.appendChild(document.createTextNode(content.substring(lastIndex)));
        }

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

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const messageDiv = e.target.closest('.message');
        if (messageDiv) {
            selectedMessageData = messageDiv.dataset;
            popoutHeader.innerHTML = `${selectedMessageData.createdAt} <span style="color:${selectedMessageData.usernameColor}">${selectedMessageData.displayName}${selectedMessageData.suffix || ''}</span>`;
            popoutMessage.textContent = selectedMessageData.content;
            messagePopout.style.display = 'block';
        } else {
            contextMenu.style.top = `${e.pageY}px`;
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function() {
        contextMenu.style.display = 'none';
        messagePopout.style.display = 'none';
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            messagePopout.style.display = 'none';
            contextMenu.style.display = 'none';
        }
    });

    clearChatBtn.addEventListener('click', function() {
        chatDisplay.innerHTML = '';
        lastMessageId = 0;
        contextMenu.style.display = 'none';
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
        } else {
            console.log('No Message ID found.');
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
