# Design Description  
## AI-Assisted Chrome Extension for Contextual Page Understanding & Visualization

---

## 1. Overview

This document describes the design of a **Chrome browser extension** that provides an **AI-powered chat interface** on top of any web application.  
The extension allows users to ask natural-language questions such as:

- *“Explain the content on this page”*
- *“Create a bar chart from the sales table”*

The system interprets the **current page UI**, sends a **semantic JSON representation** of the visible DOM along with the **user intent** to an LLM, and renders either:
- **Textual explanations (Markdown)**, or
- **Visualizations (Vega-Lite charts)**

---

## 2. Goals

- Enable in-context understanding of any web page without modifying the host application
- Support both **explanation** and **visualization** use cases
- Ensure deterministic, safe, and predictable LLM interactions
- Keep all rendering client-side

---

## 3. Non-Goals

- Modifying or automating the host web application
- Sending raw HTML or scripts to the LLM
- Training or fine-tuning models
- Persisting page data without user consent

---

## 4. High-Level Architecture

```
Web Page DOM
   ↓
Chrome Extension
   - Content Script
   - Chat UI
   - Background Worker
   ↓
LLM (Reasoning)
   ↓
UI Renderer (Markdown / Vega-Lite)
```

---

## 5. Design Principles

1. Browser owns DOM understanding  
2. LLM reasons over structured data only  
3. No HTML, scripts, or styles sent to LLM  
4. Strict input/output contracts  
5. Deterministic rendering  

---

## 6. Component Design

### 6.1 Chrome Extension

**Responsibilities**
- Inject chat UI into the page
- Extract visible UI elements
- Convert DOM to semantic JSON
- Send user intent + JSON to LLM
- Render LLM responses

---

### 6.2 DOM to Semantic JSON Conversion

**Rules**
- Ignore hidden, disabled, or ARIA-hidden elements
- Exclude scripts and styles
- Preserve reading order
- Normalize tables for analytics use cases

```json
{
  "page": {
    "title": "string",
    "url": "string"
  },
  "ui_state": {
    "content": []
  }
}
```

---

## 7. LLM Output Contract

### Explanation

```json
{
  "type": "markdown",
  "content": "..."
}
```

### Visualization

```json
{
  "type": "vega-lite",
  "spec": {}
}
```

---

## 8. Security & Privacy

- Only visible UI content is shared
- Sensitive fields excluded
- No persistent storage by default

---

## 9. End-to-End Flow

User → Intent → DOM JSON → LLM → Rendered Output

---

## 10. Architectural Statement

The browser is the source of truth.  
The LLM is a reasoning engine over structured UI state.
