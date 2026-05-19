"use client";

import { useSyncExternalStore } from "react";

export type Todo = {
  id?: string;
  content?: string;
  title?: string;
  status?: "pending" | "in_progress" | "completed";
};

let todos: Todo[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setTodos(next: Todo[]) {
  todos = Array.isArray(next) ? next : [];
  emit();
}

export function resetTodos() {
  todos = [];
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return todos;
}

export function useTodosStore(): Todo[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
