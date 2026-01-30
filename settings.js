// Settings page script

// Vendor configurations
const VENDOR_CONFIGS = {
  litellm: {
    name: 'LiteLLM',
    endpoint: 'http://localhost:4000',
    endpointHelp: 'The API endpoint for your LLM service. Use the base URL (e.g., http://your-server:4000) - /chat/completions will be added automatically.',
    apiKeyHelp: 'Your LiteLLM API key',
    models: [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { value: 'claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-ultra', label: 'Gemini Ultra' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'custom', label: 'Custom (Enter model name)' }
    ],
    defaultModel: 'gpt-4',
    defaultApiKey: ''
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    endpointHelp: 'OpenAI API endpoint. Use https://api.openai.com/v1 - /chat/completions will be added automatically.',
    apiKeyHelp: 'Your OpenAI API key (starts with sk-)',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16k' },
      { value: 'custom', label: 'Custom (Enter model name)' }
    ],
    defaultModel: 'gpt-4o',
    defaultApiKey: ''
  },
  gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    endpointHelp: 'Google Gemini API endpoint. Use https://generativelanguage.googleapis.com/v1beta - /models/{model}:generateContent will be used.',
    apiKeyHelp: 'Your Google API key',
    models: [
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Latest)' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
      { value: 'gemini-ultra', label: 'Gemini Ultra' },
      { value: 'custom', label: 'Custom (Enter model name)' }
    ],
    defaultModel: 'gemini-1.5-pro',
    defaultApiKey: ''
  },
  claude: {
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1',
    endpointHelp: 'Anthropic Claude API endpoint. Use https://api.anthropic.com/v1 - /messages will be used.',
    apiKeyHelp: 'Your Anthropic API key (starts with sk-ant-)',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      { value: 'claude-2.1', label: 'Claude 2.1' },
      { value: 'claude-2.0', label: 'Claude 2.0' },
      { value: 'custom', label: 'Custom (Enter model name)' }
    ],
    defaultModel: 'claude-3-5-sonnet-20241022',
    defaultApiKey: ''
  },
  custom: {
    name: 'Custom',
    endpoint: '',
    endpointHelp: 'Enter your custom API endpoint URL',
    apiKeyHelp: 'Your API key',
    models: [
      { value: 'custom', label: 'Custom (Enter model name)' }
    ],
    defaultModel: 'custom',
    defaultApiKey: ''
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // Add vendor change listener
  document.getElementById('vendor').addEventListener('change', onVendorChange);
  
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
});

function onVendorChange() {
  const vendor = document.getElementById('vendor').value;
  const config = VENDOR_CONFIGS[vendor];
  
  if (!config) return;
  
  // Update endpoint placeholder and help text
  const endpointInput = document.getElementById('apiEndpoint');
  const endpointHelp = document.getElementById('endpointHelp');
  const apiKeyHelp = document.getElementById('apiKeyHelp');
  
  // Update placeholder
  endpointInput.placeholder = config.endpoint || 'Enter API endpoint URL';
  endpointHelp.textContent = config.endpointHelp;
  apiKeyHelp.textContent = config.apiKeyHelp;
  
  // Only set default value if field is empty (user hasn't entered anything)
  if (!endpointInput.value || endpointInput.value.trim() === '') {
    endpointInput.value = config.endpoint || '';
  }
  
  // API key should always remain empty unless user has entered something
  const apiKeyInput = document.getElementById('apiKey');
  if (!apiKeyInput.value || apiKeyInput.value.trim() === '') {
    apiKeyInput.value = '';
  }
  
  // Update model input placeholder and help text
  const modelInput = document.getElementById('model');
  const modelHelp = document.getElementById('modelHelp');
  
  // Set placeholder with example models for the selected vendor
  const exampleModels = config.models.slice(0, 3).map(m => m.value).join(', ');
  modelInput.placeholder = `Enter model name (e.g., ${exampleModels})`;
  
  // Update help text with vendor-specific guidance
  modelHelp.textContent = `Enter the model name for ${config.name}. Examples: ${exampleModels}`;
  
  // Only set default value if field is empty (user hasn't entered anything)
  if (!modelInput.value || modelInput.value.trim() === '') {
    modelInput.value = config.defaultModel || '';
  }
}

function loadSettings() {
  chrome.storage.sync.get(['llmSettings', 'promptSettings', 'vegaSettings'], (result) => {
    const llmSettings = result.llmSettings || {};
    const promptSettings = result.promptSettings || {};
    const vegaSettings = result.vegaSettings || {};
    
    // Load vendor (default to openai if not set)
    const vendor = llmSettings.vendor || 'openai';
    document.getElementById('vendor').value = vendor;
    
    // Load LLM settings (use vendor default if not set)
    const vendorConfig = VENDOR_CONFIGS[vendor];
    document.getElementById('apiEndpoint').value = llmSettings.apiEndpoint || vendorConfig.endpoint || '';
    document.getElementById('apiKey').value = llmSettings.apiKey || vendorConfig.defaultApiKey || '';
    document.getElementById('temperature').value = llmSettings.temperature || 0.7;
    document.getElementById('maxTokens').value = llmSettings.maxTokens || 2000;
    
    // Update vendor-specific fields
    onVendorChange();
    
    // Set model value (use stored value or default)
    const modelInput = document.getElementById('model');
    const storedModel = llmSettings.model || VENDOR_CONFIGS[vendor].defaultModel;
    if (storedModel) {
      modelInput.value = storedModel;
    }
    
    // Load prompt settings
    document.getElementById('systemPrompt').value = promptSettings.systemPrompt || 
      'You are a web data assistant.\nYou receive:\n- user intent\n- structured page data (tables)\n\nDecide:\n- explanation\n- visualization\n- transformation\n\nFor visualizations:\n- always return Vega-Lite JSON\n- always include a summary/description of the chart\n- never return prose only\n\nRespond in JSON format:\n- For explanations: {"type": "markdown", "content": "your explanation here"}\n- For visualizations: {"type": "vega-lite", "spec": {...}, "summary": "brief description of what the chart shows and key insights"}\n\nThe summary should explain what the chart visualizes, highlight key trends or patterns, and provide context for the data shown.';
    
    document.getElementById('userPromptTemplate').value = promptSettings.userPromptTemplate || 
      'User question: {question}\n\nPage context:\n{context}';
    
    // Load Vega settings
    document.getElementById('vegaUrl').value = vegaSettings.vegaUrl || 'https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js';
    document.getElementById('vegaLiteUrl').value = vegaSettings.vegaLiteUrl || 'https://cdn.jsdelivr.net/npm/vega-lite@5/build/vega-lite.min.js';
    document.getElementById('vegaEmbedUrl').value = vegaSettings.vegaEmbedUrl || 'https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js';
  });
}

function saveSettings() {
  const modelInput = document.getElementById('model');
  const modelValue = modelInput.value.trim();
  
  if (!modelValue) {
    showStatus('Please enter a model name', 'error');
    modelInput.focus();
    return;
  }
  
  const llmSettings = {
    vendor: document.getElementById('vendor').value,
    apiEndpoint: document.getElementById('apiEndpoint').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim(),
    model: modelValue,
    temperature: parseFloat(document.getElementById('temperature').value),
    maxTokens: parseInt(document.getElementById('maxTokens').value)
  };
  
  const promptSettings = {
    systemPrompt: document.getElementById('systemPrompt').value.trim(),
    userPromptTemplate: document.getElementById('userPromptTemplate').value.trim()
  };
  
  const vegaSettings = {
    vegaUrl: document.getElementById('vegaUrl').value.trim(),
    vegaLiteUrl: document.getElementById('vegaLiteUrl').value.trim(),
    vegaEmbedUrl: document.getElementById('vegaEmbedUrl').value.trim()
  };
  
  // Validate
  if (!llmSettings.apiEndpoint) {
    showStatus('Please enter an API endpoint', 'error');
    return;
  }
  
  if (!llmSettings.apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  // Validate Vega URLs
  if (!vegaSettings.vegaUrl || !vegaSettings.vegaLiteUrl || !vegaSettings.vegaEmbedUrl) {
    showStatus('Please enter all Vega-Lite library URLs', 'error');
    return;
  }
  
  chrome.storage.sync.set({
    llmSettings: llmSettings,
    promptSettings: promptSettings,
    vegaSettings: vegaSettings
  }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus('Settings saved successfully!', 'success');
    }
  });
}

  function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    const defaultVendor = 'openai';
    const defaultConfig = VENDOR_CONFIGS[defaultVendor];
    chrome.storage.sync.set({
      llmSettings: {
        vendor: defaultVendor,
        apiEndpoint: defaultConfig.endpoint, // Use vendor default endpoint
        apiKey: '', // Empty - user must provide their own API key
        model: defaultConfig.defaultModel,
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
    }, () => {
      loadSettings();
      showStatus('Settings reset to defaults', 'success');
    });
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = 'status ' + type;
  
  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}
