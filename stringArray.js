module.exports = class StringArray extends Array {
  constructor(o, offset, toRead) {
    if (Array.isArray(o)) {
      super(o.length);

      let bufferPieces = [];
      for (var i = 0; i < o.length; i++) {
        var s = String(o[i]),
            buffer = Buffer.from(s);
        this[i] = s;
        bufferPieces.push(Buffer.from(new Int32Array([buffer.length]).buffer));
        bufferPieces.push(buffer);
      }
      this.buffer = Buffer.concat(bufferPieces);
      this.bytes = this.buffer.length;
    }
    else if (o instanceof ArrayBuffer) {
      super(toRead);
      o = Buffer.from(o);
      this.buffer = o;
      var index = 0;
      offset = offset || 0;
      toRead = toRead || 0;
      this.bytes = 0;
      while (toRead > 0) {
        let length = o.readInt32LE(offset);
        offset += 4;
        this[index++] = String(o.slice(offset, offset + length));
        offset += length;
        this.bytes += length + 4;
        toRead--;
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

