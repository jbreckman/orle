const t = require('tap');
const orle = require('./index');

t.test('encode/decode strings', {autoend: true}, t => {

  function confirm(t, arr, itemCount, itemSize, transitions) {
    var encoded = orle.encode(arr);
    var expectedSize = 5 + itemCount*itemSize + transitions*4;
    t.same(encoded.length, expectedSize, 'correct size');
    var decoded = orle.decode(encoded);
    t.same([...orle.decode(encoded)], [...arr], 'correct values');
  }

  t.test('test strings', async t => confirm(t, ["how are you", "i am good!!", "i am good!!", "i am good!!"], 2, 15, 2));
});

