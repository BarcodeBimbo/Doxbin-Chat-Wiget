document.addEventListener('DOMContentLoaded', function() {
    const chatDisplay = document.getElementById('chat-display');
    const onlineCounter = document.getElementById('online-counter');
    const minimizeBtn = document.getElementById('minimize-btn');
    const chatWidget = document.getElementById('chat-widget');
    const chatWidgetMinimized = document.getElementById('chat-widget-minimized');
    
    let lastMessageId = 0;
    let isMinimized = false;
    
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
        fetch('/messages')
            .then(response => response.json())
            .then(messages => {
                if (messages.length > lastMessageId) {
                    if (chatDisplay.children.length > 150) {
                        chatDisplay.innerHTML = '';
                    }
                    
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
    
    function displayMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
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
                usernameColor = '#FFFFFF'; // set to white
                displayName += '[Anonymous]'; // temporary display with [Anonymous]
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
    
    fetchMessages();
    fetchOnlineCount();
    
    setInterval(fetchMessages, 2000);
    setInterval(fetchOnlineCount, 5000);
    
    function checkForNewMessages() {
        if (isMinimized && lastMessageId > 0) {
            chatWidgetMinimized.classList.add('notification');
            setTimeout(() => {
                chatWidgetMinimized.classList.remove('notification');
            }, 1000);
        }
    }
    
    setInterval(checkForNewMessages, 2000);
});
