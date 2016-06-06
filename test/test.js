(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

/*jshint -W079 */
var expect = require('chai').expect;

// Setup Mock for Node
global.localStorage = require('localStorage');


var MainPM = require('../app/assets/js/models/MainPM');

describe('MainPM', function() {

	var pm;

	before(function(){

		pm = new MainPM();
		pm.init();
	});


	it('should start with no items', function() {

		expect(pm.items.length).to.equal(0);

	});	

	

	describe('addItem', function() {

		it('should add an item', function() {

			pm.addItem('Test');

			expect(pm.items.length).to.equal(1);
			expect(pm.items[0]).to.equal('Test');

		});	

		it('should add another item', function() {

			pm.addItem('Test2');

			expect(pm.items.length).to.equal(2);
			expect(pm.items[1]).to.equal('Test2');

		});

	});


	describe('removeItem', function() {

		it('should remove an item', function() {

			pm.removeItem('Test');

			expect(pm.items.length).to.equal(1);
			expect(pm.items[0]).to.equal('Test2');

		});	
	
	});
});




}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../app/assets/js/models/MainPM":2,"chai":13,"localStorage":47}],2:[function(require,module,exports){

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var persistanceService = require('../services/persistanceService');

var MainPM = function()
{
	this._items = [];

	EventEmitter.call(this);
};

util.inherits(MainPM, EventEmitter);

module.exports = MainPM;


Object.defineProperty(MainPM.prototype, 'items', {
	get: function() {
		return this._items;
	},
	set: function(value) {
		if (value !== this._items)
		{
			this._items = value;
			this.emit('itemsChange', this._items);
		}
	}
});


MainPM.prototype.init = function init() {
	this._items = persistanceService.readItems();
};


MainPM.prototype.addItem = function addItem(item) {
	console.info('Adding: ', item);
	
	this._items.push(item);
	persistanceService.saveItems(this._items);
	
	this.emit('itemsChange', this._items);
};


MainPM.prototype.removeItem = function addItem(item) {
	console.info('Removing: ', item);
	
	var index = this._items.indexOf(item);
	if (index > -1) 
	{
    	this._items.splice(index, 1);
    	persistanceService.saveItems(this._items);
	}
	
	this.emit('itemsChange', this._items);
};
},{"../services/persistanceService":3,"events":8,"util":12}],3:[function(require,module,exports){

'use strict';

var store = require('store');

/**
 * Persistance Service - Singleton
 */


exports.readItems = function readItems()
{
	return store.get('items') || [];
};


exports.saveItems = function saveItem(items)
{
	store.set('items', items);
};



},{"store":48}],4:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
    return fromTypedArray(that, object)
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = String(string)

  if (string.length === 0) return 0

  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      return string.length
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return string.length * 2
    case 'hex':
      return string.length >>> 1
    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(string).length
    case 'base64':
      return base64ToBytes(string).length
    default:
      return string.length
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":5,"ieee754":6,"is-array":7}],5:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],6:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],7:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],8:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],10:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],11:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],12:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":11,"_process":10,"inherits":9}],13:[function(require,module,exports){
module.exports = require('./lib/chai');

},{"./lib/chai":14}],14:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var used = []
  , exports = module.exports = {};

/*!
 * Chai version
 */

exports.version = '2.3.0';

/*!
 * Assertion Error
 */

exports.AssertionError = require('assertion-error');

/*!
 * Utils for plugins (not exported)
 */

var util = require('./chai/utils');

/**
 * # .use(function)
 *
 * Provides a way to extend the internals of Chai
 *
 * @param {Function}
 * @returns {this} for chaining
 * @api public
 */

exports.use = function (fn) {
  if (!~used.indexOf(fn)) {
    fn(this, util);
    used.push(fn);
  }

  return this;
};

/*!
 * Utility Functions
 */

exports.util = util;

/*!
 * Configuration
 */

var config = require('./chai/config');
exports.config = config;

/*!
 * Primary `Assertion` prototype
 */

var assertion = require('./chai/assertion');
exports.use(assertion);

/*!
 * Core Assertions
 */

var core = require('./chai/core/assertions');
exports.use(core);

/*!
 * Expect interface
 */

var expect = require('./chai/interface/expect');
exports.use(expect);

/*!
 * Should interface
 */

var should = require('./chai/interface/should');
exports.use(should);

/*!
 * Assert interface
 */

var assert = require('./chai/interface/assert');
exports.use(assert);

},{"./chai/assertion":15,"./chai/config":16,"./chai/core/assertions":17,"./chai/interface/assert":18,"./chai/interface/expect":19,"./chai/interface/should":20,"./chai/utils":33,"assertion-error":42}],15:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('./config');

module.exports = function (_chai, util) {
  /*!
   * Module dependencies.
   */

  var AssertionError = _chai.AssertionError
    , flag = util.flag;

  /*!
   * Module export.
   */

  _chai.Assertion = Assertion;

  /*!
   * Assertion Constructor
   *
   * Creates object for chaining.
   *
   * @api private
   */

  function Assertion (obj, msg, stack) {
    flag(this, 'ssfi', stack || arguments.callee);
    flag(this, 'object', obj);
    flag(this, 'message', msg);
  }

  Object.defineProperty(Assertion, 'includeStack', {
    get: function() {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      return config.includeStack;
    },
    set: function(value) {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      config.includeStack = value;
    }
  });

  Object.defineProperty(Assertion, 'showDiff', {
    get: function() {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      return config.showDiff;
    },
    set: function(value) {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      config.showDiff = value;
    }
  });

  Assertion.addProperty = function (name, fn) {
    util.addProperty(this.prototype, name, fn);
  };

  Assertion.addMethod = function (name, fn) {
    util.addMethod(this.prototype, name, fn);
  };

  Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
    util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  Assertion.overwriteProperty = function (name, fn) {
    util.overwriteProperty(this.prototype, name, fn);
  };

  Assertion.overwriteMethod = function (name, fn) {
    util.overwriteMethod(this.prototype, name, fn);
  };

  Assertion.overwriteChainableMethod = function (name, fn, chainingBehavior) {
    util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  /*!
   * ### .assert(expression, message, negateMessage, expected, actual)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {Philosophical} expression to be tested
   * @param {String or Function} message or function that returns message to display if expression fails
   * @param {String or Function} negatedMessage or function that returns negatedMessage to display if negated expression fails
   * @param {Mixed} expected value (remember to check for negation)
   * @param {Mixed} actual (optional) will default to `this.obj`
   * @param {Boolean} showDiff (optional) when set to `true`, assert will display a diff in addition to the message if expression fails
   * @api private
   */

  Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
    var ok = util.test(this, arguments);
    if (true !== showDiff) showDiff = false;
    if (true !== config.showDiff) showDiff = false;

    if (!ok) {
      var msg = util.getMessage(this, arguments)
        , actual = util.getActual(this, arguments);
      throw new AssertionError(msg, {
          actual: actual
        , expected: expected
        , showDiff: showDiff
      }, (config.includeStack) ? this.assert : flag(this, 'ssfi'));
    }
  };

  /*!
   * ### ._obj
   *
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @api private
   */

  Object.defineProperty(Assertion.prototype, '_obj',
    { get: function () {
        return flag(this, 'object');
      }
    , set: function (val) {
        flag(this, 'object', val);
      }
  });
};

},{"./config":16}],16:[function(require,module,exports){
module.exports = {

  /**
   * ### config.includeStack
   *
   * User configurable property, influences whether stack trace
   * is included in Assertion error message. Default of false
   * suppresses stack trace in the error message.
   *
   *     chai.config.includeStack = true;  // enable stack on error
   *
   * @param {Boolean}
   * @api public
   */

   includeStack: false,

  /**
   * ### config.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @param {Boolean}
   * @api public
   */

  showDiff: true,

  /**
   * ### config.truncateThreshold
   *
   * User configurable property, sets length threshold for actual and
   * expected values in assertion errors. If this threshold is exceeded, for
   * example for large data structures, the value is replaced with something
   * like `[ Array(3) ]` or `{ Object (prop1, prop2) }`.
   *
   * Set it to zero if you want to disable truncating altogether.
   *
   * This is especially userful when doing assertions on arrays: having this
   * set to a reasonable large value makes the failure messages readily
   * inspectable.
   *
   *     chai.config.truncateThreshold = 0;  // disable truncating
   *
   * @param {Number}
   * @api public
   */

  truncateThreshold: 40

};

},{}],17:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, _) {
  var Assertion = chai.Assertion
    , toString = Object.prototype.toString
    , flag = _.flag;

  /**
   * ### Language Chains
   *
   * The following are provided as chainable getters to
   * improve the readability of your assertions. They
   * do not provide testing capabilities unless they
   * have been overwritten by a plugin.
   *
   * **Chains**
   *
   * - to
   * - be
   * - been
   * - is
   * - that
   * - which
   * - and
   * - has
   * - have
   * - with
   * - at
   * - of
   * - same
   *
   * @name language chains
   * @api public
   */

  [ 'to', 'be', 'been'
  , 'is', 'and', 'has', 'have'
  , 'with', 'that', 'which', 'at'
  , 'of', 'same' ].forEach(function (chain) {
    Assertion.addProperty(chain, function () {
      return this;
    });
  });

  /**
   * ### .not
   *
   * Negates any of assertions following in the chain.
   *
   *     expect(foo).to.not.equal('bar');
   *     expect(goodFn).to.not.throw(Error);
   *     expect({ foo: 'baz' }).to.have.property('foo')
   *       .and.not.equal('bar');
   *
   * @name not
   * @api public
   */

  Assertion.addProperty('not', function () {
    flag(this, 'negate', true);
  });

  /**
   * ### .deep
   *
   * Sets the `deep` flag, later used by the `equal` and
   * `property` assertions.
   *
   *     expect(foo).to.deep.equal({ bar: 'baz' });
   *     expect({ foo: { bar: { baz: 'quux' } } })
   *       .to.have.deep.property('foo.bar.baz', 'quux');
   *
   * `.deep.property` special characters can be escaped
   * by adding two slashes before the `.` or `[]`.
   *
   *     var deepCss = { '.link': { '[target]': 42 }};
   *     expect(deepCss).to.have.deep.property('\\.link.\\[target\\]', 42);
   *
   * @name deep
   * @api public
   */

  Assertion.addProperty('deep', function () {
    flag(this, 'deep', true);
  });

  /**
   * ### .any
   *
   * Sets the `any` flag, (opposite of the `all` flag)
   * later used in the `keys` assertion.
   *
   *     expect(foo).to.have.any.keys('bar', 'baz');
   *
   * @name any
   * @api public
   */

  Assertion.addProperty('any', function () {
    flag(this, 'any', true);
    flag(this, 'all', false)
  });


  /**
   * ### .all
   *
   * Sets the `all` flag (opposite of the `any` flag)
   * later used by the `keys` assertion.
   *
   *     expect(foo).to.have.all.keys('bar', 'baz');
   *
   * @name all
   * @api public
   */

  Assertion.addProperty('all', function () {
    flag(this, 'all', true);
    flag(this, 'any', false);
  });

  /**
   * ### .a(type)
   *
   * The `a` and `an` assertions are aliases that can be
   * used either as language chains or to assert a value's
   * type.
   *
   *     // typeof
   *     expect('test').to.be.a('string');
   *     expect({ foo: 'bar' }).to.be.an('object');
   *     expect(null).to.be.a('null');
   *     expect(undefined).to.be.an('undefined');
   *
   *     // language chain
   *     expect(foo).to.be.an.instanceof(Foo);
   *
   * @name a
   * @alias an
   * @param {String} type
   * @param {String} message _optional_
   * @api public
   */

  function an (type, msg) {
    if (msg) flag(this, 'message', msg);
    type = type.toLowerCase();
    var obj = flag(this, 'object')
      , article = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(type.charAt(0)) ? 'an ' : 'a ';

    this.assert(
        type === _.type(obj)
      , 'expected #{this} to be ' + article + type
      , 'expected #{this} not to be ' + article + type
    );
  }

  Assertion.addChainableMethod('an', an);
  Assertion.addChainableMethod('a', an);

  /**
   * ### .include(value)
   *
   * The `include` and `contain` assertions can be used as either property
   * based language chains or as methods to assert the inclusion of an object
   * in an array or a substring in a string. When used as language chains,
   * they toggle the `contains` flag for the `keys` assertion.
   *
   *     expect([1,2,3]).to.include(2);
   *     expect('foobar').to.contain('foo');
   *     expect({ foo: 'bar', hello: 'universe' }).to.include.keys('foo');
   *
   * @name include
   * @alias contain
   * @alias includes
   * @alias contains
   * @param {Object|String|Number} obj
   * @param {String} message _optional_
   * @api public
   */

  function includeChainingBehavior () {
    flag(this, 'contains', true);
  }

  function include (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var expected = false;
    if (_.type(obj) === 'array' && _.type(val) === 'object') {
      for (var i in obj) {
        if (_.eql(obj[i], val)) {
          expected = true;
          break;
        }
      }
    } else if (_.type(val) === 'object') {
      if (!flag(this, 'negate')) {
        for (var k in val) new Assertion(obj).property(k, val[k]);
        return;
      }
      var subset = {};
      for (var k in val) subset[k] = obj[k];
      expected = _.eql(subset, val);
    } else {
      expected = obj && ~obj.indexOf(val);
    }
    this.assert(
        expected
      , 'expected #{this} to include ' + _.inspect(val)
      , 'expected #{this} to not include ' + _.inspect(val));
  }

  Assertion.addChainableMethod('include', include, includeChainingBehavior);
  Assertion.addChainableMethod('contain', include, includeChainingBehavior);
  Assertion.addChainableMethod('contains', include, includeChainingBehavior);
  Assertion.addChainableMethod('includes', include, includeChainingBehavior);

  /**
   * ### .ok
   *
   * Asserts that the target is truthy.
   *
   *     expect('everthing').to.be.ok;
   *     expect(1).to.be.ok;
   *     expect(false).to.not.be.ok;
   *     expect(undefined).to.not.be.ok;
   *     expect(null).to.not.be.ok;
   *
   * @name ok
   * @api public
   */

  Assertion.addProperty('ok', function () {
    this.assert(
        flag(this, 'object')
      , 'expected #{this} to be truthy'
      , 'expected #{this} to be falsy');
  });

  /**
   * ### .true
   *
   * Asserts that the target is `true`.
   *
   *     expect(true).to.be.true;
   *     expect(1).to.not.be.true;
   *
   * @name true
   * @api public
   */

  Assertion.addProperty('true', function () {
    this.assert(
        true === flag(this, 'object')
      , 'expected #{this} to be true'
      , 'expected #{this} to be false'
      , this.negate ? false : true
    );
  });

  /**
   * ### .false
   *
   * Asserts that the target is `false`.
   *
   *     expect(false).to.be.false;
   *     expect(0).to.not.be.false;
   *
   * @name false
   * @api public
   */

  Assertion.addProperty('false', function () {
    this.assert(
        false === flag(this, 'object')
      , 'expected #{this} to be false'
      , 'expected #{this} to be true'
      , this.negate ? true : false
    );
  });

  /**
   * ### .null
   *
   * Asserts that the target is `null`.
   *
   *     expect(null).to.be.null;
   *     expect(undefined).to.not.be.null;
   *
   * @name null
   * @api public
   */

  Assertion.addProperty('null', function () {
    this.assert(
        null === flag(this, 'object')
      , 'expected #{this} to be null'
      , 'expected #{this} not to be null'
    );
  });

  /**
   * ### .undefined
   *
   * Asserts that the target is `undefined`.
   *
   *     expect(undefined).to.be.undefined;
   *     expect(null).to.not.be.undefined;
   *
   * @name undefined
   * @api public
   */

  Assertion.addProperty('undefined', function () {
    this.assert(
        undefined === flag(this, 'object')
      , 'expected #{this} to be undefined'
      , 'expected #{this} not to be undefined'
    );
  });

  /**
   * ### .exist
   *
   * Asserts that the target is neither `null` nor `undefined`.
   *
   *     var foo = 'hi'
   *       , bar = null
   *       , baz;
   *
   *     expect(foo).to.exist;
   *     expect(bar).to.not.exist;
   *     expect(baz).to.not.exist;
   *
   * @name exist
   * @api public
   */

  Assertion.addProperty('exist', function () {
    this.assert(
        null != flag(this, 'object')
      , 'expected #{this} to exist'
      , 'expected #{this} to not exist'
    );
  });


  /**
   * ### .empty
   *
   * Asserts that the target's length is `0`. For arrays and strings, it checks
   * the `length` property. For objects, it gets the count of
   * enumerable keys.
   *
   *     expect([]).to.be.empty;
   *     expect('').to.be.empty;
   *     expect({}).to.be.empty;
   *
   * @name empty
   * @api public
   */

  Assertion.addProperty('empty', function () {
    var obj = flag(this, 'object')
      , expected = obj;

    if (Array.isArray(obj) || 'string' === typeof object) {
      expected = obj.length;
    } else if (typeof obj === 'object') {
      expected = Object.keys(obj).length;
    }

    this.assert(
        !expected
      , 'expected #{this} to be empty'
      , 'expected #{this} not to be empty'
    );
  });

  /**
   * ### .arguments
   *
   * Asserts that the target is an arguments object.
   *
   *     function test () {
   *       expect(arguments).to.be.arguments;
   *     }
   *
   * @name arguments
   * @alias Arguments
   * @api public
   */

  function checkArguments () {
    var obj = flag(this, 'object')
      , type = Object.prototype.toString.call(obj);
    this.assert(
        '[object Arguments]' === type
      , 'expected #{this} to be arguments but got ' + type
      , 'expected #{this} to not be arguments'
    );
  }

  Assertion.addProperty('arguments', checkArguments);
  Assertion.addProperty('Arguments', checkArguments);

  /**
   * ### .equal(value)
   *
   * Asserts that the target is strictly equal (`===`) to `value`.
   * Alternately, if the `deep` flag is set, asserts that
   * the target is deeply equal to `value`.
   *
   *     expect('hello').to.equal('hello');
   *     expect(42).to.equal(42);
   *     expect(1).to.not.equal(true);
   *     expect({ foo: 'bar' }).to.not.equal({ foo: 'bar' });
   *     expect({ foo: 'bar' }).to.deep.equal({ foo: 'bar' });
   *
   * @name equal
   * @alias equals
   * @alias eq
   * @alias deep.equal
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEqual (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'deep')) {
      return this.eql(val);
    } else {
      this.assert(
          val === obj
        , 'expected #{this} to equal #{exp}'
        , 'expected #{this} to not equal #{exp}'
        , val
        , this._obj
        , true
      );
    }
  }

  Assertion.addMethod('equal', assertEqual);
  Assertion.addMethod('equals', assertEqual);
  Assertion.addMethod('eq', assertEqual);

  /**
   * ### .eql(value)
   *
   * Asserts that the target is deeply equal to `value`.
   *
   *     expect({ foo: 'bar' }).to.eql({ foo: 'bar' });
   *     expect([ 1, 2, 3 ]).to.eql([ 1, 2, 3 ]);
   *
   * @name eql
   * @alias eqls
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEql(obj, msg) {
    if (msg) flag(this, 'message', msg);
    this.assert(
        _.eql(obj, flag(this, 'object'))
      , 'expected #{this} to deeply equal #{exp}'
      , 'expected #{this} to not deeply equal #{exp}'
      , obj
      , this._obj
      , true
    );
  }

  Assertion.addMethod('eql', assertEql);
  Assertion.addMethod('eqls', assertEql);

  /**
   * ### .above(value)
   *
   * Asserts that the target is greater than `value`.
   *
   *     expect(10).to.be.above(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *
   * @name above
   * @alias gt
   * @alias greaterThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertAbove (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len > n
        , 'expected #{this} to have a length above #{exp} but got #{act}'
        , 'expected #{this} to not have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj > n
        , 'expected #{this} to be above ' + n
        , 'expected #{this} to be at most ' + n
      );
    }
  }

  Assertion.addMethod('above', assertAbove);
  Assertion.addMethod('gt', assertAbove);
  Assertion.addMethod('greaterThan', assertAbove);

  /**
   * ### .least(value)
   *
   * Asserts that the target is greater than or equal to `value`.
   *
   *     expect(10).to.be.at.least(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.least(2);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.least(3);
   *
   * @name least
   * @alias gte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertLeast (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= n
        , 'expected #{this} to have a length at least #{exp} but got #{act}'
        , 'expected #{this} to have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj >= n
        , 'expected #{this} to be at least ' + n
        , 'expected #{this} to be below ' + n
      );
    }
  }

  Assertion.addMethod('least', assertLeast);
  Assertion.addMethod('gte', assertLeast);

  /**
   * ### .below(value)
   *
   * Asserts that the target is less than `value`.
   *
   *     expect(5).to.be.below(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *
   * @name below
   * @alias lt
   * @alias lessThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertBelow (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len < n
        , 'expected #{this} to have a length below #{exp} but got #{act}'
        , 'expected #{this} to not have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj < n
        , 'expected #{this} to be below ' + n
        , 'expected #{this} to be at least ' + n
      );
    }
  }

  Assertion.addMethod('below', assertBelow);
  Assertion.addMethod('lt', assertBelow);
  Assertion.addMethod('lessThan', assertBelow);

  /**
   * ### .most(value)
   *
   * Asserts that the target is less than or equal to `value`.
   *
   *     expect(5).to.be.at.most(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.most(4);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.most(3);
   *
   * @name most
   * @alias lte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertMost (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len <= n
        , 'expected #{this} to have a length at most #{exp} but got #{act}'
        , 'expected #{this} to have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj <= n
        , 'expected #{this} to be at most ' + n
        , 'expected #{this} to be above ' + n
      );
    }
  }

  Assertion.addMethod('most', assertMost);
  Assertion.addMethod('lte', assertMost);

  /**
   * ### .within(start, finish)
   *
   * Asserts that the target is within a range.
   *
   *     expect(7).to.be.within(5,10);
   *
   * Can also be used in conjunction with `length` to
   * assert a length range. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name within
   * @param {Number} start lowerbound inclusive
   * @param {Number} finish upperbound inclusive
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('within', function (start, finish, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , range = start + '..' + finish;
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= start && len <= finish
        , 'expected #{this} to have a length within ' + range
        , 'expected #{this} to not have a length within ' + range
      );
    } else {
      this.assert(
          obj >= start && obj <= finish
        , 'expected #{this} to be within ' + range
        , 'expected #{this} to not be within ' + range
      );
    }
  });

  /**
   * ### .instanceof(constructor)
   *
   * Asserts that the target is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , Chai = new Tea('chai');
   *
   *     expect(Chai).to.be.an.instanceof(Tea);
   *     expect([ 1, 2, 3 ]).to.be.instanceof(Array);
   *
   * @name instanceof
   * @param {Constructor} constructor
   * @param {String} message _optional_
   * @alias instanceOf
   * @api public
   */

  function assertInstanceOf (constructor, msg) {
    if (msg) flag(this, 'message', msg);
    var name = _.getName(constructor);
    this.assert(
        flag(this, 'object') instanceof constructor
      , 'expected #{this} to be an instance of ' + name
      , 'expected #{this} to not be an instance of ' + name
    );
  };

  Assertion.addMethod('instanceof', assertInstanceOf);
  Assertion.addMethod('instanceOf', assertInstanceOf);

  /**
   * ### .property(name, [value])
   *
   * Asserts that the target has a property `name`, optionally asserting that
   * the value of that property is strictly equal to  `value`.
   * If the `deep` flag is set, you can use dot- and bracket-notation for deep
   * references into objects and arrays.
   *
   *     // simple referencing
   *     var obj = { foo: 'bar' };
   *     expect(obj).to.have.property('foo');
   *     expect(obj).to.have.property('foo', 'bar');
   *
   *     // deep referencing
   *     var deepObj = {
   *         green: { tea: 'matcha' }
   *       , teas: [ 'chai', 'matcha', { tea: 'konacha' } ]
   *     };
   *
   *     expect(deepObj).to.have.deep.property('green.tea', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[1]', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[2].tea', 'konacha');
   *
   * You can also use an array as the starting point of a `deep.property`
   * assertion, or traverse nested arrays.
   *
   *     var arr = [
   *         [ 'chai', 'matcha', 'konacha' ]
   *       , [ { tea: 'chai' }
   *         , { tea: 'matcha' }
   *         , { tea: 'konacha' } ]
   *     ];
   *
   *     expect(arr).to.have.deep.property('[0][1]', 'matcha');
   *     expect(arr).to.have.deep.property('[1][2].tea', 'konacha');
   *
   * Furthermore, `property` changes the subject of the assertion
   * to be the value of that property from the original object. This
   * permits for further chainable assertions on that property.
   *
   *     expect(obj).to.have.property('foo')
   *       .that.is.a('string');
   *     expect(deepObj).to.have.property('green')
   *       .that.is.an('object')
   *       .that.deep.equals({ tea: 'matcha' });
   *     expect(deepObj).to.have.property('teas')
   *       .that.is.an('array')
   *       .with.deep.property('[2]')
   *         .that.deep.equals({ tea: 'konacha' });
   *
   * Note that dots and bracket in `name` must be backslash-escaped when
   * the `deep` flag is set, while they must NOT be escaped when the `deep`
   * flag is not set.
   *
   *     // simple referencing
   *     var css = { '.link[target]': 42 };
   *     expect(css).to.have.property('.link[target]', 42);
   *
   *     // deep referencing
   *     var deepCss = { '.link': { '[target]': 42 }};
   *     expect(deepCss).to.have.deep.property('\\.link.\\[target\\]', 42);
   *
   * @name property
   * @alias deep.property
   * @param {String} name
   * @param {Mixed} value (optional)
   * @param {String} message _optional_
   * @returns value of property for chaining
   * @api public
   */

  Assertion.addMethod('property', function (name, val, msg) {
    if (msg) flag(this, 'message', msg);

    var isDeep = !!flag(this, 'deep')
      , descriptor = isDeep ? 'deep property ' : 'property '
      , negate = flag(this, 'negate')
      , obj = flag(this, 'object')
      , pathInfo = isDeep ? _.getPathInfo(name, obj) : null
      , hasProperty = isDeep
        ? pathInfo.exists
        : _.hasProperty(name, obj)
      , value = isDeep
        ? pathInfo.value
        : obj[name];

    if (negate && undefined !== val) {
      if (undefined === value) {
        msg = (msg != null) ? msg + ': ' : '';
        throw new Error(msg + _.inspect(obj) + ' has no ' + descriptor + _.inspect(name));
      }
    } else {
      this.assert(
          hasProperty
        , 'expected #{this} to have a ' + descriptor + _.inspect(name)
        , 'expected #{this} to not have ' + descriptor + _.inspect(name));
    }

    if (undefined !== val) {
      this.assert(
          val === value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name) + ' of #{exp}, but got #{act}'
        , 'expected #{this} to not have a ' + descriptor + _.inspect(name) + ' of #{act}'
        , val
        , value
      );
    }

    flag(this, 'object', value);
  });


  /**
   * ### .ownProperty(name)
   *
   * Asserts that the target has an own property `name`.
   *
   *     expect('test').to.have.ownProperty('length');
   *
   * @name ownProperty
   * @alias haveOwnProperty
   * @param {String} name
   * @param {String} message _optional_
   * @api public
   */

  function assertOwnProperty (name, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        obj.hasOwnProperty(name)
      , 'expected #{this} to have own property ' + _.inspect(name)
      , 'expected #{this} to not have own property ' + _.inspect(name)
    );
  }

  Assertion.addMethod('ownProperty', assertOwnProperty);
  Assertion.addMethod('haveOwnProperty', assertOwnProperty);

  /**
   * ### .ownPropertyDescriptor(name[, descriptor[, message]])
   *
   * Asserts that the target has an own property descriptor `name`, that optionally matches `descriptor`.
   *
   *     expect('test').to.have.ownPropertyDescriptor('length');
   *     expect('test').to.have.ownPropertyDescriptor('length', { enumerable: false, configurable: false, writable: false, value: 4 });
   *     expect('test').not.to.have.ownPropertyDescriptor('length', { enumerable: false, configurable: false, writable: false, value: 3 });
   *     expect('test').ownPropertyDescriptor('length').to.have.property('enumerable', false);
   *     expect('test').ownPropertyDescriptor('length').to.have.keys('value');
   *
   * @name ownPropertyDescriptor
   * @alias haveOwnPropertyDescriptor
   * @param {String} name
   * @param {Object} descriptor _optional_
   * @param {String} message _optional_
   * @api public
   */

  function assertOwnPropertyDescriptor (name, descriptor, msg) {
    if (typeof descriptor === 'string') {
      msg = descriptor;
      descriptor = null;
    }
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var actualDescriptor = Object.getOwnPropertyDescriptor(Object(obj), name);
    if (actualDescriptor && descriptor) {
      this.assert(
          _.eql(descriptor, actualDescriptor)
        , 'expected the own property descriptor for ' + _.inspect(name) + ' on #{this} to match ' + _.inspect(descriptor) + ', got ' + _.inspect(actualDescriptor)
        , 'expected the own property descriptor for ' + _.inspect(name) + ' on #{this} to not match ' + _.inspect(descriptor)
        , descriptor
        , actualDescriptor
        , true
      );
    } else {
      this.assert(
          actualDescriptor
        , 'expected #{this} to have an own property descriptor for ' + _.inspect(name)
        , 'expected #{this} to not have an own property descriptor for ' + _.inspect(name)
      );
    }
    flag(this, 'object', actualDescriptor);
  }

  Assertion.addMethod('ownPropertyDescriptor', assertOwnPropertyDescriptor);
  Assertion.addMethod('haveOwnPropertyDescriptor', assertOwnPropertyDescriptor);

  /**
   * ### .length(value)
   *
   * Asserts that the target's `length` property has
   * the expected value.
   *
   *     expect([ 1, 2, 3]).to.have.length(3);
   *     expect('foobar').to.have.length(6);
   *
   * Can also be used as a chain precursor to a value
   * comparison for the length property.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name length
   * @alias lengthOf
   * @param {Number} length
   * @param {String} message _optional_
   * @api public
   */

  function assertLengthChain () {
    flag(this, 'doLength', true);
  }

  function assertLength (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).to.have.property('length');
    var len = obj.length;

    this.assert(
        len == n
      , 'expected #{this} to have a length of #{exp} but got #{act}'
      , 'expected #{this} to not have a length of #{act}'
      , n
      , len
    );
  }

  Assertion.addChainableMethod('length', assertLength, assertLengthChain);
  Assertion.addMethod('lengthOf', assertLength);

  /**
   * ### .match(regexp)
   *
   * Asserts that the target matches a regular expression.
   *
   *     expect('foobar').to.match(/^foo/);
   *
   * @name match
   * @param {RegExp} RegularExpression
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('match', function (re, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        re.exec(obj)
      , 'expected #{this} to match ' + re
      , 'expected #{this} not to match ' + re
    );
  });

  /**
   * ### .string(string)
   *
   * Asserts that the string target contains another string.
   *
   *     expect('foobar').to.have.string('bar');
   *
   * @name string
   * @param {String} string
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('string', function (str, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('string');

    this.assert(
        ~obj.indexOf(str)
      , 'expected #{this} to contain ' + _.inspect(str)
      , 'expected #{this} to not contain ' + _.inspect(str)
    );
  });


  /**
   * ### .keys(key1, [key2], [...])
   *
   * Asserts that the target contains any or all of the passed-in keys.
   * Use in combination with `any`, `all`, `contains`, or `have` will affect
   * what will pass.
   *
   * When used in conjunction with `any`, at least one key that is passed
   * in must exist in the target object. This is regardless whether or not
   * the `have` or `contain` qualifiers are used. Note, either `any` or `all`
   * should be used in the assertion. If neither are used, the assertion is
   * defaulted to `all`.
   *
   * When both `all` and `contain` are used, the target object must have at
   * least all of the passed-in keys but may have more keys not listed.
   *
   * When both `all` and `have` are used, the target object must both contain
   * all of the passed-in keys AND the number of keys in the target object must
   * match the number of keys passed in (in other words, a target object must
   * have all and only all of the passed-in keys).
   *
   *     expect({ foo: 1, bar: 2 }).to.have.any.keys('foo', 'baz');
   *     expect({ foo: 1, bar: 2 }).to.have.any.keys('foo');
   *     expect({ foo: 1, bar: 2 }).to.contain.any.keys('bar', 'baz');
   *     expect({ foo: 1, bar: 2 }).to.contain.any.keys(['foo']);
   *     expect({ foo: 1, bar: 2 }).to.contain.any.keys({'foo': 6});
   *     expect({ foo: 1, bar: 2 }).to.have.all.keys(['bar', 'foo']);
   *     expect({ foo: 1, bar: 2 }).to.have.all.keys({'bar': 6, 'foo': 7});
   *     expect({ foo: 1, bar: 2, baz: 3 }).to.contain.all.keys(['bar', 'foo']);
   *     expect({ foo: 1, bar: 2, baz: 3 }).to.contain.all.keys([{'bar': 6}}]);
   *
   *
   * @name keys
   * @alias key
   * @param {String...|Array|Object} keys
   * @api public
   */

  function assertKeys (keys) {
    var obj = flag(this, 'object')
      , str
      , ok = true
      , mixedArgsMsg = 'keys must be given single argument of Array|Object|String, or multiple String arguments';

    switch (_.type(keys)) {
      case "array":
        if (arguments.length > 1) throw (new Error(mixedArgsMsg));
        break;
      case "object":
        if (arguments.length > 1) throw (new Error(mixedArgsMsg));
        keys = Object.keys(keys);
        break;
      default:
        keys = Array.prototype.slice.call(arguments);
    }

    if (!keys.length) throw new Error('keys required');

    var actual = Object.keys(obj)
      , expected = keys
      , len = keys.length
      , any = flag(this, 'any')
      , all = flag(this, 'all');

    if (!any && !all) {
      all = true;
    }

    // Has any
    if (any) {
      var intersection = expected.filter(function(key) {
        return ~actual.indexOf(key);
      });
      ok = intersection.length > 0;
    }

    // Has all
    if (all) {
      ok = keys.every(function(key){
        return ~actual.indexOf(key);
      });
      if (!flag(this, 'negate') && !flag(this, 'contains')) {
        ok = ok && keys.length == actual.length;
      }
    }

    // Key string
    if (len > 1) {
      keys = keys.map(function(key){
        return _.inspect(key);
      });
      var last = keys.pop();
      if (all) {
        str = keys.join(', ') + ', and ' + last;
      }
      if (any) {
        str = keys.join(', ') + ', or ' + last;
      }
    } else {
      str = _.inspect(keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (flag(this, 'contains') ? 'contain ' : 'have ') + str;

    // Assertion
    this.assert(
        ok
      , 'expected #{this} to ' + str
      , 'expected #{this} to not ' + str
      , expected.slice(0).sort()
      , actual.sort()
      , true
    );
  }

  Assertion.addMethod('keys', assertKeys);
  Assertion.addMethod('key', assertKeys);

  /**
   * ### .throw(constructor)
   *
   * Asserts that the function target will throw a specific error, or specific type of error
   * (as determined using `instanceof`), optionally with a RegExp or string inclusion test
   * for the error's message.
   *
   *     var err = new ReferenceError('This is a bad function.');
   *     var fn = function () { throw err; }
   *     expect(fn).to.throw(ReferenceError);
   *     expect(fn).to.throw(Error);
   *     expect(fn).to.throw(/bad function/);
   *     expect(fn).to.not.throw('good function');
   *     expect(fn).to.throw(ReferenceError, /bad function/);
   *     expect(fn).to.throw(err);
   *     expect(fn).to.not.throw(new RangeError('Out of range.'));
   *
   * Please note that when a throw expectation is negated, it will check each
   * parameter independently, starting with error constructor type. The appropriate way
   * to check for the existence of a type of error but for a message that does not match
   * is to use `and`.
   *
   *     expect(fn).to.throw(ReferenceError)
   *        .and.not.throw(/good function/);
   *
   * @name throw
   * @alias throws
   * @alias Throw
   * @param {ErrorConstructor} constructor
   * @param {String|RegExp} expected error message
   * @param {String} message _optional_
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @returns error for chaining (null if no error)
   * @api public
   */

  function assertThrows (constructor, errMsg, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('function');

    var thrown = false
      , desiredError = null
      , name = null
      , thrownError = null;

    if (arguments.length === 0) {
      errMsg = null;
      constructor = null;
    } else if (constructor && (constructor instanceof RegExp || 'string' === typeof constructor)) {
      errMsg = constructor;
      constructor = null;
    } else if (constructor && constructor instanceof Error) {
      desiredError = constructor;
      constructor = null;
      errMsg = null;
    } else if (typeof constructor === 'function') {
      name = constructor.prototype.name || constructor.name;
      if (name === 'Error' && constructor !== Error) {
        name = (new constructor()).name;
      }
    } else {
      constructor = null;
    }

    try {
      obj();
    } catch (err) {
      // first, check desired error
      if (desiredError) {
        this.assert(
            err === desiredError
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp}'
          , (desiredError instanceof Error ? desiredError.toString() : desiredError)
          , (err instanceof Error ? err.toString() : err)
        );

        flag(this, 'object', err);
        return this;
      }

      // next, check constructor
      if (constructor) {
        this.assert(
            err instanceof constructor
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp} but #{act} was thrown'
          , name
          , (err instanceof Error ? err.toString() : err)
        );

        if (!errMsg) {
          flag(this, 'object', err);
          return this;
        }
      }

      // next, check message
      var message = 'object' === _.type(err) && "message" in err
        ? err.message
        : '' + err;

      if ((message != null) && errMsg && errMsg instanceof RegExp) {
        this.assert(
            errMsg.exec(message)
          , 'expected #{this} to throw error matching #{exp} but got #{act}'
          , 'expected #{this} to throw error not matching #{exp}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else if ((message != null) && errMsg && 'string' === typeof errMsg) {
        this.assert(
            ~message.indexOf(errMsg)
          , 'expected #{this} to throw error including #{exp} but got #{act}'
          , 'expected #{this} to throw error not including #{act}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else {
        thrown = true;
        thrownError = err;
      }
    }

    var actuallyGot = ''
      , expectedThrown = name !== null
        ? name
        : desiredError
          ? '#{exp}' //_.inspect(desiredError)
          : 'an error';

    if (thrown) {
      actuallyGot = ' but #{act} was thrown'
    }

    this.assert(
        thrown === true
      , 'expected #{this} to throw ' + expectedThrown + actuallyGot
      , 'expected #{this} to not throw ' + expectedThrown + actuallyGot
      , (desiredError instanceof Error ? desiredError.toString() : desiredError)
      , (thrownError instanceof Error ? thrownError.toString() : thrownError)
    );

    flag(this, 'object', thrownError);
  };

  Assertion.addMethod('throw', assertThrows);
  Assertion.addMethod('throws', assertThrows);
  Assertion.addMethod('Throw', assertThrows);

  /**
   * ### .respondTo(method)
   *
   * Asserts that the object or class target will respond to a method.
   *
   *     Klass.prototype.bar = function(){};
   *     expect(Klass).to.respondTo('bar');
   *     expect(obj).to.respondTo('bar');
   *
   * To check if a constructor will respond to a static function,
   * set the `itself` flag.
   *
   *     Klass.baz = function(){};
   *     expect(Klass).itself.to.respondTo('baz');
   *
   * @name respondTo
   * @param {String} method
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('respondTo', function (method, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , itself = flag(this, 'itself')
      , context = ('function' === _.type(obj) && !itself)
        ? obj.prototype[method]
        : obj[method];

    this.assert(
        'function' === typeof context
      , 'expected #{this} to respond to ' + _.inspect(method)
      , 'expected #{this} to not respond to ' + _.inspect(method)
    );
  });

  /**
   * ### .itself
   *
   * Sets the `itself` flag, later used by the `respondTo` assertion.
   *
   *     function Foo() {}
   *     Foo.bar = function() {}
   *     Foo.prototype.baz = function() {}
   *
   *     expect(Foo).itself.to.respondTo('bar');
   *     expect(Foo).itself.not.to.respondTo('baz');
   *
   * @name itself
   * @api public
   */

  Assertion.addProperty('itself', function () {
    flag(this, 'itself', true);
  });

  /**
   * ### .satisfy(method)
   *
   * Asserts that the target passes a given truth test.
   *
   *     expect(1).to.satisfy(function(num) { return num > 0; });
   *
   * @name satisfy
   * @param {Function} matcher
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('satisfy', function (matcher, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var result = matcher(obj);
    this.assert(
        result
      , 'expected #{this} to satisfy ' + _.objDisplay(matcher)
      , 'expected #{this} to not satisfy' + _.objDisplay(matcher)
      , this.negate ? false : true
      , result
    );
  });

  /**
   * ### .closeTo(expected, delta)
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     expect(1.5).to.be.closeTo(1, 0.5);
   *
   * @name closeTo
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('closeTo', function (expected, delta, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj, msg).is.a('number');
    if (_.type(expected) !== 'number' || _.type(delta) !== 'number') {
      throw new Error('the arguments to closeTo must be numbers');
    }

    this.assert(
        Math.abs(obj - expected) <= delta
      , 'expected #{this} to be close to ' + expected + ' +/- ' + delta
      , 'expected #{this} not to be close to ' + expected + ' +/- ' + delta
    );
  });

  function isSubsetOf(subset, superset, cmp) {
    return subset.every(function(elem) {
      if (!cmp) return superset.indexOf(elem) !== -1;

      return superset.some(function(elem2) {
        return cmp(elem, elem2);
      });
    })
  }

  /**
   * ### .members(set)
   *
   * Asserts that the target is a superset of `set`,
   * or that the target and `set` have the same strictly-equal (===) members.
   * Alternately, if the `deep` flag is set, set members are compared for deep
   * equality.
   *
   *     expect([1, 2, 3]).to.include.members([3, 2]);
   *     expect([1, 2, 3]).to.not.include.members([3, 2, 8]);
   *
   *     expect([4, 2]).to.have.members([2, 4]);
   *     expect([5, 2]).to.not.have.members([5, 2, 1]);
   *
   *     expect([{ id: 1 }]).to.deep.include.members([{ id: 1 }]);
   *
   * @name members
   * @param {Array} set
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('members', function (subset, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj).to.be.an('array');
    new Assertion(subset).to.be.an('array');

    var cmp = flag(this, 'deep') ? _.eql : undefined;

    if (flag(this, 'contains')) {
      return this.assert(
          isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to be a superset of #{act}'
        , 'expected #{this} to not be a superset of #{act}'
        , obj
        , subset
      );
    }

    this.assert(
        isSubsetOf(obj, subset, cmp) && isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to have the same members as #{act}'
        , 'expected #{this} to not have the same members as #{act}'
        , obj
        , subset
    );
  });

  /**
   * ### .change(function)
   *
   * Asserts that a function changes an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val += 3 };
   *     var noChangeFn = function() { return 'foo' + 'bar'; }
   *     expect(fn).to.change(obj, 'val');
   *     expect(noChangFn).to.not.change(obj, 'val')
   *
   * @name change
   * @alias changes
   * @alias Change
   * @param {String} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  function assertChanges (object, prop, msg) {
    if (msg) flag(this, 'message', msg);
    var fn = flag(this, 'object');
    new Assertion(object, msg).to.have.property(prop);
    new Assertion(fn).is.a('function');

    var initial = object[prop];
    fn();

    this.assert(
      initial !== object[prop]
      , 'expected .' + prop + ' to change'
      , 'expected .' + prop + ' to not change'
    );
  }

  Assertion.addChainableMethod('change', assertChanges);
  Assertion.addChainableMethod('changes', assertChanges);

  /**
   * ### .increase(function)
   *
   * Asserts that a function increases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 15 };
   *     expect(fn).to.increase(obj, 'val');
   *
   * @name increase
   * @alias increases
   * @alias Increase
   * @param {String} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  function assertIncreases (object, prop, msg) {
    if (msg) flag(this, 'message', msg);
    var fn = flag(this, 'object');
    new Assertion(object, msg).to.have.property(prop);
    new Assertion(fn).is.a('function');

    var initial = object[prop];
    fn();

    this.assert(
      object[prop] - initial > 0
      , 'expected .' + prop + ' to increase'
      , 'expected .' + prop + ' to not increase'
    );
  }

  Assertion.addChainableMethod('increase', assertIncreases);
  Assertion.addChainableMethod('increases', assertIncreases);

  /**
   * ### .decrease(function)
   *
   * Asserts that a function decreases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 5 };
   *     expect(fn).to.decrease(obj, 'val');
   *
   * @name decrease
   * @alias decreases
   * @alias Decrease
   * @param {String} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  function assertDecreases (object, prop, msg) {
    if (msg) flag(this, 'message', msg);
    var fn = flag(this, 'object');
    new Assertion(object, msg).to.have.property(prop);
    new Assertion(fn).is.a('function');

    var initial = object[prop];
    fn();

    this.assert(
      object[prop] - initial < 0
      , 'expected .' + prop + ' to decrease'
      , 'expected .' + prop + ' to not decrease'
    );
  }

  Assertion.addChainableMethod('decrease', assertDecreases);
  Assertion.addChainableMethod('decreases', assertDecreases);

};

},{}],18:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */


module.exports = function (chai, util) {

  /*!
   * Chai dependencies.
   */

  var Assertion = chai.Assertion
    , flag = util.flag;

  /*!
   * Module export.
   */

  /**
   * ### assert(expression, message)
   *
   * Write your own test expressions.
   *
   *     assert('foo' !== 'bar', 'foo is not bar');
   *     assert(Array.isArray([]), 'empty arrays are arrays');
   *
   * @param {Mixed} expression to test for truthiness
   * @param {String} message to display on error
   * @name assert
   * @api public
   */

  var assert = chai.assert = function (express, errmsg) {
    var test = new Assertion(null, null, chai.assert);
    test.assert(
        express
      , errmsg
      , '[ negation message unavailable ]'
    );
  };

  /**
   * ### .fail(actual, expected, [message], [operator])
   *
   * Throw a failure. Node.js `assert` module-compatible.
   *
   * @name fail
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @param {String} operator
   * @api public
   */

  assert.fail = function (actual, expected, message, operator) {
    message = message || 'assert.fail()';
    throw new chai.AssertionError(message, {
        actual: actual
      , expected: expected
      , operator: operator
    }, assert.fail);
  };

  /**
   * ### .ok(object, [message])
   *
   * Asserts that `object` is truthy.
   *
   *     assert.ok('everything', 'everything is ok');
   *     assert.ok(false, 'this will fail');
   *
   * @name ok
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.ok = function (val, msg) {
    new Assertion(val, msg).is.ok;
  };

  /**
   * ### .notOk(object, [message])
   *
   * Asserts that `object` is falsy.
   *
   *     assert.notOk('everything', 'this will fail');
   *     assert.notOk(false, 'this will pass');
   *
   * @name notOk
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.notOk = function (val, msg) {
    new Assertion(val, msg).is.not.ok;
  };

  /**
   * ### .equal(actual, expected, [message])
   *
   * Asserts non-strict equality (`==`) of `actual` and `expected`.
   *
   *     assert.equal(3, '3', '== coerces values to strings');
   *
   * @name equal
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.equal = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.equal);

    test.assert(
        exp == flag(test, 'object')
      , 'expected #{this} to equal #{exp}'
      , 'expected #{this} to not equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .notEqual(actual, expected, [message])
   *
   * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
   *
   *     assert.notEqual(3, 4, 'these numbers are not equal');
   *
   * @name notEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notEqual = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.notEqual);

    test.assert(
        exp != flag(test, 'object')
      , 'expected #{this} to not equal #{exp}'
      , 'expected #{this} to equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .strictEqual(actual, expected, [message])
   *
   * Asserts strict equality (`===`) of `actual` and `expected`.
   *
   *     assert.strictEqual(true, true, 'these booleans are strictly equal');
   *
   * @name strictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.strictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.equal(exp);
  };

  /**
   * ### .notStrictEqual(actual, expected, [message])
   *
   * Asserts strict inequality (`!==`) of `actual` and `expected`.
   *
   *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
   *
   * @name notStrictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notStrictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.equal(exp);
  };

  /**
   * ### .deepEqual(actual, expected, [message])
   *
   * Asserts that `actual` is deeply equal to `expected`.
   *
   *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
   *
   * @name deepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.deepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.eql(exp);
  };

  /**
   * ### .notDeepEqual(actual, expected, [message])
   *
   * Assert that `actual` is not deeply equal to `expected`.
   *
   *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
   *
   * @name notDeepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notDeepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.eql(exp);
  };

  /**
   * ### .isTrue(value, [message])
   *
   * Asserts that `value` is true.
   *
   *     var teaServed = true;
   *     assert.isTrue(teaServed, 'the tea has been served');
   *
   * @name isTrue
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isAbove = function (val, abv, msg) {
    new Assertion(val, msg).to.be.above(abv);
  };

   /**
   * ### .isAbove(valueToCheck, valueToBeAbove, [message])
   *
   * Asserts `valueToCheck` is strictly greater than (>) `valueToBeAbove`
   *
   *     assert.isAbove(5, 2, '5 is strictly greater than 2');
   *
   * @name isAbove
   * @param {Mixed} valueToCheck
   * @param {Mixed} valueToBeAbove
   * @param {String} message
   * @api public
   */

  assert.isBelow = function (val, blw, msg) {
    new Assertion(val, msg).to.be.below(blw);
  };

   /**
   * ### .isBelow(valueToCheck, valueToBeBelow, [message])
   *
   * Asserts `valueToCheck` is strictly less than (<) `valueToBeBelow`
   *
   *     assert.isBelow(3, 6, '3 is strictly less than 6');
   *
   * @name isBelow
   * @param {Mixed} valueToCheck
   * @param {Mixed} valueToBeBelow
   * @param {String} message
   * @api public
   */

  assert.isTrue = function (val, msg) {
    new Assertion(val, msg).is['true'];
  };

  /**
   * ### .isFalse(value, [message])
   *
   * Asserts that `value` is false.
   *
   *     var teaServed = false;
   *     assert.isFalse(teaServed, 'no tea yet? hmm...');
   *
   * @name isFalse
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFalse = function (val, msg) {
    new Assertion(val, msg).is['false'];
  };

  /**
   * ### .isNull(value, [message])
   *
   * Asserts that `value` is null.
   *
   *     assert.isNull(err, 'there was no error');
   *
   * @name isNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNull = function (val, msg) {
    new Assertion(val, msg).to.equal(null);
  };

  /**
   * ### .isNotNull(value, [message])
   *
   * Asserts that `value` is not null.
   *
   *     var tea = 'tasty chai';
   *     assert.isNotNull(tea, 'great, time for tea!');
   *
   * @name isNotNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNull = function (val, msg) {
    new Assertion(val, msg).to.not.equal(null);
  };

  /**
   * ### .isUndefined(value, [message])
   *
   * Asserts that `value` is `undefined`.
   *
   *     var tea;
   *     assert.isUndefined(tea, 'no tea defined');
   *
   * @name isUndefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isUndefined = function (val, msg) {
    new Assertion(val, msg).to.equal(undefined);
  };

  /**
   * ### .isDefined(value, [message])
   *
   * Asserts that `value` is not `undefined`.
   *
   *     var tea = 'cup of chai';
   *     assert.isDefined(tea, 'tea has been defined');
   *
   * @name isDefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isDefined = function (val, msg) {
    new Assertion(val, msg).to.not.equal(undefined);
  };

  /**
   * ### .isFunction(value, [message])
   *
   * Asserts that `value` is a function.
   *
   *     function serveTea() { return 'cup of tea'; };
   *     assert.isFunction(serveTea, 'great, we can have tea now');
   *
   * @name isFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFunction = function (val, msg) {
    new Assertion(val, msg).to.be.a('function');
  };

  /**
   * ### .isNotFunction(value, [message])
   *
   * Asserts that `value` is _not_ a function.
   *
   *     var serveTea = [ 'heat', 'pour', 'sip' ];
   *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
   *
   * @name isNotFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotFunction = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('function');
  };

  /**
   * ### .isObject(value, [message])
   *
   * Asserts that `value` is an object (as revealed by
   * `Object.prototype.toString`).
   *
   *     var selection = { name: 'Chai', serve: 'with spices' };
   *     assert.isObject(selection, 'tea selection is an object');
   *
   * @name isObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isObject = function (val, msg) {
    new Assertion(val, msg).to.be.a('object');
  };

  /**
   * ### .isNotObject(value, [message])
   *
   * Asserts that `value` is _not_ an object.
   *
   *     var selection = 'chai'
   *     assert.isNotObject(selection, 'tea selection is not an object');
   *     assert.isNotObject(null, 'null is not an object');
   *
   * @name isNotObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotObject = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('object');
  };

  /**
   * ### .isArray(value, [message])
   *
   * Asserts that `value` is an array.
   *
   *     var menu = [ 'green', 'chai', 'oolong' ];
   *     assert.isArray(menu, 'what kind of tea do we want?');
   *
   * @name isArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isArray = function (val, msg) {
    new Assertion(val, msg).to.be.an('array');
  };

  /**
   * ### .isNotArray(value, [message])
   *
   * Asserts that `value` is _not_ an array.
   *
   *     var menu = 'green|chai|oolong';
   *     assert.isNotArray(menu, 'what kind of tea do we want?');
   *
   * @name isNotArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotArray = function (val, msg) {
    new Assertion(val, msg).to.not.be.an('array');
  };

  /**
   * ### .isString(value, [message])
   *
   * Asserts that `value` is a string.
   *
   *     var teaOrder = 'chai';
   *     assert.isString(teaOrder, 'order placed');
   *
   * @name isString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isString = function (val, msg) {
    new Assertion(val, msg).to.be.a('string');
  };

  /**
   * ### .isNotString(value, [message])
   *
   * Asserts that `value` is _not_ a string.
   *
   *     var teaOrder = 4;
   *     assert.isNotString(teaOrder, 'order placed');
   *
   * @name isNotString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotString = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('string');
  };

  /**
   * ### .isNumber(value, [message])
   *
   * Asserts that `value` is a number.
   *
   *     var cups = 2;
   *     assert.isNumber(cups, 'how many cups');
   *
   * @name isNumber
   * @param {Number} value
   * @param {String} message
   * @api public
   */

  assert.isNumber = function (val, msg) {
    new Assertion(val, msg).to.be.a('number');
  };

  /**
   * ### .isNotNumber(value, [message])
   *
   * Asserts that `value` is _not_ a number.
   *
   *     var cups = '2 cups please';
   *     assert.isNotNumber(cups, 'how many cups');
   *
   * @name isNotNumber
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNumber = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('number');
  };

  /**
   * ### .isBoolean(value, [message])
   *
   * Asserts that `value` is a boolean.
   *
   *     var teaReady = true
   *       , teaServed = false;
   *
   *     assert.isBoolean(teaReady, 'is the tea ready');
   *     assert.isBoolean(teaServed, 'has tea been served');
   *
   * @name isBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isBoolean = function (val, msg) {
    new Assertion(val, msg).to.be.a('boolean');
  };

  /**
   * ### .isNotBoolean(value, [message])
   *
   * Asserts that `value` is _not_ a boolean.
   *
   *     var teaReady = 'yep'
   *       , teaServed = 'nope';
   *
   *     assert.isNotBoolean(teaReady, 'is the tea ready');
   *     assert.isNotBoolean(teaServed, 'has tea been served');
   *
   * @name isNotBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotBoolean = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('boolean');
  };

  /**
   * ### .typeOf(value, name, [message])
   *
   * Asserts that `value`'s type is `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.typeOf({ tea: 'chai' }, 'object', 'we have an object');
   *     assert.typeOf(['chai', 'jasmine'], 'array', 'we have an array');
   *     assert.typeOf('tea', 'string', 'we have a string');
   *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
   *     assert.typeOf(null, 'null', 'we have a null');
   *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
   *
   * @name typeOf
   * @param {Mixed} value
   * @param {String} name
   * @param {String} message
   * @api public
   */

  assert.typeOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.a(type);
  };

  /**
   * ### .notTypeOf(value, name, [message])
   *
   * Asserts that `value`'s type is _not_ `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
   *
   * @name notTypeOf
   * @param {Mixed} value
   * @param {String} typeof name
   * @param {String} message
   * @api public
   */

  assert.notTypeOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.a(type);
  };

  /**
   * ### .instanceOf(object, constructor, [message])
   *
   * Asserts that `value` is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new Tea('chai');
   *
   *     assert.instanceOf(chai, Tea, 'chai is an instance of tea');
   *
   * @name instanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.instanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.instanceOf(type);
  };

  /**
   * ### .notInstanceOf(object, constructor, [message])
   *
   * Asserts `value` is not an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new String('chai');
   *
   *     assert.notInstanceOf(chai, Tea, 'chai is not an instance of tea');
   *
   * @name notInstanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.notInstanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.instanceOf(type);
  };

  /**
   * ### .include(haystack, needle, [message])
   *
   * Asserts that `haystack` includes `needle`. Works
   * for strings and arrays.
   *
   *     assert.include('foobar', 'bar', 'foobar contains string "bar"');
   *     assert.include([ 1, 2, 3 ], 3, 'array contains value');
   *
   * @name include
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.include = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.include).include(inc);
  };

  /**
   * ### .notInclude(haystack, needle, [message])
   *
   * Asserts that `haystack` does not include `needle`. Works
   * for strings and arrays.
   *i
   *     assert.notInclude('foobar', 'baz', 'string not include substring');
   *     assert.notInclude([ 1, 2, 3 ], 4, 'array not include contain value');
   *
   * @name notInclude
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.notInclude = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.notInclude).not.include(inc);
  };

  /**
   * ### .match(value, regexp, [message])
   *
   * Asserts that `value` matches the regular expression `regexp`.
   *
   *     assert.match('foobar', /^foo/, 'regexp matches');
   *
   * @name match
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.match = function (exp, re, msg) {
    new Assertion(exp, msg).to.match(re);
  };

  /**
   * ### .notMatch(value, regexp, [message])
   *
   * Asserts that `value` does not match the regular expression `regexp`.
   *
   *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
   *
   * @name notMatch
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.notMatch = function (exp, re, msg) {
    new Assertion(exp, msg).to.not.match(re);
  };

  /**
   * ### .property(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`.
   *
   *     assert.property({ tea: { green: 'matcha' }}, 'tea');
   *
   * @name property
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.property = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.property(prop);
  };

  /**
   * ### .notProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`.
   *
   *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
   *
   * @name notProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.property(prop);
  };

  /**
   * ### .deepProperty(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`, which can be a
   * string using dot- and bracket-notation for deep reference.
   *
   *     assert.deepProperty({ tea: { green: 'matcha' }}, 'tea.green');
   *
   * @name deepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.deepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop);
  };

  /**
   * ### .notDeepProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`, which
   * can be a string using dot- and bracket-notation for deep reference.
   *
   *     assert.notDeepProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
   *
   * @name notDeepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notDeepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop);
  };

  /**
   * ### .propertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`.
   *
   *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
   *
   * @name propertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.property(prop, val);
  };

  /**
   * ### .propertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`.
   *
   *     assert.propertyNotVal({ tea: 'is good' }, 'tea', 'is bad');
   *
   * @name propertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.property(prop, val);
  };

  /**
   * ### .deepPropertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`. `property` can use dot- and bracket-notation for deep
   * reference.
   *
   *     assert.deepPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
   *
   * @name deepPropertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop, val);
  };

  /**
   * ### .deepPropertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`. `property` can use dot- and
   * bracket-notation for deep reference.
   *
   *     assert.deepPropertyNotVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
   *
   * @name deepPropertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop, val);
  };

  /**
   * ### .lengthOf(object, length, [message])
   *
   * Asserts that `object` has a `length` property with the expected value.
   *
   *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
   *     assert.lengthOf('foobar', 5, 'string has length of 6');
   *
   * @name lengthOf
   * @param {Mixed} object
   * @param {Number} length
   * @param {String} message
   * @api public
   */

  assert.lengthOf = function (exp, len, msg) {
    new Assertion(exp, msg).to.have.length(len);
  };

  /**
   * ### .throws(function, [constructor/string/regexp], [string/regexp], [message])
   *
   * Asserts that `function` will throw an error that is an instance of
   * `constructor`, or alternately that it will throw an error with message
   * matching `regexp`.
   *
   *     assert.throw(fn, 'function throws a reference error');
   *     assert.throw(fn, /function throws a reference error/);
   *     assert.throw(fn, ReferenceError);
   *     assert.throw(fn, ReferenceError, 'function throws a reference error');
   *     assert.throw(fn, ReferenceError, /function throws a reference error/);
   *
   * @name throws
   * @alias throw
   * @alias Throw
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.Throw = function (fn, errt, errs, msg) {
    if ('string' === typeof errt || errt instanceof RegExp) {
      errs = errt;
      errt = null;
    }

    var assertErr = new Assertion(fn, msg).to.Throw(errt, errs);
    return flag(assertErr, 'object');
  };

  /**
   * ### .doesNotThrow(function, [constructor/regexp], [message])
   *
   * Asserts that `function` will _not_ throw an error that is an instance of
   * `constructor`, or alternately that it will not throw an error with message
   * matching `regexp`.
   *
   *     assert.doesNotThrow(fn, Error, 'function does not throw');
   *
   * @name doesNotThrow
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.doesNotThrow = function (fn, type, msg) {
    if ('string' === typeof type) {
      msg = type;
      type = null;
    }

    new Assertion(fn, msg).to.not.Throw(type);
  };

  /**
   * ### .operator(val1, operator, val2, [message])
   *
   * Compares two values using `operator`.
   *
   *     assert.operator(1, '<', 2, 'everything is ok');
   *     assert.operator(1, '>', 2, 'this will fail');
   *
   * @name operator
   * @param {Mixed} val1
   * @param {String} operator
   * @param {Mixed} val2
   * @param {String} message
   * @api public
   */

  assert.operator = function (val, operator, val2, msg) {
    var ok;
    switch(operator) {
      case '==':
        ok = val == val2;
        break;
      case '===':
        ok = val === val2;
        break;
      case '>':
        ok = val > val2;
        break;
      case '>=':
        ok = val >= val2;
        break;
      case '<':
        ok = val < val2;
        break;
      case '<=':
        ok = val <= val2;
        break;
      case '!=':
        ok = val != val2;
        break;
      case '!==':
        ok = val !== val2;
        break;
      default:
        throw new Error('Invalid operator "' + operator + '"');
    }
    var test = new Assertion(ok, msg);
    test.assert(
        true === flag(test, 'object')
      , 'expected ' + util.inspect(val) + ' to be ' + operator + ' ' + util.inspect(val2)
      , 'expected ' + util.inspect(val) + ' to not be ' + operator + ' ' + util.inspect(val2) );
  };

  /**
   * ### .closeTo(actual, expected, delta, [message])
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
   *
   * @name closeTo
   * @param {Number} actual
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message
   * @api public
   */

  assert.closeTo = function (act, exp, delta, msg) {
    new Assertion(act, msg).to.be.closeTo(exp, delta);
  };

  /**
   * ### .sameMembers(set1, set2, [message])
   *
   * Asserts that `set1` and `set2` have the same members.
   * Order is not taken into account.
   *
   *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
   *
   * @name sameMembers
   * @param {Array} set1
   * @param {Array} set2
   * @param {String} message
   * @api public
   */

  assert.sameMembers = function (set1, set2, msg) {
    new Assertion(set1, msg).to.have.same.members(set2);
  }

  /**
   * ### .sameDeepMembers(set1, set2, [message])
   *
   * Asserts that `set1` and `set2` have the same members - using a deep equality checking.
   * Order is not taken into account.
   *
   *     assert.sameDeepMembers([ {b: 3}, {a: 2}, {c: 5} ], [ {c: 5}, {b: 3}, {a: 2} ], 'same deep members');
   *
   * @name sameDeepMembers
   * @param {Array} set1
   * @param {Array} set2
   * @param {String} message
   * @api public
   */

  assert.sameDeepMembers = function (set1, set2, msg) {
    new Assertion(set1, msg).to.have.same.deep.members(set2);
  }

  /**
   * ### .includeMembers(superset, subset, [message])
   *
   * Asserts that `subset` is included in `superset`.
   * Order is not taken into account.
   *
   *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1 ], 'include members');
   *
   * @name includeMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @api public
   */

  assert.includeMembers = function (superset, subset, msg) {
    new Assertion(superset, msg).to.include.members(subset);
  }

   /**
   * ### .changes(function, object, property)
   *
   * Asserts that a function changes the value of a property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 22 };
   *     assert.changes(fn, obj, 'val');
   *
   * @name changes
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  assert.changes = function (fn, obj, prop) {
    new Assertion(fn).to.change(obj, prop);
  }

   /**
   * ### .doesNotChange(function, object, property)
   *
   * Asserts that a function does not changes the value of a property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { console.log('foo'); };
   *     assert.doesNotChange(fn, obj, 'val');
   *
   * @name doesNotChange
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  assert.doesNotChange = function (fn, obj, prop) {
    new Assertion(fn).to.not.change(obj, prop);
  }

   /**
   * ### .increases(function, object, property)
   *
   * Asserts that a function increases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 13 };
   *     assert.increases(fn, obj, 'val');
   *
   * @name increases
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  assert.increases = function (fn, obj, prop) {
    new Assertion(fn).to.increase(obj, prop);
  }

   /**
   * ### .doesNotIncrease(function, object, property)
   *
   * Asserts that a function does not increase object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 8 };
   *     assert.doesNotIncrease(fn, obj, 'val');
   *
   * @name doesNotIncrease
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  assert.doesNotIncrease = function (fn, obj, prop) {
    new Assertion(fn).to.not.increase(obj, prop);
  }

   /**
   * ### .decreases(function, object, property)
   *
   * Asserts that a function decreases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 5 };
   *     assert.decreases(fn, obj, 'val');
   *
   * @name decreases
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  assert.decreases = function (fn, obj, prop) {
    new Assertion(fn).to.decrease(obj, prop);
  }

   /**
   * ### .doesNotDecrease(function, object, property)
   *
   * Asserts that a function does not decreases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 15 };
   *     assert.doesNotDecrease(fn, obj, 'val');
   *
   * @name doesNotDecrease
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @api public
   */

  assert.doesNotDecrease = function (fn, obj, prop) {
    new Assertion(fn).to.not.decrease(obj, prop);
  }

  /*!
   * Undocumented / untested
   */

  assert.ifError = function (val, msg) {
    new Assertion(val, msg).to.not.be.ok;
  };

  /*!
   * Aliases.
   */

  (function alias(name, as){
    assert[as] = assert[name];
    return alias;
  })
  ('Throw', 'throw')
  ('Throw', 'throws');
};

},{}],19:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  chai.expect = function (val, message) {
    return new chai.Assertion(val, message);
  };

  /**
   * ### .fail(actual, expected, [message], [operator])
   *
   * Throw a failure.
   *
   * @name fail
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @param {String} operator
   * @api public
   */

  chai.expect.fail = function (actual, expected, message, operator) {
    message = message || 'expect.fail()';
    throw new chai.AssertionError(message, {
        actual: actual
      , expected: expected
      , operator: operator
    }, chai.expect.fail);
  };
};

},{}],20:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  var Assertion = chai.Assertion;

  function loadShould () {
    // explicitly define this method as function as to have it's name to include as `ssfi`
    function shouldGetter() {
      if (this instanceof String || this instanceof Number || this instanceof Boolean ) {
        return new Assertion(this.valueOf(), null, shouldGetter);
      }
      return new Assertion(this, null, shouldGetter);
    }
    function shouldSetter(value) {
      // See https://github.com/chaijs/chai/issues/86: this makes
      // `whatever.should = someValue` actually set `someValue`, which is
      // especially useful for `global.should = require('chai').should()`.
      //
      // Note that we have to use [[DefineProperty]] instead of [[Put]]
      // since otherwise we would trigger this very setter!
      Object.defineProperty(this, 'should', {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    // modify Object.prototype to have `should`
    Object.defineProperty(Object.prototype, 'should', {
      set: shouldSetter
      , get: shouldGetter
      , configurable: true
    });

    var should = {};

    /**
     * ### .fail(actual, expected, [message], [operator])
     *
     * Throw a failure.
     *
     * @name fail
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @param {String} operator
     * @api public
     */

    should.fail = function (actual, expected, message, operator) {
      message = message || 'should.fail()';
      throw new chai.AssertionError(message, {
          actual: actual
        , expected: expected
        , operator: operator
      }, should.fail);
    };

    should.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.equal(val2);
    };

    should.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.Throw(errt, errs);
    };

    should.exist = function (val, msg) {
      new Assertion(val, msg).to.exist;
    }

    // negation
    should.not = {}

    should.not.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.not.equal(val2);
    };

    should.not.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.not.Throw(errt, errs);
    };

    should.not.exist = function (val, msg) {
      new Assertion(val, msg).to.not.exist;
    }

    should['throw'] = should['Throw'];
    should.not['throw'] = should.not['Throw'];

    return should;
  };

  chai.should = loadShould;
  chai.Should = loadShould;
};

},{}],21:[function(require,module,exports){
/*!
 * Chai - addChainingMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var transferFlags = require('./transferFlags');
var flag = require('./flag');
var config = require('../config');

/*!
 * Module variables
 */

// Check whether `__proto__` is supported
var hasProtoSupport = '__proto__' in Object;

// Without `__proto__` support, this module will need to add properties to a function.
// However, some Function.prototype methods cannot be overwritten,
// and there seems no easy cross-platform way to detect them (@see chaijs/chai/issues/69).
var excludeNames = /^(?:length|name|arguments|caller)$/;

// Cache `Function` properties
var call  = Function.prototype.call,
    apply = Function.prototype.apply;

/**
 * ### addChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Adds a method to an object, such that the method can also be chained.
 *
 *     utils.addChainableMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addChainableMethod('foo', fn, chainingBehavior);
 *
 * The result can then be used as both a method assertion, executing both `method` and
 * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
 *
 *     expect(fooStr).to.be.foo('bar');
 *     expect(fooStr).to.be.foo.equal('foo');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for `name`, when called
 * @param {Function} chainingBehavior function to be called every time the property is accessed
 * @name addChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  if (typeof chainingBehavior !== 'function') {
    chainingBehavior = function () { };
  }

  var chainableBehavior = {
      method: method
    , chainingBehavior: chainingBehavior
  };

  // save the methods so we can overwrite them later, if we need to.
  if (!ctx.__methods) {
    ctx.__methods = {};
  }
  ctx.__methods[name] = chainableBehavior;

  Object.defineProperty(ctx, name,
    { get: function () {
        chainableBehavior.chainingBehavior.call(this);

        var assert = function assert() {
          var old_ssfi = flag(this, 'ssfi');
          if (old_ssfi && config.includeStack === false)
            flag(this, 'ssfi', assert);
          var result = chainableBehavior.method.apply(this, arguments);
          return result === undefined ? this : result;
        };

        // Use `__proto__` if available
        if (hasProtoSupport) {
          // Inherit all properties from the object by replacing the `Function` prototype
          var prototype = assert.__proto__ = Object.create(this);
          // Restore the `call` and `apply` methods from `Function`
          prototype.call = call;
          prototype.apply = apply;
        }
        // Otherwise, redefine all properties (slow!)
        else {
          var asserterNames = Object.getOwnPropertyNames(ctx);
          asserterNames.forEach(function (asserterName) {
            if (!excludeNames.test(asserterName)) {
              var pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
              Object.defineProperty(assert, asserterName, pd);
            }
          });
        }

        transferFlags(this, assert);
        return assert;
      }
    , configurable: true
  });
};

},{"../config":16,"./flag":24,"./transferFlags":40}],22:[function(require,module,exports){
/*!
 * Chai - addMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('../config');

/**
 * ### .addMethod (ctx, name, method)
 *
 * Adds a method to the prototype of an object.
 *
 *     utils.addMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(fooStr).to.be.foo('bar');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for name
 * @name addMethod
 * @api public
 */
var flag = require('./flag');

module.exports = function (ctx, name, method) {
  ctx[name] = function () {
    var old_ssfi = flag(this, 'ssfi');
    if (old_ssfi && config.includeStack === false)
      flag(this, 'ssfi', ctx[name]);
    var result = method.apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{"../config":16,"./flag":24}],23:[function(require,module,exports){
/*!
 * Chai - addProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### addProperty (ctx, name, getter)
 *
 * Adds a property to the prototype of an object.
 *
 *     utils.addProperty(chai.Assertion.prototype, 'foo', function () {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.instanceof(Foo);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.foo;
 *
 * @param {Object} ctx object to which the property is added
 * @param {String} name of property to add
 * @param {Function} getter function to be used for name
 * @name addProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter.call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],24:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### flag(object, key, [value])
 *
 * Get or set a flag value on an object. If a
 * value is provided it will be set, else it will
 * return the currently set value or `undefined` if
 * the value is not set.
 *
 *     utils.flag(this, 'foo', 'bar'); // setter
 *     utils.flag(this, 'foo'); // getter, returns `bar`
 *
 * @param {Object} object constructed Assertion
 * @param {String} key
 * @param {Mixed} value (optional)
 * @name flag
 * @api private
 */

module.exports = function (obj, key, value) {
  var flags = obj.__flags || (obj.__flags = Object.create(null));
  if (arguments.length === 3) {
    flags[key] = value;
  } else {
    return flags[key];
  }
};

},{}],25:[function(require,module,exports){
/*!
 * Chai - getActual utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getActual(object, [actual])
 *
 * Returns the `actual` value for an Assertion
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  return args.length > 4 ? args[4] : obj._obj;
};

},{}],26:[function(require,module,exports){
/*!
 * Chai - getEnumerableProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getEnumerableProperties(object)
 *
 * This allows the retrieval of enumerable property names of an object,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getEnumerableProperties
 * @api public
 */

module.exports = function getEnumerableProperties(object) {
  var result = [];
  for (var name in object) {
    result.push(name);
  }
  return result;
};

},{}],27:[function(require,module,exports){
/*!
 * Chai - message composition utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag')
  , getActual = require('./getActual')
  , inspect = require('./inspect')
  , objDisplay = require('./objDisplay');

/**
 * ### .getMessage(object, message, negateMessage)
 *
 * Construct the error message based on flags
 * and template tags. Template tags will return
 * a stringified inspection of the object referenced.
 *
 * Message template tags:
 * - `#{this}` current asserted object
 * - `#{act}` actual value
 * - `#{exp}` expected value
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @name getMessage
 * @api public
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , val = flag(obj, 'object')
    , expected = args[3]
    , actual = getActual(obj, args)
    , msg = negate ? args[2] : args[1]
    , flagMsg = flag(obj, 'message');

  if(typeof msg === "function") msg = msg();
  msg = msg || '';
  msg = msg
    .replace(/#{this}/g, objDisplay(val))
    .replace(/#{act}/g, objDisplay(actual))
    .replace(/#{exp}/g, objDisplay(expected));

  return flagMsg ? flagMsg + ': ' + msg : msg;
};

},{"./flag":24,"./getActual":25,"./inspect":34,"./objDisplay":35}],28:[function(require,module,exports){
/*!
 * Chai - getName utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getName(func)
 *
 * Gets the name of a function, in a cross-browser way.
 *
 * @param {Function} a function (usually a constructor)
 */

module.exports = function (func) {
  if (func.name) return func.name;

  var match = /^\s?function ([^(]*)\(/.exec(func);
  return match && match[1] ? match[1] : "";
};

},{}],29:[function(require,module,exports){
/*!
 * Chai - getPathInfo utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var hasProperty = require('./hasProperty');

/**
 * ### .getPathInfo(path, object)
 *
 * This allows the retrieval of property info in an
 * object given a string path.
 *
 * The path info consists of an object with the
 * following properties:
 *
 * * parent - The parent object of the property referenced by `path`
 * * name - The name of the final property, a number if it was an array indexer
 * * value - The value of the property, if it exists, otherwise `undefined`
 * * exists - Whether the property exists or not
 *
 * @param {String} path
 * @param {Object} object
 * @returns {Object} info
 * @name getPathInfo
 * @api public
 */

module.exports = function getPathInfo(path, obj) {
  var parsed = parsePath(path),
      last = parsed[parsed.length - 1];

  var info = {
    parent: parsed.length > 1 ? _getPathValue(parsed, obj, parsed.length - 1) : obj,
    name: last.p || last.i,
    value: _getPathValue(parsed, obj),
  };
  info.exists = hasProperty(info.name, info.parent);

  return info;
};


/*!
 * ## parsePath(path)
 *
 * Helper function used to parse string object
 * paths. Use in conjunction with `_getPathValue`.
 *
 *      var parsed = parsePath('myobject.property.subprop');
 *
 * ### Paths:
 *
 * * Can be as near infinitely deep and nested
 * * Arrays are also valid using the formal `myobject.document[3].property`.
 * * Literal dots and brackets (not delimiter) must be backslash-escaped.
 *
 * @param {String} path
 * @returns {Object} parsed
 * @api private
 */

function parsePath (path) {
  var str = path.replace(/([^\\])\[/g, '$1.[')
    , parts = str.match(/(\\\.|[^.]+?)+/g);
  return parts.map(function (value) {
    var re = /^\[(\d+)\]$/
      , mArr = re.exec(value);
    if (mArr) return { i: parseFloat(mArr[1]) };
    else return { p: value.replace(/\\([.\[\]])/g, '$1') };
  });
}


/*!
 * ## _getPathValue(parsed, obj)
 *
 * Helper companion function for `.parsePath` that returns
 * the value located at the parsed address.
 *
 *      var value = getPathValue(parsed, obj);
 *
 * @param {Object} parsed definition from `parsePath`.
 * @param {Object} object to search against
 * @param {Number} object to search against
 * @returns {Object|Undefined} value
 * @api private
 */

function _getPathValue (parsed, obj, index) {
  var tmp = obj
    , res;

  index = (index === undefined ? parsed.length : index);

  for (var i = 0, l = index; i < l; i++) {
    var part = parsed[i];
    if (tmp) {
      if ('undefined' !== typeof part.p)
        tmp = tmp[part.p];
      else if ('undefined' !== typeof part.i)
        tmp = tmp[part.i];
      if (i == (l - 1)) res = tmp;
    } else {
      res = undefined;
    }
  }
  return res;
}

},{"./hasProperty":32}],30:[function(require,module,exports){
/*!
 * Chai - getPathValue utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * @see https://github.com/logicalparadox/filtr
 * MIT Licensed
 */

var getPathInfo = require('./getPathInfo');

/**
 * ### .getPathValue(path, object)
 *
 * This allows the retrieval of values in an
 * object given a string path.
 *
 *     var obj = {
 *         prop1: {
 *             arr: ['a', 'b', 'c']
 *           , str: 'Hello'
 *         }
 *       , prop2: {
 *             arr: [ { nested: 'Universe' } ]
 *           , str: 'Hello again!'
 *         }
 *     }
 *
 * The following would be the results.
 *
 *     getPathValue('prop1.str', obj); // Hello
 *     getPathValue('prop1.att[2]', obj); // b
 *     getPathValue('prop2.arr[0].nested', obj); // Universe
 *
 * @param {String} path
 * @param {Object} object
 * @returns {Object} value or `undefined`
 * @name getPathValue
 * @api public
 */
module.exports = function(path, obj) {
  var info = getPathInfo(path, obj);
  return info.value;
}; 

},{"./getPathInfo":29}],31:[function(require,module,exports){
/*!
 * Chai - getProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getProperties(object)
 *
 * This allows the retrieval of property names of an object, enumerable or not,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getProperties
 * @api public
 */

module.exports = function getProperties(object) {
  var result = Object.getOwnPropertyNames(subject);

  function addProperty(property) {
    if (result.indexOf(property) === -1) {
      result.push(property);
    }
  }

  var proto = Object.getPrototypeOf(subject);
  while (proto !== null) {
    Object.getOwnPropertyNames(proto).forEach(addProperty);
    proto = Object.getPrototypeOf(proto);
  }

  return result;
};

},{}],32:[function(require,module,exports){
/*!
 * Chai - hasProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var type = require('./type');

/**
 * ### .hasProperty(object, name)
 *
 * This allows checking whether an object has
 * named property or numeric array index.
 *
 * Basically does the same thing as the `in`
 * operator but works properly with natives
 * and null/undefined values.
 *
 *     var obj = {
 *         arr: ['a', 'b', 'c']
 *       , str: 'Hello'
 *     }
 *
 * The following would be the results.
 *
 *     hasProperty('str', obj);  // true
 *     hasProperty('constructor', obj);  // true
 *     hasProperty('bar', obj);  // false
 *     
 *     hasProperty('length', obj.str); // true
 *     hasProperty(1, obj.str);  // true
 *     hasProperty(5, obj.str);  // false
 *
 *     hasProperty('length', obj.arr);  // true
 *     hasProperty(2, obj.arr);  // true
 *     hasProperty(3, obj.arr);  // false
 *
 * @param {Objuect} object
 * @param {String|Number} name
 * @returns {Boolean} whether it exists
 * @name getPathInfo
 * @api public
 */

var literals = {
    'number': Number
  , 'string': String
};

module.exports = function hasProperty(name, obj) {
  var ot = type(obj);

  // Bad Object, obviously no props at all
  if(ot === 'null' || ot === 'undefined')
    return false;

  // The `in` operator does not work with certain literals
  // box these before the check
  if(literals[ot] && typeof obj !== 'object')
    obj = new literals[ot](obj);

  return name in obj;
};

},{"./type":41}],33:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Main exports
 */

var exports = module.exports = {};

/*!
 * test utility
 */

exports.test = require('./test');

/*!
 * type utility
 */

exports.type = require('./type');

/*!
 * message utility
 */

exports.getMessage = require('./getMessage');

/*!
 * actual utility
 */

exports.getActual = require('./getActual');

/*!
 * Inspect util
 */

exports.inspect = require('./inspect');

/*!
 * Object Display util
 */

exports.objDisplay = require('./objDisplay');

/*!
 * Flag utility
 */

exports.flag = require('./flag');

/*!
 * Flag transferring utility
 */

exports.transferFlags = require('./transferFlags');

/*!
 * Deep equal utility
 */

exports.eql = require('deep-eql');

/*!
 * Deep path value
 */

exports.getPathValue = require('./getPathValue');

/*!
 * Deep path info
 */

exports.getPathInfo = require('./getPathInfo');

/*!
 * Check if a property exists
 */

exports.hasProperty = require('./hasProperty');

/*!
 * Function name
 */

exports.getName = require('./getName');

/*!
 * add Property
 */

exports.addProperty = require('./addProperty');

/*!
 * add Method
 */

exports.addMethod = require('./addMethod');

/*!
 * overwrite Property
 */

exports.overwriteProperty = require('./overwriteProperty');

/*!
 * overwrite Method
 */

exports.overwriteMethod = require('./overwriteMethod');

/*!
 * Add a chainable method
 */

exports.addChainableMethod = require('./addChainableMethod');

/*!
 * Overwrite chainable method
 */

exports.overwriteChainableMethod = require('./overwriteChainableMethod');


},{"./addChainableMethod":21,"./addMethod":22,"./addProperty":23,"./flag":24,"./getActual":25,"./getMessage":27,"./getName":28,"./getPathInfo":29,"./getPathValue":30,"./hasProperty":32,"./inspect":34,"./objDisplay":35,"./overwriteChainableMethod":36,"./overwriteMethod":37,"./overwriteProperty":38,"./test":39,"./transferFlags":40,"./type":41,"deep-eql":43}],34:[function(require,module,exports){
// This is (almost) directly from Node.js utils
// https://github.com/joyent/node/blob/f8c335d0caf47f16d31413f89aa28eda3878e3aa/lib/util.js

var getName = require('./getName');
var getProperties = require('./getProperties');
var getEnumerableProperties = require('./getEnumerableProperties');

module.exports = inspect;

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 */
function inspect(obj, showHidden, depth, colors) {
  var ctx = {
    showHidden: showHidden,
    seen: [],
    stylize: function (str) { return str; }
  };
  return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
}

// Returns true if object is a DOM element.
var isDOMElement = function (object) {
  if (typeof HTMLElement === 'object') {
    return object instanceof HTMLElement;
  } else {
    return object &&
      typeof object === 'object' &&
      object.nodeType === 1 &&
      typeof object.nodeName === 'string';
  }
};

function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (typeof ret !== 'string') {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // If this is a DOM element, try to get the outer HTML.
  if (isDOMElement(value)) {
    if ('outerHTML' in value) {
      return value.outerHTML;
      // This value does not have an outerHTML attribute,
      //   it could still be an XML element
    } else {
      // Attempt to serialize it
      try {
        if (document.xmlVersion) {
          var xmlSerializer = new XMLSerializer();
          return xmlSerializer.serializeToString(value);
        } else {
          // Firefox 11- do not support outerHTML
          //   It does, however, support innerHTML
          //   Use the following to render the element
          var ns = "http://www.w3.org/1999/xhtml";
          var container = document.createElementNS(ns, '_');

          container.appendChild(value.cloneNode(false));
          html = container.innerHTML
            .replace('><', '>' + value.innerHTML + '<');
          container.innerHTML = '';
          return html;
        }
      } catch (err) {
        // This could be a non-native DOM implementation,
        //   continue with the normal flow:
        //   printing the element as if it is an object.
      }
    }
  }

  // Look up the keys of the object.
  var visibleKeys = getEnumerableProperties(value);
  var keys = ctx.showHidden ? getProperties(value) : visibleKeys;

  // Some type of object without properties can be shortcutted.
  // In IE, errors have a single `stack` property, or if they are vanilla `Error`,
  // a `stack` plus `description` property; ignore those for consistency.
  if (keys.length === 0 || (isError(value) && (
      (keys.length === 1 && keys[0] === 'stack') ||
      (keys.length === 2 && keys[0] === 'description' && keys[1] === 'stack')
     ))) {
    if (typeof value === 'function') {
      var name = getName(value);
      var nameSuffix = name ? ': ' + name : '';
      return ctx.stylize('[Function' + nameSuffix + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toUTCString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (typeof value === 'function') {
    var name = getName(value);
    var nameSuffix = name ? ': ' + name : '';
    base = ' [Function' + nameSuffix + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    return formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  switch (typeof value) {
    case 'undefined':
      return ctx.stylize('undefined', 'undefined');

    case 'string':
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');

    case 'number':
      if (value === 0 && (1/value) === -Infinity) {
        return ctx.stylize('-0', 'number');
      }
      return ctx.stylize('' + value, 'number');

    case 'boolean':
      return ctx.stylize('' + value, 'boolean');
  }
  // For some reason typeof null is "object", so special case here.
  if (value === null) {
    return ctx.stylize('null', 'null');
  }
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (Object.prototype.hasOwnProperty.call(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str;
  if (value.__lookupGetter__) {
    if (value.__lookupGetter__(key)) {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
  }
  if (visibleKeys.indexOf(key) < 0) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(value[key]) < 0) {
      if (recurseTimes === null) {
        str = formatValue(ctx, value[key], null);
      } else {
        str = formatValue(ctx, value[key], recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (typeof name === 'undefined') {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}

function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && objectToString(ar) === '[object Array]');
}

function isRegExp(re) {
  return typeof re === 'object' && objectToString(re) === '[object RegExp]';
}

function isDate(d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]';
}

function isError(e) {
  return typeof e === 'object' && objectToString(e) === '[object Error]';
}

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

},{"./getEnumerableProperties":26,"./getName":28,"./getProperties":31}],35:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var inspect = require('./inspect');
var config = require('../config');

/**
 * ### .objDisplay (object)
 *
 * Determines if an object or an array matches
 * criteria to be inspected in-line for error
 * messages or should be truncated.
 *
 * @param {Mixed} javascript object to inspect
 * @name objDisplay
 * @api public
 */

module.exports = function (obj) {
  var str = inspect(obj)
    , type = Object.prototype.toString.call(obj);

  if (config.truncateThreshold && str.length >= config.truncateThreshold) {
    if (type === '[object Function]') {
      return !obj.name || obj.name === ''
        ? '[Function]'
        : '[Function: ' + obj.name + ']';
    } else if (type === '[object Array]') {
      return '[ Array(' + obj.length + ') ]';
    } else if (type === '[object Object]') {
      var keys = Object.keys(obj)
        , kstr = keys.length > 2
          ? keys.splice(0, 2).join(', ') + ', ...'
          : keys.join(', ');
      return '{ Object (' + kstr + ') }';
    } else {
      return str;
    }
  } else {
    return str;
  }
};

},{"../config":16,"./inspect":34}],36:[function(require,module,exports){
/*!
 * Chai - overwriteChainableMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Overwites an already existing chainable method
 * and provides access to the previous function or
 * property.  Must return functions to be used for
 * name.
 *
 *     utils.overwriteChainableMethod(chai.Assertion.prototype, 'length',
 *       function (_super) {
 *       }
 *     , function (_super) {
 *       }
 *     );
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteChainableMethod('foo', fn, fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.have.length(3);
 *     expect(myFoo).to.have.length.above(3);
 *
 * @param {Object} ctx object whose method / property is to be overwritten
 * @param {String} name of method / property to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @param {Function} chainingBehavior function that returns a function to be used for property
 * @name overwriteChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  var chainableBehavior = ctx.__methods[name];

  var _chainingBehavior = chainableBehavior.chainingBehavior;
  chainableBehavior.chainingBehavior = function () {
    var result = chainingBehavior(_chainingBehavior).call(this);
    return result === undefined ? this : result;
  };

  var _method = chainableBehavior.method;
  chainableBehavior.method = function () {
    var result = method(_method).apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{}],37:[function(require,module,exports){
/*!
 * Chai - overwriteMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteMethod (ctx, name, fn)
 *
 * Overwites an already existing method and provides
 * access to previous function. Must return function
 * to be used for name.
 *
 *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
 *       return function (str) {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.value).to.equal(str);
 *         } else {
 *           _super.apply(this, arguments);
 *         }
 *       }
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.equal('bar');
 *
 * @param {Object} ctx object whose method is to be overwritten
 * @param {String} name of method to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @name overwriteMethod
 * @api public
 */

module.exports = function (ctx, name, method) {
  var _method = ctx[name]
    , _super = function () { return this; };

  if (_method && 'function' === typeof _method)
    _super = _method;

  ctx[name] = function () {
    var result = method(_super).apply(this, arguments);
    return result === undefined ? this : result;
  }
};

},{}],38:[function(require,module,exports){
/*!
 * Chai - overwriteProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteProperty (ctx, name, fn)
 *
 * Overwites an already existing property getter and provides
 * access to previous value. Must return function to use as getter.
 *
 *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
 *       return function () {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.name).to.equal('bar');
 *         } else {
 *           _super.call(this);
 *         }
 *       }
 *     });
 *
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.ok;
 *
 * @param {Object} ctx object whose property is to be overwritten
 * @param {String} name of property to overwrite
 * @param {Function} getter function that returns a getter function to be used for name
 * @name overwriteProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  var _get = Object.getOwnPropertyDescriptor(ctx, name)
    , _super = function () {};

  if (_get && 'function' === typeof _get.get)
    _super = _get.get

  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter(_super).call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],39:[function(require,module,exports){
/*!
 * Chai - test utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag');

/**
 * # test(object, expression)
 *
 * Test and object for expression.
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , expr = args[0];
  return negate ? !expr : expr;
};

},{"./flag":24}],40:[function(require,module,exports){
/*!
 * Chai - transferFlags utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### transferFlags(assertion, object, includeAll = true)
 *
 * Transfer all the flags for `assertion` to `object`. If
 * `includeAll` is set to `false`, then the base Chai
 * assertion flags (namely `object`, `ssfi`, and `message`)
 * will not be transferred.
 *
 *
 *     var newAssertion = new Assertion();
 *     utils.transferFlags(assertion, newAssertion);
 *
 *     var anotherAsseriton = new Assertion(myObj);
 *     utils.transferFlags(assertion, anotherAssertion, false);
 *
 * @param {Assertion} assertion the assertion to transfer the flags from
 * @param {Object} object the object to transfer the flags to; usually a new assertion
 * @param {Boolean} includeAll
 * @name transferFlags
 * @api private
 */

module.exports = function (assertion, object, includeAll) {
  var flags = assertion.__flags || (assertion.__flags = Object.create(null));

  if (!object.__flags) {
    object.__flags = Object.create(null);
  }

  includeAll = arguments.length === 3 ? includeAll : true;

  for (var flag in flags) {
    if (includeAll ||
        (flag !== 'object' && flag !== 'ssfi' && flag != 'message')) {
      object.__flags[flag] = flags[flag];
    }
  }
};

},{}],41:[function(require,module,exports){
/*!
 * Chai - type utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Arguments]': 'arguments'
  , '[object Array]': 'array'
  , '[object Date]': 'date'
  , '[object Function]': 'function'
  , '[object Number]': 'number'
  , '[object RegExp]': 'regexp'
  , '[object String]': 'string'
};

/**
 * ### type(object)
 *
 * Better implementation of `typeof` detection that can
 * be used cross-browser. Handles the inconsistencies of
 * Array, `null`, and `undefined` detection.
 *
 *     utils.type({}) // 'object'
 *     utils.type(null) // `null'
 *     utils.type(undefined) // `undefined`
 *     utils.type([]) // `array`
 *
 * @param {Mixed} object to detect type of
 * @name type
 * @api private
 */

module.exports = function (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
};

},{}],42:[function(require,module,exports){
/*!
 * assertion-error
 * Copyright(c) 2013 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Return a function that will copy properties from
 * one object to another excluding any originally
 * listed. Returned function will create a new `{}`.
 *
 * @param {String} excluded properties ...
 * @return {Function}
 */

function exclude () {
  var excludes = [].slice.call(arguments);

  function excludeProps (res, obj) {
    Object.keys(obj).forEach(function (key) {
      if (!~excludes.indexOf(key)) res[key] = obj[key];
    });
  }

  return function extendExclude () {
    var args = [].slice.call(arguments)
      , i = 0
      , res = {};

    for (; i < args.length; i++) {
      excludeProps(res, args[i]);
    }

    return res;
  };
};

/*!
 * Primary Exports
 */

module.exports = AssertionError;

/**
 * ### AssertionError
 *
 * An extension of the JavaScript `Error` constructor for
 * assertion and validation scenarios.
 *
 * @param {String} message
 * @param {Object} properties to include (optional)
 * @param {callee} start stack function (optional)
 */

function AssertionError (message, _props, ssf) {
  var extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON')
    , props = extend(_props || {});

  // default values
  this.message = message || 'Unspecified AssertionError';
  this.showDiff = false;

  // copy from properties
  for (var key in props) {
    this[key] = props[key];
  }

  // capture stack trace
  ssf = ssf || arguments.callee;
  if (ssf && Error.captureStackTrace) {
    Error.captureStackTrace(this, ssf);
  }
}

/*!
 * Inherit from Error.prototype
 */

AssertionError.prototype = Object.create(Error.prototype);

/*!
 * Statically set name
 */

AssertionError.prototype.name = 'AssertionError';

/*!
 * Ensure correct constructor
 */

AssertionError.prototype.constructor = AssertionError;

/**
 * Allow errors to be converted to JSON for static transfer.
 *
 * @param {Boolean} include stack (default: `true`)
 * @return {Object} object that can be `JSON.stringify`
 */

AssertionError.prototype.toJSON = function (stack) {
  var extend = exclude('constructor', 'toJSON', 'stack')
    , props = extend({ name: this.name }, this);

  // include stack if exists and not turned off
  if (false !== stack && this.stack) {
    props.stack = this.stack;
  }

  return props;
};

},{}],43:[function(require,module,exports){
module.exports = require('./lib/eql');

},{"./lib/eql":44}],44:[function(require,module,exports){
/*!
 * deep-eql
 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var type = require('type-detect');

/*!
 * Buffer.isBuffer browser shim
 */

var Buffer;
try { Buffer = require('buffer').Buffer; }
catch(ex) {
  Buffer = {};
  Buffer.isBuffer = function() { return false; }
}

/*!
 * Primary Export
 */

module.exports = deepEqual;

/**
 * Assert super-strict (egal) equality between
 * two objects of any type.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @param {Array} memoised (optional)
 * @return {Boolean} equal match
 */

function deepEqual(a, b, m) {
  if (sameValue(a, b)) {
    return true;
  } else if ('date' === type(a)) {
    return dateEqual(a, b);
  } else if ('regexp' === type(a)) {
    return regexpEqual(a, b);
  } else if (Buffer.isBuffer(a)) {
    return bufferEqual(a, b);
  } else if ('arguments' === type(a)) {
    return argumentsEqual(a, b, m);
  } else if (!typeEqual(a, b)) {
    return false;
  } else if (('object' !== type(a) && 'object' !== type(b))
  && ('array' !== type(a) && 'array' !== type(b))) {
    return sameValue(a, b);
  } else {
    return objectEqual(a, b, m);
  }
}

/*!
 * Strict (egal) equality test. Ensures that NaN always
 * equals NaN and `-0` does not equal `+0`.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} equal match
 */

function sameValue(a, b) {
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  return a !== a && b !== b;
}

/*!
 * Compare the types of two given objects and
 * return if they are equal. Note that an Array
 * has a type of `array` (not `object`) and arguments
 * have a type of `arguments` (not `array`/`object`).
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function typeEqual(a, b) {
  return type(a) === type(b);
}

/*!
 * Compare two Date objects by asserting that
 * the time values are equal using `saveValue`.
 *
 * @param {Date} a
 * @param {Date} b
 * @return {Boolean} result
 */

function dateEqual(a, b) {
  if ('date' !== type(b)) return false;
  return sameValue(a.getTime(), b.getTime());
}

/*!
 * Compare two regular expressions by converting them
 * to string and checking for `sameValue`.
 *
 * @param {RegExp} a
 * @param {RegExp} b
 * @return {Boolean} result
 */

function regexpEqual(a, b) {
  if ('regexp' !== type(b)) return false;
  return sameValue(a.toString(), b.toString());
}

/*!
 * Assert deep equality of two `arguments` objects.
 * Unfortunately, these must be sliced to arrays
 * prior to test to ensure no bad behavior.
 *
 * @param {Arguments} a
 * @param {Arguments} b
 * @param {Array} memoize (optional)
 * @return {Boolean} result
 */

function argumentsEqual(a, b, m) {
  if ('arguments' !== type(b)) return false;
  a = [].slice.call(a);
  b = [].slice.call(b);
  return deepEqual(a, b, m);
}

/*!
 * Get enumerable properties of a given object.
 *
 * @param {Object} a
 * @return {Array} property names
 */

function enumerable(a) {
  var res = [];
  for (var key in a) res.push(key);
  return res;
}

/*!
 * Simple equality for flat iterable objects
 * such as Arrays or Node.js buffers.
 *
 * @param {Iterable} a
 * @param {Iterable} b
 * @return {Boolean} result
 */

function iterableEqual(a, b) {
  if (a.length !==  b.length) return false;

  var i = 0;
  var match = true;

  for (; i < a.length; i++) {
    if (a[i] !== b[i]) {
      match = false;
      break;
    }
  }

  return match;
}

/*!
 * Extension to `iterableEqual` specifically
 * for Node.js Buffers.
 *
 * @param {Buffer} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function bufferEqual(a, b) {
  if (!Buffer.isBuffer(b)) return false;
  return iterableEqual(a, b);
}

/*!
 * Block for `objectEqual` ensuring non-existing
 * values don't get in.
 *
 * @param {Mixed} object
 * @return {Boolean} result
 */

function isValue(a) {
  return a !== null && a !== undefined;
}

/*!
 * Recursively check the equality of two objects.
 * Once basic sameness has been established it will
 * defer to `deepEqual` for each enumerable key
 * in the object.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function objectEqual(a, b, m) {
  if (!isValue(a) || !isValue(b)) {
    return false;
  }

  if (a.prototype !== b.prototype) {
    return false;
  }

  var i;
  if (m) {
    for (i = 0; i < m.length; i++) {
      if ((m[i][0] === a && m[i][1] === b)
      ||  (m[i][0] === b && m[i][1] === a)) {
        return true;
      }
    }
  } else {
    m = [];
  }

  try {
    var ka = enumerable(a);
    var kb = enumerable(b);
  } catch (ex) {
    return false;
  }

  ka.sort();
  kb.sort();

  if (!iterableEqual(ka, kb)) {
    return false;
  }

  m.push([ a, b ]);

  var key;
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], m)) {
      return false;
    }
  }

  return true;
}

},{"buffer":4,"type-detect":45}],45:[function(require,module,exports){
module.exports = require('./lib/type');

},{"./lib/type":46}],46:[function(require,module,exports){
/*!
 * type-detect
 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Primary Exports
 */

var exports = module.exports = getType;

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Array]': 'array'
  , '[object RegExp]': 'regexp'
  , '[object Function]': 'function'
  , '[object Arguments]': 'arguments'
  , '[object Date]': 'date'
};

/**
 * ### typeOf (obj)
 *
 * Use several different techniques to determine
 * the type of object being tested.
 *
 *
 * @param {Mixed} object
 * @return {String} object type
 * @api public
 */

function getType (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
}

exports.Library = Library;

/**
 * ### Library
 *
 * Create a repository for custom type detection.
 *
 * ```js
 * var lib = new type.Library;
 * ```
 *
 */

function Library () {
  this.tests = {};
}

/**
 * #### .of (obj)
 *
 * Expose replacement `typeof` detection to the library.
 *
 * ```js
 * if ('string' === lib.of('hello world')) {
 *   // ...
 * }
 * ```
 *
 * @param {Mixed} object to test
 * @return {String} type
 */

Library.prototype.of = getType;

/**
 * #### .define (type, test)
 *
 * Add a test to for the `.test()` assertion.
 *
 * Can be defined as a regular expression:
 *
 * ```js
 * lib.define('int', /^[0-9]+$/);
 * ```
 *
 * ... or as a function:
 *
 * ```js
 * lib.define('bln', function (obj) {
 *   if ('boolean' === lib.of(obj)) return true;
 *   var blns = [ 'yes', 'no', 'true', 'false', 1, 0 ];
 *   if ('string' === lib.of(obj)) obj = obj.toLowerCase();
 *   return !! ~blns.indexOf(obj);
 * });
 * ```
 *
 * @param {String} type
 * @param {RegExp|Function} test
 * @api public
 */

Library.prototype.define = function (type, test) {
  if (arguments.length === 1) return this.tests[type];
  this.tests[type] = test;
  return this;
};

/**
 * #### .test (obj, test)
 *
 * Assert that an object is of type. Will first
 * check natives, and if that does not pass it will
 * use the user defined custom tests.
 *
 * ```js
 * assert(lib.test('1', 'int'));
 * assert(lib.test('yes', 'bln'));
 * ```
 *
 * @param {Mixed} object
 * @param {String} type
 * @return {Boolean} result
 * @api public
 */

Library.prototype.test = function (obj, type) {
  if (type === getType(obj)) return true;
  var test = this.tests[type];

  if (test && 'regexp' === getType(test)) {
    return test.test(obj);
  } else if (test && 'function' === getType(test)) {
    return test(obj);
  } else {
    throw new ReferenceError('Type test "' + type + '" not defined or invalid.');
  }
};

},{}],47:[function(require,module,exports){
(function (global){
// http://www.rajdeepd.com/articles/chrome/localstrg/LocalStorageSample.htm

// NOTE:
// this varies from actual localStorage in some subtle ways

// also, there is no persistence
// TODO persist
(function () {
  "use strict";

  var db;

  function LocalStorage() {
  }
  db = LocalStorage;

  db.prototype.getItem = function (key) {
    if (this.hasOwnProperty(key)) {
      return String(this[key]);
    }
    return null;
  };

  db.prototype.setItem = function (key, val) {
    this[key] = String(val);
  };

  db.prototype.removeItem = function (key) {
    delete this[key];
  };

  db.prototype.clear = function () {
    var self = this;
    Object.keys(self).forEach(function (key) {
      self[key] = undefined;
      delete self[key];
    });
  };

  db.prototype.key = function (i) {
    i = i || 0;
    return Object.keys(this)[i];
  };

  db.prototype.__defineGetter__('length', function () {
    return Object.keys(this).length;
  });

  if (global.localStorage) {
    module.exports = localStorage;
  } else {
    module.exports = new LocalStorage();
  }
}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],48:[function(require,module,exports){
;(function(win){
	var store = {},
		doc = win.document,
		localStorageName = 'localStorage',
		scriptTag = 'script',
		storage

	store.disabled = false
	store.version = '1.3.17'
	store.set = function(key, value) {}
	store.get = function(key, defaultVal) {}
	store.has = function(key) { return store.get(key) !== undefined }
	store.remove = function(key) {}
	store.clear = function() {}
	store.transact = function(key, defaultVal, transactionFn) {
		if (transactionFn == null) {
			transactionFn = defaultVal
			defaultVal = null
		}
		if (defaultVal == null) {
			defaultVal = {}
		}
		var val = store.get(key, defaultVal)
		transactionFn(val)
		store.set(key, val)
	}
	store.getAll = function() {}
	store.forEach = function() {}

	store.serialize = function(value) {
		return JSON.stringify(value)
	}
	store.deserialize = function(value) {
		if (typeof value != 'string') { return undefined }
		try { return JSON.parse(value) }
		catch(e) { return value || undefined }
	}

	// Functions to encapsulate questionable FireFox 3.6.13 behavior
	// when about.config::dom.storage.enabled === false
	// See https://github.com/marcuswestin/store.js/issues#issue/13
	function isLocalStorageNameSupported() {
		try { return (localStorageName in win && win[localStorageName]) }
		catch(err) { return false }
	}

	if (isLocalStorageNameSupported()) {
		storage = win[localStorageName]
		store.set = function(key, val) {
			if (val === undefined) { return store.remove(key) }
			storage.setItem(key, store.serialize(val))
			return val
		}
		store.get = function(key, defaultVal) {
			var val = store.deserialize(storage.getItem(key))
			return (val === undefined ? defaultVal : val)
		}
		store.remove = function(key) { storage.removeItem(key) }
		store.clear = function() { storage.clear() }
		store.getAll = function() {
			var ret = {}
			store.forEach(function(key, val) {
				ret[key] = val
			})
			return ret
		}
		store.forEach = function(callback) {
			for (var i=0; i<storage.length; i++) {
				var key = storage.key(i)
				callback(key, store.get(key))
			}
		}
	} else if (doc.documentElement.addBehavior) {
		var storageOwner,
			storageContainer
		// Since #userData storage applies only to specific paths, we need to
		// somehow link our data to a specific path.  We choose /favicon.ico
		// as a pretty safe option, since all browsers already make a request to
		// this URL anyway and being a 404 will not hurt us here.  We wrap an
		// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
		// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
		// since the iframe access rules appear to allow direct access and
		// manipulation of the document element, even for a 404 page.  This
		// document can be used instead of the current document (which would
		// have been limited to the current path) to perform #userData storage.
		try {
			storageContainer = new ActiveXObject('htmlfile')
			storageContainer.open()
			storageContainer.write('<'+scriptTag+'>document.w=window</'+scriptTag+'><iframe src="/favicon.ico"></iframe>')
			storageContainer.close()
			storageOwner = storageContainer.w.frames[0].document
			storage = storageOwner.createElement('div')
		} catch(e) {
			// somehow ActiveXObject instantiation failed (perhaps some special
			// security settings or otherwse), fall back to per-path storage
			storage = doc.createElement('div')
			storageOwner = doc.body
		}
		var withIEStorage = function(storeFunction) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0)
				args.unshift(storage)
				// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
				// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
				storageOwner.appendChild(storage)
				storage.addBehavior('#default#userData')
				storage.load(localStorageName)
				var result = storeFunction.apply(store, args)
				storageOwner.removeChild(storage)
				return result
			}
		}

		// In IE7, keys cannot start with a digit or contain certain chars.
		// See https://github.com/marcuswestin/store.js/issues/40
		// See https://github.com/marcuswestin/store.js/issues/83
		var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
		function ieKeyFix(key) {
			return key.replace(/^d/, '___$&').replace(forbiddenCharsRegex, '___')
		}
		store.set = withIEStorage(function(storage, key, val) {
			key = ieKeyFix(key)
			if (val === undefined) { return store.remove(key) }
			storage.setAttribute(key, store.serialize(val))
			storage.save(localStorageName)
			return val
		})
		store.get = withIEStorage(function(storage, key, defaultVal) {
			key = ieKeyFix(key)
			var val = store.deserialize(storage.getAttribute(key))
			return (val === undefined ? defaultVal : val)
		})
		store.remove = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			storage.removeAttribute(key)
			storage.save(localStorageName)
		})
		store.clear = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			for (var i=0, attr; attr=attributes[i]; i++) {
				storage.removeAttribute(attr.name)
			}
			storage.save(localStorageName)
		})
		store.getAll = function(storage) {
			var ret = {}
			store.forEach(function(key, val) {
				ret[key] = val
			})
			return ret
		}
		store.forEach = withIEStorage(function(storage, callback) {
			var attributes = storage.XMLDocument.documentElement.attributes
			for (var i=0, attr; attr=attributes[i]; ++i) {
				callback(attr.name, store.deserialize(storage.getAttribute(attr.name)))
			}
		})
	}

	try {
		var testKey = '__storejs__'
		store.set(testKey, testKey)
		if (store.get(testKey) != testKey) { store.disabled = true }
		store.remove(testKey)
	} catch(e) {
		store.disabled = true
	}
	store.enabled = !store.disabled

	if (typeof module != 'undefined' && module.exports && this.module !== module) { module.exports = store }
	else if (typeof define === 'function' && define.amd) { define(store) }
	else { win.store = store }

})(Function('return this')());

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ0ZXN0L3Rlc3QuanMiLCJhcHAvYXNzZXRzL2pzL21vZGVscy9NYWluUE0uanMiLCJhcHAvYXNzZXRzL2pzL3NlcnZpY2VzL3BlcnNpc3RhbmNlU2VydmljZS5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pcy1hcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2NoYWkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2hhaS9saWIvY2hhaS5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL2Fzc2VydGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL2NvbmZpZy5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL2NvcmUvYXNzZXJ0aW9ucy5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL2ludGVyZmFjZS9hc3NlcnQuanMiLCJub2RlX21vZHVsZXMvY2hhaS9saWIvY2hhaS9pbnRlcmZhY2UvZXhwZWN0LmpzIiwibm9kZV9tb2R1bGVzL2NoYWkvbGliL2NoYWkvaW50ZXJmYWNlL3Nob3VsZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2FkZENoYWluYWJsZU1ldGhvZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2FkZE1ldGhvZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2FkZFByb3BlcnR5LmpzIiwibm9kZV9tb2R1bGVzL2NoYWkvbGliL2NoYWkvdXRpbHMvZmxhZy5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2dldEFjdHVhbC5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2dldEVudW1lcmFibGVQcm9wZXJ0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2NoYWkvbGliL2NoYWkvdXRpbHMvZ2V0TWVzc2FnZS5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2dldE5hbWUuanMiLCJub2RlX21vZHVsZXMvY2hhaS9saWIvY2hhaS91dGlscy9nZXRQYXRoSW5mby5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2dldFBhdGhWYWx1ZS5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2dldFByb3BlcnRpZXMuanMiLCJub2RlX21vZHVsZXMvY2hhaS9saWIvY2hhaS91dGlscy9oYXNQcm9wZXJ0eS5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NoYWkvbGliL2NoYWkvdXRpbHMvaW5zcGVjdC5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL29iakRpc3BsYXkuanMiLCJub2RlX21vZHVsZXMvY2hhaS9saWIvY2hhaS91dGlscy9vdmVyd3JpdGVDaGFpbmFibGVNZXRob2QuanMiLCJub2RlX21vZHVsZXMvY2hhaS9saWIvY2hhaS91dGlscy9vdmVyd3JpdGVNZXRob2QuanMiLCJub2RlX21vZHVsZXMvY2hhaS9saWIvY2hhaS91dGlscy9vdmVyd3JpdGVQcm9wZXJ0eS5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL2xpYi9jaGFpL3V0aWxzL3Rlc3QuanMiLCJub2RlX21vZHVsZXMvY2hhaS9saWIvY2hhaS91dGlscy90cmFuc2ZlckZsYWdzLmpzIiwibm9kZV9tb2R1bGVzL2NoYWkvbGliL2NoYWkvdXRpbHMvdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL25vZGVfbW9kdWxlcy9hc3NlcnRpb24tZXJyb3IvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2hhaS9ub2RlX21vZHVsZXMvZGVlcC1lcWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2hhaS9ub2RlX21vZHVsZXMvZGVlcC1lcWwvbGliL2VxbC5qcyIsIm5vZGVfbW9kdWxlcy9jaGFpL25vZGVfbW9kdWxlcy9kZWVwLWVxbC9ub2RlX21vZHVsZXMvdHlwZS1kZXRlY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2hhaS9ub2RlX21vZHVsZXMvZGVlcC1lcWwvbm9kZV9tb2R1bGVzL3R5cGUtZGV0ZWN0L2xpYi90eXBlLmpzIiwibm9kZV9tb2R1bGVzL2xvY2FsU3RvcmFnZS9saWIvbG9jYWxTdG9yYWdlLmpzIiwibm9kZV9tb2R1bGVzL3N0b3JlL3N0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0NENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMWtCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqa0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy91Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalFBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKmpzaGludCAtVzA3OSAqL1xudmFyIGV4cGVjdCA9IHJlcXVpcmUoJ2NoYWknKS5leHBlY3Q7XG5cbi8vIFNldHVwIE1vY2sgZm9yIE5vZGVcbmdsb2JhbC5sb2NhbFN0b3JhZ2UgPSByZXF1aXJlKCdsb2NhbFN0b3JhZ2UnKTtcblxuXG52YXIgTWFpblBNID0gcmVxdWlyZSgnLi4vYXBwL2Fzc2V0cy9qcy9tb2RlbHMvTWFpblBNJyk7XG5cbmRlc2NyaWJlKCdNYWluUE0nLCBmdW5jdGlvbigpIHtcblxuXHR2YXIgcG07XG5cblx0YmVmb3JlKGZ1bmN0aW9uKCl7XG5cblx0XHRwbSA9IG5ldyBNYWluUE0oKTtcblx0XHRwbS5pbml0KCk7XG5cdH0pO1xuXG5cblx0aXQoJ3Nob3VsZCBzdGFydCB3aXRoIG5vIGl0ZW1zJywgZnVuY3Rpb24oKSB7XG5cblx0XHRleHBlY3QocG0uaXRlbXMubGVuZ3RoKS50by5lcXVhbCgwKTtcblxuXHR9KTtcdFxuXG5cdFxuXG5cdGRlc2NyaWJlKCdhZGRJdGVtJywgZnVuY3Rpb24oKSB7XG5cblx0XHRpdCgnc2hvdWxkIGFkZCBhbiBpdGVtJywgZnVuY3Rpb24oKSB7XG5cblx0XHRcdHBtLmFkZEl0ZW0oJ1Rlc3QnKTtcblxuXHRcdFx0ZXhwZWN0KHBtLml0ZW1zLmxlbmd0aCkudG8uZXF1YWwoMSk7XG5cdFx0XHRleHBlY3QocG0uaXRlbXNbMF0pLnRvLmVxdWFsKCdUZXN0Jyk7XG5cblx0XHR9KTtcdFxuXG5cdFx0aXQoJ3Nob3VsZCBhZGQgYW5vdGhlciBpdGVtJywgZnVuY3Rpb24oKSB7XG5cblx0XHRcdHBtLmFkZEl0ZW0oJ1Rlc3QyJyk7XG5cblx0XHRcdGV4cGVjdChwbS5pdGVtcy5sZW5ndGgpLnRvLmVxdWFsKDIpO1xuXHRcdFx0ZXhwZWN0KHBtLml0ZW1zWzFdKS50by5lcXVhbCgnVGVzdDInKTtcblxuXHRcdH0pO1xuXG5cdH0pO1xuXG5cblx0ZGVzY3JpYmUoJ3JlbW92ZUl0ZW0nLCBmdW5jdGlvbigpIHtcblxuXHRcdGl0KCdzaG91bGQgcmVtb3ZlIGFuIGl0ZW0nLCBmdW5jdGlvbigpIHtcblxuXHRcdFx0cG0ucmVtb3ZlSXRlbSgnVGVzdCcpO1xuXG5cdFx0XHRleHBlY3QocG0uaXRlbXMubGVuZ3RoKS50by5lcXVhbCgxKTtcblx0XHRcdGV4cGVjdChwbS5pdGVtc1swXSkudG8uZXF1YWwoJ1Rlc3QyJyk7XG5cblx0XHR9KTtcdFxuXHRcblx0fSk7XG59KTtcblxuXG5cbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgcGVyc2lzdGFuY2VTZXJ2aWNlID0gcmVxdWlyZSgnLi4vc2VydmljZXMvcGVyc2lzdGFuY2VTZXJ2aWNlJyk7XG5cbnZhciBNYWluUE0gPSBmdW5jdGlvbigpXG57XG5cdHRoaXMuX2l0ZW1zID0gW107XG5cblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG59O1xuXG51dGlsLmluaGVyaXRzKE1haW5QTSwgRXZlbnRFbWl0dGVyKTtcblxubW9kdWxlLmV4cG9ydHMgPSBNYWluUE07XG5cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1haW5QTS5wcm90b3R5cGUsICdpdGVtcycsIHtcblx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5faXRlbXM7XG5cdH0sXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IHRoaXMuX2l0ZW1zKVxuXHRcdHtcblx0XHRcdHRoaXMuX2l0ZW1zID0gdmFsdWU7XG5cdFx0XHR0aGlzLmVtaXQoJ2l0ZW1zQ2hhbmdlJywgdGhpcy5faXRlbXMpO1xuXHRcdH1cblx0fVxufSk7XG5cblxuTWFpblBNLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gaW5pdCgpIHtcblx0dGhpcy5faXRlbXMgPSBwZXJzaXN0YW5jZVNlcnZpY2UucmVhZEl0ZW1zKCk7XG59O1xuXG5cbk1haW5QTS5wcm90b3R5cGUuYWRkSXRlbSA9IGZ1bmN0aW9uIGFkZEl0ZW0oaXRlbSkge1xuXHRjb25zb2xlLmluZm8oJ0FkZGluZzogJywgaXRlbSk7XG5cdFxuXHR0aGlzLl9pdGVtcy5wdXNoKGl0ZW0pO1xuXHRwZXJzaXN0YW5jZVNlcnZpY2Uuc2F2ZUl0ZW1zKHRoaXMuX2l0ZW1zKTtcblx0XG5cdHRoaXMuZW1pdCgnaXRlbXNDaGFuZ2UnLCB0aGlzLl9pdGVtcyk7XG59O1xuXG5cbk1haW5QTS5wcm90b3R5cGUucmVtb3ZlSXRlbSA9IGZ1bmN0aW9uIGFkZEl0ZW0oaXRlbSkge1xuXHRjb25zb2xlLmluZm8oJ1JlbW92aW5nOiAnLCBpdGVtKTtcblx0XG5cdHZhciBpbmRleCA9IHRoaXMuX2l0ZW1zLmluZGV4T2YoaXRlbSk7XG5cdGlmIChpbmRleCA+IC0xKSBcblx0e1xuICAgIFx0dGhpcy5faXRlbXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICBcdHBlcnNpc3RhbmNlU2VydmljZS5zYXZlSXRlbXModGhpcy5faXRlbXMpO1xuXHR9XG5cdFxuXHR0aGlzLmVtaXQoJ2l0ZW1zQ2hhbmdlJywgdGhpcy5faXRlbXMpO1xufTsiLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIHN0b3JlID0gcmVxdWlyZSgnc3RvcmUnKTtcblxuLyoqXG4gKiBQZXJzaXN0YW5jZSBTZXJ2aWNlIC0gU2luZ2xldG9uXG4gKi9cblxuXG5leHBvcnRzLnJlYWRJdGVtcyA9IGZ1bmN0aW9uIHJlYWRJdGVtcygpXG57XG5cdHJldHVybiBzdG9yZS5nZXQoJ2l0ZW1zJykgfHwgW107XG59O1xuXG5cbmV4cG9ydHMuc2F2ZUl0ZW1zID0gZnVuY3Rpb24gc2F2ZUl0ZW0oaXRlbXMpXG57XG5cdHN0b3JlLnNldCgnaXRlbXMnLCBpdGVtcyk7XG59O1xuXG5cbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpcy1hcnJheScpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG52YXIga01heExlbmd0aCA9IDB4M2ZmZmZmZmZcbnZhciByb290UGFyZW50ID0ge31cblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAtIEltcGxlbWVudGF0aW9uIG11c3Qgc3VwcG9ydCBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcy5cbiAqICAgRmlyZWZveCA0LTI5IGxhY2tlZCBzdXBwb3J0LCBmaXhlZCBpbiBGaXJlZm94IDMwKy5cbiAqICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cbiAqXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleSB3aWxsXG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCB3aWxsIHdvcmsgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IChmdW5jdGlvbiAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBuZXcgVWludDhBcnJheSgxKS5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChhcmcpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICAvLyBBdm9pZCBnb2luZyB0aHJvdWdoIGFuIEFyZ3VtZW50c0FkYXB0b3JUcmFtcG9saW5lIGluIHRoZSBjb21tb24gY2FzZS5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHJldHVybiBuZXcgQnVmZmVyKGFyZywgYXJndW1lbnRzWzFdKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKGFyZylcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gMFxuICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZFxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gZnJvbU51bWJlcih0aGlzLCBhcmcpXG4gIH1cblxuICAvLyBTbGlnaHRseSBsZXNzIGNvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGlzLCBhcmcsIGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogJ3V0ZjgnKVxuICB9XG5cbiAgLy8gVW51c3VhbC5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhpcywgYXJnKVxufVxuXG5mdW5jdGlvbiBmcm9tTnVtYmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChsZW5ndGgpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIC8vIEFzc3VtcHRpb246IGJ5dGVMZW5ndGgoKSByZXR1cm4gdmFsdWUgaXMgYWx3YXlzIDwga01heExlbmd0aC5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgdGhhdC53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpKSByZXR1cm4gZnJvbUJ1ZmZlcih0aGF0LCBvYmplY3QpXG5cbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkgcmV0dXJuIGZyb21BcnJheSh0aGF0LCBvYmplY3QpXG5cbiAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzdGFydCB3aXRoIG51bWJlciwgYnVmZmVyLCBhcnJheSBvciBzdHJpbmcnKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgb2JqZWN0LmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIGZyb21UeXBlZEFycmF5KHRoYXQsIG9iamVjdClcbiAgfVxuXG4gIGlmIChvYmplY3QubGVuZ3RoKSByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmplY3QpXG5cbiAgcmV0dXJuIGZyb21Kc29uT2JqZWN0KHRoYXQsIG9iamVjdClcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlciAodGhhdCwgYnVmZmVyKSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGJ1ZmZlci5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBidWZmZXIuY29weSh0aGF0LCAwLCAwLCBsZW5ndGgpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIER1cGxpY2F0ZSBvZiBmcm9tQXJyYXkoKSB0byBrZWVwIGZyb21BcnJheSgpIG1vbm9tb3JwaGljLlxuZnVuY3Rpb24gZnJvbVR5cGVkQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIC8vIFRydW5jYXRpbmcgdGhlIGVsZW1lbnRzIGlzIHByb2JhYmx5IG5vdCB3aGF0IHBlb3BsZSBleHBlY3QgZnJvbSB0eXBlZFxuICAvLyBhcnJheXMgd2l0aCBCWVRFU19QRVJfRUxFTUVOVCA+IDEgYnV0IGl0J3MgY29tcGF0aWJsZSB3aXRoIHRoZSBiZWhhdmlvclxuICAvLyBvZiB0aGUgb2xkIEJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEZXNlcmlhbGl6ZSB7IHR5cGU6ICdCdWZmZXInLCBkYXRhOiBbMSwyLDMsLi4uXSB9IGludG8gYSBCdWZmZXIgb2JqZWN0LlxuLy8gUmV0dXJucyBhIHplcm8tbGVuZ3RoIGJ1ZmZlciBmb3IgaW5wdXRzIHRoYXQgZG9uJ3QgY29uZm9ybSB0byB0aGUgc3BlYy5cbmZ1bmN0aW9uIGZyb21Kc29uT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgdmFyIGFycmF5XG4gIHZhciBsZW5ndGggPSAwXG5cbiAgaWYgKG9iamVjdC50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iamVjdC5kYXRhKSkge1xuICAgIGFycmF5ID0gb2JqZWN0LmRhdGFcbiAgICBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIH1cbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gYWxsb2NhdGUgKHRoYXQsIGxlbmd0aCkge1xuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIHRoYXQubGVuZ3RoID0gbGVuZ3RoXG4gICAgdGhhdC5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgZnJvbVBvb2wgPSBsZW5ndGggIT09IDAgJiYgbGVuZ3RoIDw9IEJ1ZmZlci5wb29sU2l6ZSA+Pj4gMVxuICBpZiAoZnJvbVBvb2wpIHRoYXQucGFyZW50ID0gcm9vdFBhcmVudFxuXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBrTWF4TGVuZ3RoYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IGtNYXhMZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xvd0J1ZmZlcikpIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcbiAgZGVsZXRlIGJ1Zi5wYXJlbnRcbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgdmFyIGkgPSAwXG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSBicmVha1xuXG4gICAgKytpXG4gIH1cblxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0IGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycy4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHN0cmluZyA9IFN0cmluZyhzdHJpbmcpXG5cbiAgaWYgKHN0cmluZy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHN0cmluZy5sZW5ndGggKiAyXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoID4+PiAxXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG4vLyBwcmUtc2V0IGZvciB2YWx1ZXMgdGhhdCBtYXkgZXhpc3QgaW4gdGhlIGZ1dHVyZVxuQnVmZmVyLnByb3RvdHlwZS5sZW5ndGggPSB1bmRlZmluZWRcbkJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG5cbi8vIHRvU3RyaW5nKGVuY29kaW5nLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICBzdGFydCA9IHN0YXJ0IHwgMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPT09IEluZmluaXR5ID8gdGhpcy5sZW5ndGggOiBlbmQgfCAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiAwXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSByZXR1cm4gLTEgLy8gc3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcgYWx3YXlzIGZhaWxzXG4gICAgcmV0dXJuIFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldClcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yICh2YXIgaSA9IDA7IGJ5dGVPZmZzZXQgKyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyW2J5dGVPZmZzZXQgKyBpXSA9PT0gdmFsW2ZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4XSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbC5sZW5ndGgpIHJldHVybiBieXRlT2Zmc2V0ICsgZm91bmRJbmRleFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0IChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoIHwgMFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIGlmIChuZXdCdWYubGVuZ3RoKSBuZXdCdWYucGFyZW50ID0gdGhpcy5wYXJlbnQgfHwgdGhpc1xuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYnVmZmVyIG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmIChsZW4gPCAxMDAwIHx8ICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0U3RhcnQpXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uIHRvQXJyYXlCdWZmZXIgKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIF9hdWdtZW50IChhcnIpIHtcbiAgYXJyLmNvbnN0cnVjdG9yID0gQnVmZmVyXG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBzZXQgbWV0aG9kIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5lcXVhbHMgPSBCUC5lcXVhbHNcbiAgYXJyLmNvbXBhcmUgPSBCUC5jb21wYXJlXG4gIGFyci5pbmRleE9mID0gQlAuaW5kZXhPZlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50TEUgPSBCUC5yZWFkVUludExFXG4gIGFyci5yZWFkVUludEJFID0gQlAucmVhZFVJbnRCRVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnRMRSA9IEJQLnJlYWRJbnRMRVxuICBhcnIucmVhZEludEJFID0gQlAucmVhZEludEJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludExFID0gQlAud3JpdGVVSW50TEVcbiAgYXJyLndyaXRlVUludEJFID0gQlAud3JpdGVVSW50QkVcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludExFID0gQlAud3JpdGVJbnRMRVxuICBhcnIud3JpdGVJbnRCRSA9IEJQLndyaXRlSW50QkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS16XFwtXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cbiAgdmFyIGkgPSAwXG5cbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgICAgIGNvZGVQb2ludCA9IGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDAgfCAweDEwMDAwXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcblxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICAgIH1cblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MjAwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBuQml0cyA9IC03LFxuICAgICAgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwLFxuICAgICAgZCA9IGlzTEUgPyAtMSA6IDEsXG4gICAgICBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKSxcbiAgICAgIGQgPSBpc0xFID8gMSA6IC0xLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9jaGFpJyk7XG4iLCIvKiFcbiAqIGNoYWlcbiAqIENvcHlyaWdodChjKSAyMDExLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG52YXIgdXNlZCA9IFtdXG4gICwgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8qIVxuICogQ2hhaSB2ZXJzaW9uXG4gKi9cblxuZXhwb3J0cy52ZXJzaW9uID0gJzIuMy4wJztcblxuLyohXG4gKiBBc3NlcnRpb24gRXJyb3JcbiAqL1xuXG5leHBvcnRzLkFzc2VydGlvbkVycm9yID0gcmVxdWlyZSgnYXNzZXJ0aW9uLWVycm9yJyk7XG5cbi8qIVxuICogVXRpbHMgZm9yIHBsdWdpbnMgKG5vdCBleHBvcnRlZClcbiAqL1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vY2hhaS91dGlscycpO1xuXG4vKipcbiAqICMgLnVzZShmdW5jdGlvbilcbiAqXG4gKiBQcm92aWRlcyBhIHdheSB0byBleHRlbmQgdGhlIGludGVybmFscyBvZiBDaGFpXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn1cbiAqIEByZXR1cm5zIHt0aGlzfSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZXhwb3J0cy51c2UgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCF+dXNlZC5pbmRleE9mKGZuKSkge1xuICAgIGZuKHRoaXMsIHV0aWwpO1xuICAgIHVzZWQucHVzaChmbik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qIVxuICogVXRpbGl0eSBGdW5jdGlvbnNcbiAqL1xuXG5leHBvcnRzLnV0aWwgPSB1dGlsO1xuXG4vKiFcbiAqIENvbmZpZ3VyYXRpb25cbiAqL1xuXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jaGFpL2NvbmZpZycpO1xuZXhwb3J0cy5jb25maWcgPSBjb25maWc7XG5cbi8qIVxuICogUHJpbWFyeSBgQXNzZXJ0aW9uYCBwcm90b3R5cGVcbiAqL1xuXG52YXIgYXNzZXJ0aW9uID0gcmVxdWlyZSgnLi9jaGFpL2Fzc2VydGlvbicpO1xuZXhwb3J0cy51c2UoYXNzZXJ0aW9uKTtcblxuLyohXG4gKiBDb3JlIEFzc2VydGlvbnNcbiAqL1xuXG52YXIgY29yZSA9IHJlcXVpcmUoJy4vY2hhaS9jb3JlL2Fzc2VydGlvbnMnKTtcbmV4cG9ydHMudXNlKGNvcmUpO1xuXG4vKiFcbiAqIEV4cGVjdCBpbnRlcmZhY2VcbiAqL1xuXG52YXIgZXhwZWN0ID0gcmVxdWlyZSgnLi9jaGFpL2ludGVyZmFjZS9leHBlY3QnKTtcbmV4cG9ydHMudXNlKGV4cGVjdCk7XG5cbi8qIVxuICogU2hvdWxkIGludGVyZmFjZVxuICovXG5cbnZhciBzaG91bGQgPSByZXF1aXJlKCcuL2NoYWkvaW50ZXJmYWNlL3Nob3VsZCcpO1xuZXhwb3J0cy51c2Uoc2hvdWxkKTtcblxuLyohXG4gKiBBc3NlcnQgaW50ZXJmYWNlXG4gKi9cblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJy4vY2hhaS9pbnRlcmZhY2UvYXNzZXJ0Jyk7XG5leHBvcnRzLnVzZShhc3NlcnQpO1xuIiwiLyohXG4gKiBjaGFpXG4gKiBodHRwOi8vY2hhaWpzLmNvbVxuICogQ29weXJpZ2h0KGMpIDIwMTEtMjAxNCBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfY2hhaSwgdXRpbCkge1xuICAvKiFcbiAgICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAgICovXG5cbiAgdmFyIEFzc2VydGlvbkVycm9yID0gX2NoYWkuQXNzZXJ0aW9uRXJyb3JcbiAgICAsIGZsYWcgPSB1dGlsLmZsYWc7XG5cbiAgLyohXG4gICAqIE1vZHVsZSBleHBvcnQuXG4gICAqL1xuXG4gIF9jaGFpLkFzc2VydGlvbiA9IEFzc2VydGlvbjtcblxuICAvKiFcbiAgICogQXNzZXJ0aW9uIENvbnN0cnVjdG9yXG4gICAqXG4gICAqIENyZWF0ZXMgb2JqZWN0IGZvciBjaGFpbmluZy5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIGZ1bmN0aW9uIEFzc2VydGlvbiAob2JqLCBtc2csIHN0YWNrKSB7XG4gICAgZmxhZyh0aGlzLCAnc3NmaScsIHN0YWNrIHx8IGFyZ3VtZW50cy5jYWxsZWUpO1xuICAgIGZsYWcodGhpcywgJ29iamVjdCcsIG9iaik7XG4gICAgZmxhZyh0aGlzLCAnbWVzc2FnZScsIG1zZyk7XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXNzZXJ0aW9uLCAnaW5jbHVkZVN0YWNrJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Fzc2VydGlvbi5pbmNsdWRlU3RhY2sgaXMgZGVwcmVjYXRlZCwgdXNlIGNoYWkuY29uZmlnLmluY2x1ZGVTdGFjayBpbnN0ZWFkLicpO1xuICAgICAgcmV0dXJuIGNvbmZpZy5pbmNsdWRlU3RhY2s7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Fzc2VydGlvbi5pbmNsdWRlU3RhY2sgaXMgZGVwcmVjYXRlZCwgdXNlIGNoYWkuY29uZmlnLmluY2x1ZGVTdGFjayBpbnN0ZWFkLicpO1xuICAgICAgY29uZmlnLmluY2x1ZGVTdGFjayA9IHZhbHVlO1xuICAgIH1cbiAgfSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEFzc2VydGlvbiwgJ3Nob3dEaWZmJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Fzc2VydGlvbi5zaG93RGlmZiBpcyBkZXByZWNhdGVkLCB1c2UgY2hhaS5jb25maWcuc2hvd0RpZmYgaW5zdGVhZC4nKTtcbiAgICAgIHJldHVybiBjb25maWcuc2hvd0RpZmY7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Fzc2VydGlvbi5zaG93RGlmZiBpcyBkZXByZWNhdGVkLCB1c2UgY2hhaS5jb25maWcuc2hvd0RpZmYgaW5zdGVhZC4nKTtcbiAgICAgIGNvbmZpZy5zaG93RGlmZiA9IHZhbHVlO1xuICAgIH1cbiAgfSk7XG5cbiAgQXNzZXJ0aW9uLmFkZFByb3BlcnR5ID0gZnVuY3Rpb24gKG5hbWUsIGZuKSB7XG4gICAgdXRpbC5hZGRQcm9wZXJ0eSh0aGlzLnByb3RvdHlwZSwgbmFtZSwgZm4pO1xuICB9O1xuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICB1dGlsLmFkZE1ldGhvZCh0aGlzLnByb3RvdHlwZSwgbmFtZSwgZm4pO1xuICB9O1xuXG4gIEFzc2VydGlvbi5hZGRDaGFpbmFibGVNZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgZm4sIGNoYWluaW5nQmVoYXZpb3IpIHtcbiAgICB1dGlsLmFkZENoYWluYWJsZU1ldGhvZCh0aGlzLnByb3RvdHlwZSwgbmFtZSwgZm4sIGNoYWluaW5nQmVoYXZpb3IpO1xuICB9O1xuXG4gIEFzc2VydGlvbi5vdmVyd3JpdGVQcm9wZXJ0eSA9IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgIHV0aWwub3ZlcndyaXRlUHJvcGVydHkodGhpcy5wcm90b3R5cGUsIG5hbWUsIGZuKTtcbiAgfTtcblxuICBBc3NlcnRpb24ub3ZlcndyaXRlTWV0aG9kID0gZnVuY3Rpb24gKG5hbWUsIGZuKSB7XG4gICAgdXRpbC5vdmVyd3JpdGVNZXRob2QodGhpcy5wcm90b3R5cGUsIG5hbWUsIGZuKTtcbiAgfTtcblxuICBBc3NlcnRpb24ub3ZlcndyaXRlQ2hhaW5hYmxlTWV0aG9kID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjaGFpbmluZ0JlaGF2aW9yKSB7XG4gICAgdXRpbC5vdmVyd3JpdGVDaGFpbmFibGVNZXRob2QodGhpcy5wcm90b3R5cGUsIG5hbWUsIGZuLCBjaGFpbmluZ0JlaGF2aW9yKTtcbiAgfTtcblxuICAvKiFcbiAgICogIyMjIC5hc3NlcnQoZXhwcmVzc2lvbiwgbWVzc2FnZSwgbmVnYXRlTWVzc2FnZSwgZXhwZWN0ZWQsIGFjdHVhbClcbiAgICpcbiAgICogRXhlY3V0ZXMgYW4gZXhwcmVzc2lvbiBhbmQgY2hlY2sgZXhwZWN0YXRpb25zLiBUaHJvd3MgQXNzZXJ0aW9uRXJyb3IgZm9yIHJlcG9ydGluZyBpZiB0ZXN0IGRvZXNuJ3QgcGFzcy5cbiAgICpcbiAgICogQG5hbWUgYXNzZXJ0XG4gICAqIEBwYXJhbSB7UGhpbG9zb3BoaWNhbH0gZXhwcmVzc2lvbiB0byBiZSB0ZXN0ZWRcbiAgICogQHBhcmFtIHtTdHJpbmcgb3IgRnVuY3Rpb259IG1lc3NhZ2Ugb3IgZnVuY3Rpb24gdGhhdCByZXR1cm5zIG1lc3NhZ2UgdG8gZGlzcGxheSBpZiBleHByZXNzaW9uIGZhaWxzXG4gICAqIEBwYXJhbSB7U3RyaW5nIG9yIEZ1bmN0aW9ufSBuZWdhdGVkTWVzc2FnZSBvciBmdW5jdGlvbiB0aGF0IHJldHVybnMgbmVnYXRlZE1lc3NhZ2UgdG8gZGlzcGxheSBpZiBuZWdhdGVkIGV4cHJlc3Npb24gZmFpbHNcbiAgICogQHBhcmFtIHtNaXhlZH0gZXhwZWN0ZWQgdmFsdWUgKHJlbWVtYmVyIHRvIGNoZWNrIGZvciBuZWdhdGlvbilcbiAgICogQHBhcmFtIHtNaXhlZH0gYWN0dWFsIChvcHRpb25hbCkgd2lsbCBkZWZhdWx0IHRvIGB0aGlzLm9iamBcbiAgICogQHBhcmFtIHtCb29sZWFufSBzaG93RGlmZiAob3B0aW9uYWwpIHdoZW4gc2V0IHRvIGB0cnVlYCwgYXNzZXJ0IHdpbGwgZGlzcGxheSBhIGRpZmYgaW4gYWRkaXRpb24gdG8gdGhlIG1lc3NhZ2UgaWYgZXhwcmVzc2lvbiBmYWlsc1xuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgQXNzZXJ0aW9uLnByb3RvdHlwZS5hc3NlcnQgPSBmdW5jdGlvbiAoZXhwciwgbXNnLCBuZWdhdGVNc2csIGV4cGVjdGVkLCBfYWN0dWFsLCBzaG93RGlmZikge1xuICAgIHZhciBvayA9IHV0aWwudGVzdCh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh0cnVlICE9PSBzaG93RGlmZikgc2hvd0RpZmYgPSBmYWxzZTtcbiAgICBpZiAodHJ1ZSAhPT0gY29uZmlnLnNob3dEaWZmKSBzaG93RGlmZiA9IGZhbHNlO1xuXG4gICAgaWYgKCFvaykge1xuICAgICAgdmFyIG1zZyA9IHV0aWwuZ2V0TWVzc2FnZSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAgICwgYWN0dWFsID0gdXRpbC5nZXRBY3R1YWwodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2csIHtcbiAgICAgICAgICBhY3R1YWw6IGFjdHVhbFxuICAgICAgICAsIGV4cGVjdGVkOiBleHBlY3RlZFxuICAgICAgICAsIHNob3dEaWZmOiBzaG93RGlmZlxuICAgICAgfSwgKGNvbmZpZy5pbmNsdWRlU3RhY2spID8gdGhpcy5hc3NlcnQgOiBmbGFnKHRoaXMsICdzc2ZpJykpO1xuICAgIH1cbiAgfTtcblxuICAvKiFcbiAgICogIyMjIC5fb2JqXG4gICAqXG4gICAqIFF1aWNrIHJlZmVyZW5jZSB0byBzdG9yZWQgYGFjdHVhbGAgdmFsdWUgZm9yIHBsdWdpbiBkZXZlbG9wZXJzLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEFzc2VydGlvbi5wcm90b3R5cGUsICdfb2JqJyxcbiAgICB7IGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgLCBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgZmxhZyh0aGlzLCAnb2JqZWN0JywgdmFsKTtcbiAgICAgIH1cbiAgfSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqICMjIyBjb25maWcuaW5jbHVkZVN0YWNrXG4gICAqXG4gICAqIFVzZXIgY29uZmlndXJhYmxlIHByb3BlcnR5LCBpbmZsdWVuY2VzIHdoZXRoZXIgc3RhY2sgdHJhY2VcbiAgICogaXMgaW5jbHVkZWQgaW4gQXNzZXJ0aW9uIGVycm9yIG1lc3NhZ2UuIERlZmF1bHQgb2YgZmFsc2VcbiAgICogc3VwcHJlc3NlcyBzdGFjayB0cmFjZSBpbiB0aGUgZXJyb3IgbWVzc2FnZS5cbiAgICpcbiAgICogICAgIGNoYWkuY29uZmlnLmluY2x1ZGVTdGFjayA9IHRydWU7ICAvLyBlbmFibGUgc3RhY2sgb24gZXJyb3JcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICAgaW5jbHVkZVN0YWNrOiBmYWxzZSxcblxuICAvKipcbiAgICogIyMjIGNvbmZpZy5zaG93RGlmZlxuICAgKlxuICAgKiBVc2VyIGNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSwgaW5mbHVlbmNlcyB3aGV0aGVyIG9yIG5vdFxuICAgKiB0aGUgYHNob3dEaWZmYCBmbGFnIHNob3VsZCBiZSBpbmNsdWRlZCBpbiB0aGUgdGhyb3duXG4gICAqIEFzc2VydGlvbkVycm9ycy4gYGZhbHNlYCB3aWxsIGFsd2F5cyBiZSBgZmFsc2VgOyBgdHJ1ZWBcbiAgICogd2lsbCBiZSB0cnVlIHdoZW4gdGhlIGFzc2VydGlvbiBoYXMgcmVxdWVzdGVkIGEgZGlmZlxuICAgKiBiZSBzaG93bi5cbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBzaG93RGlmZjogdHJ1ZSxcblxuICAvKipcbiAgICogIyMjIGNvbmZpZy50cnVuY2F0ZVRocmVzaG9sZFxuICAgKlxuICAgKiBVc2VyIGNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSwgc2V0cyBsZW5ndGggdGhyZXNob2xkIGZvciBhY3R1YWwgYW5kXG4gICAqIGV4cGVjdGVkIHZhbHVlcyBpbiBhc3NlcnRpb24gZXJyb3JzLiBJZiB0aGlzIHRocmVzaG9sZCBpcyBleGNlZWRlZCwgZm9yXG4gICAqIGV4YW1wbGUgZm9yIGxhcmdlIGRhdGEgc3RydWN0dXJlcywgdGhlIHZhbHVlIGlzIHJlcGxhY2VkIHdpdGggc29tZXRoaW5nXG4gICAqIGxpa2UgYFsgQXJyYXkoMykgXWAgb3IgYHsgT2JqZWN0IChwcm9wMSwgcHJvcDIpIH1gLlxuICAgKlxuICAgKiBTZXQgaXQgdG8gemVybyBpZiB5b3Ugd2FudCB0byBkaXNhYmxlIHRydW5jYXRpbmcgYWx0b2dldGhlci5cbiAgICpcbiAgICogVGhpcyBpcyBlc3BlY2lhbGx5IHVzZXJmdWwgd2hlbiBkb2luZyBhc3NlcnRpb25zIG9uIGFycmF5czogaGF2aW5nIHRoaXNcbiAgICogc2V0IHRvIGEgcmVhc29uYWJsZSBsYXJnZSB2YWx1ZSBtYWtlcyB0aGUgZmFpbHVyZSBtZXNzYWdlcyByZWFkaWx5XG4gICAqIGluc3BlY3RhYmxlLlxuICAgKlxuICAgKiAgICAgY2hhaS5jb25maWcudHJ1bmNhdGVUaHJlc2hvbGQgPSAwOyAgLy8gZGlzYWJsZSB0cnVuY2F0aW5nXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICB0cnVuY2F0ZVRocmVzaG9sZDogNDBcblxufTtcbiIsIi8qIVxuICogY2hhaVxuICogaHR0cDovL2NoYWlqcy5jb21cbiAqIENvcHlyaWdodChjKSAyMDExLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjaGFpLCBfKSB7XG4gIHZhciBBc3NlcnRpb24gPSBjaGFpLkFzc2VydGlvblxuICAgICwgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG4gICAgLCBmbGFnID0gXy5mbGFnO1xuXG4gIC8qKlxuICAgKiAjIyMgTGFuZ3VhZ2UgQ2hhaW5zXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgYXJlIHByb3ZpZGVkIGFzIGNoYWluYWJsZSBnZXR0ZXJzIHRvXG4gICAqIGltcHJvdmUgdGhlIHJlYWRhYmlsaXR5IG9mIHlvdXIgYXNzZXJ0aW9ucy4gVGhleVxuICAgKiBkbyBub3QgcHJvdmlkZSB0ZXN0aW5nIGNhcGFiaWxpdGllcyB1bmxlc3MgdGhleVxuICAgKiBoYXZlIGJlZW4gb3ZlcndyaXR0ZW4gYnkgYSBwbHVnaW4uXG4gICAqXG4gICAqICoqQ2hhaW5zKipcbiAgICpcbiAgICogLSB0b1xuICAgKiAtIGJlXG4gICAqIC0gYmVlblxuICAgKiAtIGlzXG4gICAqIC0gdGhhdFxuICAgKiAtIHdoaWNoXG4gICAqIC0gYW5kXG4gICAqIC0gaGFzXG4gICAqIC0gaGF2ZVxuICAgKiAtIHdpdGhcbiAgICogLSBhdFxuICAgKiAtIG9mXG4gICAqIC0gc2FtZVxuICAgKlxuICAgKiBAbmFtZSBsYW5ndWFnZSBjaGFpbnNcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgWyAndG8nLCAnYmUnLCAnYmVlbidcbiAgLCAnaXMnLCAnYW5kJywgJ2hhcycsICdoYXZlJ1xuICAsICd3aXRoJywgJ3RoYXQnLCAnd2hpY2gnLCAnYXQnXG4gICwgJ29mJywgJ3NhbWUnIF0uZm9yRWFjaChmdW5jdGlvbiAoY2hhaW4pIHtcbiAgICBBc3NlcnRpb24uYWRkUHJvcGVydHkoY2hhaW4sIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC5ub3RcbiAgICpcbiAgICogTmVnYXRlcyBhbnkgb2YgYXNzZXJ0aW9ucyBmb2xsb3dpbmcgaW4gdGhlIGNoYWluLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KGZvbykudG8ubm90LmVxdWFsKCdiYXInKTtcbiAgICogICAgIGV4cGVjdChnb29kRm4pLnRvLm5vdC50aHJvdyhFcnJvcik7XG4gICAqICAgICBleHBlY3QoeyBmb286ICdiYXonIH0pLnRvLmhhdmUucHJvcGVydHkoJ2ZvbycpXG4gICAqICAgICAgIC5hbmQubm90LmVxdWFsKCdiYXInKTtcbiAgICpcbiAgICogQG5hbWUgbm90XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEFzc2VydGlvbi5hZGRQcm9wZXJ0eSgnbm90JywgZnVuY3Rpb24gKCkge1xuICAgIGZsYWcodGhpcywgJ25lZ2F0ZScsIHRydWUpO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC5kZWVwXG4gICAqXG4gICAqIFNldHMgdGhlIGBkZWVwYCBmbGFnLCBsYXRlciB1c2VkIGJ5IHRoZSBgZXF1YWxgIGFuZFxuICAgKiBgcHJvcGVydHlgIGFzc2VydGlvbnMuXG4gICAqXG4gICAqICAgICBleHBlY3QoZm9vKS50by5kZWVwLmVxdWFsKHsgYmFyOiAnYmF6JyB9KTtcbiAgICogICAgIGV4cGVjdCh7IGZvbzogeyBiYXI6IHsgYmF6OiAncXV1eCcgfSB9IH0pXG4gICAqICAgICAgIC50by5oYXZlLmRlZXAucHJvcGVydHkoJ2Zvby5iYXIuYmF6JywgJ3F1dXgnKTtcbiAgICpcbiAgICogYC5kZWVwLnByb3BlcnR5YCBzcGVjaWFsIGNoYXJhY3RlcnMgY2FuIGJlIGVzY2FwZWRcbiAgICogYnkgYWRkaW5nIHR3byBzbGFzaGVzIGJlZm9yZSB0aGUgYC5gIG9yIGBbXWAuXG4gICAqXG4gICAqICAgICB2YXIgZGVlcENzcyA9IHsgJy5saW5rJzogeyAnW3RhcmdldF0nOiA0MiB9fTtcbiAgICogICAgIGV4cGVjdChkZWVwQ3NzKS50by5oYXZlLmRlZXAucHJvcGVydHkoJ1xcXFwubGluay5cXFxcW3RhcmdldFxcXFxdJywgNDIpO1xuICAgKlxuICAgKiBAbmFtZSBkZWVwXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEFzc2VydGlvbi5hZGRQcm9wZXJ0eSgnZGVlcCcsIGZ1bmN0aW9uICgpIHtcbiAgICBmbGFnKHRoaXMsICdkZWVwJywgdHJ1ZSk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAjIyMgLmFueVxuICAgKlxuICAgKiBTZXRzIHRoZSBgYW55YCBmbGFnLCAob3Bwb3NpdGUgb2YgdGhlIGBhbGxgIGZsYWcpXG4gICAqIGxhdGVyIHVzZWQgaW4gdGhlIGBrZXlzYCBhc3NlcnRpb24uXG4gICAqXG4gICAqICAgICBleHBlY3QoZm9vKS50by5oYXZlLmFueS5rZXlzKCdiYXInLCAnYmF6Jyk7XG4gICAqXG4gICAqIEBuYW1lIGFueVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBBc3NlcnRpb24uYWRkUHJvcGVydHkoJ2FueScsIGZ1bmN0aW9uICgpIHtcbiAgICBmbGFnKHRoaXMsICdhbnknLCB0cnVlKTtcbiAgICBmbGFnKHRoaXMsICdhbGwnLCBmYWxzZSlcbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMjIC5hbGxcbiAgICpcbiAgICogU2V0cyB0aGUgYGFsbGAgZmxhZyAob3Bwb3NpdGUgb2YgdGhlIGBhbnlgIGZsYWcpXG4gICAqIGxhdGVyIHVzZWQgYnkgdGhlIGBrZXlzYCBhc3NlcnRpb24uXG4gICAqXG4gICAqICAgICBleHBlY3QoZm9vKS50by5oYXZlLmFsbC5rZXlzKCdiYXInLCAnYmF6Jyk7XG4gICAqXG4gICAqIEBuYW1lIGFsbFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBBc3NlcnRpb24uYWRkUHJvcGVydHkoJ2FsbCcsIGZ1bmN0aW9uICgpIHtcbiAgICBmbGFnKHRoaXMsICdhbGwnLCB0cnVlKTtcbiAgICBmbGFnKHRoaXMsICdhbnknLCBmYWxzZSk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAjIyMgLmEodHlwZSlcbiAgICpcbiAgICogVGhlIGBhYCBhbmQgYGFuYCBhc3NlcnRpb25zIGFyZSBhbGlhc2VzIHRoYXQgY2FuIGJlXG4gICAqIHVzZWQgZWl0aGVyIGFzIGxhbmd1YWdlIGNoYWlucyBvciB0byBhc3NlcnQgYSB2YWx1ZSdzXG4gICAqIHR5cGUuXG4gICAqXG4gICAqICAgICAvLyB0eXBlb2ZcbiAgICogICAgIGV4cGVjdCgndGVzdCcpLnRvLmJlLmEoJ3N0cmluZycpO1xuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAnYmFyJyB9KS50by5iZS5hbignb2JqZWN0Jyk7XG4gICAqICAgICBleHBlY3QobnVsbCkudG8uYmUuYSgnbnVsbCcpO1xuICAgKiAgICAgZXhwZWN0KHVuZGVmaW5lZCkudG8uYmUuYW4oJ3VuZGVmaW5lZCcpO1xuICAgKlxuICAgKiAgICAgLy8gbGFuZ3VhZ2UgY2hhaW5cbiAgICogICAgIGV4cGVjdChmb28pLnRvLmJlLmFuLmluc3RhbmNlb2YoRm9vKTtcbiAgICpcbiAgICogQG5hbWUgYVxuICAgKiBAYWxpYXMgYW5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBhbiAodHlwZSwgbXNnKSB7XG4gICAgaWYgKG1zZykgZmxhZyh0aGlzLCAnbWVzc2FnZScsIG1zZyk7XG4gICAgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0JylcbiAgICAgICwgYXJ0aWNsZSA9IH5bICdhJywgJ2UnLCAnaScsICdvJywgJ3UnIF0uaW5kZXhPZih0eXBlLmNoYXJBdCgwKSkgPyAnYW4gJyA6ICdhICc7XG5cbiAgICB0aGlzLmFzc2VydChcbiAgICAgICAgdHlwZSA9PT0gXy50eXBlKG9iailcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgJyArIGFydGljbGUgKyB0eXBlXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IG5vdCB0byBiZSAnICsgYXJ0aWNsZSArIHR5cGVcbiAgICApO1xuICB9XG5cbiAgQXNzZXJ0aW9uLmFkZENoYWluYWJsZU1ldGhvZCgnYW4nLCBhbik7XG4gIEFzc2VydGlvbi5hZGRDaGFpbmFibGVNZXRob2QoJ2EnLCBhbik7XG5cbiAgLyoqXG4gICAqICMjIyAuaW5jbHVkZSh2YWx1ZSlcbiAgICpcbiAgICogVGhlIGBpbmNsdWRlYCBhbmQgYGNvbnRhaW5gIGFzc2VydGlvbnMgY2FuIGJlIHVzZWQgYXMgZWl0aGVyIHByb3BlcnR5XG4gICAqIGJhc2VkIGxhbmd1YWdlIGNoYWlucyBvciBhcyBtZXRob2RzIHRvIGFzc2VydCB0aGUgaW5jbHVzaW9uIG9mIGFuIG9iamVjdFxuICAgKiBpbiBhbiBhcnJheSBvciBhIHN1YnN0cmluZyBpbiBhIHN0cmluZy4gV2hlbiB1c2VkIGFzIGxhbmd1YWdlIGNoYWlucyxcbiAgICogdGhleSB0b2dnbGUgdGhlIGBjb250YWluc2AgZmxhZyBmb3IgdGhlIGBrZXlzYCBhc3NlcnRpb24uXG4gICAqXG4gICAqICAgICBleHBlY3QoWzEsMiwzXSkudG8uaW5jbHVkZSgyKTtcbiAgICogICAgIGV4cGVjdCgnZm9vYmFyJykudG8uY29udGFpbignZm9vJyk7XG4gICAqICAgICBleHBlY3QoeyBmb286ICdiYXInLCBoZWxsbzogJ3VuaXZlcnNlJyB9KS50by5pbmNsdWRlLmtleXMoJ2ZvbycpO1xuICAgKlxuICAgKiBAbmFtZSBpbmNsdWRlXG4gICAqIEBhbGlhcyBjb250YWluXG4gICAqIEBhbGlhcyBpbmNsdWRlc1xuICAgKiBAYWxpYXMgY29udGFpbnNcbiAgICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfE51bWJlcn0gb2JqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIF9vcHRpb25hbF9cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gaW5jbHVkZUNoYWluaW5nQmVoYXZpb3IgKCkge1xuICAgIGZsYWcodGhpcywgJ2NvbnRhaW5zJywgdHJ1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpbmNsdWRlICh2YWwsIG1zZykge1xuICAgIGlmIChtc2cpIGZsYWcodGhpcywgJ21lc3NhZ2UnLCBtc2cpO1xuICAgIHZhciBvYmogPSBmbGFnKHRoaXMsICdvYmplY3QnKTtcbiAgICB2YXIgZXhwZWN0ZWQgPSBmYWxzZTtcbiAgICBpZiAoXy50eXBlKG9iaikgPT09ICdhcnJheScgJiYgXy50eXBlKHZhbCkgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgICAgICBpZiAoXy5lcWwob2JqW2ldLCB2YWwpKSB7XG4gICAgICAgICAgZXhwZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChfLnR5cGUodmFsKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICghZmxhZyh0aGlzLCAnbmVnYXRlJykpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiB2YWwpIG5ldyBBc3NlcnRpb24ob2JqKS5wcm9wZXJ0eShrLCB2YWxba10pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgc3Vic2V0ID0ge307XG4gICAgICBmb3IgKHZhciBrIGluIHZhbCkgc3Vic2V0W2tdID0gb2JqW2tdO1xuICAgICAgZXhwZWN0ZWQgPSBfLmVxbChzdWJzZXQsIHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cGVjdGVkID0gb2JqICYmIH5vYmouaW5kZXhPZih2YWwpO1xuICAgIH1cbiAgICB0aGlzLmFzc2VydChcbiAgICAgICAgZXhwZWN0ZWRcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gaW5jbHVkZSAnICsgXy5pbnNwZWN0KHZhbClcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IGluY2x1ZGUgJyArIF8uaW5zcGVjdCh2YWwpKTtcbiAgfVxuXG4gIEFzc2VydGlvbi5hZGRDaGFpbmFibGVNZXRob2QoJ2luY2x1ZGUnLCBpbmNsdWRlLCBpbmNsdWRlQ2hhaW5pbmdCZWhhdmlvcik7XG4gIEFzc2VydGlvbi5hZGRDaGFpbmFibGVNZXRob2QoJ2NvbnRhaW4nLCBpbmNsdWRlLCBpbmNsdWRlQ2hhaW5pbmdCZWhhdmlvcik7XG4gIEFzc2VydGlvbi5hZGRDaGFpbmFibGVNZXRob2QoJ2NvbnRhaW5zJywgaW5jbHVkZSwgaW5jbHVkZUNoYWluaW5nQmVoYXZpb3IpO1xuICBBc3NlcnRpb24uYWRkQ2hhaW5hYmxlTWV0aG9kKCdpbmNsdWRlcycsIGluY2x1ZGUsIGluY2x1ZGVDaGFpbmluZ0JlaGF2aW9yKTtcblxuICAvKipcbiAgICogIyMjIC5va1xuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgdGhlIHRhcmdldCBpcyB0cnV0aHkuXG4gICAqXG4gICAqICAgICBleHBlY3QoJ2V2ZXJ0aGluZycpLnRvLmJlLm9rO1xuICAgKiAgICAgZXhwZWN0KDEpLnRvLmJlLm9rO1xuICAgKiAgICAgZXhwZWN0KGZhbHNlKS50by5ub3QuYmUub2s7XG4gICAqICAgICBleHBlY3QodW5kZWZpbmVkKS50by5ub3QuYmUub2s7XG4gICAqICAgICBleHBlY3QobnVsbCkudG8ubm90LmJlLm9rO1xuICAgKlxuICAgKiBAbmFtZSBva1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBBc3NlcnRpb24uYWRkUHJvcGVydHkoJ29rJywgZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICBmbGFnKHRoaXMsICdvYmplY3QnKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSB0cnV0aHknXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGJlIGZhbHN5Jyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAjIyMgLnRydWVcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQgaXMgYHRydWVgLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KHRydWUpLnRvLmJlLnRydWU7XG4gICAqICAgICBleHBlY3QoMSkudG8ubm90LmJlLnRydWU7XG4gICAqXG4gICAqIEBuYW1lIHRydWVcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgQXNzZXJ0aW9uLmFkZFByb3BlcnR5KCd0cnVlJywgZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICB0cnVlID09PSBmbGFnKHRoaXMsICdvYmplY3QnKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSB0cnVlJ1xuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSBmYWxzZSdcbiAgICAgICwgdGhpcy5uZWdhdGUgPyBmYWxzZSA6IHRydWVcbiAgICApO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC5mYWxzZVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgdGhlIHRhcmdldCBpcyBgZmFsc2VgLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KGZhbHNlKS50by5iZS5mYWxzZTtcbiAgICogICAgIGV4cGVjdCgwKS50by5ub3QuYmUuZmFsc2U7XG4gICAqXG4gICAqIEBuYW1lIGZhbHNlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEFzc2VydGlvbi5hZGRQcm9wZXJ0eSgnZmFsc2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hc3NlcnQoXG4gICAgICAgIGZhbHNlID09PSBmbGFnKHRoaXMsICdvYmplY3QnKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSBmYWxzZSdcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgdHJ1ZSdcbiAgICAgICwgdGhpcy5uZWdhdGUgPyB0cnVlIDogZmFsc2VcbiAgICApO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC5udWxsXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGlzIGBudWxsYC5cbiAgICpcbiAgICogICAgIGV4cGVjdChudWxsKS50by5iZS5udWxsO1xuICAgKiAgICAgZXhwZWN0KHVuZGVmaW5lZCkudG8ubm90LmJlLm51bGw7XG4gICAqXG4gICAqIEBuYW1lIG51bGxcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgQXNzZXJ0aW9uLmFkZFByb3BlcnR5KCdudWxsJywgZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICBudWxsID09PSBmbGFnKHRoaXMsICdvYmplY3QnKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSBudWxsJ1xuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSBub3QgdG8gYmUgbnVsbCdcbiAgICApO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC51bmRlZmluZWRcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQgaXMgYHVuZGVmaW5lZGAuXG4gICAqXG4gICAqICAgICBleHBlY3QodW5kZWZpbmVkKS50by5iZS51bmRlZmluZWQ7XG4gICAqICAgICBleHBlY3QobnVsbCkudG8ubm90LmJlLnVuZGVmaW5lZDtcbiAgICpcbiAgICogQG5hbWUgdW5kZWZpbmVkXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEFzc2VydGlvbi5hZGRQcm9wZXJ0eSgndW5kZWZpbmVkJywgZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICB1bmRlZmluZWQgPT09IGZsYWcodGhpcywgJ29iamVjdCcpXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGJlIHVuZGVmaW5lZCdcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gbm90IHRvIGJlIHVuZGVmaW5lZCdcbiAgICApO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC5leGlzdFxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgdGhlIHRhcmdldCBpcyBuZWl0aGVyIGBudWxsYCBub3IgYHVuZGVmaW5lZGAuXG4gICAqXG4gICAqICAgICB2YXIgZm9vID0gJ2hpJ1xuICAgKiAgICAgICAsIGJhciA9IG51bGxcbiAgICogICAgICAgLCBiYXo7XG4gICAqXG4gICAqICAgICBleHBlY3QoZm9vKS50by5leGlzdDtcbiAgICogICAgIGV4cGVjdChiYXIpLnRvLm5vdC5leGlzdDtcbiAgICogICAgIGV4cGVjdChiYXopLnRvLm5vdC5leGlzdDtcbiAgICpcbiAgICogQG5hbWUgZXhpc3RcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgQXNzZXJ0aW9uLmFkZFByb3BlcnR5KCdleGlzdCcsIGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFzc2VydChcbiAgICAgICAgbnVsbCAhPSBmbGFnKHRoaXMsICdvYmplY3QnKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBleGlzdCdcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IGV4aXN0J1xuICAgICk7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIyAuZW1wdHlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQncyBsZW5ndGggaXMgYDBgLiBGb3IgYXJyYXlzIGFuZCBzdHJpbmdzLCBpdCBjaGVja3NcbiAgICogdGhlIGBsZW5ndGhgIHByb3BlcnR5LiBGb3Igb2JqZWN0cywgaXQgZ2V0cyB0aGUgY291bnQgb2ZcbiAgICogZW51bWVyYWJsZSBrZXlzLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KFtdKS50by5iZS5lbXB0eTtcbiAgICogICAgIGV4cGVjdCgnJykudG8uYmUuZW1wdHk7XG4gICAqICAgICBleHBlY3Qoe30pLnRvLmJlLmVtcHR5O1xuICAgKlxuICAgKiBAbmFtZSBlbXB0eVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBBc3NlcnRpb24uYWRkUHJvcGVydHkoJ2VtcHR5JywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBvYmogPSBmbGFnKHRoaXMsICdvYmplY3QnKVxuICAgICAgLCBleHBlY3RlZCA9IG9iajtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikgfHwgJ3N0cmluZycgPT09IHR5cGVvZiBvYmplY3QpIHtcbiAgICAgIGV4cGVjdGVkID0gb2JqLmxlbmd0aDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgICBleHBlY3RlZCA9IE9iamVjdC5rZXlzKG9iaikubGVuZ3RoO1xuICAgIH1cblxuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAhZXhwZWN0ZWRcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgZW1wdHknXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IG5vdCB0byBiZSBlbXB0eSdcbiAgICApO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC5hcmd1bWVudHNcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQgaXMgYW4gYXJndW1lbnRzIG9iamVjdC5cbiAgICpcbiAgICogICAgIGZ1bmN0aW9uIHRlc3QgKCkge1xuICAgKiAgICAgICBleHBlY3QoYXJndW1lbnRzKS50by5iZS5hcmd1bWVudHM7XG4gICAqICAgICB9XG4gICAqXG4gICAqIEBuYW1lIGFyZ3VtZW50c1xuICAgKiBAYWxpYXMgQXJndW1lbnRzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGNoZWNrQXJndW1lbnRzICgpIHtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0JylcbiAgICAgICwgdHlwZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopO1xuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAnW29iamVjdCBBcmd1bWVudHNdJyA9PT0gdHlwZVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSBhcmd1bWVudHMgYnV0IGdvdCAnICsgdHlwZVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBub3QgYmUgYXJndW1lbnRzJ1xuICAgICk7XG4gIH1cblxuICBBc3NlcnRpb24uYWRkUHJvcGVydHkoJ2FyZ3VtZW50cycsIGNoZWNrQXJndW1lbnRzKTtcbiAgQXNzZXJ0aW9uLmFkZFByb3BlcnR5KCdBcmd1bWVudHMnLCBjaGVja0FyZ3VtZW50cyk7XG5cbiAgLyoqXG4gICAqICMjIyAuZXF1YWwodmFsdWUpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGlzIHN0cmljdGx5IGVxdWFsIChgPT09YCkgdG8gYHZhbHVlYC5cbiAgICogQWx0ZXJuYXRlbHksIGlmIHRoZSBgZGVlcGAgZmxhZyBpcyBzZXQsIGFzc2VydHMgdGhhdFxuICAgKiB0aGUgdGFyZ2V0IGlzIGRlZXBseSBlcXVhbCB0byBgdmFsdWVgLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KCdoZWxsbycpLnRvLmVxdWFsKCdoZWxsbycpO1xuICAgKiAgICAgZXhwZWN0KDQyKS50by5lcXVhbCg0Mik7XG4gICAqICAgICBleHBlY3QoMSkudG8ubm90LmVxdWFsKHRydWUpO1xuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAnYmFyJyB9KS50by5ub3QuZXF1YWwoeyBmb286ICdiYXInIH0pO1xuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAnYmFyJyB9KS50by5kZWVwLmVxdWFsKHsgZm9vOiAnYmFyJyB9KTtcbiAgICpcbiAgICogQG5hbWUgZXF1YWxcbiAgICogQGFsaWFzIGVxdWFsc1xuICAgKiBAYWxpYXMgZXFcbiAgICogQGFsaWFzIGRlZXAuZXF1YWxcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBhc3NlcnRFcXVhbCAodmFsLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgaWYgKGZsYWcodGhpcywgJ2RlZXAnKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXFsKHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAgIHZhbCA9PT0gb2JqXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gZXF1YWwgI3tleHB9J1xuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIG5vdCBlcXVhbCAje2V4cH0nXG4gICAgICAgICwgdmFsXG4gICAgICAgICwgdGhpcy5fb2JqXG4gICAgICAgICwgdHJ1ZVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdlcXVhbCcsIGFzc2VydEVxdWFsKTtcbiAgQXNzZXJ0aW9uLmFkZE1ldGhvZCgnZXF1YWxzJywgYXNzZXJ0RXF1YWwpO1xuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdlcScsIGFzc2VydEVxdWFsKTtcblxuICAvKipcbiAgICogIyMjIC5lcWwodmFsdWUpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGlzIGRlZXBseSBlcXVhbCB0byBgdmFsdWVgLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAnYmFyJyB9KS50by5lcWwoeyBmb286ICdiYXInIH0pO1xuICAgKiAgICAgZXhwZWN0KFsgMSwgMiwgMyBdKS50by5lcWwoWyAxLCAyLCAzIF0pO1xuICAgKlxuICAgKiBAbmFtZSBlcWxcbiAgICogQGFsaWFzIGVxbHNcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBhc3NlcnRFcWwob2JqLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB0aGlzLmFzc2VydChcbiAgICAgICAgXy5lcWwob2JqLCBmbGFnKHRoaXMsICdvYmplY3QnKSlcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gZGVlcGx5IGVxdWFsICN7ZXhwfSdcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IGRlZXBseSBlcXVhbCAje2V4cH0nXG4gICAgICAsIG9ialxuICAgICAgLCB0aGlzLl9vYmpcbiAgICAgICwgdHJ1ZVxuICAgICk7XG4gIH1cblxuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdlcWwnLCBhc3NlcnRFcWwpO1xuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdlcWxzJywgYXNzZXJ0RXFsKTtcblxuICAvKipcbiAgICogIyMjIC5hYm92ZSh2YWx1ZSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQgaXMgZ3JlYXRlciB0aGFuIGB2YWx1ZWAuXG4gICAqXG4gICAqICAgICBleHBlY3QoMTApLnRvLmJlLmFib3ZlKDUpO1xuICAgKlxuICAgKiBDYW4gYWxzbyBiZSB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGggYGxlbmd0aGAgdG9cbiAgICogYXNzZXJ0IGEgbWluaW11bSBsZW5ndGguIFRoZSBiZW5lZml0IGJlaW5nIGFcbiAgICogbW9yZSBpbmZvcm1hdGl2ZSBlcnJvciBtZXNzYWdlIHRoYW4gaWYgdGhlIGxlbmd0aFxuICAgKiB3YXMgc3VwcGxpZWQgZGlyZWN0bHkuXG4gICAqXG4gICAqICAgICBleHBlY3QoJ2ZvbycpLnRvLmhhdmUubGVuZ3RoLmFib3ZlKDIpO1xuICAgKiAgICAgZXhwZWN0KFsgMSwgMiwgMyBdKS50by5oYXZlLmxlbmd0aC5hYm92ZSgyKTtcbiAgICpcbiAgICogQG5hbWUgYWJvdmVcbiAgICogQGFsaWFzIGd0XG4gICAqIEBhbGlhcyBncmVhdGVyVGhhblxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBhc3NlcnRBYm92ZSAobiwgbXNnKSB7XG4gICAgaWYgKG1zZykgZmxhZyh0aGlzLCAnbWVzc2FnZScsIG1zZyk7XG4gICAgdmFyIG9iaiA9IGZsYWcodGhpcywgJ29iamVjdCcpO1xuICAgIGlmIChmbGFnKHRoaXMsICdkb0xlbmd0aCcpKSB7XG4gICAgICBuZXcgQXNzZXJ0aW9uKG9iaiwgbXNnKS50by5oYXZlLnByb3BlcnR5KCdsZW5ndGgnKTtcbiAgICAgIHZhciBsZW4gPSBvYmoubGVuZ3RoO1xuICAgICAgdGhpcy5hc3NlcnQoXG4gICAgICAgICAgbGVuID4gblxuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGhhdmUgYSBsZW5ndGggYWJvdmUgI3tleHB9IGJ1dCBnb3QgI3thY3R9J1xuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIG5vdCBoYXZlIGEgbGVuZ3RoIGFib3ZlICN7ZXhwfSdcbiAgICAgICAgLCBuXG4gICAgICAgICwgbGVuXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFzc2VydChcbiAgICAgICAgICBvYmogPiBuXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgYWJvdmUgJyArIG5cbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSBhdCBtb3N0ICcgKyBuXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ2Fib3ZlJywgYXNzZXJ0QWJvdmUpO1xuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdndCcsIGFzc2VydEFib3ZlKTtcbiAgQXNzZXJ0aW9uLmFkZE1ldGhvZCgnZ3JlYXRlclRoYW4nLCBhc3NlcnRBYm92ZSk7XG5cbiAgLyoqXG4gICAqICMjIyAubGVhc3QodmFsdWUpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byBgdmFsdWVgLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KDEwKS50by5iZS5hdC5sZWFzdCgxMCk7XG4gICAqXG4gICAqIENhbiBhbHNvIGJlIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aCBgbGVuZ3RoYCB0b1xuICAgKiBhc3NlcnQgYSBtaW5pbXVtIGxlbmd0aC4gVGhlIGJlbmVmaXQgYmVpbmcgYVxuICAgKiBtb3JlIGluZm9ybWF0aXZlIGVycm9yIG1lc3NhZ2UgdGhhbiBpZiB0aGUgbGVuZ3RoXG4gICAqIHdhcyBzdXBwbGllZCBkaXJlY3RseS5cbiAgICpcbiAgICogICAgIGV4cGVjdCgnZm9vJykudG8uaGF2ZS5sZW5ndGgub2YuYXQubGVhc3QoMik7XG4gICAqICAgICBleHBlY3QoWyAxLCAyLCAzIF0pLnRvLmhhdmUubGVuZ3RoLm9mLmF0LmxlYXN0KDMpO1xuICAgKlxuICAgKiBAbmFtZSBsZWFzdFxuICAgKiBAYWxpYXMgZ3RlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGFzc2VydExlYXN0IChuLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgaWYgKGZsYWcodGhpcywgJ2RvTGVuZ3RoJykpIHtcbiAgICAgIG5ldyBBc3NlcnRpb24ob2JqLCBtc2cpLnRvLmhhdmUucHJvcGVydHkoJ2xlbmd0aCcpO1xuICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGg7XG4gICAgICB0aGlzLmFzc2VydChcbiAgICAgICAgICBsZW4gPj0gblxuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGhhdmUgYSBsZW5ndGggYXQgbGVhc3QgI3tleHB9IGJ1dCBnb3QgI3thY3R9J1xuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGhhdmUgYSBsZW5ndGggYmVsb3cgI3tleHB9J1xuICAgICAgICAsIG5cbiAgICAgICAgLCBsZW5cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAgIG9iaiA+PSBuXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgYXQgbGVhc3QgJyArIG5cbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSBiZWxvdyAnICsgblxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdsZWFzdCcsIGFzc2VydExlYXN0KTtcbiAgQXNzZXJ0aW9uLmFkZE1ldGhvZCgnZ3RlJywgYXNzZXJ0TGVhc3QpO1xuXG4gIC8qKlxuICAgKiAjIyMgLmJlbG93KHZhbHVlKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgdGhlIHRhcmdldCBpcyBsZXNzIHRoYW4gYHZhbHVlYC5cbiAgICpcbiAgICogICAgIGV4cGVjdCg1KS50by5iZS5iZWxvdygxMCk7XG4gICAqXG4gICAqIENhbiBhbHNvIGJlIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aCBgbGVuZ3RoYCB0b1xuICAgKiBhc3NlcnQgYSBtYXhpbXVtIGxlbmd0aC4gVGhlIGJlbmVmaXQgYmVpbmcgYVxuICAgKiBtb3JlIGluZm9ybWF0aXZlIGVycm9yIG1lc3NhZ2UgdGhhbiBpZiB0aGUgbGVuZ3RoXG4gICAqIHdhcyBzdXBwbGllZCBkaXJlY3RseS5cbiAgICpcbiAgICogICAgIGV4cGVjdCgnZm9vJykudG8uaGF2ZS5sZW5ndGguYmVsb3coNCk7XG4gICAqICAgICBleHBlY3QoWyAxLCAyLCAzIF0pLnRvLmhhdmUubGVuZ3RoLmJlbG93KDQpO1xuICAgKlxuICAgKiBAbmFtZSBiZWxvd1xuICAgKiBAYWxpYXMgbHRcbiAgICogQGFsaWFzIGxlc3NUaGFuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGFzc2VydEJlbG93IChuLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgaWYgKGZsYWcodGhpcywgJ2RvTGVuZ3RoJykpIHtcbiAgICAgIG5ldyBBc3NlcnRpb24ob2JqLCBtc2cpLnRvLmhhdmUucHJvcGVydHkoJ2xlbmd0aCcpO1xuICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGg7XG4gICAgICB0aGlzLmFzc2VydChcbiAgICAgICAgICBsZW4gPCBuXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gaGF2ZSBhIGxlbmd0aCBiZWxvdyAje2V4cH0gYnV0IGdvdCAje2FjdH0nXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IGhhdmUgYSBsZW5ndGggYmVsb3cgI3tleHB9J1xuICAgICAgICAsIG5cbiAgICAgICAgLCBsZW5cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAgIG9iaiA8IG5cbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBiZSBiZWxvdyAnICsgblxuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGJlIGF0IGxlYXN0ICcgKyBuXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ2JlbG93JywgYXNzZXJ0QmVsb3cpO1xuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdsdCcsIGFzc2VydEJlbG93KTtcbiAgQXNzZXJ0aW9uLmFkZE1ldGhvZCgnbGVzc1RoYW4nLCBhc3NlcnRCZWxvdyk7XG5cbiAgLyoqXG4gICAqICMjIyAubW9zdCh2YWx1ZSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQgaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIGB2YWx1ZWAuXG4gICAqXG4gICAqICAgICBleHBlY3QoNSkudG8uYmUuYXQubW9zdCg1KTtcbiAgICpcbiAgICogQ2FuIGFsc28gYmUgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoIGBsZW5ndGhgIHRvXG4gICAqIGFzc2VydCBhIG1heGltdW0gbGVuZ3RoLiBUaGUgYmVuZWZpdCBiZWluZyBhXG4gICAqIG1vcmUgaW5mb3JtYXRpdmUgZXJyb3IgbWVzc2FnZSB0aGFuIGlmIHRoZSBsZW5ndGhcbiAgICogd2FzIHN1cHBsaWVkIGRpcmVjdGx5LlxuICAgKlxuICAgKiAgICAgZXhwZWN0KCdmb28nKS50by5oYXZlLmxlbmd0aC5vZi5hdC5tb3N0KDQpO1xuICAgKiAgICAgZXhwZWN0KFsgMSwgMiwgMyBdKS50by5oYXZlLmxlbmd0aC5vZi5hdC5tb3N0KDMpO1xuICAgKlxuICAgKiBAbmFtZSBtb3N0XG4gICAqIEBhbGlhcyBsdGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIF9vcHRpb25hbF9cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gYXNzZXJ0TW9zdCAobiwgbXNnKSB7XG4gICAgaWYgKG1zZykgZmxhZyh0aGlzLCAnbWVzc2FnZScsIG1zZyk7XG4gICAgdmFyIG9iaiA9IGZsYWcodGhpcywgJ29iamVjdCcpO1xuICAgIGlmIChmbGFnKHRoaXMsICdkb0xlbmd0aCcpKSB7XG4gICAgICBuZXcgQXNzZXJ0aW9uKG9iaiwgbXNnKS50by5oYXZlLnByb3BlcnR5KCdsZW5ndGgnKTtcbiAgICAgIHZhciBsZW4gPSBvYmoubGVuZ3RoO1xuICAgICAgdGhpcy5hc3NlcnQoXG4gICAgICAgICAgbGVuIDw9IG5cbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBoYXZlIGEgbGVuZ3RoIGF0IG1vc3QgI3tleHB9IGJ1dCBnb3QgI3thY3R9J1xuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGhhdmUgYSBsZW5ndGggYWJvdmUgI3tleHB9J1xuICAgICAgICAsIG5cbiAgICAgICAgLCBsZW5cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAgIG9iaiA8PSBuXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgYXQgbW9zdCAnICsgblxuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGJlIGFib3ZlICcgKyBuXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ21vc3QnLCBhc3NlcnRNb3N0KTtcbiAgQXNzZXJ0aW9uLmFkZE1ldGhvZCgnbHRlJywgYXNzZXJ0TW9zdCk7XG5cbiAgLyoqXG4gICAqICMjIyAud2l0aGluKHN0YXJ0LCBmaW5pc2gpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGlzIHdpdGhpbiBhIHJhbmdlLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KDcpLnRvLmJlLndpdGhpbig1LDEwKTtcbiAgICpcbiAgICogQ2FuIGFsc28gYmUgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoIGBsZW5ndGhgIHRvXG4gICAqIGFzc2VydCBhIGxlbmd0aCByYW5nZS4gVGhlIGJlbmVmaXQgYmVpbmcgYVxuICAgKiBtb3JlIGluZm9ybWF0aXZlIGVycm9yIG1lc3NhZ2UgdGhhbiBpZiB0aGUgbGVuZ3RoXG4gICAqIHdhcyBzdXBwbGllZCBkaXJlY3RseS5cbiAgICpcbiAgICogICAgIGV4cGVjdCgnZm9vJykudG8uaGF2ZS5sZW5ndGgud2l0aGluKDIsNCk7XG4gICAqICAgICBleHBlY3QoWyAxLCAyLCAzIF0pLnRvLmhhdmUubGVuZ3RoLndpdGhpbigyLDQpO1xuICAgKlxuICAgKiBAbmFtZSB3aXRoaW5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHN0YXJ0IGxvd2VyYm91bmQgaW5jbHVzaXZlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBmaW5pc2ggdXBwZXJib3VuZCBpbmNsdXNpdmVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBBc3NlcnRpb24uYWRkTWV0aG9kKCd3aXRoaW4nLCBmdW5jdGlvbiAoc3RhcnQsIGZpbmlzaCwgbXNnKSB7XG4gICAgaWYgKG1zZykgZmxhZyh0aGlzLCAnbWVzc2FnZScsIG1zZyk7XG4gICAgdmFyIG9iaiA9IGZsYWcodGhpcywgJ29iamVjdCcpXG4gICAgICAsIHJhbmdlID0gc3RhcnQgKyAnLi4nICsgZmluaXNoO1xuICAgIGlmIChmbGFnKHRoaXMsICdkb0xlbmd0aCcpKSB7XG4gICAgICBuZXcgQXNzZXJ0aW9uKG9iaiwgbXNnKS50by5oYXZlLnByb3BlcnR5KCdsZW5ndGgnKTtcbiAgICAgIHZhciBsZW4gPSBvYmoubGVuZ3RoO1xuICAgICAgdGhpcy5hc3NlcnQoXG4gICAgICAgICAgbGVuID49IHN0YXJ0ICYmIGxlbiA8PSBmaW5pc2hcbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBoYXZlIGEgbGVuZ3RoIHdpdGhpbiAnICsgcmFuZ2VcbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBub3QgaGF2ZSBhIGxlbmd0aCB3aXRoaW4gJyArIHJhbmdlXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFzc2VydChcbiAgICAgICAgICBvYmogPj0gc3RhcnQgJiYgb2JqIDw9IGZpbmlzaFxuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGJlIHdpdGhpbiAnICsgcmFuZ2VcbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBub3QgYmUgd2l0aGluICcgKyByYW5nZVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAjIyMgLmluc3RhbmNlb2YoY29uc3RydWN0b3IpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGlzIGFuIGluc3RhbmNlIG9mIGBjb25zdHJ1Y3RvcmAuXG4gICAqXG4gICAqICAgICB2YXIgVGVhID0gZnVuY3Rpb24gKG5hbWUpIHsgdGhpcy5uYW1lID0gbmFtZTsgfVxuICAgKiAgICAgICAsIENoYWkgPSBuZXcgVGVhKCdjaGFpJyk7XG4gICAqXG4gICAqICAgICBleHBlY3QoQ2hhaSkudG8uYmUuYW4uaW5zdGFuY2VvZihUZWEpO1xuICAgKiAgICAgZXhwZWN0KFsgMSwgMiwgMyBdKS50by5iZS5pbnN0YW5jZW9mKEFycmF5KTtcbiAgICpcbiAgICogQG5hbWUgaW5zdGFuY2VvZlxuICAgKiBAcGFyYW0ge0NvbnN0cnVjdG9yfSBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhbGlhcyBpbnN0YW5jZU9mXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGFzc2VydEluc3RhbmNlT2YgKGNvbnN0cnVjdG9yLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgbmFtZSA9IF8uZ2V0TmFtZShjb25zdHJ1Y3Rvcik7XG4gICAgdGhpcy5hc3NlcnQoXG4gICAgICAgIGZsYWcodGhpcywgJ29iamVjdCcpIGluc3RhbmNlb2YgY29uc3RydWN0b3JcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgYW4gaW5zdGFuY2Ugb2YgJyArIG5hbWVcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IGJlIGFuIGluc3RhbmNlIG9mICcgKyBuYW1lXG4gICAgKTtcbiAgfTtcblxuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdpbnN0YW5jZW9mJywgYXNzZXJ0SW5zdGFuY2VPZik7XG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ2luc3RhbmNlT2YnLCBhc3NlcnRJbnN0YW5jZU9mKTtcblxuICAvKipcbiAgICogIyMjIC5wcm9wZXJ0eShuYW1lLCBbdmFsdWVdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgdGhlIHRhcmdldCBoYXMgYSBwcm9wZXJ0eSBgbmFtZWAsIG9wdGlvbmFsbHkgYXNzZXJ0aW5nIHRoYXRcbiAgICogdGhlIHZhbHVlIG9mIHRoYXQgcHJvcGVydHkgaXMgc3RyaWN0bHkgZXF1YWwgdG8gIGB2YWx1ZWAuXG4gICAqIElmIHRoZSBgZGVlcGAgZmxhZyBpcyBzZXQsIHlvdSBjYW4gdXNlIGRvdC0gYW5kIGJyYWNrZXQtbm90YXRpb24gZm9yIGRlZXBcbiAgICogcmVmZXJlbmNlcyBpbnRvIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICpcbiAgICogICAgIC8vIHNpbXBsZSByZWZlcmVuY2luZ1xuICAgKiAgICAgdmFyIG9iaiA9IHsgZm9vOiAnYmFyJyB9O1xuICAgKiAgICAgZXhwZWN0KG9iaikudG8uaGF2ZS5wcm9wZXJ0eSgnZm9vJyk7XG4gICAqICAgICBleHBlY3Qob2JqKS50by5oYXZlLnByb3BlcnR5KCdmb28nLCAnYmFyJyk7XG4gICAqXG4gICAqICAgICAvLyBkZWVwIHJlZmVyZW5jaW5nXG4gICAqICAgICB2YXIgZGVlcE9iaiA9IHtcbiAgICogICAgICAgICBncmVlbjogeyB0ZWE6ICdtYXRjaGEnIH1cbiAgICogICAgICAgLCB0ZWFzOiBbICdjaGFpJywgJ21hdGNoYScsIHsgdGVhOiAna29uYWNoYScgfSBdXG4gICAqICAgICB9O1xuICAgKlxuICAgKiAgICAgZXhwZWN0KGRlZXBPYmopLnRvLmhhdmUuZGVlcC5wcm9wZXJ0eSgnZ3JlZW4udGVhJywgJ21hdGNoYScpO1xuICAgKiAgICAgZXhwZWN0KGRlZXBPYmopLnRvLmhhdmUuZGVlcC5wcm9wZXJ0eSgndGVhc1sxXScsICdtYXRjaGEnKTtcbiAgICogICAgIGV4cGVjdChkZWVwT2JqKS50by5oYXZlLmRlZXAucHJvcGVydHkoJ3RlYXNbMl0udGVhJywgJ2tvbmFjaGEnKTtcbiAgICpcbiAgICogWW91IGNhbiBhbHNvIHVzZSBhbiBhcnJheSBhcyB0aGUgc3RhcnRpbmcgcG9pbnQgb2YgYSBgZGVlcC5wcm9wZXJ0eWBcbiAgICogYXNzZXJ0aW9uLCBvciB0cmF2ZXJzZSBuZXN0ZWQgYXJyYXlzLlxuICAgKlxuICAgKiAgICAgdmFyIGFyciA9IFtcbiAgICogICAgICAgICBbICdjaGFpJywgJ21hdGNoYScsICdrb25hY2hhJyBdXG4gICAqICAgICAgICwgWyB7IHRlYTogJ2NoYWknIH1cbiAgICogICAgICAgICAsIHsgdGVhOiAnbWF0Y2hhJyB9XG4gICAqICAgICAgICAgLCB7IHRlYTogJ2tvbmFjaGEnIH0gXVxuICAgKiAgICAgXTtcbiAgICpcbiAgICogICAgIGV4cGVjdChhcnIpLnRvLmhhdmUuZGVlcC5wcm9wZXJ0eSgnWzBdWzFdJywgJ21hdGNoYScpO1xuICAgKiAgICAgZXhwZWN0KGFycikudG8uaGF2ZS5kZWVwLnByb3BlcnR5KCdbMV1bMl0udGVhJywgJ2tvbmFjaGEnKTtcbiAgICpcbiAgICogRnVydGhlcm1vcmUsIGBwcm9wZXJ0eWAgY2hhbmdlcyB0aGUgc3ViamVjdCBvZiB0aGUgYXNzZXJ0aW9uXG4gICAqIHRvIGJlIHRoZSB2YWx1ZSBvZiB0aGF0IHByb3BlcnR5IGZyb20gdGhlIG9yaWdpbmFsIG9iamVjdC4gVGhpc1xuICAgKiBwZXJtaXRzIGZvciBmdXJ0aGVyIGNoYWluYWJsZSBhc3NlcnRpb25zIG9uIHRoYXQgcHJvcGVydHkuXG4gICAqXG4gICAqICAgICBleHBlY3Qob2JqKS50by5oYXZlLnByb3BlcnR5KCdmb28nKVxuICAgKiAgICAgICAudGhhdC5pcy5hKCdzdHJpbmcnKTtcbiAgICogICAgIGV4cGVjdChkZWVwT2JqKS50by5oYXZlLnByb3BlcnR5KCdncmVlbicpXG4gICAqICAgICAgIC50aGF0LmlzLmFuKCdvYmplY3QnKVxuICAgKiAgICAgICAudGhhdC5kZWVwLmVxdWFscyh7IHRlYTogJ21hdGNoYScgfSk7XG4gICAqICAgICBleHBlY3QoZGVlcE9iaikudG8uaGF2ZS5wcm9wZXJ0eSgndGVhcycpXG4gICAqICAgICAgIC50aGF0LmlzLmFuKCdhcnJheScpXG4gICAqICAgICAgIC53aXRoLmRlZXAucHJvcGVydHkoJ1syXScpXG4gICAqICAgICAgICAgLnRoYXQuZGVlcC5lcXVhbHMoeyB0ZWE6ICdrb25hY2hhJyB9KTtcbiAgICpcbiAgICogTm90ZSB0aGF0IGRvdHMgYW5kIGJyYWNrZXQgaW4gYG5hbWVgIG11c3QgYmUgYmFja3NsYXNoLWVzY2FwZWQgd2hlblxuICAgKiB0aGUgYGRlZXBgIGZsYWcgaXMgc2V0LCB3aGlsZSB0aGV5IG11c3QgTk9UIGJlIGVzY2FwZWQgd2hlbiB0aGUgYGRlZXBgXG4gICAqIGZsYWcgaXMgbm90IHNldC5cbiAgICpcbiAgICogICAgIC8vIHNpbXBsZSByZWZlcmVuY2luZ1xuICAgKiAgICAgdmFyIGNzcyA9IHsgJy5saW5rW3RhcmdldF0nOiA0MiB9O1xuICAgKiAgICAgZXhwZWN0KGNzcykudG8uaGF2ZS5wcm9wZXJ0eSgnLmxpbmtbdGFyZ2V0XScsIDQyKTtcbiAgICpcbiAgICogICAgIC8vIGRlZXAgcmVmZXJlbmNpbmdcbiAgICogICAgIHZhciBkZWVwQ3NzID0geyAnLmxpbmsnOiB7ICdbdGFyZ2V0XSc6IDQyIH19O1xuICAgKiAgICAgZXhwZWN0KGRlZXBDc3MpLnRvLmhhdmUuZGVlcC5wcm9wZXJ0eSgnXFxcXC5saW5rLlxcXFxbdGFyZ2V0XFxcXF0nLCA0Mik7XG4gICAqXG4gICAqIEBuYW1lIHByb3BlcnR5XG4gICAqIEBhbGlhcyBkZWVwLnByb3BlcnR5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlIChvcHRpb25hbClcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAcmV0dXJucyB2YWx1ZSBvZiBwcm9wZXJ0eSBmb3IgY2hhaW5pbmdcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgQXNzZXJ0aW9uLmFkZE1ldGhvZCgncHJvcGVydHknLCBmdW5jdGlvbiAobmFtZSwgdmFsLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcblxuICAgIHZhciBpc0RlZXAgPSAhIWZsYWcodGhpcywgJ2RlZXAnKVxuICAgICAgLCBkZXNjcmlwdG9yID0gaXNEZWVwID8gJ2RlZXAgcHJvcGVydHkgJyA6ICdwcm9wZXJ0eSAnXG4gICAgICAsIG5lZ2F0ZSA9IGZsYWcodGhpcywgJ25lZ2F0ZScpXG4gICAgICAsIG9iaiA9IGZsYWcodGhpcywgJ29iamVjdCcpXG4gICAgICAsIHBhdGhJbmZvID0gaXNEZWVwID8gXy5nZXRQYXRoSW5mbyhuYW1lLCBvYmopIDogbnVsbFxuICAgICAgLCBoYXNQcm9wZXJ0eSA9IGlzRGVlcFxuICAgICAgICA/IHBhdGhJbmZvLmV4aXN0c1xuICAgICAgICA6IF8uaGFzUHJvcGVydHkobmFtZSwgb2JqKVxuICAgICAgLCB2YWx1ZSA9IGlzRGVlcFxuICAgICAgICA/IHBhdGhJbmZvLnZhbHVlXG4gICAgICAgIDogb2JqW25hbWVdO1xuXG4gICAgaWYgKG5lZ2F0ZSAmJiB1bmRlZmluZWQgIT09IHZhbCkge1xuICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgbXNnID0gKG1zZyAhPSBudWxsKSA/IG1zZyArICc6ICcgOiAnJztcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyArIF8uaW5zcGVjdChvYmopICsgJyBoYXMgbm8gJyArIGRlc2NyaXB0b3IgKyBfLmluc3BlY3QobmFtZSkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFzc2VydChcbiAgICAgICAgICBoYXNQcm9wZXJ0eVxuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGhhdmUgYSAnICsgZGVzY3JpcHRvciArIF8uaW5zcGVjdChuYW1lKVxuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIG5vdCBoYXZlICcgKyBkZXNjcmlwdG9yICsgXy5pbnNwZWN0KG5hbWUpKTtcbiAgICB9XG5cbiAgICBpZiAodW5kZWZpbmVkICE9PSB2YWwpIHtcbiAgICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAgIHZhbCA9PT0gdmFsdWVcbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBoYXZlIGEgJyArIGRlc2NyaXB0b3IgKyBfLmluc3BlY3QobmFtZSkgKyAnIG9mICN7ZXhwfSwgYnV0IGdvdCAje2FjdH0nXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IGhhdmUgYSAnICsgZGVzY3JpcHRvciArIF8uaW5zcGVjdChuYW1lKSArICcgb2YgI3thY3R9J1xuICAgICAgICAsIHZhbFxuICAgICAgICAsIHZhbHVlXG4gICAgICApO1xuICAgIH1cblxuICAgIGZsYWcodGhpcywgJ29iamVjdCcsIHZhbHVlKTtcbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMjIC5vd25Qcm9wZXJ0eShuYW1lKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgdGhlIHRhcmdldCBoYXMgYW4gb3duIHByb3BlcnR5IGBuYW1lYC5cbiAgICpcbiAgICogICAgIGV4cGVjdCgndGVzdCcpLnRvLmhhdmUub3duUHJvcGVydHkoJ2xlbmd0aCcpO1xuICAgKlxuICAgKiBAbmFtZSBvd25Qcm9wZXJ0eVxuICAgKiBAYWxpYXMgaGF2ZU93blByb3BlcnR5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIF9vcHRpb25hbF9cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gYXNzZXJ0T3duUHJvcGVydHkgKG5hbWUsIG1zZykge1xuICAgIGlmIChtc2cpIGZsYWcodGhpcywgJ21lc3NhZ2UnLCBtc2cpO1xuICAgIHZhciBvYmogPSBmbGFnKHRoaXMsICdvYmplY3QnKTtcbiAgICB0aGlzLmFzc2VydChcbiAgICAgICAgb2JqLmhhc093blByb3BlcnR5KG5hbWUpXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIGhhdmUgb3duIHByb3BlcnR5ICcgKyBfLmluc3BlY3QobmFtZSlcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IGhhdmUgb3duIHByb3BlcnR5ICcgKyBfLmluc3BlY3QobmFtZSlcbiAgICApO1xuICB9XG5cbiAgQXNzZXJ0aW9uLmFkZE1ldGhvZCgnb3duUHJvcGVydHknLCBhc3NlcnRPd25Qcm9wZXJ0eSk7XG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ2hhdmVPd25Qcm9wZXJ0eScsIGFzc2VydE93blByb3BlcnR5KTtcblxuICAvKipcbiAgICogIyMjIC5vd25Qcm9wZXJ0eURlc2NyaXB0b3IobmFtZVssIGRlc2NyaXB0b3JbLCBtZXNzYWdlXV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGhhcyBhbiBvd24gcHJvcGVydHkgZGVzY3JpcHRvciBgbmFtZWAsIHRoYXQgb3B0aW9uYWxseSBtYXRjaGVzIGBkZXNjcmlwdG9yYC5cbiAgICpcbiAgICogICAgIGV4cGVjdCgndGVzdCcpLnRvLmhhdmUub3duUHJvcGVydHlEZXNjcmlwdG9yKCdsZW5ndGgnKTtcbiAgICogICAgIGV4cGVjdCgndGVzdCcpLnRvLmhhdmUub3duUHJvcGVydHlEZXNjcmlwdG9yKCdsZW5ndGgnLCB7IGVudW1lcmFibGU6IGZhbHNlLCBjb25maWd1cmFibGU6IGZhbHNlLCB3cml0YWJsZTogZmFsc2UsIHZhbHVlOiA0IH0pO1xuICAgKiAgICAgZXhwZWN0KCd0ZXN0Jykubm90LnRvLmhhdmUub3duUHJvcGVydHlEZXNjcmlwdG9yKCdsZW5ndGgnLCB7IGVudW1lcmFibGU6IGZhbHNlLCBjb25maWd1cmFibGU6IGZhbHNlLCB3cml0YWJsZTogZmFsc2UsIHZhbHVlOiAzIH0pO1xuICAgKiAgICAgZXhwZWN0KCd0ZXN0Jykub3duUHJvcGVydHlEZXNjcmlwdG9yKCdsZW5ndGgnKS50by5oYXZlLnByb3BlcnR5KCdlbnVtZXJhYmxlJywgZmFsc2UpO1xuICAgKiAgICAgZXhwZWN0KCd0ZXN0Jykub3duUHJvcGVydHlEZXNjcmlwdG9yKCdsZW5ndGgnKS50by5oYXZlLmtleXMoJ3ZhbHVlJyk7XG4gICAqXG4gICAqIEBuYW1lIG93blByb3BlcnR5RGVzY3JpcHRvclxuICAgKiBAYWxpYXMgaGF2ZU93blByb3BlcnR5RGVzY3JpcHRvclxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZGVzY3JpcHRvciBfb3B0aW9uYWxfXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIF9vcHRpb25hbF9cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gYXNzZXJ0T3duUHJvcGVydHlEZXNjcmlwdG9yIChuYW1lLCBkZXNjcmlwdG9yLCBtc2cpIHtcbiAgICBpZiAodHlwZW9mIGRlc2NyaXB0b3IgPT09ICdzdHJpbmcnKSB7XG4gICAgICBtc2cgPSBkZXNjcmlwdG9yO1xuICAgICAgZGVzY3JpcHRvciA9IG51bGw7XG4gICAgfVxuICAgIGlmIChtc2cpIGZsYWcodGhpcywgJ21lc3NhZ2UnLCBtc2cpO1xuICAgIHZhciBvYmogPSBmbGFnKHRoaXMsICdvYmplY3QnKTtcbiAgICB2YXIgYWN0dWFsRGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoT2JqZWN0KG9iaiksIG5hbWUpO1xuICAgIGlmIChhY3R1YWxEZXNjcmlwdG9yICYmIGRlc2NyaXB0b3IpIHtcbiAgICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAgIF8uZXFsKGRlc2NyaXB0b3IsIGFjdHVhbERlc2NyaXB0b3IpXG4gICAgICAgICwgJ2V4cGVjdGVkIHRoZSBvd24gcHJvcGVydHkgZGVzY3JpcHRvciBmb3IgJyArIF8uaW5zcGVjdChuYW1lKSArICcgb24gI3t0aGlzfSB0byBtYXRjaCAnICsgXy5pbnNwZWN0KGRlc2NyaXB0b3IpICsgJywgZ290ICcgKyBfLmluc3BlY3QoYWN0dWFsRGVzY3JpcHRvcilcbiAgICAgICAgLCAnZXhwZWN0ZWQgdGhlIG93biBwcm9wZXJ0eSBkZXNjcmlwdG9yIGZvciAnICsgXy5pbnNwZWN0KG5hbWUpICsgJyBvbiAje3RoaXN9IHRvIG5vdCBtYXRjaCAnICsgXy5pbnNwZWN0KGRlc2NyaXB0b3IpXG4gICAgICAgICwgZGVzY3JpcHRvclxuICAgICAgICAsIGFjdHVhbERlc2NyaXB0b3JcbiAgICAgICAgLCB0cnVlXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFzc2VydChcbiAgICAgICAgICBhY3R1YWxEZXNjcmlwdG9yXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gaGF2ZSBhbiBvd24gcHJvcGVydHkgZGVzY3JpcHRvciBmb3IgJyArIF8uaW5zcGVjdChuYW1lKVxuICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIG5vdCBoYXZlIGFuIG93biBwcm9wZXJ0eSBkZXNjcmlwdG9yIGZvciAnICsgXy5pbnNwZWN0KG5hbWUpXG4gICAgICApO1xuICAgIH1cbiAgICBmbGFnKHRoaXMsICdvYmplY3QnLCBhY3R1YWxEZXNjcmlwdG9yKTtcbiAgfVxuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ293blByb3BlcnR5RGVzY3JpcHRvcicsIGFzc2VydE93blByb3BlcnR5RGVzY3JpcHRvcik7XG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ2hhdmVPd25Qcm9wZXJ0eURlc2NyaXB0b3InLCBhc3NlcnRPd25Qcm9wZXJ0eURlc2NyaXB0b3IpO1xuXG4gIC8qKlxuICAgKiAjIyMgLmxlbmd0aCh2YWx1ZSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQncyBgbGVuZ3RoYCBwcm9wZXJ0eSBoYXNcbiAgICogdGhlIGV4cGVjdGVkIHZhbHVlLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KFsgMSwgMiwgM10pLnRvLmhhdmUubGVuZ3RoKDMpO1xuICAgKiAgICAgZXhwZWN0KCdmb29iYXInKS50by5oYXZlLmxlbmd0aCg2KTtcbiAgICpcbiAgICogQ2FuIGFsc28gYmUgdXNlZCBhcyBhIGNoYWluIHByZWN1cnNvciB0byBhIHZhbHVlXG4gICAqIGNvbXBhcmlzb24gZm9yIHRoZSBsZW5ndGggcHJvcGVydHkuXG4gICAqXG4gICAqICAgICBleHBlY3QoJ2ZvbycpLnRvLmhhdmUubGVuZ3RoLmFib3ZlKDIpO1xuICAgKiAgICAgZXhwZWN0KFsgMSwgMiwgMyBdKS50by5oYXZlLmxlbmd0aC5hYm92ZSgyKTtcbiAgICogICAgIGV4cGVjdCgnZm9vJykudG8uaGF2ZS5sZW5ndGguYmVsb3coNCk7XG4gICAqICAgICBleHBlY3QoWyAxLCAyLCAzIF0pLnRvLmhhdmUubGVuZ3RoLmJlbG93KDQpO1xuICAgKiAgICAgZXhwZWN0KCdmb28nKS50by5oYXZlLmxlbmd0aC53aXRoaW4oMiw0KTtcbiAgICogICAgIGV4cGVjdChbIDEsIDIsIDMgXSkudG8uaGF2ZS5sZW5ndGgud2l0aGluKDIsNCk7XG4gICAqXG4gICAqIEBuYW1lIGxlbmd0aFxuICAgKiBAYWxpYXMgbGVuZ3RoT2ZcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGFzc2VydExlbmd0aENoYWluICgpIHtcbiAgICBmbGFnKHRoaXMsICdkb0xlbmd0aCcsIHRydWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzZXJ0TGVuZ3RoIChuLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgbmV3IEFzc2VydGlvbihvYmosIG1zZykudG8uaGF2ZS5wcm9wZXJ0eSgnbGVuZ3RoJyk7XG4gICAgdmFyIGxlbiA9IG9iai5sZW5ndGg7XG5cbiAgICB0aGlzLmFzc2VydChcbiAgICAgICAgbGVuID09IG5cbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gaGF2ZSBhIGxlbmd0aCBvZiAje2V4cH0gYnV0IGdvdCAje2FjdH0nXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIG5vdCBoYXZlIGEgbGVuZ3RoIG9mICN7YWN0fSdcbiAgICAgICwgblxuICAgICAgLCBsZW5cbiAgICApO1xuICB9XG5cbiAgQXNzZXJ0aW9uLmFkZENoYWluYWJsZU1ldGhvZCgnbGVuZ3RoJywgYXNzZXJ0TGVuZ3RoLCBhc3NlcnRMZW5ndGhDaGFpbik7XG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ2xlbmd0aE9mJywgYXNzZXJ0TGVuZ3RoKTtcblxuICAvKipcbiAgICogIyMjIC5tYXRjaChyZWdleHApXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IG1hdGNoZXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gICAqXG4gICAqICAgICBleHBlY3QoJ2Zvb2JhcicpLnRvLm1hdGNoKC9eZm9vLyk7XG4gICAqXG4gICAqIEBuYW1lIG1hdGNoXG4gICAqIEBwYXJhbSB7UmVnRXhwfSBSZWd1bGFyRXhwcmVzc2lvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ21hdGNoJywgZnVuY3Rpb24gKHJlLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgdGhpcy5hc3NlcnQoXG4gICAgICAgIHJlLmV4ZWMob2JqKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBtYXRjaCAnICsgcmVcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gbm90IHRvIG1hdGNoICcgKyByZVxuICAgICk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAjIyMgLnN0cmluZyhzdHJpbmcpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgc3RyaW5nIHRhcmdldCBjb250YWlucyBhbm90aGVyIHN0cmluZy5cbiAgICpcbiAgICogICAgIGV4cGVjdCgnZm9vYmFyJykudG8uaGF2ZS5zdHJpbmcoJ2JhcicpO1xuICAgKlxuICAgKiBAbmFtZSBzdHJpbmdcbiAgICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZ1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ3N0cmluZycsIGZ1bmN0aW9uIChzdHIsIG1zZykge1xuICAgIGlmIChtc2cpIGZsYWcodGhpcywgJ21lc3NhZ2UnLCBtc2cpO1xuICAgIHZhciBvYmogPSBmbGFnKHRoaXMsICdvYmplY3QnKTtcbiAgICBuZXcgQXNzZXJ0aW9uKG9iaiwgbXNnKS5pcy5hKCdzdHJpbmcnKTtcblxuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICB+b2JqLmluZGV4T2Yoc3RyKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBjb250YWluICcgKyBfLmluc3BlY3Qoc3RyKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBub3QgY29udGFpbiAnICsgXy5pbnNwZWN0KHN0cilcbiAgICApO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyMgLmtleXMoa2V5MSwgW2tleTJdLCBbLi4uXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQgY29udGFpbnMgYW55IG9yIGFsbCBvZiB0aGUgcGFzc2VkLWluIGtleXMuXG4gICAqIFVzZSBpbiBjb21iaW5hdGlvbiB3aXRoIGBhbnlgLCBgYWxsYCwgYGNvbnRhaW5zYCwgb3IgYGhhdmVgIHdpbGwgYWZmZWN0XG4gICAqIHdoYXQgd2lsbCBwYXNzLlxuICAgKlxuICAgKiBXaGVuIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aCBgYW55YCwgYXQgbGVhc3Qgb25lIGtleSB0aGF0IGlzIHBhc3NlZFxuICAgKiBpbiBtdXN0IGV4aXN0IGluIHRoZSB0YXJnZXQgb2JqZWN0LiBUaGlzIGlzIHJlZ2FyZGxlc3Mgd2hldGhlciBvciBub3RcbiAgICogdGhlIGBoYXZlYCBvciBgY29udGFpbmAgcXVhbGlmaWVycyBhcmUgdXNlZC4gTm90ZSwgZWl0aGVyIGBhbnlgIG9yIGBhbGxgXG4gICAqIHNob3VsZCBiZSB1c2VkIGluIHRoZSBhc3NlcnRpb24uIElmIG5laXRoZXIgYXJlIHVzZWQsIHRoZSBhc3NlcnRpb24gaXNcbiAgICogZGVmYXVsdGVkIHRvIGBhbGxgLlxuICAgKlxuICAgKiBXaGVuIGJvdGggYGFsbGAgYW5kIGBjb250YWluYCBhcmUgdXNlZCwgdGhlIHRhcmdldCBvYmplY3QgbXVzdCBoYXZlIGF0XG4gICAqIGxlYXN0IGFsbCBvZiB0aGUgcGFzc2VkLWluIGtleXMgYnV0IG1heSBoYXZlIG1vcmUga2V5cyBub3QgbGlzdGVkLlxuICAgKlxuICAgKiBXaGVuIGJvdGggYGFsbGAgYW5kIGBoYXZlYCBhcmUgdXNlZCwgdGhlIHRhcmdldCBvYmplY3QgbXVzdCBib3RoIGNvbnRhaW5cbiAgICogYWxsIG9mIHRoZSBwYXNzZWQtaW4ga2V5cyBBTkQgdGhlIG51bWJlciBvZiBrZXlzIGluIHRoZSB0YXJnZXQgb2JqZWN0IG11c3RcbiAgICogbWF0Y2ggdGhlIG51bWJlciBvZiBrZXlzIHBhc3NlZCBpbiAoaW4gb3RoZXIgd29yZHMsIGEgdGFyZ2V0IG9iamVjdCBtdXN0XG4gICAqIGhhdmUgYWxsIGFuZCBvbmx5IGFsbCBvZiB0aGUgcGFzc2VkLWluIGtleXMpLlxuICAgKlxuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAxLCBiYXI6IDIgfSkudG8uaGF2ZS5hbnkua2V5cygnZm9vJywgJ2JheicpO1xuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAxLCBiYXI6IDIgfSkudG8uaGF2ZS5hbnkua2V5cygnZm9vJyk7XG4gICAqICAgICBleHBlY3QoeyBmb286IDEsIGJhcjogMiB9KS50by5jb250YWluLmFueS5rZXlzKCdiYXInLCAnYmF6Jyk7XG4gICAqICAgICBleHBlY3QoeyBmb286IDEsIGJhcjogMiB9KS50by5jb250YWluLmFueS5rZXlzKFsnZm9vJ10pO1xuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAxLCBiYXI6IDIgfSkudG8uY29udGFpbi5hbnkua2V5cyh7J2Zvbyc6IDZ9KTtcbiAgICogICAgIGV4cGVjdCh7IGZvbzogMSwgYmFyOiAyIH0pLnRvLmhhdmUuYWxsLmtleXMoWydiYXInLCAnZm9vJ10pO1xuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAxLCBiYXI6IDIgfSkudG8uaGF2ZS5hbGwua2V5cyh7J2Jhcic6IDYsICdmb28nOiA3fSk7XG4gICAqICAgICBleHBlY3QoeyBmb286IDEsIGJhcjogMiwgYmF6OiAzIH0pLnRvLmNvbnRhaW4uYWxsLmtleXMoWydiYXInLCAnZm9vJ10pO1xuICAgKiAgICAgZXhwZWN0KHsgZm9vOiAxLCBiYXI6IDIsIGJhejogMyB9KS50by5jb250YWluLmFsbC5rZXlzKFt7J2Jhcic6IDZ9fV0pO1xuICAgKlxuICAgKlxuICAgKiBAbmFtZSBrZXlzXG4gICAqIEBhbGlhcyBrZXlcbiAgICogQHBhcmFtIHtTdHJpbmcuLi58QXJyYXl8T2JqZWN0fSBrZXlzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGFzc2VydEtleXMgKGtleXMpIHtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0JylcbiAgICAgICwgc3RyXG4gICAgICAsIG9rID0gdHJ1ZVxuICAgICAgLCBtaXhlZEFyZ3NNc2cgPSAna2V5cyBtdXN0IGJlIGdpdmVuIHNpbmdsZSBhcmd1bWVudCBvZiBBcnJheXxPYmplY3R8U3RyaW5nLCBvciBtdWx0aXBsZSBTdHJpbmcgYXJndW1lbnRzJztcblxuICAgIHN3aXRjaCAoXy50eXBlKGtleXMpKSB7XG4gICAgICBjYXNlIFwiYXJyYXlcIjpcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB0aHJvdyAobmV3IEVycm9yKG1peGVkQXJnc01zZykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB0aHJvdyAobmV3IEVycm9yKG1peGVkQXJnc01zZykpO1xuICAgICAgICBrZXlzID0gT2JqZWN0LmtleXMoa2V5cyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAga2V5cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgaWYgKCFrZXlzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKCdrZXlzIHJlcXVpcmVkJyk7XG5cbiAgICB2YXIgYWN0dWFsID0gT2JqZWN0LmtleXMob2JqKVxuICAgICAgLCBleHBlY3RlZCA9IGtleXNcbiAgICAgICwgbGVuID0ga2V5cy5sZW5ndGhcbiAgICAgICwgYW55ID0gZmxhZyh0aGlzLCAnYW55JylcbiAgICAgICwgYWxsID0gZmxhZyh0aGlzLCAnYWxsJyk7XG5cbiAgICBpZiAoIWFueSAmJiAhYWxsKSB7XG4gICAgICBhbGwgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIEhhcyBhbnlcbiAgICBpZiAoYW55KSB7XG4gICAgICB2YXIgaW50ZXJzZWN0aW9uID0gZXhwZWN0ZWQuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4gfmFjdHVhbC5pbmRleE9mKGtleSk7XG4gICAgICB9KTtcbiAgICAgIG9rID0gaW50ZXJzZWN0aW9uLmxlbmd0aCA+IDA7XG4gICAgfVxuXG4gICAgLy8gSGFzIGFsbFxuICAgIGlmIChhbGwpIHtcbiAgICAgIG9rID0ga2V5cy5ldmVyeShmdW5jdGlvbihrZXkpe1xuICAgICAgICByZXR1cm4gfmFjdHVhbC5pbmRleE9mKGtleSk7XG4gICAgICB9KTtcbiAgICAgIGlmICghZmxhZyh0aGlzLCAnbmVnYXRlJykgJiYgIWZsYWcodGhpcywgJ2NvbnRhaW5zJykpIHtcbiAgICAgICAgb2sgPSBvayAmJiBrZXlzLmxlbmd0aCA9PSBhY3R1YWwubGVuZ3RoO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEtleSBzdHJpbmdcbiAgICBpZiAobGVuID4gMSkge1xuICAgICAga2V5cyA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgIHJldHVybiBfLmluc3BlY3Qoa2V5KTtcbiAgICAgIH0pO1xuICAgICAgdmFyIGxhc3QgPSBrZXlzLnBvcCgpO1xuICAgICAgaWYgKGFsbCkge1xuICAgICAgICBzdHIgPSBrZXlzLmpvaW4oJywgJykgKyAnLCBhbmQgJyArIGxhc3Q7XG4gICAgICB9XG4gICAgICBpZiAoYW55KSB7XG4gICAgICAgIHN0ciA9IGtleXMuam9pbignLCAnKSArICcsIG9yICcgKyBsYXN0O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBfLmluc3BlY3Qoa2V5c1swXSk7XG4gICAgfVxuXG4gICAgLy8gRm9ybVxuICAgIHN0ciA9IChsZW4gPiAxID8gJ2tleXMgJyA6ICdrZXkgJykgKyBzdHI7XG5cbiAgICAvLyBIYXZlIC8gaW5jbHVkZVxuICAgIHN0ciA9IChmbGFnKHRoaXMsICdjb250YWlucycpID8gJ2NvbnRhaW4gJyA6ICdoYXZlICcpICsgc3RyO1xuXG4gICAgLy8gQXNzZXJ0aW9uXG4gICAgdGhpcy5hc3NlcnQoXG4gICAgICAgIG9rXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvICcgKyBzdHJcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90ICcgKyBzdHJcbiAgICAgICwgZXhwZWN0ZWQuc2xpY2UoMCkuc29ydCgpXG4gICAgICAsIGFjdHVhbC5zb3J0KClcbiAgICAgICwgdHJ1ZVxuICAgICk7XG4gIH1cblxuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdrZXlzJywgYXNzZXJ0S2V5cyk7XG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ2tleScsIGFzc2VydEtleXMpO1xuXG4gIC8qKlxuICAgKiAjIyMgLnRocm93KGNvbnN0cnVjdG9yKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHRhcmdldCB3aWxsIHRocm93IGEgc3BlY2lmaWMgZXJyb3IsIG9yIHNwZWNpZmljIHR5cGUgb2YgZXJyb3JcbiAgICogKGFzIGRldGVybWluZWQgdXNpbmcgYGluc3RhbmNlb2ZgKSwgb3B0aW9uYWxseSB3aXRoIGEgUmVnRXhwIG9yIHN0cmluZyBpbmNsdXNpb24gdGVzdFxuICAgKiBmb3IgdGhlIGVycm9yJ3MgbWVzc2FnZS5cbiAgICpcbiAgICogICAgIHZhciBlcnIgPSBuZXcgUmVmZXJlbmNlRXJyb3IoJ1RoaXMgaXMgYSBiYWQgZnVuY3Rpb24uJyk7XG4gICAqICAgICB2YXIgZm4gPSBmdW5jdGlvbiAoKSB7IHRocm93IGVycjsgfVxuICAgKiAgICAgZXhwZWN0KGZuKS50by50aHJvdyhSZWZlcmVuY2VFcnJvcik7XG4gICAqICAgICBleHBlY3QoZm4pLnRvLnRocm93KEVycm9yKTtcbiAgICogICAgIGV4cGVjdChmbikudG8udGhyb3coL2JhZCBmdW5jdGlvbi8pO1xuICAgKiAgICAgZXhwZWN0KGZuKS50by5ub3QudGhyb3coJ2dvb2QgZnVuY3Rpb24nKTtcbiAgICogICAgIGV4cGVjdChmbikudG8udGhyb3coUmVmZXJlbmNlRXJyb3IsIC9iYWQgZnVuY3Rpb24vKTtcbiAgICogICAgIGV4cGVjdChmbikudG8udGhyb3coZXJyKTtcbiAgICogICAgIGV4cGVjdChmbikudG8ubm90LnRocm93KG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UuJykpO1xuICAgKlxuICAgKiBQbGVhc2Ugbm90ZSB0aGF0IHdoZW4gYSB0aHJvdyBleHBlY3RhdGlvbiBpcyBuZWdhdGVkLCBpdCB3aWxsIGNoZWNrIGVhY2hcbiAgICogcGFyYW1ldGVyIGluZGVwZW5kZW50bHksIHN0YXJ0aW5nIHdpdGggZXJyb3IgY29uc3RydWN0b3IgdHlwZS4gVGhlIGFwcHJvcHJpYXRlIHdheVxuICAgKiB0byBjaGVjayBmb3IgdGhlIGV4aXN0ZW5jZSBvZiBhIHR5cGUgb2YgZXJyb3IgYnV0IGZvciBhIG1lc3NhZ2UgdGhhdCBkb2VzIG5vdCBtYXRjaFxuICAgKiBpcyB0byB1c2UgYGFuZGAuXG4gICAqXG4gICAqICAgICBleHBlY3QoZm4pLnRvLnRocm93KFJlZmVyZW5jZUVycm9yKVxuICAgKiAgICAgICAgLmFuZC5ub3QudGhyb3coL2dvb2QgZnVuY3Rpb24vKTtcbiAgICpcbiAgICogQG5hbWUgdGhyb3dcbiAgICogQGFsaWFzIHRocm93c1xuICAgKiBAYWxpYXMgVGhyb3dcbiAgICogQHBhcmFtIHtFcnJvckNvbnN0cnVjdG9yfSBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge1N0cmluZ3xSZWdFeHB9IGV4cGVjdGVkIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0Vycm9yI0Vycm9yX3R5cGVzXG4gICAqIEByZXR1cm5zIGVycm9yIGZvciBjaGFpbmluZyAobnVsbCBpZiBubyBlcnJvcilcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gYXNzZXJ0VGhyb3dzIChjb25zdHJ1Y3RvciwgZXJyTXNnLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgbmV3IEFzc2VydGlvbihvYmosIG1zZykuaXMuYSgnZnVuY3Rpb24nKTtcblxuICAgIHZhciB0aHJvd24gPSBmYWxzZVxuICAgICAgLCBkZXNpcmVkRXJyb3IgPSBudWxsXG4gICAgICAsIG5hbWUgPSBudWxsXG4gICAgICAsIHRocm93bkVycm9yID0gbnVsbDtcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBlcnJNc2cgPSBudWxsO1xuICAgICAgY29uc3RydWN0b3IgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAoY29uc3RydWN0b3IgJiYgKGNvbnN0cnVjdG9yIGluc3RhbmNlb2YgUmVnRXhwIHx8ICdzdHJpbmcnID09PSB0eXBlb2YgY29uc3RydWN0b3IpKSB7XG4gICAgICBlcnJNc2cgPSBjb25zdHJ1Y3RvcjtcbiAgICAgIGNvbnN0cnVjdG9yID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGNvbnN0cnVjdG9yICYmIGNvbnN0cnVjdG9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGRlc2lyZWRFcnJvciA9IGNvbnN0cnVjdG9yO1xuICAgICAgY29uc3RydWN0b3IgPSBudWxsO1xuICAgICAgZXJyTXNnID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb25zdHJ1Y3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbmFtZSA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZS5uYW1lIHx8IGNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICBpZiAobmFtZSA9PT0gJ0Vycm9yJyAmJiBjb25zdHJ1Y3RvciAhPT0gRXJyb3IpIHtcbiAgICAgICAgbmFtZSA9IChuZXcgY29uc3RydWN0b3IoKSkubmFtZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3RydWN0b3IgPSBudWxsO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBvYmooKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIGZpcnN0LCBjaGVjayBkZXNpcmVkIGVycm9yXG4gICAgICBpZiAoZGVzaXJlZEVycm9yKSB7XG4gICAgICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICAgICAgZXJyID09PSBkZXNpcmVkRXJyb3JcbiAgICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIHRocm93ICN7ZXhwfSBidXQgI3thY3R9IHdhcyB0aHJvd24nXG4gICAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBub3QgdGhyb3cgI3tleHB9J1xuICAgICAgICAgICwgKGRlc2lyZWRFcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZGVzaXJlZEVycm9yLnRvU3RyaW5nKCkgOiBkZXNpcmVkRXJyb3IpXG4gICAgICAgICAgLCAoZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIudG9TdHJpbmcoKSA6IGVycilcbiAgICAgICAgKTtcblxuICAgICAgICBmbGFnKHRoaXMsICdvYmplY3QnLCBlcnIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgLy8gbmV4dCwgY2hlY2sgY29uc3RydWN0b3JcbiAgICAgIGlmIChjb25zdHJ1Y3Rvcikge1xuICAgICAgICB0aGlzLmFzc2VydChcbiAgICAgICAgICAgIGVyciBpbnN0YW5jZW9mIGNvbnN0cnVjdG9yXG4gICAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byB0aHJvdyAje2V4cH0gYnV0ICN7YWN0fSB3YXMgdGhyb3duJ1xuICAgICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IHRocm93ICN7ZXhwfSBidXQgI3thY3R9IHdhcyB0aHJvd24nXG4gICAgICAgICAgLCBuYW1lXG4gICAgICAgICAgLCAoZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIudG9TdHJpbmcoKSA6IGVycilcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoIWVyck1zZykge1xuICAgICAgICAgIGZsYWcodGhpcywgJ29iamVjdCcsIGVycik7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gbmV4dCwgY2hlY2sgbWVzc2FnZVxuICAgICAgdmFyIG1lc3NhZ2UgPSAnb2JqZWN0JyA9PT0gXy50eXBlKGVycikgJiYgXCJtZXNzYWdlXCIgaW4gZXJyXG4gICAgICAgID8gZXJyLm1lc3NhZ2VcbiAgICAgICAgOiAnJyArIGVycjtcblxuICAgICAgaWYgKChtZXNzYWdlICE9IG51bGwpICYmIGVyck1zZyAmJiBlcnJNc2cgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgdGhpcy5hc3NlcnQoXG4gICAgICAgICAgICBlcnJNc2cuZXhlYyhtZXNzYWdlKVxuICAgICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gdGhyb3cgZXJyb3IgbWF0Y2hpbmcgI3tleHB9IGJ1dCBnb3QgI3thY3R9J1xuICAgICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gdGhyb3cgZXJyb3Igbm90IG1hdGNoaW5nICN7ZXhwfSdcbiAgICAgICAgICAsIGVyck1zZ1xuICAgICAgICAgICwgbWVzc2FnZVxuICAgICAgICApO1xuXG4gICAgICAgIGZsYWcodGhpcywgJ29iamVjdCcsIGVycik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSBlbHNlIGlmICgobWVzc2FnZSAhPSBudWxsKSAmJiBlcnJNc2cgJiYgJ3N0cmluZycgPT09IHR5cGVvZiBlcnJNc2cpIHtcbiAgICAgICAgdGhpcy5hc3NlcnQoXG4gICAgICAgICAgICB+bWVzc2FnZS5pbmRleE9mKGVyck1zZylcbiAgICAgICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIHRocm93IGVycm9yIGluY2x1ZGluZyAje2V4cH0gYnV0IGdvdCAje2FjdH0nXG4gICAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byB0aHJvdyBlcnJvciBub3QgaW5jbHVkaW5nICN7YWN0fSdcbiAgICAgICAgICAsIGVyck1zZ1xuICAgICAgICAgICwgbWVzc2FnZVxuICAgICAgICApO1xuXG4gICAgICAgIGZsYWcodGhpcywgJ29iamVjdCcsIGVycik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3duID0gdHJ1ZTtcbiAgICAgICAgdGhyb3duRXJyb3IgPSBlcnI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGFjdHVhbGx5R290ID0gJydcbiAgICAgICwgZXhwZWN0ZWRUaHJvd24gPSBuYW1lICE9PSBudWxsXG4gICAgICAgID8gbmFtZVxuICAgICAgICA6IGRlc2lyZWRFcnJvclxuICAgICAgICAgID8gJyN7ZXhwfScgLy9fLmluc3BlY3QoZGVzaXJlZEVycm9yKVxuICAgICAgICAgIDogJ2FuIGVycm9yJztcblxuICAgIGlmICh0aHJvd24pIHtcbiAgICAgIGFjdHVhbGx5R290ID0gJyBidXQgI3thY3R9IHdhcyB0aHJvd24nXG4gICAgfVxuXG4gICAgdGhpcy5hc3NlcnQoXG4gICAgICAgIHRocm93biA9PT0gdHJ1ZVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byB0aHJvdyAnICsgZXhwZWN0ZWRUaHJvd24gKyBhY3R1YWxseUdvdFxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBub3QgdGhyb3cgJyArIGV4cGVjdGVkVGhyb3duICsgYWN0dWFsbHlHb3RcbiAgICAgICwgKGRlc2lyZWRFcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZGVzaXJlZEVycm9yLnRvU3RyaW5nKCkgOiBkZXNpcmVkRXJyb3IpXG4gICAgICAsICh0aHJvd25FcnJvciBpbnN0YW5jZW9mIEVycm9yID8gdGhyb3duRXJyb3IudG9TdHJpbmcoKSA6IHRocm93bkVycm9yKVxuICAgICk7XG5cbiAgICBmbGFnKHRoaXMsICdvYmplY3QnLCB0aHJvd25FcnJvcik7XG4gIH07XG5cbiAgQXNzZXJ0aW9uLmFkZE1ldGhvZCgndGhyb3cnLCBhc3NlcnRUaHJvd3MpO1xuICBBc3NlcnRpb24uYWRkTWV0aG9kKCd0aHJvd3MnLCBhc3NlcnRUaHJvd3MpO1xuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdUaHJvdycsIGFzc2VydFRocm93cyk7XG5cbiAgLyoqXG4gICAqICMjIyAucmVzcG9uZFRvKG1ldGhvZClcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSBvYmplY3Qgb3IgY2xhc3MgdGFyZ2V0IHdpbGwgcmVzcG9uZCB0byBhIG1ldGhvZC5cbiAgICpcbiAgICogICAgIEtsYXNzLnByb3RvdHlwZS5iYXIgPSBmdW5jdGlvbigpe307XG4gICAqICAgICBleHBlY3QoS2xhc3MpLnRvLnJlc3BvbmRUbygnYmFyJyk7XG4gICAqICAgICBleHBlY3Qob2JqKS50by5yZXNwb25kVG8oJ2JhcicpO1xuICAgKlxuICAgKiBUbyBjaGVjayBpZiBhIGNvbnN0cnVjdG9yIHdpbGwgcmVzcG9uZCB0byBhIHN0YXRpYyBmdW5jdGlvbixcbiAgICogc2V0IHRoZSBgaXRzZWxmYCBmbGFnLlxuICAgKlxuICAgKiAgICAgS2xhc3MuYmF6ID0gZnVuY3Rpb24oKXt9O1xuICAgKiAgICAgZXhwZWN0KEtsYXNzKS5pdHNlbGYudG8ucmVzcG9uZFRvKCdiYXonKTtcbiAgICpcbiAgICogQG5hbWUgcmVzcG9uZFRvXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2RcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdyZXNwb25kVG8nLCBmdW5jdGlvbiAobWV0aG9kLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0JylcbiAgICAgICwgaXRzZWxmID0gZmxhZyh0aGlzLCAnaXRzZWxmJylcbiAgICAgICwgY29udGV4dCA9ICgnZnVuY3Rpb24nID09PSBfLnR5cGUob2JqKSAmJiAhaXRzZWxmKVxuICAgICAgICA/IG9iai5wcm90b3R5cGVbbWV0aG9kXVxuICAgICAgICA6IG9ialttZXRob2RdO1xuXG4gICAgdGhpcy5hc3NlcnQoXG4gICAgICAgICdmdW5jdGlvbicgPT09IHR5cGVvZiBjb250ZXh0XG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIHJlc3BvbmQgdG8gJyArIF8uaW5zcGVjdChtZXRob2QpXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIG5vdCByZXNwb25kIHRvICcgKyBfLmluc3BlY3QobWV0aG9kKVxuICAgICk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAjIyMgLml0c2VsZlxuICAgKlxuICAgKiBTZXRzIHRoZSBgaXRzZWxmYCBmbGFnLCBsYXRlciB1c2VkIGJ5IHRoZSBgcmVzcG9uZFRvYCBhc3NlcnRpb24uXG4gICAqXG4gICAqICAgICBmdW5jdGlvbiBGb28oKSB7fVxuICAgKiAgICAgRm9vLmJhciA9IGZ1bmN0aW9uKCkge31cbiAgICogICAgIEZvby5wcm90b3R5cGUuYmF6ID0gZnVuY3Rpb24oKSB7fVxuICAgKlxuICAgKiAgICAgZXhwZWN0KEZvbykuaXRzZWxmLnRvLnJlc3BvbmRUbygnYmFyJyk7XG4gICAqICAgICBleHBlY3QoRm9vKS5pdHNlbGYubm90LnRvLnJlc3BvbmRUbygnYmF6Jyk7XG4gICAqXG4gICAqIEBuYW1lIGl0c2VsZlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBBc3NlcnRpb24uYWRkUHJvcGVydHkoJ2l0c2VsZicsIGZ1bmN0aW9uICgpIHtcbiAgICBmbGFnKHRoaXMsICdpdHNlbGYnLCB0cnVlKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqICMjIyAuc2F0aXNmeShtZXRob2QpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IHBhc3NlcyBhIGdpdmVuIHRydXRoIHRlc3QuXG4gICAqXG4gICAqICAgICBleHBlY3QoMSkudG8uc2F0aXNmeShmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bSA+IDA7IH0pO1xuICAgKlxuICAgKiBAbmFtZSBzYXRpc2Z5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG1hdGNoZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBBc3NlcnRpb24uYWRkTWV0aG9kKCdzYXRpc2Z5JywgZnVuY3Rpb24gKG1hdGNoZXIsIG1zZykge1xuICAgIGlmIChtc2cpIGZsYWcodGhpcywgJ21lc3NhZ2UnLCBtc2cpO1xuICAgIHZhciBvYmogPSBmbGFnKHRoaXMsICdvYmplY3QnKTtcbiAgICB2YXIgcmVzdWx0ID0gbWF0Y2hlcihvYmopO1xuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICByZXN1bHRcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gc2F0aXNmeSAnICsgXy5vYmpEaXNwbGF5KG1hdGNoZXIpXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIG5vdCBzYXRpc2Z5JyArIF8ub2JqRGlzcGxheShtYXRjaGVyKVxuICAgICAgLCB0aGlzLm5lZ2F0ZSA/IGZhbHNlIDogdHJ1ZVxuICAgICAgLCByZXN1bHRcbiAgICApO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC5jbG9zZVRvKGV4cGVjdGVkLCBkZWx0YSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IHRoZSB0YXJnZXQgaXMgZXF1YWwgYGV4cGVjdGVkYCwgdG8gd2l0aGluIGEgKy8tIGBkZWx0YWAgcmFuZ2UuXG4gICAqXG4gICAqICAgICBleHBlY3QoMS41KS50by5iZS5jbG9zZVRvKDEsIDAuNSk7XG4gICAqXG4gICAqIEBuYW1lIGNsb3NlVG9cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGV4cGVjdGVkXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWx0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ2Nsb3NlVG8nLCBmdW5jdGlvbiAoZXhwZWN0ZWQsIGRlbHRhLCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG5cbiAgICBuZXcgQXNzZXJ0aW9uKG9iaiwgbXNnKS5pcy5hKCdudW1iZXInKTtcbiAgICBpZiAoXy50eXBlKGV4cGVjdGVkKSAhPT0gJ251bWJlcicgfHwgXy50eXBlKGRlbHRhKSAhPT0gJ251bWJlcicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndGhlIGFyZ3VtZW50cyB0byBjbG9zZVRvIG11c3QgYmUgbnVtYmVycycpO1xuICAgIH1cblxuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgICBNYXRoLmFicyhvYmogLSBleHBlY3RlZCkgPD0gZGVsdGFcbiAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgY2xvc2UgdG8gJyArIGV4cGVjdGVkICsgJyArLy0gJyArIGRlbHRhXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IG5vdCB0byBiZSBjbG9zZSB0byAnICsgZXhwZWN0ZWQgKyAnICsvLSAnICsgZGVsdGFcbiAgICApO1xuICB9KTtcblxuICBmdW5jdGlvbiBpc1N1YnNldE9mKHN1YnNldCwgc3VwZXJzZXQsIGNtcCkge1xuICAgIHJldHVybiBzdWJzZXQuZXZlcnkoZnVuY3Rpb24oZWxlbSkge1xuICAgICAgaWYgKCFjbXApIHJldHVybiBzdXBlcnNldC5pbmRleE9mKGVsZW0pICE9PSAtMTtcblxuICAgICAgcmV0dXJuIHN1cGVyc2V0LnNvbWUoZnVuY3Rpb24oZWxlbTIpIHtcbiAgICAgICAgcmV0dXJuIGNtcChlbGVtLCBlbGVtMik7XG4gICAgICB9KTtcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqICMjIyAubWVtYmVycyhzZXQpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGlzIGEgc3VwZXJzZXQgb2YgYHNldGAsXG4gICAqIG9yIHRoYXQgdGhlIHRhcmdldCBhbmQgYHNldGAgaGF2ZSB0aGUgc2FtZSBzdHJpY3RseS1lcXVhbCAoPT09KSBtZW1iZXJzLlxuICAgKiBBbHRlcm5hdGVseSwgaWYgdGhlIGBkZWVwYCBmbGFnIGlzIHNldCwgc2V0IG1lbWJlcnMgYXJlIGNvbXBhcmVkIGZvciBkZWVwXG4gICAqIGVxdWFsaXR5LlxuICAgKlxuICAgKiAgICAgZXhwZWN0KFsxLCAyLCAzXSkudG8uaW5jbHVkZS5tZW1iZXJzKFszLCAyXSk7XG4gICAqICAgICBleHBlY3QoWzEsIDIsIDNdKS50by5ub3QuaW5jbHVkZS5tZW1iZXJzKFszLCAyLCA4XSk7XG4gICAqXG4gICAqICAgICBleHBlY3QoWzQsIDJdKS50by5oYXZlLm1lbWJlcnMoWzIsIDRdKTtcbiAgICogICAgIGV4cGVjdChbNSwgMl0pLnRvLm5vdC5oYXZlLm1lbWJlcnMoWzUsIDIsIDFdKTtcbiAgICpcbiAgICogICAgIGV4cGVjdChbeyBpZDogMSB9XSkudG8uZGVlcC5pbmNsdWRlLm1lbWJlcnMoW3sgaWQ6IDEgfV0pO1xuICAgKlxuICAgKiBAbmFtZSBtZW1iZXJzXG4gICAqIEBwYXJhbSB7QXJyYXl9IHNldFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEFzc2VydGlvbi5hZGRNZXRob2QoJ21lbWJlcnMnLCBmdW5jdGlvbiAoc3Vic2V0LCBtc2cpIHtcbiAgICBpZiAobXNnKSBmbGFnKHRoaXMsICdtZXNzYWdlJywgbXNnKTtcbiAgICB2YXIgb2JqID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG5cbiAgICBuZXcgQXNzZXJ0aW9uKG9iaikudG8uYmUuYW4oJ2FycmF5Jyk7XG4gICAgbmV3IEFzc2VydGlvbihzdWJzZXQpLnRvLmJlLmFuKCdhcnJheScpO1xuXG4gICAgdmFyIGNtcCA9IGZsYWcodGhpcywgJ2RlZXAnKSA/IF8uZXFsIDogdW5kZWZpbmVkO1xuXG4gICAgaWYgKGZsYWcodGhpcywgJ2NvbnRhaW5zJykpIHtcbiAgICAgIHJldHVybiB0aGlzLmFzc2VydChcbiAgICAgICAgICBpc1N1YnNldE9mKHN1YnNldCwgb2JqLCBjbXApXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gYmUgYSBzdXBlcnNldCBvZiAje2FjdH0nXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gbm90IGJlIGEgc3VwZXJzZXQgb2YgI3thY3R9J1xuICAgICAgICAsIG9ialxuICAgICAgICAsIHN1YnNldFxuICAgICAgKTtcbiAgICB9XG5cbiAgICB0aGlzLmFzc2VydChcbiAgICAgICAgaXNTdWJzZXRPZihvYmosIHN1YnNldCwgY21wKSAmJiBpc1N1YnNldE9mKHN1YnNldCwgb2JqLCBjbXApXG4gICAgICAgICwgJ2V4cGVjdGVkICN7dGhpc30gdG8gaGF2ZSB0aGUgc2FtZSBtZW1iZXJzIGFzICN7YWN0fSdcbiAgICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBub3QgaGF2ZSB0aGUgc2FtZSBtZW1iZXJzIGFzICN7YWN0fSdcbiAgICAgICAgLCBvYmpcbiAgICAgICAgLCBzdWJzZXRcbiAgICApO1xuICB9KTtcblxuICAvKipcbiAgICogIyMjIC5jaGFuZ2UoZnVuY3Rpb24pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBhIGZ1bmN0aW9uIGNoYW5nZXMgYW4gb2JqZWN0IHByb3BlcnR5XG4gICAqXG4gICAqICAgICB2YXIgb2JqID0geyB2YWw6IDEwIH07XG4gICAqICAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHsgb2JqLnZhbCArPSAzIH07XG4gICAqICAgICB2YXIgbm9DaGFuZ2VGbiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJ2ZvbycgKyAnYmFyJzsgfVxuICAgKiAgICAgZXhwZWN0KGZuKS50by5jaGFuZ2Uob2JqLCAndmFsJyk7XG4gICAqICAgICBleHBlY3Qobm9DaGFuZ0ZuKS50by5ub3QuY2hhbmdlKG9iaiwgJ3ZhbCcpXG4gICAqXG4gICAqIEBuYW1lIGNoYW5nZVxuICAgKiBAYWxpYXMgY2hhbmdlc1xuICAgKiBAYWxpYXMgQ2hhbmdlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBhc3NlcnRDaGFuZ2VzIChvYmplY3QsIHByb3AsIG1zZykge1xuICAgIGlmIChtc2cpIGZsYWcodGhpcywgJ21lc3NhZ2UnLCBtc2cpO1xuICAgIHZhciBmbiA9IGZsYWcodGhpcywgJ29iamVjdCcpO1xuICAgIG5ldyBBc3NlcnRpb24ob2JqZWN0LCBtc2cpLnRvLmhhdmUucHJvcGVydHkocHJvcCk7XG4gICAgbmV3IEFzc2VydGlvbihmbikuaXMuYSgnZnVuY3Rpb24nKTtcblxuICAgIHZhciBpbml0aWFsID0gb2JqZWN0W3Byb3BdO1xuICAgIGZuKCk7XG5cbiAgICB0aGlzLmFzc2VydChcbiAgICAgIGluaXRpYWwgIT09IG9iamVjdFtwcm9wXVxuICAgICAgLCAnZXhwZWN0ZWQgLicgKyBwcm9wICsgJyB0byBjaGFuZ2UnXG4gICAgICAsICdleHBlY3RlZCAuJyArIHByb3AgKyAnIHRvIG5vdCBjaGFuZ2UnXG4gICAgKTtcbiAgfVxuXG4gIEFzc2VydGlvbi5hZGRDaGFpbmFibGVNZXRob2QoJ2NoYW5nZScsIGFzc2VydENoYW5nZXMpO1xuICBBc3NlcnRpb24uYWRkQ2hhaW5hYmxlTWV0aG9kKCdjaGFuZ2VzJywgYXNzZXJ0Q2hhbmdlcyk7XG5cbiAgLyoqXG4gICAqICMjIyAuaW5jcmVhc2UoZnVuY3Rpb24pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBhIGZ1bmN0aW9uIGluY3JlYXNlcyBhbiBvYmplY3QgcHJvcGVydHlcbiAgICpcbiAgICogICAgIHZhciBvYmogPSB7IHZhbDogMTAgfTtcbiAgICogICAgIHZhciBmbiA9IGZ1bmN0aW9uKCkgeyBvYmoudmFsID0gMTUgfTtcbiAgICogICAgIGV4cGVjdChmbikudG8uaW5jcmVhc2Uob2JqLCAndmFsJyk7XG4gICAqXG4gICAqIEBuYW1lIGluY3JlYXNlXG4gICAqIEBhbGlhcyBpbmNyZWFzZXNcbiAgICogQGFsaWFzIEluY3JlYXNlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBhc3NlcnRJbmNyZWFzZXMgKG9iamVjdCwgcHJvcCwgbXNnKSB7XG4gICAgaWYgKG1zZykgZmxhZyh0aGlzLCAnbWVzc2FnZScsIG1zZyk7XG4gICAgdmFyIGZuID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgbmV3IEFzc2VydGlvbihvYmplY3QsIG1zZykudG8uaGF2ZS5wcm9wZXJ0eShwcm9wKTtcbiAgICBuZXcgQXNzZXJ0aW9uKGZuKS5pcy5hKCdmdW5jdGlvbicpO1xuXG4gICAgdmFyIGluaXRpYWwgPSBvYmplY3RbcHJvcF07XG4gICAgZm4oKTtcblxuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgb2JqZWN0W3Byb3BdIC0gaW5pdGlhbCA+IDBcbiAgICAgICwgJ2V4cGVjdGVkIC4nICsgcHJvcCArICcgdG8gaW5jcmVhc2UnXG4gICAgICAsICdleHBlY3RlZCAuJyArIHByb3AgKyAnIHRvIG5vdCBpbmNyZWFzZSdcbiAgICApO1xuICB9XG5cbiAgQXNzZXJ0aW9uLmFkZENoYWluYWJsZU1ldGhvZCgnaW5jcmVhc2UnLCBhc3NlcnRJbmNyZWFzZXMpO1xuICBBc3NlcnRpb24uYWRkQ2hhaW5hYmxlTWV0aG9kKCdpbmNyZWFzZXMnLCBhc3NlcnRJbmNyZWFzZXMpO1xuXG4gIC8qKlxuICAgKiAjIyMgLmRlY3JlYXNlKGZ1bmN0aW9uKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYSBmdW5jdGlvbiBkZWNyZWFzZXMgYW4gb2JqZWN0IHByb3BlcnR5XG4gICAqXG4gICAqICAgICB2YXIgb2JqID0geyB2YWw6IDEwIH07XG4gICAqICAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHsgb2JqLnZhbCA9IDUgfTtcbiAgICogICAgIGV4cGVjdChmbikudG8uZGVjcmVhc2Uob2JqLCAndmFsJyk7XG4gICAqXG4gICAqIEBuYW1lIGRlY3JlYXNlXG4gICAqIEBhbGlhcyBkZWNyZWFzZXNcbiAgICogQGFsaWFzIERlY3JlYXNlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBhc3NlcnREZWNyZWFzZXMgKG9iamVjdCwgcHJvcCwgbXNnKSB7XG4gICAgaWYgKG1zZykgZmxhZyh0aGlzLCAnbWVzc2FnZScsIG1zZyk7XG4gICAgdmFyIGZuID0gZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gICAgbmV3IEFzc2VydGlvbihvYmplY3QsIG1zZykudG8uaGF2ZS5wcm9wZXJ0eShwcm9wKTtcbiAgICBuZXcgQXNzZXJ0aW9uKGZuKS5pcy5hKCdmdW5jdGlvbicpO1xuXG4gICAgdmFyIGluaXRpYWwgPSBvYmplY3RbcHJvcF07XG4gICAgZm4oKTtcblxuICAgIHRoaXMuYXNzZXJ0KFxuICAgICAgb2JqZWN0W3Byb3BdIC0gaW5pdGlhbCA8IDBcbiAgICAgICwgJ2V4cGVjdGVkIC4nICsgcHJvcCArICcgdG8gZGVjcmVhc2UnXG4gICAgICAsICdleHBlY3RlZCAuJyArIHByb3AgKyAnIHRvIG5vdCBkZWNyZWFzZSdcbiAgICApO1xuICB9XG5cbiAgQXNzZXJ0aW9uLmFkZENoYWluYWJsZU1ldGhvZCgnZGVjcmVhc2UnLCBhc3NlcnREZWNyZWFzZXMpO1xuICBBc3NlcnRpb24uYWRkQ2hhaW5hYmxlTWV0aG9kKCdkZWNyZWFzZXMnLCBhc3NlcnREZWNyZWFzZXMpO1xuXG59O1xuIiwiLyohXG4gKiBjaGFpXG4gKiBDb3B5cmlnaHQoYykgMjAxMS0yMDE0IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjaGFpLCB1dGlsKSB7XG5cbiAgLyohXG4gICAqIENoYWkgZGVwZW5kZW5jaWVzLlxuICAgKi9cblxuICB2YXIgQXNzZXJ0aW9uID0gY2hhaS5Bc3NlcnRpb25cbiAgICAsIGZsYWcgPSB1dGlsLmZsYWc7XG5cbiAgLyohXG4gICAqIE1vZHVsZSBleHBvcnQuXG4gICAqL1xuXG4gIC8qKlxuICAgKiAjIyMgYXNzZXJ0KGV4cHJlc3Npb24sIG1lc3NhZ2UpXG4gICAqXG4gICAqIFdyaXRlIHlvdXIgb3duIHRlc3QgZXhwcmVzc2lvbnMuXG4gICAqXG4gICAqICAgICBhc3NlcnQoJ2ZvbycgIT09ICdiYXInLCAnZm9vIGlzIG5vdCBiYXInKTtcbiAgICogICAgIGFzc2VydChBcnJheS5pc0FycmF5KFtdKSwgJ2VtcHR5IGFycmF5cyBhcmUgYXJyYXlzJyk7XG4gICAqXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGV4cHJlc3Npb24gdG8gdGVzdCBmb3IgdHJ1dGhpbmVzc1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSB0byBkaXNwbGF5IG9uIGVycm9yXG4gICAqIEBuYW1lIGFzc2VydFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICB2YXIgYXNzZXJ0ID0gY2hhaS5hc3NlcnQgPSBmdW5jdGlvbiAoZXhwcmVzcywgZXJybXNnKSB7XG4gICAgdmFyIHRlc3QgPSBuZXcgQXNzZXJ0aW9uKG51bGwsIG51bGwsIGNoYWkuYXNzZXJ0KTtcbiAgICB0ZXN0LmFzc2VydChcbiAgICAgICAgZXhwcmVzc1xuICAgICAgLCBlcnJtc2dcbiAgICAgICwgJ1sgbmVnYXRpb24gbWVzc2FnZSB1bmF2YWlsYWJsZSBdJ1xuICAgICk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBbbWVzc2FnZV0sIFtvcGVyYXRvcl0pXG4gICAqXG4gICAqIFRocm93IGEgZmFpbHVyZS4gTm9kZS5qcyBgYXNzZXJ0YCBtb2R1bGUtY29tcGF0aWJsZS5cbiAgICpcbiAgICogQG5hbWUgZmFpbFxuICAgKiBAcGFyYW0ge01peGVkfSBhY3R1YWxcbiAgICogQHBhcmFtIHtNaXhlZH0gZXhwZWN0ZWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wZXJhdG9yXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5mYWlsID0gZnVuY3Rpb24gKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG9wZXJhdG9yKSB7XG4gICAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgJ2Fzc2VydC5mYWlsKCknO1xuICAgIHRocm93IG5ldyBjaGFpLkFzc2VydGlvbkVycm9yKG1lc3NhZ2UsIHtcbiAgICAgICAgYWN0dWFsOiBhY3R1YWxcbiAgICAgICwgZXhwZWN0ZWQ6IGV4cGVjdGVkXG4gICAgICAsIG9wZXJhdG9yOiBvcGVyYXRvclxuICAgIH0sIGFzc2VydC5mYWlsKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5vayhvYmplY3QsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGBvYmplY3RgIGlzIHRydXRoeS5cbiAgICpcbiAgICogICAgIGFzc2VydC5vaygnZXZlcnl0aGluZycsICdldmVyeXRoaW5nIGlzIG9rJyk7XG4gICAqICAgICBhc3NlcnQub2soZmFsc2UsICd0aGlzIHdpbGwgZmFpbCcpO1xuICAgKlxuICAgKiBAbmFtZSBva1xuICAgKiBAcGFyYW0ge01peGVkfSBvYmplY3QgdG8gdGVzdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQub2sgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS5pcy5vaztcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5ub3RPayhvYmplY3QsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGBvYmplY3RgIGlzIGZhbHN5LlxuICAgKlxuICAgKiAgICAgYXNzZXJ0Lm5vdE9rKCdldmVyeXRoaW5nJywgJ3RoaXMgd2lsbCBmYWlsJyk7XG4gICAqICAgICBhc3NlcnQubm90T2soZmFsc2UsICd0aGlzIHdpbGwgcGFzcycpO1xuICAgKlxuICAgKiBAbmFtZSBub3RPa1xuICAgKiBAcGFyYW0ge01peGVkfSBvYmplY3QgdG8gdGVzdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQubm90T2sgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS5pcy5ub3Qub2s7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIG5vbi1zdHJpY3QgZXF1YWxpdHkgKGA9PWApIG9mIGBhY3R1YWxgIGFuZCBgZXhwZWN0ZWRgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LmVxdWFsKDMsICczJywgJz09IGNvZXJjZXMgdmFsdWVzIHRvIHN0cmluZ3MnKTtcbiAgICpcbiAgICogQG5hbWUgZXF1YWxcbiAgICogQHBhcmFtIHtNaXhlZH0gYWN0dWFsXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGV4cGVjdGVkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5lcXVhbCA9IGZ1bmN0aW9uIChhY3QsIGV4cCwgbXNnKSB7XG4gICAgdmFyIHRlc3QgPSBuZXcgQXNzZXJ0aW9uKGFjdCwgbXNnLCBhc3NlcnQuZXF1YWwpO1xuXG4gICAgdGVzdC5hc3NlcnQoXG4gICAgICAgIGV4cCA9PSBmbGFnKHRlc3QsICdvYmplY3QnKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBlcXVhbCAje2V4cH0nXG4gICAgICAsICdleHBlY3RlZCAje3RoaXN9IHRvIG5vdCBlcXVhbCAje2FjdH0nXG4gICAgICAsIGV4cFxuICAgICAgLCBhY3RcbiAgICApO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLm5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyBub24tc3RyaWN0IGluZXF1YWxpdHkgKGAhPWApIG9mIGBhY3R1YWxgIGFuZCBgZXhwZWN0ZWRgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0Lm5vdEVxdWFsKDMsIDQsICd0aGVzZSBudW1iZXJzIGFyZSBub3QgZXF1YWwnKTtcbiAgICpcbiAgICogQG5hbWUgbm90RXF1YWxcbiAgICogQHBhcmFtIHtNaXhlZH0gYWN0dWFsXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGV4cGVjdGVkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5ub3RFcXVhbCA9IGZ1bmN0aW9uIChhY3QsIGV4cCwgbXNnKSB7XG4gICAgdmFyIHRlc3QgPSBuZXcgQXNzZXJ0aW9uKGFjdCwgbXNnLCBhc3NlcnQubm90RXF1YWwpO1xuXG4gICAgdGVzdC5hc3NlcnQoXG4gICAgICAgIGV4cCAhPSBmbGFnKHRlc3QsICdvYmplY3QnKVxuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBub3QgZXF1YWwgI3tleHB9J1xuICAgICAgLCAnZXhwZWN0ZWQgI3t0aGlzfSB0byBlcXVhbCAje2FjdH0nXG4gICAgICAsIGV4cFxuICAgICAgLCBhY3RcbiAgICApO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLnN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyBzdHJpY3QgZXF1YWxpdHkgKGA9PT1gKSBvZiBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYC5cbiAgICpcbiAgICogICAgIGFzc2VydC5zdHJpY3RFcXVhbCh0cnVlLCB0cnVlLCAndGhlc2UgYm9vbGVhbnMgYXJlIHN0cmljdGx5IGVxdWFsJyk7XG4gICAqXG4gICAqIEBuYW1lIHN0cmljdEVxdWFsXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGFjdHVhbFxuICAgKiBAcGFyYW0ge01peGVkfSBleHBlY3RlZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuc3RyaWN0RXF1YWwgPSBmdW5jdGlvbiAoYWN0LCBleHAsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24oYWN0LCBtc2cpLnRvLmVxdWFsKGV4cCk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAubm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHN0cmljdCBpbmVxdWFsaXR5IChgIT09YCkgb2YgYGFjdHVhbGAgYW5kIGBleHBlY3RlZGAuXG4gICAqXG4gICAqICAgICBhc3NlcnQubm90U3RyaWN0RXF1YWwoMywgJzMnLCAnbm8gY29lcmNpb24gZm9yIHN0cmljdCBlcXVhbGl0eScpO1xuICAgKlxuICAgKiBAbmFtZSBub3RTdHJpY3RFcXVhbFxuICAgKiBAcGFyYW0ge01peGVkfSBhY3R1YWxcbiAgICogQHBhcmFtIHtNaXhlZH0gZXhwZWN0ZWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsID0gZnVuY3Rpb24gKGFjdCwgZXhwLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKGFjdCwgbXNnKS50by5ub3QuZXF1YWwoZXhwKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYGFjdHVhbGAgaXMgZGVlcGx5IGVxdWFsIHRvIGBleHBlY3RlZGAuXG4gICAqXG4gICAqICAgICBhc3NlcnQuZGVlcEVxdWFsKHsgdGVhOiAnZ3JlZW4nIH0sIHsgdGVhOiAnZ3JlZW4nIH0pO1xuICAgKlxuICAgKiBAbmFtZSBkZWVwRXF1YWxcbiAgICogQHBhcmFtIHtNaXhlZH0gYWN0dWFsXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGV4cGVjdGVkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5kZWVwRXF1YWwgPSBmdW5jdGlvbiAoYWN0LCBleHAsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24oYWN0LCBtc2cpLnRvLmVxbChleHApO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLm5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydCB0aGF0IGBhY3R1YWxgIGlzIG5vdCBkZWVwbHkgZXF1YWwgdG8gYGV4cGVjdGVkYC5cbiAgICpcbiAgICogICAgIGFzc2VydC5ub3REZWVwRXF1YWwoeyB0ZWE6ICdncmVlbicgfSwgeyB0ZWE6ICdqYXNtaW5lJyB9KTtcbiAgICpcbiAgICogQG5hbWUgbm90RGVlcEVxdWFsXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGFjdHVhbFxuICAgKiBAcGFyYW0ge01peGVkfSBleHBlY3RlZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQubm90RGVlcEVxdWFsID0gZnVuY3Rpb24gKGFjdCwgZXhwLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKGFjdCwgbXNnKS50by5ub3QuZXFsKGV4cCk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNUcnVlKHZhbHVlLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgdmFsdWVgIGlzIHRydWUuXG4gICAqXG4gICAqICAgICB2YXIgdGVhU2VydmVkID0gdHJ1ZTtcbiAgICogICAgIGFzc2VydC5pc1RydWUodGVhU2VydmVkLCAndGhlIHRlYSBoYXMgYmVlbiBzZXJ2ZWQnKTtcbiAgICpcbiAgICogQG5hbWUgaXNUcnVlXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5pc0Fib3ZlID0gZnVuY3Rpb24gKHZhbCwgYWJ2LCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5iZS5hYm92ZShhYnYpO1xuICB9O1xuXG4gICAvKipcbiAgICogIyMjIC5pc0Fib3ZlKHZhbHVlVG9DaGVjaywgdmFsdWVUb0JlQWJvdmUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyBgdmFsdWVUb0NoZWNrYCBpcyBzdHJpY3RseSBncmVhdGVyIHRoYW4gKD4pIGB2YWx1ZVRvQmVBYm92ZWBcbiAgICpcbiAgICogICAgIGFzc2VydC5pc0Fib3ZlKDUsIDIsICc1IGlzIHN0cmljdGx5IGdyZWF0ZXIgdGhhbiAyJyk7XG4gICAqXG4gICAqIEBuYW1lIGlzQWJvdmVcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVUb0NoZWNrXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlVG9CZUFib3ZlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5pc0JlbG93ID0gZnVuY3Rpb24gKHZhbCwgYmx3LCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5iZS5iZWxvdyhibHcpO1xuICB9O1xuXG4gICAvKipcbiAgICogIyMjIC5pc0JlbG93KHZhbHVlVG9DaGVjaywgdmFsdWVUb0JlQmVsb3csIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyBgdmFsdWVUb0NoZWNrYCBpcyBzdHJpY3RseSBsZXNzIHRoYW4gKDwpIGB2YWx1ZVRvQmVCZWxvd2BcbiAgICpcbiAgICogICAgIGFzc2VydC5pc0JlbG93KDMsIDYsICczIGlzIHN0cmljdGx5IGxlc3MgdGhhbiA2Jyk7XG4gICAqXG4gICAqIEBuYW1lIGlzQmVsb3dcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVUb0NoZWNrXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlVG9CZUJlbG93XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5pc1RydWUgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS5pc1sndHJ1ZSddO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLmlzRmFsc2UodmFsdWUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgaXMgZmFsc2UuXG4gICAqXG4gICAqICAgICB2YXIgdGVhU2VydmVkID0gZmFsc2U7XG4gICAqICAgICBhc3NlcnQuaXNGYWxzZSh0ZWFTZXJ2ZWQsICdubyB0ZWEgeWV0PyBobW0uLi4nKTtcbiAgICpcbiAgICogQG5hbWUgaXNGYWxzZVxuICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuaXNGYWxzZSA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24odmFsLCBtc2cpLmlzWydmYWxzZSddO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLmlzTnVsbCh2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHZhbHVlYCBpcyBudWxsLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LmlzTnVsbChlcnIsICd0aGVyZSB3YXMgbm8gZXJyb3InKTtcbiAgICpcbiAgICogQG5hbWUgaXNOdWxsXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5pc051bGwgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5lcXVhbChudWxsKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5pc05vdE51bGwodmFsdWUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgaXMgbm90IG51bGwuXG4gICAqXG4gICAqICAgICB2YXIgdGVhID0gJ3Rhc3R5IGNoYWknO1xuICAgKiAgICAgYXNzZXJ0LmlzTm90TnVsbCh0ZWEsICdncmVhdCwgdGltZSBmb3IgdGVhIScpO1xuICAgKlxuICAgKiBAbmFtZSBpc05vdE51bGxcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmlzTm90TnVsbCA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24odmFsLCBtc2cpLnRvLm5vdC5lcXVhbChudWxsKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5pc1VuZGVmaW5lZCh2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHZhbHVlYCBpcyBgdW5kZWZpbmVkYC5cbiAgICpcbiAgICogICAgIHZhciB0ZWE7XG4gICAqICAgICBhc3NlcnQuaXNVbmRlZmluZWQodGVhLCAnbm8gdGVhIGRlZmluZWQnKTtcbiAgICpcbiAgICogQG5hbWUgaXNVbmRlZmluZWRcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmlzVW5kZWZpbmVkID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbih2YWwsIG1zZykudG8uZXF1YWwodW5kZWZpbmVkKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5pc0RlZmluZWQodmFsdWUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgaXMgbm90IGB1bmRlZmluZWRgLlxuICAgKlxuICAgKiAgICAgdmFyIHRlYSA9ICdjdXAgb2YgY2hhaSc7XG4gICAqICAgICBhc3NlcnQuaXNEZWZpbmVkKHRlYSwgJ3RlYSBoYXMgYmVlbiBkZWZpbmVkJyk7XG4gICAqXG4gICAqIEBuYW1lIGlzRGVmaW5lZFxuICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuaXNEZWZpbmVkID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbih2YWwsIG1zZykudG8ubm90LmVxdWFsKHVuZGVmaW5lZCk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNGdW5jdGlvbih2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHZhbHVlYCBpcyBhIGZ1bmN0aW9uLlxuICAgKlxuICAgKiAgICAgZnVuY3Rpb24gc2VydmVUZWEoKSB7IHJldHVybiAnY3VwIG9mIHRlYSc7IH07XG4gICAqICAgICBhc3NlcnQuaXNGdW5jdGlvbihzZXJ2ZVRlYSwgJ2dyZWF0LCB3ZSBjYW4gaGF2ZSB0ZWEgbm93Jyk7XG4gICAqXG4gICAqIEBuYW1lIGlzRnVuY3Rpb25cbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmlzRnVuY3Rpb24gPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5iZS5hKCdmdW5jdGlvbicpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLmlzTm90RnVuY3Rpb24odmFsdWUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgaXMgX25vdF8gYSBmdW5jdGlvbi5cbiAgICpcbiAgICogICAgIHZhciBzZXJ2ZVRlYSA9IFsgJ2hlYXQnLCAncG91cicsICdzaXAnIF07XG4gICAqICAgICBhc3NlcnQuaXNOb3RGdW5jdGlvbihzZXJ2ZVRlYSwgJ2dyZWF0LCB3ZSBoYXZlIGxpc3RlZCB0aGUgc3RlcHMnKTtcbiAgICpcbiAgICogQG5hbWUgaXNOb3RGdW5jdGlvblxuICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuaXNOb3RGdW5jdGlvbiA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24odmFsLCBtc2cpLnRvLm5vdC5iZS5hKCdmdW5jdGlvbicpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLmlzT2JqZWN0KHZhbHVlLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgdmFsdWVgIGlzIGFuIG9iamVjdCAoYXMgcmV2ZWFsZWQgYnlcbiAgICogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdgKS5cbiAgICpcbiAgICogICAgIHZhciBzZWxlY3Rpb24gPSB7IG5hbWU6ICdDaGFpJywgc2VydmU6ICd3aXRoIHNwaWNlcycgfTtcbiAgICogICAgIGFzc2VydC5pc09iamVjdChzZWxlY3Rpb24sICd0ZWEgc2VsZWN0aW9uIGlzIGFuIG9iamVjdCcpO1xuICAgKlxuICAgKiBAbmFtZSBpc09iamVjdFxuICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuaXNPYmplY3QgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5iZS5hKCdvYmplY3QnKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5pc05vdE9iamVjdCh2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHZhbHVlYCBpcyBfbm90XyBhbiBvYmplY3QuXG4gICAqXG4gICAqICAgICB2YXIgc2VsZWN0aW9uID0gJ2NoYWknXG4gICAqICAgICBhc3NlcnQuaXNOb3RPYmplY3Qoc2VsZWN0aW9uLCAndGVhIHNlbGVjdGlvbiBpcyBub3QgYW4gb2JqZWN0Jyk7XG4gICAqICAgICBhc3NlcnQuaXNOb3RPYmplY3QobnVsbCwgJ251bGwgaXMgbm90IGFuIG9iamVjdCcpO1xuICAgKlxuICAgKiBAbmFtZSBpc05vdE9iamVjdFxuICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuaXNOb3RPYmplY3QgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5ub3QuYmUuYSgnb2JqZWN0Jyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNBcnJheSh2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHZhbHVlYCBpcyBhbiBhcnJheS5cbiAgICpcbiAgICogICAgIHZhciBtZW51ID0gWyAnZ3JlZW4nLCAnY2hhaScsICdvb2xvbmcnIF07XG4gICAqICAgICBhc3NlcnQuaXNBcnJheShtZW51LCAnd2hhdCBraW5kIG9mIHRlYSBkbyB3ZSB3YW50PycpO1xuICAgKlxuICAgKiBAbmFtZSBpc0FycmF5XG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5pc0FycmF5ID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbih2YWwsIG1zZykudG8uYmUuYW4oJ2FycmF5Jyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNOb3RBcnJheSh2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHZhbHVlYCBpcyBfbm90XyBhbiBhcnJheS5cbiAgICpcbiAgICogICAgIHZhciBtZW51ID0gJ2dyZWVufGNoYWl8b29sb25nJztcbiAgICogICAgIGFzc2VydC5pc05vdEFycmF5KG1lbnUsICd3aGF0IGtpbmQgb2YgdGVhIGRvIHdlIHdhbnQ/Jyk7XG4gICAqXG4gICAqIEBuYW1lIGlzTm90QXJyYXlcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmlzTm90QXJyYXkgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5ub3QuYmUuYW4oJ2FycmF5Jyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNTdHJpbmcodmFsdWUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgaXMgYSBzdHJpbmcuXG4gICAqXG4gICAqICAgICB2YXIgdGVhT3JkZXIgPSAnY2hhaSc7XG4gICAqICAgICBhc3NlcnQuaXNTdHJpbmcodGVhT3JkZXIsICdvcmRlciBwbGFjZWQnKTtcbiAgICpcbiAgICogQG5hbWUgaXNTdHJpbmdcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmlzU3RyaW5nID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbih2YWwsIG1zZykudG8uYmUuYSgnc3RyaW5nJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNOb3RTdHJpbmcodmFsdWUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgaXMgX25vdF8gYSBzdHJpbmcuXG4gICAqXG4gICAqICAgICB2YXIgdGVhT3JkZXIgPSA0O1xuICAgKiAgICAgYXNzZXJ0LmlzTm90U3RyaW5nKHRlYU9yZGVyLCAnb3JkZXIgcGxhY2VkJyk7XG4gICAqXG4gICAqIEBuYW1lIGlzTm90U3RyaW5nXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5pc05vdFN0cmluZyA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24odmFsLCBtc2cpLnRvLm5vdC5iZS5hKCdzdHJpbmcnKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5pc051bWJlcih2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHZhbHVlYCBpcyBhIG51bWJlci5cbiAgICpcbiAgICogICAgIHZhciBjdXBzID0gMjtcbiAgICogICAgIGFzc2VydC5pc051bWJlcihjdXBzLCAnaG93IG1hbnkgY3VwcycpO1xuICAgKlxuICAgKiBAbmFtZSBpc051bWJlclxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmlzTnVtYmVyID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbih2YWwsIG1zZykudG8uYmUuYSgnbnVtYmVyJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNOb3ROdW1iZXIodmFsdWUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgaXMgX25vdF8gYSBudW1iZXIuXG4gICAqXG4gICAqICAgICB2YXIgY3VwcyA9ICcyIGN1cHMgcGxlYXNlJztcbiAgICogICAgIGFzc2VydC5pc05vdE51bWJlcihjdXBzLCAnaG93IG1hbnkgY3VwcycpO1xuICAgKlxuICAgKiBAbmFtZSBpc05vdE51bWJlclxuICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuaXNOb3ROdW1iZXIgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5ub3QuYmUuYSgnbnVtYmVyJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNCb29sZWFuKHZhbHVlLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgdmFsdWVgIGlzIGEgYm9vbGVhbi5cbiAgICpcbiAgICogICAgIHZhciB0ZWFSZWFkeSA9IHRydWVcbiAgICogICAgICAgLCB0ZWFTZXJ2ZWQgPSBmYWxzZTtcbiAgICpcbiAgICogICAgIGFzc2VydC5pc0Jvb2xlYW4odGVhUmVhZHksICdpcyB0aGUgdGVhIHJlYWR5Jyk7XG4gICAqICAgICBhc3NlcnQuaXNCb29sZWFuKHRlYVNlcnZlZCwgJ2hhcyB0ZWEgYmVlbiBzZXJ2ZWQnKTtcbiAgICpcbiAgICogQG5hbWUgaXNCb29sZWFuXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5pc0Jvb2xlYW4gPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5iZS5hKCdib29sZWFuJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuaXNOb3RCb29sZWFuKHZhbHVlLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgdmFsdWVgIGlzIF9ub3RfIGEgYm9vbGVhbi5cbiAgICpcbiAgICogICAgIHZhciB0ZWFSZWFkeSA9ICd5ZXAnXG4gICAqICAgICAgICwgdGVhU2VydmVkID0gJ25vcGUnO1xuICAgKlxuICAgKiAgICAgYXNzZXJ0LmlzTm90Qm9vbGVhbih0ZWFSZWFkeSwgJ2lzIHRoZSB0ZWEgcmVhZHknKTtcbiAgICogICAgIGFzc2VydC5pc05vdEJvb2xlYW4odGVhU2VydmVkLCAnaGFzIHRlYSBiZWVuIHNlcnZlZCcpO1xuICAgKlxuICAgKiBAbmFtZSBpc05vdEJvb2xlYW5cbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmlzTm90Qm9vbGVhbiA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24odmFsLCBtc2cpLnRvLm5vdC5iZS5hKCdib29sZWFuJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAudHlwZU9mKHZhbHVlLCBuYW1lLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgdmFsdWVgJ3MgdHlwZSBpcyBgbmFtZWAsIGFzIGRldGVybWluZWQgYnlcbiAgICogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LnR5cGVPZih7IHRlYTogJ2NoYWknIH0sICdvYmplY3QnLCAnd2UgaGF2ZSBhbiBvYmplY3QnKTtcbiAgICogICAgIGFzc2VydC50eXBlT2YoWydjaGFpJywgJ2phc21pbmUnXSwgJ2FycmF5JywgJ3dlIGhhdmUgYW4gYXJyYXknKTtcbiAgICogICAgIGFzc2VydC50eXBlT2YoJ3RlYScsICdzdHJpbmcnLCAnd2UgaGF2ZSBhIHN0cmluZycpO1xuICAgKiAgICAgYXNzZXJ0LnR5cGVPZigvdGVhLywgJ3JlZ2V4cCcsICd3ZSBoYXZlIGEgcmVndWxhciBleHByZXNzaW9uJyk7XG4gICAqICAgICBhc3NlcnQudHlwZU9mKG51bGwsICdudWxsJywgJ3dlIGhhdmUgYSBudWxsJyk7XG4gICAqICAgICBhc3NlcnQudHlwZU9mKHVuZGVmaW5lZCwgJ3VuZGVmaW5lZCcsICd3ZSBoYXZlIGFuIHVuZGVmaW5lZCcpO1xuICAgKlxuICAgKiBAbmFtZSB0eXBlT2ZcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LnR5cGVPZiA9IGZ1bmN0aW9uICh2YWwsIHR5cGUsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24odmFsLCBtc2cpLnRvLmJlLmEodHlwZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAubm90VHlwZU9mKHZhbHVlLCBuYW1lLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgdmFsdWVgJ3MgdHlwZSBpcyBfbm90XyBgbmFtZWAsIGFzIGRldGVybWluZWQgYnlcbiAgICogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0Lm5vdFR5cGVPZigndGVhJywgJ251bWJlcicsICdzdHJpbmdzIGFyZSBub3QgbnVtYmVycycpO1xuICAgKlxuICAgKiBAbmFtZSBub3RUeXBlT2ZcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHR5cGVvZiBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5ub3RUeXBlT2YgPSBmdW5jdGlvbiAodmFsLCB0eXBlLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5ub3QuYmUuYSh0eXBlKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5pbnN0YW5jZU9mKG9iamVjdCwgY29uc3RydWN0b3IsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgaXMgYW4gaW5zdGFuY2Ugb2YgYGNvbnN0cnVjdG9yYC5cbiAgICpcbiAgICogICAgIHZhciBUZWEgPSBmdW5jdGlvbiAobmFtZSkgeyB0aGlzLm5hbWUgPSBuYW1lOyB9XG4gICAqICAgICAgICwgY2hhaSA9IG5ldyBUZWEoJ2NoYWknKTtcbiAgICpcbiAgICogICAgIGFzc2VydC5pbnN0YW5jZU9mKGNoYWksIFRlYSwgJ2NoYWkgaXMgYW4gaW5zdGFuY2Ugb2YgdGVhJyk7XG4gICAqXG4gICAqIEBuYW1lIGluc3RhbmNlT2ZcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0ge0NvbnN0cnVjdG9yfSBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuaW5zdGFuY2VPZiA9IGZ1bmN0aW9uICh2YWwsIHR5cGUsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24odmFsLCBtc2cpLnRvLmJlLmluc3RhbmNlT2YodHlwZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAubm90SW5zdGFuY2VPZihvYmplY3QsIGNvbnN0cnVjdG9yLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgYHZhbHVlYCBpcyBub3QgYW4gaW5zdGFuY2Ugb2YgYGNvbnN0cnVjdG9yYC5cbiAgICpcbiAgICogICAgIHZhciBUZWEgPSBmdW5jdGlvbiAobmFtZSkgeyB0aGlzLm5hbWUgPSBuYW1lOyB9XG4gICAqICAgICAgICwgY2hhaSA9IG5ldyBTdHJpbmcoJ2NoYWknKTtcbiAgICpcbiAgICogICAgIGFzc2VydC5ub3RJbnN0YW5jZU9mKGNoYWksIFRlYSwgJ2NoYWkgaXMgbm90IGFuIGluc3RhbmNlIG9mIHRlYScpO1xuICAgKlxuICAgKiBAbmFtZSBub3RJbnN0YW5jZU9mXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RcbiAgICogQHBhcmFtIHtDb25zdHJ1Y3Rvcn0gY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0Lm5vdEluc3RhbmNlT2YgPSBmdW5jdGlvbiAodmFsLCB0eXBlLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5ub3QuYmUuaW5zdGFuY2VPZih0eXBlKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5pbmNsdWRlKGhheXN0YWNrLCBuZWVkbGUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGBoYXlzdGFja2AgaW5jbHVkZXMgYG5lZWRsZWAuIFdvcmtzXG4gICAqIGZvciBzdHJpbmdzIGFuZCBhcnJheXMuXG4gICAqXG4gICAqICAgICBhc3NlcnQuaW5jbHVkZSgnZm9vYmFyJywgJ2JhcicsICdmb29iYXIgY29udGFpbnMgc3RyaW5nIFwiYmFyXCInKTtcbiAgICogICAgIGFzc2VydC5pbmNsdWRlKFsgMSwgMiwgMyBdLCAzLCAnYXJyYXkgY29udGFpbnMgdmFsdWUnKTtcbiAgICpcbiAgICogQG5hbWUgaW5jbHVkZVxuICAgKiBAcGFyYW0ge0FycmF5fFN0cmluZ30gaGF5c3RhY2tcbiAgICogQHBhcmFtIHtNaXhlZH0gbmVlZGxlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5pbmNsdWRlID0gZnVuY3Rpb24gKGV4cCwgaW5jLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKGV4cCwgbXNnLCBhc3NlcnQuaW5jbHVkZSkuaW5jbHVkZShpbmMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLm5vdEluY2x1ZGUoaGF5c3RhY2ssIG5lZWRsZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYGhheXN0YWNrYCBkb2VzIG5vdCBpbmNsdWRlIGBuZWVkbGVgLiBXb3Jrc1xuICAgKiBmb3Igc3RyaW5ncyBhbmQgYXJyYXlzLlxuICAgKmlcbiAgICogICAgIGFzc2VydC5ub3RJbmNsdWRlKCdmb29iYXInLCAnYmF6JywgJ3N0cmluZyBub3QgaW5jbHVkZSBzdWJzdHJpbmcnKTtcbiAgICogICAgIGFzc2VydC5ub3RJbmNsdWRlKFsgMSwgMiwgMyBdLCA0LCAnYXJyYXkgbm90IGluY2x1ZGUgY29udGFpbiB2YWx1ZScpO1xuICAgKlxuICAgKiBAbmFtZSBub3RJbmNsdWRlXG4gICAqIEBwYXJhbSB7QXJyYXl8U3RyaW5nfSBoYXlzdGFja1xuICAgKiBAcGFyYW0ge01peGVkfSBuZWVkbGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0Lm5vdEluY2x1ZGUgPSBmdW5jdGlvbiAoZXhwLCBpbmMsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24oZXhwLCBtc2csIGFzc2VydC5ub3RJbmNsdWRlKS5ub3QuaW5jbHVkZShpbmMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLm1hdGNoKHZhbHVlLCByZWdleHAsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGB2YWx1ZWAgbWF0Y2hlcyB0aGUgcmVndWxhciBleHByZXNzaW9uIGByZWdleHBgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0Lm1hdGNoKCdmb29iYXInLCAvXmZvby8sICdyZWdleHAgbWF0Y2hlcycpO1xuICAgKlxuICAgKiBAbmFtZSBtYXRjaFxuICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZVxuICAgKiBAcGFyYW0ge1JlZ0V4cH0gcmVnZXhwXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5tYXRjaCA9IGZ1bmN0aW9uIChleHAsIHJlLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKGV4cCwgbXNnKS50by5tYXRjaChyZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAubm90TWF0Y2godmFsdWUsIHJlZ2V4cCwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHZhbHVlYCBkb2VzIG5vdCBtYXRjaCB0aGUgcmVndWxhciBleHByZXNzaW9uIGByZWdleHBgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0Lm5vdE1hdGNoKCdmb29iYXInLCAvXmZvby8sICdyZWdleHAgZG9lcyBub3QgbWF0Y2gnKTtcbiAgICpcbiAgICogQG5hbWUgbm90TWF0Y2hcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtSZWdFeHB9IHJlZ2V4cFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQubm90TWF0Y2ggPSBmdW5jdGlvbiAoZXhwLCByZSwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbihleHAsIG1zZykudG8ubm90Lm1hdGNoKHJlKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5wcm9wZXJ0eShvYmplY3QsIHByb3BlcnR5LCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgb2JqZWN0YCBoYXMgYSBwcm9wZXJ0eSBuYW1lZCBieSBgcHJvcGVydHlgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LnByb3BlcnR5KHsgdGVhOiB7IGdyZWVuOiAnbWF0Y2hhJyB9fSwgJ3RlYScpO1xuICAgKlxuICAgKiBAbmFtZSBwcm9wZXJ0eVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQucHJvcGVydHkgPSBmdW5jdGlvbiAob2JqLCBwcm9wLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKG9iaiwgbXNnKS50by5oYXZlLnByb3BlcnR5KHByb3ApO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLm5vdFByb3BlcnR5KG9iamVjdCwgcHJvcGVydHksIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGBvYmplY3RgIGRvZXMgX25vdF8gaGF2ZSBhIHByb3BlcnR5IG5hbWVkIGJ5IGBwcm9wZXJ0eWAuXG4gICAqXG4gICAqICAgICBhc3NlcnQubm90UHJvcGVydHkoeyB0ZWE6IHsgZ3JlZW46ICdtYXRjaGEnIH19LCAnY29mZmVlJyk7XG4gICAqXG4gICAqIEBuYW1lIG5vdFByb3BlcnR5XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5ub3RQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvYmosIHByb3AsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24ob2JqLCBtc2cpLnRvLm5vdC5oYXZlLnByb3BlcnR5KHByb3ApO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLmRlZXBQcm9wZXJ0eShvYmplY3QsIHByb3BlcnR5LCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgb2JqZWN0YCBoYXMgYSBwcm9wZXJ0eSBuYW1lZCBieSBgcHJvcGVydHlgLCB3aGljaCBjYW4gYmUgYVxuICAgKiBzdHJpbmcgdXNpbmcgZG90LSBhbmQgYnJhY2tldC1ub3RhdGlvbiBmb3IgZGVlcCByZWZlcmVuY2UuXG4gICAqXG4gICAqICAgICBhc3NlcnQuZGVlcFByb3BlcnR5KHsgdGVhOiB7IGdyZWVuOiAnbWF0Y2hhJyB9fSwgJ3RlYS5ncmVlbicpO1xuICAgKlxuICAgKiBAbmFtZSBkZWVwUHJvcGVydHlcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmRlZXBQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvYmosIHByb3AsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24ob2JqLCBtc2cpLnRvLmhhdmUuZGVlcC5wcm9wZXJ0eShwcm9wKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5ub3REZWVwUHJvcGVydHkob2JqZWN0LCBwcm9wZXJ0eSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYG9iamVjdGAgZG9lcyBfbm90XyBoYXZlIGEgcHJvcGVydHkgbmFtZWQgYnkgYHByb3BlcnR5YCwgd2hpY2hcbiAgICogY2FuIGJlIGEgc3RyaW5nIHVzaW5nIGRvdC0gYW5kIGJyYWNrZXQtbm90YXRpb24gZm9yIGRlZXAgcmVmZXJlbmNlLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0Lm5vdERlZXBQcm9wZXJ0eSh7IHRlYTogeyBncmVlbjogJ21hdGNoYScgfX0sICd0ZWEub29sb25nJyk7XG4gICAqXG4gICAqIEBuYW1lIG5vdERlZXBQcm9wZXJ0eVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQubm90RGVlcFByb3BlcnR5ID0gZnVuY3Rpb24gKG9iaiwgcHJvcCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbihvYmosIG1zZykudG8ubm90LmhhdmUuZGVlcC5wcm9wZXJ0eShwcm9wKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5wcm9wZXJ0eVZhbChvYmplY3QsIHByb3BlcnR5LCB2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYG9iamVjdGAgaGFzIGEgcHJvcGVydHkgbmFtZWQgYnkgYHByb3BlcnR5YCB3aXRoIHZhbHVlIGdpdmVuXG4gICAqIGJ5IGB2YWx1ZWAuXG4gICAqXG4gICAqICAgICBhc3NlcnQucHJvcGVydHlWYWwoeyB0ZWE6ICdpcyBnb29kJyB9LCAndGVhJywgJ2lzIGdvb2QnKTtcbiAgICpcbiAgICogQG5hbWUgcHJvcGVydHlWYWxcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LnByb3BlcnR5VmFsID0gZnVuY3Rpb24gKG9iaiwgcHJvcCwgdmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKG9iaiwgbXNnKS50by5oYXZlLnByb3BlcnR5KHByb3AsIHZhbCk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAucHJvcGVydHlOb3RWYWwob2JqZWN0LCBwcm9wZXJ0eSwgdmFsdWUsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGBvYmplY3RgIGhhcyBhIHByb3BlcnR5IG5hbWVkIGJ5IGBwcm9wZXJ0eWAsIGJ1dCB3aXRoIGEgdmFsdWVcbiAgICogZGlmZmVyZW50IGZyb20gdGhhdCBnaXZlbiBieSBgdmFsdWVgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LnByb3BlcnR5Tm90VmFsKHsgdGVhOiAnaXMgZ29vZCcgfSwgJ3RlYScsICdpcyBiYWQnKTtcbiAgICpcbiAgICogQG5hbWUgcHJvcGVydHlOb3RWYWxcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LnByb3BlcnR5Tm90VmFsID0gZnVuY3Rpb24gKG9iaiwgcHJvcCwgdmFsLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKG9iaiwgbXNnKS50by5ub3QuaGF2ZS5wcm9wZXJ0eShwcm9wLCB2YWwpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLmRlZXBQcm9wZXJ0eVZhbChvYmplY3QsIHByb3BlcnR5LCB2YWx1ZSwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYG9iamVjdGAgaGFzIGEgcHJvcGVydHkgbmFtZWQgYnkgYHByb3BlcnR5YCB3aXRoIHZhbHVlIGdpdmVuXG4gICAqIGJ5IGB2YWx1ZWAuIGBwcm9wZXJ0eWAgY2FuIHVzZSBkb3QtIGFuZCBicmFja2V0LW5vdGF0aW9uIGZvciBkZWVwXG4gICAqIHJlZmVyZW5jZS5cbiAgICpcbiAgICogICAgIGFzc2VydC5kZWVwUHJvcGVydHlWYWwoeyB0ZWE6IHsgZ3JlZW46ICdtYXRjaGEnIH19LCAndGVhLmdyZWVuJywgJ21hdGNoYScpO1xuICAgKlxuICAgKiBAbmFtZSBkZWVwUHJvcGVydHlWYWxcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmRlZXBQcm9wZXJ0eVZhbCA9IGZ1bmN0aW9uIChvYmosIHByb3AsIHZhbCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbihvYmosIG1zZykudG8uaGF2ZS5kZWVwLnByb3BlcnR5KHByb3AsIHZhbCk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuZGVlcFByb3BlcnR5Tm90VmFsKG9iamVjdCwgcHJvcGVydHksIHZhbHVlLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgb2JqZWN0YCBoYXMgYSBwcm9wZXJ0eSBuYW1lZCBieSBgcHJvcGVydHlgLCBidXQgd2l0aCBhIHZhbHVlXG4gICAqIGRpZmZlcmVudCBmcm9tIHRoYXQgZ2l2ZW4gYnkgYHZhbHVlYC4gYHByb3BlcnR5YCBjYW4gdXNlIGRvdC0gYW5kXG4gICAqIGJyYWNrZXQtbm90YXRpb24gZm9yIGRlZXAgcmVmZXJlbmNlLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LmRlZXBQcm9wZXJ0eU5vdFZhbCh7IHRlYTogeyBncmVlbjogJ21hdGNoYScgfX0sICd0ZWEuZ3JlZW4nLCAna29uYWNoYScpO1xuICAgKlxuICAgKiBAbmFtZSBkZWVwUHJvcGVydHlOb3RWYWxcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmRlZXBQcm9wZXJ0eU5vdFZhbCA9IGZ1bmN0aW9uIChvYmosIHByb3AsIHZhbCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbihvYmosIG1zZykudG8ubm90LmhhdmUuZGVlcC5wcm9wZXJ0eShwcm9wLCB2YWwpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAjIyMgLmxlbmd0aE9mKG9iamVjdCwgbGVuZ3RoLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgb2JqZWN0YCBoYXMgYSBgbGVuZ3RoYCBwcm9wZXJ0eSB3aXRoIHRoZSBleHBlY3RlZCB2YWx1ZS5cbiAgICpcbiAgICogICAgIGFzc2VydC5sZW5ndGhPZihbMSwyLDNdLCAzLCAnYXJyYXkgaGFzIGxlbmd0aCBvZiAzJyk7XG4gICAqICAgICBhc3NlcnQubGVuZ3RoT2YoJ2Zvb2JhcicsIDUsICdzdHJpbmcgaGFzIGxlbmd0aCBvZiA2Jyk7XG4gICAqXG4gICAqIEBuYW1lIGxlbmd0aE9mXG4gICAqIEBwYXJhbSB7TWl4ZWR9IG9iamVjdFxuICAgKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5sZW5ndGhPZiA9IGZ1bmN0aW9uIChleHAsIGxlbiwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbihleHAsIG1zZykudG8uaGF2ZS5sZW5ndGgobGVuKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC50aHJvd3MoZnVuY3Rpb24sIFtjb25zdHJ1Y3Rvci9zdHJpbmcvcmVnZXhwXSwgW3N0cmluZy9yZWdleHBdLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgZnVuY3Rpb25gIHdpbGwgdGhyb3cgYW4gZXJyb3IgdGhhdCBpcyBhbiBpbnN0YW5jZSBvZlxuICAgKiBgY29uc3RydWN0b3JgLCBvciBhbHRlcm5hdGVseSB0aGF0IGl0IHdpbGwgdGhyb3cgYW4gZXJyb3Igd2l0aCBtZXNzYWdlXG4gICAqIG1hdGNoaW5nIGByZWdleHBgLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LnRocm93KGZuLCAnZnVuY3Rpb24gdGhyb3dzIGEgcmVmZXJlbmNlIGVycm9yJyk7XG4gICAqICAgICBhc3NlcnQudGhyb3coZm4sIC9mdW5jdGlvbiB0aHJvd3MgYSByZWZlcmVuY2UgZXJyb3IvKTtcbiAgICogICAgIGFzc2VydC50aHJvdyhmbiwgUmVmZXJlbmNlRXJyb3IpO1xuICAgKiAgICAgYXNzZXJ0LnRocm93KGZuLCBSZWZlcmVuY2VFcnJvciwgJ2Z1bmN0aW9uIHRocm93cyBhIHJlZmVyZW5jZSBlcnJvcicpO1xuICAgKiAgICAgYXNzZXJ0LnRocm93KGZuLCBSZWZlcmVuY2VFcnJvciwgL2Z1bmN0aW9uIHRocm93cyBhIHJlZmVyZW5jZSBlcnJvci8pO1xuICAgKlxuICAgKiBAbmFtZSB0aHJvd3NcbiAgICogQGFsaWFzIHRocm93XG4gICAqIEBhbGlhcyBUaHJvd1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jdGlvblxuICAgKiBAcGFyYW0ge0Vycm9yQ29uc3RydWN0b3J9IGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7UmVnRXhwfSByZWdleHBcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvciNFcnJvcl90eXBlc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuVGhyb3cgPSBmdW5jdGlvbiAoZm4sIGVycnQsIGVycnMsIG1zZykge1xuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIGVycnQgfHwgZXJydCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgZXJycyA9IGVycnQ7XG4gICAgICBlcnJ0ID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgYXNzZXJ0RXJyID0gbmV3IEFzc2VydGlvbihmbiwgbXNnKS50by5UaHJvdyhlcnJ0LCBlcnJzKTtcbiAgICByZXR1cm4gZmxhZyhhc3NlcnRFcnIsICdvYmplY3QnKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5kb2VzTm90VGhyb3coZnVuY3Rpb24sIFtjb25zdHJ1Y3Rvci9yZWdleHBdLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgZnVuY3Rpb25gIHdpbGwgX25vdF8gdGhyb3cgYW4gZXJyb3IgdGhhdCBpcyBhbiBpbnN0YW5jZSBvZlxuICAgKiBgY29uc3RydWN0b3JgLCBvciBhbHRlcm5hdGVseSB0aGF0IGl0IHdpbGwgbm90IHRocm93IGFuIGVycm9yIHdpdGggbWVzc2FnZVxuICAgKiBtYXRjaGluZyBgcmVnZXhwYC5cbiAgICpcbiAgICogICAgIGFzc2VydC5kb2VzTm90VGhyb3coZm4sIEVycm9yLCAnZnVuY3Rpb24gZG9lcyBub3QgdGhyb3cnKTtcbiAgICpcbiAgICogQG5hbWUgZG9lc05vdFRocm93XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RXJyb3JDb25zdHJ1Y3Rvcn0gY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtSZWdFeHB9IHJlZ2V4cFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0Vycm9yI0Vycm9yX3R5cGVzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5kb2VzTm90VGhyb3cgPSBmdW5jdGlvbiAoZm4sIHR5cGUsIG1zZykge1xuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHR5cGUpIHtcbiAgICAgIG1zZyA9IHR5cGU7XG4gICAgICB0eXBlID0gbnVsbDtcbiAgICB9XG5cbiAgICBuZXcgQXNzZXJ0aW9uKGZuLCBtc2cpLnRvLm5vdC5UaHJvdyh0eXBlKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5vcGVyYXRvcih2YWwxLCBvcGVyYXRvciwgdmFsMiwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBDb21wYXJlcyB0d28gdmFsdWVzIHVzaW5nIGBvcGVyYXRvcmAuXG4gICAqXG4gICAqICAgICBhc3NlcnQub3BlcmF0b3IoMSwgJzwnLCAyLCAnZXZlcnl0aGluZyBpcyBvaycpO1xuICAgKiAgICAgYXNzZXJ0Lm9wZXJhdG9yKDEsICc+JywgMiwgJ3RoaXMgd2lsbCBmYWlsJyk7XG4gICAqXG4gICAqIEBuYW1lIG9wZXJhdG9yXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbDFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wZXJhdG9yXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbDJcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0Lm9wZXJhdG9yID0gZnVuY3Rpb24gKHZhbCwgb3BlcmF0b3IsIHZhbDIsIG1zZykge1xuICAgIHZhciBvaztcbiAgICBzd2l0Y2gob3BlcmF0b3IpIHtcbiAgICAgIGNhc2UgJz09JzpcbiAgICAgICAgb2sgPSB2YWwgPT0gdmFsMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICc9PT0nOlxuICAgICAgICBvayA9IHZhbCA9PT0gdmFsMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICc+JzpcbiAgICAgICAgb2sgPSB2YWwgPiB2YWwyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJz49JzpcbiAgICAgICAgb2sgPSB2YWwgPj0gdmFsMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICc8JzpcbiAgICAgICAgb2sgPSB2YWwgPCB2YWwyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJzw9JzpcbiAgICAgICAgb2sgPSB2YWwgPD0gdmFsMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICchPSc6XG4gICAgICAgIG9rID0gdmFsICE9IHZhbDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnIT09JzpcbiAgICAgICAgb2sgPSB2YWwgIT09IHZhbDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG9wZXJhdG9yIFwiJyArIG9wZXJhdG9yICsgJ1wiJyk7XG4gICAgfVxuICAgIHZhciB0ZXN0ID0gbmV3IEFzc2VydGlvbihvaywgbXNnKTtcbiAgICB0ZXN0LmFzc2VydChcbiAgICAgICAgdHJ1ZSA9PT0gZmxhZyh0ZXN0LCAnb2JqZWN0JylcbiAgICAgICwgJ2V4cGVjdGVkICcgKyB1dGlsLmluc3BlY3QodmFsKSArICcgdG8gYmUgJyArIG9wZXJhdG9yICsgJyAnICsgdXRpbC5pbnNwZWN0KHZhbDIpXG4gICAgICAsICdleHBlY3RlZCAnICsgdXRpbC5pbnNwZWN0KHZhbCkgKyAnIHRvIG5vdCBiZSAnICsgb3BlcmF0b3IgKyAnICcgKyB1dGlsLmluc3BlY3QodmFsMikgKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5jbG9zZVRvKGFjdHVhbCwgZXhwZWN0ZWQsIGRlbHRhLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCB0aGUgdGFyZ2V0IGlzIGVxdWFsIGBleHBlY3RlZGAsIHRvIHdpdGhpbiBhICsvLSBgZGVsdGFgIHJhbmdlLlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LmNsb3NlVG8oMS41LCAxLCAwLjUsICdudW1iZXJzIGFyZSBjbG9zZScpO1xuICAgKlxuICAgKiBAbmFtZSBjbG9zZVRvXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBhY3R1YWxcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGV4cGVjdGVkXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWx0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuY2xvc2VUbyA9IGZ1bmN0aW9uIChhY3QsIGV4cCwgZGVsdGEsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24oYWN0LCBtc2cpLnRvLmJlLmNsb3NlVG8oZXhwLCBkZWx0YSk7XG4gIH07XG5cbiAgLyoqXG4gICAqICMjIyAuc2FtZU1lbWJlcnMoc2V0MSwgc2V0MiwgW21lc3NhZ2VdKVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYHNldDFgIGFuZCBgc2V0MmAgaGF2ZSB0aGUgc2FtZSBtZW1iZXJzLlxuICAgKiBPcmRlciBpcyBub3QgdGFrZW4gaW50byBhY2NvdW50LlxuICAgKlxuICAgKiAgICAgYXNzZXJ0LnNhbWVNZW1iZXJzKFsgMSwgMiwgMyBdLCBbIDIsIDEsIDMgXSwgJ3NhbWUgbWVtYmVycycpO1xuICAgKlxuICAgKiBAbmFtZSBzYW1lTWVtYmVyc1xuICAgKiBAcGFyYW0ge0FycmF5fSBzZXQxXG4gICAqIEBwYXJhbSB7QXJyYXl9IHNldDJcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LnNhbWVNZW1iZXJzID0gZnVuY3Rpb24gKHNldDEsIHNldDIsIG1zZykge1xuICAgIG5ldyBBc3NlcnRpb24oc2V0MSwgbXNnKS50by5oYXZlLnNhbWUubWVtYmVycyhzZXQyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAjIyMgLnNhbWVEZWVwTWVtYmVycyhzZXQxLCBzZXQyLCBbbWVzc2FnZV0pXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBgc2V0MWAgYW5kIGBzZXQyYCBoYXZlIHRoZSBzYW1lIG1lbWJlcnMgLSB1c2luZyBhIGRlZXAgZXF1YWxpdHkgY2hlY2tpbmcuXG4gICAqIE9yZGVyIGlzIG5vdCB0YWtlbiBpbnRvIGFjY291bnQuXG4gICAqXG4gICAqICAgICBhc3NlcnQuc2FtZURlZXBNZW1iZXJzKFsge2I6IDN9LCB7YTogMn0sIHtjOiA1fSBdLCBbIHtjOiA1fSwge2I6IDN9LCB7YTogMn0gXSwgJ3NhbWUgZGVlcCBtZW1iZXJzJyk7XG4gICAqXG4gICAqIEBuYW1lIHNhbWVEZWVwTWVtYmVyc1xuICAgKiBAcGFyYW0ge0FycmF5fSBzZXQxXG4gICAqIEBwYXJhbSB7QXJyYXl9IHNldDJcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LnNhbWVEZWVwTWVtYmVycyA9IGZ1bmN0aW9uIChzZXQxLCBzZXQyLCBtc2cpIHtcbiAgICBuZXcgQXNzZXJ0aW9uKHNldDEsIG1zZykudG8uaGF2ZS5zYW1lLmRlZXAubWVtYmVycyhzZXQyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAjIyMgLmluY2x1ZGVNZW1iZXJzKHN1cGVyc2V0LCBzdWJzZXQsIFttZXNzYWdlXSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGBzdWJzZXRgIGlzIGluY2x1ZGVkIGluIGBzdXBlcnNldGAuXG4gICAqIE9yZGVyIGlzIG5vdCB0YWtlbiBpbnRvIGFjY291bnQuXG4gICAqXG4gICAqICAgICBhc3NlcnQuaW5jbHVkZU1lbWJlcnMoWyAxLCAyLCAzIF0sIFsgMiwgMSBdLCAnaW5jbHVkZSBtZW1iZXJzJyk7XG4gICAqXG4gICAqIEBuYW1lIGluY2x1ZGVNZW1iZXJzXG4gICAqIEBwYXJhbSB7QXJyYXl9IHN1cGVyc2V0XG4gICAqIEBwYXJhbSB7QXJyYXl9IHN1YnNldFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuaW5jbHVkZU1lbWJlcnMgPSBmdW5jdGlvbiAoc3VwZXJzZXQsIHN1YnNldCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbihzdXBlcnNldCwgbXNnKS50by5pbmNsdWRlLm1lbWJlcnMoc3Vic2V0KTtcbiAgfVxuXG4gICAvKipcbiAgICogIyMjIC5jaGFuZ2VzKGZ1bmN0aW9uLCBvYmplY3QsIHByb3BlcnR5KVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYSBmdW5jdGlvbiBjaGFuZ2VzIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5XG4gICAqXG4gICAqICAgICB2YXIgb2JqID0geyB2YWw6IDEwIH07XG4gICAqICAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHsgb2JqLnZhbCA9IDIyIH07XG4gICAqICAgICBhc3NlcnQuY2hhbmdlcyhmbiwgb2JqLCAndmFsJyk7XG4gICAqXG4gICAqIEBuYW1lIGNoYW5nZXNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbW9kaWZpZXIgZnVuY3Rpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHkgbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5jaGFuZ2VzID0gZnVuY3Rpb24gKGZuLCBvYmosIHByb3ApIHtcbiAgICBuZXcgQXNzZXJ0aW9uKGZuKS50by5jaGFuZ2Uob2JqLCBwcm9wKTtcbiAgfVxuXG4gICAvKipcbiAgICogIyMjIC5kb2VzTm90Q2hhbmdlKGZ1bmN0aW9uLCBvYmplY3QsIHByb3BlcnR5KVxuICAgKlxuICAgKiBBc3NlcnRzIHRoYXQgYSBmdW5jdGlvbiBkb2VzIG5vdCBjaGFuZ2VzIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5XG4gICAqXG4gICAqICAgICB2YXIgb2JqID0geyB2YWw6IDEwIH07XG4gICAqICAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2ZvbycpOyB9O1xuICAgKiAgICAgYXNzZXJ0LmRvZXNOb3RDaGFuZ2UoZm4sIG9iaiwgJ3ZhbCcpO1xuICAgKlxuICAgKiBAbmFtZSBkb2VzTm90Q2hhbmdlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG1vZGlmaWVyIGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuZG9lc05vdENoYW5nZSA9IGZ1bmN0aW9uIChmbiwgb2JqLCBwcm9wKSB7XG4gICAgbmV3IEFzc2VydGlvbihmbikudG8ubm90LmNoYW5nZShvYmosIHByb3ApO1xuICB9XG5cbiAgIC8qKlxuICAgKiAjIyMgLmluY3JlYXNlcyhmdW5jdGlvbiwgb2JqZWN0LCBwcm9wZXJ0eSlcbiAgICpcbiAgICogQXNzZXJ0cyB0aGF0IGEgZnVuY3Rpb24gaW5jcmVhc2VzIGFuIG9iamVjdCBwcm9wZXJ0eVxuICAgKlxuICAgKiAgICAgdmFyIG9iaiA9IHsgdmFsOiAxMCB9O1xuICAgKiAgICAgdmFyIGZuID0gZnVuY3Rpb24oKSB7IG9iai52YWwgPSAxMyB9O1xuICAgKiAgICAgYXNzZXJ0LmluY3JlYXNlcyhmbiwgb2JqLCAndmFsJyk7XG4gICAqXG4gICAqIEBuYW1lIGluY3JlYXNlc1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBtb2RpZmllciBmdW5jdGlvblxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eSBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIF9vcHRpb25hbF9cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmluY3JlYXNlcyA9IGZ1bmN0aW9uIChmbiwgb2JqLCBwcm9wKSB7XG4gICAgbmV3IEFzc2VydGlvbihmbikudG8uaW5jcmVhc2Uob2JqLCBwcm9wKTtcbiAgfVxuXG4gICAvKipcbiAgICogIyMjIC5kb2VzTm90SW5jcmVhc2UoZnVuY3Rpb24sIG9iamVjdCwgcHJvcGVydHkpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBhIGZ1bmN0aW9uIGRvZXMgbm90IGluY3JlYXNlIG9iamVjdCBwcm9wZXJ0eVxuICAgKlxuICAgKiAgICAgdmFyIG9iaiA9IHsgdmFsOiAxMCB9O1xuICAgKiAgICAgdmFyIGZuID0gZnVuY3Rpb24oKSB7IG9iai52YWwgPSA4IH07XG4gICAqICAgICBhc3NlcnQuZG9lc05vdEluY3JlYXNlKGZuLCBvYmosICd2YWwnKTtcbiAgICpcbiAgICogQG5hbWUgZG9lc05vdEluY3JlYXNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG1vZGlmaWVyIGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgX29wdGlvbmFsX1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBhc3NlcnQuZG9lc05vdEluY3JlYXNlID0gZnVuY3Rpb24gKGZuLCBvYmosIHByb3ApIHtcbiAgICBuZXcgQXNzZXJ0aW9uKGZuKS50by5ub3QuaW5jcmVhc2Uob2JqLCBwcm9wKTtcbiAgfVxuXG4gICAvKipcbiAgICogIyMjIC5kZWNyZWFzZXMoZnVuY3Rpb24sIG9iamVjdCwgcHJvcGVydHkpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBhIGZ1bmN0aW9uIGRlY3JlYXNlcyBhbiBvYmplY3QgcHJvcGVydHlcbiAgICpcbiAgICogICAgIHZhciBvYmogPSB7IHZhbDogMTAgfTtcbiAgICogICAgIHZhciBmbiA9IGZ1bmN0aW9uKCkgeyBvYmoudmFsID0gNSB9O1xuICAgKiAgICAgYXNzZXJ0LmRlY3JlYXNlcyhmbiwgb2JqLCAndmFsJyk7XG4gICAqXG4gICAqIEBuYW1lIGRlY3JlYXNlc1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBtb2RpZmllciBmdW5jdGlvblxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eSBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIF9vcHRpb25hbF9cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgYXNzZXJ0LmRlY3JlYXNlcyA9IGZ1bmN0aW9uIChmbiwgb2JqLCBwcm9wKSB7XG4gICAgbmV3IEFzc2VydGlvbihmbikudG8uZGVjcmVhc2Uob2JqLCBwcm9wKTtcbiAgfVxuXG4gICAvKipcbiAgICogIyMjIC5kb2VzTm90RGVjcmVhc2UoZnVuY3Rpb24sIG9iamVjdCwgcHJvcGVydHkpXG4gICAqXG4gICAqIEFzc2VydHMgdGhhdCBhIGZ1bmN0aW9uIGRvZXMgbm90IGRlY3JlYXNlcyBhbiBvYmplY3QgcHJvcGVydHlcbiAgICpcbiAgICogICAgIHZhciBvYmogPSB7IHZhbDogMTAgfTtcbiAgICogICAgIHZhciBmbiA9IGZ1bmN0aW9uKCkgeyBvYmoudmFsID0gMTUgfTtcbiAgICogICAgIGFzc2VydC5kb2VzTm90RGVjcmVhc2UoZm4sIG9iaiwgJ3ZhbCcpO1xuICAgKlxuICAgKiBAbmFtZSBkb2VzTm90RGVjcmVhc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbW9kaWZpZXIgZnVuY3Rpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHkgbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBfb3B0aW9uYWxfXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGFzc2VydC5kb2VzTm90RGVjcmVhc2UgPSBmdW5jdGlvbiAoZm4sIG9iaiwgcHJvcCkge1xuICAgIG5ldyBBc3NlcnRpb24oZm4pLnRvLm5vdC5kZWNyZWFzZShvYmosIHByb3ApO1xuICB9XG5cbiAgLyohXG4gICAqIFVuZG9jdW1lbnRlZCAvIHVudGVzdGVkXG4gICAqL1xuXG4gIGFzc2VydC5pZkVycm9yID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XG4gICAgbmV3IEFzc2VydGlvbih2YWwsIG1zZykudG8ubm90LmJlLm9rO1xuICB9O1xuXG4gIC8qIVxuICAgKiBBbGlhc2VzLlxuICAgKi9cblxuICAoZnVuY3Rpb24gYWxpYXMobmFtZSwgYXMpe1xuICAgIGFzc2VydFthc10gPSBhc3NlcnRbbmFtZV07XG4gICAgcmV0dXJuIGFsaWFzO1xuICB9KVxuICAoJ1Rocm93JywgJ3Rocm93JylcbiAgKCdUaHJvdycsICd0aHJvd3MnKTtcbn07XG4iLCIvKiFcbiAqIGNoYWlcbiAqIENvcHlyaWdodChjKSAyMDExLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjaGFpLCB1dGlsKSB7XG4gIGNoYWkuZXhwZWN0ID0gZnVuY3Rpb24gKHZhbCwgbWVzc2FnZSkge1xuICAgIHJldHVybiBuZXcgY2hhaS5Bc3NlcnRpb24odmFsLCBtZXNzYWdlKTtcbiAgfTtcblxuICAvKipcbiAgICogIyMjIC5mYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIFttZXNzYWdlXSwgW29wZXJhdG9yXSlcbiAgICpcbiAgICogVGhyb3cgYSBmYWlsdXJlLlxuICAgKlxuICAgKiBAbmFtZSBmYWlsXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGFjdHVhbFxuICAgKiBAcGFyYW0ge01peGVkfSBleHBlY3RlZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3BlcmF0b3JcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgY2hhaS5leHBlY3QuZmFpbCA9IGZ1bmN0aW9uIChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBvcGVyYXRvcikge1xuICAgIG1lc3NhZ2UgPSBtZXNzYWdlIHx8ICdleHBlY3QuZmFpbCgpJztcbiAgICB0aHJvdyBuZXcgY2hhaS5Bc3NlcnRpb25FcnJvcihtZXNzYWdlLCB7XG4gICAgICAgIGFjdHVhbDogYWN0dWFsXG4gICAgICAsIGV4cGVjdGVkOiBleHBlY3RlZFxuICAgICAgLCBvcGVyYXRvcjogb3BlcmF0b3JcbiAgICB9LCBjaGFpLmV4cGVjdC5mYWlsKTtcbiAgfTtcbn07XG4iLCIvKiFcbiAqIGNoYWlcbiAqIENvcHlyaWdodChjKSAyMDExLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjaGFpLCB1dGlsKSB7XG4gIHZhciBBc3NlcnRpb24gPSBjaGFpLkFzc2VydGlvbjtcblxuICBmdW5jdGlvbiBsb2FkU2hvdWxkICgpIHtcbiAgICAvLyBleHBsaWNpdGx5IGRlZmluZSB0aGlzIG1ldGhvZCBhcyBmdW5jdGlvbiBhcyB0byBoYXZlIGl0J3MgbmFtZSB0byBpbmNsdWRlIGFzIGBzc2ZpYFxuICAgIGZ1bmN0aW9uIHNob3VsZEdldHRlcigpIHtcbiAgICAgIGlmICh0aGlzIGluc3RhbmNlb2YgU3RyaW5nIHx8IHRoaXMgaW5zdGFuY2VvZiBOdW1iZXIgfHwgdGhpcyBpbnN0YW5jZW9mIEJvb2xlYW4gKSB7XG4gICAgICAgIHJldHVybiBuZXcgQXNzZXJ0aW9uKHRoaXMudmFsdWVPZigpLCBudWxsLCBzaG91bGRHZXR0ZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBBc3NlcnRpb24odGhpcywgbnVsbCwgc2hvdWxkR2V0dGVyKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2hvdWxkU2V0dGVyKHZhbHVlKSB7XG4gICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2NoYWlqcy9jaGFpL2lzc3Vlcy84NjogdGhpcyBtYWtlc1xuICAgICAgLy8gYHdoYXRldmVyLnNob3VsZCA9IHNvbWVWYWx1ZWAgYWN0dWFsbHkgc2V0IGBzb21lVmFsdWVgLCB3aGljaCBpc1xuICAgICAgLy8gZXNwZWNpYWxseSB1c2VmdWwgZm9yIGBnbG9iYWwuc2hvdWxkID0gcmVxdWlyZSgnY2hhaScpLnNob3VsZCgpYC5cbiAgICAgIC8vXG4gICAgICAvLyBOb3RlIHRoYXQgd2UgaGF2ZSB0byB1c2UgW1tEZWZpbmVQcm9wZXJ0eV1dIGluc3RlYWQgb2YgW1tQdXRdXVxuICAgICAgLy8gc2luY2Ugb3RoZXJ3aXNlIHdlIHdvdWxkIHRyaWdnZXIgdGhpcyB2ZXJ5IHNldHRlciFcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc2hvdWxkJywge1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBtb2RpZnkgT2JqZWN0LnByb3RvdHlwZSB0byBoYXZlIGBzaG91bGRgXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdC5wcm90b3R5cGUsICdzaG91bGQnLCB7XG4gICAgICBzZXQ6IHNob3VsZFNldHRlclxuICAgICAgLCBnZXQ6IHNob3VsZEdldHRlclxuICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcblxuICAgIHZhciBzaG91bGQgPSB7fTtcblxuICAgIC8qKlxuICAgICAqICMjIyAuZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBbbWVzc2FnZV0sIFtvcGVyYXRvcl0pXG4gICAgICpcbiAgICAgKiBUaHJvdyBhIGZhaWx1cmUuXG4gICAgICpcbiAgICAgKiBAbmFtZSBmYWlsXG4gICAgICogQHBhcmFtIHtNaXhlZH0gYWN0dWFsXG4gICAgICogQHBhcmFtIHtNaXhlZH0gZXhwZWN0ZWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcGVyYXRvclxuICAgICAqIEBhcGkgcHVibGljXG4gICAgICovXG5cbiAgICBzaG91bGQuZmFpbCA9IGZ1bmN0aW9uIChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBvcGVyYXRvcikge1xuICAgICAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgJ3Nob3VsZC5mYWlsKCknO1xuICAgICAgdGhyb3cgbmV3IGNoYWkuQXNzZXJ0aW9uRXJyb3IobWVzc2FnZSwge1xuICAgICAgICAgIGFjdHVhbDogYWN0dWFsXG4gICAgICAgICwgZXhwZWN0ZWQ6IGV4cGVjdGVkXG4gICAgICAgICwgb3BlcmF0b3I6IG9wZXJhdG9yXG4gICAgICB9LCBzaG91bGQuZmFpbCk7XG4gICAgfTtcblxuICAgIHNob3VsZC5lcXVhbCA9IGZ1bmN0aW9uICh2YWwxLCB2YWwyLCBtc2cpIHtcbiAgICAgIG5ldyBBc3NlcnRpb24odmFsMSwgbXNnKS50by5lcXVhbCh2YWwyKTtcbiAgICB9O1xuXG4gICAgc2hvdWxkLlRocm93ID0gZnVuY3Rpb24gKGZuLCBlcnJ0LCBlcnJzLCBtc2cpIHtcbiAgICAgIG5ldyBBc3NlcnRpb24oZm4sIG1zZykudG8uVGhyb3coZXJydCwgZXJycyk7XG4gICAgfTtcblxuICAgIHNob3VsZC5leGlzdCA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xuICAgICAgbmV3IEFzc2VydGlvbih2YWwsIG1zZykudG8uZXhpc3Q7XG4gICAgfVxuXG4gICAgLy8gbmVnYXRpb25cbiAgICBzaG91bGQubm90ID0ge31cblxuICAgIHNob3VsZC5ub3QuZXF1YWwgPSBmdW5jdGlvbiAodmFsMSwgdmFsMiwgbXNnKSB7XG4gICAgICBuZXcgQXNzZXJ0aW9uKHZhbDEsIG1zZykudG8ubm90LmVxdWFsKHZhbDIpO1xuICAgIH07XG5cbiAgICBzaG91bGQubm90LlRocm93ID0gZnVuY3Rpb24gKGZuLCBlcnJ0LCBlcnJzLCBtc2cpIHtcbiAgICAgIG5ldyBBc3NlcnRpb24oZm4sIG1zZykudG8ubm90LlRocm93KGVycnQsIGVycnMpO1xuICAgIH07XG5cbiAgICBzaG91bGQubm90LmV4aXN0ID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XG4gICAgICBuZXcgQXNzZXJ0aW9uKHZhbCwgbXNnKS50by5ub3QuZXhpc3Q7XG4gICAgfVxuXG4gICAgc2hvdWxkWyd0aHJvdyddID0gc2hvdWxkWydUaHJvdyddO1xuICAgIHNob3VsZC5ub3RbJ3Rocm93J10gPSBzaG91bGQubm90WydUaHJvdyddO1xuXG4gICAgcmV0dXJuIHNob3VsZDtcbiAgfTtcblxuICBjaGFpLnNob3VsZCA9IGxvYWRTaG91bGQ7XG4gIGNoYWkuU2hvdWxkID0gbG9hZFNob3VsZDtcbn07XG4iLCIvKiFcbiAqIENoYWkgLSBhZGRDaGFpbmluZ01ldGhvZCB1dGlsaXR5XG4gKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE0IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzXG4gKi9cblxudmFyIHRyYW5zZmVyRmxhZ3MgPSByZXF1aXJlKCcuL3RyYW5zZmVyRmxhZ3MnKTtcbnZhciBmbGFnID0gcmVxdWlyZSgnLi9mbGFnJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbi8qIVxuICogTW9kdWxlIHZhcmlhYmxlc1xuICovXG5cbi8vIENoZWNrIHdoZXRoZXIgYF9fcHJvdG9fX2AgaXMgc3VwcG9ydGVkXG52YXIgaGFzUHJvdG9TdXBwb3J0ID0gJ19fcHJvdG9fXycgaW4gT2JqZWN0O1xuXG4vLyBXaXRob3V0IGBfX3Byb3RvX19gIHN1cHBvcnQsIHRoaXMgbW9kdWxlIHdpbGwgbmVlZCB0byBhZGQgcHJvcGVydGllcyB0byBhIGZ1bmN0aW9uLlxuLy8gSG93ZXZlciwgc29tZSBGdW5jdGlvbi5wcm90b3R5cGUgbWV0aG9kcyBjYW5ub3QgYmUgb3ZlcndyaXR0ZW4sXG4vLyBhbmQgdGhlcmUgc2VlbXMgbm8gZWFzeSBjcm9zcy1wbGF0Zm9ybSB3YXkgdG8gZGV0ZWN0IHRoZW0gKEBzZWUgY2hhaWpzL2NoYWkvaXNzdWVzLzY5KS5cbnZhciBleGNsdWRlTmFtZXMgPSAvXig/Omxlbmd0aHxuYW1lfGFyZ3VtZW50c3xjYWxsZXIpJC87XG5cbi8vIENhY2hlIGBGdW5jdGlvbmAgcHJvcGVydGllc1xudmFyIGNhbGwgID0gRnVuY3Rpb24ucHJvdG90eXBlLmNhbGwsXG4gICAgYXBwbHkgPSBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHk7XG5cbi8qKlxuICogIyMjIGFkZENoYWluYWJsZU1ldGhvZCAoY3R4LCBuYW1lLCBtZXRob2QsIGNoYWluaW5nQmVoYXZpb3IpXG4gKlxuICogQWRkcyBhIG1ldGhvZCB0byBhbiBvYmplY3QsIHN1Y2ggdGhhdCB0aGUgbWV0aG9kIGNhbiBhbHNvIGJlIGNoYWluZWQuXG4gKlxuICogICAgIHV0aWxzLmFkZENoYWluYWJsZU1ldGhvZChjaGFpLkFzc2VydGlvbi5wcm90b3R5cGUsICdmb28nLCBmdW5jdGlvbiAoc3RyKSB7XG4gKiAgICAgICB2YXIgb2JqID0gdXRpbHMuZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gKiAgICAgICBuZXcgY2hhaS5Bc3NlcnRpb24ob2JqKS50by5iZS5lcXVhbChzdHIpO1xuICogICAgIH0pO1xuICpcbiAqIENhbiBhbHNvIGJlIGFjY2Vzc2VkIGRpcmVjdGx5IGZyb20gYGNoYWkuQXNzZXJ0aW9uYC5cbiAqXG4gKiAgICAgY2hhaS5Bc3NlcnRpb24uYWRkQ2hhaW5hYmxlTWV0aG9kKCdmb28nLCBmbiwgY2hhaW5pbmdCZWhhdmlvcik7XG4gKlxuICogVGhlIHJlc3VsdCBjYW4gdGhlbiBiZSB1c2VkIGFzIGJvdGggYSBtZXRob2QgYXNzZXJ0aW9uLCBleGVjdXRpbmcgYm90aCBgbWV0aG9kYCBhbmRcbiAqIGBjaGFpbmluZ0JlaGF2aW9yYCwgb3IgYXMgYSBsYW5ndWFnZSBjaGFpbiwgd2hpY2ggb25seSBleGVjdXRlcyBgY2hhaW5pbmdCZWhhdmlvcmAuXG4gKlxuICogICAgIGV4cGVjdChmb29TdHIpLnRvLmJlLmZvbygnYmFyJyk7XG4gKiAgICAgZXhwZWN0KGZvb1N0cikudG8uYmUuZm9vLmVxdWFsKCdmb28nKTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY3R4IG9iamVjdCB0byB3aGljaCB0aGUgbWV0aG9kIGlzIGFkZGVkXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBvZiBtZXRob2QgdG8gYWRkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtZXRob2QgZnVuY3Rpb24gdG8gYmUgdXNlZCBmb3IgYG5hbWVgLCB3aGVuIGNhbGxlZFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2hhaW5pbmdCZWhhdmlvciBmdW5jdGlvbiB0byBiZSBjYWxsZWQgZXZlcnkgdGltZSB0aGUgcHJvcGVydHkgaXMgYWNjZXNzZWRcbiAqIEBuYW1lIGFkZENoYWluYWJsZU1ldGhvZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjdHgsIG5hbWUsIG1ldGhvZCwgY2hhaW5pbmdCZWhhdmlvcikge1xuICBpZiAodHlwZW9mIGNoYWluaW5nQmVoYXZpb3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICBjaGFpbmluZ0JlaGF2aW9yID0gZnVuY3Rpb24gKCkgeyB9O1xuICB9XG5cbiAgdmFyIGNoYWluYWJsZUJlaGF2aW9yID0ge1xuICAgICAgbWV0aG9kOiBtZXRob2RcbiAgICAsIGNoYWluaW5nQmVoYXZpb3I6IGNoYWluaW5nQmVoYXZpb3JcbiAgfTtcblxuICAvLyBzYXZlIHRoZSBtZXRob2RzIHNvIHdlIGNhbiBvdmVyd3JpdGUgdGhlbSBsYXRlciwgaWYgd2UgbmVlZCB0by5cbiAgaWYgKCFjdHguX19tZXRob2RzKSB7XG4gICAgY3R4Ll9fbWV0aG9kcyA9IHt9O1xuICB9XG4gIGN0eC5fX21ldGhvZHNbbmFtZV0gPSBjaGFpbmFibGVCZWhhdmlvcjtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY3R4LCBuYW1lLFxuICAgIHsgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYWluYWJsZUJlaGF2aW9yLmNoYWluaW5nQmVoYXZpb3IuY2FsbCh0aGlzKTtcblxuICAgICAgICB2YXIgYXNzZXJ0ID0gZnVuY3Rpb24gYXNzZXJ0KCkge1xuICAgICAgICAgIHZhciBvbGRfc3NmaSA9IGZsYWcodGhpcywgJ3NzZmknKTtcbiAgICAgICAgICBpZiAob2xkX3NzZmkgJiYgY29uZmlnLmluY2x1ZGVTdGFjayA9PT0gZmFsc2UpXG4gICAgICAgICAgICBmbGFnKHRoaXMsICdzc2ZpJywgYXNzZXJ0KTtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gY2hhaW5hYmxlQmVoYXZpb3IubWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCA9PT0gdW5kZWZpbmVkID8gdGhpcyA6IHJlc3VsdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVc2UgYF9fcHJvdG9fX2AgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChoYXNQcm90b1N1cHBvcnQpIHtcbiAgICAgICAgICAvLyBJbmhlcml0IGFsbCBwcm9wZXJ0aWVzIGZyb20gdGhlIG9iamVjdCBieSByZXBsYWNpbmcgdGhlIGBGdW5jdGlvbmAgcHJvdG90eXBlXG4gICAgICAgICAgdmFyIHByb3RvdHlwZSA9IGFzc2VydC5fX3Byb3RvX18gPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIGBjYWxsYCBhbmQgYGFwcGx5YCBtZXRob2RzIGZyb20gYEZ1bmN0aW9uYFxuICAgICAgICAgIHByb3RvdHlwZS5jYWxsID0gY2FsbDtcbiAgICAgICAgICBwcm90b3R5cGUuYXBwbHkgPSBhcHBseTtcbiAgICAgICAgfVxuICAgICAgICAvLyBPdGhlcndpc2UsIHJlZGVmaW5lIGFsbCBwcm9wZXJ0aWVzIChzbG93ISlcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdmFyIGFzc2VydGVyTmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjdHgpO1xuICAgICAgICAgIGFzc2VydGVyTmFtZXMuZm9yRWFjaChmdW5jdGlvbiAoYXNzZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICBpZiAoIWV4Y2x1ZGVOYW1lcy50ZXN0KGFzc2VydGVyTmFtZSkpIHtcbiAgICAgICAgICAgICAgdmFyIHBkID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihjdHgsIGFzc2VydGVyTmFtZSk7XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhc3NlcnQsIGFzc2VydGVyTmFtZSwgcGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJhbnNmZXJGbGFncyh0aGlzLCBhc3NlcnQpO1xuICAgICAgICByZXR1cm4gYXNzZXJ0O1xuICAgICAgfVxuICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0pO1xufTtcbiIsIi8qIVxuICogQ2hhaSAtIGFkZE1ldGhvZCB1dGlsaXR5XG4gKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE0IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG4vKipcbiAqICMjIyAuYWRkTWV0aG9kIChjdHgsIG5hbWUsIG1ldGhvZClcbiAqXG4gKiBBZGRzIGEgbWV0aG9kIHRvIHRoZSBwcm90b3R5cGUgb2YgYW4gb2JqZWN0LlxuICpcbiAqICAgICB1dGlscy5hZGRNZXRob2QoY2hhaS5Bc3NlcnRpb24ucHJvdG90eXBlLCAnZm9vJywgZnVuY3Rpb24gKHN0cikge1xuICogICAgICAgdmFyIG9iaiA9IHV0aWxzLmZsYWcodGhpcywgJ29iamVjdCcpO1xuICogICAgICAgbmV3IGNoYWkuQXNzZXJ0aW9uKG9iaikudG8uYmUuZXF1YWwoc3RyKTtcbiAqICAgICB9KTtcbiAqXG4gKiBDYW4gYWxzbyBiZSBhY2Nlc3NlZCBkaXJlY3RseSBmcm9tIGBjaGFpLkFzc2VydGlvbmAuXG4gKlxuICogICAgIGNoYWkuQXNzZXJ0aW9uLmFkZE1ldGhvZCgnZm9vJywgZm4pO1xuICpcbiAqIFRoZW4gY2FuIGJlIHVzZWQgYXMgYW55IG90aGVyIGFzc2VydGlvbi5cbiAqXG4gKiAgICAgZXhwZWN0KGZvb1N0cikudG8uYmUuZm9vKCdiYXInKTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY3R4IG9iamVjdCB0byB3aGljaCB0aGUgbWV0aG9kIGlzIGFkZGVkXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBvZiBtZXRob2QgdG8gYWRkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtZXRob2QgZnVuY3Rpb24gdG8gYmUgdXNlZCBmb3IgbmFtZVxuICogQG5hbWUgYWRkTWV0aG9kXG4gKiBAYXBpIHB1YmxpY1xuICovXG52YXIgZmxhZyA9IHJlcXVpcmUoJy4vZmxhZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjdHgsIG5hbWUsIG1ldGhvZCkge1xuICBjdHhbbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9sZF9zc2ZpID0gZmxhZyh0aGlzLCAnc3NmaScpO1xuICAgIGlmIChvbGRfc3NmaSAmJiBjb25maWcuaW5jbHVkZVN0YWNrID09PSBmYWxzZSlcbiAgICAgIGZsYWcodGhpcywgJ3NzZmknLCBjdHhbbmFtZV0pO1xuICAgIHZhciByZXN1bHQgPSBtZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gcmVzdWx0ID09PSB1bmRlZmluZWQgPyB0aGlzIDogcmVzdWx0O1xuICB9O1xufTtcbiIsIi8qIVxuICogQ2hhaSAtIGFkZFByb3BlcnR5IHV0aWxpdHlcbiAqIENvcHlyaWdodChjKSAyMDEyLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4vKipcbiAqICMjIyBhZGRQcm9wZXJ0eSAoY3R4LCBuYW1lLCBnZXR0ZXIpXG4gKlxuICogQWRkcyBhIHByb3BlcnR5IHRvIHRoZSBwcm90b3R5cGUgb2YgYW4gb2JqZWN0LlxuICpcbiAqICAgICB1dGlscy5hZGRQcm9wZXJ0eShjaGFpLkFzc2VydGlvbi5wcm90b3R5cGUsICdmb28nLCBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICB2YXIgb2JqID0gdXRpbHMuZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gKiAgICAgICBuZXcgY2hhaS5Bc3NlcnRpb24ob2JqKS50by5iZS5pbnN0YW5jZW9mKEZvbyk7XG4gKiAgICAgfSk7XG4gKlxuICogQ2FuIGFsc28gYmUgYWNjZXNzZWQgZGlyZWN0bHkgZnJvbSBgY2hhaS5Bc3NlcnRpb25gLlxuICpcbiAqICAgICBjaGFpLkFzc2VydGlvbi5hZGRQcm9wZXJ0eSgnZm9vJywgZm4pO1xuICpcbiAqIFRoZW4gY2FuIGJlIHVzZWQgYXMgYW55IG90aGVyIGFzc2VydGlvbi5cbiAqXG4gKiAgICAgZXhwZWN0KG15Rm9vKS50by5iZS5mb287XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGN0eCBvYmplY3QgdG8gd2hpY2ggdGhlIHByb3BlcnR5IGlzIGFkZGVkXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBvZiBwcm9wZXJ0eSB0byBhZGRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGdldHRlciBmdW5jdGlvbiB0byBiZSB1c2VkIGZvciBuYW1lXG4gKiBAbmFtZSBhZGRQcm9wZXJ0eVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjdHgsIG5hbWUsIGdldHRlcikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY3R4LCBuYW1lLFxuICAgIHsgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBnZXR0ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCA9PT0gdW5kZWZpbmVkID8gdGhpcyA6IHJlc3VsdDtcbiAgICAgIH1cbiAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9KTtcbn07XG4iLCIvKiFcbiAqIENoYWkgLSBmbGFnIHV0aWxpdHlcbiAqIENvcHlyaWdodChjKSAyMDEyLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4vKipcbiAqICMjIyBmbGFnKG9iamVjdCwga2V5LCBbdmFsdWVdKVxuICpcbiAqIEdldCBvciBzZXQgYSBmbGFnIHZhbHVlIG9uIGFuIG9iamVjdC4gSWYgYVxuICogdmFsdWUgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSBzZXQsIGVsc2UgaXQgd2lsbFxuICogcmV0dXJuIHRoZSBjdXJyZW50bHkgc2V0IHZhbHVlIG9yIGB1bmRlZmluZWRgIGlmXG4gKiB0aGUgdmFsdWUgaXMgbm90IHNldC5cbiAqXG4gKiAgICAgdXRpbHMuZmxhZyh0aGlzLCAnZm9vJywgJ2JhcicpOyAvLyBzZXR0ZXJcbiAqICAgICB1dGlscy5mbGFnKHRoaXMsICdmb28nKTsgLy8gZ2V0dGVyLCByZXR1cm5zIGBiYXJgXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBjb25zdHJ1Y3RlZCBBc3NlcnRpb25cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlIChvcHRpb25hbClcbiAqIEBuYW1lIGZsYWdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaiwga2V5LCB2YWx1ZSkge1xuICB2YXIgZmxhZ3MgPSBvYmouX19mbGFncyB8fCAob2JqLl9fZmxhZ3MgPSBPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICBmbGFnc1trZXldID0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZsYWdzW2tleV07XG4gIH1cbn07XG4iLCIvKiFcbiAqIENoYWkgLSBnZXRBY3R1YWwgdXRpbGl0eVxuICogQ29weXJpZ2h0KGMpIDIwMTItMjAxNCBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogIyBnZXRBY3R1YWwob2JqZWN0LCBbYWN0dWFsXSlcbiAqXG4gKiBSZXR1cm5zIHRoZSBgYWN0dWFsYCB2YWx1ZSBmb3IgYW4gQXNzZXJ0aW9uXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAoY29uc3RydWN0ZWQgQXNzZXJ0aW9uKVxuICogQHBhcmFtIHtBcmd1bWVudHN9IGNoYWkuQXNzZXJ0aW9uLnByb3RvdHlwZS5hc3NlcnQgYXJndW1lbnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqLCBhcmdzKSB7XG4gIHJldHVybiBhcmdzLmxlbmd0aCA+IDQgPyBhcmdzWzRdIDogb2JqLl9vYmo7XG59O1xuIiwiLyohXG4gKiBDaGFpIC0gZ2V0RW51bWVyYWJsZVByb3BlcnRpZXMgdXRpbGl0eVxuICogQ29weXJpZ2h0KGMpIDIwMTItMjAxNCBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogIyMjIC5nZXRFbnVtZXJhYmxlUHJvcGVydGllcyhvYmplY3QpXG4gKlxuICogVGhpcyBhbGxvd3MgdGhlIHJldHJpZXZhbCBvZiBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIGFuIG9iamVjdCxcbiAqIGluaGVyaXRlZCBvciBub3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICogQHJldHVybnMge0FycmF5fVxuICogQG5hbWUgZ2V0RW51bWVyYWJsZVByb3BlcnRpZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXRFbnVtZXJhYmxlUHJvcGVydGllcyhvYmplY3QpIHtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBmb3IgKHZhciBuYW1lIGluIG9iamVjdCkge1xuICAgIHJlc3VsdC5wdXNoKG5hbWUpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuIiwiLyohXG4gKiBDaGFpIC0gbWVzc2FnZSBjb21wb3NpdGlvbiB1dGlsaXR5XG4gKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE0IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kYW5jaWVzXG4gKi9cblxudmFyIGZsYWcgPSByZXF1aXJlKCcuL2ZsYWcnKVxuICAsIGdldEFjdHVhbCA9IHJlcXVpcmUoJy4vZ2V0QWN0dWFsJylcbiAgLCBpbnNwZWN0ID0gcmVxdWlyZSgnLi9pbnNwZWN0JylcbiAgLCBvYmpEaXNwbGF5ID0gcmVxdWlyZSgnLi9vYmpEaXNwbGF5Jyk7XG5cbi8qKlxuICogIyMjIC5nZXRNZXNzYWdlKG9iamVjdCwgbWVzc2FnZSwgbmVnYXRlTWVzc2FnZSlcbiAqXG4gKiBDb25zdHJ1Y3QgdGhlIGVycm9yIG1lc3NhZ2UgYmFzZWQgb24gZmxhZ3NcbiAqIGFuZCB0ZW1wbGF0ZSB0YWdzLiBUZW1wbGF0ZSB0YWdzIHdpbGwgcmV0dXJuXG4gKiBhIHN0cmluZ2lmaWVkIGluc3BlY3Rpb24gb2YgdGhlIG9iamVjdCByZWZlcmVuY2VkLlxuICpcbiAqIE1lc3NhZ2UgdGVtcGxhdGUgdGFnczpcbiAqIC0gYCN7dGhpc31gIGN1cnJlbnQgYXNzZXJ0ZWQgb2JqZWN0XG4gKiAtIGAje2FjdH1gIGFjdHVhbCB2YWx1ZVxuICogLSBgI3tleHB9YCBleHBlY3RlZCB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgKGNvbnN0cnVjdGVkIEFzc2VydGlvbilcbiAqIEBwYXJhbSB7QXJndW1lbnRzfSBjaGFpLkFzc2VydGlvbi5wcm90b3R5cGUuYXNzZXJ0IGFyZ3VtZW50c1xuICogQG5hbWUgZ2V0TWVzc2FnZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmosIGFyZ3MpIHtcbiAgdmFyIG5lZ2F0ZSA9IGZsYWcob2JqLCAnbmVnYXRlJylcbiAgICAsIHZhbCA9IGZsYWcob2JqLCAnb2JqZWN0JylcbiAgICAsIGV4cGVjdGVkID0gYXJnc1szXVxuICAgICwgYWN0dWFsID0gZ2V0QWN0dWFsKG9iaiwgYXJncylcbiAgICAsIG1zZyA9IG5lZ2F0ZSA/IGFyZ3NbMl0gOiBhcmdzWzFdXG4gICAgLCBmbGFnTXNnID0gZmxhZyhvYmosICdtZXNzYWdlJyk7XG5cbiAgaWYodHlwZW9mIG1zZyA9PT0gXCJmdW5jdGlvblwiKSBtc2cgPSBtc2coKTtcbiAgbXNnID0gbXNnIHx8ICcnO1xuICBtc2cgPSBtc2dcbiAgICAucmVwbGFjZSgvI3t0aGlzfS9nLCBvYmpEaXNwbGF5KHZhbCkpXG4gICAgLnJlcGxhY2UoLyN7YWN0fS9nLCBvYmpEaXNwbGF5KGFjdHVhbCkpXG4gICAgLnJlcGxhY2UoLyN7ZXhwfS9nLCBvYmpEaXNwbGF5KGV4cGVjdGVkKSk7XG5cbiAgcmV0dXJuIGZsYWdNc2cgPyBmbGFnTXNnICsgJzogJyArIG1zZyA6IG1zZztcbn07XG4iLCIvKiFcbiAqIENoYWkgLSBnZXROYW1lIHV0aWxpdHlcbiAqIENvcHlyaWdodChjKSAyMDEyLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4vKipcbiAqICMgZ2V0TmFtZShmdW5jKVxuICpcbiAqIEdldHMgdGhlIG5hbWUgb2YgYSBmdW5jdGlvbiwgaW4gYSBjcm9zcy1icm93c2VyIHdheS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBhIGZ1bmN0aW9uICh1c3VhbGx5IGEgY29uc3RydWN0b3IpXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZnVuYykge1xuICBpZiAoZnVuYy5uYW1lKSByZXR1cm4gZnVuYy5uYW1lO1xuXG4gIHZhciBtYXRjaCA9IC9eXFxzP2Z1bmN0aW9uIChbXihdKilcXCgvLmV4ZWMoZnVuYyk7XG4gIHJldHVybiBtYXRjaCAmJiBtYXRjaFsxXSA/IG1hdGNoWzFdIDogXCJcIjtcbn07XG4iLCIvKiFcbiAqIENoYWkgLSBnZXRQYXRoSW5mbyB1dGlsaXR5XG4gKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE0IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIGhhc1Byb3BlcnR5ID0gcmVxdWlyZSgnLi9oYXNQcm9wZXJ0eScpO1xuXG4vKipcbiAqICMjIyAuZ2V0UGF0aEluZm8ocGF0aCwgb2JqZWN0KVxuICpcbiAqIFRoaXMgYWxsb3dzIHRoZSByZXRyaWV2YWwgb2YgcHJvcGVydHkgaW5mbyBpbiBhblxuICogb2JqZWN0IGdpdmVuIGEgc3RyaW5nIHBhdGguXG4gKlxuICogVGhlIHBhdGggaW5mbyBjb25zaXN0cyBvZiBhbiBvYmplY3Qgd2l0aCB0aGVcbiAqIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICpcbiAqICogcGFyZW50IC0gVGhlIHBhcmVudCBvYmplY3Qgb2YgdGhlIHByb3BlcnR5IHJlZmVyZW5jZWQgYnkgYHBhdGhgXG4gKiAqIG5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZmluYWwgcHJvcGVydHksIGEgbnVtYmVyIGlmIGl0IHdhcyBhbiBhcnJheSBpbmRleGVyXG4gKiAqIHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBwcm9wZXJ0eSwgaWYgaXQgZXhpc3RzLCBvdGhlcndpc2UgYHVuZGVmaW5lZGBcbiAqICogZXhpc3RzIC0gV2hldGhlciB0aGUgcHJvcGVydHkgZXhpc3RzIG9yIG5vdFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gKiBAcmV0dXJucyB7T2JqZWN0fSBpbmZvXG4gKiBAbmFtZSBnZXRQYXRoSW5mb1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldFBhdGhJbmZvKHBhdGgsIG9iaikge1xuICB2YXIgcGFyc2VkID0gcGFyc2VQYXRoKHBhdGgpLFxuICAgICAgbGFzdCA9IHBhcnNlZFtwYXJzZWQubGVuZ3RoIC0gMV07XG5cbiAgdmFyIGluZm8gPSB7XG4gICAgcGFyZW50OiBwYXJzZWQubGVuZ3RoID4gMSA/IF9nZXRQYXRoVmFsdWUocGFyc2VkLCBvYmosIHBhcnNlZC5sZW5ndGggLSAxKSA6IG9iaixcbiAgICBuYW1lOiBsYXN0LnAgfHwgbGFzdC5pLFxuICAgIHZhbHVlOiBfZ2V0UGF0aFZhbHVlKHBhcnNlZCwgb2JqKSxcbiAgfTtcbiAgaW5mby5leGlzdHMgPSBoYXNQcm9wZXJ0eShpbmZvLm5hbWUsIGluZm8ucGFyZW50KTtcblxuICByZXR1cm4gaW5mbztcbn07XG5cblxuLyohXG4gKiAjIyBwYXJzZVBhdGgocGF0aClcbiAqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBwYXJzZSBzdHJpbmcgb2JqZWN0XG4gKiBwYXRocy4gVXNlIGluIGNvbmp1bmN0aW9uIHdpdGggYF9nZXRQYXRoVmFsdWVgLlxuICpcbiAqICAgICAgdmFyIHBhcnNlZCA9IHBhcnNlUGF0aCgnbXlvYmplY3QucHJvcGVydHkuc3VicHJvcCcpO1xuICpcbiAqICMjIyBQYXRoczpcbiAqXG4gKiAqIENhbiBiZSBhcyBuZWFyIGluZmluaXRlbHkgZGVlcCBhbmQgbmVzdGVkXG4gKiAqIEFycmF5cyBhcmUgYWxzbyB2YWxpZCB1c2luZyB0aGUgZm9ybWFsIGBteW9iamVjdC5kb2N1bWVudFszXS5wcm9wZXJ0eWAuXG4gKiAqIExpdGVyYWwgZG90cyBhbmQgYnJhY2tldHMgKG5vdCBkZWxpbWl0ZXIpIG11c3QgYmUgYmFja3NsYXNoLWVzY2FwZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm5zIHtPYmplY3R9IHBhcnNlZFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VQYXRoIChwYXRoKSB7XG4gIHZhciBzdHIgPSBwYXRoLnJlcGxhY2UoLyhbXlxcXFxdKVxcWy9nLCAnJDEuWycpXG4gICAgLCBwYXJ0cyA9IHN0ci5tYXRjaCgvKFxcXFxcXC58W14uXSs/KSsvZyk7XG4gIHJldHVybiBwYXJ0cy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHJlID0gL15cXFsoXFxkKylcXF0kL1xuICAgICAgLCBtQXJyID0gcmUuZXhlYyh2YWx1ZSk7XG4gICAgaWYgKG1BcnIpIHJldHVybiB7IGk6IHBhcnNlRmxvYXQobUFyclsxXSkgfTtcbiAgICBlbHNlIHJldHVybiB7IHA6IHZhbHVlLnJlcGxhY2UoL1xcXFwoWy5cXFtcXF1dKS9nLCAnJDEnKSB9O1xuICB9KTtcbn1cblxuXG4vKiFcbiAqICMjIF9nZXRQYXRoVmFsdWUocGFyc2VkLCBvYmopXG4gKlxuICogSGVscGVyIGNvbXBhbmlvbiBmdW5jdGlvbiBmb3IgYC5wYXJzZVBhdGhgIHRoYXQgcmV0dXJuc1xuICogdGhlIHZhbHVlIGxvY2F0ZWQgYXQgdGhlIHBhcnNlZCBhZGRyZXNzLlxuICpcbiAqICAgICAgdmFyIHZhbHVlID0gZ2V0UGF0aFZhbHVlKHBhcnNlZCwgb2JqKTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyc2VkIGRlZmluaXRpb24gZnJvbSBgcGFyc2VQYXRoYC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgdG8gc2VhcmNoIGFnYWluc3RcbiAqIEBwYXJhbSB7TnVtYmVyfSBvYmplY3QgdG8gc2VhcmNoIGFnYWluc3RcbiAqIEByZXR1cm5zIHtPYmplY3R8VW5kZWZpbmVkfSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gX2dldFBhdGhWYWx1ZSAocGFyc2VkLCBvYmosIGluZGV4KSB7XG4gIHZhciB0bXAgPSBvYmpcbiAgICAsIHJlcztcblxuICBpbmRleCA9IChpbmRleCA9PT0gdW5kZWZpbmVkID8gcGFyc2VkLmxlbmd0aCA6IGluZGV4KTtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGluZGV4OyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIHBhcnQgPSBwYXJzZWRbaV07XG4gICAgaWYgKHRtcCkge1xuICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgcGFydC5wKVxuICAgICAgICB0bXAgPSB0bXBbcGFydC5wXTtcbiAgICAgIGVsc2UgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgcGFydC5pKVxuICAgICAgICB0bXAgPSB0bXBbcGFydC5pXTtcbiAgICAgIGlmIChpID09IChsIC0gMSkpIHJlcyA9IHRtcDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuIiwiLyohXG4gKiBDaGFpIC0gZ2V0UGF0aFZhbHVlIHV0aWxpdHlcbiAqIENvcHlyaWdodChjKSAyMDEyLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9sb2dpY2FscGFyYWRveC9maWx0clxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIGdldFBhdGhJbmZvID0gcmVxdWlyZSgnLi9nZXRQYXRoSW5mbycpO1xuXG4vKipcbiAqICMjIyAuZ2V0UGF0aFZhbHVlKHBhdGgsIG9iamVjdClcbiAqXG4gKiBUaGlzIGFsbG93cyB0aGUgcmV0cmlldmFsIG9mIHZhbHVlcyBpbiBhblxuICogb2JqZWN0IGdpdmVuIGEgc3RyaW5nIHBhdGguXG4gKlxuICogICAgIHZhciBvYmogPSB7XG4gKiAgICAgICAgIHByb3AxOiB7XG4gKiAgICAgICAgICAgICBhcnI6IFsnYScsICdiJywgJ2MnXVxuICogICAgICAgICAgICwgc3RyOiAnSGVsbG8nXG4gKiAgICAgICAgIH1cbiAqICAgICAgICwgcHJvcDI6IHtcbiAqICAgICAgICAgICAgIGFycjogWyB7IG5lc3RlZDogJ1VuaXZlcnNlJyB9IF1cbiAqICAgICAgICAgICAsIHN0cjogJ0hlbGxvIGFnYWluISdcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqXG4gKiBUaGUgZm9sbG93aW5nIHdvdWxkIGJlIHRoZSByZXN1bHRzLlxuICpcbiAqICAgICBnZXRQYXRoVmFsdWUoJ3Byb3AxLnN0cicsIG9iaik7IC8vIEhlbGxvXG4gKiAgICAgZ2V0UGF0aFZhbHVlKCdwcm9wMS5hdHRbMl0nLCBvYmopOyAvLyBiXG4gKiAgICAgZ2V0UGF0aFZhbHVlKCdwcm9wMi5hcnJbMF0ubmVzdGVkJywgb2JqKTsgLy8gVW5pdmVyc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICogQHJldHVybnMge09iamVjdH0gdmFsdWUgb3IgYHVuZGVmaW5lZGBcbiAqIEBuYW1lIGdldFBhdGhWYWx1ZVxuICogQGFwaSBwdWJsaWNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwYXRoLCBvYmopIHtcbiAgdmFyIGluZm8gPSBnZXRQYXRoSW5mbyhwYXRoLCBvYmopO1xuICByZXR1cm4gaW5mby52YWx1ZTtcbn07IFxuIiwiLyohXG4gKiBDaGFpIC0gZ2V0UHJvcGVydGllcyB1dGlsaXR5XG4gKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE0IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyoqXG4gKiAjIyMgLmdldFByb3BlcnRpZXMob2JqZWN0KVxuICpcbiAqIFRoaXMgYWxsb3dzIHRoZSByZXRyaWV2YWwgb2YgcHJvcGVydHkgbmFtZXMgb2YgYW4gb2JqZWN0LCBlbnVtZXJhYmxlIG9yIG5vdCxcbiAqIGluaGVyaXRlZCBvciBub3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICogQHJldHVybnMge0FycmF5fVxuICogQG5hbWUgZ2V0UHJvcGVydGllc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldFByb3BlcnRpZXMob2JqZWN0KSB7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzdWJqZWN0KTtcblxuICBmdW5jdGlvbiBhZGRQcm9wZXJ0eShwcm9wZXJ0eSkge1xuICAgIGlmIChyZXN1bHQuaW5kZXhPZihwcm9wZXJ0eSkgPT09IC0xKSB7XG4gICAgICByZXN1bHQucHVzaChwcm9wZXJ0eSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHN1YmplY3QpO1xuICB3aGlsZSAocHJvdG8gIT09IG51bGwpIHtcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90bykuZm9yRWFjaChhZGRQcm9wZXJ0eSk7XG4gICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCIvKiFcbiAqIENoYWkgLSBoYXNQcm9wZXJ0eSB1dGlsaXR5XG4gKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE0IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxudmFyIHR5cGUgPSByZXF1aXJlKCcuL3R5cGUnKTtcblxuLyoqXG4gKiAjIyMgLmhhc1Byb3BlcnR5KG9iamVjdCwgbmFtZSlcbiAqXG4gKiBUaGlzIGFsbG93cyBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXNcbiAqIG5hbWVkIHByb3BlcnR5IG9yIG51bWVyaWMgYXJyYXkgaW5kZXguXG4gKlxuICogQmFzaWNhbGx5IGRvZXMgdGhlIHNhbWUgdGhpbmcgYXMgdGhlIGBpbmBcbiAqIG9wZXJhdG9yIGJ1dCB3b3JrcyBwcm9wZXJseSB3aXRoIG5hdGl2ZXNcbiAqIGFuZCBudWxsL3VuZGVmaW5lZCB2YWx1ZXMuXG4gKlxuICogICAgIHZhciBvYmogPSB7XG4gKiAgICAgICAgIGFycjogWydhJywgJ2InLCAnYyddXG4gKiAgICAgICAsIHN0cjogJ0hlbGxvJ1xuICogICAgIH1cbiAqXG4gKiBUaGUgZm9sbG93aW5nIHdvdWxkIGJlIHRoZSByZXN1bHRzLlxuICpcbiAqICAgICBoYXNQcm9wZXJ0eSgnc3RyJywgb2JqKTsgIC8vIHRydWVcbiAqICAgICBoYXNQcm9wZXJ0eSgnY29uc3RydWN0b3InLCBvYmopOyAgLy8gdHJ1ZVxuICogICAgIGhhc1Byb3BlcnR5KCdiYXInLCBvYmopOyAgLy8gZmFsc2VcbiAqICAgICBcbiAqICAgICBoYXNQcm9wZXJ0eSgnbGVuZ3RoJywgb2JqLnN0cik7IC8vIHRydWVcbiAqICAgICBoYXNQcm9wZXJ0eSgxLCBvYmouc3RyKTsgIC8vIHRydWVcbiAqICAgICBoYXNQcm9wZXJ0eSg1LCBvYmouc3RyKTsgIC8vIGZhbHNlXG4gKlxuICogICAgIGhhc1Byb3BlcnR5KCdsZW5ndGgnLCBvYmouYXJyKTsgIC8vIHRydWVcbiAqICAgICBoYXNQcm9wZXJ0eSgyLCBvYmouYXJyKTsgIC8vIHRydWVcbiAqICAgICBoYXNQcm9wZXJ0eSgzLCBvYmouYXJyKTsgIC8vIGZhbHNlXG4gKlxuICogQHBhcmFtIHtPYmp1ZWN0fSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gbmFtZVxuICogQHJldHVybnMge0Jvb2xlYW59IHdoZXRoZXIgaXQgZXhpc3RzXG4gKiBAbmFtZSBnZXRQYXRoSW5mb1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG52YXIgbGl0ZXJhbHMgPSB7XG4gICAgJ251bWJlcic6IE51bWJlclxuICAsICdzdHJpbmcnOiBTdHJpbmdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzUHJvcGVydHkobmFtZSwgb2JqKSB7XG4gIHZhciBvdCA9IHR5cGUob2JqKTtcblxuICAvLyBCYWQgT2JqZWN0LCBvYnZpb3VzbHkgbm8gcHJvcHMgYXQgYWxsXG4gIGlmKG90ID09PSAnbnVsbCcgfHwgb3QgPT09ICd1bmRlZmluZWQnKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBUaGUgYGluYCBvcGVyYXRvciBkb2VzIG5vdCB3b3JrIHdpdGggY2VydGFpbiBsaXRlcmFsc1xuICAvLyBib3ggdGhlc2UgYmVmb3JlIHRoZSBjaGVja1xuICBpZihsaXRlcmFsc1tvdF0gJiYgdHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpXG4gICAgb2JqID0gbmV3IGxpdGVyYWxzW290XShvYmopO1xuXG4gIHJldHVybiBuYW1lIGluIG9iajtcbn07XG4iLCIvKiFcbiAqIGNoYWlcbiAqIENvcHlyaWdodChjKSAyMDExIEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyohXG4gKiBNYWluIGV4cG9ydHNcbiAqL1xuXG52YXIgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8qIVxuICogdGVzdCB1dGlsaXR5XG4gKi9cblxuZXhwb3J0cy50ZXN0ID0gcmVxdWlyZSgnLi90ZXN0Jyk7XG5cbi8qIVxuICogdHlwZSB1dGlsaXR5XG4gKi9cblxuZXhwb3J0cy50eXBlID0gcmVxdWlyZSgnLi90eXBlJyk7XG5cbi8qIVxuICogbWVzc2FnZSB1dGlsaXR5XG4gKi9cblxuZXhwb3J0cy5nZXRNZXNzYWdlID0gcmVxdWlyZSgnLi9nZXRNZXNzYWdlJyk7XG5cbi8qIVxuICogYWN0dWFsIHV0aWxpdHlcbiAqL1xuXG5leHBvcnRzLmdldEFjdHVhbCA9IHJlcXVpcmUoJy4vZ2V0QWN0dWFsJyk7XG5cbi8qIVxuICogSW5zcGVjdCB1dGlsXG4gKi9cblxuZXhwb3J0cy5pbnNwZWN0ID0gcmVxdWlyZSgnLi9pbnNwZWN0Jyk7XG5cbi8qIVxuICogT2JqZWN0IERpc3BsYXkgdXRpbFxuICovXG5cbmV4cG9ydHMub2JqRGlzcGxheSA9IHJlcXVpcmUoJy4vb2JqRGlzcGxheScpO1xuXG4vKiFcbiAqIEZsYWcgdXRpbGl0eVxuICovXG5cbmV4cG9ydHMuZmxhZyA9IHJlcXVpcmUoJy4vZmxhZycpO1xuXG4vKiFcbiAqIEZsYWcgdHJhbnNmZXJyaW5nIHV0aWxpdHlcbiAqL1xuXG5leHBvcnRzLnRyYW5zZmVyRmxhZ3MgPSByZXF1aXJlKCcuL3RyYW5zZmVyRmxhZ3MnKTtcblxuLyohXG4gKiBEZWVwIGVxdWFsIHV0aWxpdHlcbiAqL1xuXG5leHBvcnRzLmVxbCA9IHJlcXVpcmUoJ2RlZXAtZXFsJyk7XG5cbi8qIVxuICogRGVlcCBwYXRoIHZhbHVlXG4gKi9cblxuZXhwb3J0cy5nZXRQYXRoVmFsdWUgPSByZXF1aXJlKCcuL2dldFBhdGhWYWx1ZScpO1xuXG4vKiFcbiAqIERlZXAgcGF0aCBpbmZvXG4gKi9cblxuZXhwb3J0cy5nZXRQYXRoSW5mbyA9IHJlcXVpcmUoJy4vZ2V0UGF0aEluZm8nKTtcblxuLyohXG4gKiBDaGVjayBpZiBhIHByb3BlcnR5IGV4aXN0c1xuICovXG5cbmV4cG9ydHMuaGFzUHJvcGVydHkgPSByZXF1aXJlKCcuL2hhc1Byb3BlcnR5Jyk7XG5cbi8qIVxuICogRnVuY3Rpb24gbmFtZVxuICovXG5cbmV4cG9ydHMuZ2V0TmFtZSA9IHJlcXVpcmUoJy4vZ2V0TmFtZScpO1xuXG4vKiFcbiAqIGFkZCBQcm9wZXJ0eVxuICovXG5cbmV4cG9ydHMuYWRkUHJvcGVydHkgPSByZXF1aXJlKCcuL2FkZFByb3BlcnR5Jyk7XG5cbi8qIVxuICogYWRkIE1ldGhvZFxuICovXG5cbmV4cG9ydHMuYWRkTWV0aG9kID0gcmVxdWlyZSgnLi9hZGRNZXRob2QnKTtcblxuLyohXG4gKiBvdmVyd3JpdGUgUHJvcGVydHlcbiAqL1xuXG5leHBvcnRzLm92ZXJ3cml0ZVByb3BlcnR5ID0gcmVxdWlyZSgnLi9vdmVyd3JpdGVQcm9wZXJ0eScpO1xuXG4vKiFcbiAqIG92ZXJ3cml0ZSBNZXRob2RcbiAqL1xuXG5leHBvcnRzLm92ZXJ3cml0ZU1ldGhvZCA9IHJlcXVpcmUoJy4vb3ZlcndyaXRlTWV0aG9kJyk7XG5cbi8qIVxuICogQWRkIGEgY2hhaW5hYmxlIG1ldGhvZFxuICovXG5cbmV4cG9ydHMuYWRkQ2hhaW5hYmxlTWV0aG9kID0gcmVxdWlyZSgnLi9hZGRDaGFpbmFibGVNZXRob2QnKTtcblxuLyohXG4gKiBPdmVyd3JpdGUgY2hhaW5hYmxlIG1ldGhvZFxuICovXG5cbmV4cG9ydHMub3ZlcndyaXRlQ2hhaW5hYmxlTWV0aG9kID0gcmVxdWlyZSgnLi9vdmVyd3JpdGVDaGFpbmFibGVNZXRob2QnKTtcblxuIiwiLy8gVGhpcyBpcyAoYWxtb3N0KSBkaXJlY3RseSBmcm9tIE5vZGUuanMgdXRpbHNcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9ibG9iL2Y4YzMzNWQwY2FmNDdmMTZkMzE0MTNmODlhYTI4ZWRhMzg3OGUzYWEvbGliL3V0aWwuanNcblxudmFyIGdldE5hbWUgPSByZXF1aXJlKCcuL2dldE5hbWUnKTtcbnZhciBnZXRQcm9wZXJ0aWVzID0gcmVxdWlyZSgnLi9nZXRQcm9wZXJ0aWVzJyk7XG52YXIgZ2V0RW51bWVyYWJsZVByb3BlcnRpZXMgPSByZXF1aXJlKCcuL2dldEVudW1lcmFibGVQcm9wZXJ0aWVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gaW5zcGVjdDtcblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtCb29sZWFufSBzaG93SGlkZGVuIEZsYWcgdGhhdCBzaG93cyBoaWRkZW4gKG5vdCBlbnVtZXJhYmxlKVxuICogICAgcHJvcGVydGllcyBvZiBvYmplY3RzLlxuICogQHBhcmFtIHtOdW1iZXJ9IGRlcHRoIERlcHRoIGluIHdoaWNoIHRvIGRlc2NlbmQgaW4gb2JqZWN0LiBEZWZhdWx0IGlzIDIuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGNvbG9ycyBGbGFnIHRvIHR1cm4gb24gQU5TSSBlc2NhcGUgY29kZXMgdG8gY29sb3IgdGhlXG4gKiAgICBvdXRwdXQuIERlZmF1bHQgaXMgZmFsc2UgKG5vIGNvbG9yaW5nKS5cbiAqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMpIHtcbiAgdmFyIGN0eCA9IHtcbiAgICBzaG93SGlkZGVuOiBzaG93SGlkZGVuLFxuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IGZ1bmN0aW9uIChzdHIpIHsgcmV0dXJuIHN0cjsgfVxuICB9O1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosICh0eXBlb2YgZGVwdGggPT09ICd1bmRlZmluZWQnID8gMiA6IGRlcHRoKSk7XG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBvYmplY3QgaXMgYSBET00gZWxlbWVudC5cbnZhciBpc0RPTUVsZW1lbnQgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gIGlmICh0eXBlb2YgSFRNTEVsZW1lbnQgPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG9iamVjdCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBvYmplY3QgJiZcbiAgICAgIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICBvYmplY3Qubm9kZVR5cGUgPT09IDEgJiZcbiAgICAgIHR5cGVvZiBvYmplY3Qubm9kZU5hbWUgPT09ICdzdHJpbmcnO1xuICB9XG59O1xuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZS5pbnNwZWN0ID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzKTtcbiAgICBpZiAodHlwZW9mIHJldCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBJZiB0aGlzIGlzIGEgRE9NIGVsZW1lbnQsIHRyeSB0byBnZXQgdGhlIG91dGVyIEhUTUwuXG4gIGlmIChpc0RPTUVsZW1lbnQodmFsdWUpKSB7XG4gICAgaWYgKCdvdXRlckhUTUwnIGluIHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUub3V0ZXJIVE1MO1xuICAgICAgLy8gVGhpcyB2YWx1ZSBkb2VzIG5vdCBoYXZlIGFuIG91dGVySFRNTCBhdHRyaWJ1dGUsXG4gICAgICAvLyAgIGl0IGNvdWxkIHN0aWxsIGJlIGFuIFhNTCBlbGVtZW50XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEF0dGVtcHQgdG8gc2VyaWFsaXplIGl0XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZG9jdW1lbnQueG1sVmVyc2lvbikge1xuICAgICAgICAgIHZhciB4bWxTZXJpYWxpemVyID0gbmV3IFhNTFNlcmlhbGl6ZXIoKTtcbiAgICAgICAgICByZXR1cm4geG1sU2VyaWFsaXplci5zZXJpYWxpemVUb1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gRmlyZWZveCAxMS0gZG8gbm90IHN1cHBvcnQgb3V0ZXJIVE1MXG4gICAgICAgICAgLy8gICBJdCBkb2VzLCBob3dldmVyLCBzdXBwb3J0IGlubmVySFRNTFxuICAgICAgICAgIC8vICAgVXNlIHRoZSBmb2xsb3dpbmcgdG8gcmVuZGVyIHRoZSBlbGVtZW50XG4gICAgICAgICAgdmFyIG5zID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XG4gICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgJ18nKTtcblxuICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh2YWx1ZS5jbG9uZU5vZGUoZmFsc2UpKTtcbiAgICAgICAgICBodG1sID0gY29udGFpbmVyLmlubmVySFRNTFxuICAgICAgICAgICAgLnJlcGxhY2UoJz48JywgJz4nICsgdmFsdWUuaW5uZXJIVE1MICsgJzwnKTtcbiAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBUaGlzIGNvdWxkIGJlIGEgbm9uLW5hdGl2ZSBET00gaW1wbGVtZW50YXRpb24sXG4gICAgICAgIC8vICAgY29udGludWUgd2l0aCB0aGUgbm9ybWFsIGZsb3c6XG4gICAgICAgIC8vICAgcHJpbnRpbmcgdGhlIGVsZW1lbnQgYXMgaWYgaXQgaXMgYW4gb2JqZWN0LlxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIHZpc2libGVLZXlzID0gZ2V0RW51bWVyYWJsZVByb3BlcnRpZXModmFsdWUpO1xuICB2YXIga2V5cyA9IGN0eC5zaG93SGlkZGVuID8gZ2V0UHJvcGVydGllcyh2YWx1ZSkgOiB2aXNpYmxlS2V5cztcblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIC8vIEluIElFLCBlcnJvcnMgaGF2ZSBhIHNpbmdsZSBgc3RhY2tgIHByb3BlcnR5LCBvciBpZiB0aGV5IGFyZSB2YW5pbGxhIGBFcnJvcmAsXG4gIC8vIGEgYHN0YWNrYCBwbHVzIGBkZXNjcmlwdGlvbmAgcHJvcGVydHk7IGlnbm9yZSB0aG9zZSBmb3IgY29uc2lzdGVuY3kuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCB8fCAoaXNFcnJvcih2YWx1ZSkgJiYgKFxuICAgICAgKGtleXMubGVuZ3RoID09PSAxICYmIGtleXNbMF0gPT09ICdzdGFjaycpIHx8XG4gICAgICAoa2V5cy5sZW5ndGggPT09IDIgJiYga2V5c1swXSA9PT0gJ2Rlc2NyaXB0aW9uJyAmJiBrZXlzWzFdID09PSAnc3RhY2snKVxuICAgICApKSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZhciBuYW1lID0gZ2V0TmFtZSh2YWx1ZSk7XG4gICAgICB2YXIgbmFtZVN1ZmZpeCA9IG5hbWUgPyAnOiAnICsgbmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZVN1ZmZpeCArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIG5hbWUgPSBnZXROYW1lKHZhbHVlKTtcbiAgICB2YXIgbmFtZVN1ZmZpeCA9IG5hbWUgPyAnOiAnICsgbmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuYW1lU3VmZml4ICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBzd2l0Y2ggKHR5cGVvZiB2YWx1ZSkge1xuICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcblxuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG5cbiAgICBjYXNlICdudW1iZXInOlxuICAgICAgaWYgKHZhbHVlID09PSAwICYmICgxL3ZhbHVlKSA9PT0gLUluZmluaXR5KSB7XG4gICAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnLTAnLCAnbnVtYmVyJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuXG4gICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgfVxuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0cjtcbiAgaWYgKHZhbHVlLl9fbG9va3VwR2V0dGVyX18pIHtcbiAgICBpZiAodmFsdWUuX19sb29rdXBHZXR0ZXJfXyhrZXkpKSB7XG4gICAgICBpZiAodmFsdWUuX19sb29rdXBTZXR0ZXJfXyhrZXkpKSB7XG4gICAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHZhbHVlLl9fbG9va3VwU2V0dGVyX18oa2V5KSkge1xuICAgICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAodmlzaWJsZUtleXMuaW5kZXhPZihrZXkpIDwgMCkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZih2YWx1ZVtrZXldKSA8IDApIHtcbiAgICAgIGlmIChyZWN1cnNlVGltZXMgPT09IG51bGwpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZVtrZXldLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgdmFsdWVba2V5XSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAodHlwZW9mIG5hbWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcikgfHxcbiAgICAgICAgICh0eXBlb2YgYXIgPT09ICdvYmplY3QnICYmIG9iamVjdFRvU3RyaW5nKGFyKSA9PT0gJ1tvYmplY3QgQXJyYXldJyk7XG59XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiB0eXBlb2YgcmUgPT09ICdvYmplY3QnICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiB0eXBlb2YgZCA9PT0gJ29iamVjdCcgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiB0eXBlb2YgZSA9PT0gJ29iamVjdCcgJiYgb2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXSc7XG59XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cbiIsIi8qIVxuICogQ2hhaSAtIGZsYWcgdXRpbGl0eVxuICogQ29weXJpZ2h0KGMpIDIwMTItMjAxNCBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGFuY2llc1xuICovXG5cbnZhciBpbnNwZWN0ID0gcmVxdWlyZSgnLi9pbnNwZWN0Jyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbi8qKlxuICogIyMjIC5vYmpEaXNwbGF5IChvYmplY3QpXG4gKlxuICogRGV0ZXJtaW5lcyBpZiBhbiBvYmplY3Qgb3IgYW4gYXJyYXkgbWF0Y2hlc1xuICogY3JpdGVyaWEgdG8gYmUgaW5zcGVjdGVkIGluLWxpbmUgZm9yIGVycm9yXG4gKiBtZXNzYWdlcyBvciBzaG91bGQgYmUgdHJ1bmNhdGVkLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IGphdmFzY3JpcHQgb2JqZWN0IHRvIGluc3BlY3RcbiAqIEBuYW1lIG9iakRpc3BsYXlcbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBzdHIgPSBpbnNwZWN0KG9iailcbiAgICAsIHR5cGUgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKTtcblxuICBpZiAoY29uZmlnLnRydW5jYXRlVGhyZXNob2xkICYmIHN0ci5sZW5ndGggPj0gY29uZmlnLnRydW5jYXRlVGhyZXNob2xkKSB7XG4gICAgaWYgKHR5cGUgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXScpIHtcbiAgICAgIHJldHVybiAhb2JqLm5hbWUgfHwgb2JqLm5hbWUgPT09ICcnXG4gICAgICAgID8gJ1tGdW5jdGlvbl0nXG4gICAgICAgIDogJ1tGdW5jdGlvbjogJyArIG9iai5uYW1lICsgJ10nO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgcmV0dXJuICdbIEFycmF5KCcgKyBvYmoubGVuZ3RoICsgJykgXSc7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnW29iamVjdCBPYmplY3RdJykge1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopXG4gICAgICAgICwga3N0ciA9IGtleXMubGVuZ3RoID4gMlxuICAgICAgICAgID8ga2V5cy5zcGxpY2UoMCwgMikuam9pbignLCAnKSArICcsIC4uLidcbiAgICAgICAgICA6IGtleXMuam9pbignLCAnKTtcbiAgICAgIHJldHVybiAneyBPYmplY3QgKCcgKyBrc3RyICsgJykgfSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn07XG4iLCIvKiFcbiAqIENoYWkgLSBvdmVyd3JpdGVDaGFpbmFibGVNZXRob2QgdXRpbGl0eVxuICogQ29weXJpZ2h0KGMpIDIwMTItMjAxNCBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogIyMjIG92ZXJ3cml0ZUNoYWluYWJsZU1ldGhvZCAoY3R4LCBuYW1lLCBtZXRob2QsIGNoYWluaW5nQmVoYXZpb3IpXG4gKlxuICogT3ZlcndpdGVzIGFuIGFscmVhZHkgZXhpc3RpbmcgY2hhaW5hYmxlIG1ldGhvZFxuICogYW5kIHByb3ZpZGVzIGFjY2VzcyB0byB0aGUgcHJldmlvdXMgZnVuY3Rpb24gb3JcbiAqIHByb3BlcnR5LiAgTXVzdCByZXR1cm4gZnVuY3Rpb25zIHRvIGJlIHVzZWQgZm9yXG4gKiBuYW1lLlxuICpcbiAqICAgICB1dGlscy5vdmVyd3JpdGVDaGFpbmFibGVNZXRob2QoY2hhaS5Bc3NlcnRpb24ucHJvdG90eXBlLCAnbGVuZ3RoJyxcbiAqICAgICAgIGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAqICAgICAgIH1cbiAqICAgICAsIGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAqICAgICAgIH1cbiAqICAgICApO1xuICpcbiAqIENhbiBhbHNvIGJlIGFjY2Vzc2VkIGRpcmVjdGx5IGZyb20gYGNoYWkuQXNzZXJ0aW9uYC5cbiAqXG4gKiAgICAgY2hhaS5Bc3NlcnRpb24ub3ZlcndyaXRlQ2hhaW5hYmxlTWV0aG9kKCdmb28nLCBmbiwgZm4pO1xuICpcbiAqIFRoZW4gY2FuIGJlIHVzZWQgYXMgYW55IG90aGVyIGFzc2VydGlvbi5cbiAqXG4gKiAgICAgZXhwZWN0KG15Rm9vKS50by5oYXZlLmxlbmd0aCgzKTtcbiAqICAgICBleHBlY3QobXlGb28pLnRvLmhhdmUubGVuZ3RoLmFib3ZlKDMpO1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjdHggb2JqZWN0IHdob3NlIG1ldGhvZCAvIHByb3BlcnR5IGlzIHRvIGJlIG92ZXJ3cml0dGVuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBvZiBtZXRob2QgLyBwcm9wZXJ0eSB0byBvdmVyd3JpdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG1ldGhvZCBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBmdW5jdGlvbiB0byBiZSB1c2VkIGZvciBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjaGFpbmluZ0JlaGF2aW9yIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIGZ1bmN0aW9uIHRvIGJlIHVzZWQgZm9yIHByb3BlcnR5XG4gKiBAbmFtZSBvdmVyd3JpdGVDaGFpbmFibGVNZXRob2RcbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3R4LCBuYW1lLCBtZXRob2QsIGNoYWluaW5nQmVoYXZpb3IpIHtcbiAgdmFyIGNoYWluYWJsZUJlaGF2aW9yID0gY3R4Ll9fbWV0aG9kc1tuYW1lXTtcblxuICB2YXIgX2NoYWluaW5nQmVoYXZpb3IgPSBjaGFpbmFibGVCZWhhdmlvci5jaGFpbmluZ0JlaGF2aW9yO1xuICBjaGFpbmFibGVCZWhhdmlvci5jaGFpbmluZ0JlaGF2aW9yID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHQgPSBjaGFpbmluZ0JlaGF2aW9yKF9jaGFpbmluZ0JlaGF2aW9yKS5jYWxsKHRoaXMpO1xuICAgIHJldHVybiByZXN1bHQgPT09IHVuZGVmaW5lZCA/IHRoaXMgOiByZXN1bHQ7XG4gIH07XG5cbiAgdmFyIF9tZXRob2QgPSBjaGFpbmFibGVCZWhhdmlvci5tZXRob2Q7XG4gIGNoYWluYWJsZUJlaGF2aW9yLm1ldGhvZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVzdWx0ID0gbWV0aG9kKF9tZXRob2QpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHJlc3VsdCA9PT0gdW5kZWZpbmVkID8gdGhpcyA6IHJlc3VsdDtcbiAgfTtcbn07XG4iLCIvKiFcbiAqIENoYWkgLSBvdmVyd3JpdGVNZXRob2QgdXRpbGl0eVxuICogQ29weXJpZ2h0KGMpIDIwMTItMjAxNCBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogIyMjIG92ZXJ3cml0ZU1ldGhvZCAoY3R4LCBuYW1lLCBmbilcbiAqXG4gKiBPdmVyd2l0ZXMgYW4gYWxyZWFkeSBleGlzdGluZyBtZXRob2QgYW5kIHByb3ZpZGVzXG4gKiBhY2Nlc3MgdG8gcHJldmlvdXMgZnVuY3Rpb24uIE11c3QgcmV0dXJuIGZ1bmN0aW9uXG4gKiB0byBiZSB1c2VkIGZvciBuYW1lLlxuICpcbiAqICAgICB1dGlscy5vdmVyd3JpdGVNZXRob2QoY2hhaS5Bc3NlcnRpb24ucHJvdG90eXBlLCAnZXF1YWwnLCBmdW5jdGlvbiAoX3N1cGVyKSB7XG4gKiAgICAgICByZXR1cm4gZnVuY3Rpb24gKHN0cikge1xuICogICAgICAgICB2YXIgb2JqID0gdXRpbHMuZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gKiAgICAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBGb28pIHtcbiAqICAgICAgICAgICBuZXcgY2hhaS5Bc3NlcnRpb24ob2JqLnZhbHVlKS50by5lcXVhbChzdHIpO1xuICogICAgICAgICB9IGVsc2Uge1xuICogICAgICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICogICAgICAgICB9XG4gKiAgICAgICB9XG4gKiAgICAgfSk7XG4gKlxuICogQ2FuIGFsc28gYmUgYWNjZXNzZWQgZGlyZWN0bHkgZnJvbSBgY2hhaS5Bc3NlcnRpb25gLlxuICpcbiAqICAgICBjaGFpLkFzc2VydGlvbi5vdmVyd3JpdGVNZXRob2QoJ2ZvbycsIGZuKTtcbiAqXG4gKiBUaGVuIGNhbiBiZSB1c2VkIGFzIGFueSBvdGhlciBhc3NlcnRpb24uXG4gKlxuICogICAgIGV4cGVjdChteUZvbykudG8uZXF1YWwoJ2JhcicpO1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjdHggb2JqZWN0IHdob3NlIG1ldGhvZCBpcyB0byBiZSBvdmVyd3JpdHRlblxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgb2YgbWV0aG9kIHRvIG92ZXJ3cml0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWV0aG9kIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIGZ1bmN0aW9uIHRvIGJlIHVzZWQgZm9yIG5hbWVcbiAqIEBuYW1lIG92ZXJ3cml0ZU1ldGhvZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjdHgsIG5hbWUsIG1ldGhvZCkge1xuICB2YXIgX21ldGhvZCA9IGN0eFtuYW1lXVxuICAgICwgX3N1cGVyID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfTtcblxuICBpZiAoX21ldGhvZCAmJiAnZnVuY3Rpb24nID09PSB0eXBlb2YgX21ldGhvZClcbiAgICBfc3VwZXIgPSBfbWV0aG9kO1xuXG4gIGN0eFtuYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVzdWx0ID0gbWV0aG9kKF9zdXBlcikuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gcmVzdWx0ID09PSB1bmRlZmluZWQgPyB0aGlzIDogcmVzdWx0O1xuICB9XG59O1xuIiwiLyohXG4gKiBDaGFpIC0gb3ZlcndyaXRlUHJvcGVydHkgdXRpbGl0eVxuICogQ29weXJpZ2h0KGMpIDIwMTItMjAxNCBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogIyMjIG92ZXJ3cml0ZVByb3BlcnR5IChjdHgsIG5hbWUsIGZuKVxuICpcbiAqIE92ZXJ3aXRlcyBhbiBhbHJlYWR5IGV4aXN0aW5nIHByb3BlcnR5IGdldHRlciBhbmQgcHJvdmlkZXNcbiAqIGFjY2VzcyB0byBwcmV2aW91cyB2YWx1ZS4gTXVzdCByZXR1cm4gZnVuY3Rpb24gdG8gdXNlIGFzIGdldHRlci5cbiAqXG4gKiAgICAgdXRpbHMub3ZlcndyaXRlUHJvcGVydHkoY2hhaS5Bc3NlcnRpb24ucHJvdG90eXBlLCAnb2snLCBmdW5jdGlvbiAoX3N1cGVyKSB7XG4gKiAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICogICAgICAgICB2YXIgb2JqID0gdXRpbHMuZmxhZyh0aGlzLCAnb2JqZWN0Jyk7XG4gKiAgICAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBGb28pIHtcbiAqICAgICAgICAgICBuZXcgY2hhaS5Bc3NlcnRpb24ob2JqLm5hbWUpLnRvLmVxdWFsKCdiYXInKTtcbiAqICAgICAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAqICAgICAgICAgfVxuICogICAgICAgfVxuICogICAgIH0pO1xuICpcbiAqXG4gKiBDYW4gYWxzbyBiZSBhY2Nlc3NlZCBkaXJlY3RseSBmcm9tIGBjaGFpLkFzc2VydGlvbmAuXG4gKlxuICogICAgIGNoYWkuQXNzZXJ0aW9uLm92ZXJ3cml0ZVByb3BlcnR5KCdmb28nLCBmbik7XG4gKlxuICogVGhlbiBjYW4gYmUgdXNlZCBhcyBhbnkgb3RoZXIgYXNzZXJ0aW9uLlxuICpcbiAqICAgICBleHBlY3QobXlGb28pLnRvLmJlLm9rO1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjdHggb2JqZWN0IHdob3NlIHByb3BlcnR5IGlzIHRvIGJlIG92ZXJ3cml0dGVuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBvZiBwcm9wZXJ0eSB0byBvdmVyd3JpdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGdldHRlciBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBnZXR0ZXIgZnVuY3Rpb24gdG8gYmUgdXNlZCBmb3IgbmFtZVxuICogQG5hbWUgb3ZlcndyaXRlUHJvcGVydHlcbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3R4LCBuYW1lLCBnZXR0ZXIpIHtcbiAgdmFyIF9nZXQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGN0eCwgbmFtZSlcbiAgICAsIF9zdXBlciA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gIGlmIChfZ2V0ICYmICdmdW5jdGlvbicgPT09IHR5cGVvZiBfZ2V0LmdldClcbiAgICBfc3VwZXIgPSBfZ2V0LmdldFxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjdHgsIG5hbWUsXG4gICAgeyBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGdldHRlcihfc3VwZXIpLmNhbGwodGhpcyk7XG4gICAgICAgIHJldHVybiByZXN1bHQgPT09IHVuZGVmaW5lZCA/IHRoaXMgOiByZXN1bHQ7XG4gICAgICB9XG4gICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgfSk7XG59O1xuIiwiLyohXG4gKiBDaGFpIC0gdGVzdCB1dGlsaXR5XG4gKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE0IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kYW5jaWVzXG4gKi9cblxudmFyIGZsYWcgPSByZXF1aXJlKCcuL2ZsYWcnKTtcblxuLyoqXG4gKiAjIHRlc3Qob2JqZWN0LCBleHByZXNzaW9uKVxuICpcbiAqIFRlc3QgYW5kIG9iamVjdCBmb3IgZXhwcmVzc2lvbi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IChjb25zdHJ1Y3RlZCBBc3NlcnRpb24pXG4gKiBAcGFyYW0ge0FyZ3VtZW50c30gY2hhaS5Bc3NlcnRpb24ucHJvdG90eXBlLmFzc2VydCBhcmd1bWVudHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmosIGFyZ3MpIHtcbiAgdmFyIG5lZ2F0ZSA9IGZsYWcob2JqLCAnbmVnYXRlJylcbiAgICAsIGV4cHIgPSBhcmdzWzBdO1xuICByZXR1cm4gbmVnYXRlID8gIWV4cHIgOiBleHByO1xufTtcbiIsIi8qIVxuICogQ2hhaSAtIHRyYW5zZmVyRmxhZ3MgdXRpbGl0eVxuICogQ29weXJpZ2h0KGMpIDIwMTItMjAxNCBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogIyMjIHRyYW5zZmVyRmxhZ3MoYXNzZXJ0aW9uLCBvYmplY3QsIGluY2x1ZGVBbGwgPSB0cnVlKVxuICpcbiAqIFRyYW5zZmVyIGFsbCB0aGUgZmxhZ3MgZm9yIGBhc3NlcnRpb25gIHRvIGBvYmplY3RgLiBJZlxuICogYGluY2x1ZGVBbGxgIGlzIHNldCB0byBgZmFsc2VgLCB0aGVuIHRoZSBiYXNlIENoYWlcbiAqIGFzc2VydGlvbiBmbGFncyAobmFtZWx5IGBvYmplY3RgLCBgc3NmaWAsIGFuZCBgbWVzc2FnZWApXG4gKiB3aWxsIG5vdCBiZSB0cmFuc2ZlcnJlZC5cbiAqXG4gKlxuICogICAgIHZhciBuZXdBc3NlcnRpb24gPSBuZXcgQXNzZXJ0aW9uKCk7XG4gKiAgICAgdXRpbHMudHJhbnNmZXJGbGFncyhhc3NlcnRpb24sIG5ld0Fzc2VydGlvbik7XG4gKlxuICogICAgIHZhciBhbm90aGVyQXNzZXJpdG9uID0gbmV3IEFzc2VydGlvbihteU9iaik7XG4gKiAgICAgdXRpbHMudHJhbnNmZXJGbGFncyhhc3NlcnRpb24sIGFub3RoZXJBc3NlcnRpb24sIGZhbHNlKTtcbiAqXG4gKiBAcGFyYW0ge0Fzc2VydGlvbn0gYXNzZXJ0aW9uIHRoZSBhc3NlcnRpb24gdG8gdHJhbnNmZXIgdGhlIGZsYWdzIGZyb21cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgdGhlIG9iamVjdCB0byB0cmFuc2ZlciB0aGUgZmxhZ3MgdG87IHVzdWFsbHkgYSBuZXcgYXNzZXJ0aW9uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluY2x1ZGVBbGxcbiAqIEBuYW1lIHRyYW5zZmVyRmxhZ3NcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFzc2VydGlvbiwgb2JqZWN0LCBpbmNsdWRlQWxsKSB7XG4gIHZhciBmbGFncyA9IGFzc2VydGlvbi5fX2ZsYWdzIHx8IChhc3NlcnRpb24uX19mbGFncyA9IE9iamVjdC5jcmVhdGUobnVsbCkpO1xuXG4gIGlmICghb2JqZWN0Ll9fZmxhZ3MpIHtcbiAgICBvYmplY3QuX19mbGFncyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIH1cblxuICBpbmNsdWRlQWxsID0gYXJndW1lbnRzLmxlbmd0aCA9PT0gMyA/IGluY2x1ZGVBbGwgOiB0cnVlO1xuXG4gIGZvciAodmFyIGZsYWcgaW4gZmxhZ3MpIHtcbiAgICBpZiAoaW5jbHVkZUFsbCB8fFxuICAgICAgICAoZmxhZyAhPT0gJ29iamVjdCcgJiYgZmxhZyAhPT0gJ3NzZmknICYmIGZsYWcgIT0gJ21lc3NhZ2UnKSkge1xuICAgICAgb2JqZWN0Ll9fZmxhZ3NbZmxhZ10gPSBmbGFnc1tmbGFnXTtcbiAgICB9XG4gIH1cbn07XG4iLCIvKiFcbiAqIENoYWkgLSB0eXBlIHV0aWxpdHlcbiAqIENvcHlyaWdodChjKSAyMDEyLTIwMTQgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4vKiFcbiAqIERldGVjdGFibGUgamF2YXNjcmlwdCBuYXRpdmVzXG4gKi9cblxudmFyIG5hdGl2ZXMgPSB7XG4gICAgJ1tvYmplY3QgQXJndW1lbnRzXSc6ICdhcmd1bWVudHMnXG4gICwgJ1tvYmplY3QgQXJyYXldJzogJ2FycmF5J1xuICAsICdbb2JqZWN0IERhdGVdJzogJ2RhdGUnXG4gICwgJ1tvYmplY3QgRnVuY3Rpb25dJzogJ2Z1bmN0aW9uJ1xuICAsICdbb2JqZWN0IE51bWJlcl0nOiAnbnVtYmVyJ1xuICAsICdbb2JqZWN0IFJlZ0V4cF0nOiAncmVnZXhwJ1xuICAsICdbb2JqZWN0IFN0cmluZ10nOiAnc3RyaW5nJ1xufTtcblxuLyoqXG4gKiAjIyMgdHlwZShvYmplY3QpXG4gKlxuICogQmV0dGVyIGltcGxlbWVudGF0aW9uIG9mIGB0eXBlb2ZgIGRldGVjdGlvbiB0aGF0IGNhblxuICogYmUgdXNlZCBjcm9zcy1icm93c2VyLiBIYW5kbGVzIHRoZSBpbmNvbnNpc3RlbmNpZXMgb2ZcbiAqIEFycmF5LCBgbnVsbGAsIGFuZCBgdW5kZWZpbmVkYCBkZXRlY3Rpb24uXG4gKlxuICogICAgIHV0aWxzLnR5cGUoe30pIC8vICdvYmplY3QnXG4gKiAgICAgdXRpbHMudHlwZShudWxsKSAvLyBgbnVsbCdcbiAqICAgICB1dGlscy50eXBlKHVuZGVmaW5lZCkgLy8gYHVuZGVmaW5lZGBcbiAqICAgICB1dGlscy50eXBlKFtdKSAvLyBgYXJyYXlgXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gb2JqZWN0IHRvIGRldGVjdCB0eXBlIG9mXG4gKiBAbmFtZSB0eXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIHN0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopO1xuICBpZiAobmF0aXZlc1tzdHJdKSByZXR1cm4gbmF0aXZlc1tzdHJdO1xuICBpZiAob2JqID09PSBudWxsKSByZXR1cm4gJ251bGwnO1xuICBpZiAob2JqID09PSB1bmRlZmluZWQpIHJldHVybiAndW5kZWZpbmVkJztcbiAgaWYgKG9iaiA9PT0gT2JqZWN0KG9iaikpIHJldHVybiAnb2JqZWN0JztcbiAgcmV0dXJuIHR5cGVvZiBvYmo7XG59O1xuIiwiLyohXG4gKiBhc3NlcnRpb24tZXJyb3JcbiAqIENvcHlyaWdodChjKSAyMDEzIEpha2UgTHVlciA8amFrZUBxdWFsaWFuY3kuY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyohXG4gKiBSZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHdpbGwgY29weSBwcm9wZXJ0aWVzIGZyb21cbiAqIG9uZSBvYmplY3QgdG8gYW5vdGhlciBleGNsdWRpbmcgYW55IG9yaWdpbmFsbHlcbiAqIGxpc3RlZC4gUmV0dXJuZWQgZnVuY3Rpb24gd2lsbCBjcmVhdGUgYSBuZXcgYHt9YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXhjbHVkZWQgcHJvcGVydGllcyAuLi5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5cbmZ1bmN0aW9uIGV4Y2x1ZGUgKCkge1xuICB2YXIgZXhjbHVkZXMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgZnVuY3Rpb24gZXhjbHVkZVByb3BzIChyZXMsIG9iaikge1xuICAgIE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBpZiAoIX5leGNsdWRlcy5pbmRleE9mKGtleSkpIHJlc1trZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gZXh0ZW5kRXhjbHVkZSAoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICwgaSA9IDBcbiAgICAgICwgcmVzID0ge307XG5cbiAgICBmb3IgKDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGV4Y2x1ZGVQcm9wcyhyZXMsIGFyZ3NbaV0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH07XG59O1xuXG4vKiFcbiAqIFByaW1hcnkgRXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQXNzZXJ0aW9uRXJyb3I7XG5cbi8qKlxuICogIyMjIEFzc2VydGlvbkVycm9yXG4gKlxuICogQW4gZXh0ZW5zaW9uIG9mIHRoZSBKYXZhU2NyaXB0IGBFcnJvcmAgY29uc3RydWN0b3IgZm9yXG4gKiBhc3NlcnRpb24gYW5kIHZhbGlkYXRpb24gc2NlbmFyaW9zLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gKiBAcGFyYW0ge09iamVjdH0gcHJvcGVydGllcyB0byBpbmNsdWRlIChvcHRpb25hbClcbiAqIEBwYXJhbSB7Y2FsbGVlfSBzdGFydCBzdGFjayBmdW5jdGlvbiAob3B0aW9uYWwpXG4gKi9cblxuZnVuY3Rpb24gQXNzZXJ0aW9uRXJyb3IgKG1lc3NhZ2UsIF9wcm9wcywgc3NmKSB7XG4gIHZhciBleHRlbmQgPSBleGNsdWRlKCduYW1lJywgJ21lc3NhZ2UnLCAnc3RhY2snLCAnY29uc3RydWN0b3InLCAndG9KU09OJylcbiAgICAsIHByb3BzID0gZXh0ZW5kKF9wcm9wcyB8fCB7fSk7XG5cbiAgLy8gZGVmYXVsdCB2YWx1ZXNcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZSB8fCAnVW5zcGVjaWZpZWQgQXNzZXJ0aW9uRXJyb3InO1xuICB0aGlzLnNob3dEaWZmID0gZmFsc2U7XG5cbiAgLy8gY29weSBmcm9tIHByb3BlcnRpZXNcbiAgZm9yICh2YXIga2V5IGluIHByb3BzKSB7XG4gICAgdGhpc1trZXldID0gcHJvcHNba2V5XTtcbiAgfVxuXG4gIC8vIGNhcHR1cmUgc3RhY2sgdHJhY2VcbiAgc3NmID0gc3NmIHx8IGFyZ3VtZW50cy5jYWxsZWU7XG4gIGlmIChzc2YgJiYgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBzc2YpO1xuICB9XG59XG5cbi8qIVxuICogSW5oZXJpdCBmcm9tIEVycm9yLnByb3RvdHlwZVxuICovXG5cbkFzc2VydGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblxuLyohXG4gKiBTdGF0aWNhbGx5IHNldCBuYW1lXG4gKi9cblxuQXNzZXJ0aW9uRXJyb3IucHJvdG90eXBlLm5hbWUgPSAnQXNzZXJ0aW9uRXJyb3InO1xuXG4vKiFcbiAqIEVuc3VyZSBjb3JyZWN0IGNvbnN0cnVjdG9yXG4gKi9cblxuQXNzZXJ0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQXNzZXJ0aW9uRXJyb3I7XG5cbi8qKlxuICogQWxsb3cgZXJyb3JzIHRvIGJlIGNvbnZlcnRlZCB0byBKU09OIGZvciBzdGF0aWMgdHJhbnNmZXIuXG4gKlxuICogQHBhcmFtIHtCb29sZWFufSBpbmNsdWRlIHN0YWNrIChkZWZhdWx0OiBgdHJ1ZWApXG4gKiBAcmV0dXJuIHtPYmplY3R9IG9iamVjdCB0aGF0IGNhbiBiZSBgSlNPTi5zdHJpbmdpZnlgXG4gKi9cblxuQXNzZXJ0aW9uRXJyb3IucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIChzdGFjaykge1xuICB2YXIgZXh0ZW5kID0gZXhjbHVkZSgnY29uc3RydWN0b3InLCAndG9KU09OJywgJ3N0YWNrJylcbiAgICAsIHByb3BzID0gZXh0ZW5kKHsgbmFtZTogdGhpcy5uYW1lIH0sIHRoaXMpO1xuXG4gIC8vIGluY2x1ZGUgc3RhY2sgaWYgZXhpc3RzIGFuZCBub3QgdHVybmVkIG9mZlxuICBpZiAoZmFsc2UgIT09IHN0YWNrICYmIHRoaXMuc3RhY2spIHtcbiAgICBwcm9wcy5zdGFjayA9IHRoaXMuc3RhY2s7XG4gIH1cblxuICByZXR1cm4gcHJvcHM7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9lcWwnKTtcbiIsIi8qIVxuICogZGVlcC1lcWxcbiAqIENvcHlyaWdodChjKSAyMDEzIEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzXG4gKi9cblxudmFyIHR5cGUgPSByZXF1aXJlKCd0eXBlLWRldGVjdCcpO1xuXG4vKiFcbiAqIEJ1ZmZlci5pc0J1ZmZlciBicm93c2VyIHNoaW1cbiAqL1xuXG52YXIgQnVmZmVyO1xudHJ5IHsgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyOyB9XG5jYXRjaChleCkge1xuICBCdWZmZXIgPSB7fTtcbiAgQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfVxufVxuXG4vKiFcbiAqIFByaW1hcnkgRXhwb3J0XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBkZWVwRXF1YWw7XG5cbi8qKlxuICogQXNzZXJ0IHN1cGVyLXN0cmljdCAoZWdhbCkgZXF1YWxpdHkgYmV0d2VlblxuICogdHdvIG9iamVjdHMgb2YgYW55IHR5cGUuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gYVxuICogQHBhcmFtIHtNaXhlZH0gYlxuICogQHBhcmFtIHtBcnJheX0gbWVtb2lzZWQgKG9wdGlvbmFsKVxuICogQHJldHVybiB7Qm9vbGVhbn0gZXF1YWwgbWF0Y2hcbiAqL1xuXG5mdW5jdGlvbiBkZWVwRXF1YWwoYSwgYiwgbSkge1xuICBpZiAoc2FtZVZhbHVlKGEsIGIpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoJ2RhdGUnID09PSB0eXBlKGEpKSB7XG4gICAgcmV0dXJuIGRhdGVFcXVhbChhLCBiKTtcbiAgfSBlbHNlIGlmICgncmVnZXhwJyA9PT0gdHlwZShhKSkge1xuICAgIHJldHVybiByZWdleHBFcXVhbChhLCBiKTtcbiAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoYSkpIHtcbiAgICByZXR1cm4gYnVmZmVyRXF1YWwoYSwgYik7XG4gIH0gZWxzZSBpZiAoJ2FyZ3VtZW50cycgPT09IHR5cGUoYSkpIHtcbiAgICByZXR1cm4gYXJndW1lbnRzRXF1YWwoYSwgYiwgbSk7XG4gIH0gZWxzZSBpZiAoIXR5cGVFcXVhbChhLCBiKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmICgoJ29iamVjdCcgIT09IHR5cGUoYSkgJiYgJ29iamVjdCcgIT09IHR5cGUoYikpXG4gICYmICgnYXJyYXknICE9PSB0eXBlKGEpICYmICdhcnJheScgIT09IHR5cGUoYikpKSB7XG4gICAgcmV0dXJuIHNhbWVWYWx1ZShhLCBiKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb2JqZWN0RXF1YWwoYSwgYiwgbSk7XG4gIH1cbn1cblxuLyohXG4gKiBTdHJpY3QgKGVnYWwpIGVxdWFsaXR5IHRlc3QuIEVuc3VyZXMgdGhhdCBOYU4gYWx3YXlzXG4gKiBlcXVhbHMgTmFOIGFuZCBgLTBgIGRvZXMgbm90IGVxdWFsIGArMGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gYVxuICogQHBhcmFtIHtNaXhlZH0gYlxuICogQHJldHVybiB7Qm9vbGVhbn0gZXF1YWwgbWF0Y2hcbiAqL1xuXG5mdW5jdGlvbiBzYW1lVmFsdWUoYSwgYikge1xuICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT09IDEgLyBiO1xuICByZXR1cm4gYSAhPT0gYSAmJiBiICE9PSBiO1xufVxuXG4vKiFcbiAqIENvbXBhcmUgdGhlIHR5cGVzIG9mIHR3byBnaXZlbiBvYmplY3RzIGFuZFxuICogcmV0dXJuIGlmIHRoZXkgYXJlIGVxdWFsLiBOb3RlIHRoYXQgYW4gQXJyYXlcbiAqIGhhcyBhIHR5cGUgb2YgYGFycmF5YCAobm90IGBvYmplY3RgKSBhbmQgYXJndW1lbnRzXG4gKiBoYXZlIGEgdHlwZSBvZiBgYXJndW1lbnRzYCAobm90IGBhcnJheWAvYG9iamVjdGApLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IGFcbiAqIEBwYXJhbSB7TWl4ZWR9IGJcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHJlc3VsdFxuICovXG5cbmZ1bmN0aW9uIHR5cGVFcXVhbChhLCBiKSB7XG4gIHJldHVybiB0eXBlKGEpID09PSB0eXBlKGIpO1xufVxuXG4vKiFcbiAqIENvbXBhcmUgdHdvIERhdGUgb2JqZWN0cyBieSBhc3NlcnRpbmcgdGhhdFxuICogdGhlIHRpbWUgdmFsdWVzIGFyZSBlcXVhbCB1c2luZyBgc2F2ZVZhbHVlYC5cbiAqXG4gKiBAcGFyYW0ge0RhdGV9IGFcbiAqIEBwYXJhbSB7RGF0ZX0gYlxuICogQHJldHVybiB7Qm9vbGVhbn0gcmVzdWx0XG4gKi9cblxuZnVuY3Rpb24gZGF0ZUVxdWFsKGEsIGIpIHtcbiAgaWYgKCdkYXRlJyAhPT0gdHlwZShiKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gc2FtZVZhbHVlKGEuZ2V0VGltZSgpLCBiLmdldFRpbWUoKSk7XG59XG5cbi8qIVxuICogQ29tcGFyZSB0d28gcmVndWxhciBleHByZXNzaW9ucyBieSBjb252ZXJ0aW5nIHRoZW1cbiAqIHRvIHN0cmluZyBhbmQgY2hlY2tpbmcgZm9yIGBzYW1lVmFsdWVgLlxuICpcbiAqIEBwYXJhbSB7UmVnRXhwfSBhXG4gKiBAcGFyYW0ge1JlZ0V4cH0gYlxuICogQHJldHVybiB7Qm9vbGVhbn0gcmVzdWx0XG4gKi9cblxuZnVuY3Rpb24gcmVnZXhwRXF1YWwoYSwgYikge1xuICBpZiAoJ3JlZ2V4cCcgIT09IHR5cGUoYikpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHNhbWVWYWx1ZShhLnRvU3RyaW5nKCksIGIudG9TdHJpbmcoKSk7XG59XG5cbi8qIVxuICogQXNzZXJ0IGRlZXAgZXF1YWxpdHkgb2YgdHdvIGBhcmd1bWVudHNgIG9iamVjdHMuXG4gKiBVbmZvcnR1bmF0ZWx5LCB0aGVzZSBtdXN0IGJlIHNsaWNlZCB0byBhcnJheXNcbiAqIHByaW9yIHRvIHRlc3QgdG8gZW5zdXJlIG5vIGJhZCBiZWhhdmlvci5cbiAqXG4gKiBAcGFyYW0ge0FyZ3VtZW50c30gYVxuICogQHBhcmFtIHtBcmd1bWVudHN9IGJcbiAqIEBwYXJhbSB7QXJyYXl9IG1lbW9pemUgKG9wdGlvbmFsKVxuICogQHJldHVybiB7Qm9vbGVhbn0gcmVzdWx0XG4gKi9cblxuZnVuY3Rpb24gYXJndW1lbnRzRXF1YWwoYSwgYiwgbSkge1xuICBpZiAoJ2FyZ3VtZW50cycgIT09IHR5cGUoYikpIHJldHVybiBmYWxzZTtcbiAgYSA9IFtdLnNsaWNlLmNhbGwoYSk7XG4gIGIgPSBbXS5zbGljZS5jYWxsKGIpO1xuICByZXR1cm4gZGVlcEVxdWFsKGEsIGIsIG0pO1xufVxuXG4vKiFcbiAqIEdldCBlbnVtZXJhYmxlIHByb3BlcnRpZXMgb2YgYSBnaXZlbiBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGFcbiAqIEByZXR1cm4ge0FycmF5fSBwcm9wZXJ0eSBuYW1lc1xuICovXG5cbmZ1bmN0aW9uIGVudW1lcmFibGUoYSkge1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBhKSByZXMucHVzaChrZXkpO1xuICByZXR1cm4gcmVzO1xufVxuXG4vKiFcbiAqIFNpbXBsZSBlcXVhbGl0eSBmb3IgZmxhdCBpdGVyYWJsZSBvYmplY3RzXG4gKiBzdWNoIGFzIEFycmF5cyBvciBOb2RlLmpzIGJ1ZmZlcnMuXG4gKlxuICogQHBhcmFtIHtJdGVyYWJsZX0gYVxuICogQHBhcmFtIHtJdGVyYWJsZX0gYlxuICogQHJldHVybiB7Qm9vbGVhbn0gcmVzdWx0XG4gKi9cblxuZnVuY3Rpb24gaXRlcmFibGVFcXVhbChhLCBiKSB7XG4gIGlmIChhLmxlbmd0aCAhPT0gIGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGkgPSAwO1xuICB2YXIgbWF0Y2ggPSB0cnVlO1xuXG4gIGZvciAoOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICBtYXRjaCA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoO1xufVxuXG4vKiFcbiAqIEV4dGVuc2lvbiB0byBgaXRlcmFibGVFcXVhbGAgc3BlY2lmaWNhbGx5XG4gKiBmb3IgTm9kZS5qcyBCdWZmZXJzLlxuICpcbiAqIEBwYXJhbSB7QnVmZmVyfSBhXG4gKiBAcGFyYW0ge01peGVkfSBiXG4gKiBAcmV0dXJuIHtCb29sZWFufSByZXN1bHRcbiAqL1xuXG5mdW5jdGlvbiBidWZmZXJFcXVhbChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBpdGVyYWJsZUVxdWFsKGEsIGIpO1xufVxuXG4vKiFcbiAqIEJsb2NrIGZvciBgb2JqZWN0RXF1YWxgIGVuc3VyaW5nIG5vbi1leGlzdGluZ1xuICogdmFsdWVzIGRvbid0IGdldCBpbi5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSBvYmplY3RcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHJlc3VsdFxuICovXG5cbmZ1bmN0aW9uIGlzVmFsdWUoYSkge1xuICByZXR1cm4gYSAhPT0gbnVsbCAmJiBhICE9PSB1bmRlZmluZWQ7XG59XG5cbi8qIVxuICogUmVjdXJzaXZlbHkgY2hlY2sgdGhlIGVxdWFsaXR5IG9mIHR3byBvYmplY3RzLlxuICogT25jZSBiYXNpYyBzYW1lbmVzcyBoYXMgYmVlbiBlc3RhYmxpc2hlZCBpdCB3aWxsXG4gKiBkZWZlciB0byBgZGVlcEVxdWFsYCBmb3IgZWFjaCBlbnVtZXJhYmxlIGtleVxuICogaW4gdGhlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSBhXG4gKiBAcGFyYW0ge01peGVkfSBiXG4gKiBAcmV0dXJuIHtCb29sZWFufSByZXN1bHRcbiAqL1xuXG5mdW5jdGlvbiBvYmplY3RFcXVhbChhLCBiLCBtKSB7XG4gIGlmICghaXNWYWx1ZShhKSB8fCAhaXNWYWx1ZShiKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChhLnByb3RvdHlwZSAhPT0gYi5wcm90b3R5cGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB2YXIgaTtcbiAgaWYgKG0pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKChtW2ldWzBdID09PSBhICYmIG1baV1bMV0gPT09IGIpXG4gICAgICB8fCAgKG1baV1bMF0gPT09IGIgJiYgbVtpXVsxXSA9PT0gYSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG0gPSBbXTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgdmFyIGthID0gZW51bWVyYWJsZShhKTtcbiAgICB2YXIga2IgPSBlbnVtZXJhYmxlKGIpO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuXG4gIGlmICghaXRlcmFibGVFcXVhbChrYSwga2IpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbS5wdXNoKFsgYSwgYiBdKTtcblxuICB2YXIga2V5O1xuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGtleSA9IGthW2ldO1xuICAgIGlmICghZGVlcEVxdWFsKGFba2V5XSwgYltrZXldLCBtKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi90eXBlJyk7XG4iLCIvKiFcbiAqIHR5cGUtZGV0ZWN0XG4gKiBDb3B5cmlnaHQoYykgMjAxMyBqYWtlIGx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qIVxuICogUHJpbWFyeSBFeHBvcnRzXG4gKi9cblxudmFyIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGdldFR5cGU7XG5cbi8qIVxuICogRGV0ZWN0YWJsZSBqYXZhc2NyaXB0IG5hdGl2ZXNcbiAqL1xuXG52YXIgbmF0aXZlcyA9IHtcbiAgICAnW29iamVjdCBBcnJheV0nOiAnYXJyYXknXG4gICwgJ1tvYmplY3QgUmVnRXhwXSc6ICdyZWdleHAnXG4gICwgJ1tvYmplY3QgRnVuY3Rpb25dJzogJ2Z1bmN0aW9uJ1xuICAsICdbb2JqZWN0IEFyZ3VtZW50c10nOiAnYXJndW1lbnRzJ1xuICAsICdbb2JqZWN0IERhdGVdJzogJ2RhdGUnXG59O1xuXG4vKipcbiAqICMjIyB0eXBlT2YgKG9iailcbiAqXG4gKiBVc2Ugc2V2ZXJhbCBkaWZmZXJlbnQgdGVjaG5pcXVlcyB0byBkZXRlcm1pbmVcbiAqIHRoZSB0eXBlIG9mIG9iamVjdCBiZWluZyB0ZXN0ZWQuXG4gKlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IG9iamVjdFxuICogQHJldHVybiB7U3RyaW5nfSBvYmplY3QgdHlwZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBnZXRUeXBlIChvYmopIHtcbiAgdmFyIHN0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopO1xuICBpZiAobmF0aXZlc1tzdHJdKSByZXR1cm4gbmF0aXZlc1tzdHJdO1xuICBpZiAob2JqID09PSBudWxsKSByZXR1cm4gJ251bGwnO1xuICBpZiAob2JqID09PSB1bmRlZmluZWQpIHJldHVybiAndW5kZWZpbmVkJztcbiAgaWYgKG9iaiA9PT0gT2JqZWN0KG9iaikpIHJldHVybiAnb2JqZWN0JztcbiAgcmV0dXJuIHR5cGVvZiBvYmo7XG59XG5cbmV4cG9ydHMuTGlicmFyeSA9IExpYnJhcnk7XG5cbi8qKlxuICogIyMjIExpYnJhcnlcbiAqXG4gKiBDcmVhdGUgYSByZXBvc2l0b3J5IGZvciBjdXN0b20gdHlwZSBkZXRlY3Rpb24uXG4gKlxuICogYGBganNcbiAqIHZhciBsaWIgPSBuZXcgdHlwZS5MaWJyYXJ5O1xuICogYGBgXG4gKlxuICovXG5cbmZ1bmN0aW9uIExpYnJhcnkgKCkge1xuICB0aGlzLnRlc3RzID0ge307XG59XG5cbi8qKlxuICogIyMjIyAub2YgKG9iailcbiAqXG4gKiBFeHBvc2UgcmVwbGFjZW1lbnQgYHR5cGVvZmAgZGV0ZWN0aW9uIHRvIHRoZSBsaWJyYXJ5LlxuICpcbiAqIGBgYGpzXG4gKiBpZiAoJ3N0cmluZycgPT09IGxpYi5vZignaGVsbG8gd29ybGQnKSkge1xuICogICAvLyAuLi5cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IG9iamVjdCB0byB0ZXN0XG4gKiBAcmV0dXJuIHtTdHJpbmd9IHR5cGVcbiAqL1xuXG5MaWJyYXJ5LnByb3RvdHlwZS5vZiA9IGdldFR5cGU7XG5cbi8qKlxuICogIyMjIyAuZGVmaW5lICh0eXBlLCB0ZXN0KVxuICpcbiAqIEFkZCBhIHRlc3QgdG8gZm9yIHRoZSBgLnRlc3QoKWAgYXNzZXJ0aW9uLlxuICpcbiAqIENhbiBiZSBkZWZpbmVkIGFzIGEgcmVndWxhciBleHByZXNzaW9uOlxuICpcbiAqIGBgYGpzXG4gKiBsaWIuZGVmaW5lKCdpbnQnLCAvXlswLTldKyQvKTtcbiAqIGBgYFxuICpcbiAqIC4uLiBvciBhcyBhIGZ1bmN0aW9uOlxuICpcbiAqIGBgYGpzXG4gKiBsaWIuZGVmaW5lKCdibG4nLCBmdW5jdGlvbiAob2JqKSB7XG4gKiAgIGlmICgnYm9vbGVhbicgPT09IGxpYi5vZihvYmopKSByZXR1cm4gdHJ1ZTtcbiAqICAgdmFyIGJsbnMgPSBbICd5ZXMnLCAnbm8nLCAndHJ1ZScsICdmYWxzZScsIDEsIDAgXTtcbiAqICAgaWYgKCdzdHJpbmcnID09PSBsaWIub2Yob2JqKSkgb2JqID0gb2JqLnRvTG93ZXJDYXNlKCk7XG4gKiAgIHJldHVybiAhISB+Ymxucy5pbmRleE9mKG9iaik7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge1JlZ0V4cHxGdW5jdGlvbn0gdGVzdFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaWJyYXJ5LnByb3RvdHlwZS5kZWZpbmUgPSBmdW5jdGlvbiAodHlwZSwgdGVzdCkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHRoaXMudGVzdHNbdHlwZV07XG4gIHRoaXMudGVzdHNbdHlwZV0gPSB0ZXN0O1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogIyMjIyAudGVzdCAob2JqLCB0ZXN0KVxuICpcbiAqIEFzc2VydCB0aGF0IGFuIG9iamVjdCBpcyBvZiB0eXBlLiBXaWxsIGZpcnN0XG4gKiBjaGVjayBuYXRpdmVzLCBhbmQgaWYgdGhhdCBkb2VzIG5vdCBwYXNzIGl0IHdpbGxcbiAqIHVzZSB0aGUgdXNlciBkZWZpbmVkIGN1c3RvbSB0ZXN0cy5cbiAqXG4gKiBgYGBqc1xuICogYXNzZXJ0KGxpYi50ZXN0KCcxJywgJ2ludCcpKTtcbiAqIGFzc2VydChsaWIudGVzdCgneWVzJywgJ2JsbicpKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHJlc3VsdFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaWJyYXJ5LnByb3RvdHlwZS50ZXN0ID0gZnVuY3Rpb24gKG9iaiwgdHlwZSkge1xuICBpZiAodHlwZSA9PT0gZ2V0VHlwZShvYmopKSByZXR1cm4gdHJ1ZTtcbiAgdmFyIHRlc3QgPSB0aGlzLnRlc3RzW3R5cGVdO1xuXG4gIGlmICh0ZXN0ICYmICdyZWdleHAnID09PSBnZXRUeXBlKHRlc3QpKSB7XG4gICAgcmV0dXJuIHRlc3QudGVzdChvYmopO1xuICB9IGVsc2UgaWYgKHRlc3QgJiYgJ2Z1bmN0aW9uJyA9PT0gZ2V0VHlwZSh0ZXN0KSkge1xuICAgIHJldHVybiB0ZXN0KG9iaik7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKCdUeXBlIHRlc3QgXCInICsgdHlwZSArICdcIiBub3QgZGVmaW5lZCBvciBpbnZhbGlkLicpO1xuICB9XG59O1xuIiwiLy8gaHR0cDovL3d3dy5yYWpkZWVwZC5jb20vYXJ0aWNsZXMvY2hyb21lL2xvY2Fsc3RyZy9Mb2NhbFN0b3JhZ2VTYW1wbGUuaHRtXG5cbi8vIE5PVEU6XG4vLyB0aGlzIHZhcmllcyBmcm9tIGFjdHVhbCBsb2NhbFN0b3JhZ2UgaW4gc29tZSBzdWJ0bGUgd2F5c1xuXG4vLyBhbHNvLCB0aGVyZSBpcyBubyBwZXJzaXN0ZW5jZVxuLy8gVE9ETyBwZXJzaXN0XG4oZnVuY3Rpb24gKCkge1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgZGI7XG5cbiAgZnVuY3Rpb24gTG9jYWxTdG9yYWdlKCkge1xuICB9XG4gIGRiID0gTG9jYWxTdG9yYWdlO1xuXG4gIGRiLnByb3RvdHlwZS5nZXRJdGVtID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIHJldHVybiBTdHJpbmcodGhpc1trZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgZGIucHJvdG90eXBlLnNldEl0ZW0gPSBmdW5jdGlvbiAoa2V5LCB2YWwpIHtcbiAgICB0aGlzW2tleV0gPSBTdHJpbmcodmFsKTtcbiAgfTtcblxuICBkYi5wcm90b3R5cGUucmVtb3ZlSXRlbSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBkZWxldGUgdGhpc1trZXldO1xuICB9O1xuXG4gIGRiLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgT2JqZWN0LmtleXMoc2VsZikuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBzZWxmW2tleV0gPSB1bmRlZmluZWQ7XG4gICAgICBkZWxldGUgc2VsZltrZXldO1xuICAgIH0pO1xuICB9O1xuXG4gIGRiLnByb3RvdHlwZS5rZXkgPSBmdW5jdGlvbiAoaSkge1xuICAgIGkgPSBpIHx8IDA7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMpW2ldO1xuICB9O1xuXG4gIGRiLnByb3RvdHlwZS5fX2RlZmluZUdldHRlcl9fKCdsZW5ndGgnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMpLmxlbmd0aDtcbiAgfSk7XG5cbiAgaWYgKGdsb2JhbC5sb2NhbFN0b3JhZ2UpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGxvY2FsU3RvcmFnZTtcbiAgfSBlbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IG5ldyBMb2NhbFN0b3JhZ2UoKTtcbiAgfVxufSgpKTtcbiIsIjsoZnVuY3Rpb24od2luKXtcblx0dmFyIHN0b3JlID0ge30sXG5cdFx0ZG9jID0gd2luLmRvY3VtZW50LFxuXHRcdGxvY2FsU3RvcmFnZU5hbWUgPSAnbG9jYWxTdG9yYWdlJyxcblx0XHRzY3JpcHRUYWcgPSAnc2NyaXB0Jyxcblx0XHRzdG9yYWdlXG5cblx0c3RvcmUuZGlzYWJsZWQgPSBmYWxzZVxuXHRzdG9yZS52ZXJzaW9uID0gJzEuMy4xNydcblx0c3RvcmUuc2V0ID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge31cblx0c3RvcmUuZ2V0ID0gZnVuY3Rpb24oa2V5LCBkZWZhdWx0VmFsKSB7fVxuXHRzdG9yZS5oYXMgPSBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHN0b3JlLmdldChrZXkpICE9PSB1bmRlZmluZWQgfVxuXHRzdG9yZS5yZW1vdmUgPSBmdW5jdGlvbihrZXkpIHt9XG5cdHN0b3JlLmNsZWFyID0gZnVuY3Rpb24oKSB7fVxuXHRzdG9yZS50cmFuc2FjdCA9IGZ1bmN0aW9uKGtleSwgZGVmYXVsdFZhbCwgdHJhbnNhY3Rpb25Gbikge1xuXHRcdGlmICh0cmFuc2FjdGlvbkZuID09IG51bGwpIHtcblx0XHRcdHRyYW5zYWN0aW9uRm4gPSBkZWZhdWx0VmFsXG5cdFx0XHRkZWZhdWx0VmFsID0gbnVsbFxuXHRcdH1cblx0XHRpZiAoZGVmYXVsdFZhbCA9PSBudWxsKSB7XG5cdFx0XHRkZWZhdWx0VmFsID0ge31cblx0XHR9XG5cdFx0dmFyIHZhbCA9IHN0b3JlLmdldChrZXksIGRlZmF1bHRWYWwpXG5cdFx0dHJhbnNhY3Rpb25Gbih2YWwpXG5cdFx0c3RvcmUuc2V0KGtleSwgdmFsKVxuXHR9XG5cdHN0b3JlLmdldEFsbCA9IGZ1bmN0aW9uKCkge31cblx0c3RvcmUuZm9yRWFjaCA9IGZ1bmN0aW9uKCkge31cblxuXHRzdG9yZS5zZXJpYWxpemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSlcblx0fVxuXHRzdG9yZS5kZXNlcmlhbGl6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgeyByZXR1cm4gdW5kZWZpbmVkIH1cblx0XHR0cnkgeyByZXR1cm4gSlNPTi5wYXJzZSh2YWx1ZSkgfVxuXHRcdGNhdGNoKGUpIHsgcmV0dXJuIHZhbHVlIHx8IHVuZGVmaW5lZCB9XG5cdH1cblxuXHQvLyBGdW5jdGlvbnMgdG8gZW5jYXBzdWxhdGUgcXVlc3Rpb25hYmxlIEZpcmVGb3ggMy42LjEzIGJlaGF2aW9yXG5cdC8vIHdoZW4gYWJvdXQuY29uZmlnOjpkb20uc3RvcmFnZS5lbmFibGVkID09PSBmYWxzZVxuXHQvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21hcmN1c3dlc3Rpbi9zdG9yZS5qcy9pc3N1ZXMjaXNzdWUvMTNcblx0ZnVuY3Rpb24gaXNMb2NhbFN0b3JhZ2VOYW1lU3VwcG9ydGVkKCkge1xuXHRcdHRyeSB7IHJldHVybiAobG9jYWxTdG9yYWdlTmFtZSBpbiB3aW4gJiYgd2luW2xvY2FsU3RvcmFnZU5hbWVdKSB9XG5cdFx0Y2F0Y2goZXJyKSB7IHJldHVybiBmYWxzZSB9XG5cdH1cblxuXHRpZiAoaXNMb2NhbFN0b3JhZ2VOYW1lU3VwcG9ydGVkKCkpIHtcblx0XHRzdG9yYWdlID0gd2luW2xvY2FsU3RvcmFnZU5hbWVdXG5cdFx0c3RvcmUuc2V0ID0gZnVuY3Rpb24oa2V5LCB2YWwpIHtcblx0XHRcdGlmICh2YWwgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gc3RvcmUucmVtb3ZlKGtleSkgfVxuXHRcdFx0c3RvcmFnZS5zZXRJdGVtKGtleSwgc3RvcmUuc2VyaWFsaXplKHZhbCkpXG5cdFx0XHRyZXR1cm4gdmFsXG5cdFx0fVxuXHRcdHN0b3JlLmdldCA9IGZ1bmN0aW9uKGtleSwgZGVmYXVsdFZhbCkge1xuXHRcdFx0dmFyIHZhbCA9IHN0b3JlLmRlc2VyaWFsaXplKHN0b3JhZ2UuZ2V0SXRlbShrZXkpKVxuXHRcdFx0cmV0dXJuICh2YWwgPT09IHVuZGVmaW5lZCA/IGRlZmF1bHRWYWwgOiB2YWwpXG5cdFx0fVxuXHRcdHN0b3JlLnJlbW92ZSA9IGZ1bmN0aW9uKGtleSkgeyBzdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KSB9XG5cdFx0c3RvcmUuY2xlYXIgPSBmdW5jdGlvbigpIHsgc3RvcmFnZS5jbGVhcigpIH1cblx0XHRzdG9yZS5nZXRBbGwgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciByZXQgPSB7fVxuXHRcdFx0c3RvcmUuZm9yRWFjaChmdW5jdGlvbihrZXksIHZhbCkge1xuXHRcdFx0XHRyZXRba2V5XSA9IHZhbFxuXHRcdFx0fSlcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cdFx0c3RvcmUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRmb3IgKHZhciBpPTA7IGk8c3RvcmFnZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIga2V5ID0gc3RvcmFnZS5rZXkoaSlcblx0XHRcdFx0Y2FsbGJhY2soa2V5LCBzdG9yZS5nZXQoa2V5KSlcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSBpZiAoZG9jLmRvY3VtZW50RWxlbWVudC5hZGRCZWhhdmlvcikge1xuXHRcdHZhciBzdG9yYWdlT3duZXIsXG5cdFx0XHRzdG9yYWdlQ29udGFpbmVyXG5cdFx0Ly8gU2luY2UgI3VzZXJEYXRhIHN0b3JhZ2UgYXBwbGllcyBvbmx5IHRvIHNwZWNpZmljIHBhdGhzLCB3ZSBuZWVkIHRvXG5cdFx0Ly8gc29tZWhvdyBsaW5rIG91ciBkYXRhIHRvIGEgc3BlY2lmaWMgcGF0aC4gIFdlIGNob29zZSAvZmF2aWNvbi5pY29cblx0XHQvLyBhcyBhIHByZXR0eSBzYWZlIG9wdGlvbiwgc2luY2UgYWxsIGJyb3dzZXJzIGFscmVhZHkgbWFrZSBhIHJlcXVlc3QgdG9cblx0XHQvLyB0aGlzIFVSTCBhbnl3YXkgYW5kIGJlaW5nIGEgNDA0IHdpbGwgbm90IGh1cnQgdXMgaGVyZS4gIFdlIHdyYXAgYW5cblx0XHQvLyBpZnJhbWUgcG9pbnRpbmcgdG8gdGhlIGZhdmljb24gaW4gYW4gQWN0aXZlWE9iamVjdChodG1sZmlsZSkgb2JqZWN0XG5cdFx0Ly8gKHNlZTogaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2FhNzUyNTc0KHY9VlMuODUpLmFzcHgpXG5cdFx0Ly8gc2luY2UgdGhlIGlmcmFtZSBhY2Nlc3MgcnVsZXMgYXBwZWFyIHRvIGFsbG93IGRpcmVjdCBhY2Nlc3MgYW5kXG5cdFx0Ly8gbWFuaXB1bGF0aW9uIG9mIHRoZSBkb2N1bWVudCBlbGVtZW50LCBldmVuIGZvciBhIDQwNCBwYWdlLiAgVGhpc1xuXHRcdC8vIGRvY3VtZW50IGNhbiBiZSB1c2VkIGluc3RlYWQgb2YgdGhlIGN1cnJlbnQgZG9jdW1lbnQgKHdoaWNoIHdvdWxkXG5cdFx0Ly8gaGF2ZSBiZWVuIGxpbWl0ZWQgdG8gdGhlIGN1cnJlbnQgcGF0aCkgdG8gcGVyZm9ybSAjdXNlckRhdGEgc3RvcmFnZS5cblx0XHR0cnkge1xuXHRcdFx0c3RvcmFnZUNvbnRhaW5lciA9IG5ldyBBY3RpdmVYT2JqZWN0KCdodG1sZmlsZScpXG5cdFx0XHRzdG9yYWdlQ29udGFpbmVyLm9wZW4oKVxuXHRcdFx0c3RvcmFnZUNvbnRhaW5lci53cml0ZSgnPCcrc2NyaXB0VGFnKyc+ZG9jdW1lbnQudz13aW5kb3c8Lycrc2NyaXB0VGFnKyc+PGlmcmFtZSBzcmM9XCIvZmF2aWNvbi5pY29cIj48L2lmcmFtZT4nKVxuXHRcdFx0c3RvcmFnZUNvbnRhaW5lci5jbG9zZSgpXG5cdFx0XHRzdG9yYWdlT3duZXIgPSBzdG9yYWdlQ29udGFpbmVyLncuZnJhbWVzWzBdLmRvY3VtZW50XG5cdFx0XHRzdG9yYWdlID0gc3RvcmFnZU93bmVyLmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cdFx0fSBjYXRjaChlKSB7XG5cdFx0XHQvLyBzb21laG93IEFjdGl2ZVhPYmplY3QgaW5zdGFudGlhdGlvbiBmYWlsZWQgKHBlcmhhcHMgc29tZSBzcGVjaWFsXG5cdFx0XHQvLyBzZWN1cml0eSBzZXR0aW5ncyBvciBvdGhlcndzZSksIGZhbGwgYmFjayB0byBwZXItcGF0aCBzdG9yYWdlXG5cdFx0XHRzdG9yYWdlID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cdFx0XHRzdG9yYWdlT3duZXIgPSBkb2MuYm9keVxuXHRcdH1cblx0XHR2YXIgd2l0aElFU3RvcmFnZSA9IGZ1bmN0aW9uKHN0b3JlRnVuY3Rpb24pIHtcblx0XHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApXG5cdFx0XHRcdGFyZ3MudW5zaGlmdChzdG9yYWdlKVxuXHRcdFx0XHQvLyBTZWUgaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNTMxMDgxKHY9VlMuODUpLmFzcHhcblx0XHRcdFx0Ly8gYW5kIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczUzMTQyNCh2PVZTLjg1KS5hc3B4XG5cdFx0XHRcdHN0b3JhZ2VPd25lci5hcHBlbmRDaGlsZChzdG9yYWdlKVxuXHRcdFx0XHRzdG9yYWdlLmFkZEJlaGF2aW9yKCcjZGVmYXVsdCN1c2VyRGF0YScpXG5cdFx0XHRcdHN0b3JhZ2UubG9hZChsb2NhbFN0b3JhZ2VOYW1lKVxuXHRcdFx0XHR2YXIgcmVzdWx0ID0gc3RvcmVGdW5jdGlvbi5hcHBseShzdG9yZSwgYXJncylcblx0XHRcdFx0c3RvcmFnZU93bmVyLnJlbW92ZUNoaWxkKHN0b3JhZ2UpXG5cdFx0XHRcdHJldHVybiByZXN1bHRcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBJbiBJRTcsIGtleXMgY2Fubm90IHN0YXJ0IHdpdGggYSBkaWdpdCBvciBjb250YWluIGNlcnRhaW4gY2hhcnMuXG5cdFx0Ly8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJjdXN3ZXN0aW4vc3RvcmUuanMvaXNzdWVzLzQwXG5cdFx0Ly8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJjdXN3ZXN0aW4vc3RvcmUuanMvaXNzdWVzLzgzXG5cdFx0dmFyIGZvcmJpZGRlbkNoYXJzUmVnZXggPSBuZXcgUmVnRXhwKFwiWyFcXFwiIyQlJicoKSorLC9cXFxcXFxcXDo7PD0+P0BbXFxcXF1eYHt8fX5dXCIsIFwiZ1wiKVxuXHRcdGZ1bmN0aW9uIGllS2V5Rml4KGtleSkge1xuXHRcdFx0cmV0dXJuIGtleS5yZXBsYWNlKC9eZC8sICdfX18kJicpLnJlcGxhY2UoZm9yYmlkZGVuQ2hhcnNSZWdleCwgJ19fXycpXG5cdFx0fVxuXHRcdHN0b3JlLnNldCA9IHdpdGhJRVN0b3JhZ2UoZnVuY3Rpb24oc3RvcmFnZSwga2V5LCB2YWwpIHtcblx0XHRcdGtleSA9IGllS2V5Rml4KGtleSlcblx0XHRcdGlmICh2YWwgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gc3RvcmUucmVtb3ZlKGtleSkgfVxuXHRcdFx0c3RvcmFnZS5zZXRBdHRyaWJ1dGUoa2V5LCBzdG9yZS5zZXJpYWxpemUodmFsKSlcblx0XHRcdHN0b3JhZ2Uuc2F2ZShsb2NhbFN0b3JhZ2VOYW1lKVxuXHRcdFx0cmV0dXJuIHZhbFxuXHRcdH0pXG5cdFx0c3RvcmUuZ2V0ID0gd2l0aElFU3RvcmFnZShmdW5jdGlvbihzdG9yYWdlLCBrZXksIGRlZmF1bHRWYWwpIHtcblx0XHRcdGtleSA9IGllS2V5Rml4KGtleSlcblx0XHRcdHZhciB2YWwgPSBzdG9yZS5kZXNlcmlhbGl6ZShzdG9yYWdlLmdldEF0dHJpYnV0ZShrZXkpKVxuXHRcdFx0cmV0dXJuICh2YWwgPT09IHVuZGVmaW5lZCA/IGRlZmF1bHRWYWwgOiB2YWwpXG5cdFx0fSlcblx0XHRzdG9yZS5yZW1vdmUgPSB3aXRoSUVTdG9yYWdlKGZ1bmN0aW9uKHN0b3JhZ2UsIGtleSkge1xuXHRcdFx0a2V5ID0gaWVLZXlGaXgoa2V5KVxuXHRcdFx0c3RvcmFnZS5yZW1vdmVBdHRyaWJ1dGUoa2V5KVxuXHRcdFx0c3RvcmFnZS5zYXZlKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0fSlcblx0XHRzdG9yZS5jbGVhciA9IHdpdGhJRVN0b3JhZ2UoZnVuY3Rpb24oc3RvcmFnZSkge1xuXHRcdFx0dmFyIGF0dHJpYnV0ZXMgPSBzdG9yYWdlLlhNTERvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hdHRyaWJ1dGVzXG5cdFx0XHRzdG9yYWdlLmxvYWQobG9jYWxTdG9yYWdlTmFtZSlcblx0XHRcdGZvciAodmFyIGk9MCwgYXR0cjsgYXR0cj1hdHRyaWJ1dGVzW2ldOyBpKyspIHtcblx0XHRcdFx0c3RvcmFnZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuXHRcdFx0fVxuXHRcdFx0c3RvcmFnZS5zYXZlKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0fSlcblx0XHRzdG9yZS5nZXRBbGwgPSBmdW5jdGlvbihzdG9yYWdlKSB7XG5cdFx0XHR2YXIgcmV0ID0ge31cblx0XHRcdHN0b3JlLmZvckVhY2goZnVuY3Rpb24oa2V5LCB2YWwpIHtcblx0XHRcdFx0cmV0W2tleV0gPSB2YWxcblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXHRcdHN0b3JlLmZvckVhY2ggPSB3aXRoSUVTdG9yYWdlKGZ1bmN0aW9uKHN0b3JhZ2UsIGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgYXR0cmlidXRlcyA9IHN0b3JhZ2UuWE1MRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmF0dHJpYnV0ZXNcblx0XHRcdGZvciAodmFyIGk9MCwgYXR0cjsgYXR0cj1hdHRyaWJ1dGVzW2ldOyArK2kpIHtcblx0XHRcdFx0Y2FsbGJhY2soYXR0ci5uYW1lLCBzdG9yZS5kZXNlcmlhbGl6ZShzdG9yYWdlLmdldEF0dHJpYnV0ZShhdHRyLm5hbWUpKSlcblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblx0dHJ5IHtcblx0XHR2YXIgdGVzdEtleSA9ICdfX3N0b3JlanNfXydcblx0XHRzdG9yZS5zZXQodGVzdEtleSwgdGVzdEtleSlcblx0XHRpZiAoc3RvcmUuZ2V0KHRlc3RLZXkpICE9IHRlc3RLZXkpIHsgc3RvcmUuZGlzYWJsZWQgPSB0cnVlIH1cblx0XHRzdG9yZS5yZW1vdmUodGVzdEtleSlcblx0fSBjYXRjaChlKSB7XG5cdFx0c3RvcmUuZGlzYWJsZWQgPSB0cnVlXG5cdH1cblx0c3RvcmUuZW5hYmxlZCA9ICFzdG9yZS5kaXNhYmxlZFxuXG5cdGlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzICYmIHRoaXMubW9kdWxlICE9PSBtb2R1bGUpIHsgbW9kdWxlLmV4cG9ydHMgPSBzdG9yZSB9XG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkgeyBkZWZpbmUoc3RvcmUpIH1cblx0ZWxzZSB7IHdpbi5zdG9yZSA9IHN0b3JlIH1cblxufSkoRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKSk7XG4iXX0=
