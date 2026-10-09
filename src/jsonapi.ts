// Flattens JSON:API documents into plain objects:
//   { data: { id: '1', type: 'clients', attributes: { name: 'Jane' } } }
// becomes
//   { id: 1, name: 'Jane' }
// Relationships whose resources are all present in `included` (a section's
// line items) are attached as arrays under the relationship name.

import type { PaginationMeta } from './types';

interface ResourceIdentifier {
  id: string;
  type: string;
}

interface JsonApiResource extends ResourceIdentifier {
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: ResourceIdentifier | ResourceIdentifier[] | null }>;
}

/** @internal */
export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  meta?: Partial<PaginationMeta>;
}

/** @internal */
export function deserializeOne<T>(document: JsonApiDocument): T {
  const index = indexIncluded(document.included);
  return deserializeResource(document.data as JsonApiResource, index) as T;
}

/** @internal */
export function deserializeMany<T>(document: JsonApiDocument): T[] {
  const index = indexIncluded(document.included);
  const data = Array.isArray(document.data) ? document.data : [document.data];
  return data.map((resource) => deserializeResource(resource, index) as T);
}

function deserializeResource(
  resource: JsonApiResource,
  included: Map<string, JsonApiResource>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { id: parseId(resource.id), ...resource.attributes };

  for (const [name, relationship] of Object.entries(resource.relationships ?? {})) {
    if (!Array.isArray(relationship.data)) continue;
    const related = relationship.data.map((identifier) => included.get(key(identifier)));
    if (related.every((item) => item !== undefined)) {
      result[name] = related.map((item) => deserializeResource(item, new Map()));
    }
  }

  return result;
}

function indexIncluded(included: JsonApiResource[] | undefined): Map<string, JsonApiResource> {
  return new Map((included ?? []).map((resource) => [key(resource), resource]));
}

function key(identifier: ResourceIdentifier): string {
  return `${identifier.type}:${identifier.id}`;
}

function parseId(id: string): number | string {
  return /^\d+$/.test(id) ? Number(id) : id;
}
