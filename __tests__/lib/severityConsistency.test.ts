/**
 * Guards #52: the severity a check emits on the audit card must agree with
 * the severity its explainer shows on /checks/<id>.
 *
 * Emitted severities are read statically from the check source with the
 * TypeScript AST, so every return path counts, not just the ones a fixture
 * happens to reach. For each object literal carrying `id: '<literal>'` and a
 * `severity` property we collect every severity that expression can produce:
 *   - a string literal                      -> that literal
 *   - `cond ? a : b`                        -> both branches
 *   - an identifier (incl. shorthand)       -> its initializer plus every
 *     `name = '<literal>'` assignment in the enclosing function
 * Results with a literal `passed: true` are skipped: those are "nothing to
 * report" returns and carry no user-facing severity. A check that never
 * fails (advisory only, e.g. conversion-delay-impact) is compared against its
 * passing severities instead.
 *
 * Several checks are context-dependent (e.g. critical for ecommerce, warning
 * for agencies). For those the explainer cannot equal a single value, so the
 * rule is: the explainer severity must be one of the severities the check can
 * emit on a non-passing result. A check that only ever emits one severity is
 * therefore held to exact equality.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';
import { checkRegistry } from '@/lib/checks/registry.generated';
import { getExplainerOrStub } from '@/lib/checks/explainers';

type Severity = 'critical' | 'warning' | 'info';
const SEVERITIES = new Set<string>(['critical', 'warning', 'info']);

const checksDir = join(__dirname, '..', '..', 'lib', 'checks');

function propName(p: ts.ObjectLiteralElementLike): string | undefined {
  if (!p.name) return undefined;
  if (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) return p.name.text;
  return undefined;
}

function enclosingFunction(node: ts.Node): ts.Node | undefined {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (ts.isFunctionLike(cur)) return cur;
    cur = cur.parent;
  }
  return undefined;
}

/** Every severity literal `expr` can evaluate to, or null if unresolvable. */
function severitiesOf(expr: ts.Expression, scope: ts.Node | undefined): Set<Severity> | null {
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr)) {
    return severitiesOf(expr.expression, scope);
  }
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return SEVERITIES.has(expr.text) ? new Set([expr.text as Severity]) : null;
  }
  if (ts.isConditionalExpression(expr)) {
    const a = severitiesOf(expr.whenTrue, scope);
    const b = severitiesOf(expr.whenFalse, scope);
    return a && b ? new Set([...a, ...b]) : null;
  }
  if (ts.isIdentifier(expr) && scope) {
    const name = expr.text;
    const out = new Set<Severity>();
    let unresolved = false;
    let found = false;
    const visit = (n: ts.Node) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer) {
        found = true;
        const s = severitiesOf(n.initializer, scope);
        if (s) s.forEach((v) => out.add(v));
        else unresolved = true;
      }
      if (
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(n.left) &&
        n.left.text === name
      ) {
        found = true;
        const s = severitiesOf(n.right, scope);
        if (s) s.forEach((v) => out.add(v));
        else unresolved = true;
      }
      ts.forEachChild(n, visit);
    };
    visit(scope);
    return found && !unresolved ? out : null;
  }
  return null;
}

interface Extraction {
  /** Severities per ID on non-passing results (falls back to passing ones). */
  emitted: Map<string, Set<Severity>>;
  unresolved: string[];
}

function extractEmittedSeverities(): Extraction {
  const failing = new Map<string, Set<Severity>>();
  const passing = new Map<string, Set<Severity>>();
  const unresolved: string[] = [];
  const files = readdirSync(checksDir).filter((f) => /Checks\.ts$/.test(f)).sort();

  for (const file of files) {
    const text = readFileSync(join(checksDir, file), 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const props = new Map<string, ts.ObjectLiteralElementLike>();
        node.properties.forEach((p) => {
          const n = propName(p);
          if (n) props.set(n, p);
        });
        const idProp = props.get('id');
        const sevProp = props.get('severity');
        const passedProp = props.get('passed');
        if (
          idProp &&
          ts.isPropertyAssignment(idProp) &&
          ts.isStringLiteral(idProp.initializer) &&
          sevProp
        ) {
          const id = idProp.initializer.text;
          const alwaysPasses =
            passedProp !== undefined &&
            ts.isPropertyAssignment(passedProp) &&
            passedProp.initializer.kind === ts.SyntaxKind.TrueKeyword;
          const bucket = alwaysPasses ? passing : failing;
          if (!bucket.has(id)) bucket.set(id, new Set());
          const sevExpr = ts.isShorthandPropertyAssignment(sevProp)
            ? sevProp.name
            : ts.isPropertyAssignment(sevProp)
              ? sevProp.initializer
              : undefined;
          const s = sevExpr ? severitiesOf(sevExpr, enclosingFunction(node)) : null;
          if (s) s.forEach((v) => bucket.get(id)!.add(v));
          else {
            const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
            unresolved.push(`${file}:${line + 1} (${id})`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  const emitted = new Map<string, Set<Severity>>();
  for (const id of new Set([...failing.keys(), ...passing.keys()])) {
    const f = failing.get(id);
    emitted.set(id, f && f.size > 0 ? f : (passing.get(id) ?? new Set()));
  }
  return { emitted, unresolved };
}

describe('check severity consistency (#52)', () => {
  const { emitted, unresolved } = extractEmittedSeverities();

  it('can statically resolve every emitted severity', () => {
    // If this fails, a check computes severity in a way the extractor does not
    // understand. Extend severitiesOf() rather than skipping the check.
    expect(unresolved).toEqual([]);
  });

  it('finds an emitted severity for every registry ID', () => {
    const missing = checkRegistry
      .filter((entry) => (emitted.get(entry.id)?.size ?? 0) === 0)
      .map((entry) => entry.id);
    expect(missing).toEqual([]);
  });

  it('explainer severity is one the check actually emits, for every registry ID', () => {
    const mismatches = checkRegistry.flatMap((entry) => {
      const explainer = getExplainerOrStub(entry.id);
      const emits = emitted.get(entry.id);
      if (!explainer || !emits || emits.size === 0) return [];
      if (emits.has(explainer.severity)) return [];
      return [`${entry.id}: explainer=${explainer.severity}, emits=${[...emits].sort().join('|')}`];
    });
    expect(mismatches).toEqual([]);
  });

  it('flags struct-counting-category-mismatch as a single, agreed severity', () => {
    const emits = [...(emitted.get('struct-counting-category-mismatch') ?? [])];
    expect(emits).toHaveLength(1);
    expect(getExplainerOrStub('struct-counting-category-mismatch')?.severity).toBe(emits[0]);
  });
});
