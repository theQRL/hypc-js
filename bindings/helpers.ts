import { isNil } from '../common/helpers';

export function bindHypcMethod (hypJson, method, returnType, args, defaultValue) {
  if (isNil(hypJson[`_${method}`]) && defaultValue !== undefined) {
    return defaultValue;
  }

  return hypJson.cwrap(method, returnType, args);
}

export function bindHypcMethodWithFallbackFunc (hypJson, method, returnType, args, fallbackMethod, finalFallback = undefined) {
  const methodFunc = bindHypcMethod(hypJson, method, returnType, args, null);

  if (!isNil(methodFunc)) {
    return methodFunc;
  }

  return bindHypcMethod(hypJson, fallbackMethod, returnType, args, finalFallback);
}

export function getSupportedMethods (hypJson) {
  return {
    licenseSupported: anyMethodExists(hypJson, 'hyperion_license'),
    versionSupported: anyMethodExists(hypJson, 'hyperion_version'),
    allocSupported: anyMethodExists(hypJson, 'hyperion_alloc'),
    resetSupported: anyMethodExists(hypJson, 'hyperion_reset'),
    compileJsonSupported: anyMethodExists(hypJson, 'compileJSON'),
    compileJsonMultiSupported: anyMethodExists(hypJson, 'compileJSONMulti'),
    compileJsonCallbackSuppported: anyMethodExists(hypJson, 'compileJSONCallback'),
    compileJsonStandardSupported: anyMethodExists(hypJson, 'compileStandard', 'hyperion_compile')
  };
}

function anyMethodExists (hypJson, ...names) {
  return names.some(name => !isNil(hypJson[`_${name}`]));
}
