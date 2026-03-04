import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.base],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name=/^use\\w+Store$/][arguments.length=0]',
          message: 'Zustand stores must use a selector: useStore((s) => s.value). Calling without a selector subscribes to the entire store and causes excessive re-renders that can trigger React error #185.',
        },
        {
          selector: 'CallExpression[callee.name=/^use\\w+Store$/] ArrowFunctionExpression CallExpression[callee.property.name=/^(getTyping|getUnreadList|getFiltered|getStatus|getStatusComment|getTotalUnread|getUnread|getCategoryUnreadCount|shouldShow)$/]',
          message: 'Do not call store getter methods inside Zustand selectors — they use get() internally which adds unnecessary indirection. Select raw state instead: (s) => s.statuses[id] || "offline". See MEMORY.md Zustand safety rules.',
        },
      ],
    },
  },
);
