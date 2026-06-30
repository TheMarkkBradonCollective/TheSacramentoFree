import type { ChangeEvent, ElementType, FormEvent, PointerEvent, ReactNode } from 'react';

declare global {
  namespace React {
    type ChangeEvent<T = Element> = import('react').ChangeEvent<T>;
    type FormEvent<T = Element> = import('react').FormEvent<T>;
    type PointerEvent<T = Element> = import('react').PointerEvent<T>;
    type ReactNode = import('react').ReactNode;
    type ElementType = import('react').ElementType;
  }
}

export {};
