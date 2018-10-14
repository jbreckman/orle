module.exports = function decode() {
  return (buffer, VLI, hasLUT, ArrayType) => {
    var length = buffer.readUInt32LE(0),
        bytesPerElement = ArrayType.BYTES_PER_ELEMENT,
        FinalType = ArrayType,
        lut = null;

    buffer = buffer.slice(5);

    if (hasLUT) {
      let lutSize = buffer.readUInt8(0);
      lut = new ArrayType(new Uint8Array(buffer.slice(1)).buffer, 0, lutSize);
      buffer = buffer.slice(1 + (lut.bytes || (bytesPerElement * lut.length)));
      ArrayType = Uint8Array;
      bytesPerElement = 1;
    }

    var ind = 0,
        result = new ArrayType(length),
        arrayBuffer = new Uint8Array(buffer).buffer,
        arrayBufferOffsetLookup = [];
    
    var resultIndex = 0;
    while (resultIndex < length) {

      let counter = VLI.decode(buffer, ind);
      ind += VLI.byteCount(counter);

      let toRead = -counter;
      if (counter > 0) {
        toRead = 1;
      }

      let arrayBufferToUse = arrayBuffer,
          byteRemainder = 0;

      // new Uint32Array(buffer, 3, 1) will fail since it isn't an offset of 4,
      // so we have to reallocate an array with the appropriate offsets
      if (bytesPerElement && bytesPerElement > 1) {
        byteRemainder = ind % bytesPerElement;
        if (byteRemainder > 0) {
          byteRemainder = bytesPerElement - byteRemainder;
          arrayBufferToUse = arrayBufferOffsetLookup[byteRemainder];
          if (!arrayBufferToUse) {
            arrayBufferToUse = arrayBufferOffsetLookup[byteRemainder] = 
              // this is so crazy
              new Uint8Array(Buffer.concat([Buffer.alloc(byteRemainder), Buffer.from(arrayBuffer)])).buffer;
          }
        }
      }

      let arr = new ArrayType(arrayBufferToUse, ind + byteRemainder, toRead);
      ind += arr.bytes || (bytesPerElement * arr.length);

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

    if (hasLUT) {
      let realResult = new FinalType(result.length);
      for (var i = 0; i < realResult.length; i++) {
        realResult[i] = lut[result[i]];
      }
      return realResult;
    }
    
    return result;
  };
};
