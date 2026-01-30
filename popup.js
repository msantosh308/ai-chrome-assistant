// Popup script - opens fullscreen chat when button is clicked

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab info
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) return;
  
  const tab = tabs[0];
  const tabUrl = tab.url;
  const tabTitle = tab.title;
  
  // Check if it's a valid page
  const isValidPage = !tabUrl.startsWith('chrome://') && 
                      !tabUrl.startsWith('chrome-extension://') && 
                      !tabUrl.startsWith('edge://') && 
                      !tabUrl.startsWith('about:');
  
  const openChatBtn = document.getElementById('open-chat-btn');
  const settingsBtn = document.getElementById('settings-btn');
  
  if (!isValidPage) {
    openChatBtn.disabled = true;
    openChatBtn.textContent = '⚠️ Please navigate to a webpage';
    openChatBtn.style.opacity = '0.6';
    openChatBtn.style.cursor = 'not-allowed';
  }
  
  // Open chat button handler
  openChatBtn.addEventListener('click', async () => {
    if (!isValidPage) return;
    
    try {
      // Extract page context
      let pageContext = null;
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            function extractSemanticJSON() {
              const data = {
                title: document.title,
                url: window.location.href,
                tables: [],
                headings: [],
                text: []
              };
              
              // Extract tables
              document.querySelectorAll('table').forEach((table, idx) => {
                const rows = [];
                table.querySelectorAll('tr').forEach(tr => {
                  const cells = [];
                  tr.querySelectorAll('td, th').forEach(cell => {
                    cells.push(cell.textContent.trim());
                  });
                  if (cells.length > 0) rows.push(cells);
                });
                if (rows.length > 0) {
                  data.tables.push({
                    index: idx,
                    headers: rows[0] || [],
                    rows: rows.slice(1)
                  });
                }
              });
              
              // Extract headings
              document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
                data.headings.push({
                  level: parseInt(h.tagName.substring(1)),
                  text: h.textContent.trim()
                });
              });
              
              // Extract visible text (first 5000 chars)
              const bodyText = document.body.innerText || document.body.textContent || '';
              data.text = bodyText.substring(0, 5000);
              
              return data;
            }
            return extractSemanticJSON();
          }
        });
        
        pageContext = results[0]?.result || null;
      } catch (error) {
        console.error('Error extracting context:', error);
        pageContext = {
          title: tabTitle,
          url: tabUrl,
          tables: [],
          headings: [],
          text: []
        };
      }
      
      // Get chat history for this page
      let chatHistory = [];
      try {
        const url = new URL(tabUrl);
        const historyKey = `chatHistory_${url.origin}${url.pathname}`;
        const result = await chrome.storage.local.get([historyKey]);
        chatHistory = result[historyKey] || [];
      } catch (e) {
        console.error('Error getting chat history:', e);
      }
      
      // Prepare context data
      const contextData = {
        pageTitle: tabTitle || 'Unknown',
        pageUrl: tabUrl,
        context: pageContext || {
          title: tabTitle,
          url: tabUrl,
          tables: [],
          headings: [],
          text: []
        },
        chatHistory: chatHistory
      };
      
      // Store context in chrome.storage.local
      const storageKey = 'fullscreenChatContext_' + Date.now();
      await chrome.storage.local.set({
        [storageKey]: contextData
      });
      
      // Open fullscreen chat with storage key in URL
      const fullscreenUrl = chrome.runtime.getURL('chat-fullscreen.html') + '?key=' + storageKey;
      chrome.tabs.create({ url: fullscreenUrl });
      
      // Close popup
      window.close();
    } catch (error) {
      console.error('Error opening chat:', error);
      alert('Error opening chat. Please try again.');
    }
  });
  
  // Settings button handler
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});
