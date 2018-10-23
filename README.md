[![npm version](https://badge.fury.io/js/orle.svg)](https://badge.fury.io/js/orle)
[![CircleCI](https://circleci.com/gh/jbreckman/orle.svg?style=svg)](https://circleci.com/gh/jbreckman/orle)

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

### Notes
This package primarily optimizes typed arrays, which don't support `null` or `undefined` as elements.  `null` or `undefined` get coerced to 0 when encoding.

## Decoding
Pass a buffer to `decode` and you will get back a typed array. 

```
const orle = require('orle');
const arr = orle.decode(buffer);
```

# Compression
Obviously your results may vary.  If you have a large array with entirely non-repeating numbers, this will add about 9 bytes to the total payload.  If you have a large array of entirely repeating numbers, the resulting payload will be about 10 bytes.

# Format
The binary format is pretty simple:

### Data Version
**Bytes**: 1
**Sample Value**: 7


### Data Type/Lookup Table Flag
**Bytes**: 1
**Sample Value**: The first 7 bits are an unsigned int representing different data formats.  Possible formats are: 
* 0: Int32 
* 1: Int16 
* 2: Int8 
* 3: Uint32 
* 4: Uint16 
* 5: Uint8 
* 6: Float32 
* 7: Float64 
* 8: String  

If the last bit is set, that indicates that a lookup table is present

### Run Value Size
**Bytes**: 1
**Sample Value**: The size of each "run" value.  Unsigned 8 bit int:
* 0: Int32 
* 1: Int16 
* 2: Int8 

### Runs
**Bytes**: `size-of-each-run-value * (number-of-distinct-runs+1)`
**Sample Value**: Store each set of run values.  Positive values indicates that the value is repeated that number of times.  Negative values indicates that there is a run of distinct values.  0 indicates there are no more runs defined

### Lookup Table Length
**Bytes**: 0 or 1
**Sample Value**: If the lookup table bit was set, this indicates how many items are in the LUT (max of 256)

### Lookup Table
**Bytes**: `size-of-each-LUT-value * number-of-items-in-LUT`
**Sample Value**: The data is serialized flat and is obviously variable length.  There are a maximum of 256 values in the lookup table.  If a Lookup table is used, the payload items are serialized as Uint8s indicating the index into this array that they map to

### Payload
**Bytes**: `size-of-each-value * number-of-values-stored`
**Sample Value**: The actual payload.  Important notes:
The order here is very important and has to map to the runs previously defined.  If a run is "positive" then the item should only appear once here.  
**Note on strings:** Strings are stored as a Uint32LE number representing followed by that number of bytes of a JSON representation of the string array.  
**Note on Lookup Tables:** If a lookup table is being used, the size of each value will be 1 and it will be a Uint8 value representing the value to use from the lookup table.
