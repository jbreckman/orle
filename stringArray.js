const variableLengthInteger = require('./variableLengthInteger');

module.exports = class StringArray extends Array {
  constructor(o, offset, toRead) {
    if (Array.isArray(o)) {
      super(o.length);

      let s = o.length === 1 ? Buffer.from(String(o[0])) : Buffer.from(JSON.stringify(o));
      this.buffer = Buffer.concat([variableLengthInteger.encode(s.length), s]);
      this.bytes = this.buffer.length;
      for (var i = 0; i < o.length; i++) {
        this[i] = o[i];
      }
    }
    else if (o instanceof ArrayBuffer) {
      super(toRead);
      o = Buffer.from(o);
      this.buffer = o;
      let length = variableLengthInteger.decode(o, offset);
      let lengthBytes = variableLengthInteger.byteCount(length);
      let s = String(o.slice(offset + lengthBytes, lengthBytes + offset + length));
      this.bytes = lengthBytes + length;

      if (toRead === 1) {
        this[0] = s;
      }
      else {
        let arr = JSON.parse(s);
        for (var i = 0; i < arr.length; i++) {
          this[i] = arr[i];
        }
      }
    }
    else if (Number.isFinite(o)) {
      super(o);
    }
    else {
      throw 'INVALID';
    }
  }
};