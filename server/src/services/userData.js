/**
 * Registry of per-module user data handlers. Each module that stores user-owned data
 * registers how to export and delete it, so account export/deletion stays complete as
 * modules are added.
 */
export function createUserDataRegistry() {
  const handlers = [];
  return {
    register({ name, exportFor, deleteFor }) {
      handlers.push({ name, exportFor, deleteFor });
    },
    async exportAll(userId) {
      const out = {};
      for (const h of handlers) if (h.exportFor) out[h.name] = await h.exportFor(userId);
      return out;
    },
    async deleteAll(userId) {
      const results = {};
      // Delete dependent data first; the user record (registered first) goes last.
      for (const h of [...handlers].reverse()) results[h.name] = await h.deleteFor(userId);
      return results;
    },
    names: () => handlers.map((h) => h.name),
  };
}
