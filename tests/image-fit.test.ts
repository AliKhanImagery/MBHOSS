import test from 'node:test';
import assert from 'node:assert/strict';
import { fitWithinPixels, isAllowedImageType, MAX_PIXELS } from '../src/lib/image-fit';

test('a picture within 1 megapixel is left alone', () => {
  assert.deepEqual(fitWithinPixels(1000, 1000), { width: 1000, height: 1000, resized: false });
  assert.deepEqual(fitWithinPixels(800, 600), { width: 800, height: 600, resized: false });
});

test('a bigger picture is scaled to at most 1 megapixel, keeping its shape', () => {
  const r = fitWithinPixels(4000, 3000);
  assert.equal(r.resized, true);
  assert.ok(r.width * r.height <= MAX_PIXELS);
  assert.ok(r.width * r.height > MAX_PIXELS * 0.98);
  assert.ok(Math.abs(r.width / r.height - 4 / 3) < 0.01);
});

test('very tall and very wide pictures stay within the limit', () => {
  for (const [w, h] of [[500, 20000], [30000, 400], [1001, 1000], [12000, 9000]]) {
    const r = fitWithinPixels(w, h);
    assert.ok(r.width >= 1 && r.height >= 1);
    assert.ok(r.width * r.height <= MAX_PIXELS, `${w}x${h}`);
  }
});

test('only jpg, png and webp are accepted', () => {
  assert.ok(isAllowedImageType('image/jpeg'));
  assert.ok(isAllowedImageType('image/png'));
  assert.ok(isAllowedImageType('image/webp'));
  assert.ok(!isAllowedImageType('image/gif'));
  assert.ok(!isAllowedImageType('application/pdf'));
  assert.ok(!isAllowedImageType(undefined));
});
