const MAX_VALUE = 1<<30, SHIFT_SEVEN = 1<<7 ; // things get wonky after this point... plus it's a pretty huge number.

module.exports = {
  byteCount: function(value) {
    let boundary = 1 << 6,
        bytes = 1;
    value = value < 0 ? -value : value;
    while (value >= boundary) {
      if (bytes <= 3) {
        boundary <<= 7;
      }
      else {
        boundary *= SHIFT_SEVEN;
      }
      bytes++;
    }
    return bytes;
  },
  encode: function(value) {
    if (value > MAX_VALUE || value < -MAX_VALUE || !Number.isInteger(value)) {
      throw 'INVALID';
    }

    var res = [],
        mask = 63,
        shift = 6,
        isNegative = false;

    if (value < 0) {
      isNegative = true;
      value = -value;
    }
    else if (value === 0) {
      return Buffer.from(new Uint8Array([0]).buffer);
    }
  
    while (value > 0) {
      let p = value & mask;
      p <<= 1;
      value >>= shift;
      if (value > 0) {
        p |= 1;
      }

      if (res.length === 0) {
        mask = 127;
        shift = 7;
        if (isNegative) {
          p |= 128;
        }
      }
      res.push(p);
    }
  
    return Buffer.from(new Uint8Array(res).buffer);
  },
  decode: function(buffer, offset) {
    var isNegative = false,
        value = 0,
        toShift = 0;

    while (true) {
      let byte = buffer.readUInt8(offset);

      if (byte === 0 && toShift === 0) {
        return 0;
      }

      // if this is the first byte, check the negative bit
      if (toShift === 0) {
        if (byte & 128) {
          isNegative = true;
          byte &= 127;
        }
      }

      let hasMore = byte & 1;

      value += byte >> 1 << toShift;
      toShift += toShift ? 7 : 6;

      if (!hasMore) {
        break;
      }
      offset++;
    }

    return isNegative ? -value : value; 
  }
};