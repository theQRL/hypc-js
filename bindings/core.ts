import { bindHypcMethod, bindHypcMethodWithFallbackFunc } from './helpers';
import translate from '../translate';
import * as semver from 'semver';
import { isNil } from '../common/helpers';

export function setupCore (hypJson) {
  const core = {
    alloc: bindAlloc(hypJson),
    license: bindLicense(hypJson),
    version: bindVersion(hypJson),
    reset: bindReset(hypJson)
  };

  const helpers = {
    addFunction: unboundAddFunction.bind(this, hypJson),
    removeFunction: unboundRemoveFunction.bind(this, hypJson),

    copyFromCString: unboundCopyFromCString.bind(this, hypJson),
    copyToCString: unboundCopyToCString.bind(this, hypJson, core.alloc),

    // @ts-ignore
    versionToSemver: versionToSemver(core.version())
  };

  return {
    ...core,
    ...helpers,

    isVersion6OrNewer: semver.gt(helpers.versionToSemver(), '0.5.99')
  };
}

/**********************
 * Core Functions
 **********************/

/**
 * Returns a binding to the hyperion_alloc function.
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 */
function bindAlloc (hypJson) {
  const allocBinding = bindHypcMethod(
    hypJson,
    'hyperion_alloc',
    'number',
    ['number'],
    null
  );

  // the fallback malloc is not a cwrap function and should just be returned
  // directly in-case the alloc binding could not happen.
  if (isNil(allocBinding)) {
    return hypJson._malloc;
  }

  return allocBinding;
}

/**
 * Returns a binding to the hyperion_version method.
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 */
function bindVersion (hypJson) {
  return bindHypcMethodWithFallbackFunc(
    hypJson,
    'hyperion_version',
    'string',
    [],
    'version'
  );
}

function versionToSemver (version) {
  return translate.versionToSemver.bind(this, version);
}

/**
 * Returns a binding to the hyperion_license method.
 *
 * If the current hypJson version < 0.4.14 then this will bind an empty function.
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 */
function bindLicense (hypJson) {
  return bindHypcMethodWithFallbackFunc(
    hypJson,
    'hyperion_license',
    'string',
    [],
    'license',
    () => {
    }
  );
}

/**
 * Returns a binding to the hyperion_reset method.
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 */
function bindReset (hypJson) {
  return bindHypcMethod(
    hypJson,
    'hyperion_reset',
    null,
    [],
    null
  );
}

/**********************
 * Helpers Functions
 **********************/

/**
 * Copy to a C string.
 *
 * Allocates memory using hypc's allocator.
 *
 * Before 0.6.0:
 *   Assuming copyToCString is only used in the context of wrapCallback, hypc will free these pointers.
 *   See https://github.com/ethereum/hyperion/blob/v0.5.13/libsolc/libsolc.h#L37-L40
 *
 * After 0.6.0:
 *   The duty is on hypc-js to free these pointers. We accomplish that by calling `reset` at the end.
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 * @param alloc The memory allocation function.
 * @param str The source string being copied to a C string.
 * @param ptr The pointer location where the C string will be set.
 */
function unboundCopyToCString (hypJson, alloc, str, ptr) {
  const length = hypJson.lengthBytesUTF8(str);

  const buffer = alloc(length + 1);

  hypJson.stringToUTF8(str, buffer, length + 1);
  hypJson.setValue(ptr, buffer, '*');
}

/**
 * Wrapper over Emscripten's C String copying function (which can be different
 * on different versions).
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 * @param ptr The pointer location where the C string will be referenced.
 */
function unboundCopyFromCString (hypJson, ptr) {
  const copyFromCString = hypJson.UTF8ToString || hypJson.Pointer_stringify;
  return copyFromCString(ptr);
}

function unboundAddFunction (hypJson, func, signature?) {
  return (hypJson.addFunction || hypJson.Runtime.addFunction)(func, signature);
}

function unboundRemoveFunction (hypJson, ptr) {
  return (hypJson.removeFunction || hypJson.Runtime.removeFunction)(ptr);
}
