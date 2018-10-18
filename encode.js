module.exports = function encode() {
  return (version, arr, ResultType, resultTypeIndex) => {
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

    if (ResultType.join) {
      result.push(ResultType.join(valueArrays));
    }
    else {
      result = result.concat(valueArrays);
    }

    return Buffer.concat(result.map(d => Buffer.from(d.buffer)));
  };
};