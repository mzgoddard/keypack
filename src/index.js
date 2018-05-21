const {TextEncoder, TextDecoder} = require('util');

// 0x00 dict - 7 bit id 0-124 (first bit off) (id & 0x01 === 0x00)
//   0x7d dict - 8 bits + 125 id
//   0x7e dict - 2 byte id
//   0x7f dict - 4 byte id
// 0x80 uint6 - 6 bits 0-50 (first bit on, second bit off) (id & 0x03 === 0x01)
//   0xb3 uint8+ - 8bits + 50
//   0xb4 uint16
//   0xb5 uint32
//   0xb6 int8
//   0xb7 int16
//   0xb8 int32
//   0xb9 float16
//   0xba float32
//   0xbb float64
//   0xbc null
//   0xbd false
//   0xbe true
//   0xbf '' (empty string)
// 0xc0 utf8 - 5 bit length 1-28 (first 2 bits on, third bit off) (id & 0x07 === 0x03)
//   0xdd utf8 - 1 byte + 30 length
//   0xde utf8 - 2 byte length
//   0xdf utf8 - 4 byte length
// 0xe0 obj - 4 bit length 0-12 (first 3 bits on, fourth bit off) (id & 0x0f === 0x07)
//   0xdd obj - 1 byte length
//   0xde obj - 2 byte length
//   0xdf obj - 4 byte length
// 0xf0 array - 4 bit length 0-12 (first 4 bits on) (id & 0x0f === 0x0f)
//   0xfd array - 1 byte length
//   0xfe array - 2 byte length
//   0xff array - 4 byte length

// dict order
// - increment count in dictionary count
// - find last dictionary item with count equal to or greater than this item
// - move item to after that item

const DICT_MASK = 0x80;
const DICT_BIT_MASK = 0x7f;
const DICT_PREFIX = 0x00;
const VARIED_MASK = 0xc0;
const VARIED_BIT_MASK = 0x3f;
const VARIED_PREFIX = 0x80;
const STRING_MASK = 0xe0;
const STRING_BIT_MASK = 0x1f;
const STRING_PREFIX = 0xc0;
const OBJECT_MASK = 0xf0;
const OBJECT_BIT_MASK = 0x0f;
const OBJECT_PREFIX = 0xe0;
const ARRAY_PREFIX = 0xf0;

const DICT_1BYTE = 0x7d;
const DICT_2BYTE = 0x7e;
const DICT_4BYTE = 0x7f;
const DICT_0BYTE_MAX = DICT_1BYTE - 1;
const DICT_1BYTE_MAX = 0xff + DICT_0BYTE_MAX;
const DICT_2BYTE_MAX = 0xffff;

const UINT6_BIT_MASK = VARIED_BIT_MASK;
const UINT8_PLUS = 0xb3;
const UINT16 = 0xb4;
const UINT32 = 0xb5;
const INT8 = 0xb6;
const INT16 = 0xb7;
const INT32 = 0xb8;
const FLOAT16 = 0xb9;
const FLOAT32 = 0xba;
const FLOAT64 = 0xbb;
const NULL = 0xbc;
const FALSE = 0xbd;
const TRUE = 0xbe;
const STRING_EMPTY = 0xbf;

const UINT6_MAX = (UINT8_PLUS & VARIED_BIT_MASK) - 1;
const UINT8_PLUS_MAX = 0xff + UINT6_MAX;
const UINT16_MAX = 0xffff;
const UINT32_MAX = 0x7fffffff;
const INT8_MAX = 0x7f;
const INT8_MIN = -0x80;
const INT16_MAX = 0x7fff;
const INT16_MIN = -0x8000;
const INT32_MAX = 0x7fffffff;
const INT32_MIN = -0x80000000;

const BUFFER_1BYTE = 0xda;
const BUFFER_2BYTE = 0xdb;
const BUFFER_4BYTE = 0xdc;
const STRING_1BYTE = 0xdd;
const STRING_2BYTE = 0xde;
const STRING_4BYTE = 0xdf;

const OBJECT_1BYTE = 0xed;
const OBJECT_2BYTE = 0xee;
const OBJECT_4BYTE = 0xef;

const ARRAY_1BYTE = 0xfd;
const ARRAY_2BYTE = 0xfe;
const ARRAY_4BYTE = 0xff;

const CHARS_127 = '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\u000b\f\r\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const u16 = new Uint16Array(1);
const u16_u8 = new Uint8Array(u16.buffer);
const u32 = new Uint32Array(1);
const u32_u8 = new Uint8Array(u32.buffer);
const i8 = new Int8Array(1);
const i8_u8 = new Uint8Array(i8.buffer);
const i16 = new Int16Array(1);
const i16_u8 = new Uint8Array(i16.buffer);
const i32 = new Int32Array(1);
const i32_u8 = new Uint8Array(i32.buffer);
const f64 = new Float64Array(1);
const f64_u8 = new Uint8Array(f64.buffer);
const f64_u32 = new Uint32Array(f64.buffer);

const BinaryHeap = require('./binary-heap');

// const searchHeap = (heap, string, index = 0, score = heap.scoreFunction(string)) => {
//   if (heap.content === string) {
//     return index;
//   }
//   const scoreLeft = heap.scoreFunction(heap.content[index]);
//   if (scoreAt)
// };

class StringCount {
  constructor(order = []) {
    this.counts = new Map();
    this.order = order;
    this.heap = new BinaryHeap(a => this.counts.get(a));

    for (const string of this.order) {
      this.counts.set(string, 1);
      this.heap.push(string);
    }
  }

  reset(order = null) {
    this.counts = new Map();
    if (order !== null) {
      this.order = order;
    }
    else {
      this.order.length = 0;
    }

    this.heap = new BinaryHeap(a => this.counts.get(a));
    for (const string of this.order) {
      this.counts.set(string, 1);
      this.heap.push(string);
    }
  }

  indexOf(string) {
    
  }

  _last(string, count) {
    const counts = this.counts;
    const order = this.order;
    // let index = order.lastIndexOf(string);
    // let index = this.heap.content.indexOf(string);
    let index = this.heap.contentIndex.get(string);
    if (count < 2) {
      return index;
    }

    this.heap.bubbleUp(index);

    // let i = index;
    // if (i === -1) {
    //   i = order.length;
    // }
    // for (; i > 0; i--) {
    //   if (counts.get(order[i - 1]) >= count) {
    //     break;
    //   }
    // }
    //
    // if (index !== i) {
    //   order[index] = order[i];
    //   order[i] = string;
    //   // order.splice(index, 1);
    //   // order.splice(i, 0, string);
    // }

    return index;
  }

  use(string) {
    const counts = this.counts;
    const count = (counts.get(string) || 0) + 1;
    counts.set(string, count);
    if (count === 1) {
      // this.order.push(string);
      this.heap.push(string);
      return -1;
    }
    return this._last(string, count);
  }

  string(index) {
    const counts = this.counts;
    const order = this.order;

    const string = order[index];
    const count = (counts.get(string) || 0) + 1;
    counts.set(string, count);

    if (count < 1) {
      return string;
    }

    this.heap.bubbleUp(index);

    // let i;
    // for (i = index; i > 0; i--) {
    //   if (counts.get(order[i - 1]) >= count) {
    //     break;
    //   }
    // }
    //
    // if (index !== i) {
    //   order[index] = order[i];
    //   order[i] = string;
    //   // order.splice(index, 1);
    //   // order.splice(i, 0, string);
    // }

    return string;
  }
}

class Keypack {
  constructor() {
    this.buffer = new ArrayBuffer(1 * 1024 * 1024);
    this.u8 = new Uint8Array(this.buffer);
    this.u8_node = new Buffer(this.buffer);
    this.dict = new StringCount();

    this.offset = 0;
  }

  ensureSpace(space) {
    if (this.offset + space > this.buffer.length) {
      const {buffer, u8} = this;
      this.buffer = new ArrayBuffer(nextPow2(this.offset + space));
      this.u8 = new Uint8Array(this.buffer);
      this.u8_node = new Buffer(this.buffer);

      this.u8.set(u8.slice(0, this.offset));
    }
  }

  load(u8) {
    this.offset = 0;
    this.ensureSpace(u8.length);
    this.u8.set(u8);
    this.dict.reset();
    return this;
  }

  save() {
    return this.u8;
  }
}

let _encoder = new TextEncoder(), _decoder = new TextDecoder();

const dict = new StringCount();

const pushByte = (buffer, byte) => {
  buffer.u8[buffer.offset] = byte;
  buffer.offset += 1;
};

const pushBytePlus = (buffer, byte, value) => {
  const {u8, offset} = buffer;
  u8[offset] = byte;
  u8[offset + 1] = value - byte;
  buffer.offset += 2;
};

const pushShort = (buffer, type, short) => {
  const {u8, offset} = buffer;
  u16[0] = short;
  u8[offset] = type;
  u8[offset + 1] = u16_u8[0];
  u8[offset + 2] = u16_u8[1];
  buffer.offset += 3;
};

const pushWord = (buffer, type, word) => {
  const {u8, offset} = buffer;
  u32[0] = word;
  u8[offset] = type;
  u8[offset + 1] = u32_u8[0];
  u8[offset + 2] = u32_u8[1];
  u8[offset + 3] = u32_u8[2];
  u8[offset + 4] = u32_u8[3];
  buffer.offset += 5;
};

const pushWide = (buffer, type, wide) => {
  const {u8, offset} = buffer;
  u8[offset] = type;
  u32[0] = wide[0];
  u8[offset + 1] = u32_u8[0];
  u8[offset + 2] = u32_u8[1];
  u8[offset + 3] = u32_u8[2];
  u8[offset + 4] = u32_u8[3];
  u32[0] = wide[1];
  u8[offset + 5] = u32_u8[0];
  u8[offset + 6] = u32_u8[1];
  u8[offset + 7] = u32_u8[2];
  u8[offset + 8] = u32_u8[3];
  buffer.offset += 9;
};

const pushBuffer = (buffer, type, value) => {
  const {u8, offset} = buffer;
  u8[offset] = type;
  switch (value.length) {
  case 1:
    u8[offset + 1] = value[0];
    break;

  case 2:
    u8[offset + 1] = value[0];
    u8[offset + 2] = value[1];
    break;

  case 4:
    u8[offset + 1] = value[0];
    u8[offset + 2] = value[1];
    u8[offset + 3] = value[2];
    u8[offset + 4] = value[3];
    break;

  default:
    for (let i = 0; i < value.length; i++) {
      u8[offset + i + 1] = value[i];
    }
    break;
  }
  buffer.offset += 1 + value.length;
};

const writeDictByte = (buffer, value) => {
  pushByte(buffer, DICT_PREFIX | value);
};

const writeDictBytePlus = (buffer, value) => {
  pushBytePlus(buffer, DICT_1BYTE, value);
};

const writeDictShort = (buffer, value) => {
  pushShort(buffer, DICT_2BYTE, value);
};

const writeDictWord = (buffer, value) => {
  pushWord(buffer, DICT_4BYTE, value);
};

const writeDict = (buffer, dictIndex) => {
  // let newDictIndex = dict.heap.content.indexOf(value);
  // let newDictIndex = dict.heap.contentIndex.get(value);
  // newDictIndex = dictIndex - newDictIndex;

  if (dictIndex < DICT_0BYTE_MAX) {
    writeDictByte(buffer, dictIndex);
  }
  else if (dictIndex < DICT_1BYTE_MAX) {
    writeDictBytePlus(buffer, dictIndex);
  }
  else if (dictIndex < DICT_2BYTE_MAX) {
    writeDictShort(buffer, dictIndex);
  }
  else {
    writeDictWord(buffer, dictIndex);
  }
};

const writeStringLengthByte = (buffer, value) => {
  pushByte(buffer, STRING_PREFIX | value);
};

const writeStringLengthBytePlus = (buffer, value) => {
  const {u8, offset} = buffer;
  u8[offset] = STRING_1BYTE;
  u8[offset + 1] = value - (BUFFER_1BYTE & STRING_BIT_MASK);
  buffer.offset += 2;
};

const writeStringLengthShort = (buffer, value) => {
  pushShort(buffer, STRING_2BYTE, value);
};

const writeStringLengthWord = (buffer, value) => {
  pushWord(buffer, STRING_4BYTE, value);
};

const writeStringBody = (buffer, value) => {
  buffer.offset += buffer.u8_node.utf8Write(value, buffer.offset);
};

const writeString = (buffer, value) => {
  let dictIndex = buffer.dict.heap.contentIndex.get(value)
  buffer.dict.use(value);

  // if (dict.counts.get(value) > 1) {
  if (dictIndex >= 0) {
    writeDict(buffer, value);
  }
  else if (typeof value === 'string') {
    length = Buffer.byteLength(value);
    if (length === 0) {
      console.log('empty');
      return writeEmptyString(buffer);
    }
    else if (length < (BUFFER_1BYTE & STRING_BIT_MASK)) {
      console.log('partial byte');
      writeStringLengthByte(buffer, length);
    }
    else if (length < 0xff + (BUFFER_1BYTE & STRING_BIT_MASK)) {
      console.log('byte');
      writeStringLengthBytePlus(buffer, length);
    }
    else if (length < 0x10000) {
      console.log('short');
      writeStringLengthShort(buffer, length);
    }
    else {
      console.log('word');
      writeStringLengthWord(buffer, length);
    }

    writeStringBody(buffer, value);
  }
};

const writeArray = (buffer, value) => {
  if (value.length < (OBJECT_1BYTE & OBJECT_BIT_MASK)) {
    pushByte(buffer, ARRAY_PREFIX | value.length);
  }
  else if (value.length < 0x100) {
    pushByte(buffer, ARRAY_1BYTE);
    pushByte(buffer, value.length);
  }
  else if (value.length < 0x10000) {
    pushShort(buffer, ARRAY_1BYTE, value.length);
  }
  for (let i = 0; i < value.length; i++) {
    write(buffer, value[i]);
  }
};

const writeObject = (buffer, value) => {
  const keys = Object.keys(value);
  if (keys.length < (OBJECT_1BYTE & OBJECT_BIT_MASK)) {
    pushByte(buffer, OBJ_PREFIX_PREFIX | keys.length);
  }
  else {
    pushWord(buffer, OBJ_PREFIX_BYTE, keys.length);
  }
  for (let i = 0; i < keys.length; i++) {
    writeString(buffer, keys[i]);
    write(buffer, value[keys[i]]);
  }
};

const writeObjectArray = (buffer, value) => {
  if (value === null) {
    writeNull(buffer);
  }
  else if (Array.isArray(value)) {
    writeArray(buffer, value);
  }
  else {
    writeObject(buffer, value);
  }
};

const writeUint6 = (buffer, value) => pushByte(buffer, VARIED_PREFIX | value);

const writeUint8Plus = (buffer, value) => {
  const {u8, offset} = buffer;
  u8[offset] = UINT8_PLUS;
  u8[offset + 1] = value - UINT6_MAX;
  buffer.offset += 2;
};

const writeUint16 = (buffer, value) => pushShort(buffer, UINT16, value);

const writeUint32 = (buffer, value) => pushWord(buffer, UINT32, value);

const writeInt8 = (buffer, value) => {
  i8[0] = value;
  pushBuffer(buffer, INT8, i8_u8);
};

const writeInt16 = (buffer, value) => {
  i16[0] = value;
  pushBuffer(buffer, INT16, i16_u8);
};

const writeInt32 = (buffer, value) => {
  i32[0] = value;
  pushBuffer(buffer, INT32, i32_u8);
};

const writeFloat64 = (buffer, value) => {
  // f64[0] = value;
  // pushWide(buffer, FLOAT64, f64_u32);
  const {u8, offset} = buffer;
  u8[offset] = FLOAT64;
  f64[0] = value;
  u8[offset + 1] = f64_u8[0];
  u8[offset + 2] = f64_u8[1];
  u8[offset + 3] = f64_u8[2];
  u8[offset + 4] = f64_u8[3];
  u8[offset + 5] = f64_u8[4];
  u8[offset + 6] = f64_u8[5];
  u8[offset + 7] = f64_u8[6];
  u8[offset + 8] = f64_u8[7];
  buffer.offset += 9;
};

const MAX_INT = Math.pow(2, 30);
const MIN_INT = -Math.pow(2, 31);

const writeNumber = (buffer, value) => {
  if ((value | 0) === value && value >= INT32_MIN && value <= UINT32_MAX) {
    if (value >= 0) {
      if (value <= UINT6_MAX) {
        writeUint6(buffer, value);
      }
      else if (value <= UINT8_PLUS_MAX) {
        writeUint8Plus(buffer, value);
      }
      else if (value <= UINT16_MAX) {
        writeUint16(buffer, value);
      }
      else {
        writeUint32(buffer, value);
      }
    }
    else {
      if (value >= INT8_MIN) {
        writeInt8(buffer, value);
      }
      else if (value >= INT16_MIN) {
        writeInt16(buffer, value);
      }
      else {
        writeInt32(buffer, value);
      }
    }
  }
  else {
    writeFloat64(buffer, value);
  }
};

const writeBoolean = (buffer, value) => pushByte(buffer, value === true ? TRUE : FALSE);

const writeNull = buffer => pushByte(buffer, NULL);

const writeEmptyString = buffer => pushByte(buffer, STRING_EMPTY);

const write = (buffer, value) => {
  if (typeof value === 'string') writeString(buffer, value);
  else if (typeof value === 'object') writeObjectArray(buffer, value);
  else if (typeof value === 'number') writeNumber(buffer, value);
  else if (typeof value === 'boolean') writeBoolean(buffer, value);
};

// const dict = new StringCount();

const peekType = buffer => {
  return buffer.u8[buffer.offset];
};

const peekByte = buffer => {
  return buffer.u8[buffer.offset];
};

const popByte = buffer => {
  return buffer.u8[buffer.offset++];
};

const popBytePlus = buffer => {
  buffer.offset += 2;
  const {u8, offset} = buffer;
  const type = u8[offset - 2];
  return u8[offset - 1] + type;
};

const popShort = buffer => {
  const {u8, offset} = buffer;
  buffer.offset += 3;
  u16_u8[0] = u8[offset + 1];
  u16_u8[1] = u8[offset + 2];
  return u16[0];
};

const popWord = buffer => {
  const {u8, offset} = buffer;
  buffer.offset += 5;
  u32_u8[0] = u8[offset + 1];
  u32_u8[1] = u8[offset + 2];
  u32_u8[1] = u8[offset + 3];
  u32_u8[1] = u8[offset + 4];
  return u32[0];
};

const popWide = (buffer, wide = []) => {
  const {u8, offset} = buffer;
  buffer.offset += 9;
  u32_u8[0] = u8[offset + 1];
  u32_u8[1] = u8[offset + 2];
  u32_u8[2] = u8[offset + 3];
  u32_u8[3] = u8[offset + 4];
  wide[0] = u32[0];
  u32_u8[0] = u8[offset + 5];
  u32_u8[1] = u8[offset + 6];
  u32_u8[2] = u8[offset + 7];
  u32_u8[3] = u8[offset + 8];
  wide[1] = u32[1];
  return wide;
};

const readDictByte = buffer => {
  return popByte(buffer) & DICT_BIT_MASK;
};

const readDictBytePlus = buffer => {
  return popBytePlus(buffer);
};

const readDictShort = buffer => {
  return popShort(buffer);
};

const readDictWord = buffer => {
  return popWord(buffer);
};

const readDict = buffer => {
  const type = peekByte(buffer);
  if (type & DICT_BIT_MASK < DICT_1BYTE & DICT_BIT_MASK) {
    return buffer.dict.string(readDictByte(buffer));
  }
  else if (type === DICT_1BYTE) {
    return buffer.dict.string(readDictBytePlus(buffer));
  }
  else if (type === DICT_2BYTE) {
    return buffer.dict.string(readDictShort(buffer));
  }
  else {
    return buffer.dict.string(readDictWord(buffer));
  }
};

const readUint6 = buffer => {
  return popByte(buffer) & UINT6_BIT_MASK;
};

const readUint8Plus = buffer => {
  const {u8, offset} = buffer;
  buffer.offset += 2;
  return UINT6_MAX + u8[offset + 1];
};

const readUint16 = buffer => {
  const {u8, offset} = buffer;
  u16_u8[0] = u8[offset + 1];
  u16_u8[1] = u8[offset + 2];
  buffer.offset += 3;
  return u16[0];
};

const readUint32 = buffer => {
  const {u8, offset} = buffer;
  u32_u8[0] = u8[offset + 1];
  u32_u8[1] = u8[offset + 2];
  u32_u8[2] = u8[offset + 3];
  u32_u8[3] = u8[offset + 4];
  buffer.offset += 5;
  return u32[0];
};

const readInt8 = buffer => {
  const {u8, offset} = buffer;
  i8_u8[0] = u8[offset + 1];
  buffer.offset += 2;
  return i8[0];
};

const readInt16 = buffer => {
  const {u8, offset} = buffer;
  i16_u8[0] = u8[offset + 1];
  i16_u8[1] = u8[offset + 2];
  buffer.offset += 3;
  return i16[0];
};

const readInt32 = buffer => {
  const {u8, offset} = buffer;
  i32_u8[0] = u8[offset + 1];
  i32_u8[1] = u8[offset + 2];
  i32_u8[2] = u8[offset + 3];
  i32_u8[3] = u8[offset + 4];
  buffer.offset += 5;
  return i32[0];
};

const readFloat16 = buffer => {
  
};

const readFloat32 = buffer => {
  const {u8, offset} = buffer;
  f32_u8[0] = u8[offset + 1];
  f32_u8[1] = u8[offset + 2];
  f32_u8[2] = u8[offset + 3];
  f32_u8[3] = u8[offset + 4];
  buffer.offset += 5;
  return f32[0];
};

const readFloat64 = buffer => {
  // return (popWide(buffer, f64_u32), f64[0]);
  const {u8, offset} = buffer;
  f64_u8[0] = u8[offset + 1];
  f64_u8[1] = u8[offset + 2];
  f64_u8[2] = u8[offset + 3];
  f64_u8[3] = u8[offset + 4];
  f64_u8[4] = u8[offset + 5];
  f64_u8[5] = u8[offset + 6];
  f64_u8[6] = u8[offset + 7];
  f64_u8[7] = u8[offset + 8];
  buffer.offset += 9;
  return f64[0];
};

const readNull = buffer => {
  return (popByte(buffer), null);
};

const readFalse = buffer => {
  return (popByte(buffer), false);
};

const readTrue = buffer => {
  return (popByte(buffer), true);
};

const readEmptyString = buffer => {
  return (popByte(buffer), '');
};

const readVaried = buffer => {
  const type = peekByte(buffer);
  if ((type & UINT6_BIT_MASK) <= UINT6_MAX) {
    return readUint6(buffer);
  }

  switch (type) {
    case UINT8_PLUS:
      return readUint8Plus(buffer);

    case UINT16:
      return readUint16(buffer);

    case UINT32:
      return readUint32(buffer);

    case INT8:
      return readInt8(buffer);

    case INT16:
      return readInt16(buffer);

    case INT32:
      return readInt32(buffer);

    case FLOAT16:
      return readFloat16(buffer);

    case FLOAT32:
      return readFloat32(buffer);

    case FLOAT64:
      return readFloat64(buffer);

    case NULL:
      return readNull(buffer);

    case FALSE:
      return readFalse(buffer);

    case TRUE:
      return readTrue(buffer);

    case STRING_EMPTY:
      return readEmptyString(buffer);
  }
};

const readStringLengthByte = buffer => {
  return popByte(buffer) & STRING_BIT_MASK;
};

const readStringLengthBytePlus = buffer => {
  const {u8, offset} = buffer;
  buffer.offset += 2;
  return (BUFFER_1BYTE & STRING_BIT_MASK) + u8[offset + 1];
};

const readStringLengthShort = buffer => {
  return popShort(buffer);
};

const readStringLengthWord = buffer => {
  return popWord(buffer);
};

const readStringBody = (buffer, length) => {
  const {offset, u8_node} = buffer;
  const end = offset + length;
  buffer.offset = end;
  return u8_node.utf8Slice(offset, end);
};

const readString = buffer => {
  const type = peekByte(buffer);
  if ((type & STRING_BIT_MASK) < (BUFFER_1BYTE & STRING_BIT_MASK)) {
    console.log('partial byte');
    return readStringBody(buffer, readStringLengthByte(buffer));
  }
  else if (type === STRING_1BYTE) {
    console.log('byte');
    return readStringBody(buffer, readStringLengthBytePlus(buffer));
  }
  else if (type === STRING_2BYTE) {
    console.log('short');
    return readStringBody(buffer, readStringLengthShort(buffer));
  }
  else {
    console.log('word');
    return readStringBody(buffer, readStringLengthWord(buffer));
  }
};

const readArrayLengthByte = buffer => {
  return popByte(buffer) & OBJECT_BIT_MASK;
};

const readArrayLengthBytePlus = buffer => {
  return popBytePlus(buffer);
};

const readArrayLengthShort = buffer => {
  return popShort(buffer);
};

const readArrayLengthWord = buffer => {
  return popWord(buffer);
};

const readArrayBody = (buffer, length) => {
  const body = [];
  for (let i = 0; i < length; i++) {
    body.push(read(buffer));
  }
  return body;
};

const readArray = buffer => {
  const type = peekType(buffer);
  if ((type & OBJECT_BIT_MASK) < (OBJECT_1BYTE & OBJECT_BIT_MASK)) {
    return readArrayBody(buffer, readArrayLengthByte(buffer));
  }
  else if (type === ARRAY_1BYTE) {
    return readArrayBody(buffer, readArrayLengthBytePlus(buffer));
  }
  else if (type === ARRAY_2BYTE) {
    return readArrayBody(buffer, readArrayLengthShort(buffer));
  }
  else if (type === ARRAY_4BYTE) {
    return readArrayBody(buffer, readArrayLengthWord(buffer));
  }
  else {
    throw new Error(`Cannot read array at ${buffer.offset}. Uncertain length.`);
  }
};

const readObjectLengthByte = buffer => {
  return popByte(buffer) & OBJECT_BIT_MASK;
};

const readObjectLengthBytePlus = buffer => {
  return popBytePlus(buffer);
};

const readObjectLengthShort = buffer => {
  return popShort(buffer);
};

const readObjectLengthWord = buffer => {
  return popWord(buffer);
};

const readObjectBody = (buffer, length) => {
  const body = {};
  for (let i = 0; i < length; i++) {
    const key = readString(buffer);
    body[key] = read(buffer);
  }
  return body;
};

const readObject = buffer => {
  const type = peekType(buffer);
  if (type & OBJECT_BIT_MASK < OBJECT_1BYTE & OBJECT_BIT_MASK) {
    return readObjectBody(buffer, readObjectLengthByte(buffer));
  }
  else if (type === OBJECT_1BYTE) {
    return readObjectBody(buffer, readObjectLengthBytePlus(buffer));
  }
  else if (type === OBJECT_2BYTE) {
    return readObjectBody(buffer, readObjectLengthShort(buffer));
  }
  else if (type === OBJECT_4BYTE) {
    return readObjectBody(buffer, readObjectLengthWord(buffer));
  }
  else {
    throw new Error(`Cannot read array at ${buffer.offset}.`);
  }
};

const read = buffer => {
  const type = peekType(buffer);
  if ((type & DICT_MASK) === DICT_PREFIX) {
    return readDict(buffer);
  }
  else if ((type & VARIED_MASK) === VARIED_PREFIX) {
    return readVaried(buffer);
  }
  else if ((type & STRING_MASK) === STRING_PREFIX) {
    return readString(buffer);
  }
  else if ((type & OBJECT_MASK) === OBJECT_PREFIX) {
    return readObject(buffer);
  }
  else if ((type & OBJECT_MASK) === ARRAY_PREFIX) {
    return readArray(buffer);
  }
};

module.exports = {
  load(u8) {
    // console.log('load', u8.length);
    const buffer = new Keypack().load(u8);
    return read(buffer);
  },
  dump(value) {
    const buffer = new Keypack();
    write(buffer, value);
    // console.log('dump', buffer.offset);
    return buffer.save().slice(0, buffer.offset);
  },
};

const ORDER = [
  // 'type', 'request', 'userRequest', 'rawRequest', 'resource', 'loaders', 'parser', 'options', 'sourceType', 'moduleType', 'generator', 'resolveOptions'

  // 'type',
  // 'constructor',
  // 'data',
  // 'request',
  // 'userRequest',
  // 'rawRequest',
  // 'loaders',
  // 'resource',
  // 'parser',
  // 'options',
  // 'sourceType',
  // 'moduleType',
  // 'generator',
  // 'resolveOptions',
  // 'identifier',
  // 'assigned',
  // 'factoryMeta',
  // 'issuer',
  // 'useSourceMap',
  // 'lineToLine',
  // 'build',
  // 'built',
  // 'buildTimestamp',
  // 'buildMeta',
  // 'exportsType',
  // 'providedExports',
  // 'buildInfo',
  // 'cacheable',
  // 'fileDependencies',
  // 'contextDependencies',
  // 'exportsArgument',
  // 'warnings',
  // 'errors',
  // '_source',
  // 'value',
  // 'name',
  // 'hash',
  // '_lastSuccessfulBuildMeta',
  // 'dependencyBlock',
  // 'DependenciesBlock',
  // 'dependencies',
  // 'loc',
  // 'start',
  // 'line',
  // 'column',
  // 'end',
  // 'index',
  // 'expression',
  // 'range',
  // 'sourceOrder',
  // 'rangeStatement',
  // 'id',
  // 'is',
  // 'strictExportPresence',
  // 'namespaceObjectAsContext',
  // 'callArgs',
  // 'properties',
  // 'call',
  // 'callee',
  // 'arguments',
  // 'directImport',
  // 'variables',
  // 'blocks',
  // 'source',
  // '_cachedSource',
  // 'replacements',
  // 'cachedSource',
  // 'cachedMaps',
  // '_cachedSourceHash',
  // 'renderedHash',
];
