import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const plugins = [nodeResolve(), terser({ format: { comments: false } })];

export default [
  {
    input: 'src/bundle.js',
    output: { file: 'dist/chit-ui.min.js', format: 'es', sourcemap: true },
    plugins,
  },
  {
    input: 'src/bundle.js',
    output: { file: 'dist/chit-ui.iife.min.js', format: 'iife', name: 'ChitUI', sourcemap: true },
    plugins,
  },
];
