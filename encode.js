module.exports = function encode() {
  return async (version, arr, ResultType, resultTypeIndex, gzipPromise, options) => {
    const MAX_LOOKUP_SIZE = 255;
    let result = [new Uint8Array([version])];
    
    let flags = resultTypeIndex;

    //
    // decide if we are going to build a LUT or not, and transform the resulting array into Uint8Array
    //

    let resultSet = new Set(),
        lastValue = null,
        valuesSeen = 0,
        lookupMap = null,
        lookupTableArray = null;

    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== lastValue) {
        lastValue = arr[i];
        valuesSeen++;
        resultSet.add(lastValue); 
        if (resultSet.size > MAX_LOOKUP_SIZE) {
          resultSet = null;
          break;
        }
      }
    }

    // only use a lookup table if it makes sense
    if (resultSet && resultSet.size * 2 < valuesSeen) {
      let lookupArray = [...resultSet];
    
      lookupMap = lookupArray.reduce((acc, val, i) => {
        acc[val] = i;
        return acc;
      }, {});

      let oldArr = arr;
      arr = new Uint8Array(arr.length);
      for (let j = 0; j < arr.length; j++) {
        arr[j] = lookupMap[oldArr[j]];
      }

      result.push(new Uint8Array([flags | 128]));
      lookupTableArray =  new ResultType(lookupArray);

      ResultType = Uint8Array;
    }
    else {
      result.push(new Uint8Array([flags]));

      if (!(arr instanceof ResultType)) {
        arr = new ResultType([...arr]);
      }
    }
    
    let runs = [],
        valueArrays = [],
        maxRunLength = 0,
        minRunLength = 0;

    //
    // Actually encode
    //
    for (let i = 0; i < arr.length; i++) {
      // check to see if this is a run
      let currentValue = arr[i],
          endRunIndex = i + 1;
      
      for (; endRunIndex < arr.length; endRunIndex++) {
        if (arr[endRunIndex] !== currentValue) {
          break;
        }
      }

      let runLength = null,
          runArrayValue = null;

      // this is not a run, so see how many numbers are not a run
      if (endRunIndex === i + 1) {
        for (; endRunIndex < arr.length; endRunIndex++) {
          if (arr[endRunIndex] === arr[endRunIndex - 1]) {
            endRunIndex -= 1;
            break;
          }
        }

        runLength = -(endRunIndex - i);
        runArrayValue = new ResultType(arr.slice(i, endRunIndex));
      }
      // it is a run, so just include a count and the value
      else {
        runLength = endRunIndex - i;
        runArrayValue = new ResultType([currentValue]);
      }

      runs.push(runLength);
      valueArrays.push(runArrayValue);

      if (runLength > maxRunLength) {
        maxRunLength = runLength;
      }
      if (runLength < minRunLength) {
        minRunLength = runLength;
      }

      i = endRunIndex - 1;
    }

    // indicates the run lengths are done
    runs.push(0);

    let finalValueBuffer = null;
    if (ResultType.join) {
      finalValueBuffer = Buffer.from(ResultType.join(valueArrays).buffer);
    }
    else {
      finalValueBuffer = Buffer.concat(valueArrays.map(v => Buffer.from(v.buffer)));
    }
    
    // check to see if we should gzip the payload
    if (options.gzip !== false) {
      let originalBuffer = Buffer.from(arr.buffer);
      let originalBufferGZipped = await gzipPromise(originalBuffer);
      let valueArraysGzipped = await gzipPromise(finalValueBuffer);
      let threshold = 2000; // configurable?

      if ((originalBufferGZipped.length < valueArraysGzipped.length - threshold) &&
          (originalBufferGZipped.length < finalValueBuffer.length - threshold)) {

        // use one long run and skip most of the rle
        runs = [-arr.length, 0];
        minRunLength = -arr.length;
        maxRunLength = 0;
        finalValueBuffer = Buffer.concat([Buffer.from(new Uint32Array([originalBufferGZipped.length]).buffer), originalBufferGZipped]);

        // the result type is the second element in the array and is 1 uint8, so set the second highest bit indicating it's gzipped
        result[1][0] |= 64;
      }
      else if (valueArraysGzipped.length < finalValueBuffer.length - threshold) {

        // still use runs but gzip
        finalValueBuffer = Buffer.concat([Buffer.from(new Uint32Array([valueArraysGzipped.length]).buffer), valueArraysGzipped]);

        // the result type is the second element in the array and is 1 uint8, so set the second highest bit indicating it's gzipped
        result[1][0] |= 64;
      }
    }

    // figure out the data type to store our run lengths
    if (minRunLength < -32768 || maxRunLength >= 32768) {
      result.push(new Uint8Array([0])); // 32 bit array
      result.push(new Int32Array(runs));
    }
    else if (minRunLength < -128 || maxRunLength >= 128) {
      result.push(new Uint8Array([1])); // 16 bit array
      result.push(new Int16Array(runs));
    }
    else {
      result.push(new Uint8Array([2])); // 8 bit array
      result.push(new Int8Array(runs));
    }

    if (lookupTableArray) {
      result.push(new Uint8Array([lookupTableArray.length]));
      result.push(lookupTableArray);
    }

    result.push(new Uint8Array(finalValueBuffer));

    return Buffer.concat(result.map(d => Buffer.from(d.buffer)));
  };
};