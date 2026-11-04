import '@testing-library/jest-dom';

// Drafts are persistent by design; each test starts with its own form state.
afterEach(() => { try { Object.keys(localStorage).filter(k => k.startsWith('ctb-rascunho-')).forEach(k => localStorage.removeItem(k)); } catch {} });
