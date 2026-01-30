# AI Assistant - Page Context Chat

A powerful Chrome extension that brings AI capabilities directly to any webpage. Ask questions about page content, generate visualizations from data tables, and get intelligent explanations—all without leaving the page.

## ✨ Features

### 🤖 Multi-Vendor LLM Support
- **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, and more
- **Anthropic Claude**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google Gemini**: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro
- **LiteLLM**: Support for self-hosted or proxy LLM services
- **Custom**: Configure your own LLM endpoint

### 💬 Intelligent Chat Interface
- **Inline Chat Panel**: Appears on the right side of any webpage
- **Context-Aware**: Understands visible page content automatically
- **Persistent History**: Chat history saved per page
- **Resizable UI**: Adjust chat window size to your preference

### 📊 Data Visualization
- **Vega-Lite Charts**: Generate beautiful charts from page data
- **Automatic Summaries**: Each chart includes an AI-generated summary
- **Copy Support**: Copy charts as images or text
- **Multiple Chart Types**: Bar, line, pie, scatter, and more

### 📝 Rich Markdown Support
- **Full Markdown Rendering**: Headers, lists, code blocks, links, bold, italic
- **Code Highlighting**: Syntax-highlighted code blocks
- **Copy to Clipboard**: One-click copy of any message

### ⚙️ Fully Configurable
- **Vendor Selection**: Easy switching between LLM providers
- **Custom Prompts**: Configure system and user prompt templates
- **Model Selection**: Choose from popular models or enter custom model names
- **Advanced Settings**: Temperature, max tokens, and more

### 🔒 Privacy-Focused
- **Local Storage**: All data stored locally in your browser
- **Your API Keys**: Uses your own API credentials
- **No Data Collection**: No data sent to third-party servers
- **Visible Content Only**: Only extracts visible page content

## 🚀 Quick Start

### Installation

1. **Download/Clone** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select this directory
5. **Configure Settings**:
   - Click the extension icon
   - Go to Settings (⚙️)
   - Select your LLM vendor
   - Enter your API endpoint and API key
   - Choose your model
   - Save settings

### Usage

1. **Navigate** to any webpage
2. **Click** the extension icon or the chat button (💬) on the page
3. **Ask questions** like:
   - "Explain the content on this page"
   - "Create a bar chart from the sales table"
   - "What are the key metrics shown?"
   - "Summarize this article"
   - "Generate a visualization of the data"

## 📋 Requirements

- Chrome browser (or Chromium-based browsers like Edge, Brave)
- API key for your chosen LLM provider:
  - OpenAI: Get key from https://platform.openai.com/api-keys
  - Anthropic: Get key from https://console.anthropic.com/
  - Google: Get key from https://makersuite.google.com/app/apikey
  - LiteLLM: Use your self-hosted instance

## 🏗️ Architecture

```
Web Page
   ↓
Content Script (content.js)
   ├── DOM Extraction
   ├── Chat UI Injection
   └── Message Rendering
   ↓
Background Service Worker (background.js)
   ├── LLM API Calls
   ├── Vega-Lite Injection
   └── Settings Management
   ↓
LLM Provider (OpenAI/Claude/Gemini/LiteLLM)
   ↓
Response Rendering
   ├── Markdown Parser
   └── Vega-Lite Charts
```

## 📁 Project Structure

```
chrome-plugin-ai/
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Service worker for LLM calls & Vega-Lite injection
├── content.js                 # Content script (DOM extraction, chat UI)
├── content.css                # Chat UI styles (FactSet theme)
├── popup.html                 # Extension popup (launcher)
├── popup.js                   # Popup script
├── settings.html              # Settings page UI
├── settings.js                # Settings logic & vendor configurations
├── icons/                     # Extension icons (16px, 48px, 128px)
├── docs/                      # Documentation
│   ├── ai_chrome_extension_design.md  # High-level design
│   └── LLD.md                # Low-level design (detailed)
├── test-pages/               # Test HTML pages
│   ├── page1-sales-data.html
│   ├── page2-article.html
│   ├── page3-data-visualization.html
│   └── page4-car-sales-india.html
└── README.md                 # This file
```

## ⚙️ Configuration

### LLM Settings

- **Vendor**: Select LLM provider (OpenAI, Claude, Gemini, LiteLLM, Custom)
- **API Endpoint**: Your LLM API endpoint URL
- **API Key**: Your API key (stored securely)
- **Model**: Select from popular models or enter custom model name
- **Temperature**: Controls response randomness (0-2, default: 0.7)
- **Max Tokens**: Maximum response length (default: 2000)

### Prompt Settings

- **System Prompt**: Defines AI behavior and response format
- **User Prompt Template**: Template with `{question}` and `{context}` placeholders

### Vega-Lite Settings

- **Vega Library URL**: CDN URL for Vega library
- **Vega-Lite Library URL**: CDN URL for Vega-Lite library
- **Vega-Embed Library URL**: CDN URL for Vega-Embed library

## 📊 Response Format

The extension expects LLM responses in JSON format:

**Markdown Explanation:**
```json
{
  "type": "markdown",
  "content": "Your markdown explanation here"
}
```

**Vega-Lite Visualization:**
```json
{
  "type": "vega-lite",
  "spec": {
    "data": {...},
    "mark": "bar",
    "encoding": {...}
  },
  "summary": "Brief description of the chart and key insights"
}
```

## 🔐 Security & Privacy

- **Local Storage**: All settings and chat history stored locally
- **Secure Storage**: API keys stored using Chrome's encrypted storage API
- **No Remote Servers**: Extension doesn't operate any servers
- **Content Extraction**: Only visible UI content is extracted (no scripts/styles)
- **User Control**: You control what data is sent to LLM services

## 🛠️ Development

### Setup

1. Clone the repository
2. Load extension in Chrome (Developer mode)
3. Make changes to source files
4. Reload extension in `chrome://extensions/`
5. Test on any webpage or use test pages in `test-pages/`

### Testing

Test pages are included in `test-pages/`:
- `page1-sales-data.html`: Sales dashboard with tables
- `page2-article.html`: Long-form article content
- `page3-data-visualization.html`: Analytics data
- `page4-car-sales-india.html`: Expandable car sales data

### Building for Production

Use the provided script to create a Chrome Web Store package:
```bash
./create-store-package.sh
```

This creates a ZIP file excluding test files and documentation.

## 📚 Documentation

- **High-Level Design**: `docs/ai_chrome_extension_design.md`
- **Low-Level Design**: `docs/LLD.md`
- **Setup Guide**: `SETUP.md`
- **Publishing Guide**: `PUBLISH_GUIDE.md`
- **Privacy Policy**: `PRIVACY_POLICY.md`

## 🐛 Troubleshooting

### Chat Not Appearing
- Check browser console for errors (F12)
- Ensure content script is loaded
- Try reloading the extension

### Charts Not Loading
- Check browser console for Vega-Lite errors
- Verify Vega-Lite URLs in settings
- Ensure internet connection for CDN libraries

### API Errors
- Verify API endpoint and key in settings
- Check LLM provider status
- Review browser console for detailed error messages

### Settings Not Saving
- Check Chrome storage permissions
- Try clearing extension storage and reconfiguring
- Reload extension after saving

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- All features are tested
- Documentation is updated

## 📝 License

MIT License

## 🙏 Acknowledgments

- Vega-Lite for visualization capabilities
- Chrome Extension APIs for browser integration
- LLM providers (OpenAI, Anthropic, Google) for AI capabilities

## 📞 Support

For issues, questions, or feature requests:
- Check the documentation in `docs/` folder
- Review troubleshooting section above
- Check browser console for error details

---

**Made with ❤️ for better web browsing**
