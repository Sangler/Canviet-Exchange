# Security Note for Locale Files

## ⚠️ IMPORTANT: HTML Content Safety

The application uses `dangerouslySetInnerHTML` in several places to render localized content (FAQ answers, help text, terms & conditions).

### Current Files Using HTML:
- `home.tsx` - FAQ answers
- `help.tsx` - Help center content
- `terms-and-conditions.tsx` - Legal content

### Security Requirements:

1. **NEVER allow user-generated content in locale files**
2. **ONLY trusted developers should edit en.json and vi.json**
3. **Version control all locale file changes carefully**
4. **Review all locale PRs for XSS attempts**

### Why This Matters:
If an attacker can inject malicious HTML/JavaScript into locale files, they can execute XSS attacks on all users.

### Recommended Improvements:
Consider using a sanitization library like DOMPurify before rendering:
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Instead of:
<div dangerouslySetInnerHTML={{ __html: t('some.key') }} />

// Use:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('some.key')) }} />
```

Or better yet, convert HTML content to React components to avoid `dangerouslySetInnerHTML` entirely.
