/**
 * Skill dependency resolver.
 *
 * Algorithm:
 *   BFS over selected skills, expanding extends + requires edges.
 *   Topological sort (bases before dependents).
 *   Max 3 hops to prevent circular cycles.
 *
 * Input:  list of skill names selected by user / bundle
 * Output: ordered install list + warnings
 */

/** Minimal skill entry shape needed by the resolver (subset of skill-index.json) */
export interface SkillEntry {
  name: string;
  connections: {
    extends: string[];
    requires: string[];
    conflicts: string[];
  };
}

export interface ResolvedResult {
  /** Ordered list of skill names to install (bases first) */
  skills: string[];
  /** Same as skills — explicit alias for callers that want "order" */
  order: string[];
  /** Non-fatal warnings (unknown skills, conflicts dropped, etc.) */
  warnings: string[];
}

const MAX_DEPTH = 3;

/**
 * Resolve the full ordered dependency graph for the given skill names.
 *
 * @param selected - Skill names chosen by the user or from a bundle
 * @param skillIndex - Entries from skill-index.json
 */
export function resolveDependencies(
  selected: string[],
  skillIndex: SkillEntry[],
): ResolvedResult {
  const indexMap = new Map<string, SkillEntry>(skillIndex.map((s) => [s.name, s]));
  const warnings: string[] = [];

  // BFS — collect all transitively required skills
  const visited = new Map<string, number>(); // name → depth at which first discovered
  const queue: Array<{ name: string; depth: number }> = selected.map((n) => ({
    name: n,
    depth: 0,
  }));

  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { name, depth } = queue.shift()!;

    if (visited.has(name)) continue;

    const entry = indexMap.get(name);
    if (!entry) {
      warnings.push(`Unknown skill: "${name}" — skipped`);
      continue;
    }

    visited.set(name, depth);

    if (depth >= MAX_DEPTH) {
      warnings.push(`Max depth (${MAX_DEPTH}) reached expanding "${name}" — dependencies truncated`);
      continue;
    }

    // Expand extends parents first (they must load before dependents)
    for (const dep of entry.connections.extends) {
      if (!visited.has(dep)) queue.push({ name: dep, depth: depth + 1 });
    }

    // Expand requires
    for (const dep of entry.connections.requires) {
      if (!visited.has(dep)) queue.push({ name: dep, depth: depth + 1 });
    }
  }

  // Detect conflict pairs
  const allNames = [...visited.keys()];
  for (const name of allNames) {
    const entry = indexMap.get(name);
    if (!entry) continue;
    for (const conflict of entry.connections.conflicts) {
      if (visited.has(conflict)) {
        warnings.push(`Conflict: "${name}" conflicts with "${conflict}" — keeping "${name}", dropping "${conflict}"`);
        visited.delete(conflict);
      }
    }
  }

  // Topological sort — bases (extends parents) before dependents
  const sorted = topologicalSort([...visited.keys()], indexMap);

  return {
    skills: sorted,
    order: sorted,
    warnings,
  };
}

/**
 * Simple topological sort using Kahn's algorithm.
 * Nodes with no incoming edges (no one extends/requires them among the set) go first.
 */
function topologicalSort(names: string[], indexMap: Map<string, SkillEntry>): string[] {
  const nameSet = new Set(names);

  // Build in-degree map (only edges within the resolved set)
  const inDegree = new Map<string, number>(names.map((n) => [n, 0]));

  for (const name of names) {
    const entry = indexMap.get(name);
    if (!entry) continue;

    const deps = [...entry.connections.extends, ...entry.connections.requires];
    for (const dep of deps) {
      if (nameSet.has(dep)) {
        // dep must come BEFORE name, so name has incoming edge from dep
        inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
      }
    }
  }

  // Start with nodes that have no dependencies in the set
  const queue = names.filter((n) => inDegree.get(n) === 0).sort();
  const result: string[] = [];

  while (queue.length > 0) {
    queue.sort(); // stable alphabetical within same level
    const current = queue.shift()!;
    result.push(current);

    // Find all nodes that depend on current (current is a dep of node)
    for (const name of names) {
      if (result.includes(name)) continue;
      const entry = indexMap.get(name);
      if (!entry) continue;

      const deps = [...entry.connections.extends, ...entry.connections.requires];
      if (deps.includes(current) && nameSet.has(name)) {
        const newDegree = (inDegree.get(name) ?? 1) - 1;
        inDegree.set(name, newDegree);
        if (newDegree <= 0) queue.push(name);
      }
    }
  }

  // Append any remaining (cycle or unknown) in original order
  const remaining = names.filter((n) => !result.includes(n));
  return [...result, ...remaining];
}
