// IndexedDB en mémoire pour les tests (Dexie fonctionne comme dans le navigateur).
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sans `globals: true`, Testing Library ne démonte pas les rendus tout seul.
afterEach(() => cleanup());
