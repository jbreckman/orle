const t = require('tap');
const orle = require('./index');

t.test('encode/decode', {autoend: true}, t => {

  function confirm(t, arr, itemCount, itemSize, transitions) {
    var encoded = orle.encode(arr);
    var expectedSize = 5 + itemCount*itemSize + transitions*4;
    t.same(encoded.length, expectedSize, 'correct size');
    t.same([...orle.decode(encoded)], [...arr], 'correct values');
  }

  t.test('test uint8', async t => confirm(t, [1,2,3,4,5,255], 6, 1, 1));
  t.test('test int8', async t => confirm(t, [1,2,3,4,5,-100], 6, 1, 1));
  t.test('test uint16', async t => confirm(t, [1,2,3,4,5,256], 6, 2, 1));
  t.test('test int16', async t => confirm(t, [1,2,3,4,5,-129], 6, 2, 1));
  t.test('test uint32', async t => confirm(t, [1,2,3,4,5,65536], 6, 4, 1));
  t.test('test int32', async t => confirm(t, [1,2,3,4,5,-32769], 6, 4, 1));
  t.test('test float64', async t => confirm(t, [1,2,3,4,5,200.5], 6, 8, 1));
  t.test('one big run', async t => confirm(t, [1,1,1,1,1,1,1], 1, 1, 1));
  t.test('empty array', async t => confirm(t, [], 0, 0, 0));
  t.test('one big run with odd number at end', async t => confirm(t, [1,1,1,1,1,1,2], 2, 1, 2));
  t.test('run, mix, run', async t => confirm(t, [1,1,1,1,1,1,2,3,4,5,2,2,2,2,2,2,2], 6, 1, 3));
  t.test('typed arrays', async t => confirm(t, new Int32Array([1,1,1,1,1,1,2,3,4,5,2,2,2,2,2,2,2]), 6, 4, 3));
  t.test('unsigned typed arrays', async t => confirm(t, new Uint32Array([1,1,1,1,1,1,2,3,4,5,2,2,2,2,2,2,2]), 6, 4, 3));
});

t.test('performance', {autoend: true}, t => {

  function buildTestData(count, countSame, countDifferent) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      arr.push([...new Array(countSame)].map(() => i));
      arr.push([...new Array(countDifferent)].map(d => i + d));
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
    t.true(duration < maxDecodeTime, `faster than ${maxDecodeTime}ms to decode ${arr.length} (${duration}ms) with ${(1-(encoded.length/decoded.buffer.byteLength))*100}% compression`);

    t.same(decoded.length, arr.length, 'lengths match');
    // it's too slow to check every value, so check 10 values
    for (var i = 1; i <= 10; i++) {
      t.same(decoded[i*Math.floor(arr.length / 10)], arr[i*Math.floor(arr.length / 10)], `single value matches (${i})`);
    }
  }

  t.test('large encoding/decoding', async t => timeTestData(t, buildTestData(100, 5000, 500), 150, 50));
  t.test('large encoding/decoding known data format', async t => timeTestData(t, new Uint32Array(buildTestData(100, 5000, 500)), 100, 50));
  t.test('very large encoding/decoding known data format', async t => timeTestData(t, new Uint32Array(buildTestData(1000, 5000, 500)), 150, 50));
  t.test('very large mostly long runs', async t => timeTestData(t, new Uint32Array(buildTestData(100, 50000, 0)), 150, 50));
  t.test('medium mostly long runs', async t => timeTestData(t, new Uint32Array(buildTestData(100, 500, 50)), 10, 10));
  t.test('pathological case', async t => timeTestData(t, new Uint32Array(buildTestData(10000, 2, 3)), 100, 400));

});