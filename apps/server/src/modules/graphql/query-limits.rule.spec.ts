import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { queryLimitsRule } from './query-limits.rule.js';

const { buildSchema, getIntrospectionQuery, parse, validate } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const schema = buildSchema('type Query { node: Node, text: String } type Node { node: Node, value: String }');

describe('GraphQL query limits', () => {
  it('allows ordinary queries', () => {
    expect(validate(schema, parse('{ node { value } }'), [queryLimitsRule])).toEqual([]);
    expect(validate(schema, parse(getIntrospectionQuery()), [queryLimitsRule])).toEqual([]);
  });

  it('rejects deeply nested selections', () => {
    const query = `{ ${'node { '.repeat(21)} value ${'} '.repeat(21)} }`;
    expect(validate(schema, parse(query), [queryLimitsRule])).toHaveLength(1);
  });

  it('counts repeated fragment expansions', () => {
    const query = `query { ${'...Fields '.repeat(1001)} } fragment Fields on Query { text }`;
    expect(validate(schema, parse(query), [queryLimitsRule])).toHaveLength(1);
  });
});
