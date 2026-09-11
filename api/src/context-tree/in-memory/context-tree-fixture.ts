import type { ContextNode } from '../../domain/context-tree';

export const CONTEXT_TREE_NODES: ContextNode[] = [
  {
    id: 'node-root-info',
    parentId: null,
    slug: 'info',
    title: 'Informacje',
    body: '',
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'node-dostawa',
    parentId: 'node-root-info',
    slug: 'dostawa',
    title: 'Dostawa',
    body: 'Wysyłka w 5–7 dni roboczych.',
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'node-chat-zapis',
    parentId: null,
    slug: 'chat-zapis',
    title: 'Zapis rozmowy',
    body: '',
    sortOrder: 10,
    isActive: true,
  },
  {
    id: 'node-zgoda-lead',
    parentId: null,
    slug: 'zgoda-lead',
    title: 'Zgoda na kontakt',
    body: '',
    sortOrder: 11,
    isActive: true,
  },
  {
    id: 'node-inactive',
    parentId: 'node-root-info',
    slug: 'archiwum-gwarancja',
    title: 'Gwarancja (archiwum)',
    body: 'Nie pokazuj tego tekstu.',
    sortOrder: 99,
    isActive: false,
  },
];
