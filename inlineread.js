// Copyright 2018 Michael "Z" Goddard
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// 0x00 null
// 0x01 boolean
// 0x02 int32
// 0x03 float64
// 0x04 utf8
// 0x05 dict
// 0x05 obj
// 0x06 array

// 0x00 dict - 7 bit id 0-124 (first bit off) (id & 0x01 === 0x00)
//   0xfa dict - 8 bits + 125 id
//   0xfc dict - 2 byte id
//   0xfe dict - 4 byte id
// 0x01 uint6 - 6 bits 0-50 (first bit on, second bit off) (id & 0x03 === 0x01)
//   0xcd uint8+ - 8bits + 50
//   0xd1 '' (empty string)
//   0xd5 null
//   0xd9 false
//   0xdd true
//   0xe1 uint16
//   0xd5 uint32
//   0xe9 int8
//   0xed int16
//   0xf1 int32
//   0xf5 float16
//   0xf9 float32
//   0xfd float64
// 0x03 utf8 - 5 bit length 1-29 (first 2 bits on, third bit off) (id & 0x07 === 0x03)
//   0xeb utf8 - 1 byte length
//   0xf3 utf8 - 2 byte length
//   0xfb utf8 - 4 byte length
// 0x07 obj - 4 bit length 0-12 (first 3 bits on, fourth bit off) (id & 0x0f === 0x07)
//   0xd7 obj - 1 byte length
//   0xe7 obj - 2 byte length
//   0xf7 obj - 4 byte length
// 0x0f array - 4 bit length 0-12 (first 4 bits on) (id & 0x0f === 0x0f)
//   0xdf array - 1 byte length
//   0xef array - 2 byte length
//   0xff array - 4 byte length

// dict order
// - increment count in dictionary count
// - find last dictionary item with count equal to or greater than this item
// - move item to after that item

const NULL = 0x00;
const BOOLEAN = 0x01;
const FALSE = BOOLEAN;
const TRUE = BOOLEAN | 0x8;
const INT32 = 0x02;
const FLOAT64 = 0x03;
const UTF8 = 0x04;
const DICT = 0x05;
const STR7 = 0xff;
const OBJ = 0x06;
const ARY = 0x07;

const CHARS_127 = '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\u000b\f\r\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const DICTIONARY = [
  'type',
  'request',
  'userRequest',
  'rawRequest',
  'loaders',
  'resource',
  'parser',
  'generator',
  'options',
  'sourceType',
  'moduleType',
  'resolveOptions',
];

const writeId = (u8, offset, id) => {
  u8[offset] = id;
  return 1;
};

const writeNull = (u8, offset, value) => {
  return writeId(u8, offset, NULL);
};

const writeBoolean = (u8, offset, value) => {
  return writeId(u8, offset, value ? TRUE : FALSE);
};

const i32 = new Int32Array(1);
const i32_u8 = new Uint8Array(i32.buffer);
const writeInt32 = (u8, offset, value) => {
  writeId(u8, offset, INT32);
  i32[0] = value;
  u8[offset + 1] = i32_u8[0];
  u8[offset + 2] = i32_u8[1];
  u8[offset + 3] = i32_u8[2];
  u8[offset + 4] = i32_u8[3];
  return 5;
};

const UINT32 = 0x02;
const u32 = new Uint32Array(1);
const u32_u8 = new Uint8Array(i32.buffer);
const writeUint32 = (u8, offset, value) => {
  writeId(u8, offset, UINT32);
  u32[0] = value;
  u8[offset + 1] = u32_u8[0];
  u8[offset + 2] = u32_u8[1];
  u8[offset + 3] = u32_u8[2];
  u8[offset + 4] = u32_u8[3];
  return 5;
};

const f64 = new Float64Array(1);
const f64_u8 = new Uint8Array(f64.buffer);
const writeFloat64 = (u8, offset, value) => {
  writeId(u8, offset, FLOAT64);
  f64[0] = value;
  u8[offset + 1] = f64_u8[0];
  u8[offset + 2] = f64_u8[1];
  u8[offset + 3] = f64_u8[2];
  u8[offset + 4] = f64_u8[3];
  u8[offset + 5] = f64_u8[4];
  u8[offset + 6] = f64_u8[5];
  u8[offset + 7] = f64_u8[6];
  u8[offset + 8] = f64_u8[7];
  return 9;
};

const writeLength = (u8, offset, length) => {
  return writeUint32(u8, offset, length);
};

let _encoder;
const writeUtf8 = (u8, offset, value) => {
  const dictIndex = DICTIONARY.indexOf(value);
  if (dictIndex !== -1) {
    let j = 0;
    if (dictIndex < 16) {
      j += writeId(u8, offset + j, DICT | (dictIndex << 3));
    }
    else {
      j += writeId(u8, offset + j, DICT | 0x80);
      j += writeUint32(u8, offset + j, dictIndex);
    }

    return j;
  }

  if (!_encoder) {
    _encoder = new TextEncoder();
  }
  const enc = _encoder.encode(value);
  const length = enc.length;
  let j = 0;
  if (length < 16) {
    j += writeId(u8, offset + j, UTF8 | (length << 3));
  }
  else {
    j += writeId(u8, offset + j, UTF8 | 0x80);
    j += writeLength(u8, offset + j, length);
  }
  let latin = true;
  for (let i = 0; i < length; i++) {
    latin = latin && ((enc[i] & 0x80) === 0);
    u8[offset + j + i] = enc[i];
  }
  // if (latin) {
  //   u8[offset] = (u8[offset] & 0xf8) | STR7;
  // }
  return j + length;
};

const writeObject = (u8, offset, value) => {
  const keys = Object.keys(value);
  let j = 0;
  if (keys.length < 16) {
    j += writeId(u8, offset + j, OBJ | (keys.length << 3));
  }
  else {
    j += writeId(u8, offset + j, OBJ | 0x80);
    j += writeLength(u8, offset + j, keys.length);
  }
  for (let i = 0; i < keys.length; i++) {
    j += writeUtf8(u8, offset + j, keys[i]);
    j += write(u8, offset + j, value[keys[i]]);
  }
  return j;
};

const writeArray = (u8, offset, value) => {
  let j = 0;
  if (value.length < 16) {
    j += writeId(u8, offset + j, ARY | (value.length << 3));
  }
  else {
    j += writeId(u8, offset + j, ARY | 0x80);
    j += writeLength(u8, offset + j, value.length);
  }
  for (let i = 0; i < value.length; i++) {
    j += write(u8, offset + j, value[i]);
  }
  return j;
};

const write = (u8, offset, value) => {
  if (value === null) {
    return writeNull(u8, offset, value);
  }
  switch (typeof value) {
  case 'boolean':
    return writeBoolean(u8, offset, value);
  case 'number':
    if ((value | 0) === value) {
      return writeInt32(u8, offset, value);
    }
    return writeFloat64(u8, offset, value);
  case 'string':
    return writeUtf8(u8, offset, value);
  case 'object':
    if (Array.isArray(value)) {
      return writeArray(u8, offset, value);
    }
    return writeObject(u8, offset, value);
  default:
    return writeNull(u8, offset, value);
  }
};

const readBaseId = (u8, offset) => {
  return u8[offset] & 0x07;
};

const readHighBit = (u8, offset) => {
  return u8[offset] & 0x80;
};

const readSmallLength = (u8, offset) => {
  return (u8[offset] & 0x78) >> 3;
};

const readNull = () => {
  readNull.size = 1;
  return null;
};

const readBoolean = (u8, offset) => {
  readBoolean.size = 1;
  return (u8[offset] & TRUE) === TRUE;
};

const readInt32 = (u8, offset) => {
  readInt32.size = 5;
  i32_u8[0] = u8[offset + 1];
  i32_u8[1] = u8[offset + 2];
  i32_u8[2] = u8[offset + 3];
  i32_u8[3] = u8[offset + 4];
  return i32[0];
};

const readUint32 = (u8, offset) => {
  readUint32.size = 5;
  u32_u8[0] = u8[offset + 1];
  u32_u8[1] = u8[offset + 2];
  u32_u8[2] = u8[offset + 3];
  u32_u8[3] = u8[offset + 4];
  return u32[0];
};

const readFloat64 = (u8, offset) => {
  readFloat64.size = 9;
  f64_u8[0] = u8[offset + 1];
  f64_u8[1] = u8[offset + 2];
  f64_u8[2] = u8[offset + 3];
  f64_u8[3] = u8[offset + 4];
  f64_u8[4] = u8[offset + 5];
  f64_u8[5] = u8[offset + 6];
  f64_u8[6] = u8[offset + 7];
  f64_u8[7] = u8[offset + 8];
  return f64[0];
};

const readBigLength = (u8, offset) => {
  const result = readUint32(u8, offset);
  readBigLength.size = readUint32.size;
  return result;
};

const readLength = (u8, offset) => {
  let length;
  if (u8[offset] & 0x80) {
    u32_u8[0] = u8[offset + 1];
    u32_u8[1] = u8[offset + 2];
    u32_u8[2] = u8[offset + 3];
    u32_u8[3] = u8[offset + 4];
    result = u32[0];
    readLength.size = 5;
  }
  else {
    length = (u8[offset] & 0x78) >> 3;
    readLength.size = 1;
  }
  return length;
};

let _decoder;
const readUtf8 = (u8, offset) => {
  let length = readLength(u8, offset);
  let j = readLength.size;

  if (!_decoder) {
    _decoder = new TextDecoder();
  }

  let out = '';
  let pos = offset + j;
  let end = offset + j + length

  while (pos < end) {
    const byte1 = u8[pos++];
    if (byte1 === 0) {
      break;  // NULL
    }

    if ((byte1 & 0x80) === 0) {  // 1-byte
      out += CHARS_127[byte1];
    } else if ((byte1 & 0xe0) === 0xc0) {  // 2-byte
      const byte2 = u8[pos++] & 0x3f;
      out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
    } else if ((byte1 & 0xf0) === 0xe0) {
      const byte2 = u8[pos++] & 0x3f;
      const byte3 = u8[pos++] & 0x3f;
      out += String.fromCharCode(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
    } else if ((byte1 & 0xf8) === 0xf0) {
      const byte2 = u8[pos++] & 0x3f;
      const byte3 = u8[pos++] & 0x3f;
      const byte4 = u8[pos++] & 0x3f;

      // this can be > 0xffff, so possibly generate surrogates
      let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
      if (codepoint > 0xffff) {
        // codepoint &= ~0x10000;
        codepoint -= 0x10000;
        out.push((codepoint >>> 10) & 0x3ff | 0xd800)
        codepoint = 0xdc00 | codepoint & 0x3ff;
      }
      out += String.fromCharCode(codepoint);
    } else {
      // FIXME: we're ignoring this
    }
  }

  readUtf8.size = j + length;
  return out;
};

const readObject = (u8, offset) => {
  let length = readLength(u8, offset);
  let j = readLength.size;

  let o = {};
  for (let i = 0; i < length; i++) {
    const key = readUtf8(u8, offset + j);
    j += readUtf8.size;
    const value = read(u8, offset + j);
    j += read.size;
    o[key] = value;
  }

  readObject.size = j;
  return o;
};

const readArray = (u8, offset) => {
  let length = readLength(u8, offset);
  let j = readLength.size;

  let a = [];
  for (let i = 0; i < length; i++) {
    a.push(read(u8, offset + j));
    j += read.size;
  }

  readArray.size = j;
  return a;
};

class ReadCell {
  constructor() {
    this.id = NULL;
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
    const id = u8[offset] & 0x07;
    if (id >= OBJ) {
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

const _readUtf8 = (u8, pos, end) => {
  let out = '';

  while (pos < end) {
    const byte1 = u8[pos];

    if ((byte1 & 0x80) === 0) {  // 1-byte
      out += CHARS_127[byte1];
      pos += 1;
    } else if ((byte1 & 0xe0) === 0xc0) {  // 2-byte
      const byte2 = u8[pos + 1] & 0x3f;
      pos += 2;
      out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
    } else if ((byte1 & 0xf0) === 0xe0) {
      const byte2 = u8[pos + 1] & 0x3f;
      const byte3 = u8[pos + 2] & 0x3f;
      pos += 3;
      out += String.fromCharCode(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
    } else if ((byte1 & 0xf8) === 0xf0) {
      const byte2 = u8[pos + 1] & 0x3f;
      const byte3 = u8[pos + 2] & 0x3f;
      const byte4 = u8[pos + 3] & 0x3f;
      pos += 4;

      // this can be > 0xffff, so possibly generate surrogates
      let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
      if (codepoint > 0xffff) {
        // codepoint &= ~0x10000;
        codepoint -= 0x10000;
        const surrogate = (codepoint >>> 10) & 0x3ff | 0xd800; // ???
        codepoint = 0xdc00 | codepoint & 0x3ff;
        out += String.fromCharCode(surrogate, codepoint);
      }
      else {
        out += String.fromCharCode(codepoint);
      }
    } else {
      // FIXME: we're ignoring this
    }
  }

  return out;
};

const readStack = new ReadStack();
const stringOut = [];
const read = (u8, offset) => {
  let result, length, j, id, popId;
  readStack.reset();
  id = readStack.push(u8, offset);
  while (readStack.depth) {
    if ((id & 0x04) === 0x04) {
      if (id === UTF8) {
        if (u8[offset] & 0x80) {
          u32_u8[0] = u8[offset + 2];
          u32_u8[1] = u8[offset + 3];
          u32_u8[2] = u8[offset + 4];
          u32_u8[3] = u8[offset + 5];
          length = u32[0];
          offset += 6;
        }
        else {
          length = (u8[offset] & 0x78) >> 3;
          offset += 1;
        }

        let out = '';
        let pos = offset;
        const end = offset + length

        while (pos < end) {
          const byte1 = u8[pos];

          if ((byte1 & 0x80) === 0) {  // 1-byte
            out += CHARS_127[byte1];
            pos += 1;
          } else if ((byte1 & 0xe0) === 0xc0) {  // 2-byte
            const byte2 = u8[pos + 1] & 0x3f;
            pos += 2;
            out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
          } else if ((byte1 & 0xf0) === 0xe0) {
            const byte2 = u8[pos + 1] & 0x3f;
            const byte3 = u8[pos + 2] & 0x3f;
            pos += 3;
            out += String.fromCharCode(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
          } else if ((byte1 & 0xf8) === 0xf0) {
            const byte2 = u8[pos + 1] & 0x3f;
            const byte3 = u8[pos + 2] & 0x3f;
            const byte4 = u8[pos + 3] & 0x3f;
            pos += 4;

            // this can be > 0xffff, so possibly generate surrogates
            let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
            if (codepoint > 0xffff) {
              // codepoint &= ~0x10000;
              codepoint -= 0x10000;
              const surrogate = (codepoint >>> 10) & 0x3ff | 0xd800; // ???
              codepoint = 0xdc00 | codepoint & 0x3ff;
              out += String.fromCharCode(surrogate, codepoint);
            }
            else {
              out += String.fromCharCode(codepoint);
            }
          } else {
            // FIXME: we're ignoring this
          }
        }

        offset += length;
        result = out;
        readStack.depth -= 1;
        id = popId;
      }
      else if (id === STR7) {
        if (u8[offset] & 0x80) {
          u32_u8[0] = u8[offset + 2];
          u32_u8[1] = u8[offset + 3];
          u32_u8[2] = u8[offset + 4];
          u32_u8[3] = u8[offset + 5];
          length = u32[0];
          offset += 6;
        }
        else {
          length = (u8[offset] & 0x78) >> 3;
          offset += 1;
        }

        let out = '';
        let pos = offset;
        const end = offset + length

        while (pos < end) {
          out += CHARS_127[u8[pos]];
          pos += 1;
        }

        offset += length;
        result = out;
        readStack.depth -= 1;
        id = popId;
      }
      else if (id === DICT) {
        let dictIndex;
        if (u8[offset] & 0x80) {
          u32_u8[0] = u8[offset + 2];
          u32_u8[1] = u8[offset + 3];
          u32_u8[2] = u8[offset + 4];
          u32_u8[3] = u8[offset + 5];
          dictIndex = u32[0];
          offset += 6;
        }
        else {
          dictIndex = (u8[offset] & 0x78) >> 3;
          offset += 1;
        }

        result = DICTIONARY[dictIndex];
        readStack.depth -= 1;
        id = popId;
      }
      else if (id === OBJ) {
        const cell = readStack.cell;
        if (cell.result === null) {
          cell.result = {};
          cell.index = 0;
          if (u8[offset] & 0x80) {
            u32_u8[0] = u8[offset + 2];
            u32_u8[1] = u8[offset + 3];
            u32_u8[2] = u8[offset + 4];
            u32_u8[3] = u8[offset + 5];
            cell.length = u32[0];
            offset += 6;
          }
          else {
            cell.length = (u8[offset] & 0x78) >> 3;
            offset += 1;
          }
        }

        if (cell.index < cell.length) {
          if (cell.index > 0) {
            cell.result[cell.objectKey] = result;
          }

          id = u8[offset] & 0x07;

          if (u8[offset] & 0x80) {
            u32_u8[0] = u8[offset + 2];
            u32_u8[1] = u8[offset + 3];
            u32_u8[2] = u8[offset + 4];
            u32_u8[3] = u8[offset + 5];
            length = u32[0];
            offset += 6;
          }
          else {
            length = (u8[offset] & 0x78) >> 3;
            offset += 1;
          }

          let out = '';
          let pos = offset;
          const end = offset + length

          if (id === UTF8) {
            while (pos < end) {
              const byte1 = u8[pos];

              if ((byte1 & 0x80) === 0) {  // 1-byte
                out += CHARS_127[byte1];
                pos += 1;
              } else if ((byte1 & 0xe0) === 0xc0) {  // 2-byte
                const byte2 = u8[pos + 1] & 0x3f;
                pos += 2;
                out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
              } else if ((byte1 & 0xf0) === 0xe0) {
                const byte2 = u8[pos + 1] & 0x3f;
                const byte3 = u8[pos + 2] & 0x3f;
                pos += 3;
                out += String.fromCharCode(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
              } else if ((byte1 & 0xf8) === 0xf0) {
                const byte2 = u8[pos + 1] & 0x3f;
                const byte3 = u8[pos + 2] & 0x3f;
                const byte4 = u8[pos + 3] & 0x3f;
                pos += 4;

                // this can be > 0xffff, so possibly generate surrogates
                let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
                if (codepoint > 0xffff) {
                  // codepoint &= ~0x10000;
                  codepoint -= 0x10000;
                  // out += String.fromCharCode((codepoint >>> 10) & 0x3ff | 0xd800); // ???
                  codepoint = 0xdc00 | codepoint & 0x3ff;
                }
                out += String.fromCharCode(codepoint);
              } else {
                // FIXME: we're ignoring this
              }
            }

            offset += length;
          }
          else if (id === STR7) {
            while (pos < end) {
              out += CHARS_127[u8[pos]];
              pos += 1;
            }

            offset += length;
          }
          else if (id === DICT) {
            out = DICTIONARY[length];
          }

          cell.objectKey = out;

          popId = OBJ;
          id = readStack.push(u8, offset);
          cell.index += 1;
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
      else if (id === ARY) {
        const cell = readStack.cell;
        if (cell.result === null) {
          cell.result = [];
          cell.index = 0;
          if (u8[offset] & 0x80) {
            u32_u8[0] = u8[offset + 2];
            u32_u8[1] = u8[offset + 3];
            u32_u8[2] = u8[offset + 4];
            u32_u8[3] = u8[offset + 5];
            cell.length = u32[0];
            offset += 6;
          }
          else {
            cell.length = (u8[offset] & 0x78) >> 3;
            offset += 1;
          }
        }
        if (cell.index < cell.length) {
          if (cell.index > 0) {
            cell.result.push(result);
          }

          popId = ARY;
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
    else if ((id & 0x02) === 0x02) {
      if (id === INT32) {
        i32_u8[0] = u8[offset + 1];
        i32_u8[1] = u8[offset + 2];
        i32_u8[2] = u8[offset + 3];
        i32_u8[3] = u8[offset + 4];
        offset += 5;
        result = i32[0];
        readStack.depth -= 1;
        id = popId;
      }
      else if (id === FLOAT64) {
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
    }
    else {
      if (id === NULL) {
        offset += 1;
        result = null;
        readStack.depth -= 1;
        id = popId;
      }
      else if (id === BOOLEAN) {
        result = (u8[offset] & TRUE) === TRUE;
        offset += 1;
        readStack.depth -= 1;
      }
    }
  }
  return result;
};


let {TextEncoder, TextDecoder} = (function() {
  const mod = {};
  /*
  * Copyright 2017 Sam Thorogood. All rights reserved.
  *
  * Licensed under the Apache License, Version 2.0 (the "License"); you may not
  * use this file except in compliance with the License. You may obtain a copy of
  * the License at
  *
  *     http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
  * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  * License for the specific language governing permissions and limitations under
  * the License.
  */

  /**
  * @fileoverview Polyfill for TextEncoder and TextDecoder.
  *
  * You probably want `text.min.js`, and not this file directly.
  */

  (function(scope) {
  'use strict';

  // fail early
  if (scope['TextEncoder'] && scope['TextDecoder']) {
  return false;
  }

  /**
  * @constructor
  * @param {string=} utfLabel
  */
  function FastTextEncoder(utfLabel='utf-8') {
  if (utfLabel !== 'utf-8') {
    throw new RangeError(
      `Failed to construct 'TextEncoder': The encoding label provided ('${utfLabel}') is invalid.`);
    }
  }

  Object.defineProperty(FastTextEncoder.prototype, 'encoding', {value: 'utf-8'});

  /**
  * @param {string} string
  * @param {{stream: boolean}=} options
  * @return {!Uint8Array}
  */
  FastTextEncoder.prototype.encode = function(string, options={stream: false}) {
    if (options.stream) {
      throw new Error(`Failed to encode: the 'stream' option is unsupported.`);
    }

    let pos = 0;
    const len = string.length;
    const out = [];

    let at = 0;  // output position
    let tlen = Math.max(32, len + (len >> 1) + 7);  // 1.5x size
    let target = new Uint8Array((tlen >> 3) << 3);  // ... but at 8 byte offset

    while (pos < len) {
      let value = string.charCodeAt(pos++);
      if (value >= 0xd800 && value <= 0xdbff) {
        // high surrogate
        if (pos < len) {
          const extra = string.charCodeAt(pos);
          if ((extra & 0xfc00) === 0xdc00) {
            ++pos;
            value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
          }
        }
        if (value >= 0xd800 && value <= 0xdbff) {
          continue;  // drop lone surrogate
        }
      }

      // expand the buffer if we couldn't write 4 bytes
      if (at + 4 > target.length) {
        tlen += 8;  // minimum extra
        tlen *= (1.0 + (pos / string.length) * 2);  // take 2x the remaining
        tlen = (tlen >> 3) << 3;  // 8 byte offset

        const update = new Uint8Array(tlen);
        update.set(target);
        target = update;
      }

      if ((value & 0xffffff80) === 0) {  // 1-byte
        target[at++] = value;  // ASCII
        continue;
      } else if ((value & 0xfffff800) === 0) {  // 2-byte
        target[at++] = ((value >>  6) & 0x1f) | 0xc0;
      } else if ((value & 0xffff0000) === 0) {  // 3-byte
        target[at++] = ((value >> 12) & 0x0f) | 0xe0;
        target[at++] = ((value >>  6) & 0x3f) | 0x80;
      } else if ((value & 0xffe00000) === 0) {  // 4-byte
        target[at++] = ((value >> 18) & 0x07) | 0xf0;
        target[at++] = ((value >> 12) & 0x3f) | 0x80;
        target[at++] = ((value >>  6) & 0x3f) | 0x80;
      } else {
        // FIXME: do we care
        continue;
      }

      target[at++] = (value & 0x3f) | 0x80;
    }

    return target.slice(0, at);
  }

  /**
  * @constructor
  * @param {string=} utfLabel
  * @param {{fatal: boolean}=} options
  */
  function FastTextDecoder(utfLabel='utf-8', options={fatal: false}) {
    if (utfLabel !== 'utf-8') {
      throw new RangeError(
        `Failed to construct 'TextDecoder': The encoding label provided ('${utfLabel}') is invalid.`);
      }
      if (options.fatal) {
        throw new Error(`Failed to construct 'TextDecoder': the 'fatal' option is unsupported.`);
      }
    }

    Object.defineProperty(FastTextDecoder.prototype, 'encoding', {value: 'utf-8'});

    Object.defineProperty(FastTextDecoder.prototype, 'fatal', {value: false});

    Object.defineProperty(FastTextDecoder.prototype, 'ignoreBOM', {value: false});

    /**
    * @param {(!ArrayBuffer|!ArrayBufferView)} buffer
    * @param {{stream: boolean}=} options
    */
    FastTextDecoder.prototype.decode = function(buffer, pos = 0, end = buffer.length) {
      // if (options['stream']) {
      //   throw new Error(`Failed to decode: the 'stream' option is unsupported.`);
      // }

      const bytes = buffer;
      let out = '';

      while (pos < end) {
        const byte1 = bytes[pos++];
        if (byte1 === 0) {
          break;  // NULL
        }

        if ((byte1 & 0x80) === 0) {  // 1-byte
          out += CHARS_127[byte1];
        } else if ((byte1 & 0xe0) === 0xc0) {  // 2-byte
          const byte2 = bytes[pos++] & 0x3f;
          out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
        } else if ((byte1 & 0xf0) === 0xe0) {
          const byte2 = bytes[pos++] & 0x3f;
          const byte3 = bytes[pos++] & 0x3f;
          out += String.fromCharCode(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
        } else if ((byte1 & 0xf8) === 0xf0) {
          const byte2 = bytes[pos++] & 0x3f;
          const byte3 = bytes[pos++] & 0x3f;
          const byte4 = bytes[pos++] & 0x3f;

          // this can be > 0xffff, so possibly generate surrogates
          let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
          if (codepoint > 0xffff) {
            // codepoint &= ~0x10000;
            codepoint -= 0x10000;
            out.push((codepoint >>> 10) & 0x3ff | 0xd800)
            codepoint = 0xdc00 | codepoint & 0x3ff;
          }
          out += String.fromCharCode(codepoint);
        } else {
          // FIXME: we're ignoring this
        }
      }

      return out;
    }

    scope['TextEncoder'] = FastTextEncoder;
    scope['TextDecoder'] = FastTextDecoder;

  }(mod));
  return mod;
})();

if (this.TextEncoder) {
  TextEncoder = this.TextEncoder;
  TextDecoder = this.TextDecoder;
}

const b = new Uint8Array(256 * 1024);
b.slice(0, write(b, 0, [1, 2, 3]));
read(b, 0);

const testData = {"type":"NormalModule","constructor":{"data":{"type":"javascript/auto","request":"index.js","userRequest":"index.js","rawRequest":"index.js","loaders":[],"resource":"index.js","parser":{"type":"Parser","options":{},"sourceType":"auto","moduleType":"javascript/auto"},"generator":{"type":"JavascriptGenerator","moduleType":"javascript/auto","options":{}},"resolveOptions":{}}},"identifier":"index.js","assigned":{"factoryMeta":{},"issuer":null,"useSourceMap":false,"lineToLine":false},"build":{"built":true,"buildTimestamp":1518546698333,"buildMeta":{"exportsType":"namespace","providedExports":["default"]},"buildInfo":{"cacheable":true,"fileDependencies":["index.js"],"contextDependencies":[],"strict":true,"exportsArgument":"__webpack_exports__"},"warnings":[],"errors":[],"_source":{"type":"OriginalSource","value":"import is from './is';\n\nexport default is({});\n","name":"index.js"},"hash":"385d51f3c5d321e36f963e594282af3b","_lastSuccessfulBuildMeta":{"exportsType":"namespace","providedExports":["default"]}},"dependencyBlock":{"type":"DependenciesBlock","dependencies":[{"type":"HarmonyCompatibilityDependency","loc":{"start":{"line":-1,"column":0},"end":{"line":-1,"column":0},"index":-3}},{"type":"HarmonyInitDependency","loc":{"start":{"line":-1,"column":0},"end":{"line":-1,"column":0},"index":-2}},{"type":"ConstDependency","expression":"","range":[0,22],"loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":22}}},{"type":"HarmonyImportSideEffectDependency","request":"./is","sourceOrder":1,"loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":22}}},{"type":"HarmonyExportHeaderDependency","range":[39,45],"rangeStatement":[24,46],"loc":{"index":-1,"start":{"line":3,"column":0},"end":{"line":3,"column":22}}},{"type":"HarmonyExportExpressionDependency","range":[39,45],"rangeStatement":[24,46],"loc":{"index":-1,"start":{"line":3,"column":0},"end":{"line":3,"column":22}}},{"type":"HarmonyImportSpecifierDependency","request":"./is","sourceOrder":1,"id":"default","name":"is","range":[39,41],"strictExportPresence":false,"namespaceObjectAsContext":false,"callArgs":[{"type":"ObjectExpression","start":42,"end":44,"loc":{"start":{"line":3,"column":18},"end":{"line":3,"column":20}},"range":[42,44],"properties":[]}],"call":{"type":"CallExpression","start":39,"end":45,"loc":{"start":{"line":3,"column":15},"end":{"line":3,"column":21}},"range":[39,45],"callee":{"type":"Identifier","start":39,"end":41,"loc":{"start":{"line":3,"column":15},"end":{"line":3,"column":17}},"range":[39,41],"name":"is"},"arguments":[{"type":"ObjectExpression","start":42,"end":44,"loc":{"start":{"line":3,"column":18},"end":{"line":3,"column":20}},"range":[42,44],"properties":[]}]},"directImport":true,"loc":{"start":{"line":3,"column":15},"end":{"line":3,"column":17}}}],"variables":[],"blocks":[]},"source":{"_cachedSource":{"type":"CachedSource","source":{"type":"ReplaceSource","replacements":[[45,45,");",3],[39,40,"__WEBPACK_MODULE_REFERENCE__1_64656661756c74_call__",4],[24,38,"/* harmony default export */ var __WEBPACK_MODULE_DEFAULT_EXPORT__ = __webpack_exports__[\"default\"] = (",2],[24,38,"",1],[0,21,"",0]]},"cachedSource":"\n\n/* harmony default export */ var __WEBPACK_MODULE_DEFAULT_EXPORT__ = __webpack_exports__[\"default\"] = (__WEBPACK_MODULE_REFERENCE__1_64656661756c74_call__({}));\n","cachedMaps":{}},"_cachedSourceHash":"385d51f3c5d321e36f963e594282af3b-undefined","renderedHash":"385d51f3c5d321e36f96"}};

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


function bench1(n) {
  if (!_encoder) {
    _encoder = new TextEncoder();
  }
  var start = process.hrtime();
  while (n--) {
    _encoder.encode(JSON.stringify(testData.constructor.data));
  }
  var end = process.hrtime();
  return end[0] - start[0] + (end[1] - start[1]) / 1e9;
}

function bench2(n) {
  var start = process.hrtime();
  while (n--) {
    write(b, 0, testData.constructor.data);
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
    JSON.parse(_decoder.decode(testDataArray));
  }
  var end = process.hrtime();
  return end[0] - start[0] + (end[1] - start[1]) / 1e9;
}

function bench4(n) {
  var start = process.hrtime();
  while (n--) {
    read(b, 0);
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

console.log(bench1(1e4));
console.log(bench2(1e4));
console.log(bench3(1e5));
console.log(bench4(1e5));
console.log(write(b, 0, testData.constructor.data));
console.log(read(b, 0));
console.log(write(b, 0, null), read(b, 0));
console.log(write(b, 0, false), read(b, 0));
console.log(write(b, 0, true), read(b, 0));
console.log(write(b, 0, 0), read(b, 0));
console.log(write(b, 0, 1), read(b, 0));
console.log(write(b, 0, 0.5), read(b, 0));
console.log(write(b, 0, '012345678912345'), read(b, 0));
console.log((b[0] & 0x07) === STR7);
console.log(write(b, 0, '0123456789123456'), read(b, 0));
console.log(write(b, 0, {a: 1}), read(b, 0));
console.log(write(b, 0, [1, 2, 3]), read(b, 0));
