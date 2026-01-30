# Privacy Policy Guide for Chrome Web Store Submission

## Overview

This guide explains how to use the privacy policy for Chrome Web Store submission.

## Files Created

1. **`PRIVACY_POLICY.html`** - Formatted HTML version (ready to host)
2. **`PRIVACY_POLICY.md`** - Markdown version (for reference/editing)

## Chrome Web Store Requirements

According to [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy_policy):

1. ✅ **Privacy Policy Required:** If your extension handles any user data, you must post an accurate and up-to-date privacy policy.

2. ✅ **Comprehensive Disclosure:** The privacy policy must disclose:
   - How your extension collects, uses, and shares user data
   - All parties the user data will be shared with

3. ✅ **Accessible Link:** You must provide a link to the privacy policy in the Chrome Web Store Developer Dashboard.

## Steps to Use This Privacy Policy

### Step 1: Host the Privacy Policy

You need to host the `PRIVACY_POLICY.html` file on a publicly accessible URL. Options:

1. **GitHub Pages** (Recommended):
   - Create a repository (or use existing one)
   - Enable GitHub Pages in repository settings
   - Upload `PRIVACY_POLICY.html` to the repository
   - Access via: `https://yourusername.github.io/repository-name/PRIVACY_POLICY.html`

2. **Personal Website:**
   - Upload `PRIVACY_POLICY.html` to your web server
   - Access via: `https://yourdomain.com/privacy-policy.html`

3. **Other Hosting Services:**
   - Netlify, Vercel, or any static hosting service

### Step 2: Update Contact Information

Before hosting, update the contact email in the privacy policy:

1. Open `PRIVACY_POLICY.html`
2. Find: `[Your contact email]`
3. Replace with your actual contact email
4. Do the same in `PRIVACY_POLICY.md` if you plan to use that version

### Step 3: Add Link to Chrome Web Store Dashboard

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Select your extension
3. Navigate to the "Privacy practices" section
4. Enter the URL to your hosted privacy policy in the "Privacy policy" field
5. Save changes

## What the Privacy Policy Covers

The privacy policy addresses all Chrome Web Store requirements:

✅ **Data Collection:**
- Page content (tables, headings, text)
- User messages
- Configuration settings (API keys, LLM settings)
- Chat history
- Usage preferences

✅ **Data Usage:**
- Core functionality explanation
- Local processing
- LLM provider communication

✅ **Data Sharing:**
- LLM providers (OpenAI, Anthropic, Google, LiteLLM, Custom)
- CDN providers (for Vega-Lite libraries)
- Explicit statement: No sharing with advertising platforms or data brokers

✅ **Data Storage:**
- Chrome Storage API (sync and local)
- Data retention policies
- Data deletion instructions

✅ **Security:**
- API key encryption
- HTTPS transmission
- No server infrastructure

✅ **User Rights:**
- Access, modify, delete data
- Opt-out instructions

✅ **Compliance:**
- Chrome Web Store Program Policies
- Limited Use requirements for Google APIs
- User Data Policy compliance

## Customization

Before publishing, review and customize:

1. **Contact Email:** Replace `[Your contact email]` with your actual email
2. **Last Updated Date:** Update when you make changes
3. **Additional Providers:** If you add support for other LLM providers, add them to section 3.1
4. **Additional Data Collection:** If you add new features that collect data, update section 1

## Testing

Before submitting to Chrome Web Store:

1. ✅ Verify the privacy policy URL is publicly accessible
2. ✅ Check that all links work (LLM provider privacy policy links)
3. ✅ Ensure contact email is correct
4. ✅ Review content for accuracy based on your extension's actual behavior
5. ✅ Test the HTML file renders correctly in a browser

## Important Notes

- **Keep Updated:** If you change how your extension handles data, update the privacy policy accordingly
- **Be Accurate:** The privacy policy must accurately reflect your extension's behavior
- **Accessibility:** The privacy policy must be accessible without requiring login or special permissions
- **Language:** If your extension targets non-English users, consider translating the privacy policy

## Compliance Checklist

Before submitting to Chrome Web Store, verify:

- [ ] Privacy policy is hosted and publicly accessible
- [ ] Privacy policy URL is added to Chrome Web Store Developer Dashboard
- [ ] Privacy policy accurately describes data collection
- [ ] Privacy policy lists all third parties data is shared with
- [ ] Contact information is correct
- [ ] Privacy policy is up-to-date with current extension behavior
- [ ] Limited Use statement included (if using Google APIs)

## Resources

- [Chrome Web Store Program Policies - Privacy Policy Section](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy_policy)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy_policy)

---

**Need Help?** If you have questions about the privacy policy or Chrome Web Store requirements, refer to the official Chrome Web Store documentation or contact Chrome Web Store support.
