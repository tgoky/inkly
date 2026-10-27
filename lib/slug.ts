// Short random slug, e.g. "k3f". Three base-36 characters keeps URLs tiny.
export function generateSlug(): string {
  return Math.random().toString(36).slice(2, 5);
}
