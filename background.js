// Background service worker for Chrome extension

// Vendor-specific endpoint configurations
const VENDOR_ENDPOINTS = {
  litellm: (baseUrl) => {
    const url = baseUrl.replace(/\/$/, '');
    return url + '/chat/completions';
  },
  openai: (baseUrl) => {
    const url = baseUrl.replace(/\/$/, '');
    return url + '/chat/completions';
  },
  gemini: (baseUrl, model) => {
    const url = baseUrl.replace(/\/$/, '');
    return `${url}/models/${model}:generateContent`;
  },
  claude: (baseUrl) => {
    const url = baseUrl.replace(/\/$/, '');
    return url + '/messages';
  },
  custom: (baseUrl) => {
    // For custom, assume it's already a full endpoint or append /chat/completions
    if (baseUrl.includes('/chat/completions') || baseUrl.includes('/messages') || baseUrl.includes('/generateContent')) {
      return baseUrl;
    }
    const url = baseUrl.replace(/\/$/, '');
    return url + '/chat/completions';
  }
};

// Normalize model name based on vendor
// Note: We don't automatically add prefixes - users should specify the exact model name
// their endpoint expects (e.g., "claude-3-sonnet" or "anthropic/claude-3-sonnet")
function normalizeModelName(model, vendor, endpoint) {
  if (!model) return model;
  
  // For direct Anthropic API (vendor === 'claude'), use model as-is
  // For other vendors, also use model as-is - let users specify the exact format
  // their endpoint expects
  
  // Only normalize if vendor is explicitly 'claude' and we're calling Anthropic API directly
  if (vendor === 'claude' && endpoint.includes('api.anthropic.com')) {
    // Anthropic API uses model names without prefix
    // Remove prefix if present
    if (model.startsWith('anthropic/')) {
      return model.substring(11); // Remove 'anthropic/' prefix
    }
    return model;
  }
  
  // For all other cases (LiteLLM, OpenAI-compatible, custom), use model exactly as user specified
  // This allows users to specify "claude-3-sonnet" or "anthropic/claude-3-sonnet" 
  // depending on what their endpoint expects
  return model;
}

// Handle extension icon click - open inline chat on the page
chrome.action.onClicked.addListener(async (tab) => {
  // Check if tab is valid
  if (!tab || !tab.id || !tab.url) {
    return;
  }
  
  const url = tab.url;
  
  // Don't open on chrome:// or extension pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || 
      url.startsWith('edge://') || url.startsWith('about:')) {
    return;
  }
  
  try {
    // Send message to content script to open/toggle chat
    chrome.tabs.sendMessage(tab.id, { action: 'openChat' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be loaded, try to inject it
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          if (!chrome.runtime.lastError) {
            // Wait a bit for script to load, then send message
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: 'openChat' });
            }, 200);
          }
        });
      }
    });
  } catch (error) {
    console.error('Error opening chat:', error);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chrome Extension installed');
  
  // Set default settings with generic defaults (user can override)
  chrome.storage.sync.set({
    llmSettings: {
      vendor: 'openai',
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2000
    },
    promptSettings: {
      systemPrompt: 'You are a web data assistant.\nYou receive:\n- user intent\n- structured page data (tables)\n\nDecide:\n- explanation\n- visualization\n- transformation\n\nFor visualizations:\n- always return Vega-Lite JSON\n- always include a summary/description of the chart\n- never return prose only\n\nRespond in JSON format:\n- For explanations: {"type": "markdown", "content": "your explanation here"}\n- For visualizations: {"type": "vega-lite", "spec": {...}, "summary": "brief description of what the chart shows and key insights"}\n\nThe summary should explain what the chart visualizes, highlight key trends or patterns, and provide context for the data shown.',
      userPromptTemplate: 'User question: {question}\n\nPage context:\n{context}'
    },
    vegaSettings: {
      vegaUrl: 'https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js',
      vegaLiteUrl: 'https://cdn.jsdelivr.net/npm/vega-lite@5/build/vega-lite.min.js',
      vegaEmbedUrl: 'https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js'
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['llmSettings', 'promptSettings'], (result) => {
      sendResponse({
        llmSettings: result.llmSettings || {},
        promptSettings: result.promptSettings || {}
      });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'callLLM') {
    handleLLMCall(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'generateSuggestions') {
    generateSuggestions(request.data)
      .then(suggestions => sendResponse({ success: true, suggestions: suggestions }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'injectVegaLite') {
    // Inject Vega-Lite libraries into page context (bypasses CSP)
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      injectVegaLiteIntoPage(tabId, request.containerId, request.spec)
        .then(() => sendResponse({ success: true }))
        .catch(error => {
          console.error('Vega-Lite injection error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    } else {
      console.error('No tab ID available for Vega-Lite injection');
      sendResponse({ success: false, error: 'No tab ID available' });
    }
  }
  
  if (request.action === 'getCurrentTab') {
    // Return current tab info (for debugging)
    sendResponse({ tabId: sender.tab ? sender.tab.id : null });
    return true;
  }
  
  if (request.action === 'getVegaSettings') {
    // Get Vega settings
    chrome.storage.sync.get(['vegaSettings'], (result) => {
      sendResponse({ vegaSettings: result.vegaSettings || null });
    });
    return true;
  }
  
  if (request.action === 'openSettings') {
    // Open settings page from background script (more reliable)
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'getChartSVG') {
    // Get SVG from chart container in page context
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && request.containerId) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        args: [request.containerId],
        func: function(containerId) {
          const container = document.getElementById(containerId);
          if (container) {
            const svg = container.querySelector('svg');
            if (svg) {
              return new XMLSerializer().serializeToString(svg);
            }
          }
          return null;
        }
      }).then((results) => {
        if (results && results[0] && results[0].result) {
          sendResponse({ svgString: results[0].result });
        } else {
          sendResponse({ svgString: null });
        }
      }).catch((error) => {
        console.error('Error getting chart SVG:', error);
        sendResponse({ svgString: null, error: error.message });
      });
      return true;
    } else {
      sendResponse({ svgString: null, error: 'No tab ID or container ID' });
      return true;
    }
  }
});

async function handleLLMCall(data) {
  // Get settings
  const settings = await chrome.storage.sync.get(['llmSettings', 'promptSettings']);
  const llmSettings = settings.llmSettings || {};
  const promptSettings = settings.promptSettings || {};
  
  if (!llmSettings.apiKey) {
    throw new Error('API key not configured. Please configure it in settings.');
  }
  
  const vendor = llmSettings.vendor || 'litellm';
  
  // Build the prompt
  const systemPrompt = promptSettings.systemPrompt || 'You are a web data assistant.\nYou receive:\n- user intent\n- structured page data (tables)\n\nDecide:\n- explanation\n- visualization\n- transformation\n\nFor visualizations:\n- always return Vega-Lite JSON\n- always include a summary/description of the chart\n- never return prose only\n\nIMPORTANT: You MUST respond with valid JSON only. Use one of these formats:\n- For explanations: {"type": "markdown", "content": "your explanation here"}\n- For visualizations: {"type": "vega-lite", "spec": {your vega-lite specification}, "summary": "brief description of what the chart shows and key insights"}\n\nThe summary should explain what the chart visualizes, highlight key trends or patterns, and provide context for the data shown.\n\nNever return an empty object {}. Always include type and content/spec fields.';
  const userPrompt = (promptSettings.userPromptTemplate || 'User question: {question}\n\nPage context:\n{context}')
    .replace('{question}', data.question)
    .replace('{context}', JSON.stringify(data.context, null, 2));
  
  // Get vendor-specific endpoint
  const baseEndpoint = llmSettings.apiEndpoint.trim();
  const endpointFunc = VENDOR_ENDPOINTS[vendor] || VENDOR_ENDPOINTS.custom;
  const endpoint = endpointFunc(baseEndpoint, llmSettings.model);
  
  // Normalize model name (add anthropic/ prefix for Claude models in LiteLLM)
  const normalizedModel = normalizeModelName(llmSettings.model, vendor, baseEndpoint);
  
  // Prepare request based on vendor
  let requestBody;
  let headers = {
    'Content-Type': 'application/json'
  };
  
  if (vendor === 'gemini') {
    // Gemini uses a different request format
    requestBody = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
        }]
      }],
      generationConfig: {
        temperature: llmSettings.temperature || 0.7,
        maxOutputTokens: llmSettings.maxTokens || 2000
      }
    };
    // Gemini uses API key as query parameter
    // Append API key to endpoint URL
    const separator = endpoint.includes('?') ? '&' : '?';
    endpoint = `${endpoint}${separator}key=${encodeURIComponent(llmSettings.apiKey)}`;
  } else if (vendor === 'claude') {
    // Claude uses a different request format
    requestBody = {
      model: llmSettings.model || 'claude-3-sonnet-20240229',
      max_tokens: llmSettings.maxTokens || 2000,
      temperature: llmSettings.temperature || 0.7,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    };
    headers['x-api-key'] = llmSettings.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    // OpenAI-compatible format (LiteLLM, OpenAI, Custom)
    requestBody = {
      model: normalizedModel || llmSettings.model || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: llmSettings.temperature || 0.7,
      max_tokens: llmSettings.maxTokens || 2000
    };
    headers['Authorization'] = `Bearer ${llmSettings.apiKey}`;
  }
  
  // Call LLM API
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
      // Include more details if available
      if (errorData.detail) {
        errorMessage += ` - ${errorData.detail}`;
      }
    } catch (e) {
      const errorText = await response.text().catch(() => '');
      if (errorText) {
        errorMessage += ` - ${errorText.substring(0, 200)}`;
      }
    }
    throw new Error(errorMessage);
  }
  
  const result = await response.json();
  let content;
  
  // Extract content based on vendor response format
  if (vendor === 'gemini') {
    content = result.candidates?.[0]?.content?.parts?.[0]?.text;
  } else if (vendor === 'claude') {
    content = result.content?.[0]?.text;
  } else {
    // OpenAI-compatible format
    content = result.choices?.[0]?.message?.content;
  }
  
  if (!content) {
    console.error('LLM Response:', JSON.stringify(result, null, 2));
    throw new Error('No response from LLM. Response: ' + JSON.stringify(result));
  }
  
  // Parse JSON response
  try {
    const parsed = JSON.parse(content);
    
    // Check if parsed result is empty or invalid
    if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
      console.error('Empty or invalid JSON response:', content);
      // Return the raw content as markdown if parsing resulted in empty object
      return {
        type: 'markdown',
        content: 'The AI returned an empty response. Raw content: ' + content
      };
    }
    
    // Validate that we have either type: markdown or type: vega-lite
    if (!parsed.type || (parsed.type !== 'markdown' && parsed.type !== 'vega-lite')) {
      console.warn('Unexpected response type:', parsed);
      // If it has content, treat as markdown
      if (parsed.content) {
        return {
          type: 'markdown',
          content: parsed.content
        };
      }
      // Otherwise, return as markdown with the full response
      return {
        type: 'markdown',
        content: 'Unexpected response format:\n\n' + JSON.stringify(parsed, null, 2)
      };
    }
    
    return parsed;
  } catch (e) {
    // If not JSON, wrap as markdown
    console.log('Response is not JSON, treating as markdown:', content.substring(0, 100));
    return {
      type: 'markdown',
      content: content
    };
  }
}

async function generateSuggestions(data) {
  // Get settings
  const settings = await chrome.storage.sync.get(['llmSettings', 'promptSettings']);
  const llmSettings = settings.llmSettings || {};
  
  if (!llmSettings.apiKey) {
    throw new Error('API key not configured. Please configure it in settings.');
  }
  
  const vendor = llmSettings.vendor || 'litellm';
  
  // Build a specialized prompt for generating suggestions
  // If conversation history exists, include it to make suggestions context-aware
  let conversationContext = '';
  if (data.conversationHistory && data.conversationHistory.length > 0) {
    const recentMessages = data.conversationHistory.slice(-4); // Last 4 messages (2 exchanges)
    conversationContext = '\n\nRecent conversation:\n' + recentMessages.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const content = msg.type === 'vega-lite' 
        ? (msg.summary || 'Created a visualization/chart')
        : (msg.content || '').substring(0, 200); // Limit content length
      return `${role}: ${content}`;
    }).join('\n');
  }
  
  const systemPrompt = 'You are a helpful assistant that generates contextual question suggestions based on web page content and conversation history. Analyze the page context and recent conversation to generate exactly 3 relevant, concise follow-up questions that users might want to ask. These should build on the conversation or explore related aspects. Return ONLY a JSON array of exactly 3 strings, no other text. Example format: ["Question 1?", "Question 2?", "Question 3?"]';
  
  const userPrompt = `Based on the following page content${conversationContext ? ' and recent conversation' : ''}, generate exactly 3 relevant, concise follow-up questions that would help users continue exploring or understand more about this page:\n\nPage context:\n${JSON.stringify(data.context, null, 2)}${conversationContext}\n\nReturn only a JSON array of exactly 3 question strings.`;
  
  // Get vendor-specific endpoint
  const baseEndpoint = llmSettings.apiEndpoint.trim();
  const endpointFunc = VENDOR_ENDPOINTS[vendor] || VENDOR_ENDPOINTS.custom;
  const endpoint = endpointFunc(baseEndpoint, llmSettings.model);
  
  // Normalize model name (add anthropic/ prefix for Claude models in LiteLLM)
  const normalizedModel = normalizeModelName(llmSettings.model, vendor, baseEndpoint);
  
  // Prepare request based on vendor
  let requestBody;
  let headers = {
    'Content-Type': 'application/json'
  };
  
  if (vendor === 'gemini') {
    requestBody = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 500
      }
    };
    const separator = endpoint.includes('?') ? '&' : '?';
    endpoint = `${endpoint}${separator}key=${encodeURIComponent(llmSettings.apiKey)}`;
  } else if (vendor === 'claude') {
    requestBody = {
      model: llmSettings.model || 'claude-3-sonnet-20240229',
      max_tokens: 500,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    };
    headers['x-api-key'] = llmSettings.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    requestBody = {
      model: normalizedModel || llmSettings.model || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 500
    };
    headers['Authorization'] = `Bearer ${llmSettings.apiKey}`;
  }
  
  // Call LLM API
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch (e) {
      const errorText = await response.text().catch(() => '');
      if (errorText) {
        errorMessage += ` - ${errorText.substring(0, 200)}`;
      }
    }
    throw new Error(errorMessage);
  }
  
  const result = await response.json();
  let content;
  
  // Extract content based on vendor response format
  if (vendor === 'gemini') {
    content = result.candidates?.[0]?.content?.parts?.[0]?.text;
  } else if (vendor === 'claude') {
    content = result.content?.[0]?.text;
  } else {
    content = result.choices?.[0]?.message?.content;
  }
  
  if (!content) {
    throw new Error('No response from LLM for suggestions');
  }
  
  // Parse JSON array response
  try {
    // Try to extract JSON array from the response (might have markdown code blocks)
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n').trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Ensure it's an array
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    
    // Take first 3 suggestions, pad if needed
    const suggestions = parsed.slice(0, 3);
    while (suggestions.length < 3) {
      suggestions.push('Ask a question about this page');
    }
    
    return suggestions;
  } catch (e) {
    console.error('Error parsing suggestions:', e, 'Content:', content);
    // Return default suggestions if parsing fails
    return [
      'Explain the main content on this page',
      'What data or information is displayed here?',
      'Can you summarize this page?'
    ];
  }
}

async function injectVegaLiteIntoPage(tabId, containerId, spec) {
  // Get Vega settings
  const settings = await chrome.storage.sync.get(['vegaSettings']);
  const vegaSettings = settings.vegaSettings || {};
  
  const vegaUrl = vegaSettings.vegaUrl || 'https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js';
  const vegaLiteUrl = vegaSettings.vegaLiteUrl || 'https://cdn.jsdelivr.net/npm/vega-lite@5/build/vega-lite.min.js';
  const vegaEmbedUrl = vegaSettings.vegaEmbedUrl || 'https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js';
  
  // Inject a script into the page context that loads Vega-Lite and renders the chart
  // Content scripts share the page DOM, so the container should be accessible
  const specStr = JSON.stringify(spec);
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN', // Inject into page context (bypasses CSP restrictions)
      args: [containerId, spec, vegaUrl, vegaLiteUrl, vegaEmbedUrl],
      func: function(containerId, spec, vegaUrl, vegaLiteUrl, vegaEmbedUrl) {
        console.log('Vega-Lite injection function called with containerId:', containerId);
        
        function findContainer() {
          // Try multiple ways to find the container
          let container = document.getElementById(containerId);
          
          if (!container) {
            // Try to find by data attribute (most recent)
            const containersWithSpec = document.querySelectorAll('[data-vega-spec]');
            // Get the last one (most recently added)
            if (containersWithSpec.length > 0) {
              container = containersWithSpec[containersWithSpec.length - 1];
              if (!container.id) {
                container.id = containerId;
              }
            }
          }
          
          if (!container) {
            // Try to find any vega-lite-container without ID
            const containers = document.querySelectorAll('.vega-lite-container');
            for (let i = containers.length - 1; i >= 0; i--) {
              const c = containers[i];
              if (!c.id || c.id === '' || c.id.startsWith('vega-container-')) {
                c.id = containerId;
                container = c;
                break;
              }
            }
          }
          
          // Verify container is in DOM
          if (container && !container.parentNode) {
            console.warn('Container found but not in DOM');
            return null;
          }
          
          return container;
        }
        
        // Try to find container with retries (in case DOM isn't ready)
        let container = findContainer();
        let retries = 0;
        const maxRetries = 10;
        
        function waitForContainer() {
          container = findContainer();
          
          if (container) {
            console.log('Container found successfully:', container.id);
            proceedWithRendering();
          } else if (retries < maxRetries) {
            retries++;
            console.log('Container not found, retrying... (' + retries + '/' + maxRetries + ')');
            setTimeout(waitForContainer, 200);
          } else {
            console.error('Vega-Lite container not found after ' + maxRetries + ' retries:', containerId);
            console.error('Available containers:', Array.from(document.querySelectorAll('.vega-lite-container, [data-vega-spec]')).map(c => ({ id: c.id, className: c.className })));
            // Try to send error message back to content script
            try {
              window.postMessage({
                type: 'vegaError',
                containerId: containerId,
                error: 'Container not found after retries'
              }, '*');
            } catch (e) {
              console.error('Could not send error message:', e);
            }
          }
        }
        
        function proceedWithRendering() {
          console.log('Proceeding with rendering. Container:', container, 'Container ID:', containerId, 'Container in DOM:', container.parentNode !== null);
          
          // Ensure container is visible
          container.style.display = 'block';
          container.style.visibility = 'visible';
          container.style.minHeight = '200px';
          container.style.width = '100%';
          
          // Load libraries sequentially with timeout
          function loadScript(src, timeout) {
          return new Promise(function(resolve, reject) {
            console.log('Loading script:', src);
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            
            const timeoutId = setTimeout(function() {
              reject(new Error('Timeout loading ' + src));
            }, timeout || 30000);
            
            script.onload = function() {
              clearTimeout(timeoutId);
              console.log('Script loaded successfully:', src);
              resolve();
            };
            
            script.onerror = function(event) {
              clearTimeout(timeoutId);
              console.error('Script load error:', src, event);
              reject(new Error('Failed to load ' + src));
            };
            
            document.head.appendChild(script);
          });
        }
        
        function loadLibraries() {
          console.log('Loading Vega-Lite libraries for container:', containerId);
          console.log('Using URLs:', { vegaUrl, vegaLiteUrl, vegaEmbedUrl });
          
          loadScript(vegaUrl, 30000)
            .then(function() {
              console.log('Vega loaded successfully');
              // Check if vega is available (might be vega or window.vega)
              const vegaAvailable = typeof window.vega !== 'undefined' || typeof vega !== 'undefined';
              console.log('Vega available:', vegaAvailable, 'window.vega:', typeof window.vega, 'vega:', typeof vega);
              if (!vegaAvailable) {
                // Wait a bit more, sometimes libraries take time to initialize
                return new Promise(function(resolve) {
                  setTimeout(function() {
                    const stillAvailable = typeof window.vega !== 'undefined' || typeof vega !== 'undefined';
                    if (!stillAvailable) {
                      throw new Error('Vega library loaded but not available after wait');
                    }
                    resolve();
                  }, 500);
                });
              }
              return Promise.resolve();
            })
            .then(function() {
              return loadScript(vegaLiteUrl, 30000);
            })
            .then(function() {
              console.log('Vega-Lite loaded successfully');
              // Vega-Lite might expose as vl or window.vl
              const vlAvailable = typeof window.vl !== 'undefined' || typeof vl !== 'undefined';
              console.log('Vega-Lite available:', vlAvailable, 'window.vl:', typeof window.vl, 'vl:', typeof vl);
              if (!vlAvailable) {
                // Wait a bit more for initialization
                return new Promise(function(resolve) {
                  setTimeout(function() {
                    const stillAvailable = typeof window.vl !== 'undefined' || typeof vl !== 'undefined';
                    if (!stillAvailable) {
                      console.warn('Vega-Lite loaded but window.vl not immediately available, continuing anyway...');
                    }
                    resolve();
                  }, 500);
                });
              }
              return Promise.resolve();
            })
            .then(function() {
              return loadScript(vegaEmbedUrl, 30000);
            })
            .then(function() {
              console.log('Vega-Embed loaded successfully');
              // Check if vegaEmbed is available
              const embedAvailable = typeof window.vegaEmbed !== 'undefined' || typeof vegaEmbed !== 'undefined';
              console.log('Vega-Embed available:', embedAvailable, 'window.vegaEmbed:', typeof window.vegaEmbed);
              if (!embedAvailable) {
                // Wait a bit more
                return new Promise(function(resolve) {
                  setTimeout(function() {
                    const stillAvailable = typeof window.vegaEmbed !== 'undefined' || typeof vegaEmbed !== 'undefined';
                    if (!stillAvailable) {
                      throw new Error('Vega-Embed library loaded but not available after wait');
                    }
                    resolve();
                  }, 500);
                });
              }
              // Wait a bit for everything to initialize
              setTimeout(function() {
                renderChart();
              }, 300);
            })
            .catch(function(error) {
              console.error('Failed to load Vega-Lite libraries:', error);
              console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                vegaAvailable: typeof window.vega !== 'undefined',
                vlAvailable: typeof window.vl !== 'undefined',
                vegaEmbedAvailable: typeof window.vegaEmbed !== 'undefined'
              });
              container.innerHTML = '<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">' +
                '<strong>Error loading chart library</strong><br>' +
                error.message + '<br><br>' +
                '<small>Please check your internet connection and browser console for details.</small>' +
                '</div>';
            });
        }
        
          function renderChart() {
            try {
              console.log('Rendering chart...', 'Container:', container, 'Container ID:', containerId, 'Spec:', spec);
              
              // Verify container is still accessible
              if (!container || !container.parentNode) {
                console.error('Container not accessible:', { container: container, parentNode: container?.parentNode });
                const errorMsg = 'Error: Container not in DOM.';
                container.innerHTML = '<div style="color: red; padding: 10px;">' + errorMsg + '</div>';
                // Try to send error back
                try {
                  window.postMessage({
                    type: 'vegaError',
                    containerId: containerId,
                    error: errorMsg
                  }, '*');
                } catch (e) {}
                return;
              }
              
              // Try to get vegaEmbed from window or global scope
              const vegaEmbedFunc = window.vegaEmbed || (typeof vegaEmbed !== 'undefined' ? vegaEmbed : null);
              
              if (!vegaEmbedFunc) {
                const availableVegaKeys = Object.keys(window).filter(k => k.toLowerCase().includes('vega'));
                console.error('vegaEmbed not available. Available globals:', availableVegaKeys);
                const errorMsg = 'Vega-Embed library not available after loading.';
                container.innerHTML = '<div style="color: red; padding: 10px;"><strong>Error:</strong> ' + errorMsg + '<br>Available: ' + availableVegaKeys.join(', ') + '</div>';
                // Try to send error back
                try {
                  window.postMessage({
                    type: 'vegaError',
                    containerId: containerId,
                    error: errorMsg
                  }, '*');
                } catch (e) {}
                return;
              }
              
              console.log('Calling vegaEmbed with spec:', JSON.stringify(spec).substring(0, 200));
              
              // Clear loading message
              container.innerHTML = '';
              
              vegaEmbedFunc(container, spec, {
                actions: false,
                renderer: 'svg',
                theme: 'default'
              }).then(function(result) {
                console.log('Chart rendered successfully', result);
                // Verify SVG was created
                const svg = container.querySelector('svg');
                if (!svg) {
                  console.warn('vegaEmbed returned success but no SVG found in container');
                  container.innerHTML = '<div style="color: orange; padding: 10px;">Chart rendered but SVG not found. Please check browser console.</div>';
                }
                // Notify content script that chart is rendered
                try {
                  window.postMessage({
                    type: 'vegaChartRendered',
                    containerId: containerId
                  }, '*');
                } catch (e) {
                  console.warn('Could not send render success message:', e);
                }
              }).catch(function(err) {
                console.error('Vega-Lite render error:', err);
                console.error('Error details:', {
                  message: err.message,
                  stack: err.stack,
                  spec: spec
                });
                const errorMsg = (err.message || String(err)) + '. Check browser console (F12) for details.';
                container.innerHTML = '<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;"><strong>Error rendering chart:</strong><br>' + 
                  errorMsg + '</div>';
                // Try to send error back
                try {
                  window.postMessage({
                    type: 'vegaError',
                    containerId: containerId,
                    error: err.message || String(err)
                  }, '*');
                } catch (e) {}
              });
            } catch (err) {
              console.error('Vega-Lite error:', err);
              console.error('Error stack:', err.stack);
              const errorMsg = (err.message || String(err)) + '. Check browser console (F12) for details.';
              container.innerHTML = '<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;"><strong>Error:</strong><br>' + 
                errorMsg + '</div>';
              // Try to send error back
              try {
                window.postMessage({
                  type: 'vegaError',
                  containerId: containerId,
                  error: err.message || String(err)
                }, '*');
              } catch (e) {}
            }
          }
          
          // Check if libraries are already loaded (check multiple possible global names)
          const vegaAvailable = typeof window.vega !== 'undefined' || typeof vega !== 'undefined';
          const vlAvailable = typeof window.vl !== 'undefined' || typeof vl !== 'undefined';
          const embedAvailable = typeof window.vegaEmbed !== 'undefined' || typeof vegaEmbed !== 'undefined';
          
          console.log('Checking for existing libraries:', {
            vega: vegaAvailable,
            vl: vlAvailable,
            vegaEmbed: embedAvailable
          });
          
          if (embedAvailable && vegaAvailable) {
            // Vega-Lite (vl) might not be needed if vega-embed handles it
            console.log('Libraries already loaded, rendering chart');
            renderChart();
            return;
          }
          
          loadLibraries();
        }
        
        // Start the process
        waitForContainer();
      }
    });
  } catch (error) {
    console.error('Error injecting Vega-Lite script:', error);
    // Try to update the container directly via content script message
    chrome.tabs.sendMessage(tabId, {
      action: 'vegaError',
      containerId: containerId,
      error: error.message
    }).catch(function() {
      // Ignore if content script not available
    });
    throw error;
  }
}
