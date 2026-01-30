# Low Level Design (LLD) Document
## AI Assistant Chrome Extension

**Version:** 1.0.0  
**Last Updated:** January 29, 2026  
**Author:** Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Storage Architecture](#storage-architecture)
6. [API Contracts](#api-contracts)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)
9. [Performance Optimization](#performance-optimization)
10. [Testing Strategy](#testing-strategy)

---

## 1. Overview

### 1.1 Purpose
This document provides detailed low-level design specifications for the AI Assistant Chrome Extension, including component interactions, data structures, algorithms, and implementation details.

### 1.2 Scope
- Component-level architecture
- Data structures and formats
- Inter-component communication
- Storage mechanisms
- Error handling strategies
- Security implementations

### 1.3 Technology Stack
- **Manifest Version**: 3
- **JavaScript**: ES6+
- **Storage**: Chrome Storage API (sync & local)
- **Visualization**: Vega-Lite 5.x
- **Styling**: CSS3 with FactSet color theme (#00AEEF)

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Web Page (Host)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Content Script (content.js)               │  │
│  │  ┌──────────────┐  ┌──────────────┐             │  │
│  │  │  DOM Extractor│  │  Chat UI     │             │  │
│  │  │  (Semantic    │  │  (Inline)    │             │  │
│  │  │   JSON)      │  │              │             │  │
│  │  └──────────────┘  └──────────────┘             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↕ chrome.runtime.sendMessage
┌─────────────────────────────────────────────────────────┐
│         Background Service Worker (background.js)       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  LLM Handler │  │ Vega Injector│  │ Settings     │ │
│  │              │  │              │  │ Manager     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────┐
│              External LLM Providers                     │
│  (OpenAI / Anthropic / Google / LiteLLM)              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | File | Responsibility |
|-----------|------|----------------|
| Content Script | `content.js` | DOM extraction, chat UI injection, message rendering |
| Background Worker | `background.js` | LLM API calls, Vega-Lite injection, settings management |
| Settings Page | `settings.html/js` | User configuration, vendor selection |
| Popup | `popup.html/js` | Extension launcher |
| Styles | `content.css` | Chat UI styling (FactSet theme) |

---

## 3. Component Details

### 3.1 Content Script (`content.js`)

#### 3.1.1 Initialization
```javascript
// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatUI);
} else {
  initChatUI();
}
```

#### 3.1.2 Key Functions

**`initChatUI()`**
- Purpose: Initialize chat UI on page
- Creates floating chat button
- Sets up message listeners
- Loads chat history for current page

**`extractSemanticJSON()`**
- Purpose: Convert DOM to structured JSON
- Algorithm:
  1. Create TreeWalker for visible elements
  2. Filter hidden/script/style elements
  3. Extract tables, headings, text
  4. Normalize table structures
  5. Return semantic JSON

**`loadChatUI()`**
- Purpose: Inject chat interface HTML
- Creates resizable container
- Sets up event listeners
- Loads saved dimensions

**`handleSendMessage()`**
- Purpose: Process user message
- Flow:
  1. Extract page context
  2. Send to background worker
  3. Display loading indicator
  4. Render response

**`renderResponse(data)`**
- Purpose: Render LLM response
- Handles:
  - Markdown responses
  - Vega-Lite charts
  - Error messages

**`renderMarkdown(content)`**
- Purpose: Convert markdown to HTML
- Supports:
  - Headers (#, ##, ###)
  - Lists (bullets, numbered)
  - Code blocks (```)
  - Inline code (`)
  - Bold (**text**)
  - Italic (*text*)
  - Links [text](url)

**`renderVegaLite(container, spec)`**
- Purpose: Render Vega-Lite chart
- Flow:
  1. Show loading indicator
  2. Request background worker to inject libraries
  3. Wait for chart rendering
  4. Handle errors

**`copyMessage(messageId)`**
- Purpose: Copy message text to clipboard
- Extracts text from DOM
- Handles chart summaries

**`copyChartAsImage(messageId)`**
- Purpose: Copy chart as PNG image
- Flow:
  1. Get SVG from chart container
  2. Convert SVG to PNG via canvas
  3. Copy to clipboard

#### 3.1.3 Data Structures

**Chat Message:**
```javascript
{
  role: 'user' | 'assistant',
  content: string,
  timestamp: number,
  type?: 'markdown' | 'vega-lite',
  spec?: object,  // Vega-Lite spec
  summary?: string  // Chart summary
}
```

**Semantic JSON:**
```javascript
{
  page: {
    title: string,
    url: string
  },
  ui_state: {
    content: Array<{
      type: 'heading' | 'text' | 'table',
      level?: number,  // for headings
      text?: string,
      table?: {
        headers: string[],
        rows: string[][]
      }
    }>
  }
}
```

### 3.2 Background Service Worker (`background.js`)

#### 3.2.1 Initialization
```javascript
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({...});
});
```

#### 3.2.2 Key Functions

**`handleLLMCall(data)`**
- Purpose: Make LLM API call
- Parameters:
  - `data.question`: User question
  - `data.context`: Page semantic JSON
- Flow:
  1. Get settings from storage
  2. Build vendor-specific request
  3. Format endpoint based on vendor
  4. Send HTTP request
  5. Parse response
  6. Return structured data

**`injectVegaLiteIntoPage(tabId, containerId, spec)`**
- Purpose: Inject Vega-Lite libraries into page context
- Method: `chrome.scripting.executeScript` with `world: 'MAIN'`
- Flow:
  1. Get Vega settings
  2. Inject script into page MAIN world
  3. Script loads libraries sequentially
  4. Renders chart using vegaEmbed
  5. Handles errors

**`getChartSVG(containerId)`**
- Purpose: Extract SVG from chart container
- Method: Inject script into MAIN world
- Returns: Serialized SVG string

#### 3.2.3 Vendor-Specific Handling

**OpenAI/LiteLLM:**
```javascript
{
  model: string,
  messages: [
    { role: 'system', content: string },
    { role: 'user', content: string }
  ],
  temperature: number,
  max_tokens: number
}
```

**Anthropic Claude:**
```javascript
{
  model: string,
  max_tokens: number,
  temperature: number,
  system: string,
  messages: [
    { role: 'user', content: string }
  ]
}
```

**Google Gemini:**
```javascript
{
  contents: [{
    parts: [{ text: string }]
  }],
  generationConfig: {
    temperature: number,
    maxOutputTokens: number
  }
}
```

### 3.3 Settings Page (`settings.js`)

#### 3.3.1 Vendor Configuration Object
```javascript
VENDOR_CONFIGS = {
  vendor_name: {
    name: string,
    endpoint: string,
    endpointHelp: string,
    apiKeyHelp: string,
    models: Array<{value: string, label: string}>,
    defaultModel: string,
    defaultApiKey: string
  }
}
```

#### 3.3.2 Key Functions

**`loadSettings()`**
- Loads settings from `chrome.storage.sync`
- Populates form fields
- Handles vendor-specific defaults

**`saveSettings()`**
- Validates input
- Saves to `chrome.storage.sync`
- Shows success/error feedback

**`onVendorChange()`**
- Updates endpoint placeholder
- Updates model dropdown
- Shows/hides custom model input
- Updates help text

**`resetSettings()`**
- Resets to default values
- Clears API credentials

### 3.4 Storage Architecture

#### 3.4.1 Chrome Storage Sync
**Purpose**: Settings that sync across devices

**Keys:**
- `llmSettings`: LLM configuration
  ```javascript
  {
    vendor: string,
    apiEndpoint: string,
    apiKey: string,
    model: string,
    temperature: number,
    maxTokens: number
  }
  ```
- `promptSettings`: Prompt templates
  ```javascript
  {
    systemPrompt: string,
    userPromptTemplate: string
  }
  ```
- `vegaSettings`: Vega-Lite CDN URLs
  ```javascript
  {
    vegaUrl: string,
    vegaLiteUrl: string,
    vegaEmbedUrl: string
  }
  ```

#### 3.4.2 Chrome Storage Local
**Purpose**: Page-specific data (not synced)

**Keys:**
- `chatHistory_${origin}${pathname}`: Per-page chat history
  ```javascript
  Array<{
    role: 'user' | 'assistant',
    content: string,
    timestamp: number,
    type?: 'markdown' | 'vega-lite',
    spec?: object,
    summary?: string
  }>
  ```
- `fullscreenChatContext_${timestamp}`: Temporary context storage
- `aiChatDimensions`: Saved chat window dimensions

---

## 4. Data Flow

### 4.1 User Sends Message Flow

```
1. User types message in chat input
   ↓
2. content.js: handleSendMessage()
   - Extracts page context (extractSemanticJSON)
   - Adds user message to UI
   - Shows loading indicator
   ↓
3. chrome.runtime.sendMessage({action: 'callLLM', data: {...}})
   ↓
4. background.js: handleLLMCall()
   - Gets settings from storage
   - Formats request based on vendor
   - Makes HTTP request to LLM
   ↓
5. LLM Provider API
   - Processes request
   - Returns JSON response
   ↓
6. background.js: Parse response
   - Validates JSON structure
   - Returns {type, content/spec, summary}
   ↓
7. content.js: renderResponse()
   - Renders markdown or chart
   - Saves to chat history
   - Shows copy button
```

### 4.2 Chart Rendering Flow

```
1. LLM returns Vega-Lite spec
   ↓
2. content.js: renderResponse()
   - Creates container div
   - Calls renderVegaLite()
   ↓
3. content.js: renderVegaLite()
   - Shows loading message
   - Sends message to background
   ↓
4. background.js: injectVegaLiteIntoPage()
   - Uses chrome.scripting.executeScript
   - Injects into MAIN world
   ↓
5. Injected Script (in page context)
   - Loads Vega libraries from CDN
   - Finds container by ID
   - Calls vegaEmbed(container, spec)
   ↓
6. Chart Rendered
   - SVG created in container
   - Container updated with chart
```

### 4.3 Settings Update Flow

```
1. User changes settings
   ↓
2. settings.js: saveSettings()
   - Validates input
   - Formats settings object
   ↓
3. chrome.storage.sync.set({...})
   ↓
4. Settings saved
   - Available to background.js
   - Available to content.js (on next load)
   - Synced across devices (if enabled)
```

---

## 5. Storage Architecture

### 5.1 Storage Keys Structure

**Sync Storage (Settings):**
```
llmSettings: {
  vendor: 'openai' | 'claude' | 'gemini' | 'litellm' | 'custom',
  apiEndpoint: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number
}

promptSettings: {
  systemPrompt: string,
  userPromptTemplate: string
}

vegaSettings: {
  vegaUrl: string,
  vegaLiteUrl: string,
  vegaEmbedUrl: string
}
```

**Local Storage (Page Data):**
```
chatHistory_${origin}${pathname}: Message[]
aiChatDimensions: {width: number, height: number}
fullscreenChatContext_${timestamp}: ContextData (temporary)
```

### 5.2 Chat History Key Generation
```javascript
function getChatHistoryKey() {
  const url = new URL(window.location.href);
  return `chatHistory_${url.origin}${url.pathname}`;
}
```

### 5.3 Storage Operations

**Save Message:**
```javascript
chrome.storage.local.get([key], (result) => {
  const history = result[key] || [];
  history.push(message);
  chrome.storage.local.set({ [key]: history });
});
```

**Load History:**
```javascript
chrome.storage.local.get([key], (result) => {
  const history = result[key] || [];
  history.forEach(msg => restoreMessage(msg));
});
```

---

## 6. API Contracts

### 6.1 Internal Message API

**Content Script → Background:**

```javascript
// Call LLM
{
  action: 'callLLM',
  data: {
    question: string,
    context: SemanticJSON
  }
}

// Inject Vega-Lite
{
  action: 'injectVegaLite',
  containerId: string,
  spec: VegaLiteSpec
}

// Get Settings
{
  action: 'getSettings'
}

// Open Settings
{
  action: 'openSettings'
}

// Get Chart SVG
{
  action: 'getChartSVG',
  containerId: string
}
```

**Background → Content Script:**

```javascript
// Vega Error
{
  action: 'vegaError',
  containerId: string,
  error: string
}
```

**Content Script → Page Context:**

```javascript
// PostMessage for chart communication
window.postMessage({
  type: 'vegaError' | 'vegaChartRendered',
  containerId: string,
  error?: string
}, '*');
```

### 6.2 External LLM API

**Request Format (OpenAI/LiteLLM):**
```http
POST {endpoint}/chat/completions
Headers:
  Content-Type: application/json
  Authorization: Bearer {apiKey}
Body:
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

**Response Format:**
```json
{
  "choices": [{
    "message": {
      "content": "{\"type\":\"markdown\",\"content\":\"...\"}"
    }
  }]
}
```

### 6.3 Expected LLM Response Format

**Markdown Response:**
```json
{
  "type": "markdown",
  "content": "# Heading\n\nParagraph with **bold** and *italic*."
}
```

**Vega-Lite Response:**
```json
{
  "type": "vega-lite",
  "spec": {
    "data": {"values": [...]},
    "mark": "bar",
    "encoding": {...}
  },
  "summary": "This chart shows sales trends..."
}
```

---

## 7. Error Handling

### 7.1 Error Categories

**1. LLM API Errors**
- **401 Unauthorized**: Invalid API key
- **404 Not Found**: Invalid endpoint
- **429 Rate Limited**: Too many requests
- **500 Server Error**: LLM provider error
- **Network Error**: Connection failure

**2. Chart Rendering Errors**
- **Container Not Found**: DOM not ready
- **Library Load Failure**: CDN unavailable
- **Invalid Spec**: Malformed Vega-Lite spec
- **Rendering Failure**: Chart render error

**3. Storage Errors**
- **Quota Exceeded**: Storage limit reached
- **Permission Denied**: Storage access denied

### 7.2 Error Handling Strategy

**LLM Errors:**
```javascript
try {
  const response = await fetch(endpoint, {...});
  if (!response.ok) {
    // Parse error response
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }
} catch (error) {
  // Show user-friendly error
  addMessage('assistant', `**Error:** ${error.message}`);
}
```

**Chart Errors:**
```javascript
// Retry container finding
let retries = 0;
const maxRetries = 10;
function waitForContainer() {
  container = findContainer();
  if (container) {
    proceedWithRendering();
  } else if (retries < maxRetries) {
    retries++;
    setTimeout(waitForContainer, 200);
  } else {
    // Show error
    container.innerHTML = '<div>Error: Container not found</div>';
  }
}
```

**Storage Errors:**
```javascript
chrome.storage.sync.set({...}, () => {
  if (chrome.runtime.lastError) {
    showStatus('Error saving: ' + chrome.runtime.lastError.message, 'error');
  }
});
```

### 7.3 Error Recovery

- **Retry Logic**: Container finding retries up to 10 times
- **Fallback Values**: Use defaults if settings missing
- **Graceful Degradation**: Show error messages instead of crashing
- **User Feedback**: Clear error messages with actionable steps

---

## 8. Security Considerations

### 8.1 API Key Storage
- **Method**: `chrome.storage.sync` (encrypted by Chrome)
- **Access**: Only extension can access
- **Sync**: Optional (user controls Chrome sync)

### 8.2 Content Extraction
- **Scope**: Only visible DOM elements
- **Exclusion**: Scripts, styles, hidden elements
- **Sanitization**: No HTML/scripts sent to LLM

### 8.3 CSP Bypass
- **Issue**: Content scripts can't load external scripts
- **Solution**: Inject into MAIN world using `chrome.scripting.executeScript`
- **Risk**: Minimal (only loads trusted CDN libraries)

### 8.4 XSS Prevention
- **Markdown Rendering**: Escapes HTML before processing
- **Vega-Lite**: Rendered in isolated container
- **User Input**: Sanitized before sending to LLM

### 8.5 Permission Justification

| Permission | Purpose | Justification |
|------------|---------|---------------|
| `activeTab` | Access page content | Extract visible content for AI analysis |
| `storage` | Save settings/history | Store user preferences and chat history locally |
| `scripting` | Inject Vega-Lite | Load visualization libraries into page context |
| `<all_urls>` | Work on any page | Extension should work on any webpage user visits |

---

## 9. Performance Optimization

### 9.1 DOM Extraction Optimization
- **TreeWalker**: Efficient DOM traversal
- **Early Filtering**: Skip hidden elements immediately
- **Text Limiting**: First 5000 characters only
- **Lazy Loading**: Extract only when needed

### 9.2 Chart Rendering Optimization
- **Lazy Library Loading**: Load Vega-Lite only when needed
- **Caching**: Check if libraries already loaded
- **Async Rendering**: Non-blocking chart creation
- **Error Timeouts**: 30-second timeout per library

### 9.3 Storage Optimization
- **Local vs Sync**: Page data in local, settings in sync
- **History Limits**: Consider limiting history size
- **Cleanup**: Remove temporary context storage after use

### 9.4 UI Performance
- **Debouncing**: Resize handler debounced
- **Virtual Scrolling**: Consider for long chat histories
- **Lazy Rendering**: Render messages on demand

---

## 10. Testing Strategy

### 10.1 Unit Testing Areas

**Content Script:**
- DOM extraction accuracy
- Markdown rendering
- Chat history save/load
- Message rendering

**Background Worker:**
- LLM request formatting (per vendor)
- Response parsing
- Error handling
- Storage operations

**Settings:**
- Vendor switching
- Settings save/load
- Validation
- Custom model handling

### 10.2 Integration Testing

**End-to-End Flows:**
1. User sends message → LLM call → Response rendering
2. Chart generation → Library injection → Chart display
3. Settings change → Storage update → Settings reload
4. Chat history → Page reload → History restoration

### 10.3 Test Pages

- **page1-sales-data.html**: Tables and metrics
- **page2-article.html**: Text content
- **page3-data-visualization.html**: Multiple tables
- **page4-car-sales-india.html**: Expandable nested tables

### 10.4 Manual Testing Checklist

- [ ] Chat appears on page load
- [ ] Messages send and receive correctly
- [ ] Charts render properly
- [ ] Markdown formats correctly
- [ ] Copy functionality works
- [ ] Settings save and load
- [ ] Vendor switching works
- [ ] Custom models work
- [ ] Chat history persists
- [ ] Error messages display correctly

---

## 11. Future Enhancements

### 11.1 Potential Improvements

1. **Markdown Library**: Use `marked` or similar for better rendering
2. **Chart Export**: Download charts as PNG/SVG
3. **Chat Export**: Export chat history as markdown/PDF
4. **Multi-language**: Support for non-English content
5. **Voice Input**: Speech-to-text for questions
6. **Keyboard Shortcuts**: Quick access to chat
7. **Themes**: Dark mode support
8. **Analytics**: Optional usage analytics

### 11.2 Technical Debt

- Consider using TypeScript for type safety
- Add unit tests with Jest/Mocha
- Implement proper logging framework
- Add error tracking (Sentry, etc.)
- Optimize bundle size

---

## 12. Appendix

### 12.1 Key Constants

```javascript
// Default Settings
DEFAULT_VENDOR = 'openai'
DEFAULT_MODEL = 'gpt-4o'
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 2000

// Storage Keys
STORAGE_KEY_LLM_SETTINGS = 'llmSettings'
STORAGE_KEY_PROMPT_SETTINGS = 'promptSettings'
STORAGE_KEY_VEGA_SETTINGS = 'vegaSettings'
STORAGE_KEY_CHAT_HISTORY_PREFIX = 'chatHistory_'

// UI Constants
CHAT_CONTAINER_MIN_WIDTH = 300
CHAT_CONTAINER_MIN_HEIGHT = 400
CHAT_CONTAINER_DEFAULT_WIDTH = 400
CHAT_CONTAINER_DEFAULT_HEIGHT = 600
```

### 12.2 Color Theme

```css
--primary-color: #00AEEF;
--primary-dark: #0078B5;
--primary-light: #E6F7FF;
--text-color: #333;
--bg-color: #f5f5f5;
```

### 12.3 File Size Estimates

- `background.js`: ~25 KB
- `content.js`: ~45 KB
- `content.css`: ~8 KB
- `settings.js`: ~12 KB
- Total: ~90 KB (excluding icons)

---

**End of LLD Document**
