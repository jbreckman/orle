const t = require('tap');
const orle = require('./index');

t.test('encode/decode', t => {

  function confirm(t, arr, itemCount, itemSize, transitions) {
    var encoded = orle.encode(arr);
    var expectedSize = 5 + itemCount*itemSize + transitions*4;
    t.same(encoded.length, expectedSize, 'correct size');
    t.same([...orle.decode(encoded)], [...arr], 'correct values');
    t.end();
  }

  t.test('test uint8', t => confirm(t, [1,2,3,4,5,255], 6, 1, 1));
  t.test('test int8', t => confirm(t, [1,2,3,4,5,-100], 6, 1, 1));
  t.test('test uint16', t => confirm(t, [1,2,3,4,5,256], 6, 2, 1));
  t.test('test int16', t => confirm(t, [1,2,3,4,5,-129], 6, 2, 1));
  t.test('test uint32', t => confirm(t, [1,2,3,4,5,65536], 6, 4, 1));
  t.test('test int32', t => confirm(t, [1,2,3,4,5,-32769], 6, 4, 1));
  t.test('test float64', t => confirm(t, [1,2,3,4,5,200.5], 6, 8, 1));
  t.test('one big run', t => confirm(t, [1,1,1,1,1,1,1], 1, 1, 1));
  t.test('empty array', t => confirm(t, [], 0, 0, 0));
  t.test('one big run with odd number at end', t => confirm(t, [1,1,1,1,1,1,2], 2, 1, 2));
  t.test('run, mix, run', t => confirm(t, [1,1,1,1,1,1,2,3,4,5,2,2,2,2,2,2,2], 6, 1, 3));
  t.test('typed arrays', t => confirm(t, new Int32Array([1,1,1,1,1,1,2,3,4,5,2,2,2,2,2,2,2]), 6, 4, 3));
  t.test('unsigned typed arrays', t => confirm(t, new Uint32Array([1,1,1,1,1,1,2,3,4,5,2,2,2,2,2,2,2]), 6, 4, 3));
  t.end();
});

t.test('string encode/decode', t => {

  function confirm(t, arr, itemCount, totalItemSize, transitions, singleElementArrayCount) {
    var encoded = orle.encode(arr);

    var expectedSize = 5 /* header size */ + itemCount*3 /* handle "", between elements */ + totalItemSize + transitions*9 /* each transition has a 4 byte length, 4 byte count, and 2 bytes for [] */ - singleElementArrayCount * 4 /* single string arrays aren't stored as arrays */;
    t.same(encoded.length, expectedSize, 'correct size');
    t.same([...orle.decode(encoded)], [...arr], 'correct values');
    t.end();
  }

  const S1 = 'how are you',
        S1_LENGTH = S1.length,
        S2 = 'i am good',
        S2_LENGTH = S2.length,
        S3 = 'test',
        S3_LENGTH = S3.length,
        S4 = '',
        S4_LENGTH = S4.length;

  t.test('single run', t => confirm(t, [S2, S2, S2], 1, S2_LENGTH, 1, 1));
  t.test('non-uniform run', t => confirm(t, [S1, S2, S3], 3, S1_LENGTH + S2_LENGTH + S3_LENGTH, 1, 0));
  t.test('test basic strings', t => confirm(t, [S1, S2, S2, S2], 2, S1_LENGTH + S2_LENGTH, 2, 2));
  t.test('empty strings', t => confirm(t, [S4, S4, S4], 1, S4_LENGTH, 1, 1));
  t.test('non-uniform run with empty string', t => confirm(t, [S1, S2, S3, S4], 4, S1_LENGTH + S2_LENGTH + S3_LENGTH, 1, 0));
  t.test('run then non-uniform', t => confirm(t, [S3, S3, S3, S3, S1, S2, S3, S4, S3, S3, S3], 6, S1_LENGTH + S2_LENGTH + S3_LENGTH + S3_LENGTH + S3_LENGTH, 3, 2));
  t.end();
});

t.test('performance', t => {

  function buildTestData(count, countSame, countDifferent) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      arr.push([...new Array(countSame)].map(() => i));
      arr.push([...new Array(countDifferent)].map(d => i + d));
    }
    return [].concat.apply([], arr);
  }

  function buildStringTestData(count, countSame, countDifferent) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      arr.push([...new Array(countSame)].map(() => 'string' + i));
      arr.push([...new Array(countDifferent)].map(d => 'string_b' + i + d));
    }
    return [].concat.apply([], arr); 
  }

  function timeTestData(t, arr, maxEncodeTime, maxDecodeTime) {
    var startTime = new Date().getTime();
    let encoded = orle.encode(arr);
    let duration = new Date().getTime() - startTime;
    t.true(duration < maxEncodeTime, `faster than ${maxEncodeTime}ms to encode ${arr.length} (${duration}ms)`);

    startTime = new Date().getTime(); 
    let decoded = orle.decode(encoded);
    duration = new Date().getTime() - startTime;
    t.true(duration < maxDecodeTime, `faster than ${maxDecodeTime}ms to decode ${arr.length} (${duration}ms) with ${(1-(encoded.length/(decoded.buffer&&decoded.buffer.byteLength)))*100}% compression`);

    t.same(decoded.length, arr.length, 'lengths match');
    // it's too slow to check every value, so check 10 values
    for (var i = 1; i <= 10; i++) {
      t.same(decoded[i*Math.floor(arr.length / 10)], arr[i*Math.floor(arr.length / 10)], `single value matches (${i})`);
    }
    t.end();
  }

  t.test('large encoding/decoding', t => timeTestData(t, buildTestData(100, 5000, 500), 150, 50));
  t.test('large encoding/decoding known data format', t => timeTestData(t, new Uint32Array(buildTestData(100, 5000, 500)), 100, 50));
  t.test('very large encoding/decoding known data format', t => timeTestData(t, new Uint32Array(buildTestData(1000, 5000, 500)), 150, 50));
  t.test('very large mostly long runs', t => timeTestData(t, new Uint32Array(buildTestData(100, 50000, 0)), 150, 50));
  t.test('medium mostly long runs', t => timeTestData(t, new Uint32Array(buildTestData(100, 500, 50)), 10, 10));
  t.test('pathological case', t => timeTestData(t, new Uint32Array(buildTestData(10000, 2, 3)), 100, 400));
  t.test('one long run of strings', t => timeTestData(t, buildStringTestData(1, 0, 100000), 100, 20));
  t.test('strings mixed', t => timeTestData(t, buildStringTestData(100, 500, 500), 100, 30));
  t.end();
});


t.test('lookup tables', t => {

  function confirm(t, arr, itemCount, itemSize, totalElements, transitions) {
    var encoded = orle.encode(arr);
    var expectedSize = 5 + 1 + itemCount*itemSize + transitions*4 + totalElements;
    t.same(encoded.length, expectedSize, `correct size (${expectedSize})`);
    t.same([...orle.decode(encoded)], [...arr], 'correct values');
    t.end();
  }

  t.test('test uint32', t => confirm(t, [1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,100000], 5, 4, 25, 13));
  t.test('test uint32 long run', t => confirm(t, [100000,200000,300000,100000,200000,300000,100000,200000,300000,100000,200000,300000,100000,200000,300000,100000,200000,300000,100000,200000,300000,100000,200000,300000], 3, 4, 24, 1));
  t.test('test int32', t => confirm(t, [1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,-100000], 5, 4, 25, 13));
  t.test('test uint16', t => confirm(t, [1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1000], 5, 2, 25, 13));
  t.test('test int16', t => confirm(t, [1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,-1000], 5, 2, 25, 13));
  t.test('test float64', t => confirm(t, [1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1,2,3,4,4,1000.01], 5, 8, 25, 13));
  t.end();
});


t.test('string lookup tables', t => {

  const S1 = 'how are you',
        S1_LENGTH = S1.length,
        S2 = 'i am good',
        S2_LENGTH = S2.length,
        S3 = 'test',
        S3_LENGTH = S3.length,
        S4 = '',
        S4_LENGTH = S4.length;

  function confirm(t, arr, itemCount, totalItemSize, totalElements, transitions, singleElementArrayCount) {
    var encoded = orle.encode(arr);
    var expectedSize = 5 + 1 + 4 + itemCount*3 - 1 + 2 + totalItemSize + transitions*4 + totalElements - singleElementArrayCount*4;
    t.same(encoded.length, expectedSize, `correct size (${expectedSize})`);
    t.same([...orle.decode(encoded)], [...arr], 'correct values');
    t.end();
  }
  function dupeArray(arr, count) {
    var res = [];
    for (var i = 0; i < count; i++) {
      res = res.concat(arr);
    }
    return res;
  }

  t.test('small run', t => confirm(t, dupeArray([S1, S2, S3], 10), 3, S1_LENGTH + S2_LENGTH + S3_LENGTH, 30, 1, 0));
  t.test('simple run', t => confirm(t, dupeArray([S1, S2, S3], 100), 3, S1_LENGTH + S2_LENGTH + S3_LENGTH, 300, 1, 0));
  t.test('non-uniform run', t => confirm(t, dupeArray([S1, S2, S3, S4, S4], 100), 4, S4_LENGTH + S1_LENGTH + S2_LENGTH + S3_LENGTH, 400, 200, 0));
  t.end();
});
