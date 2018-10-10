const StringArray = require('./stringArray');
const DATA_TYPE_LOOKUP = [ Int32Array, Int16Array, Int8Array, Uint32Array, Uint16Array, Uint8Array, Float32Array, Float64Array, StringArray ];
const TYPED_ARRAY = Int32Array.__proto__;

function inferArrayType(arr) {
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
    if (!hasDecimal && !Number.isInteger(v)) hasDecimal = true;
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
}

module.exports = {
  encode: (arr)  => {
    let ResultType = inferArrayType(arr);
    
    let result = [];
    result.push(new Int32Array([arr.length]));
    result.push(new Int8Array([DATA_TYPE_LOOKUP.indexOf(ResultType)]));

    for (var i = 0; i < arr.length; i++) {
      // check to see if this is a run
      let currentValue = arr[i],
          endRunIndex = i + 1;
      
      for (; endRunIndex < arr.length; endRunIndex++) {
        if (arr[endRunIndex] !== currentValue) {
          break;
        }
      }

      // this is not a run, so see how many numbers are not a run
      if (endRunIndex === i + 1) {
        for (; endRunIndex < arr.length; endRunIndex++) {
          if (arr[endRunIndex] === arr[endRunIndex - 1]) {
            endRunIndex -= 1;
            break;
          }
        }

        result.push(new Int32Array([-(endRunIndex - i)]));
        result.push(new ResultType([...arr.slice(i, endRunIndex)]));
      }
      // it is a run, so just include a count and the value
      else {
        result.push(new Int32Array([endRunIndex - i]));
        result.push(new ResultType([currentValue]));
      }
      i = endRunIndex - 1;
    }

    return Buffer.concat(result.map(d => Buffer.from(d.buffer)));
  },
  decode: (buffer) => {
    var length = buffer.readInt32LE(0),
        ArrayType = DATA_TYPE_LOOKUP[buffer.readUInt8(4)];

    buffer = buffer.slice(5);
    var ind = 0,
        result = new ArrayType(length);
    
    var resultIndex = 0;
    while (resultIndex < length) {
      let counter = buffer.readInt32LE(ind);
      ind += 4;

      let toRead = -counter;
      if (counter > 0) {
        toRead = 1;
      }

      let arr = new ArrayType(new Uint8Array(buffer.slice(ind)).buffer, 0, toRead);
      ind += arr.bytes || (arr.BYTES_PER_ELEMENT * arr.length);

      if (counter > 0) {
        let currentValue = arr[0],
            endIndex = resultIndex + counter;
        for (; resultIndex < endIndex; resultIndex++) {
          result[resultIndex] = currentValue;
        }
      }
      else {
        let endIndex = resultIndex - counter,
            c = 0;
        for (; resultIndex < endIndex; resultIndex++) {
          result[resultIndex] = arr[c++];
        }
      }

    }    
    
    return result;
  }
};