module.exports = class StringArray extends Array {

  static join(arr) {
    return new StringArray([].concat.apply([], arr));
  }

  constructor(o, offset, toRead) {
    if (Array.isArray(o)) {
      super(o.length);
      let s = Buffer.from(JSON.stringify(o));
      this.buffer = Buffer.concat([Buffer.from(new Uint32Array([s.length]).buffer), s]);
      this.bytes = this.buffer.length;
      for (let i = 0; i < o.length; i++) {
        this[i] = o[i];
      }
    }
    else if (o instanceof ArrayBuffer) {
      o = Buffer.from(o);
      let length = o.readUInt32LE(offset);
      let s = String(o.slice(offset + 4, 4 + offset + length));
      let arr = JSON.parse(s);
      super(...arr);
      this.buffer = o;
      this.bytes = 4 + length;
    }
    else if (Number.isFinite(o)) {
      super(o);
    }
    else {
      throw 'INVALID';
    }
  }
};