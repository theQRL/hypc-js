import assert from 'assert';

import { isNil } from '../common/helpers';
import { bindHypcMethod } from './helpers';

export function setupCompile (hypJson, core) {
  return {
    compileJson: bindCompileJson(hypJson),
    compileJsonCallback: bindCompileJsonCallback(hypJson, core),
    compileJsonMulti: bindCompileJsonMulti(hypJson),
    compileStandard: bindCompileStandard(hypJson, core)
  };
}

/**********************
 * COMPILE
 **********************/

/**
 * Returns a binding to the hyperion compileJSON method.
 * input (text), optimize (bool) -> output (jsontext)
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 */
function bindCompileJson (hypJson) {
  return bindHypcMethod(
    hypJson,
    'compileJSON',
    'string',
    ['string', 'number'],
    null
  );
}

/**
 * Returns a binding to the hyperion compileJSONMulti method.
 * input (jsontext), optimize (bool) -> output (jsontext)
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 */
function bindCompileJsonMulti (hypJson) {
  return bindHypcMethod(
    hypJson,
    'compileJSONMulti',
    'string',
    ['string', 'number'],
    null
  );
}

/**
 * Returns a binding to the hyperion compileJSONCallback method.
 * input (jsontext), optimize (bool), callback (ptr) -> output (jsontext)
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 * @param coreBindings The core bound Hyperion methods.
 */
function bindCompileJsonCallback (hypJson, coreBindings) {
  const compileInternal = bindHypcMethod(
    hypJson,
    'compileJSONCallback',
    'string',
    ['string', 'number', 'number'],
    null
  );

  if (isNil(compileInternal)) return null;

  return function (input, optimize, readCallback) {
    return runWithCallbacks(hypJson, coreBindings, readCallback, compileInternal, [input, optimize]);
  };
}

/**
 * Returns a binding to the hyperion hyperion_compile method with a fallback to
 * compileStandard.
 * input (jsontext), callback (optional >= v6 only - ptr) -> output (jsontext)
 *
 * @param hypJson The Emscripten compiled Hyperion object.
 * @param coreBindings The core bound Hyperion methods.
 */
function bindCompileStandard (hypJson, coreBindings) {
  let boundFunctionStandard: any = null;
  let boundFunctionHyperion: any = null;

  // input (jsontext), callback (ptr) -> output (jsontext)
  const compileInternal = bindHypcMethod(
    hypJson,
    'compileStandard',
    'string',
    ['string', 'number'],
    null
  );

  if (coreBindings.isVersion6OrNewer) {
    // input (jsontext), callback (ptr), callback_context (ptr) -> output (jsontext)
    boundFunctionHyperion = bindHypcMethod(
      hypJson,
      'hyperion_compile',
      'string',
      ['string', 'number', 'number'],
      null
    );
  } else {
    // input (jsontext), callback (ptr) -> output (jsontext)
    boundFunctionHyperion = bindHypcMethod(
      hypJson,
      'hyperion_compile',
      'string',
      ['string', 'number'],
      null
    );
  }

  if (!isNil(compileInternal)) {
    boundFunctionStandard = function (input, readCallback) {
      return runWithCallbacks(hypJson, coreBindings, readCallback, compileInternal, [input]);
    };
  }

  if (!isNil(boundFunctionHyperion)) {
    boundFunctionStandard = function (input, callbacks) {
      return runWithCallbacks(hypJson, coreBindings, callbacks, boundFunctionHyperion, [input]);
    };
  }

  return boundFunctionStandard;
}

/**********************
 * CALL BACKS
 **********************/

function wrapCallback (coreBindings, callback) {
  assert(typeof callback === 'function', 'Invalid callback specified.');

  return function (data, contents, error) {
    const result = callback(coreBindings.copyFromCString(data));
    if (typeof result.contents === 'string') {
      coreBindings.copyToCString(result.contents, contents);
    }
    if (typeof result.error === 'string') {
      coreBindings.copyToCString(result.error, error);
    }
  };
}

function wrapCallbackWithKind (coreBindings, callback) {
  assert(typeof callback === 'function', 'Invalid callback specified.');

  return function (context, kind, data, contents, error) {
    // Must be a null pointer.
    assert(context === 0, 'Callback context must be null.');
    const result = callback(coreBindings.copyFromCString(kind), coreBindings.copyFromCString(data));
    if (typeof result.contents === 'string') {
      coreBindings.copyToCString(result.contents, contents);
    }
    if (typeof result.error === 'string') {
      coreBindings.copyToCString(result.error, error);
    }
  };
}

// calls compile() with args || cb
function runWithCallbacks (hypJson, coreBindings, callbacks, compile, args) {
  if (callbacks) {
    assert(typeof callbacks === 'object', 'Invalid callback object specified.');
  } else {
    callbacks = {};
  }

  let readCallback = callbacks.import;
  if (readCallback === undefined) {
    readCallback = function (data) {
      return {
        error: 'File import callback not supported'
      };
    };
  }

  let singleCallback;
  if (coreBindings.isVersion6OrNewer) {
    // After 0.6.x multiple kind of callbacks are supported.
    let smtSolverCallback = callbacks.smtSolver;
    if (smtSolverCallback === undefined) {
      smtSolverCallback = function (data) {
        return {
          error: 'SMT solver callback not supported'
        };
      };
    }

    singleCallback = function (kind, data) {
      if (kind === 'source') {
        return readCallback(data);
      } else if (kind === 'smt-query') {
        return smtSolverCallback(data);
      } else {
        assert(false, 'Invalid callback kind specified.');
      }
    };

    singleCallback = wrapCallbackWithKind(coreBindings, singleCallback);
  } else {
    // Old Solidity version only supported imports.
    singleCallback = wrapCallback(coreBindings, readCallback);
  }

  const cb = coreBindings.addFunction(singleCallback, 'viiiii');
  let output;
  try {
    args.push(cb);
    if (coreBindings.isVersion6OrNewer) {
      // Callback context.
      args.push(null);
    }

    output = compile(...args);
  } finally {
    coreBindings.removeFunction(cb);
  }

  if (coreBindings.reset) {
    // Explicitly free memory.
    //
    // NOTE: cwrap() of "compile" will copy the returned pointer into a
    //       Javascript string and it is not possible to call free() on it.
    //       reset() however will clear up all allocations.
    coreBindings.reset();
  }
  return output;
}
