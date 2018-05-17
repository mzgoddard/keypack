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

const DICT_0BYTE_MAX = DICT_1BYTE - 1;
const DICT_1BYTE_MAX = 0xff + DICT_0BYTE_MAX;
const DICT_2BYTE_MAX = 0xffff;

const CHARS_127 = '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\u000b\f\r\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const u16 = new Uint16Array(1);
const u16_u8 = new Uint8Array(u16.buffer);
const u32 = new Uint32Array(1);
const u32_u8 = new Uint8Array(u32.buffer);
const i32 = new Int32Array(1);
const i32_u8 = new Uint8Array(i32.buffer);
const f64 = new Float64Array(1);
const f64_u8 = new Uint8Array(f64.buffer);

const BinaryHeap = require('./src/binary-heap');

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
    let index = this.heap.content.indexOf(string);
    if (count < 1) {
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

class WriteCell {
  constructor() {
    this.value = null;
    this.keys = null;
    this.index = 0;
    this.length = 0;
  }

  set(value) {
    this.value = value;
    this.index = 0;
  }
}

class WriteStack {
  constructor() {
    this.depth = 0;
    this.stack = [new WriteCell()];
  }

  get cell() {
    return this.stack[this.depth - 1];
  }

  get value() {
    return this.stack[this.depth - 1].value;
  }

  reset() {
    this.depth = 0;
  }

  push(u8, offset, value) {
    this.depth += 1;
    if (typeof value === 'object') {
      if (this.depth > this.stack.length) {
        this.stack.push(new WriteCell());
      }
      this.stack[this.depth - 1].set(value);
    }
    return value;
  }
}

let _encoder = new TextEncoder(), _decoder = new TextDecoder();

const writeStack = new WriteStack();
const dict = new StringCount();
const write = (u8, offset, _value, _order) => {
  let result, length, j, popValue;
  writeStack.reset();
  let value = writeStack.push(u8, offset, _value);
  dict.reset(_order);
  const u8_node = new Buffer(u8.buffer);
  // console.log(u8.length, u8_node.length);

  while (writeStack.depth) {
    if (typeof value === 'string') {
      let dictIndex = dict.use(value);

      // if (dict.counts.get(value) > 1) {
      if (dictIndex >= 0) {
        let newDictIndex = dict.order.indexOf(value);
        // console.log(dictIndex, newDictIndex, dictIndex < (DICT_1BYTE & DICT_BIT_MASK));

        // if (dictIndex === newDictIndex) {
        //   newDictIndex = -1;
        // }
        // else {
        //
        // }
        newDictIndex = dictIndex - newDictIndex;

        // // New index of 0 (or -1) means the item did not move.
        // dictIndex += 1;
        // newDictIndex += 1;

        if (dictIndex < DICT_0BYTE_MAX) {
          u8[offset] = DICT_PREFIX | dictIndex;
          offset += 1;
          u8[offset] = DICT_PREFIX | newDictIndex;
          offset += 1;
        }
        else if (dictIndex < DICT_1BYTE_MAX) {
          u8[offset] = DICT_1BYTE;
          u8[offset + 1] = dictIndex - DICT_1BYTE;
          offset += 2;
          if (newDictIndex < DICT_0BYTE_MAX) {
            u8[offset] = DICT_PREFIX | newDictIndex;
            offset += 1;
          }
          else {
            u8[offset] = DICT_1BYTE;
            u8[offset + 1] = newDictIndex - DICT_1BYTE;
            offset += 2;
          }
        }
        else if (dictIndex < DICT_2BYTE_MAX) {
          u16[0] = dictIndex;
          u8[offset] = DICT_2BYTE;
          u8[offset + 1] = u16_u8[0];
          u8[offset + 2] = u16_u8[1];
          offset += 3;
          if (newDictIndex < DICT_0BYTE_MAX) {
            u8[offset] = DICT_PREFIX | newDictIndex;
            offset += 1;
          }
          else if (newDictIndex < DICT_1BYTE_MAX) {
            u8[offset] = DICT_1BYTE;
            u8[offset + 1] = newDictIndex - DICT_1BYTE;
            offset += 2;
          }
          else {
            u16[0] = newDictIndex;
            u8[offset] = DICT_2BYTE;
            u8[offset + 1] = u16_u8[0];
            u8[offset + 2] = u16_u8[1];
            offset += 3;
          }
        }
        else {
          u32[0] = dictIndex;
          u8[offset] = DICT_4BYTE;
          u8[offset + 1] = u32_u8[0];
          u8[offset + 2] = u32_u8[1];
          u8[offset + 3] = u32_u8[2];
          u8[offset + 4] = u32_u8[3];
          offset += 5;
          if (newDictIndex < DICT_0BYTE_MAX) {
            u8[offset] = DICT_PREFIX | newDictIndex;
            offset += 1;
          }
          else if (newDictIndex < DICT_1BYTE_MAX) {
            u8[offset] = DICT_1BYTE;
            u8[offset + 1] = newDictIndex - DICT_1BYTE;
            offset += 2;
          }
          else if (newDictIndex < DICT_2BYTE_MAX) {
            u16[0] = newDictIndex;
            u8[offset] = DICT_2BYTE;
            u8[offset + 1] = u16_u8[0];
            u8[offset + 2] = u16_u8[1];
            offset += 3;
          }
          else {
            u32[0] = newDictIndex;
            u8[offset] = DICT_4BYTE;
            u8[offset + 1] = u32_u8[0];
            u8[offset + 2] = u32_u8[1];
            u8[offset + 3] = u32_u8[2];
            u8[offset + 4] = u32_u8[3];
            offset += 5;
          }
        }

        writeStack.depth -= 1;
        value = popValue;
      }
      else if (typeof value === 'string') {
        length = Buffer.byteLength(value);
        if (length === 0) {
          u8[offset] = STRING_EMPTY;
          offset += 1;
          writeStack.depth -= 1;
          value = popValue;
          continue;
        }
        else if (length < (BUFFER_1BYTE & STRING_BIT_MASK)) {
          u8[offset] = STRING_PREFIX | length;
          offset += 1;
        }
        else {
          u32[0] = length;
          u8[offset] = STRING_4BYTE;
          u8[offset + 1] = u32_u8[0];
          u8[offset + 2] = u32_u8[1];
          u8[offset + 3] = u32_u8[2];
          u8[offset + 4] = u32_u8[3];
          offset += 5;
        }

        dictIndex = dict.order.lastIndexOf(value);
        if (dictIndex < (DICT_1BYTE & DICT_BIT_MASK)) {
          u8[offset] = DICT_PREFIX | dictIndex;
          offset += 1;
        }
        else {
          u32[0] = dictIndex;
          u8[offset] = DICT_4BYTE;
          u8[offset + 1] = u32_u8[0];
          u8[offset + 2] = u32_u8[1];
          u8[offset + 3] = u32_u8[2];
          u8[offset + 4] = u32_u8[3];
          offset += 5;
        }

        // let pos = 0;
        // const len = value.length;
        //
        // let at = offset;
        //
        // while (pos < len) {
        //   let char = value.charCodeAt(pos++);
        //   if (char >= 0xd800 && char <= 0xdbff) {
        //     // high surrogate
        //     if (pos < len) {
        //       const extra = value.charCodeAt(pos);
        //       if ((extra & 0xfc00) === 0xdc00) {
        //         ++pos;
        //         char = ((char & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
        //       }
        //     }
        //     if (char >= 0xd800 && char <= 0xdbff) {
        //       continue;  // drop lone surrogate
        //     }
        //   }
        //
        //   // // expand the buffer if we couldn't write 4 bytes
        //   // if (at + 4 > u8.length) {
        //   //   tlen += 8;  // minimum extra
        //   //   tlen *= (1.0 + (pos / value.length) * 2);  // take 2x the remaining
        //   //   tlen = (tlen >> 3) << 3;  // 8 byte offset
        //   //
        //   //   const update = new Uint8Array(tlen);
        //   //   update.set(u8);
        //   //   u8 = update;
        //   // }
        //
        //   if ((char & 0xffffff80) === 0) {  // 1-byte
        //     u8[at++] = char;  // ASCII
        //     continue;
        //   } else if ((char & 0xfffff800) === 0) {  // 2-byte
        //     u8[at++] = ((char >>  6) & 0x1f) | 0xc0;
        //   } else if ((char & 0xffff0000) === 0) {  // 3-byte
        //     u8[at++] = ((char >> 12) & 0x0f) | 0xe0;
        //     u8[at++] = ((char >>  6) & 0x3f) | 0x80;
        //   } else if ((char & 0xffe00000) === 0) {  // 4-byte
        //     u8[at++] = ((char >> 18) & 0x07) | 0xf0;
        //     u8[at++] = ((char >> 12) & 0x3f) | 0x80;
        //     u8[at++] = ((char >>  6) & 0x3f) | 0x80;
        //   } else {
        //     // FIXME: do we care
        //     continue;
        //   }
        //
        //   u8[at++] = (char & 0x3f) | 0x80;
        // }

        // new Uint8Array(u8.buffer, offset, length).set(_encoder.encode(value));
        u8_node.write(value, offset);

        offset += length;
        writeStack.depth -= 1;
        value = popValue;
      }
    }
    else if (typeof value === 'object') {
      if (value === null) {
        u8[offset] = NULL;
        offset += 1;
        writeStack.depth -= 1;
        value = popValue;
      }
      else if (Array.isArray(value)) {
        const cell = writeStack.cell;
        if (cell.index === 0) {
          cell.length = value.length;
          if (value.length < (ARRAY_1BYTE & OBJECT_BIT_MASK)) {
            u8[offset] = ARRAY_PREFIX | value.length;
            offset += 1;
          }
          else {
            u32[0] = value.length;
            u8[offset] = ARRAY_4BYTE;
            u8[offset + 1] = u32_u8[0];
            u8[offset + 2] = u32_u8[1];
            u8[offset + 3] = u32_u8[2];
            u8[offset + 4] = u32_u8[3];
            offset += 5;
          }
        }
        if (cell.index < cell.length) {
          popValue = value;
          value = writeStack.push(u8, offset, value[cell.index]);
          cell.index += 1;
        }
        else {
          writeStack.depth -= 1;
          if (writeStack.depth) {
            value = writeStack.value;
          }
        }
      }
      else {
        const cell = writeStack.cell;
        if (cell.index === 0) {
          cell.keys = Object.keys(value);
          cell.length = cell.keys.length;

          if (cell.length < (OBJECT_1BYTE & OBJECT_BIT_MASK)) {
            u8[offset] = OBJECT_PREFIX | cell.length;
            offset += 1;
          }
          else {
            u32[0] = cell.length;
            u8[offset] = OBJECT_4BYTE;
            u8[offset + 1] = u32_u8[0];
            u8[offset + 2] = u32_u8[1];
            u8[offset + 3] = u32_u8[2];
            u8[offset + 4] = u32_u8[3];
            offset += 5;
          }
        }

        if (cell.index / 2 < cell.length) {
          if (cell.index % 2 === 0) {
            popValue = value;
            value = writeStack.push(u8, offset, cell.keys[(cell.index / 2) | 0]);
            cell.index += 1;
          }
          else {
            popValue = value;
            value = writeStack.push(u8, offset, value[cell.keys[(cell.index / 2) | 0]]);
            cell.index += 1;
          }
        }
        else {
          writeStack.depth -= 1;
          if (writeStack.depth) {
            value = writeStack.value;
          }
        }
      }
    }
    else if (typeof value === 'number') {
      if ((value & UINT6_BIT_MASK) === value && (value < (UINT8_PLUS & UINT6_BIT_MASK))) {
        u8[offset] = VARIED_PREFIX | value;
        offset += 1;
        writeStack.depth -= 1;
        value = popValue;
      }
      else if ((value | 0) === value && value < Math.pow(2, 31)) {
        i32[0] = value;
        u8[offset] = INT32;
        u8[offset + 1] = i32_u8[0];
        u8[offset + 2] = i32_u8[1];
        u8[offset + 3] = i32_u8[2];
        u8[offset + 4] = i32_u8[3];
        offset += 5;
        writeStack.depth -= 1;
        value = popValue;
      }
      else {
        f64[0] = value;
        u8[offset] = FLOAT64;
        u8[offset + 1] = f64_u8[0];
        u8[offset + 2] = f64_u8[1];
        u8[offset + 3] = f64_u8[2];
        u8[offset + 4] = f64_u8[3];
        u8[offset + 5] = f64_u8[4];
        u8[offset + 6] = f64_u8[5];
        u8[offset + 7] = f64_u8[6];
        u8[offset + 8] = f64_u8[7];
        offset += 9;
        writeStack.depth -= 1;
        value = popValue;
      }
    }
    else if (typeof value === 'boolean') {
      u8[offset] = value === true ? TRUE : FALSE;
      offset += 1;
      writeStack.depth -= 1;
      value = popValue;
    }
    else {
      u8[offset] = NULL;
      offset += 1;
      writeStack.depth -= 1;
      value = popValue;
    }
  }
  return offset;
};

class ReadCell {
  constructor() {
    this.id = 0x00;
    this.result = null;
    this.objectKey = null;
    this.index = 0;
    this.length = 0;
  }

  set(id) {
    this.id = id;
    this.result = null;
  }
}

class ReadStack {
  constructor() {
    this.depth = 0;
    this.stack = [new ReadCell()];
  }

  get cell() {
    return this.stack[this.depth];
  }

  get result() {
    return this.stack[this.depth + 1].result;
  }

  reset() {
    this.depth = 0;
  }

  push(u8, offset) {
    this.depth += 1;
    const byte = u8[offset];
    let id = byte & DICT_MASK;
    if (id !== DICT_PREFIX) {
      id = byte & VARIED_MASK;
      if (id !== VARIED_PREFIX) {
        id = byte & STRING_MASK;
        if (id !== STRING_PREFIX) {
          id = byte & OBJECT_MASK;
        }
      }
    }

    if (id >= OBJECT_PREFIX) {
      if (this.depth >= this.stack.length) {
        this.stack.push(new ReadCell());
      }
      this.stack[this.depth].set(id);
    }
    return id;
  }

  pop(result) {
    this.stack[this.depth].result = result;
    this.depth -= 1;
  }
}

const readStack = new ReadStack();
const stringOut = [];
let dictDt = 0;
let variedDt = 0;
let stringDt = 0;
const read = (u8, offset, order) => {
  let result, length, j, id, popId;
  readStack.reset();
  id = readStack.push(u8, offset);
  dict.reset(order);
  const u8_node = new Buffer(u8.buffer);

  while (readStack.depth) {
    // console.log(readStack.depth, id, DICT_PREFIX, VARIED_PREFIX, STRING_PREFIX, OBJECT_PREFIX, ARRAY_PREFIX);
    if (id === DICT_PREFIX) {
      let dictIndex, newDictIndex;
      // const start = process.hrtime();

      if (u8[offset] < DICT_1BYTE) {
        dictIndex = u8[offset];
        offset += 1;
        newDictIndex = u8[offset];
        offset += 1;
      }
      else if (u8[offset] === DICT_1BYTE) {
        dictIndex = u8[offset + 1] + DICT_1BYTE;
        offset += 2;
        if (u8[offset] < DICT_1BYTE) {
          newDictIndex = u8[offset];
          offset += 1;
        }
        else {
          newDictIndex = u8[offset + 1] + DICT_1BYTE;
          offset += 2;
        }
      }
      else if (u8[offset] === DICT_2BYTE) {
        u16_u8[0] = u8[offset + 1];
        u16_u8[1] = u8[offset + 2];
        dictIndex = u16[0];
        offset += 3;
        if (u8[offset] < DICT_1BYTE) {
          newDictIndex = u8[offset];
          offset += 1;
        }
        else if (u8[offset] === DICT_1BYTE) {
          newDictIndex = u8[offset + 1] + DICT_1BYTE;
          offset += 2;
        }
        else {
          u16_u8[0] = u8[offset + 1];
          u16_u8[1] = u8[offset + 2];
          newDictIndex = u16[0];
          offset += 3;
        }
      }
      else {
        u32_u8[0] = u8[offset + 1];
        u32_u8[1] = u8[offset + 2];
        u32_u8[2] = u8[offset + 3];
        u32_u8[3] = u8[offset + 4];
        dictIndex = u32[0];
        offset += 5;
        if (u8[offset] < DICT_1BYTE) {
          newDictIndex = u8[offset];
          offset += 1;
        }
        else if (u8[offset] === DICT_1BYTE) {
          newDictIndex = u8[offset + 1] + DICT_1BYTE;
          offset += 2;
        }
        else if (u8[offset] === DICT_2BYTE) {
          u16_u8[0] = u8[offset + 1];
          u16_u8[1] = u8[offset + 2];
          newDictIndex = u16[0];
          offset += 3;
        }
        else {
          u32_u8[0] = u8[offset + 1];
          u32_u8[1] = u8[offset + 2];
          u32_u8[2] = u8[offset + 3];
          u32_u8[3] = u8[offset + 4];
          newDictIndex = u32[0];
          offset += 5;
        }
      }

      // console.log(dictIndex, newDictIndex, check);

      const order = dict.order;
      result = order[dictIndex];
      if (newDictIndex !== 0) {
        newDictIndex = dictIndex - newDictIndex;
        order[dictIndex] = order[newDictIndex];
        order[newDictIndex] = result;
      }

      // const end = process.hrtime();
      // dictDt += end[0] - start[0] + (end[1] - start[1]) / 1e9;
      readStack.depth -= 1;
      id = popId;
    }
    else if (id === VARIED_PREFIX) {
      // const start = process.hrtime();
      if ((u8[offset] & VARIED_BIT_MASK) < (UINT8_PLUS & VARIED_BIT_MASK)) {
        result = u8[offset] & UINT6_BIT_MASK;
        offset += 1;
        readStack.depth -= 1;
        id = popId;
      }
      else if (u8[offset] === INT32) {
        i32_u8[0] = u8[offset + 1];
        i32_u8[1] = u8[offset + 2];
        i32_u8[2] = u8[offset + 3];
        i32_u8[3] = u8[offset + 4];
        result = i32[0];
        offset += 5;
        readStack.depth -= 1;
        id = popId;
      }
      else if (u8[offset] === FLOAT64) {
        f64_u8[0] = u8[offset + 1];
        f64_u8[1] = u8[offset + 2];
        f64_u8[2] = u8[offset + 3];
        f64_u8[3] = u8[offset + 4];
        f64_u8[4] = u8[offset + 5];
        f64_u8[5] = u8[offset + 6];
        f64_u8[6] = u8[offset + 7];
        f64_u8[7] = u8[offset + 8];
        offset += 9;
        result = f64[0];
        readStack.depth -= 1;
        id = popId;
      }
      else {
        if (u8[offset] === NULL) {
          result = null;
          offset += 1;
          readStack.depth -= 1;
          id = popId;
        }
        else if (u8[offset] === FALSE) {
          result = false;
          offset += 1;
          readStack.depth -= 1;
          id = popId;
        }
        else if (u8[offset] === TRUE) {
          result = true;
          offset += 1;
          readStack.depth -= 1;
          id = popId;
        }
        else if (u8[offset] === STRING_EMPTY) {
          result = '';
          offset += 1;
          readStack.depth -= 1;
          id = popId;
        }
      }
      // const end = process.hrtime();
      // variedDt += end[0] - start[0] + (end[1] - start[1]) / 1e9;
    }
    else if (id === STRING_PREFIX) {
      if ((u8[offset] & STRING_BIT_MASK) < (STRING_1BYTE & STRING_BIT_MASK)) {
        length = u8[offset] & STRING_BIT_MASK;
        offset += 1;
      }
      else {
        u32_u8[0] = u8[offset + 1];
        u32_u8[1] = u8[offset + 2];
        u32_u8[2] = u8[offset + 3];
        u32_u8[3] = u8[offset + 4];
        length = u32[0];
        offset += 5;
      }

      let dictIndex;
      if ((u8[offset] & DICT_BIT_MASK) < (DICT_1BYTE & DICT_BIT_MASK)) {
        dictIndex = u8[offset] & DICT_BIT_MASK;
        offset += 1;
      }
      else {
        u32_u8[0] = u8[offset + 1];
        u32_u8[1] = u8[offset + 2];
        u32_u8[2] = u8[offset + 3];
        u32_u8[3] = u8[offset + 4];
        dictIndex = u32[0];
        offset += 5;
      }

      // let out = '';
      // let pos = offset;
      // let i = length;
      //
      // while (i--) {
      //   const byte1 = u8[pos];
      //
      //   if ((byte1 & 0x80) === 0) {  // 1-byte
      //     out += CHARS_127[byte1];
      //     pos += 1;
      //   } else if ((byte1 & 0xe0) === 0xc0) {  // 2-byte
      //     const byte2 = u8[pos + 1] & 0x3f;
      //     pos += 2;
      //     out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
      //   } else if ((byte1 & 0xf0) === 0xe0) {
      //     const byte2 = u8[pos + 1] & 0x3f;
      //     const byte3 = u8[pos + 2] & 0x3f;
      //     pos += 3;
      //     out += String.fromCharCode(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
      //   } else if ((byte1 & 0xf8) === 0xf0) {
      //     const byte2 = u8[pos + 1] & 0x3f;
      //     const byte3 = u8[pos + 2] & 0x3f;
      //     const byte4 = u8[pos + 3] & 0x3f;
      //     pos += 4;
      //
      //     // this can be > 0xffff, so possibly generate surrogates
      //     let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
      //     if (codepoint > 0xffff) {
      //       // codepoint &= ~0x10000;
      //       codepoint -= 0x10000;
      //       const surrogate = (codepoint >>> 10) & 0x3ff | 0xd800; // ???
      //       codepoint = 0xdc00 | codepoint & 0x3ff;
      //       out += String.fromCharCode(surrogate, codepoint);
      //     }
      //     else {
      //       out += String.fromCharCode(codepoint);
      //     }
      //   } else {
      //     // FIXME: we're ignoring this
      //   }
      // }

      // const out = _decoder.decode(new Uint8Array(u8.buffer, offset, length));
      const out = u8_node.slice(offset, offset + length).toString();

      // const start = process.hrtime();

      const order = dict.order;
      if (dictIndex === order.length) {
        order[dictIndex] = out;
      }
      else {
        order[order.length] = order[dictIndex];
        order[dictIndex] = out;
      }

      // const end = process.hrtime();
      // stringDt += end[0] - start[0] + (end[1] - start[1]) / 1e9;

      offset += length;
      result = out;
      readStack.depth -= 1;
      id = popId;
    }
    if (id === OBJECT_PREFIX) {
      const cell = readStack.cell;
      if (cell.result === null) {
        cell.result = {};
        cell.index = 0;

        if ((u8[offset] & OBJECT_BIT_MASK) < (OBJECT_1BYTE & OBJECT_BIT_MASK)) {
          cell.length = u8[offset] & OBJECT_BIT_MASK;
          offset += 1;
        }
        else {
          u32_u8[0] = u8[offset + 1];
          u32_u8[1] = u8[offset + 2];
          u32_u8[2] = u8[offset + 3];
          u32_u8[3] = u8[offset + 4];
          cell.length = u32[0];
          offset += 5;
        }
      }

      if (cell.index / 2 < cell.length) {
        if (cell.index % 2 === 0) {
          if (cell.index > 0) {
            cell.result[cell.objectKey] = result;
          }
          popId = OBJECT_PREFIX;
          id = readStack.push(u8, offset);
          cell.index += 1;
        }
        else {
          cell.objectKey = result;

          popId = OBJECT_PREFIX;
          id = readStack.push(u8, offset);
          cell.index += 1;
        }
      }
      else {
        if (cell.index > 0) {
          cell.result[cell.objectKey] = result;
        }

        result = cell.result;
        readStack.depth -= 1;
        if (readStack.depth) {
          id = readStack.cell.id;
        }
      }
    }
    else if (id === ARRAY_PREFIX) {
      const cell = readStack.cell;
      if (cell.result === null) {
        cell.result = [];
        cell.index = 0;

        if ((u8[offset] & OBJECT_BIT_MASK) < (ARRAY_1BYTE & OBJECT_BIT_MASK)) {
          cell.length = u8[offset] & OBJECT_BIT_MASK;
          offset += 1;
        }
        else {
          u32_u8[0] = u8[offset + 1];
          u32_u8[1] = u8[offset + 2];
          u32_u8[2] = u8[offset + 3];
          u32_u8[3] = u8[offset + 4];
          cell.length = u32[0];
          offset += 5;
        }
      }

      if (cell.index < cell.length) {
        if (cell.index > 0) {
          cell.result.push(result);
        }

        popId = ARRAY_PREFIX;
        id = readStack.push(u8, offset);
        cell.index += 1;
      }
      else {
        if (cell.index > 0) {
          cell.result.push(result);
        }

        result = cell.result;
        readStack.depth -= 1;
        if (readStack.depth) {
          id = readStack.cell.id;
        }
      }
    }
  }
  // console.log(offset);
  return result;
};

// let {TextEncoder, TextDecoder} = (function() {
//   const mod = {};
//   /*
//   * Copyright 2017 Sam Thorogood. All rights reserved.
//   *
//   * Licensed under the Apache License, Version 2.0 (the "License"); you may not
//   * use this file except in compliance with the License. You may obtain a copy of
//   * the License at
//   *
//   *     http://www.apache.org/licenses/LICENSE-2.0
//   *
//   * Unless required by applicable law or agreed to in writing, software
//   * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//   * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
//   * License for the specific language governing permissions and limitations under
//   * the License.
//   */
//
//   /**
//   * @fileoverview Polyfill for TextEncoder and TextDecoder.
//   *
//   * You probably want `text.min.js`, and not this file directly.
//   */
//
//   (function(scope) {
//   'use strict';
//
//   // fail early
//   if (scope['TextEncoder'] && scope['TextDecoder']) {
//   return false;
//   }
//
//   /**
//   * @constructor
//   * @param {string=} utfLabel
//   */
//   function FastTextEncoder(utfLabel='utf-8') {
//   if (utfLabel !== 'utf-8') {
//     throw new RangeError(
//       `Failed to construct 'TextEncoder': The encoding label provided ('${utfLabel}') is invalid.`);
//     }
//   }
//
//   Object.defineProperty(FastTextEncoder.prototype, 'encoding', {value: 'utf-8'});
//
//   /**
//   * @param {string} string
//   * @param {{stream: boolean}=} options
//   * @return {!Uint8Array}
//   */
//   FastTextEncoder.prototype.encode = function(string, options={stream: false}) {
//     if (options.stream) {
//       throw new Error(`Failed to encode: the 'stream' option is unsupported.`);
//     }
//
//     let pos = 0;
//     const len = string.length;
//     const out = [];
//
//     let at = 0;  // output position
//     let tlen = Math.max(32, len + (len >> 1) + 7);  // 1.5x size
//     let target = new Uint8Array((tlen >> 3) << 3);  // ... but at 8 byte offset
//
//     while (pos < len) {
//       let value = string.charCodeAt(pos++);
//       if (value >= 0xd800 && value <= 0xdbff) {
//         // high surrogate
//         if (pos < len) {
//           const extra = string.charCodeAt(pos);
//           if ((extra & 0xfc00) === 0xdc00) {
//             ++pos;
//             value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
//           }
//         }
//         if (value >= 0xd800 && value <= 0xdbff) {
//           continue;  // drop lone surrogate
//         }
//       }
//
//       // expand the buffer if we couldn't write 4 bytes
//       if (at + 4 > target.length) {
//         tlen += 8;  // minimum extra
//         tlen *= (1.0 + (pos / string.length) * 2);  // take 2x the remaining
//         tlen = (tlen >> 3) << 3;  // 8 byte offset
//
//         const update = new Uint8Array(tlen);
//         update.set(target);
//         target = update;
//       }
//
//       if ((value & 0xffffff80) === 0) {  // 1-byte
//         target[at++] = value;  // ASCII
//         continue;
//       } else if ((value & 0xfffff800) === 0) {  // 2-byte
//         target[at++] = ((value >>  6) & 0x1f) | 0xc0;
//       } else if ((value & 0xffff0000) === 0) {  // 3-byte
//         target[at++] = ((value >> 12) & 0x0f) | 0xe0;
//         target[at++] = ((value >>  6) & 0x3f) | 0x80;
//       } else if ((value & 0xffe00000) === 0) {  // 4-byte
//         target[at++] = ((value >> 18) & 0x07) | 0xf0;
//         target[at++] = ((value >> 12) & 0x3f) | 0x80;
//         target[at++] = ((value >>  6) & 0x3f) | 0x80;
//       } else {
//         // FIXME: do we care
//         continue;
//       }
//
//       target[at++] = (value & 0x3f) | 0x80;
//     }
//
//     return target.slice(0, at);
//   }
//
//   /**
//   * @constructor
//   * @param {string=} utfLabel
//   * @param {{fatal: boolean}=} options
//   */
//   function FastTextDecoder(utfLabel='utf-8', options={fatal: false}) {
//     if (utfLabel !== 'utf-8') {
//       throw new RangeError(
//         `Failed to construct 'TextDecoder': The encoding label provided ('${utfLabel}') is invalid.`);
//       }
//       if (options.fatal) {
//         throw new Error(`Failed to construct 'TextDecoder': the 'fatal' option is unsupported.`);
//       }
//     }
//
//     Object.defineProperty(FastTextDecoder.prototype, 'encoding', {value: 'utf-8'});
//
//     Object.defineProperty(FastTextDecoder.prototype, 'fatal', {value: false});
//
//     Object.defineProperty(FastTextDecoder.prototype, 'ignoreBOM', {value: false});
//
//     /**
//     * @param {(!ArrayBuffer|!ArrayBufferView)} buffer
//     * @param {{stream: boolean}=} options
//     */
//     FastTextDecoder.prototype.decode = function(buffer, pos = 0, end = buffer.length) {
//       // if (options['stream']) {
//       //   throw new Error(`Failed to decode: the 'stream' option is unsupported.`);
//       // }
//
//       const bytes = buffer;
//       let out = '';
//
//       while (pos < end) {
//         const byte1 = bytes[pos++];
//         if (byte1 === 0) {
//           break;  // NULL
//         }
//
//         if ((byte1 & 0x80) === 0) {  // 1-byte
//           out += CHARS_127[byte1];
//         } else if ((byte1 & 0xe0) === 0xc0) {  // 2-byte
//           const byte2 = bytes[pos++] & 0x3f;
//           out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
//         } else if ((byte1 & 0xf0) === 0xe0) {
//           const byte2 = bytes[pos++] & 0x3f;
//           const byte3 = bytes[pos++] & 0x3f;
//           out += String.fromCharCode(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
//         } else if ((byte1 & 0xf8) === 0xf0) {
//           const byte2 = bytes[pos++] & 0x3f;
//           const byte3 = bytes[pos++] & 0x3f;
//           const byte4 = bytes[pos++] & 0x3f;
//
//           // this can be > 0xffff, so possibly generate surrogates
//           let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
//           if (codepoint > 0xffff) {
//             // codepoint &= ~0x10000;
//             codepoint -= 0x10000;
//             out.push((codepoint >>> 10) & 0x3ff | 0xd800)
//             codepoint = 0xdc00 | codepoint & 0x3ff;
//           }
//           out += String.fromCharCode(codepoint);
//         } else {
//           // FIXME: we're ignoring this
//         }
//       }
//
//       return out;
//     }
//
//     scope['TextEncoder'] = FastTextEncoder;
//     scope['TextDecoder'] = FastTextDecoder;
//
//   }(mod));
//   return mod;
// })();
//
// if (this.TextEncoder) {
//   TextEncoder = this.TextEncoder;
//   TextDecoder = this.TextDecoder;
// }

const b = new Uint8Array(2 * 1024 * 1024);
b.slice(0, write(b, 0, [1, 2, 3]));
read(b, 0);

const testData1 = {"type":"NormalModule","constructor":{"data":{"type":"javascript/auto","request":"index.js","userRequest":"index.js","rawRequest":"index.js","loaders":[],"resource":"index.js","parser":{"type":"Parser","options":{},"sourceType":"auto","moduleType":"javascript/auto"},"generator":{"type":"JavascriptGenerator","moduleType":"javascript/auto","options":{}},"resolveOptions":{}}},"identifier":"index.js","assigned":{"factoryMeta":{},"issuer":null,"useSourceMap":false,"lineToLine":false},"build":{"built":true,"buildTimestamp":1518546698333,"buildMeta":{"exportsType":"namespace","providedExports":["default"]},"buildInfo":{"cacheable":true,"fileDependencies":["index.js"],"contextDependencies":[],"strict":true,"exportsArgument":"__webpack_exports__"},"warnings":[],"errors":[],"_source":{"type":"OriginalSource","value":"import is from './is';\n\nexport default is({});\n","name":"index.js"},"hash":"385d51f3c5d321e36f963e594282af3b","_lastSuccessfulBuildMeta":{"exportsType":"namespace","providedExports":["default"]}},"dependencyBlock":{"type":"DependenciesBlock","dependencies":[{"type":"HarmonyCompatibilityDependency","loc":{"start":{"line":-1,"column":0},"end":{"line":-1,"column":0},"index":-3}},{"type":"HarmonyInitDependency","loc":{"start":{"line":-1,"column":0},"end":{"line":-1,"column":0},"index":-2}},{"type":"ConstDependency","expression":"","range":[0,22],"loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":22}}},{"type":"HarmonyImportSideEffectDependency","request":"./is","sourceOrder":1,"loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":22}}},{"type":"HarmonyExportHeaderDependency","range":[39,45],"rangeStatement":[24,46],"loc":{"index":-1,"start":{"line":3,"column":0},"end":{"line":3,"column":22}}},{"type":"HarmonyExportExpressionDependency","range":[39,45],"rangeStatement":[24,46],"loc":{"index":-1,"start":{"line":3,"column":0},"end":{"line":3,"column":22}}},{"type":"HarmonyImportSpecifierDependency","request":"./is","sourceOrder":1,"id":"default","name":"is","range":[39,41],"strictExportPresence":false,"namespaceObjectAsContext":false,"callArgs":[{"type":"ObjectExpression","start":42,"end":44,"loc":{"start":{"line":3,"column":18},"end":{"line":3,"column":20}},"range":[42,44],"properties":[]}],"call":{"type":"CallExpression","start":39,"end":45,"loc":{"start":{"line":3,"column":15},"end":{"line":3,"column":21}},"range":[39,45],"callee":{"type":"Identifier","start":39,"end":41,"loc":{"start":{"line":3,"column":15},"end":{"line":3,"column":17}},"range":[39,41],"name":"is"},"arguments":[{"type":"ObjectExpression","start":42,"end":44,"loc":{"start":{"line":3,"column":18},"end":{"line":3,"column":20}},"range":[42,44],"properties":[]}]},"directImport":true,"loc":{"start":{"line":3,"column":15},"end":{"line":3,"column":17}}}],"variables":[],"blocks":[]},"source":{"_cachedSource":{"type":"CachedSource","source":{"type":"ReplaceSource","replacements":[[45,45,");",3],[39,40,"__WEBPACK_MODULE_REFERENCE__1_64656661756c74_call__",4],[24,38,"/* harmony default export */ var __WEBPACK_MODULE_DEFAULT_EXPORT__ = __webpack_exports__[\"default\"] = (",2],[24,38,"",1],[0,21,"",0]]},"cachedSource":"\n\n/* harmony default export */ var __WEBPACK_MODULE_DEFAULT_EXPORT__ = __webpack_exports__[\"default\"] = (__WEBPACK_MODULE_REFERENCE__1_64656661756c74_call__({}));\n","cachedMaps":{}},"_cachedSourceHash":"385d51f3c5d321e36f963e594282af3b-undefined","renderedHash":"385d51f3c5d321e36f96"}};
const testData2 = JSON.parse(require('fs').readFileSync('./test2.json', 'utf8'));
const testData3 = JSON.parse(require('fs').readFileSync('./test3.json', 'utf8'));

const testDataString = '{"type":"javascript/auto","request":"index.js","userRequest":"index.js","rawRequest":"index.js","loaders":[],"resource":"index.js","parser":{"type":"Parser","options":{},"sourceType":"auto","moduleType":"javascript/auto"},"generator":{"type":"JavascriptGenerator","moduleType":"javascript/auto","options":{}},"resolveOptions":{}}';

const testDataArray = new Uint8Array([
  123, 34, 116, 121, 112, 101, 34, 58, 34, 106, 97, 118, 97, 115, 99, 114, 105, 112, 116, 47, 97, 117, 116, 111, 34,
  44, 34, 114, 101, 113, 117, 101, 115, 116, 34, 58, 34, 105, 110, 100, 101, 120, 46, 106, 115, 34, 44, 34, 117, 115,
  101, 114, 82, 101, 113, 117, 101, 115, 116, 34, 58, 34, 105, 110, 100, 101, 120, 46, 106, 115, 34, 44, 34, 114, 97,
  119, 82, 101, 113, 117, 101, 115, 116, 34, 58, 34, 105, 110, 100, 101, 120, 46, 106, 115, 34, 44, 34, 108, 111, 97,
  100, 101, 114, 115, 34, 58, 91, 93, 44, 34, 114, 101, 115, 111, 117, 114, 99, 101, 34, 58, 34, 105, 110, 100, 101,
  120, 46, 106, 115, 34, 44, 34, 112, 97, 114, 115, 101, 114, 34, 58, 123, 34, 116, 121, 112, 101, 34, 58, 34, 80, 97,
  114, 115, 101, 114, 34, 44, 34, 111, 112, 116, 105, 111, 110, 115, 34, 58, 123, 125, 44, 34, 115, 111, 117, 114, 99,
  101, 84, 121, 112, 101, 34, 58, 34, 97, 117, 116, 111, 34, 44, 34, 109, 111, 100, 117, 108, 101, 84, 121, 112, 101,
  34, 58, 34, 106, 97, 118, 97, 115, 99, 114, 105, 112, 116, 47, 97, 117, 116, 111, 34, 125, 44, 34, 103, 101, 110,
  101, 114, 97, 116, 111, 114, 34, 58, 123, 34, 116, 121, 112, 101, 34, 58, 34, 74, 97, 118, 97, 115, 99, 114, 105,
  112, 116, 71, 101, 110, 101, 114, 97, 116, 111, 114, 34, 44, 34, 109, 111, 100, 117, 108, 101, 84, 121, 112, 101, 34,
  58, 34, 106, 97, 118, 97, 115, 99, 114, 105, 112, 116, 47, 97, 117, 116, 111, 34, 44, 34, 111, 112, 116, 105, 111,
  110, 115, 34, 58, 123, 125, 125, 44, 34, 114, 101, 115, 111, 108, 118, 101, 79, 112, 116, 105, 111, 110, 115, 34, 58,
  123, 125, 125
]);

let _testDataArray;

function bench1(n) {
  if (!_encoder) {
    _encoder = new TextEncoder();
  }
  var start = process.hrtime();
  while (n--) {
    _encoder.encode(JSON.stringify(testData));
  }
  var end = process.hrtime();
  _testDataString = JSON.stringify(testData);
  _testDataArray = _encoder.encode(_testDataString);
  return end[0] - start[0] + (end[1] - start[1]) / 1e9;
}

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

function bench2(n) {
  var start = process.hrtime();
  while (n--) {
    write(b, 0, testData, ORDER.slice());
  }
  var end = process.hrtime();
  return end[0] - start[0] + (end[1] - start[1]) / 1e9;
}

function bench3(n) {
  if (!_decoder) {
    _decoder = new TextDecoder();
  }
  var start = process.hrtime();
  while (n--) {
    let buffer = new Buffer(_testDataArray);
    JSON.parse(buffer.utf8Slice());
    // JSON.parse(_decoder.decode(_testDataArray));
    // JSON.parse(_testDataString);
  }
  var end = process.hrtime();
  return end[0] - start[0] + (end[1] - start[1]) / 1e9;
}

function bench4(n) {
  var start = process.hrtime();
  while (n--) {
    read(b, 0, ORDER.slice());
  }
  var end = process.hrtime();
  return end[0] - start[0] + (end[1] - start[1]) / 1e9;
}

// function bench1(n) {
//   if (!_encoder) {
//     _encoder = new TextEncoder();
//   }
//   var start = performance.now();
//   while (n--) {
//     _encoder.encode(JSON.stringify(testData.constructor.data));
//   }
//   var end = performance.now();
//   return end - start;
// }
//
// function bench2(n) {
//   var start = performance.now();
//   while (n--) {
//     write(b, 0, testData.constructor.data);
//   }
//   var end = performance.now();
//   return end - start;
// }
//
// function bench3(n) {
//   if (!_decoder) {
//     _decoder = new TextDecoder();
//   }
//   var start = performance.now();
//   while (n--) {
//     JSON.parse(_decoder.decode(testDataArray));
//   }
//   var end = performance.now();
//   return end - start;
// }
//
// function bench4(n) {
//   var start = performance.now();
//   while (n--) {
//     read(b, 0);
//   }
//   var end = performance.now();
//   return end - start;
// }

const testData4 = {};
for (const [key, value] of Object.entries(testData3)) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [key2, value2] of Object.entries(value)) {
      testData4[key2] = value2;
    }
  }
  else {
    testData4[key] = value;
  }
}
// testData3.dependencyBlock.dependencies.forEach(dep => {
//   if (dep.activeExports) {
//     dep.activeExports = [];
//   }
// });
// delete testData3.dependencyBlock.dependencies;
// delete testData3.source;
// delete testData3.build._source;
// delete testData3.build.buildMeta.providedExports;
// delete testData3.build._lastSuccessfulBuildMeta;
// testData3.build.buildMeta.providedExports = testData3.build.buildMeta.providedExports.join(',');
// testData3.build._lastSuccessfulBuildMeta.providedExports = testData3.build._lastSuccessfulBuildMeta.providedExports.join(',');
const testData = testData1;
console.log(bench1(1e3)); // JSON encode
console.log(bench2(1e3)); // kp encode
console.log(bench3(1e3)); // JSON decode
console.log(bench4(1e3)); // kp decode
// console.log(JSON.stringify(testData));
console.log(JSON.stringify(testData).length);
console.log(write(b, 0, testData, ORDER.slice()));
console.log(dict.order.length);
// read(b, 0, ORDER.slice());
// console.log(JSON.stringify(read(b, 0, ORDER.slice())));
// console.log(read(b, 0, ORDER.slice()));
// console.log(dictDt, variedDt, stringDt);
// console.log(write(b, 0, null), read(b, 0));
// console.log(write(b, 0, false), read(b, 0));
// console.log(write(b, 0, true), read(b, 0));
// console.log(write(b, 0, 0), read(b, 0));
// console.log(write(b, 0, 1), read(b, 0));
// console.log(write(b, 0, 0.5), read(b, 0));
// console.log(write(b, 0, '0123456789123456789012345'), read(b, 0));
// console.log(write(b, 0, '01234567891234567890123456'), read(b, 0));
// console.log(write(b, 0, '012345678912345678901234567'), read(b, 0));
// console.log(write(b, 0, {a: 1}), read(b, 0));
// console.log(write(b, 0, [1, 2, 3]), read(b, 0));
