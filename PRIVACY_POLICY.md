# Privacy Policy

**Last Updated:** January 30, 2026

This Privacy Policy describes how the **AI Assistant - Page Context Chat** Chrome extension ("we", "our", or "the Extension") collects, uses, and shares user data. This policy applies to all users of the Extension.

## 1. Information We Collect

### 1.1 Page Content Data

When you use the Extension on a webpage, we extract the following visible content from the page:

- **Page Title:** The title of the webpage
- **Page URL:** The URL of the webpage you are viewing
- **Tables:** Data from HTML tables and div-based table structures visible on the page
- **Headings:** Text content from heading elements (h1-h6)
- **Text Content:** Visible text content from the page

**Important:** We only extract content that is visible in the browser's Document Object Model (DOM). We do not extract:

- Hidden or non-visible content
- JavaScript code or scripts
- CSS styles
- Cookies or local storage data from websites
- Password fields or sensitive form inputs
- Content from iframes or embedded content

### 1.2 User Messages

We collect the messages you send through the Extension's chat interface. These messages may include:

- Questions or queries about the webpage content
- Requests for data analysis or visualizations
- Follow-up questions in conversation threads

### 1.3 Configuration Data

We store the following configuration settings that you provide:

- **LLM Provider Settings:**
  - Vendor selection (OpenAI, Anthropic, Google Gemini, LiteLLM, or Custom)
  - API endpoint URL
  - API key (stored securely using Chrome's encrypted storage)
  - Model name
  - Temperature and max tokens settings
- **Prompt Settings:** Custom system prompts and user prompt templates (optional)
- **Visualization Settings:** Vega-Lite library CDN URLs (optional)

### 1.4 Chat History

We store your chat conversations locally in your browser. Chat history is stored per webpage and includes:

- Your messages
- AI assistant responses
- Timestamps
- Visualization specifications (if charts were generated)

### 1.5 Usage Preferences

We store minimal usage preferences:

- Chat window dimensions (width and height) for your convenience

## 2. How We Use Your Data

### 2.1 Core Functionality

We use the collected data solely to provide the Extension's core functionality:

- **AI Analysis:** Page content and your messages are sent to the LLM provider you have configured (OpenAI, Anthropic, Google Gemini, or LiteLLM) to generate responses and visualizations
- **Chat History:** Stored locally to restore previous conversations when you return to the same webpage
- **Settings:** Used to configure API calls and customize the Extension's behavior

### 2.2 Data Processing

All data processing occurs:

- **Locally:** Content extraction and UI rendering happen entirely in your browser
- **Via Your Chosen LLM Provider:** Page content and messages are sent to the LLM service you configure (OpenAI, Anthropic, Google, or your LiteLLM instance)

We do not operate any servers or backend infrastructure. We do not process, analyze, or store your data on our own servers.

## 3. Data Sharing and Third Parties

### 3.1 LLM Providers

When you use the Extension, the following data is transmitted to the LLM provider you have configured:

- Page content (tables, headings, text)
- Your chat messages
- Conversation history (last few messages for context)
- System prompts and configuration

**LLM Providers:** Depending on your configuration, data may be sent to:

- **OpenAI:** https://openai.com/privacy
- **Anthropic (Claude):** https://www.anthropic.com/privacy
- **Google (Gemini):** https://policies.google.com/privacy
- **LiteLLM:** Your self-hosted instance (privacy policy depends on your LiteLLM provider)
- **Custom Endpoints:** Your configured endpoint (privacy policy depends on your provider)

**Important:** We recommend reviewing the privacy policies of your chosen LLM provider to understand how they handle your data.

### 3.2 CDN Providers (Vega-Lite Libraries)

When rendering visualizations, the Extension loads Vega-Lite libraries from CDN providers (jsdelivr.net or unpkg.com). These libraries are loaded directly into the webpage context. No user data is sent to these CDN providers.

### 3.3 No Other Third-Party Sharing

We do **NOT** share your data with:

- Advertising platforms or data brokers
- Analytics services or tracking services
- Social media platforms
- Any other third parties except your chosen LLM provider

**Limited Use Compliance:** The use of information received from Google APIs (if using Gemini) will adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy_policy), including the Limited Use requirements. We only use data to provide or improve the Extension's single purpose of providing AI-powered webpage analysis and visualization.

## 4. Data Storage

### 4.1 Chrome Storage API

All data is stored locally in your browser using Chrome's Storage API:

- **Chrome Storage Sync:** Settings (API keys, configuration) are stored using Chrome's encrypted sync storage. If you have Chrome sync enabled, these settings may be synced across your devices.
- **Chrome Storage Local:** Chat history and page-specific data are stored locally and are NOT synced across devices.

### 4.2 Data Retention

- **Chat History:** Stored indefinitely until you clear Chrome's extension storage or uninstall the Extension
- **Settings:** Stored until you modify or delete them
- **Temporary Context:** Temporary page context data is stored briefly and may be automatically cleaned up

### 4.3 Data Deletion

You can delete your data at any time by:

- Clearing extension storage in Chrome's extension settings
- Uninstalling the Extension (which removes all stored data)
- Manually clearing individual chat histories through the Extension's interface

## 5. Data Security

### 5.1 API Key Security

Your API keys are stored using Chrome's encrypted storage API (chrome.storage.sync). Chrome encrypts this data before syncing it across devices.

### 5.2 Transmission Security

All API requests to LLM providers are made over HTTPS (encrypted connections). We do not transmit data over unencrypted connections.

### 5.3 No Server Infrastructure

The Extension does not operate any servers. All processing occurs locally in your browser, except for API calls to your chosen LLM provider.

## 6. Permissions Explained

The Extension requests the following permissions:

- **activeTab:** Allows the Extension to access the content of the active tab to extract visible page content
- **storage:** Allows the Extension to save your settings and chat history locally
- **scripting:** Allows the Extension to inject Vega-Lite visualization libraries into webpages to render charts
- **host_permissions (<all_urls>):** Allows the Extension to:
  - Work on any webpage
  - Make API calls to LLM providers
  - Inject visualization libraries

## 7. User Rights and Control

### 7.1 Your Rights

You have the right to:

- **Access:** View your stored settings and chat history through Chrome's extension storage
- **Modify:** Change your settings at any time through the Extension's settings page
- **Delete:** Clear your chat history or uninstall the Extension to delete all data
- **Control:** Choose which LLM provider to use and configure API endpoints

### 7.2 Opt-Out

You can stop using the Extension at any time by:

- Disabling the Extension in Chrome's extension settings
- Uninstalling the Extension

Uninstalling the Extension will remove all stored data from your browser.

## 8. Children's Privacy

The Extension is not intended for children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child under 13, please contact us immediately.

## 9. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:

- Updating the "Last Updated" date at the top of this policy
- Posting the updated policy on this page

We encourage you to review this Privacy Policy periodically to stay informed about how we handle your data.

## 10. Contact Information

If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:

**Developer:** Santosh Manapragada  
**Extension:** AI Assistant - Page Context Chat  
**Email:** [Your contact email]

*Note: Please replace [Your contact email] with your actual contact email address before publishing this policy.*

## 11. Compliance

This Extension complies with:

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy_policy)
- [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy_policy)
- Limited Use requirements for Google APIs (if using Gemini)

We are committed to protecting your privacy and handling your data responsibly. We only collect and use data necessary to provide the Extension's functionality, and we do not sell or share your data with third parties except as necessary to provide the service (i.e., sending data to your chosen LLM provider).

---

**Summary:** This Extension collects page content and your messages to provide AI-powered analysis. Data is sent only to your chosen LLM provider. All data is stored locally in your browser. We do not track you, sell your data, or share it with advertising platforms.

© 2026 AI Assistant - Page Context Chat. All rights reserved.
