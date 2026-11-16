import { createRequire } from 'node:module';
import type { FragmentDefinitionNode, SelectionSetNode, ValidationRule } from 'graphql';

const { GraphQLError } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const MAX_DEPTH = 20;
const MAX_FIELDS = 1000;

/** Limits expanded fragments as well as fields written directly in an operation. */
export const queryLimitsRule: ValidationRule = (context) => ({
  OperationDefinition(operation) {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of context.getDocument().definitions) {
      if (definition.kind === 'FragmentDefinition') fragments.set(definition.name.value, definition);
    }
    let fields = 0;
    let exceeded = false;
    const walk = (selectionSet: SelectionSetNode, depth: number, path: Set<string>) => {
      if (exceeded) return;
      if (depth > MAX_DEPTH) { exceeded = true; return; }
      for (const selection of selectionSet.selections) {
        if (exceeded) return;
        if (selection.kind === 'Field') {
          if (++fields > MAX_FIELDS) { exceeded = true; return; }
          if (selection.selectionSet) walk(selection.selectionSet, depth + 1, path);
        } else if (selection.kind === 'InlineFragment') {
          walk(selection.selectionSet, depth + 1, path);
        } else {
          const name = selection.name.value;
          const fragment = fragments.get(name);
          if (fragment && !path.has(name)) {
            path.add(name);
            walk(fragment.selectionSet, depth + 1, path);
            path.delete(name);
          }
        }
      }
    };
    walk(operation.selectionSet, 1, new Set());
    if (exceeded) context.reportError(new GraphQLError('GraphQL query exceeds the allowed depth or field count.', { nodes: operation }));
  },
});
