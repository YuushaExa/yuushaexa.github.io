import { nodeResolve } from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-import-css';

export default {
  input: 'src/codeMirror.js',
  output: {
    file: 'public/codeMirror/codeMirror.bundle.js',
    format: 'iife',
    name: 'CodeMirrorBundle',
  },
  plugins: [
    nodeResolve(),
    css({
      output: '/codeMirror.bundle.css', 
    }),
  ],
};
