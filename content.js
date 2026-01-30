// Content script - injects chat UI and handles DOM extraction

let chatUIInjected = false;

// Initialize chat UI when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatUI);
} else {
  initChatUI();
}

// Listen for postMessage from page context (for Vega-Lite errors)
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'vegaError') {
    const container = document.getElementById(event.data.containerId);
    if (container) {
      container.innerHTML = '<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;"><strong>Error:</strong> ' + 
        (event.data.error || 'Unknown error') + '<br><small>Please check browser console (F12) for details.</small></div>';
    }
  }
});

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleChat' || request.action === 'openChat') {
    // Ensure chat UI is initialized
    if (!chatUIInjected) {
      initChatUI();
    }
    // Show and focus the chat
    const container = document.getElementById('ai-chat-container');
    if (container) {
      container.style.display = 'flex';
      // Reload chat history when opening
      loadChatHistory();
      // Focus the input
      setTimeout(() => {
        const input = document.getElementById('ai-chat-input');
        if (input) input.focus();
      }, 100);
    }
    sendResponse({ success: true });
  }
  
  if (request.action === 'vegaError') {
    const container = document.getElementById(request.containerId);
    if (container) {
      container.innerHTML = '<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;"><strong>Error:</strong> ' + (request.error || 'Unknown error') + '<br><small>Please check browser console (F12) for details.</small></div>';
    }
    sendResponse({ success: true });
  }
  
  // Listen for postMessage from page context
  if (request.action === 'vegaChartRendered') {
    const container = document.getElementById(request.containerId);
    if (container) {
      console.log('Chart rendered successfully in container:', request.containerId);
    }
    sendResponse({ success: true });
  }
  
  if (request.action === 'getContext') {
    const context = extractSemanticJSON();
    sendResponse({ context: context });
  }
  
  return true;
});

function initChatUI() {
  if (chatUIInjected) return;
  
  // Create chat button
  const chatButton = document.createElement('div');
  chatButton.id = 'ai-chat-button';
  chatButton.innerHTML = '💬';
  chatButton.title = 'Open AI Chat';
  chatButton.addEventListener('click', toggleChatUI);
  document.body.appendChild(chatButton);
  
  // Create chat UI container
  const chatContainer = document.createElement('div');
  chatContainer.id = 'ai-chat-container';
  chatContainer.style.display = 'none';
  document.body.appendChild(chatContainer);
  
  // Load chat UI
  loadChatUI();
  
  chatUIInjected = true;
}

function toggleChatUI() {
  const container = document.getElementById('ai-chat-container');
  if (container.style.display === 'none') {
    container.style.display = 'flex';
    // Reload chat history when opening
    loadChatHistory();
  } else {
    container.style.display = 'none';
  }
}

function loadChatUI() {
  const container = document.getElementById('ai-chat-container');
  
  container.innerHTML = `
    <div class="ai-chat-header">
      <h3>AI Assistant</h3>
      <div class="ai-chat-header-actions">
        <button id="ai-chat-settings" title="Settings">⚙️</button>
        <button id="ai-chat-close" title="Close">×</button>
      </div>
    </div>
    <div class="ai-chat-messages" id="ai-chat-messages"></div>
    <div class="ai-chat-input-container">
      <input type="text" id="ai-chat-input" placeholder="Ask a question about this page...">
      <button id="ai-chat-send">Send</button>
    </div>
    <div class="ai-chat-resize-handle" id="ai-chat-resize-handle"></div>
  `;
  
  // Add event listeners
  document.getElementById('ai-chat-close').addEventListener('click', () => {
    document.getElementById('ai-chat-container').style.display = 'none';
  });
  
  document.getElementById('ai-chat-settings').addEventListener('click', () => {
    // Send message to background script to open settings (most reliable method)
    chrome.runtime.sendMessage({ action: 'openSettings' }, (response) => {
      if (chrome.runtime.lastError) {
        // Fallback: Try direct methods
        try {
          chrome.runtime.openOptionsPage();
        } catch (e) {
          // Final fallback: Use window.open
          const settingsUrl = chrome.runtime.getURL('settings.html');
          window.open(settingsUrl, '_blank');
        }
      }
    });
  });
  
  document.getElementById('ai-chat-send').addEventListener('click', handleSendMessage);
  document.getElementById('ai-chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });
  
  // Add resize functionality
  setupResize();
  
  // Load chat history for this page
  loadChatHistory();
}

// Chat history functions
function getChatHistoryKey() {
  // Use page URL as key (normalize to avoid duplicates)
  const url = new URL(window.location.href);
  return `chatHistory_${url.origin}${url.pathname}`;
}

function saveChatHistory(messages) {
  const key = getChatHistoryKey();
  chrome.storage.local.set({ [key]: messages }, () => {
    console.log('Chat history saved for:', key);
  });
}

function loadChatHistory() {
  const key = getChatHistoryKey();
  chrome.storage.local.get([key], (result) => {
    const history = result[key] || [];
    if (history.length > 0) {
      console.log('Loading chat history:', history.length, 'messages');
      const messagesContainer = document.getElementById('ai-chat-messages');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
        history.forEach(msg => {
          restoreMessage(msg);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  });
}

function restoreMessage(msg) {
  const messagesContainer = document.getElementById('ai-chat-messages');
  if (!messagesContainer) return;
  
  const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = `ai-chat-message ai-chat-message-${msg.role}`;
  
  let contentToCopy = '';
  let isHTMLContent = false;
  
  if (msg.role === 'user') {
    messageDiv.textContent = msg.content;
    contentToCopy = msg.content;
  } else {
    // Assistant message - could be markdown or vega-lite
    if (msg.type === 'vega-lite' && msg.spec) {
      const containerId = 'vega-container-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Build HTML with summary if available
      let html = '';
      if (msg.summary) {
        html += '<div class="chart-summary" style="margin-bottom: 12px; padding: 12px; background: #E6F7FF; border-left: 4px solid #00AEEF; border-radius: 4px;">' +
          renderMarkdown(msg.summary) +
          '</div>';
        contentToCopy = msg.summary + '\n\n[Chart visualization]';
      } else {
        contentToCopy = '[Chart visualization]';
      }
      html += '<div class="vega-lite-container" id="' + containerId + '"></div>';
      
      messageDiv.innerHTML = html;
      isHTMLContent = true;
      
      // Add copy button (will copy chart as image)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'ai-message-actions';
      
      const copyBtn = document.createElement('button');
      copyBtn.textContent = '📋 Copy';
      copyBtn.title = 'Copy';
      copyBtn.setAttribute('data-action', 'copy');
      copyBtn.onclick = () => copyChartAsImage(messageId);
      actionsDiv.appendChild(copyBtn);
      
      messageDiv.appendChild(actionsDiv);
      
      messagesContainer.appendChild(messageDiv);
      setTimeout(() => {
        const container = document.getElementById(containerId);
        if (container) {
          renderVegaLite(container, msg.spec);
        }
      }, 100);
      return;
    } else {
      // Markdown or plain text
      const content = msg.isHTML ? msg.content : renderMarkdown(msg.content || '');
      messageDiv.innerHTML = content;
      contentToCopy = msg.content || '';
      isHTMLContent = msg.isHTML || false;
    }
  }
  
  // Add copy button (will extract text from DOM)
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'ai-message-actions';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copy';
  copyBtn.title = 'Copy';
  copyBtn.setAttribute('data-action', 'copy');
  copyBtn.onclick = () => copyMessage(messageId, null, true);
  actionsDiv.appendChild(copyBtn);
  messageDiv.appendChild(actionsDiv);
  
  messagesContainer.appendChild(messageDiv);
}


function setupResize() {
  const container = document.getElementById('ai-chat-container');
  const resizeHandle = document.getElementById('ai-chat-resize-handle');
  
  if (!resizeHandle || !container) return;
  
  let isResizing = false;
  let startX, startY, startWidth, startHeight;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(window.getComputedStyle(container).width, 10);
    startHeight = parseInt(window.getComputedStyle(container).height, 10);
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    e.preventDefault();
  });
  
  function handleResize(e) {
    if (!isResizing) return;
    
    const width = startWidth + (e.clientX - startX);
    const height = startHeight + (e.clientY - startY);
    
    // Set minimum and maximum sizes
    const minWidth = 300;
    const maxWidth = window.innerWidth - 40;
    const minHeight = 400;
    const maxHeight = window.innerHeight - 100;
    
    container.style.width = Math.max(minWidth, Math.min(maxWidth, width)) + 'px';
    container.style.height = Math.max(minHeight, Math.min(maxHeight, height)) + 'px';
    
    // Save size to storage
    chrome.storage.local.set({
      chatWidth: container.style.width,
      chatHeight: container.style.height
    });
  }
  
  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }
  
  // Load saved size
  chrome.storage.local.get(['chatWidth', 'chatHeight'], (result) => {
    if (result.chatWidth) {
      container.style.width = result.chatWidth;
    }
    if (result.chatHeight) {
      container.style.height = result.chatHeight;
    }
  });
}

async function handleSendMessage() {
  const input = document.getElementById('ai-chat-input');
  const question = input.value.trim();
  
  if (!question) return;
  
  // Add user message to chat
  addMessage('user', question);
  input.value = '';
  
  // Show loading
  const loadingId = addMessage('assistant', 'Thinking...', true);
  
  try {
    // Extract DOM to semantic JSON
    const context = extractSemanticJSON();
    
    // Send to background script for LLM call
    const response = await chrome.runtime.sendMessage({
      action: 'callLLM',
      data: {
        question: question,
        context: context
      }
    });
    
    // Remove loading message
    removeMessage(loadingId);
    
    if (response.success) {
      renderResponse(response.data);
    } else {
      addMessage('assistant', `Error: ${response.error}`, false);
    }
  } catch (error) {
    removeMessage(loadingId);
    addMessage('assistant', `Error: ${error.message}`, false);
  }
}

function addMessage(role, content, isLoading = false) {
  const messagesContainer = document.getElementById('ai-chat-messages');
  const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = `ai-chat-message ai-chat-message-${role}`;
  messageDiv.textContent = content;
  
  // Add copy button (except for loading messages)
  if (!isLoading) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'ai-message-actions';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copy';
    copyBtn.title = 'Copy';
    copyBtn.setAttribute('data-action', 'copy');
    copyBtn.onclick = () => copyMessage(messageId, content, false);
    actionsDiv.appendChild(copyBtn);
    messageDiv.appendChild(actionsDiv);
  }
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  // Save to history (don't save loading messages)
  if (!isLoading) {
    saveMessageToHistory(role, content, null);
  }
  
  return isLoading ? messageId : null;
}

function copyMessage(messageId, content, isHTML) {
  const messageDiv = document.getElementById(messageId);
  
  // Check if this is a chart message
  if (messageDiv && messageDiv.querySelector('.vega-lite-container')) {
    // For charts, copy as image
    copyChartAsImage(messageId);
    return;
  }
  
  // For markdown/text messages, copy text
  let textToCopy = '';
  
  if (messageDiv) {
    // Clone the message div to extract text
    const clone = messageDiv.cloneNode(true);
    
    // Remove the copy button from clone
    clone.querySelectorAll('.ai-message-actions').forEach(el => el.remove());
    
    // Get all text content
    textToCopy = clone.textContent || clone.innerText || '';
    
    // Clean up whitespace
    textToCopy = textToCopy.trim();
  } else {
    // Fallback: use provided content
    if (isHTML) {
      // Extract text from HTML, preserving structure
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Get text content
      textToCopy = tempDiv.textContent || tempDiv.innerText || '';
    } else {
      textToCopy = content;
    }
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(textToCopy.trim()).then(() => {
    // Show success feedback
    if (messageDiv) {
      const copyBtn = messageDiv.querySelector('.ai-message-actions button[data-action="copy"]');
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        copyBtn.classList.add('ai-copy-success');
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('ai-copy-success');
        }, 2000);
      }
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy.trim();
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      if (messageDiv) {
        const copyBtn = messageDiv.querySelector('.ai-message-actions button[data-action="copy"]');
        if (copyBtn) {
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy';
          }, 2000);
        }
      }
    } catch (e) {
      console.error('Fallback copy failed:', e);
    }
    document.body.removeChild(textArea);
  });
}

function copyChartAsImage(messageId) {
  const messageDiv = document.getElementById(messageId);
  if (!messageDiv) {
    console.error('Message div not found:', messageId);
    return;
  }
  
  // Find the chart container
  const chartContainer = messageDiv.querySelector('.vega-lite-container');
  if (!chartContainer) {
    console.error('Chart container not found');
    return;
  }
  
  const containerId = chartContainer.id;
  if (!containerId) {
    console.error('Container has no ID');
    return;
  }
  
  // Get chart summary text if available
  const chartSummary = messageDiv.querySelector('.chart-summary');
  const summaryText = chartSummary ? chartSummary.textContent.trim() : '';
  
  // For inline charts, SVG is rendered in page context (not content script context)
  // We need to inject a script to access it
  chrome.runtime.sendMessage({
    action: 'getChartSVG',
    containerId: containerId
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting chart SVG:', chrome.runtime.lastError);
      alert('Failed to copy chart. Please try again.');
      return;
    }
    
    if (response && response.svgString) {
      // Parse SVG string and convert to image
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(response.svgString, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      if (svgElement) {
        svgToImage(svgElement, (imageData) => {
          // Copy image to clipboard
          copyImageDataToClipboard(imageData);
          showCopySuccess(messageDiv);
          
          // If there's summary text, also copy it as text (user can paste both)
          // Note: We can't copy both image and text simultaneously, so we copy the image
          // The summary is already visible in the message, so user can copy it separately if needed
        });
      } else {
        alert('Chart not yet rendered. Please wait for the chart to load.');
      }
    } else {
      alert('Chart not yet rendered. Please wait for the chart to load.');
    }
  });
}

function svgToImage(svg, callback) {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svg.cloneNode(true);
  
  // Get SVG dimensions
  const svgRect = svg.getBoundingClientRect();
  const width = svgRect.width || parseInt(svg.getAttribute('width')) || 800;
  const height = svgRect.height || parseInt(svg.getAttribute('height')) || 600;
  
  // Set explicit dimensions
  clonedSvg.setAttribute('width', width);
  clonedSvg.setAttribute('height', height);
  
  // Serialize SVG to string
  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  // Create image element
  const img = new Image();
  img.onload = function() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Draw image on canvas
    ctx.drawImage(img, 0, 0);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      if (blob) {
        callback(blob);
      } else {
        console.error('Failed to create image blob');
        alert('Failed to copy chart as image');
      }
    }, 'image/png');
  };
  
  img.onerror = function() {
    URL.revokeObjectURL(url);
    console.error('Failed to load SVG as image');
    alert('Failed to copy chart as image');
  };
  
  img.src = url;
}

function copyImageDataToClipboard(blob) {
  // Use Clipboard API
  navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]).then(() => {
    console.log('Image copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy image:', err);
    // Fallback: download the image
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart.png';
    a.click();
    URL.revokeObjectURL(url);
    alert('Image copied! (Downloaded as fallback)');
  });
}

function showCopySuccess(messageDiv) {
  const copyBtn = messageDiv.querySelector('.ai-message-actions button[data-action="copy"]');
  if (copyBtn) {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓ Copied!';
    copyBtn.classList.add('ai-copy-success');
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove('ai-copy-success');
    }, 2000);
  }
}

function svgToImage(svg, callback) {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svg.cloneNode(true);
  
  // Get SVG dimensions
  const svgRect = svg.getBoundingClientRect();
  const width = svgRect.width || parseInt(svg.getAttribute('width')) || 800;
  const height = svgRect.height || parseInt(svg.getAttribute('height')) || 600;
  
  // Set explicit dimensions
  clonedSvg.setAttribute('width', width);
  clonedSvg.setAttribute('height', height);
  
  // Serialize SVG to string
  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  // Create image element
  const img = new Image();
  img.onload = function() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Draw image on canvas
    ctx.drawImage(img, 0, 0);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      if (blob) {
        callback(blob);
      } else {
        console.error('Failed to create image blob');
        alert('Failed to copy chart as image');
      }
    }, 'image/png');
  };
  
  img.onerror = function() {
    URL.revokeObjectURL(url);
    console.error('Failed to load SVG as image');
    alert('Failed to copy chart as image');
  };
  
  img.src = url;
}

function copyImageDataToClipboard(blob) {
  // Use Clipboard API
  navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]).then(() => {
    console.log('Image copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy image:', err);
    // Fallback: download the image
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart.png';
    a.click();
    URL.revokeObjectURL(url);
    alert('Image copied! (Downloaded as fallback)');
  });
}

function saveMessageToHistory(role, content, responseData = null) {
  const key = getChatHistoryKey();
  chrome.storage.local.get([key], (result) => {
    const history = result[key] || [];
    const message = {
      role: role,
      content: content,
      timestamp: Date.now()
    };
    
    if (responseData) {
      message.type = responseData.type;
      if (responseData.type === 'vega-lite') {
        message.spec = responseData.spec;
      } else if (responseData.type === 'markdown') {
        message.content = responseData.content;
        message.isHTML = true;
      }
    }
    
    history.push(message);
    saveChatHistory(history);
  });
}

function removeMessage(messageId) {
  const message = document.getElementById(messageId);
  if (message) {
    message.remove();
  }
}

function renderResponse(data) {
  const messagesContainer = document.getElementById('ai-chat-messages');
  const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = 'ai-chat-message ai-chat-message-assistant';
  
  let contentToCopy = '';
  let isHTMLContent = false;
  
  // Handle empty or invalid responses
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    const errorMsg = '**Error:** Received an empty response from the AI. Please try again or check your settings.';
    messageDiv.innerHTML = renderMarkdown(errorMsg);
    contentToCopy = errorMsg;
    isHTMLContent = true;
    saveMessageToHistory('assistant', errorMsg, { type: 'markdown', content: errorMsg });
  } else if (data.type === 'markdown') {
    // Render markdown (simplified - you might want to use a markdown library)
    if (!data.content) {
      const errorMsg = '**Error:** Markdown response has no content.';
      messageDiv.innerHTML = renderMarkdown(errorMsg);
      contentToCopy = errorMsg;
      isHTMLContent = true;
      saveMessageToHistory('assistant', errorMsg, { type: 'markdown', content: errorMsg });
    } else {
      messageDiv.innerHTML = renderMarkdown(data.content);
      contentToCopy = data.content;
      isHTMLContent = true;
      saveMessageToHistory('assistant', data.content, data);
    }
  } else if (data.type === 'vega-lite') {
    // Render Vega-Lite chart
    if (!data.spec) {
      const errorMsg = '**Error:** Vega-Lite response has no spec.';
      messageDiv.innerHTML = renderMarkdown(errorMsg);
      contentToCopy = errorMsg;
      isHTMLContent = true;
      saveMessageToHistory('assistant', errorMsg, { type: 'markdown', content: errorMsg });
    } else {
      // Create container with unique ID that will be accessible from page context
      const containerId = 'vega-container-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Build HTML with summary if available
      let html = '';
      if (data.summary) {
        html += '<div class="chart-summary" style="margin-bottom: 12px; padding: 12px; background: #E6F7FF; border-left: 4px solid #00AEEF; border-radius: 4px;">' +
          renderMarkdown(data.summary) +
          '</div>';
        contentToCopy = data.summary + '\n\n[Chart visualization]';
      } else {
        contentToCopy = '[Chart visualization]';
      }
      html += '<div class="vega-lite-container" id="' + containerId + '"></div>';
      
      messageDiv.innerHTML = html;
      isHTMLContent = true;
      
      // Add copy button (will copy chart as image or text as appropriate)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'ai-message-actions';
      
      const copyBtn = document.createElement('button');
      copyBtn.textContent = '📋 Copy';
      copyBtn.title = 'Copy';
      copyBtn.setAttribute('data-action', 'copy');
      copyBtn.onclick = () => copyMessage(messageId, null, true);
      actionsDiv.appendChild(copyBtn);
      
      messageDiv.appendChild(actionsDiv);
      
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Save to history (include summary)
      saveMessageToHistory('assistant', '', data);
      
      // Wait a bit to ensure DOM is updated and container is accessible
      setTimeout(() => {
        const container = document.getElementById(containerId);
        if (container) {
          console.log('Container found, rendering Vega-Lite:', containerId);
          renderVegaLite(container, data.spec);
        } else {
          console.error('Container not found after creation:', containerId);
          messageDiv.innerHTML = renderMarkdown('**Error:** Failed to create chart container.');
        }
      }, 100);
      return; // Early return since we already appended
    }
  } else {
    // Unknown format - show the data for debugging
    console.warn('Unknown response format:', data);
    const errorMsg = '**Unexpected response format:**\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```';
    messageDiv.innerHTML = renderMarkdown(errorMsg);
    contentToCopy = errorMsg;
    isHTMLContent = true;
    saveMessageToHistory('assistant', errorMsg, { type: 'markdown', content: errorMsg });
  }
  
  // Add copy button (will extract text from DOM)
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'ai-message-actions';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copy';
  copyBtn.title = 'Copy';
  copyBtn.setAttribute('data-action', 'copy');
  copyBtn.onclick = () => copyMessage(messageId, null, true);
  actionsDiv.appendChild(copyBtn);
  messageDiv.appendChild(actionsDiv);
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderMarkdown(content) {
  if (!content) return '';
  
  // Split into lines for better processing
  const lines = content.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLanguage = '';
  let inList = false;
  let listItems = [];
  let inParagraph = false;
  
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const line = originalLine.trim();
    
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeClass = codeBlockLanguage ? ` class="language-${codeBlockLanguage}"` : '';
        html += '<pre><code' + codeClass + '>' + escapeHtml(codeBlockContent.trim()) + '</code></pre>';
        codeBlockContent = '';
        codeBlockLanguage = '';
        inCodeBlock = false;
        inParagraph = false;
      } else {
        // Start code block - check for language
        codeBlockLanguage = line.substring(3).trim();
        inCodeBlock = true;
        // Close any open paragraph/list
        if (inParagraph) {
          html += '</p>';
          inParagraph = false;
        }
        if (inList) {
          html += listItems.join('');
          html += '</ul>';
          listItems = [];
          inList = false;
        }
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent += originalLine + '\n';
      continue;
    }
    
    // Headers (check before trimming to preserve spacing)
    if (originalLine.startsWith('### ')) {
      if (inList && listItems.length > 0) {
        html += '<ul>' + listItems.join('') + '</ul>';
        listItems = [];
        inList = false;
      }
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      html += '<h3>' + processInlineMarkdown(originalLine.substring(4).trim()) + '</h3>';
      continue;
    }
    if (originalLine.startsWith('## ')) {
      if (inList && listItems.length > 0) {
        html += '<ul>' + listItems.join('') + '</ul>';
        listItems = [];
        inList = false;
      }
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      html += '<h2>' + processInlineMarkdown(originalLine.substring(3).trim()) + '</h2>';
      continue;
    }
    if (originalLine.startsWith('# ')) {
      if (inList && listItems.length > 0) {
        html += '<ul>' + listItems.join('') + '</ul>';
        listItems = [];
        inList = false;
      }
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      html += '<h1>' + processInlineMarkdown(originalLine.substring(2).trim()) + '</h1>';
      continue;
    }
    
    // Lists
    if (line.match(/^[\*\-\+] /) || line.match(/^\d+\. /)) {
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      const itemText = line.replace(/^[\*\-\+] /, '').replace(/^\d+\. /, '');
      listItems.push('<li>' + processInlineMarkdown(itemText) + '</li>');
      continue;
    }
    
    // Close list if we hit a non-list line
    if (inList && line !== '') {
      html += listItems.join('');
      html += '</ul>';
      listItems = [];
      inList = false;
    }
    
    // Empty line = paragraph break
    if (line === '') {
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      continue;
    }
    
    // Regular paragraph
    if (!inParagraph) {
      html += '<p>';
      inParagraph = true;
    } else {
      html += ' ';
    }
    html += processInlineMarkdown(originalLine);
  }
  
  // Close any open structures
  if (inCodeBlock) {
    const codeClass = codeBlockLanguage ? ` class="language-${codeBlockLanguage}"` : '';
    html += '<pre><code' + codeClass + '>' + escapeHtml(codeBlockContent.trim()) + '</code></pre>';
  }
  if (inList) {
    html += listItems.join('');
    html += '</ul>';
  }
  if (inParagraph) {
    html += '</p>';
  }
  
  // Wrap if no HTML tags
  if (!html.includes('<')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}


function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function processInlineMarkdown(text) {
  // Escape HTML first
  let html = escapeHtml(text);
  
  // Process in order: code, bold, italic, links
  
  // Code (`code`) - do this first to avoid processing markdown inside code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold (**text**) - do before italic to avoid conflicts
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic (*text*) - match single asterisks, but avoid matching if preceded/followed by *
  // More compatible approach: replace remaining single asterisks
  html = html.replace(/(^|[^*])\*([^*\n]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
  
  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  return html;
}

function renderVegaLite(container, spec) {
  if (!container || !spec) {
    console.error('Vega-Lite: Missing container or spec');
    return;
  }
  
  // Ensure container is ready
  if (!container.parentNode) {
    console.error('Vega-Lite: Container not in DOM');
    return;
  }
  
  // Ensure container has an ID (it should already have one from renderResponse)
  if (!container.id) {
    container.id = 'vega-container-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  const containerId = container.id;
  console.log('Rendering Vega-Lite in container:', containerId);
  
  // Store spec in data attribute as backup
  container.setAttribute('data-vega-spec', JSON.stringify(spec));
  
  // Show loading message
  container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading chart...</div>';
  
  // Ensure container is visible and has proper styling
  container.style.display = 'block';
  container.style.visibility = 'visible';
  container.style.minHeight = '200px';
  
  // Inject script into page context to load Vega-Lite libraries
  chrome.runtime.sendMessage({
    action: 'injectVegaLite',
    containerId: containerId,
    spec: spec
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending inject message:', chrome.runtime.lastError);
      container.innerHTML = '<div style="color: red; padding: 10px;"><strong>Error:</strong> Unable to load chart library. ' + 
        chrome.runtime.lastError.message + '</div>';
    } else if (response && response.error) {
      container.innerHTML = '<div style="color: red; padding: 10px;"><strong>Error:</strong> ' + response.error + '</div>';
    } else if (!response || !response.success) {
      // Wait a bit to see if chart renders (injection is async)
      setTimeout(() => {
        // Check if chart was rendered by looking for SVG in container
        const svg = container.querySelector('svg');
        if (!svg && container.innerHTML.includes('Loading chart')) {
          container.innerHTML = '<div style="color: orange; padding: 10px;">Chart is loading... If this persists, please check the browser console for errors.</div>';
        }
      }, 5000);
      
      // Also check periodically if chart rendered
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        const svg = container.querySelector('svg');
        if (svg) {
          clearInterval(checkInterval);
        } else if (checkCount >= 10) {
          clearInterval(checkInterval);
          if (container.innerHTML.includes('Loading chart') || container.innerHTML.includes('Chart is loading')) {
            container.innerHTML = '<div style="color: red; padding: 10px;"><strong>Error:</strong> Chart failed to load. Please check browser console (F12) for details or try refreshing the page.</div>';
          }
        }
      }, 1000);
    }
  });
}

function extractSemanticJSON() {
  const pageData = {
    page: {
      title: document.title,
      url: window.location.href
    },
    ui_state: {
      content: []
    }
  };
  
  // Extract visible content
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        // Skip hidden, script, style elements
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') {
          return NodeFilter.FILTER_REJECT;
        }
        
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || 
            node.hasAttribute('aria-hidden') && node.getAttribute('aria-hidden') === 'true') {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const elements = [];
  let node;
  
  while (node = walker.nextNode()) {
    const elementData = extractElementData(node);
    if (elementData) {
      elements.push(elementData);
    }
  }
  
  pageData.ui_state.content = elements;
  return pageData;
}

function extractElementData(element) {
  const tagName = element.tagName.toLowerCase();
  const text = element.textContent?.trim();
  
  // Skip if no meaningful content
  if (!text || text.length < 2) {
    return null;
  }
  
  const data = {
    tag: tagName,
    text: text.substring(0, 500) // Limit text length
  };
  
  // Extract table data
  if (tagName === 'table') {
    data.type = 'table';
    data.rows = [];
    const rows = element.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim());
      if (cells.length > 0) {
        data.rows.push(cells);
      }
    });
  }
  
  // Extract link data
  if (tagName === 'a') {
    data.href = element.href;
  }
  
  // Extract input data
  if (tagName === 'input' || tagName === 'textarea') {
    data.type = element.type || 'text';
    data.value = element.value;
    data.placeholder = element.placeholder;
  }
  
  // Extract heading level
  if (tagName.match(/^h[1-6]$/)) {
    data.level = parseInt(tagName[1]);
  }
  
  return data;
}
