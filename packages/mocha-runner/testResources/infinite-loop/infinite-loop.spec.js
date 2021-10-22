var expect = require('chai').expect;
var loop = require('./infinite-loop');

it('should handle an infinite loop as a timeout', () => {
  while (true);
});

it('should be able to recover and test others', () => {});

it('should be able to break out of an infinite loop with a hit counter', () => {
  let total = 0;
  loop(5, (n) => {
    expect(n).not.eq(0);
    total += n;
  });
  expect(total).eq(15);
});
