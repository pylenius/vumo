import type { Component } from 'vue';

export interface CompositionDefinition<TProps extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  component: Component;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  props?: TProps;
}

const registry = new Map<string, CompositionDefinition>();

export function defineComposition<TProps extends Record<string, unknown> = Record<string, unknown>>(
  def: CompositionDefinition<TProps>,
): CompositionDefinition<TProps> {
  if (registry.has(def.id)) {
    throw new Error(`[vumo] Composition with id "${def.id}" is already registered.`);
  }
  registry.set(def.id, def as CompositionDefinition);
  return def;
}

export function getComposition(id: string): CompositionDefinition | undefined {
  return registry.get(id);
}

export function listCompositions(): readonly CompositionDefinition[] {
  return Array.from(registry.values());
}

export function clearCompositions(): void {
  registry.clear();
}
