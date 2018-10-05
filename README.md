# orle
`orle` (pronounced "Oh, really?") is simple **r**un **l**ength **e**ncoder for Javascript typed arrays.  

# Usage
Using `orle` is simple.  There are two exposed methods: `encode` and `decode`.

## Encoding
If you pass a typed array (such as `Uint16Array` or `Float32Array`) to `encode`, that data type is used.  If you pass a non-typed array, it will try to find the most compact data type possible to encode the data.  Note: if decimals are found, it will use Float64Array to preserve precision.

```
const orle = require('orle');
const buffer = orle.encode([1,1,1,1,1,1,5,6,1,1,1,1,1,1,1,1,1]);
```
or
```
const orle = require('orle');
const buffer = orle.encode(new Int8Array([1,1,1,1,1,1,5,6,1,1,1,1,1,1,1,1,1]));
```

## Decoding
Pass a buffer to `decode` and you will get back a typed array. 

```
const orle = require('orle');
const arr = orle.decode(buffer);
```

# Compression
Obviously your results may vary.  If you have a large array with entirely non-repeating numbers, this will add about 9 bytes to the total payload.  If you have a large array of entirely repeating numbers, the resulting payload will be about 10 bytes.
