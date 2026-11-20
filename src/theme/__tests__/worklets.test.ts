import { describe, expect, it } from '@jest/globals';

// TypeScript's compiler, to read the source (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ts = require('typescript') as typeof import('typescript');

/*
 * Animation worklets run on the UI thread. A worklet that calls one of the app's own plain functions (one without a
 * 'worklet' directive) throws there, and on iOS that closes the app; on the web, where everything runs on one thread,
 * it works, so the web QA can't catch it. (The health question's rows did this and crashed Expo Go as set-up opened.)
 * This finds every worklet (a 'worklet' function, or the callback of useAnimatedStyle and its kin) and fails on any
 * call in it to a function from src/ that isn't a worklet. Values made by Reanimated (Easing.bezierFn) are fine.
 */
const HOOKS = new Set([
  'useAnimatedStyle',
  'useAnimatedProps',
  'useDerivedValue',
  'useAnimatedReaction',
  'useAnimatedScrollHandler',
  'useFrameCallback',
  'runOnUI',
  'scheduleOnUI',
]);

type Fn = import('typescript').FunctionLikeDeclaration;
const isWorklet = (fn: Fn) => {
  const first = fn.body && ts.isBlock(fn.body) ? fn.body.statements[0] : undefined;
  return (
    !!first &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === 'worklet'
  );
};
/** The function a declaration names, if it is a function written in the source. */
function functionOf(d: import('typescript').Declaration): Fn | null {
  if (ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d)) return d;
  if (
    ts.isVariableDeclaration(d) &&
    d.initializer &&
    (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))
  )
    return d.initializer;
  return null;
}

function problems(): string[] {
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config;
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd());
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const found: string[] = [];
  const inApp = (file: string) =>
    file.includes('/src/') && !file.includes('node_modules') && !file.includes('__tests__');

  const check = (root: import('typescript').Node, sf: import('typescript').SourceFile) => {
    const visit = (n: import('typescript').Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        let sym = checker.getSymbolAtLocation(n.expression);
        if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
        const d = sym?.declarations?.[0];
        // Defined inside the worklet itself, or outside the app (React Native, Reanimated): not ours to check.
        if (d && inApp(d.getSourceFile().fileName) && !(d.pos >= root.pos && d.end <= root.end)) {
          const fn = functionOf(d);
          if (fn && !isWorklet(fn)) {
            const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
            found.push(`${sf.fileName.slice(sf.fileName.indexOf('src/'))}:${line} calls ${n.expression.text}()`);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(root);
  };

  for (const sf of program.getSourceFiles()) {
    if (!inApp(sf.fileName)) continue;
    const walk = (n: import('typescript').Node) => {
      if (
        (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) &&
        n.body &&
        isWorklet(n)
      )
        check(n.body, sf);
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && HOOKS.has(n.expression.text))
        for (const a of n.arguments) if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) check(a.body, sf);
      ts.forEachChild(n, walk);
    };
    walk(sf);
  }
  return [...new Set(found)];
}

describe('animation worklets', () => {
  it('call only worklets from the app’s own code (anything else crashes iOS)', () => {
    expect(problems()).toEqual([]);
  }, 120_000);
});
