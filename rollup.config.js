import typescript from '@rollup/plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'src/app.ts',
  output: {
    dir: 'dist',
    format: 'iife',
    sourcemap: 'inline',
  },
  plugins: [
    typescript(),
    resolve({
      browser: true,
    }),
    commonjs(),
  ],
};