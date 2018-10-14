module.exports = function encode() {
  return (arr, VLI, ResultType, resultTypeIndex) => {
    const MAX_LOOKUP_SIZE = 255;
    let result = [];
    result.push(new Uint32Array([arr.length]));

    let flags = resultTypeIndex;

    //
    // decide if we are going to build a LUT or not, and transform the resulting array into Uint8Array
    //

    let resultSet = new Set(),
        lastValue = null,
        valuesSeen = 0,
        lookupMap = null;

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

      result.push(new Uint8Array([flags | 128, lookupArray.length]));
      result.push(new ResultType(lookupArray));

      ResultType = Uint8Array;
    }
    else {
      result.push(new Uint8Array([flags]));

      if (!(arr instanceof ResultType)) {
        arr = new ResultType([...arr]);
      }
    }

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

      // this is not a run, so see how many numbers are not a run
      if (endRunIndex === i + 1) {
        for (; endRunIndex < arr.length; endRunIndex++) {
          if (arr[endRunIndex] === arr[endRunIndex - 1]) {
            endRunIndex -= 1;
            break;
          }
        }

        result.push(new Uint8Array(VLI.encode(-(endRunIndex - i))));
        result.push(new ResultType(arr.slice(i, endRunIndex)));
      }
      // it is a run, so just include a count and the value
      else {
        result.push(new Uint8Array(VLI.encode(endRunIndex - i)));
        result.push(new ResultType([currentValue]));
      }
      i = endRunIndex - 1;
    }

    return Buffer.concat(result.map(d => Buffer.from(d.buffer)));
  };
};