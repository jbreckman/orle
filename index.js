const StringArray = require('./stringArray');
const inferArrayType = require('./inferArrayType');
const decode = require('./decode');
const encode = require('./encode');
const vm = require('vm');
const DATA_TYPE_LOOKUP = [ Int32Array, Int16Array, Int8Array, Uint32Array, Uint16Array, Uint8Array, Float32Array, Float64Array, StringArray ];
const ENCODE_OPTIMIZATION_FN = [];
const DECODE_OPTIMIZATION_FN = [];

function typeOptimizedFunction(cache, index, originalFn) {
  // v8 optimization does quite poorly if different array types
  // are used for the same execution of the same function.
  // this forces v8 to treat each array type as a separately
  // optimized function
  let fn = cache[index];
  if (!fn) {
    fn = cache[index] = vm.runInThisContext(`(${originalFn.toString()})()`);
  }
  return fn;
}

module.exports = {
  encode: (arr)  => {
    let ResultType = inferArrayType(arr),
        resultTypeIndex = DATA_TYPE_LOOKUP.indexOf(ResultType);
    return typeOptimizedFunction(ENCODE_OPTIMIZATION_FN, resultTypeIndex, encode)(arr, ResultType, resultTypeIndex);
  },
  decode: (buffer) => {
    var arrayTypeIndex = buffer.readUInt8(4),
        hasLUT = false;

    if (arrayTypeIndex & 128) {
      hasLUT = true;
      arrayTypeIndex &= 127;
    }

    var ArrayType = DATA_TYPE_LOOKUP[arrayTypeIndex];
    
    return typeOptimizedFunction(DECODE_OPTIMIZATION_FN, arrayTypeIndex, decode)(buffer, hasLUT, ArrayType);
  }
};