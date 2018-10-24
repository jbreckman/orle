module.exports = function decode() {
  return async (buffer, hasLUT, ArrayType, isGzipped, gunzipPromise) => {
    let bytesPerElement = ArrayType.BYTES_PER_ELEMENT,
        runsType = buffer.readUInt8(2),   // find the "runs" length type
        FinalType = ArrayType,
        lut = null,
        runs = null;

    // 3 bytes of headers
    buffer = buffer.slice(3);

    if (runsType === 0) { // int32 runs
      runs = new Int32Array(new Int8Array(buffer).buffer, 0, Math.floor(buffer.length / 4));
    }
    else if (runsType === 1) {
      runs = new Int16Array(new Int8Array(buffer).buffer, 0, Math.floor(buffer.length / 2));
    }
    else if (runsType === 2) {
      runs = new Int8Array(buffer);
    }

    // find the size of runs, plus the total number of elements we'll be reading,
    // and the total number of final elements in the final array
    let totalFinalElements = 0,
        arrayToReadSize = 0,
        totalRunElements = 0;
    for (let i = 0; i < runs.length; i++) {
      let runAmount = runs[i];
      if (runAmount > 0) {
        arrayToReadSize++;
        totalFinalElements += runAmount;
      }
      else if (runAmount < 0) {
        arrayToReadSize -= runAmount;
        totalFinalElements -= runAmount;
      }
      else {
        totalRunElements = i+1;
        break;
      }
    }

    // trim off our runs
    buffer = buffer.slice(runs.BYTES_PER_ELEMENT * totalRunElements);

    // read our lookup table (if needed)
    if (hasLUT) {
      let lutSize = buffer.readUInt8(0);
      lut = new ArrayType(new Uint8Array(buffer.slice(1)).buffer, 0, lutSize);
      buffer = buffer.slice(1 + (lut.bytes || (bytesPerElement * lut.length)));
      ArrayType = Uint8Array;
      bytesPerElement = 1;
    }

    if (isGzipped) {
      let gzipBufferSize = buffer.readUInt32LE(0);
      let gzippedBuffer = buffer.slice(4, 4+gzipBufferSize);
      buffer = await gunzipPromise(gzippedBuffer);
    }

    // actually decode the runs
    let arr = new ArrayType(new Uint8Array(buffer).buffer, 0, arrayToReadSize), 
        result = new ArrayType(totalFinalElements),
        ind = 0,
        resultIndex = 0;

    if (totalRunElements === 2 && runs[0] < 0) {
      result = arr;
    }
    else {
      for (let i = 0; i < totalRunElements - 1; i++) {
        let counter = runs[i];

        if (counter > 0) {
          let currentValue = arr[ind++],
              endIndex = resultIndex + counter;
          for (; resultIndex < endIndex; resultIndex++) {
            result[resultIndex] = currentValue;
          }
        }
        else {
          let endIndex = resultIndex - counter;
          for (; resultIndex < endIndex; resultIndex++) {
            result[resultIndex] = arr[ind++];
          }
        }
      }
    }

    // if there is a lookup table, bring it back
    if (hasLUT) {
      let realResult = new FinalType(result.length);
      for (let i = 0; i < realResult.length; i++) {
        realResult[i] = lut[result[i]];
      }
      return realResult;
    }
    
    return result;
  };
};
