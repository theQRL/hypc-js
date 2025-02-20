import { setupCore } from './core';
import { getSupportedMethods } from './helpers';
import { setupCompile } from './compile';

export default function setupBindings (hypJson) {
  const coreBindings = setupCore(hypJson);
  const compileBindings = setupCompile(hypJson, coreBindings);
  const methodFlags = getSupportedMethods(hypJson);

  return {
    methodFlags,
    coreBindings,
    compileBindings
  };
}
