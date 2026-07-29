/*
 |--------------------------------------------------------------------------
 | Supported Languages — single source of truth
 |--------------------------------------------------------------------------
 | The judge can only compile/run what the runner image ships with
 | (see Dockerfile.runner: g++, openjdk17, python3). JavaScript used to be
 | offered in the UI and stored on problems, but no execution backend exists
 | for it — every JS submission failed with "Unsupported language".
 |
 | Keep this list and the runner image in sync.
 */

const SUPPORTED_LANGUAGES = ["cpp", "java", "python"];

module.exports = { SUPPORTED_LANGUAGES };
