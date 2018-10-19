const StringArray = require('./stringArray');
const TYPED_ARRAY = Int32Array.__proto__;

module.exports = function inferArrayType(arr) {
  if (arr instanceof TYPED_ARRAY) {
    return Object.getPrototypeOf(arr).constructor;
  }

  let hasNegative = false,
      hasDecimal = false,
      hasString = false,
      largest = 0,
      smallest = 0;

  for (var i = 0; i < arr.length; i++) {
    let v = arr[i];
    if (!hasNegative && v < 0) hasNegative = true;
    if (!hasDecimal && v && !Number.isInteger(v)) hasDecimal = true;
    if (!hasString && typeof v === 'string') hasString = true;
    if (v > largest) largest = v;
    if (v < smallest) smallest = v;
  }

  if (hasString) {
    return StringArray;
  }
  if (hasDecimal) {
    return Float64Array;
  }
  else if (hasNegative) {
    if (smallest < -32768 || largest >= 32768) return Int32Array;
    if (smallest < -128 || largest >= 128) return Int16Array;
    return Int8Array;
  }
  else {
    if (largest >= 65536) return Uint32Array;
    if (largest >= 256) return Uint16Array;
    return Uint8Array;
  }
};