function _M0TPB13StringBuilder(param0) {
  this.val = param0;
}
function _M0TPC16string10StringView(param0, param1, param2) {
  this.str = param0;
  this.start = param1;
  this.end = param2;
}
class $PanicError extends Error {}
function $panic() {
  throw new $PanicError();
}
const _M0FPB12random__seed = () => {
  if (globalThis.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return array[0] | 0; // Convert to signed 32
  } else {
    return Math.floor(Math.random() * 0x100000000) | 0; // Fallback to Math.random
  }
};
const _M0FPB19int__to__string__js = (x, radix) => {
  return x.toString(radix);
};
function _M0TPB4IterGUsRPB4JsonEE(param0, param1) {
  this.f = param0;
  this.size_hint = param1;
}
function _M0TPB4IterGcE(param0, param1) {
  this.f = param0;
  this.size_hint = param1;
}
function $oob() {
  throw new Error("Index out of bounds");
}
function _M0TPB8MutLocalGiE(param0) {
  this.val = param0;
}
function $make_array_len_and_init(a, b) {
  const arr = new Array(a);
  arr.fill(b);
  return arr;
}
const _M0MPB7JSArray4push = (arr, val) => { arr.push(val); };
function _M0TPB4IterGRPC16string10StringViewE(param0, param1) {
  this.f = param0;
  this.size_hint = param1;
}
function _M0TPB8MutLocalGORPC16string10StringViewE(param0) {
  this.val = param0;
}
function _M0TPB3MapGsbE(param0, param1, param2, param3, param4, param5, param6) {
  this.entries = param0;
  this.size = param1;
  this.capacity = param2;
  this.capacity_mask = param3;
  this.grow_at = param4;
  this.head = param5;
  this.tail = param6;
}
function _M0TPB3MapGsRPB4JsonE(param0, param1, param2, param3, param4, param5, param6) {
  this.entries = param0;
  this.size = param1;
  this.capacity = param2;
  this.capacity_mask = param3;
  this.grow_at = param4;
  this.head = param5;
  this.tail = param6;
}
function _M0TPB5EntryGsbE(param0, param1, param2, param3, param4, param5) {
  this.prev = param0;
  this.next = param1;
  this.psl = param2;
  this.hash = param3;
  this.key = param4;
  this.value = param5;
}
function _M0TPB5EntryGsRPB4JsonE(param0, param1, param2, param3, param4, param5) {
  this.prev = param0;
  this.next = param1;
  this.psl = param2;
  this.hash = param3;
  this.key = param4;
  this.value = param5;
}
function _M0TPB8MutLocalGORPB5EntryGsRPB4JsonEE(param0) {
  this.val = param0;
}
function _M0DTPB4Json4Null() {}
_M0DTPB4Json4Null.prototype.$tag = 0;
const _M0DTPB4Json4Null__ = new _M0DTPB4Json4Null();
function _M0DTPB4Json4True() {}
_M0DTPB4Json4True.prototype.$tag = 1;
const _M0DTPB4Json4True__ = new _M0DTPB4Json4True();
function _M0DTPB4Json5False() {}
_M0DTPB4Json5False.prototype.$tag = 2;
const _M0DTPB4Json5False__ = new _M0DTPB4Json5False();
function _M0DTPB4Json6Number(param0, param1) {
  this._0 = param0;
  this._1 = param1;
}
_M0DTPB4Json6Number.prototype.$tag = 3;
function _M0DTPB4Json6String(param0) {
  this._0 = param0;
}
_M0DTPB4Json6String.prototype.$tag = 4;
function _M0DTPB4Json5Array(param0) {
  this._0 = param0;
}
_M0DTPB4Json5Array.prototype.$tag = 5;
function _M0DTPB4Json6Object(param0) {
  this._0 = param0;
}
_M0DTPB4Json6Object.prototype.$tag = 6;
const _M0MPB7JSArray4copy = (arr) => arr.slice(0);
const _M0MPB7JSArray3pop = (arr) => arr.pop();
function _M0TPB9ArrayViewGsE(param0, param1, param2) {
  this.buf = param0;
  this.start = param1;
  this.end = param2;
}
function _M0DTPC14json10WriteFrame5Array(param0, param1) {
  this._0 = param0;
  this._1 = param1;
}
_M0DTPC14json10WriteFrame5Array.prototype.$tag = 0;
function _M0DTPC14json10WriteFrame6Object(param0, param1) {
  this._0 = param0;
  this._1 = param1;
}
_M0DTPC14json10WriteFrame6Object.prototype.$tag = 1;
function _M0TP39litmuslab6engine4core10Diagnostic(param0, param1, param2, param3) {
  this.code = param0;
  this.message = param1;
  this.line = param2;
  this.column = param3;
}
function _M0TP39litmuslab6engine4core5State(param0, param1, param2, param3) {
  this.memory = param0;
  this.pcs = param1;
  this.registers = param2;
  this.buffers = param3;
}
function _M0TP39litmuslab6engine4core6Action(param0, param1) {
  this.thread = param0;
  this.flush = param1;
}
function _M0TP39litmuslab6engine4core5Write(param0, param1) {
  this.address = param0;
  this.value = param1;
}
function _M0TPB9ArrayViewGUsRPB4JsonEE(param0, param1, param2) {
  this.buf = param0;
  this.start = param1;
  this.end = param2;
}
function _M0TP39litmuslab6engine4core5Token(param0, param1) {
  this.text = param0;
  this.column = param1;
}
function _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(param0) {
  this._0 = param0;
}
_M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err.prototype.$tag = 0;
function _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE2Ok(param0) {
  this._0 = param0;
}
_M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE2Ok.prototype.$tag = 1;
function _M0TP39litmuslab6engine4core6Thread(param0, param1, param2, param3) {
  this.name = param0;
  this.registers = param1;
  this.instructions = param2;
  this.lines = param3;
}
function _M0DTP39litmuslab6engine4core11Instruction5Store(param0, param1) {
  this._0 = param0;
  this._1 = param1;
}
_M0DTP39litmuslab6engine4core11Instruction5Store.prototype.$tag = 0;
function _M0DTP39litmuslab6engine4core11Instruction4Load(param0, param1) {
  this._0 = param0;
  this._1 = param1;
}
_M0DTP39litmuslab6engine4core11Instruction4Load.prototype.$tag = 1;
function _M0DTP39litmuslab6engine4core11Instruction5Fence() {}
_M0DTP39litmuslab6engine4core11Instruction5Fence.prototype.$tag = 2;
const _M0DTP39litmuslab6engine4core11Instruction5Fence__ = new _M0DTP39litmuslab6engine4core11Instruction5Fence();
function _M0TP39litmuslab6engine4core7Program(param0, param1, param2) {
  this.addresses = param0;
  this.initial = param1;
  this.threads = param2;
}
function _M0TP39litmuslab6engine4core4Node(param0, param1, param2) {
  this.state = param0;
  this.parent = param1;
  this.action = param2;
}
function _M0TPB9ArrayViewGUsbEE(param0, param1, param2) {
  this.buf = param0;
  this.start = param1;
  this.end = param2;
}
const _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger = { method_0: _M0IPB13StringBuilderPB6Logger13write__string, method_1: _M0IP016_24default__implPB6Logger16write__substringGRPB13StringBuilderE, method_2: _M0IPB13StringBuilderPB6Logger11write__view, method_3: _M0IPB13StringBuilderPB6Logger11write__char, method_4: _M0IP016_24default__implPB6Logger28write__string__interpolationGRPB13StringBuilderE, method_5: _M0IP016_24default__implPB6Logger5writeGRPB13StringBuilderE };
const _M0MPB4Iter4nextN6constrS81GRPC16string10StringViewE = 0;
const _M0MPB4Iter4nextN6constrS82GRPC16string10StringViewE = 0;
const _M0MPB4Iter4nextN6constrS97GcE = 0;
const _M0MPB4Iter4nextN6constrS98GcE = 0;
const _M0MPB4Iter3newN6constrS107GUsRPB4JsonEE = 0;
const _M0MPB4Iter3newN6constrS119GcE = 0;
const _M0FPB4seed = _M0FPB12random__seed();
const _M0FP39litmuslab6engine4core10state__keyN7_2abindS801 = ",";
const _M0FP39litmuslab6engine4core10state__keyN7_2abindS802 = ",";
const _M0FP39litmuslab6engine4core10state__keyN7_2abindS803 = ",";
const _M0FP39litmuslab6engine4core10state__keyN7_2abindS804 = ",";
const _M0FP39litmuslab6engine4core10state__keyN7_2abindS805 = "|";
const _M0FP39litmuslab6engine4core12outcome__keyN7_2abindS823 = ",";
const _M0FP39litmuslab6engine4core12outcome__keyN7_2abindS824 = ",";
const _M0FP39litmuslab6engine4core12outcome__keyN7_2abindS825 = "|";
const _M0MPC16string10StringView4findN6constrS247 = 0;
const _M0FP39litmuslab6engine4core14parse__programN7_2abindS911 = "\n";
const _M0FP39litmuslab6engine4core14parse__programN7_2abindS912 = "=";
const _M0FP39litmuslab6engine4core11witness__ofN7_2abindS847 = " ";
const _M0FP39litmuslab6engine4core7analyzeN6constrS985 = "max_outcomes";
const _M0FP39litmuslab6engine4core7analyzeN6constrS986 = "max_states";
const _M0FP39litmuslab6engine4core6replayN7_2abindS1039 = "\n";
const _M0FP39litmuslab6engine4core6replayN7_2abindS1040 = " ";
function _M0FPB13consume4__acc(acc, input) {
  const _p = (acc >>> 0) + ((Math.imul(input, -1028477379) | 0) >>> 0) | 0;
  const _p$2 = 17;
  return Math.imul(_p << _p$2 | (_p >>> (32 - _p$2 | 0) | 0), 668265263) | 0;
}
function _M0MPB13StringBuilder13write__objectGiE(self, obj) {
  _M0IP016_24default__implPB4Show6outputGiE(obj, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
}
function _M0MPB13StringBuilder13write__objectGsE(self, obj) {
  _M0IP016_24default__implPB4Show6outputGsE(obj, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
}
function _M0MPB13StringBuilder13write__objectGdE(self, obj) {
  _M0IP016_24default__implPB4Show6outputGdE(obj, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
}
function _M0MPB13StringBuilder21StringBuilder_2einner(size_hint) {
  return new _M0TPB13StringBuilder("");
}
function _M0IPB13StringBuilderPB6Logger11write__char(self, ch) {
  self.val = `${self.val}${String.fromCodePoint(ch)}`;
}
function _M0IPB13StringBuilderPB6Logger13write__string(self, str) {
  self.val = `${self.val}${str}`;
}
function _M0FPB32code__point__of__surrogate__pair(leading, trailing) {
  return (((Math.imul(leading - 55296 | 0, 1024) | 0) + trailing | 0) - 56320 | 0) + 65536 | 0;
}
function _M0MPC14byte4Byte7to__hexN14to__hex__digitS37(i) {
  if (i < 10) {
    const _p = 48;
    const _p$2 = (i + _p | 0) & 255;
    return _p$2;
  } else {
    const _p = 97;
    const _p$2 = (i + _p | 0) & 255;
    const _p$3 = 10;
    const _p$4 = (_p$2 - _p$3 | 0) & 255;
    return _p$4;
  }
}
function _M0MPC14byte4Byte7to__hex(b) {
  const _self = _M0MPB13StringBuilder21StringBuilder_2einner(0);
  const _p = 16;
  _M0IPB13StringBuilderPB6Logger11write__char(_self, _M0MPC14byte4Byte7to__hexN14to__hex__digitS37((b / _p | 0) & 255));
  const _p$2 = 16;
  _M0IPB13StringBuilderPB6Logger11write__char(_self, _M0MPC14byte4Byte7to__hexN14to__hex__digitS37((b % _p$2 | 0) & 255));
  const _p$3 = _self;
  return _p$3.val;
}
function _M0MPC16string10StringView12view_2einner(self, start_offset, end_offset) {
  let end_offset$2;
  if (end_offset === undefined) {
    end_offset$2 = self.end - self.start | 0;
  } else {
    const _Some = end_offset;
    end_offset$2 = _Some;
  }
  if (start_offset >= 0 && (start_offset <= end_offset$2 && end_offset$2 <= (self.end - self.start | 0))) {
    return new _M0TPC16string10StringView(self.str, self.start + start_offset | 0, self.start + end_offset$2 | 0);
  } else {
    return $panic();
  }
}
function _M0FPB14avalanche__acc(acc) {
  let acc$2 = acc;
  acc$2 = acc$2 ^ (acc$2 >>> 15 | 0);
  acc$2 = Math.imul(acc$2, -2048144777) | 0;
  acc$2 = acc$2 ^ (acc$2 >>> 13 | 0);
  acc$2 = Math.imul(acc$2, -1028477379) | 0;
  acc$2 = acc$2 ^ (acc$2 >>> 16 | 0);
  return acc$2;
}
function _M0FPB13finalize__acc(acc) {
  return _M0FPB14avalanche__acc(acc);
}
function _M0IP016_24default__implPB6Logger28write__string__interpolationGRPB13StringBuilderE(self, show) {
  show.method_table.method_0(show.self, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
}
function _M0IP016_24default__implPB6Logger5writeGRPB13StringBuilderE(self, show) {
  show.method_table.method_0(show.self, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
}
function _M0MPC16string6String21clamped__view_2einner(self, start, end) {
  const len = self.length;
  let lo = start < 0 ? 0 : start > len ? len : start;
  let hi;
  if (end === undefined) {
    hi = len;
  } else {
    const _Some = end;
    const _e = _Some;
    hi = _e < 0 ? 0 : _e > len ? len : _e;
  }
  let _tmp;
  if (lo > 0) {
    let _tmp$2;
    if (lo < len) {
      let _tmp$3;
      const _p = self.charCodeAt(lo);
      if (_p >= 56320 && _p <= 57343) {
        const _p$2 = self.charCodeAt(lo - 1 | 0);
        _tmp$3 = _p$2 >= 55296 && _p$2 <= 56319;
      } else {
        _tmp$3 = false;
      }
      _tmp$2 = _tmp$3;
    } else {
      _tmp$2 = false;
    }
    _tmp = _tmp$2;
  } else {
    _tmp = false;
  }
  if (_tmp) {
    lo = lo + 1 | 0;
  }
  let _tmp$2;
  if (hi > 0) {
    let _tmp$3;
    if (hi < len) {
      let _tmp$4;
      const _p = self.charCodeAt(hi);
      if (_p >= 56320 && _p <= 57343) {
        const _p$2 = self.charCodeAt(hi - 1 | 0);
        _tmp$4 = _p$2 >= 55296 && _p$2 <= 56319;
      } else {
        _tmp$4 = false;
      }
      _tmp$3 = _tmp$4;
    } else {
      _tmp$3 = false;
    }
    _tmp$2 = _tmp$3;
  } else {
    _tmp$2 = false;
  }
  if (_tmp$2) {
    hi = hi - 1 | 0;
  }
  return lo >= hi ? new _M0TPC16string10StringView(self, lo, lo) : new _M0TPC16string10StringView(self, lo, hi);
}
function _M0IP016_24default__implPB6Logger16write__substringGRPB13StringBuilderE(self, value, start, len) {
  _M0IPB13StringBuilderPB6Logger11write__view(self, _M0MPC16string6String21clamped__view_2einner(value, start, start + len | 0));
}
function _M0IP016_24default__implPB4Show6outputGiE(self, logger) {
  logger.method_table.method_0(logger.self, _M0IPC13int3IntPB4Show10to__string(self));
}
function _M0IP016_24default__implPB4Show6outputGsE(self, logger) {
  logger.method_table.method_0(logger.self, self);
}
function _M0IP016_24default__implPB4Show6outputGdE(self, logger) {
  logger.method_table.method_0(logger.self, _M0IPC16double6DoublePB4Show10to__string(self));
}
function _M0MPB4Iter4nextGRPC16string10StringViewE(self) {
  const _func = self.f;
  const result = _func();
  const _bind = self.size_hint;
  if (result === undefined) {
    self.size_hint = _M0MPB4Iter4nextN6constrS82GRPC16string10StringViewE;
  } else {
    if (_bind === undefined) {
    } else {
      const _Some = _bind;
      const _n = _Some;
      self.size_hint = _n > 0 ? _n - 1 | 0 : _M0MPB4Iter4nextN6constrS81GRPC16string10StringViewE;
    }
  }
  return result;
}
function _M0MPB4Iter4nextGcE(self) {
  const _func = self.f;
  const result = _func();
  const _bind = self.size_hint;
  if (result === -1) {
    self.size_hint = _M0MPB4Iter4nextN6constrS98GcE;
  } else {
    if (_bind === undefined) {
    } else {
      const _Some = _bind;
      const _n = _Some;
      self.size_hint = _n > 0 ? _n - 1 | 0 : _M0MPB4Iter4nextN6constrS97GcE;
    }
  }
  return result;
}
function _M0MPC13int3Int18to__string_2einner(self, radix) {
  return _M0FPB19int__to__string__js(self, radix);
}
function _M0MPB4Iter3newGUsRPB4JsonEE(f, size_hint) {
  let size_hint$2;
  if (size_hint === undefined) {
    size_hint$2 = undefined;
  } else {
    const _Some = size_hint;
    const _n = _Some;
    size_hint$2 = _n > 0 ? _n : _M0MPB4Iter3newN6constrS107GUsRPB4JsonEE;
  }
  return new _M0TPB4IterGUsRPB4JsonEE(f, size_hint$2);
}
function _M0MPB4Iter3newGcE(f, size_hint) {
  let size_hint$2;
  if (size_hint === undefined) {
    size_hint$2 = undefined;
  } else {
    const _Some = size_hint;
    const _n = _Some;
    size_hint$2 = _n > 0 ? _n : _M0MPB4Iter3newN6constrS119GcE;
  }
  return new _M0TPB4IterGcE(f, size_hint$2);
}
function _M0MPC16string10StringView9to__owned(self) {
  return self.str.substring(self.start, self.end);
}
function _M0MPC16string10StringView4iter(self) {
  const start = self.start;
  const end = self.end;
  const index = new _M0TPB8MutLocalGiE(start);
  return _M0MPB4Iter3newGcE(() => {
    if (index.val < end) {
      const c1 = self.str.charCodeAt(index.val);
      if (c1 >= 55296 && c1 <= 56319 && (index.val + 1 | 0) < self.end) {
        const c2 = self.str.charCodeAt(index.val + 1 | 0);
        if (c2 >= 56320 && c2 <= 57343) {
          index.val = index.val + 2 | 0;
          return _M0FPB32code__point__of__surrogate__pair(c1, c2);
        }
      }
      index.val = index.val + 1 | 0;
      return c1;
    } else {
      return -1;
    }
  }, undefined);
}
function _M0MPC16string6String19exact__view_2einner(self, start, end) {
  const len = self.length;
  let end$2;
  if (end === undefined) {
    end$2 = len;
  } else {
    const _Some = end;
    const _end = _Some;
    end$2 = _end;
  }
  if (start >= 0 && (start <= end$2 && end$2 <= len)) {
    if (start < len) {
      const _p = self.charCodeAt(start);
      if (!(_p >= 56320 && _p <= 57343)) {
      } else {
        $panic();
      }
    }
    if (end$2 < len) {
      const _p = self.charCodeAt(end$2);
      if (!(_p >= 56320 && _p <= 57343)) {
      } else {
        $panic();
      }
    }
    return new _M0TPC16string10StringView(self, start, end$2);
  } else {
    return $panic();
  }
}
function _M0MPC16string6String12view_2einner(self, start_offset, end_offset) {
  let end_offset$2;
  if (end_offset === undefined) {
    end_offset$2 = self.length;
  } else {
    const _Some = end_offset;
    end_offset$2 = _Some;
  }
  if (start_offset >= 0 && (start_offset <= end_offset$2 && end_offset$2 <= self.length)) {
    return new _M0TPC16string10StringView(self, start_offset, end_offset$2);
  } else {
    return $panic();
  }
}
function _M0IPB13StringBuilderPB6Logger11write__view(self, str) {
  self.val = `${self.val}${_M0MPC16string10StringView9to__owned(str)}`;
}
function _M0FPB19kmp__failure__table(pattern) {
  const m = pattern.end - pattern.start | 0;
  const table = $make_array_len_and_init(m, 0);
  let k = 0;
  let _tmp = 1;
  while (true) {
    const i = _tmp;
    if (i < m) {
      const c = pattern.str.charCodeAt(pattern.start + i | 0);
      while (true) {
        let _tmp$2;
        if (k > 0) {
          const _p = pattern.str.charCodeAt(pattern.start + k | 0);
          _tmp$2 = c !== _p;
        } else {
          _tmp$2 = false;
        }
        if (_tmp$2) {
          const _tmp$3 = k - 1 | 0;
          k = _tmp$3 >>> 0 < table.length ? table[_tmp$3] : $oob();
          continue;
        } else {
          break;
        }
      }
      const _p = pattern.str.charCodeAt(pattern.start + k | 0);
      if (c === _p) {
        k = k + 1 | 0;
      }
      if (i >>> 0 < table.length) {
        table[i] = k;
      } else {
        $oob();
      }
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return table;
}
function _M0FPB24find__pattern__kmp__from(target, pattern, start) {
  const n = target.end - target.start | 0;
  const m = pattern.end - pattern.start | 0;
  const table = _M0FPB19kmp__failure__table(pattern);
  let k = 0;
  let _tmp = start;
  while (true) {
    const i = _tmp;
    if (i < n) {
      const c = target.str.charCodeAt(target.start + i | 0);
      while (true) {
        let _tmp$2;
        if (k > 0) {
          const _p = pattern.str.charCodeAt(pattern.start + k | 0);
          _tmp$2 = c !== _p;
        } else {
          _tmp$2 = false;
        }
        if (_tmp$2) {
          const _tmp$3 = k - 1 | 0;
          k = _tmp$3 >>> 0 < table.length ? table[_tmp$3] : $oob();
          continue;
        } else {
          break;
        }
      }
      const _p = pattern.str.charCodeAt(pattern.start + k | 0);
      if (c === _p) {
        k = k + 1 | 0;
      }
      if (k === m) {
        return (i - m | 0) + 1 | 0;
      }
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return undefined;
}
function _M0FPB36find__two__anchor__candidate__scalar(data, start, candidate_end, first, last_offset, last) {
  let _tmp = start;
  while (true) {
    const pos = _tmp;
    if (pos < candidate_end) {
      let _tmp$2;
      const _p = data.charCodeAt(pos);
      if (_p === first) {
        const _p$2 = data.charCodeAt(pos + last_offset | 0);
        _tmp$2 = _p$2 === last;
      } else {
        _tmp$2 = false;
      }
      if (_tmp$2) {
        return pos;
      }
      _tmp = pos + 1 | 0;
      continue;
    } else {
      return -1;
    }
  }
}
function _M0FPB42find__two__anchor__candidate__from__string(data, start, candidate_end, first, last_offset, last) {
  return _M0FPB36find__two__anchor__candidate__scalar(data, start, candidate_end, first, last_offset, last);
}
function _M0FPB21string__ranges__equal(left, left_start, right, right_start, length) {
  let _tmp = 0;
  while (true) {
    const i = _tmp;
    if (i < length) {
      const _p = left.charCodeAt(left_start + i | 0);
      const _p$2 = right.charCodeAt(right_start + i | 0);
      if (_p !== _p$2) {
        return false;
      }
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return true;
}
function _M0FPB22find__by__two__anchors(target, pattern) {
  const target_len = target.end - target.start | 0;
  const pattern_len = pattern.end - pattern.start | 0;
  const target_start = target.start;
  const pattern_start = pattern.start;
  const last_offset = pattern_len - 1 | 0;
  const candidate_end = ((target_start + target_len | 0) - pattern_len | 0) + 1 | 0;
  const first = pattern.str.charCodeAt(pattern.start);
  const last = pattern.str.charCodeAt(pattern.start + last_offset | 0);
  const middle_len = last_offset - 1 | 0;
  let _tmp = target_start;
  let _tmp$2 = 0;
  while (true) {
    const pos = _tmp;
    const failures = _tmp$2;
    if (pos < candidate_end) {
      const found = _M0FPB42find__two__anchor__candidate__from__string(target.str, pos, candidate_end, first, last_offset, last);
      if (found < 0) {
        return undefined;
      }
      if (_M0FPB21string__ranges__equal(target.str, found + 1 | 0, pattern.str, pattern_start + 1 | 0, middle_len)) {
        return found - target_start | 0;
      }
      const failures$2 = failures + 1 | 0;
      const scanned = found - target_start | 0;
      if (failures$2 > 64 || failures$2 > (4 + (scanned / 8 | 0) | 0)) {
        return _M0FPB24find__pattern__kmp__from(target, pattern, scanned + 1 | 0);
      }
      _tmp = found + 1 | 0;
      _tmp$2 = failures$2;
      continue;
    } else {
      return undefined;
    }
  }
}
function _M0FPB24find__code__unit__scalar(data, start, end, code) {
  let _tmp = start;
  while (true) {
    const pos = _tmp;
    if (pos < end) {
      const _p = data.charCodeAt(pos);
      if (_p === code) {
        return pos;
      }
      _tmp = pos + 1 | 0;
      continue;
    } else {
      return -1;
    }
  }
}
function _M0FPB30find__code__unit__from__string(data, start, end, code) {
  return _M0FPB24find__code__unit__scalar(data, start, end, code);
}
function _M0FPB28find__code__unit__from__view(target, start, end, code) {
  const target_start = target.start;
  const found = _M0FPB30find__code__unit__from__string(target.str, target_start + start | 0, target_start + end | 0, code);
  return found < 0 ? -1 : found - target_start | 0;
}
function _M0MPC16string10StringView4find(self, str) {
  const pattern_len = str.end - str.start | 0;
  switch (pattern_len) {
    case 0: {
      return _M0MPC16string10StringView4findN6constrS247;
    }
    case 1: {
      const found = _M0FPB28find__code__unit__from__view(self, 0, self.end - self.start | 0, str.str.charCodeAt(str.start));
      return found < 0 ? undefined : found;
    }
    default: {
      return pattern_len > (self.end - self.start | 0) ? undefined : _M0FPB22find__by__two__anchors(self, str);
    }
  }
}
function _M0MPC16string6String6repeat(self, n) {
  if (n < 0) {
    return $panic();
  } else {
    if (n === 0) {
      return "";
    } else {
      if (n === 1) {
        return self;
      } else {
        const len = self.length;
        const total = Math.imul(len, n) | 0;
        if (len === 0 || (total / n | 0) === len) {
          const buf = _M0MPB13StringBuilder21StringBuilder_2einner(total);
          const str = self;
          let _tmp = 0;
          while (true) {
            const _ = _tmp;
            if (_ < n) {
              _M0IPB13StringBuilderPB6Logger13write__string(buf, str);
              _tmp = _ + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          return buf.val;
        } else {
          return $panic();
        }
      }
    }
  }
}
function _M0MPC15array5Array4pushGRPB4JsonE(self, value) {
  _M0MPB7JSArray4push(self, value);
}
function _M0MPC15array5Array4pushGiE(self, value) {
  _M0MPB7JSArray4push(self, value);
}
function _M0MPB4Iter3mapGcRPC16string10StringViewE(self, f) {
  return new _M0TPB4IterGRPC16string10StringViewE(() => {
    const _bind = _M0MPB4Iter4nextGcE(self);
    if (_bind === -1) {
      return undefined;
    } else {
      const _Some = _bind;
      const _x = _Some;
      return f(_x);
    }
  }, self.size_hint);
}
function _M0IPC14char4CharPB4Show10to__string(self) {
  return String.fromCodePoint(self);
}
function _M0MPC16string10StringView5split(self, sep) {
  const sep_len = sep.end - sep.start | 0;
  if (sep_len === 0) {
    return _M0MPB4Iter3mapGcRPC16string10StringViewE(_M0MPC16string10StringView4iter(self), (c) => _M0MPC16string6String12view_2einner(_M0IPC14char4CharPB4Show10to__string(c), 0, undefined));
  }
  const remaining = new _M0TPB8MutLocalGORPC16string10StringViewE(self);
  return _M0MPB4Iter3newGUsRPB4JsonEE(() => {
    const _bind = remaining.val;
    if (_bind === undefined) {
      return undefined;
    } else {
      const _Some = _bind;
      const _view = _Some;
      const _bind$2 = _M0MPC16string10StringView4find(_view, sep);
      if (_bind$2 === undefined) {
        remaining.val = undefined;
        return _view;
      } else {
        const _Some$2 = _bind$2;
        const _end = _Some$2;
        remaining.val = _M0MPC16string10StringView12view_2einner(_view, _end + sep_len | 0, undefined);
        return _M0MPC16string10StringView12view_2einner(_view, 0, _end);
      }
    }
  }, undefined);
}
function _M0MPC16string6String5split(self, sep) {
  return _M0MPC16string10StringView5split(new _M0TPC16string10StringView(self, 0, self.length), sep);
}
function _M0MPB4Iter9to__arrayGRPC16string10StringViewE(self) {
  const _bind = self.size_hint;
  let result;
  if (_bind === undefined) {
    result = [];
  } else {
    result = [];
  }
  while (true) {
    const _bind$2 = _M0MPB4Iter4nextGRPC16string10StringViewE(self);
    if (_bind$2 === undefined) {
      break;
    } else {
      const _Some = _bind$2;
      const _x = _Some;
      _M0MPC15array5Array4pushGRPB4JsonE(result, _x);
      continue;
    }
  }
  return result;
}
function _M0IPC16string6StringPB12ToStringView16to__string__view(self) {
  return new _M0TPC16string10StringView(self, 0, self.length);
}
function _M0IPC13int3IntPB4Show10to__string(self) {
  return _M0MPC13int3Int18to__string_2einner(self, 10);
}
function _M0MPC15array9ArrayView4joinGsE(self, separator) {
  if ((self.end - self.start | 0) === 0) {
    return "";
  } else {
    const _hd = self.buf[self.start];
    const _x_buf = self.buf;
    const _x_start = 1 + self.start | 0;
    const _x_end = self.end;
    const hd = _M0IPC16string6StringPB12ToStringView16to__string__view(_hd);
    const _bind = _x_end - _x_start | 0;
    let size_hint;
    let _tmp = 0;
    let _tmp$2 = hd.end - hd.start | 0;
    while (true) {
      const _ = _tmp;
      const size_hint$2 = _tmp$2;
      if (_ < _bind) {
        const s = _x_buf[_x_start + _ | 0];
        _tmp = _ + 1 | 0;
        const _bind$2 = _M0IPC16string6StringPB12ToStringView16to__string__view(s);
        _tmp$2 = (size_hint$2 + (_bind$2.end - _bind$2.start | 0) | 0) + (separator.end - separator.start | 0) | 0;
        continue;
      } else {
        size_hint = size_hint$2;
        break;
      }
    }
    const size_hint$2 = size_hint << 1;
    const buf = _M0MPB13StringBuilder21StringBuilder_2einner(size_hint$2);
    _M0IPB13StringBuilderPB6Logger11write__view(buf, hd);
    if ((separator.end - separator.start | 0) === 0) {
      const _bind$2 = _x_end - _x_start | 0;
      let _tmp$3 = 0;
      while (true) {
        const _ = _tmp$3;
        if (_ < _bind$2) {
          const s = _x_buf[_x_start + _ | 0];
          const s$2 = _M0IPC16string6StringPB12ToStringView16to__string__view(s);
          _M0IPB13StringBuilderPB6Logger11write__view(buf, s$2);
          _tmp$3 = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
    } else {
      const _bind$2 = _x_end - _x_start | 0;
      let _tmp$3 = 0;
      while (true) {
        const _ = _tmp$3;
        if (_ < _bind$2) {
          const s = _x_buf[_x_start + _ | 0];
          const s$2 = _M0IPC16string6StringPB12ToStringView16to__string__view(s);
          _M0IPB13StringBuilderPB6Logger11write__view(buf, separator);
          _M0IPB13StringBuilderPB6Logger11write__view(buf, s$2);
          _tmp$3 = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
    }
    return buf.val;
  }
}
function _M0MPC13int3Int20next__power__of__two(self) {
  if (self >= 0) {
    if (self <= 1) {
      return 1;
    }
    if (self > 1073741824) {
      return 1073741824;
    }
    return (2147483647 >> (Math.clz32(self - 1 | 0) - 1 | 0)) + 1 | 0;
  } else {
    return $panic();
  }
}
function _M0FPB8new__mapGsbE(capacity) {
  const capacity$2 = _M0MPC13int3Int20next__power__of__two(capacity);
  const _bind = capacity$2 - 1 | 0;
  const _bind$2 = (Math.imul(capacity$2, 13) | 0) / 16 | 0;
  const _bind$3 = $make_array_len_and_init(capacity$2, undefined);
  const _bind$4 = undefined;
  return new _M0TPB3MapGsbE(_bind$3, 0, capacity$2, _bind, _bind$2, _bind$4, -1);
}
function _M0FPB8new__mapGsRPB4JsonE(capacity) {
  const capacity$2 = _M0MPC13int3Int20next__power__of__two(capacity);
  const _bind = capacity$2 - 1 | 0;
  const _bind$2 = (Math.imul(capacity$2, 13) | 0) / 16 | 0;
  const _bind$3 = $make_array_len_and_init(capacity$2, undefined);
  const _bind$4 = undefined;
  return new _M0TPB3MapGsRPB4JsonE(_bind$3, 0, capacity$2, _bind, _bind$2, _bind$4, -1);
}
function _M0FPB21capacity__for__length(length) {
  let capacity = _M0MPC13int3Int20next__power__of__two(length);
  const _p = capacity;
  if (length > ((Math.imul(_p, 13) | 0) / 16 | 0)) {
    capacity = Math.imul(capacity, 2) | 0;
  }
  return capacity;
}
function _M0MPB3Map20add__entry__to__tailGsbE(self, idx, entry) {
  const _bind = self.tail;
  if (_bind === -1) {
    self.head = entry;
  } else {
    const _tmp = self.entries;
    const _p = _bind >>> 0 < _tmp.length ? _tmp[_bind] : $oob();
    let _tmp$2;
    if (_p === undefined) {
      _tmp$2 = $panic();
    } else {
      const _p$2 = _p;
      _tmp$2 = _p$2;
    }
    _tmp$2.next = entry;
  }
  self.tail = idx;
  self.entries[idx] = entry;
  self.size = self.size + 1 | 0;
}
function _M0MPB3Map20add__entry__to__tailGsRPB4JsonE(self, idx, entry) {
  const _bind = self.tail;
  if (_bind === -1) {
    self.head = entry;
  } else {
    const _tmp = self.entries;
    const _p = _bind >>> 0 < _tmp.length ? _tmp[_bind] : $oob();
    let _tmp$2;
    if (_p === undefined) {
      _tmp$2 = $panic();
    } else {
      const _p$2 = _p;
      _tmp$2 = _p$2;
    }
    _tmp$2.next = entry;
  }
  self.tail = idx;
  self.entries[idx] = entry;
  self.size = self.size + 1 | 0;
}
function _M0MPB3Map10set__entryGsbE(self, entry, new_idx) {
  const _bind = entry.next;
  if (_bind === undefined) {
    self.tail = new_idx;
  } else {
    const _Some = _bind;
    const _next = _Some;
    _next.prev = new_idx;
  }
  self.entries[new_idx] = entry;
}
function _M0MPB3Map10set__entryGsRPB4JsonE(self, entry, new_idx) {
  const _bind = entry.next;
  if (_bind === undefined) {
    self.tail = new_idx;
  } else {
    const _Some = _bind;
    const _next = _Some;
    _next.prev = new_idx;
  }
  self.entries[new_idx] = entry;
}
function _M0MPB3Map10push__awayGsbE(self, idx, entry) {
  let _tmp = entry.psl + 1 | 0;
  let _tmp$2 = idx + 1 & self.capacity_mask;
  let _tmp$3 = entry;
  while (true) {
    const psl = _tmp;
    const idx$2 = _tmp$2;
    const entry$2 = _tmp$3;
    const _bind = self.entries[idx$2];
    if (_bind === undefined) {
      entry$2.psl = psl;
      _M0MPB3Map10set__entryGsbE(self, entry$2, idx$2);
      return;
    } else {
      const _Some = _bind;
      const _curr_entry = _Some;
      if (psl > _curr_entry.psl) {
        entry$2.psl = psl;
        _M0MPB3Map10set__entryGsbE(self, entry$2, idx$2);
        _tmp = _curr_entry.psl + 1 | 0;
        _tmp$2 = idx$2 + 1 & self.capacity_mask;
        _tmp$3 = _curr_entry;
        continue;
      } else {
        _tmp = psl + 1 | 0;
        _tmp$2 = idx$2 + 1 & self.capacity_mask;
        continue;
      }
    }
  }
}
function _M0MPB3Map10push__awayGsRPB4JsonE(self, idx, entry) {
  let _tmp = entry.psl + 1 | 0;
  let _tmp$2 = idx + 1 & self.capacity_mask;
  let _tmp$3 = entry;
  while (true) {
    const psl = _tmp;
    const idx$2 = _tmp$2;
    const entry$2 = _tmp$3;
    const _bind = self.entries[idx$2];
    if (_bind === undefined) {
      entry$2.psl = psl;
      _M0MPB3Map10set__entryGsRPB4JsonE(self, entry$2, idx$2);
      return;
    } else {
      const _Some = _bind;
      const _curr_entry = _Some;
      if (psl > _curr_entry.psl) {
        entry$2.psl = psl;
        _M0MPB3Map10set__entryGsRPB4JsonE(self, entry$2, idx$2);
        _tmp = _curr_entry.psl + 1 | 0;
        _tmp$2 = idx$2 + 1 & self.capacity_mask;
        _tmp$3 = _curr_entry;
        continue;
      } else {
        _tmp = psl + 1 | 0;
        _tmp$2 = idx$2 + 1 & self.capacity_mask;
        continue;
      }
    }
  }
}
function _M0MPB3Map20rehash__place__entryGsbE(self, outer) {
  const hash = outer.hash;
  let _tmp = 0;
  let _tmp$2 = hash & self.capacity_mask;
  while (true) {
    const psl = _tmp;
    const idx = _tmp$2;
    const _bind = self.entries[idx];
    if (_bind === undefined) {
      outer.psl = psl;
      outer.prev = self.tail;
      _M0MPB3Map20add__entry__to__tailGsbE(self, idx, outer);
      return undefined;
    } else {
      const _Some = _bind;
      const _curr = _Some;
      if (psl > _curr.psl) {
        _M0MPB3Map10push__awayGsbE(self, idx, _curr);
        outer.psl = psl;
        outer.prev = self.tail;
        _M0MPB3Map20add__entry__to__tailGsbE(self, idx, outer);
        return undefined;
      } else {
        _tmp = psl + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
}
function _M0MPB3Map20rehash__place__entryGsRPB4JsonE(self, outer) {
  const hash = outer.hash;
  let _tmp = 0;
  let _tmp$2 = hash & self.capacity_mask;
  while (true) {
    const psl = _tmp;
    const idx = _tmp$2;
    const _bind = self.entries[idx];
    if (_bind === undefined) {
      outer.psl = psl;
      outer.prev = self.tail;
      _M0MPB3Map20add__entry__to__tailGsRPB4JsonE(self, idx, outer);
      return undefined;
    } else {
      const _Some = _bind;
      const _curr = _Some;
      if (psl > _curr.psl) {
        _M0MPB3Map10push__awayGsRPB4JsonE(self, idx, _curr);
        outer.psl = psl;
        outer.prev = self.tail;
        _M0MPB3Map20add__entry__to__tailGsRPB4JsonE(self, idx, outer);
        return undefined;
      } else {
        _tmp = psl + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
}
function _M0MPB3Map4growGsbE(self) {
  const old_head = self.head;
  const new_capacity = self.capacity << 1;
  self.entries = $make_array_len_and_init(new_capacity, undefined);
  self.capacity = new_capacity;
  self.capacity_mask = new_capacity - 1 | 0;
  const _p = self.capacity;
  self.grow_at = (Math.imul(_p, 13) | 0) / 16 | 0;
  self.size = 0;
  self.head = undefined;
  self.tail = -1;
  let _tmp = old_head;
  while (true) {
    const x = _tmp;
    if (x === undefined) {
      return;
    } else {
      const _Some = x;
      const _e = _Some;
      const next_in_chain = _e.next;
      _e.next = undefined;
      _M0MPB3Map20rehash__place__entryGsbE(self, _e);
      _tmp = next_in_chain;
      continue;
    }
  }
}
function _M0MPB3Map4growGsRPB4JsonE(self) {
  const old_head = self.head;
  const new_capacity = self.capacity << 1;
  self.entries = $make_array_len_and_init(new_capacity, undefined);
  self.capacity = new_capacity;
  self.capacity_mask = new_capacity - 1 | 0;
  const _p = self.capacity;
  self.grow_at = (Math.imul(_p, 13) | 0) / 16 | 0;
  self.size = 0;
  self.head = undefined;
  self.tail = -1;
  let _tmp = old_head;
  while (true) {
    const x = _tmp;
    if (x === undefined) {
      return;
    } else {
      const _Some = x;
      const _e = _Some;
      const next_in_chain = _e.next;
      _e.next = undefined;
      _M0MPB3Map20rehash__place__entryGsRPB4JsonE(self, _e);
      _tmp = next_in_chain;
      continue;
    }
  }
}
function _M0MPB3Map15set__with__hashGsbE(self, key, value, hash) {
  let _tmp = 0;
  let _tmp$2 = hash & self.capacity_mask;
  while (true) {
    const psl = _tmp;
    const idx = _tmp$2;
    const _bind = self.entries[idx];
    if (_bind === undefined) {
      if (self.size >= self.grow_at) {
        _M0MPB3Map4growGsbE(self);
        _tmp = 0;
        _tmp$2 = hash & self.capacity_mask;
        continue;
      }
      const _bind$2 = self.tail;
      const _bind$3 = undefined;
      const entry = new _M0TPB5EntryGsbE(_bind$2, _bind$3, psl, hash, key, value);
      _M0MPB3Map20add__entry__to__tailGsbE(self, idx, entry);
      return undefined;
    } else {
      const _Some = _bind;
      const _curr_entry = _Some;
      if (_curr_entry.hash === hash && _curr_entry.key === key) {
        _curr_entry.value = value;
        return undefined;
      }
      if (psl > _curr_entry.psl) {
        if (self.size >= self.grow_at) {
          _M0MPB3Map4growGsbE(self);
          _tmp = 0;
          _tmp$2 = hash & self.capacity_mask;
          continue;
        }
        _M0MPB3Map10push__awayGsbE(self, idx, _curr_entry);
        const _bind$2 = self.tail;
        const _bind$3 = undefined;
        const entry = new _M0TPB5EntryGsbE(_bind$2, _bind$3, psl, hash, key, value);
        _M0MPB3Map20add__entry__to__tailGsbE(self, idx, entry);
        return undefined;
      }
      _tmp = psl + 1 | 0;
      _tmp$2 = idx + 1 & self.capacity_mask;
      continue;
    }
  }
}
function _M0MPB3Map15set__with__hashGsRPB4JsonE(self, key, value, hash) {
  let _tmp = 0;
  let _tmp$2 = hash & self.capacity_mask;
  while (true) {
    const psl = _tmp;
    const idx = _tmp$2;
    const _bind = self.entries[idx];
    if (_bind === undefined) {
      if (self.size >= self.grow_at) {
        _M0MPB3Map4growGsRPB4JsonE(self);
        _tmp = 0;
        _tmp$2 = hash & self.capacity_mask;
        continue;
      }
      const _bind$2 = self.tail;
      const _bind$3 = undefined;
      const entry = new _M0TPB5EntryGsRPB4JsonE(_bind$2, _bind$3, psl, hash, key, value);
      _M0MPB3Map20add__entry__to__tailGsRPB4JsonE(self, idx, entry);
      return undefined;
    } else {
      const _Some = _bind;
      const _curr_entry = _Some;
      if (_curr_entry.hash === hash && _curr_entry.key === key) {
        _curr_entry.value = value;
        return undefined;
      }
      if (psl > _curr_entry.psl) {
        if (self.size >= self.grow_at) {
          _M0MPB3Map4growGsRPB4JsonE(self);
          _tmp = 0;
          _tmp$2 = hash & self.capacity_mask;
          continue;
        }
        _M0MPB3Map10push__awayGsRPB4JsonE(self, idx, _curr_entry);
        const _bind$2 = self.tail;
        const _bind$3 = undefined;
        const entry = new _M0TPB5EntryGsRPB4JsonE(_bind$2, _bind$3, psl, hash, key, value);
        _M0MPB3Map20add__entry__to__tailGsRPB4JsonE(self, idx, entry);
        return undefined;
      }
      _tmp = psl + 1 | 0;
      _tmp$2 = idx + 1 & self.capacity_mask;
      continue;
    }
  }
}
function _M0MPB3Map3setGsbE(self, key, value) {
  _M0MPB3Map15set__with__hashGsbE(self, key, value, _M0IPC16string6StringPB4Hash4hash(key));
}
function _M0MPB3Map3setGsRPB4JsonE(self, key, value) {
  _M0MPB3Map15set__with__hashGsRPB4JsonE(self, key, value, _M0IPC16string6StringPB4Hash4hash(key));
}
function _M0MPB3Map3MapGsbE(arr, capacity) {
  const length = arr.end - arr.start | 0;
  let capacity$2;
  if (capacity === undefined) {
    capacity$2 = length === 0 ? 8 : _M0FPB21capacity__for__length(length);
  } else {
    const _Some = capacity;
    const _capacity = _Some;
    const _p = _M0FPB21capacity__for__length(length);
    capacity$2 = _capacity > _p ? _capacity : _p;
  }
  const m = _M0FPB8new__mapGsbE(capacity$2);
  const _bind = arr.end - arr.start | 0;
  let _tmp = 0;
  while (true) {
    const _ = _tmp;
    if (_ < _bind) {
      const e = arr.buf[arr.start + _ | 0];
      _M0MPB3Map3setGsbE(m, e._0, e._1);
      _tmp = _ + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return m;
}
function _M0MPB3Map3MapGsRPB4JsonE(arr, capacity) {
  const length = arr.end - arr.start | 0;
  let capacity$2;
  if (capacity === undefined) {
    capacity$2 = length === 0 ? 8 : _M0FPB21capacity__for__length(length);
  } else {
    const _Some = capacity;
    const _capacity = _Some;
    const _p = _M0FPB21capacity__for__length(length);
    capacity$2 = _capacity > _p ? _capacity : _p;
  }
  const m = _M0FPB8new__mapGsRPB4JsonE(capacity$2);
  const _bind = arr.end - arr.start | 0;
  let _tmp = 0;
  while (true) {
    const _ = _tmp;
    if (_ < _bind) {
      const e = arr.buf[arr.start + _ | 0];
      _M0MPB3Map3setGsRPB4JsonE(m, e._0, e._1);
      _tmp = _ + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return m;
}
function _M0MPB3Map8containsGsbE(self, key) {
  const hash = _M0IPC16string6StringPB4Hash4hash(key);
  let _tmp = 0;
  let _tmp$2 = hash & self.capacity_mask;
  while (true) {
    const i = _tmp;
    const idx = _tmp$2;
    const _bind = self.entries[idx];
    if (_bind === undefined) {
      return false;
    } else {
      const _Some = _bind;
      const _entry = _Some;
      if (_entry.hash === hash && _entry.key === key) {
        return true;
      }
      if (i > _entry.psl) {
        return false;
      }
      _tmp = i + 1 | 0;
      _tmp$2 = idx + 1 & self.capacity_mask;
      continue;
    }
  }
}
function _M0MPB3Map4iterGsRPB4JsonE(self) {
  const curr_entry = new _M0TPB8MutLocalGORPB5EntryGsRPB4JsonEE(self.head);
  const len = self.size;
  const remaining = new _M0TPB8MutLocalGiE(len);
  return _M0MPB4Iter3newGUsRPB4JsonEE(() => {
    _L: {
      if (remaining.val > 0) {
        const _bind = curr_entry.val;
        if (_bind === undefined) {
          break _L;
        } else {
          const _Some = _bind;
          const _x = _Some;
          const _key = _x.key;
          const _value = _x.value;
          const _next = _x.next;
          curr_entry.val = _next;
          remaining.val = remaining.val - 1 | 0;
          return { _0: _key, _1: _value };
        }
      } else {
        break _L;
      }
    }
    return undefined;
  }, len);
}
function _M0IPC16string6StringPB4Hash4hash(self) {
  let acc = (_M0FPB4seed >>> 0) + (374761393 >>> 0) | 0;
  const _bind = self.length;
  let _tmp = 0;
  while (true) {
    const i = _tmp;
    if (i < _bind) {
      acc = (acc >>> 0) + (4 >>> 0) | 0;
      const v = self.charCodeAt(i);
      acc = _M0FPB13consume4__acc(acc, v);
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return _M0FPB13finalize__acc(acc);
}
function _M0IPC16double6DoublePB4Show10to__string(self) {
  return String(self);
}
function _M0MPC15array5Array11unsafe__popGiE(self) {
  return _M0MPB7JSArray3pop(self);
}
function _M0MPC15array5Array11unsafe__popGRPC14json10WriteFrameE(self) {
  return _M0MPB7JSArray3pop(self);
}
function _M0MPC15array5Array3popGiE(self) {
  if (self.length === 0) {
    return undefined;
  } else {
    const v = _M0MPC15array5Array11unsafe__popGiE(self);
    return v;
  }
}
function _M0MPC15array5Array3popGRPC14json10WriteFrameE(self) {
  if (self.length === 0) {
    return undefined;
  } else {
    const v = _M0MPC15array5Array11unsafe__popGRPC14json10WriteFrameE(self);
    return v;
  }
}
function _M0MPC15array5Array4copyGiE(self) {
  return _M0MPB7JSArray4copy(self);
}
function _M0MPC15array5Array4copyGRP39litmuslab6engine4core5WriteE(self) {
  return _M0MPB7JSArray4copy(self);
}
function _M0MPC15array5Array2atGiE(self, index) {
  const len = self.length;
  return index >= 0 && index < len ? self[index] : $panic();
}
function _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(self, index) {
  const len = self.length;
  return index >= 0 && index < len ? self[index] : $panic();
}
function _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(self, index) {
  const len = self.length;
  return index >= 0 && index < len ? self[index] : $panic();
}
function _M0MPC15array5Array3setGiE(self, index, value) {
  const len = self.length;
  if (index >= 0 && index < len) {
    self[index] = value;
    return;
  } else {
    $panic();
    return;
  }
}
function _M0MPC15array5Array3setGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(self, index, value) {
  const len = self.length;
  if (index >= 0 && index < len) {
    self[index] = value;
    return;
  } else {
    $panic();
    return;
  }
}
function _M0MPC15array5Array4makeGiE(len, elem) {
  const arr = new Array(len);
  let _tmp = 0;
  while (true) {
    const i = _tmp;
    if (i < len) {
      arr[i] = elem;
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return arr;
}
function _M0MPC15array5Array3revGsE(self) {
  const len = self.length;
  const arr = new Array(len);
  let _tmp = 0;
  while (true) {
    const i = _tmp;
    if (i < len) {
      arr[i] = self[(len - i | 0) - 1 | 0];
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return arr;
}
function _M0MPC15array5Array8containsGsE(self, value) {
  const _bind = self.length;
  let _tmp = 0;
  while (true) {
    const _ = _tmp;
    if (_ < _bind) {
      const v = self[_];
      if (v === value) {
        return true;
      }
      _tmp = _ + 1 | 0;
      continue;
    } else {
      return false;
    }
  }
}
function _M0MPC15array5Array4joinGsE(self, separator) {
  return _M0MPC15array9ArrayView4joinGsE(new _M0TPB9ArrayViewGsE(self, 0, self.length), separator);
}
function _M0FPC14json19needs__escape__unit(code, escape_slash) {
  const _p = 34;
  if (code === _p) {
    return true;
  } else {
    let _tmp;
    const _p$2 = 92;
    if (code === _p$2) {
      _tmp = true;
    } else {
      let _tmp$2;
      if (code < 32) {
        _tmp$2 = true;
      } else {
        let _tmp$3;
        if (escape_slash) {
          const _p$3 = 47;
          _tmp$3 = code === _p$3;
        } else {
          _tmp$3 = false;
        }
        _tmp$2 = _tmp$3;
      }
      _tmp = _tmp$2;
    }
    return _tmp;
  }
}
function _M0FPC14json20need__escape__scalar(str, escape_slash, start, end) {
  let _tmp = start;
  while (true) {
    const i = _tmp;
    if (i < end) {
      if (_M0FPC14json19needs__escape__unit(str.charCodeAt(i), escape_slash)) {
        return true;
      }
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return false;
}
function _M0FPC14json12need__escape(str, escape_slash) {
  return _M0FPC14json20need__escape__scalar(str, escape_slash, 0, str.length);
}
function _M0FPC14json13write__escape(buf, code) {
  switch (code) {
    case 34: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\\"");
      return;
    }
    case 92: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\\\");
      return;
    }
    case 47: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\/");
      return;
    }
    case 10: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\n");
      return;
    }
    case 13: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\r");
      return;
    }
    case 8: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\b");
      return;
    }
    case 9: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\t");
      return;
    }
    case 12: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\f");
      return;
    }
    default: {
      _M0IPB13StringBuilderPB6Logger13write__string(buf, "\\u00");
      _M0IPB13StringBuilderPB6Logger13write__string(buf, _M0MPC14byte4Byte7to__hex(code & 255));
      return;
    }
  }
}
function _M0FPC14json14write__escaped(buf, str, escape_slash) {
  if (!_M0FPC14json12need__escape(str, escape_slash)) {
    _M0IPB13StringBuilderPB6Logger13write__string(buf, str);
    return undefined;
  }
  const _bind = str.length;
  let _tmp = 0;
  let _tmp$2 = 0;
  while (true) {
    const i = _tmp;
    const run_start = _tmp$2;
    if (i < _bind) {
      const code = str.charCodeAt(i);
      if (_M0FPC14json19needs__escape__unit(code, escape_slash)) {
        _M0IPB13StringBuilderPB6Logger11write__view(buf, _M0MPC16string6String19exact__view_2einner(str, run_start, i));
        _M0FPC14json13write__escape(buf, code);
        _tmp = i + 1 | 0;
        _tmp$2 = i + 1 | 0;
        continue;
      } else {
        _tmp = i + 1 | 0;
        continue;
      }
    } else {
      _M0IPB13StringBuilderPB6Logger11write__view(buf, _M0MPC16string6String19exact__view_2einner(str, run_start, undefined));
      return;
    }
  }
}
function _M0FPC14json13write__indent(buf, cache, level, indent) {
  while (true) {
    if (cache.length <= level) {
      if (cache.length >= 1) {
        const _last = cache[cache.length - 1 | 0];
        _M0MPC15array5Array4pushGRPB4JsonE(cache, `${_last}${_M0MPC16string6String6repeat(" ", indent)}`);
      } else {
        _M0MPC15array5Array4pushGRPB4JsonE(cache, "\n");
      }
      continue;
    } else {
      break;
    }
  }
  _M0IPB13StringBuilderPB6Logger13write__string(buf, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(cache, level));
}
function _M0MPC14json4Json17stringify_2einner(self, escape_slash, indent, replacer) {
  const buf = _M0MPB13StringBuilder21StringBuilder_2einner(0);
  const indent_cache = [];
  const stack = [];
  let depth = 0;
  let _tmp = self;
  while (true) {
    const x = _tmp;
    if (x === undefined) {
      if (stack.length === 0) {
        break;
      } else {
        const _x = stack[stack.length - 1 | 0];
        if (_x.$tag === 0) {
          const _Array = _x;
          const _arr = _Array._0;
          const _i = _Array._1;
          if (_i < _arr.length) {
            const element = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_arr, _i);
            _Array._1 = _i + 1 | 0;
            if (_i > 0) {
              _M0IPB13StringBuilderPB6Logger11write__char(buf, 44);
              if (indent > 0) {
                _M0FPC14json13write__indent(buf, indent_cache, depth, indent);
              }
            }
            _tmp = element;
            continue;
          } else {
            depth = depth - 1 | 0;
            _M0MPC15array5Array3popGRPC14json10WriteFrameE(stack);
            if (indent > 0) {
              _M0FPC14json13write__indent(buf, indent_cache, depth, indent);
            }
            _M0IPB13StringBuilderPB6Logger11write__char(buf, 93);
            _tmp = undefined;
            continue;
          }
        } else {
          const _Object = _x;
          const _iterator = _Object._0;
          const _first = _Object._1;
          const _bind = _M0MPB4Iter4nextGRPC16string10StringViewE(_iterator);
          if (_bind === undefined) {
            depth = depth - 1 | 0;
            _M0MPC15array5Array3popGRPC14json10WriteFrameE(stack);
            if (indent > 0 && !_first) {
              _M0FPC14json13write__indent(buf, indent_cache, depth, indent);
            }
            _M0IPB13StringBuilderPB6Logger11write__char(buf, 125);
            _tmp = undefined;
            continue;
          } else {
            const _Some = _bind;
            const _x$2 = _Some;
            const _k = _x$2._0;
            const _v = _x$2._1;
            let v2 = _v;
            if (replacer === undefined) {
            } else {
              const _Some$2 = replacer;
              const _replacer = _Some$2;
              const _func = _replacer.f;
              const _bind$2 = _func(_k, _v);
              if (_bind$2 === undefined) {
                _tmp = undefined;
                continue;
              } else {
                const _Some$3 = _bind$2;
                const _v$2 = _Some$3;
                v2 = _v$2;
              }
            }
            if (!_first) {
              _M0IPB13StringBuilderPB6Logger11write__char(buf, 44);
            }
            if (indent > 0) {
              _M0FPC14json13write__indent(buf, indent_cache, depth, indent);
            }
            _M0IPB13StringBuilderPB6Logger11write__char(buf, 34);
            _M0FPC14json14write__escaped(buf, _k, escape_slash);
            _M0IPB13StringBuilderPB6Logger11write__char(buf, 34);
            _M0IPB13StringBuilderPB6Logger11write__char(buf, 58);
            if (indent > 0) {
              _M0IPB13StringBuilderPB6Logger11write__char(buf, 32);
            }
            _Object._1 = false;
            _tmp = v2;
            continue;
          }
        }
      }
    } else {
      const _Some = x;
      const _value = _Some;
      switch (_value.$tag) {
        case 6: {
          const _Object = _value;
          const _members = _Object._0;
          if (_members.size === 0) {
            _M0IPB13StringBuilderPB6Logger13write__string(buf, "{}");
          } else {
            depth = depth + 1 | 0;
            _M0IPB13StringBuilderPB6Logger11write__char(buf, 123);
            _M0MPC15array5Array4pushGRPB4JsonE(stack, new _M0DTPC14json10WriteFrame6Object(_M0MPB3Map4iterGsRPB4JsonE(_members), true));
          }
          break;
        }
        case 5: {
          const _Array = _value;
          const _arr = _Array._0;
          if (_arr.length === 0) {
            _M0IPB13StringBuilderPB6Logger13write__string(buf, "[]");
          } else {
            depth = depth + 1 | 0;
            _M0IPB13StringBuilderPB6Logger11write__char(buf, 91);
            if (indent > 0) {
              _M0FPC14json13write__indent(buf, indent_cache, depth, indent);
            }
            _M0MPC15array5Array4pushGRPB4JsonE(stack, new _M0DTPC14json10WriteFrame5Array(_arr, 0));
          }
          break;
        }
        case 4: {
          const _String = _value;
          const _s = _String._0;
          _M0IPB13StringBuilderPB6Logger11write__char(buf, 34);
          _M0FPC14json14write__escaped(buf, _s, escape_slash);
          _M0IPB13StringBuilderPB6Logger11write__char(buf, 34);
          break;
        }
        case 3: {
          const _Number = _value;
          const _n = _Number._0;
          const _repr = _Number._1;
          if (_repr === undefined) {
            _M0MPB13StringBuilder13write__objectGdE(buf, _n);
          } else {
            const _Some$2 = _repr;
            const _r = _Some$2;
            _M0IPB13StringBuilderPB6Logger13write__string(buf, _r);
          }
          break;
        }
        case 1: {
          _M0IPB13StringBuilderPB6Logger13write__string(buf, "true");
          break;
        }
        case 2: {
          _M0IPB13StringBuilderPB6Logger13write__string(buf, "false");
          break;
        }
        default: {
          _M0IPB13StringBuilderPB6Logger13write__string(buf, "null");
        }
      }
      _tmp = undefined;
      continue;
    }
  }
  return buf.val;
}
function _M0FP39litmuslab6engine4core7problem(code, message, line, column) {
  return new _M0TP39litmuslab6engine4core10Diagnostic(code, message, line, column);
}
function _M0FP39litmuslab6engine4core14initial__state(p) {
  const _tmp = _M0MPC15array5Array4copyGiE(p.initial);
  const _tmp$2 = _M0MPC15array5Array4makeGiE(p.threads.length, 0);
  const _p = p.threads;
  const _p$2 = new Array(_p.length);
  const _p$3 = _p.length;
  let _tmp$3 = 0;
  while (true) {
    const _p$4 = _tmp$3;
    if (_p$4 < _p$3) {
      const _p$5 = _p[_p$4];
      _p$2[_p$4] = _M0MPC15array5Array4makeGiE(_p$5.registers.length, 0);
      _tmp$3 = _p$4 + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  const _p$4 = p.threads;
  const _p$5 = new Array(_p$4.length);
  const _p$6 = _p$4.length;
  let _tmp$4 = 0;
  while (true) {
    const _p$7 = _tmp$4;
    if (_p$7 < _p$6) {
      _p$5[_p$7] = [];
      _tmp$4 = _p$7 + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return new _M0TP39litmuslab6engine4core5State(_tmp, _tmp$2, _p$2, _p$5);
}
function _M0FP39litmuslab6engine4core11copy__state(s) {
  const _tmp = _M0MPC15array5Array4copyGiE(s.memory);
  const _tmp$2 = _M0MPC15array5Array4copyGiE(s.pcs);
  const _p = s.registers;
  const _p$2 = new Array(_p.length);
  const _p$3 = _p.length;
  let _tmp$3 = 0;
  while (true) {
    const _p$4 = _tmp$3;
    if (_p$4 < _p$3) {
      const _p$5 = _p[_p$4];
      _p$2[_p$4] = _M0MPC15array5Array4copyGiE(_p$5);
      _tmp$3 = _p$4 + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  const _p$4 = s.buffers;
  const _p$5 = new Array(_p$4.length);
  const _p$6 = _p$4.length;
  let _tmp$4 = 0;
  while (true) {
    const _p$7 = _tmp$4;
    if (_p$7 < _p$6) {
      const _p$8 = _p$4[_p$7];
      _p$5[_p$7] = _M0MPC15array5Array4copyGRP39litmuslab6engine4core5WriteE(_p$8);
      _tmp$4 = _p$7 + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return new _M0TP39litmuslab6engine4core5State(_tmp, _tmp$2, _p$2, _p$5);
}
function _M0FP39litmuslab6engine4core8terminal(p, s) {
  let _tmp = 0;
  while (true) {
    const t = _tmp;
    if (t < p.threads.length) {
      let _tmp$2;
      if (_M0MPC15array5Array2atGiE(s.pcs, t) !== _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).instructions.length) {
        _tmp$2 = true;
      } else {
        const _p = _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t);
        _tmp$2 = !(_p.length === 0);
      }
      if (_tmp$2) {
        return false;
      }
      _tmp = t + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return true;
}
function _M0FP39litmuslab6engine4core7enabled(p, s, tso) {
  const actions = [];
  let _tmp = 0;
  while (true) {
    const t = _tmp;
    if (t < p.threads.length) {
      if (_M0MPC15array5Array2atGiE(s.pcs, t) < _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).instructions.length) {
        const _bind = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).instructions, _M0MPC15array5Array2atGiE(s.pcs, t));
        let can_issue;
        if (_bind.$tag === 2) {
          const _p = _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t);
          can_issue = _p.length === 0;
        } else {
          can_issue = true;
        }
        if (can_issue) {
          _M0MPC15array5Array4pushGRPB4JsonE(actions, new _M0TP39litmuslab6engine4core6Action(t, false));
        }
      }
      let _tmp$2;
      if (tso) {
        const _p = _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t);
        _tmp$2 = !(_p.length === 0);
      } else {
        _tmp$2 = false;
      }
      if (_tmp$2) {
        _M0MPC15array5Array4pushGRPB4JsonE(actions, new _M0TP39litmuslab6engine4core6Action(t, true));
      }
      _tmp = t + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return actions;
}
function _M0FP39litmuslab6engine4core10transition(p, s, tso, a) {
  const next = _M0FP39litmuslab6engine4core11copy__state(s);
  const t = a.thread;
  if (a.flush) {
    const write = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t), 0);
    _M0MPC15array5Array3setGiE(next.memory, write.address, write.value);
    _M0MPC15array5Array3setGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(next.buffers, t, []);
    let _tmp = 1;
    while (true) {
      const i = _tmp;
      if (i < _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t).length) {
        _M0MPC15array5Array4pushGRPB4JsonE(_M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(next.buffers, t), _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t), i));
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
  } else {
    const _bind = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).instructions, _M0MPC15array5Array2atGiE(s.pcs, t));
    switch (_bind.$tag) {
      case 0: {
        const _Store = _bind;
        const _addr = _Store._0;
        const _value = _Store._1;
        if (tso) {
          _M0MPC15array5Array4pushGRPB4JsonE(_M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(next.buffers, t), new _M0TP39litmuslab6engine4core5Write(_addr, _value));
        } else {
          _M0MPC15array5Array3setGiE(next.memory, _addr, _value);
        }
        break;
      }
      case 1: {
        const _Load = _bind;
        const _reg = _Load._0;
        const _addr$2 = _Load._1;
        let value = _M0MPC15array5Array2atGiE(s.memory, _addr$2);
        const _bind$2 = _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t);
        const _bind$3 = _bind$2.length;
        let _tmp = 0;
        while (true) {
          const _ = _tmp;
          if (_ < _bind$3) {
            const write = _bind$2[_];
            if (write.address === _addr$2) {
              value = write.value;
            }
            _tmp = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _M0MPC15array5Array3setGiE(_M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(next.registers, t), _reg, value);
        break;
      }
    }
    _M0MPC15array5Array3setGiE(next.pcs, t, _M0MPC15array5Array2atGiE(next.pcs, t) + 1 | 0);
  }
  return next;
}
function _M0FP39litmuslab6engine4core12action__text(a) {
  return `${a.flush ? "f" : "t"}${_M0MPC13int3Int18to__string_2einner(a.thread, 10)}`;
}
function _M0FP39litmuslab6engine4core10state__key(s) {
  const pieces = [];
  const _p = s.memory;
  const _p$2 = new Array(_p.length);
  const _p$3 = _p.length;
  let _tmp = 0;
  while (true) {
    const _p$4 = _tmp;
    if (_p$4 < _p$3) {
      const _p$5 = _p[_p$4];
      _p$2[_p$4] = _M0MPC13int3Int18to__string_2einner(_p$5, 10);
      _tmp = _p$4 + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  _M0MPC15array5Array4pushGRPB4JsonE(pieces, _M0MPC15array5Array4joinGsE(_p$2, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core10state__keyN7_2abindS801, 0, _M0FP39litmuslab6engine4core10state__keyN7_2abindS801.length)));
  const _p$4 = s.pcs;
  const _p$5 = new Array(_p$4.length);
  const _p$6 = _p$4.length;
  let _tmp$2 = 0;
  while (true) {
    const _p$7 = _tmp$2;
    if (_p$7 < _p$6) {
      const _p$8 = _p$4[_p$7];
      _p$5[_p$7] = _M0MPC13int3Int18to__string_2einner(_p$8, 10);
      _tmp$2 = _p$7 + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  _M0MPC15array5Array4pushGRPB4JsonE(pieces, _M0MPC15array5Array4joinGsE(_p$5, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core10state__keyN7_2abindS802, 0, _M0FP39litmuslab6engine4core10state__keyN7_2abindS802.length)));
  const _bind = s.registers;
  const _bind$2 = _bind.length;
  let _tmp$3 = 0;
  while (true) {
    const _ = _tmp$3;
    if (_ < _bind$2) {
      const r = _bind[_];
      const _p$7 = new Array(r.length);
      const _p$8 = r.length;
      let _tmp$4 = 0;
      while (true) {
        const _p$9 = _tmp$4;
        if (_p$9 < _p$8) {
          const _p$10 = r[_p$9];
          _p$7[_p$9] = _M0MPC13int3Int18to__string_2einner(_p$10, 10);
          _tmp$4 = _p$9 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      _M0MPC15array5Array4pushGRPB4JsonE(pieces, _M0MPC15array5Array4joinGsE(_p$7, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core10state__keyN7_2abindS803, 0, _M0FP39litmuslab6engine4core10state__keyN7_2abindS803.length)));
      _tmp$3 = _ + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  _M0MPC15array5Array4pushGRPB4JsonE(pieces, "b");
  const _bind$3 = s.buffers;
  const _bind$4 = _bind$3.length;
  let _tmp$4 = 0;
  while (true) {
    const _ = _tmp$4;
    if (_ < _bind$4) {
      const b = _bind$3[_];
      const _p$7 = new Array(b.length);
      const _p$8 = b.length;
      let _tmp$5 = 0;
      while (true) {
        const _p$9 = _tmp$5;
        if (_p$9 < _p$8) {
          const _p$10 = b[_p$9];
          const _p$11 = _M0MPB13StringBuilder21StringBuilder_2einner(1);
          _M0MPB13StringBuilder13write__objectGiE(_p$11, _p$10.address);
          _M0IPB13StringBuilderPB6Logger13write__string(_p$11, ":");
          _M0MPB13StringBuilder13write__objectGiE(_p$11, _p$10.value);
          _p$7[_p$9] = _p$11.val;
          _tmp$5 = _p$9 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      _M0MPC15array5Array4pushGRPB4JsonE(pieces, _M0MPC15array5Array4joinGsE(_p$7, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core10state__keyN7_2abindS804, 0, _M0FP39litmuslab6engine4core10state__keyN7_2abindS804.length)));
      _tmp$4 = _ + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return _M0MPC15array5Array4joinGsE(pieces, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core10state__keyN7_2abindS805, 0, _M0FP39litmuslab6engine4core10state__keyN7_2abindS805.length));
}
function _M0FP39litmuslab6engine4core12outcome__key(s) {
  const _p = s.memory;
  const _p$2 = new Array(_p.length);
  const _p$3 = _p.length;
  let _tmp = 0;
  while (true) {
    const _p$4 = _tmp;
    if (_p$4 < _p$3) {
      const _p$5 = _p[_p$4];
      _p$2[_p$4] = _M0MPC13int3Int18to__string_2einner(_p$5, 10);
      _tmp = _p$4 + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  const pieces = [_M0MPC15array5Array4joinGsE(_p$2, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core12outcome__keyN7_2abindS823, 0, _M0FP39litmuslab6engine4core12outcome__keyN7_2abindS823.length))];
  const _bind = s.registers;
  const _bind$2 = _bind.length;
  let _tmp$2 = 0;
  while (true) {
    const _ = _tmp$2;
    if (_ < _bind$2) {
      const r = _bind[_];
      const _p$4 = new Array(r.length);
      const _p$5 = r.length;
      let _tmp$3 = 0;
      while (true) {
        const _p$6 = _tmp$3;
        if (_p$6 < _p$5) {
          const _p$7 = r[_p$6];
          _p$4[_p$6] = _M0MPC13int3Int18to__string_2einner(_p$7, 10);
          _tmp$3 = _p$6 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      _M0MPC15array5Array4pushGRPB4JsonE(pieces, _M0MPC15array5Array4joinGsE(_p$4, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core12outcome__keyN7_2abindS824, 0, _M0FP39litmuslab6engine4core12outcome__keyN7_2abindS824.length)));
      _tmp$2 = _ + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return _M0MPC15array5Array4joinGsE(pieces, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core12outcome__keyN7_2abindS825, 0, _M0FP39litmuslab6engine4core12outcome__keyN7_2abindS825.length));
}
function _M0FP39litmuslab6engine4core17instruction__text(p, t, i) {
  const _bind = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).instructions, i);
  switch (_bind.$tag) {
    case 0: {
      const _Store = _bind;
      const _a = _Store._0;
      const _v = _Store._1;
      const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(7);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "store ");
      _M0MPB13StringBuilder13write__objectGsE(_string_builder, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.addresses, _a));
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, " ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, _v);
      return _string_builder.val;
    }
    case 1: {
      const _Load = _bind;
      const _r = _Load._0;
      const _a$2 = _Load._1;
      const _string_builder$2 = _M0MPB13StringBuilder21StringBuilder_2einner(6);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, "load ");
      _M0MPB13StringBuilder13write__objectGsE(_string_builder$2, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).registers, _r));
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, " ");
      _M0MPB13StringBuilder13write__objectGsE(_string_builder$2, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.addresses, _a$2));
      return _string_builder$2.val;
    }
    default: {
      return "fence";
    }
  }
}
function _M0FP39litmuslab6engine4core11witness__of(nodes, index) {
  const reverse = [];
  let cursor = index;
  while (true) {
    if (_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(nodes, cursor).parent >= 0) {
      _M0MPC15array5Array4pushGRPB4JsonE(reverse, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(nodes, cursor).action);
      cursor = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(nodes, cursor).parent;
      continue;
    } else {
      break;
    }
  }
  return _M0MPC15array5Array4joinGsE(_M0MPC15array5Array3revGsE(reverse), new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core11witness__ofN7_2abindS847, 0, _M0FP39litmuslab6engine4core11witness__ofN7_2abindS847.length));
}
function _M0FP39litmuslab6engine4core4jnum(n) {
  const _p = n + 0;
  const _p$2 = undefined;
  return new _M0DTPB4Json6Number(_p, _p$2);
}
function _M0FP39litmuslab6engine4core7jobject(fields) {
  const _p = _M0MPB3Map3MapGsRPB4JsonE(new _M0TPB9ArrayViewGUsRPB4JsonEE(fields, 0, fields.length), undefined);
  return new _M0DTPB4Json6Object(_p);
}
function _M0FP39litmuslab6engine4core16diagnostic__json(e) {
  const _p = "error";
  const _tmp = { _0: "status", _1: new _M0DTPB4Json6String(_p) };
  const _tmp$2 = { _0: "exitCode", _1: _M0FP39litmuslab6engine4core4jnum(2) };
  const _p$2 = e.code;
  const _tmp$3 = { _0: "code", _1: new _M0DTPB4Json6String(_p$2) };
  const _p$3 = e.message;
  return _M0MPC14json4Json17stringify_2einner(_M0FP39litmuslab6engine4core7jobject([_tmp, _tmp$2, { _0: "error", _1: _M0FP39litmuslab6engine4core7jobject([_tmp$3, { _0: "message", _1: new _M0DTPB4Json6String(_p$3) }, { _0: "line", _1: _M0FP39litmuslab6engine4core4jnum(e.line) }, { _0: "column", _1: _M0FP39litmuslab6engine4core4jnum(e.column) }]) }]), false, 0, undefined);
}
function _M0FP39litmuslab6engine4core13named__values(names, values) {
  const _bind = [];
  const fields = _M0MPB3Map3MapGsRPB4JsonE(new _M0TPB9ArrayViewGUsRPB4JsonEE(_bind, 0, 0), undefined);
  let _tmp = 0;
  while (true) {
    const i = _tmp;
    if (i < names.length) {
      _M0MPB3Map3setGsRPB4JsonE(fields, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(names, i), _M0FP39litmuslab6engine4core4jnum(_M0MPC15array5Array2atGiE(values, i)));
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return new _M0DTPB4Json6Object(fields);
}
function _M0FP39litmuslab6engine4core13outcome__json(p, s, witness) {
  const _bind = [];
  const registers = _M0MPB3Map3MapGsRPB4JsonE(new _M0TPB9ArrayViewGUsRPB4JsonEE(_bind, 0, 0), undefined);
  let _tmp = 0;
  while (true) {
    const t = _tmp;
    if (t < p.threads.length) {
      _M0MPB3Map3setGsRPB4JsonE(registers, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).name, _M0FP39litmuslab6engine4core13named__values(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).registers, _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.registers, t)));
      _tmp = t + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  const _p = _M0FP39litmuslab6engine4core12outcome__key(s);
  return _M0FP39litmuslab6engine4core7jobject([{ _0: "id", _1: new _M0DTPB4Json6String(_p) }, { _0: "memory", _1: _M0FP39litmuslab6engine4core13named__values(p.addresses, s.memory) }, { _0: "registers", _1: new _M0DTPB4Json6Object(registers) }, { _0: "witness", _1: new _M0DTPB4Json6String(witness) }]);
}
function _M0FP39litmuslab6engine4core10identifier(s) {
  let count = 0;
  const _bind = s.length;
  let _tmp = 0;
  while (true) {
    const _string_index = _tmp;
    if (_string_index < _bind) {
      let _decoded_next_string_index;
      let _decoded_char;
      _L: {
        const _bind$2 = s.charCodeAt(_string_index);
        if (_bind$2 >= 55296 && _bind$2 <= 56319 && (_string_index + 1 | 0) < _bind) {
          const _bind$3 = s.charCodeAt(_string_index + 1 | 0);
          if (_bind$3 >= 56320 && _bind$3 <= 57343) {
            const _tmp$2 = _string_index + 2 | 0;
            const _p = (((Math.imul(_bind$2 - 55296 | 0, 1024) | 0) + _bind$3 | 0) - 56320 | 0) + 65536 | 0;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          } else {
            const _tmp$2 = _string_index + 1 | 0;
            const _p = _bind$2;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          }
        } else {
          const _tmp$2 = _string_index + 1 | 0;
          const _p = _bind$2;
          _decoded_next_string_index = _tmp$2;
          _decoded_char = _p;
          break _L;
        }
      }
      const letter = _decoded_char >= 97 && _decoded_char <= 122 || _decoded_char >= 65 && _decoded_char <= 90;
      if (!letter && !(count > 0 && (_decoded_char >= 48 && _decoded_char <= 57 || _decoded_char === 95))) {
        return false;
      }
      count = count + 1 | 0;
      if (count > 32) {
        return false;
      }
      _tmp = _decoded_next_string_index;
      continue;
    } else {
      break;
    }
  }
  return count > 0;
}
function _M0FP39litmuslab6engine4core9index__of(names, value) {
  let _tmp = 0;
  while (true) {
    const i = _tmp;
    if (i < names.length) {
      if (_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(names, i) === value) {
        return i;
      }
      _tmp = i + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  return undefined;
}
function _M0FP39litmuslab6engine4core7literal(s) {
  let sign = 1;
  let value = 0;
  let digits = 0;
  let index = 0;
  const _bind = s.length;
  let _tmp = 0;
  while (true) {
    const _string_index = _tmp;
    if (_string_index < _bind) {
      let _decoded_next_string_index;
      let _decoded_char;
      _L: {
        const _bind$2 = s.charCodeAt(_string_index);
        if (_bind$2 >= 55296 && _bind$2 <= 56319 && (_string_index + 1 | 0) < _bind) {
          const _bind$3 = s.charCodeAt(_string_index + 1 | 0);
          if (_bind$3 >= 56320 && _bind$3 <= 57343) {
            const _tmp$2 = _string_index + 2 | 0;
            const _p = (((Math.imul(_bind$2 - 55296 | 0, 1024) | 0) + _bind$3 | 0) - 56320 | 0) + 65536 | 0;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          } else {
            const _tmp$2 = _string_index + 1 | 0;
            const _p = _bind$2;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          }
        } else {
          const _tmp$2 = _string_index + 1 | 0;
          const _p = _bind$2;
          _decoded_next_string_index = _tmp$2;
          _decoded_char = _p;
          break _L;
        }
      }
      if (index === 0 && _decoded_char === 45) {
        sign = -1;
      } else {
        if (_decoded_char < 48 || _decoded_char > 57) {
          return undefined;
        }
        value = ((Math.imul(value, 10) | 0) + _decoded_char | 0) - 48 | 0;
        digits = digits + 1 | 0;
        if (value > 32768) {
          return undefined;
        }
      }
      index = index + 1 | 0;
      _tmp = _decoded_next_string_index;
      continue;
    } else {
      break;
    }
  }
  return digits === 0 || (Math.imul(value, sign) | 0) > 32767 ? undefined : Math.imul(value, sign) | 0;
}
function _M0FP39litmuslab6engine4core8tokenize(line) {
  const tokens = [];
  let word = "";
  let start = 1;
  let column = 1;
  const _bind = line.length;
  let _tmp = 0;
  while (true) {
    const _string_index = _tmp;
    if (_string_index < _bind) {
      let _decoded_next_string_index;
      let _decoded_char;
      _L: {
        const _bind$2 = line.charCodeAt(_string_index);
        if (_bind$2 >= 55296 && _bind$2 <= 56319 && (_string_index + 1 | 0) < _bind) {
          const _bind$3 = line.charCodeAt(_string_index + 1 | 0);
          if (_bind$3 >= 56320 && _bind$3 <= 57343) {
            const _tmp$2 = _string_index + 2 | 0;
            const _p = (((Math.imul(_bind$2 - 55296 | 0, 1024) | 0) + _bind$3 | 0) - 56320 | 0) + 65536 | 0;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          } else {
            const _tmp$2 = _string_index + 1 | 0;
            const _p = _bind$2;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          }
        } else {
          const _tmp$2 = _string_index + 1 | 0;
          const _p = _bind$2;
          _decoded_next_string_index = _tmp$2;
          _decoded_char = _p;
          break _L;
        }
      }
      if (_decoded_char === 35) {
        break;
      }
      if (_decoded_char === 32 || (_decoded_char === 9 || _decoded_char === 13)) {
        const _p = word;
        const _p$2 = "";
        if (!(_p === _p$2)) {
          _M0MPC15array5Array4pushGRPB4JsonE(tokens, new _M0TP39litmuslab6engine4core5Token(word, start));
          word = "";
        }
      } else {
        if (word === "") {
          start = column;
        }
        word = `${word}${_M0IPC14char4CharPB4Show10to__string(_decoded_char)}`;
      }
      column = column + 1 | 0;
      _tmp = _decoded_next_string_index;
      continue;
    } else {
      break;
    }
  }
  const _p = word;
  const _p$2 = "";
  if (!(_p === _p$2)) {
    _M0MPC15array5Array4pushGRPB4JsonE(tokens, new _M0TP39litmuslab6engine4core5Token(word, start));
  }
  return tokens;
}
function _M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, code, msg, column) {
  return _M0FP39litmuslab6engine4core7problem(code, msg, line_number.val, column);
}
function _M0FP39litmuslab6engine4core14parse__program(source) {
  let char_count = 0;
  const _bind = source.length;
  let _tmp = 0;
  while (true) {
    const _string_index = _tmp;
    if (_string_index < _bind) {
      let _decoded_next_string_index;
      let _decoded_char;
      _L: {
        const _bind$2 = source.charCodeAt(_string_index);
        if (_bind$2 >= 55296 && _bind$2 <= 56319 && (_string_index + 1 | 0) < _bind) {
          const _bind$3 = source.charCodeAt(_string_index + 1 | 0);
          if (_bind$3 >= 56320 && _bind$3 <= 57343) {
            const _tmp$2 = _string_index + 2 | 0;
            const _p = (((Math.imul(_bind$2 - 55296 | 0, 1024) | 0) + _bind$3 | 0) - 56320 | 0) + 65536 | 0;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          } else {
            const _tmp$2 = _string_index + 1 | 0;
            const _p = _bind$2;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          }
        } else {
          const _tmp$2 = _string_index + 1 | 0;
          const _p = _bind$2;
          _decoded_next_string_index = _tmp$2;
          _decoded_char = _p;
          break _L;
        }
      }
      char_count = char_count + 1 | 0;
      if (char_count > 32768) {
        return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core7problem("InputLimit", "Source exceeds 32768 Unicode code points", 0, 0));
      }
      _tmp = _decoded_next_string_index;
      continue;
    } else {
      break;
    }
  }
  const addresses = [];
  const initial = [];
  const threads = [];
  let current = undefined;
  let seen_memory = false;
  const line_number = new _M0TPB8MutLocalGiE(0);
  const _it = _M0MPC16string6String5split(source, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core14parse__programN7_2abindS911, 0, _M0FP39litmuslab6engine4core14parse__programN7_2abindS911.length));
  while (true) {
    const _bind$2 = _M0MPB4Iter4nextGRPC16string10StringViewE(_it);
    if (_bind$2 === undefined) {
      break;
    } else {
      const _Some = _bind$2;
      const _line = _Some;
      line_number.val = line_number.val + 1 | 0;
      const tokens = _M0FP39litmuslab6engine4core8tokenize(_M0MPC16string10StringView9to__owned(_line));
      if (tokens.length === 0) {
        continue;
      }
      const first = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 0);
      let _tmp$2;
      if (!seen_memory) {
        const _p = first.text;
        const _p$2 = "memory";
        _tmp$2 = !(_p === _p$2);
      } else {
        _tmp$2 = false;
      }
      if (_tmp$2) {
        return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "ExpectedMemory", "First declaration must be memory x=0 ...", first.column));
      }
      _L: {
        _L$2: {
          const _bind$3 = first.text;
          switch (_bind$3) {
            case "memory": {
              if (seen_memory) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "DuplicateMemory", "Only one memory declaration is allowed", first.column));
              }
              if (tokens.length < 2 || tokens.length > 9) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "MemoryLimit", "Declare between 1 and 8 addresses", first.column));
              }
              let _tmp$3 = 1;
              while (true) {
                const i = _tmp$3;
                if (i < tokens.length) {
                  const token = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, i);
                  const pair = _M0MPB4Iter9to__arrayGRPC16string10StringViewE(_M0MPC16string6String5split(token.text, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core14parse__programN7_2abindS912, 0, _M0FP39litmuslab6engine4core14parse__programN7_2abindS912.length)));
                  if (pair.length !== 2 || !_M0FP39litmuslab6engine4core10identifier(_M0MPC16string10StringView9to__owned(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(pair, 0)))) {
                    return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "MemorySyntax", "Expected ASCII name=value (name at most 32 characters)", token.column));
                  }
                  const name = _M0MPC16string10StringView9to__owned(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(pair, 0));
                  if (_M0MPC15array5Array8containsGsE(addresses, name)) {
                    return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "DuplicateAddress", `Duplicate address: ${name}`, token.column));
                  }
                  const _bind$4 = _M0FP39litmuslab6engine4core7literal(_M0MPC16string10StringView9to__owned(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(pair, 1)));
                  let value;
                  if (_bind$4 === undefined) {
                    return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "InvalidInteger", "Integer must be in -32768..32767", (token.column + name.length | 0) + 1 | 0));
                  } else {
                    const _Some$2 = _bind$4;
                    value = _Some$2;
                  }
                  _M0MPC15array5Array4pushGRPB4JsonE(addresses, name);
                  _M0MPC15array5Array4pushGiE(initial, value);
                  _tmp$3 = i + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              seen_memory = true;
              break;
            }
            case "thread": {
              const _bind$4 = current;
              if (_bind$4 === undefined) {
              } else {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "NestedThread", "Close the previous thread with end", first.column));
              }
              if (tokens.length !== 2) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "ThreadSyntax", "Expected thread NAME", first.column));
              }
              const name = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 1).text;
              if (!_M0FP39litmuslab6engine4core10identifier(name)) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "InvalidName", "Thread name must be an ASCII identifier of at most 32 characters", _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 1).column));
              }
              let _tmp$4;
              let _p;
              _L$3: {
                _L$4: {
                  const _p$2 = threads.length;
                  let _tmp$5 = 0;
                  while (true) {
                    const _p$3 = _tmp$5;
                    if (_p$3 < _p$2) {
                      const _p$4 = threads[_p$3];
                      if (_p$4.name === name) {
                        _p = true;
                        break _L$4;
                      }
                      _tmp$5 = _p$3 + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  _tmp$4 = false;
                  break _L$3;
                }
                _tmp$4 = _p;
              }
              if (_tmp$4) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "DuplicateThread", `Duplicate thread: ${name}`, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 1).column));
              }
              if (threads.length === 4) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "ThreadLimit", "At most 4 threads are supported", first.column));
              }
              current = new _M0TP39litmuslab6engine4core6Thread(name, [], [], []);
              break;
            }
            case "end": {
              if (tokens.length !== 1) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "EndSyntax", "end takes no operands", _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 1).column));
              }
              const _bind$5 = current;
              if (_bind$5 === undefined) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "UnexpectedEnd", "end is outside a thread", first.column));
              } else {
                const _Some$2 = _bind$5;
                const _t = _Some$2;
                _M0MPC15array5Array4pushGRPB4JsonE(threads, _t);
                current = undefined;
              }
              break;
            }
            case "store": {
              break _L$2;
            }
            case "load": {
              break _L$2;
            }
            case "fence": {
              break _L$2;
            }
            default: {
              return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "UnknownCommand", `Unknown command: ${first.text}`, first.column));
            }
          }
          break _L;
        }
        const _bind$3 = current;
        let t;
        if (_bind$3 === undefined) {
          return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "OutsideThread", "Instruction is outside a thread", first.column));
        } else {
          const _Some$2 = _bind$3;
          t = _Some$2;
        }
        if (t.instructions.length === 16) {
          return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "InstructionLimit", "At most 16 instructions per thread", first.column));
        }
        if (first.text === "fence") {
          if (tokens.length !== 1) {
            return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "FenceSyntax", "fence takes no operands", _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 1).column));
          }
          _M0MPC15array5Array4pushGRPB4JsonE(t.instructions, _M0DTP39litmuslab6engine4core11Instruction5Fence__);
        } else {
          if (tokens.length !== 3) {
            return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "InstructionSyntax", "Expected store ADDRESS INTEGER or load REGISTER ADDRESS", first.column));
          }
          const address_token = first.text === "store" ? _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 1) : _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 2);
          const _bind$4 = _M0FP39litmuslab6engine4core9index__of(addresses, address_token.text);
          let addr;
          if (_bind$4 === undefined) {
            return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "UnknownAddress", `Undeclared address: ${address_token.text}`, address_token.column));
          } else {
            const _Some$2 = _bind$4;
            addr = _Some$2;
          }
          if (first.text === "store") {
            const _bind$5 = _M0FP39litmuslab6engine4core7literal(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 2).text);
            let value;
            if (_bind$5 === undefined) {
              return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "InvalidInteger", "Store requires an integer in -32768..32767", _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 2).column));
            } else {
              const _Some$2 = _bind$5;
              value = _Some$2;
            }
            _M0MPC15array5Array4pushGRPB4JsonE(t.instructions, new _M0DTP39litmuslab6engine4core11Instruction5Store(addr, value));
          } else {
            const reg = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(tokens, 1);
            if (!_M0FP39litmuslab6engine4core10identifier(reg.text)) {
              return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "InvalidName", "Register must be an ASCII identifier of at most 32 characters", reg.column));
            }
            const _bind$5 = _M0FP39litmuslab6engine4core9index__of(t.registers, reg.text);
            let ri;
            if (_bind$5 === undefined) {
              if (t.registers.length === 8) {
                return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core14parse__programN2atS910(line_number, "RegisterLimit", "At most 8 registers per thread", reg.column));
              }
              _M0MPC15array5Array4pushGRPB4JsonE(t.registers, reg.text);
              ri = t.registers.length - 1 | 0;
            } else {
              const _Some$2 = _bind$5;
              ri = _Some$2;
            }
            _M0MPC15array5Array4pushGRPB4JsonE(t.instructions, new _M0DTP39litmuslab6engine4core11Instruction4Load(ri, addr));
          }
        }
        _M0MPC15array5Array4pushGiE(t.lines, line_number.val);
      }
      continue;
    }
  }
  if (!seen_memory) {
    return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core7problem("ExpectedMemory", "Missing memory declaration", 1, 1));
  }
  const _bind$2 = current;
  if (_bind$2 === undefined) {
  } else {
    return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core7problem("MissingEnd", "Thread requires a closing end", line_number.val, 1));
  }
  if (threads.length === 0) {
    return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE3Err(_M0FP39litmuslab6engine4core7problem("MissingThread", "At least one thread is required", line_number.val, 1));
  }
  return new _M0DTPC16result6ResultGRP39litmuslab6engine4core7ProgramRP39litmuslab6engine4core10DiagnosticE2Ok(new _M0TP39litmuslab6engine4core7Program(addresses, initial, threads));
}
function _M0FP39litmuslab6engine4core13program__json(p) {
  const _tmp = { _0: "initialMemory", _1: _M0FP39litmuslab6engine4core13named__values(p.addresses, p.initial) };
  const _p = p.threads;
  const _p$2 = new Array(_p.length);
  const _p$3 = _p.length;
  let _tmp$2 = 0;
  while (true) {
    const _p$4 = _tmp$2;
    if (_p$4 < _p$3) {
      const _p$5 = _p[_p$4];
      const _p$6 = [];
      let _tmp$3 = 0;
      while (true) {
        const _p$7 = _tmp$3;
        if (_p$7 < _p$5.instructions.length) {
          const _p$8 = [{ _0: "line", _1: _M0FP39litmuslab6engine4core4jnum(_M0MPC15array5Array2atGiE(_p$5.lines, _p$7)) }];
          const _p$9 = _M0MPB3Map3MapGsRPB4JsonE(new _M0TPB9ArrayViewGUsRPB4JsonEE(_p$8, 0, 1), undefined);
          const _p$10 = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_p$5.instructions, _p$7);
          switch (_p$10.$tag) {
            case 0: {
              const _p$11 = _p$10;
              const _p$12 = _p$11._0;
              const _p$13 = _p$11._1;
              const _p$14 = "store";
              _M0MPB3Map3setGsRPB4JsonE(_p$9, "op", new _M0DTPB4Json6String(_p$14));
              const _p$15 = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.addresses, _p$12);
              _M0MPB3Map3setGsRPB4JsonE(_p$9, "address", new _M0DTPB4Json6String(_p$15));
              _M0MPB3Map3setGsRPB4JsonE(_p$9, "value", _M0FP39litmuslab6engine4core4jnum(_p$13));
              break;
            }
            case 1: {
              const _p$16 = _p$10;
              const _p$17 = _p$16._0;
              const _p$18 = _p$16._1;
              const _p$19 = "load";
              _M0MPB3Map3setGsRPB4JsonE(_p$9, "op", new _M0DTPB4Json6String(_p$19));
              const _p$20 = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.addresses, _p$18);
              _M0MPB3Map3setGsRPB4JsonE(_p$9, "address", new _M0DTPB4Json6String(_p$20));
              const _p$21 = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_p$5.registers, _p$17);
              _M0MPB3Map3setGsRPB4JsonE(_p$9, "register", new _M0DTPB4Json6String(_p$21));
              break;
            }
            default: {
              const _p$22 = "fence";
              _M0MPB3Map3setGsRPB4JsonE(_p$9, "op", new _M0DTPB4Json6String(_p$22));
            }
          }
          _M0MPC15array5Array4pushGRPB4JsonE(_p$6, new _M0DTPB4Json6Object(_p$9));
          _tmp$3 = _p$7 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      const _p$7 = _p$5.name;
      const _tmp$4 = { _0: "name", _1: new _M0DTPB4Json6String(_p$7) };
      const _p$8 = _p$5.registers;
      const _p$9 = new Array(_p$8.length);
      const _p$10 = _p$8.length;
      let _tmp$5 = 0;
      while (true) {
        const _p$11 = _tmp$5;
        if (_p$11 < _p$10) {
          const _p$12 = _p$8[_p$11];
          _p$9[_p$11] = new _M0DTPB4Json6String(_p$12);
          _tmp$5 = _p$11 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      const _p$11 = _p$9;
      _p$2[_p$4] = _M0FP39litmuslab6engine4core7jobject([_tmp$4, { _0: "registers", _1: new _M0DTPB4Json5Array(_p$11) }, { _0: "instructions", _1: new _M0DTPB4Json5Array(_p$6) }]);
      _tmp$2 = _p$4 + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  const _p$4 = _p$2;
  return _M0FP39litmuslab6engine4core7jobject([_tmp, { _0: "threads", _1: new _M0DTPB4Json5Array(_p$4) }]);
}
function _M0FP39litmuslab6engine4core7analyze(source, model, strategy, max_states, max_outcomes) {
  let _tmp;
  const _p = "SC";
  if (!(model === _p)) {
    const _p$2 = "TSO";
    _tmp = !(model === _p$2);
  } else {
    _tmp = false;
  }
  if (_tmp) {
    return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("InvalidModel", "Model must be SC or TSO", 0, 0));
  }
  let _tmp$2;
  const _p$2 = "bfs";
  if (!(strategy === _p$2)) {
    const _p$3 = "dfs";
    _tmp$2 = !(strategy === _p$3);
  } else {
    _tmp$2 = false;
  }
  if (_tmp$2) {
    return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("InvalidStrategy", "Strategy must be bfs or dfs", 0, 0));
  }
  if (max_states < 1 || (max_states > 100000 || (max_outcomes < 1 || max_outcomes > 1024))) {
    return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("InvalidBudget", "max_states must be 1..100000 and max_outcomes 1..1024", 0, 0));
  }
  const _bind = _M0FP39litmuslab6engine4core14parse__program(source);
  let p;
  if (_bind.$tag === 1) {
    const _Ok = _bind;
    p = _Ok._0;
  } else {
    const _Err = _bind;
    const _e = _Err._0;
    return _M0FP39litmuslab6engine4core16diagnostic__json(_e);
  }
  const tso = model === "TSO";
  const initial = _M0FP39litmuslab6engine4core14initial__state(p);
  const nodes = [new _M0TP39litmuslab6engine4core4Node(initial, -1, "")];
  const _bind$2 = [{ _0: _M0FP39litmuslab6engine4core10state__key(initial), _1: true }];
  const visited = _M0MPB3Map3MapGsbE(new _M0TPB9ArrayViewGUsbEE(_bind$2, 0, 1), undefined);
  const frontier = [0];
  let head = 0;
  const outcomes = [];
  const _bind$3 = [];
  const outcome_ids = _M0MPB3Map3MapGsbE(new _M0TPB9ArrayViewGUsbEE(_bind$3, 0, 0), undefined);
  let expanded = 0;
  let transitions = 0;
  let reason = undefined;
  while (true) {
    if (strategy === "bfs" ? head < frontier.length : !(frontier.length === 0)) {
      let index;
      if (strategy === "bfs") {
        const i = _M0MPC15array5Array2atGiE(frontier, head);
        head = head + 1 | 0;
        index = i;
      } else {
        const _bind$4 = _M0MPC15array5Array3popGiE(frontier);
        if (_bind$4 === undefined) {
          break;
        } else {
          const _Some = _bind$4;
          index = _Some;
        }
      }
      const s = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(nodes, index).state;
      expanded = expanded + 1 | 0;
      if (_M0FP39litmuslab6engine4core8terminal(p, s)) {
        const id = _M0FP39litmuslab6engine4core12outcome__key(s);
        if (!_M0MPB3Map8containsGsbE(outcome_ids, id)) {
          if (outcomes.length === max_outcomes) {
            reason = _M0FP39litmuslab6engine4core7analyzeN6constrS985;
            break;
          }
          _M0MPB3Map3setGsbE(outcome_ids, id, true);
          _M0MPC15array5Array4pushGRPB4JsonE(outcomes, _M0FP39litmuslab6engine4core13outcome__json(p, s, _M0FP39litmuslab6engine4core11witness__of(nodes, index)));
        }
      } else {
        const _bind$4 = _M0FP39litmuslab6engine4core7enabled(p, s, tso);
        const _bind$5 = _bind$4.length;
        let _tmp$3 = 0;
        while (true) {
          const _ = _tmp$3;
          if (_ < _bind$5) {
            const action = _bind$4[_];
            transitions = transitions + 1 | 0;
            const successor = _M0FP39litmuslab6engine4core10transition(p, s, tso, action);
            const key = _M0FP39litmuslab6engine4core10state__key(successor);
            if (!_M0MPB3Map8containsGsbE(visited, key)) {
              if (nodes.length === max_states) {
                reason = _M0FP39litmuslab6engine4core7analyzeN6constrS986;
                break;
              }
              _M0MPB3Map3setGsbE(visited, key, true);
              _M0MPC15array5Array4pushGRPB4JsonE(nodes, new _M0TP39litmuslab6engine4core4Node(successor, index, _M0FP39litmuslab6engine4core12action__text(action)));
              _M0MPC15array5Array4pushGiE(frontier, nodes.length - 1 | 0);
            }
            _tmp$3 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const _bind$6 = reason;
        if (_bind$6 === undefined) {
        } else {
          break;
        }
      }
      continue;
    } else {
      break;
    }
  }
  const _bind$4 = reason;
  const complete = _bind$4 === undefined;
  const _p$3 = complete ? "complete" : "incomplete";
  const _tmp$3 = { _0: "status", _1: new _M0DTPB4Json6String(_p$3) };
  const _tmp$4 = { _0: "exitCode", _1: _M0FP39litmuslab6engine4core4jnum(complete ? 0 : 3) };
  const _tmp$5 = { _0: "model", _1: new _M0DTPB4Json6String(model) };
  const _tmp$6 = { _0: "strategy", _1: new _M0DTPB4Json6String(strategy) };
  const _bind$5 = reason;
  let _tmp$7;
  if (_bind$5 === undefined) {
    _tmp$7 = _M0DTPB4Json4Null__;
  } else {
    const _Some = _bind$5;
    const _r = _Some;
    _tmp$7 = new _M0DTPB4Json6String(_r);
  }
  return _M0MPC14json4Json17stringify_2einner(_M0FP39litmuslab6engine4core7jobject([_tmp$3, _tmp$4, _tmp$5, _tmp$6, { _0: "reason", _1: _tmp$7 }, { _0: "program", _1: _M0FP39litmuslab6engine4core13program__json(p) }, { _0: "stats", _1: _M0FP39litmuslab6engine4core7jobject([{ _0: "visitedStates", _1: _M0FP39litmuslab6engine4core4jnum(nodes.length) }, { _0: "expandedStates", _1: _M0FP39litmuslab6engine4core4jnum(expanded) }, { _0: "transitions", _1: _M0FP39litmuslab6engine4core4jnum(transitions) }, { _0: "outcomes", _1: _M0FP39litmuslab6engine4core4jnum(outcomes.length) }]) }, { _0: "outcomes", _1: new _M0DTPB4Json5Array(outcomes) }]), false, 0, undefined);
}
function _M0FP39litmuslab6engine4core14snapshot__json(p, s, step, action, description) {
  const threads = [];
  let _tmp = 0;
  while (true) {
    const t = _tmp;
    if (t < p.threads.length) {
      const _p = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).name;
      const _tmp$2 = { _0: "name", _1: new _M0DTPB4Json6String(_p) };
      const _tmp$3 = { _0: "pc", _1: _M0FP39litmuslab6engine4core4jnum(_M0MPC15array5Array2atGiE(s.pcs, t)) };
      const _tmp$4 = { _0: "registers", _1: _M0FP39litmuslab6engine4core13named__values(_M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).registers, _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.registers, t)) };
      const _p$2 = _M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t);
      const _p$3 = new Array(_p$2.length);
      const _p$4 = _p$2.length;
      let _tmp$5 = 0;
      while (true) {
        const _p$5 = _tmp$5;
        if (_p$5 < _p$4) {
          const _p$6 = _p$2[_p$5];
          const _p$7 = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.addresses, _p$6.address);
          _p$3[_p$5] = _M0FP39litmuslab6engine4core7jobject([{ _0: "address", _1: new _M0DTPB4Json6String(_p$7) }, { _0: "value", _1: _M0FP39litmuslab6engine4core4jnum(_p$6.value) }]);
          _tmp$5 = _p$5 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      const _p$5 = _p$3;
      const _tmp$6 = { _0: "buffer", _1: new _M0DTPB4Json5Array(_p$5) };
      let _tmp$7;
      if (_M0MPC15array5Array2atGiE(s.pcs, t) < _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).instructions.length) {
        const _p$6 = _M0FP39litmuslab6engine4core17instruction__text(p, t, _M0MPC15array5Array2atGiE(s.pcs, t));
        _tmp$7 = new _M0DTPB4Json6String(_p$6);
      } else {
        _tmp$7 = _M0DTPB4Json4Null__;
      }
      _M0MPC15array5Array4pushGRPB4JsonE(threads, _M0FP39litmuslab6engine4core7jobject([_tmp$2, _tmp$3, _tmp$4, _tmp$6, { _0: "next", _1: _tmp$7 }]));
      _tmp = t + 1 | 0;
      continue;
    } else {
      break;
    }
  }
  const _tmp$2 = { _0: "step", _1: _M0FP39litmuslab6engine4core4jnum(step) };
  const _tmp$3 = { _0: "action", _1: action };
  const _tmp$4 = { _0: "description", _1: new _M0DTPB4Json6String(description) };
  const _tmp$5 = { _0: "memory", _1: _M0FP39litmuslab6engine4core13named__values(p.addresses, s.memory) };
  const _tmp$6 = { _0: "threads", _1: new _M0DTPB4Json5Array(threads) };
  const _p = _M0FP39litmuslab6engine4core8terminal(p, s);
  return _M0FP39litmuslab6engine4core7jobject([_tmp$2, _tmp$3, _tmp$4, _tmp$5, _tmp$6, { _0: "terminal", _1: _p ? _M0DTPB4Json4True__ : _M0DTPB4Json5False__ }]);
}
function _M0FP39litmuslab6engine4core6replay(source, model, witness) {
  let _tmp;
  const _p = "SC";
  if (!(model === _p)) {
    const _p$2 = "TSO";
    _tmp = !(model === _p$2);
  } else {
    _tmp = false;
  }
  if (_tmp) {
    return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("InvalidModel", "Model must be SC or TSO", 0, 0));
  }
  const _bind = _M0FP39litmuslab6engine4core14parse__program(source);
  let p;
  if (_bind.$tag === 1) {
    const _Ok = _bind;
    p = _Ok._0;
  } else {
    const _Err = _bind;
    const _e = _Err._0;
    return _M0FP39litmuslab6engine4core16diagnostic__json(_e);
  }
  let length = 0;
  const _bind$2 = witness.length;
  let _tmp$2 = 0;
  while (true) {
    const _string_index = _tmp$2;
    if (_string_index < _bind$2) {
      let _decoded_next_string_index;
      let _decoded_char;
      _L: {
        const _bind$3 = witness.charCodeAt(_string_index);
        if (_bind$3 >= 55296 && _bind$3 <= 56319 && (_string_index + 1 | 0) < _bind$2) {
          const _bind$4 = witness.charCodeAt(_string_index + 1 | 0);
          if (_bind$4 >= 56320 && _bind$4 <= 57343) {
            const _tmp$3 = _string_index + 2 | 0;
            const _p$2 = (((Math.imul(_bind$3 - 55296 | 0, 1024) | 0) + _bind$4 | 0) - 56320 | 0) + 65536 | 0;
            _decoded_next_string_index = _tmp$3;
            _decoded_char = _p$2;
            break _L;
          } else {
            const _tmp$3 = _string_index + 1 | 0;
            const _p$2 = _bind$3;
            _decoded_next_string_index = _tmp$3;
            _decoded_char = _p$2;
            break _L;
          }
        } else {
          const _tmp$3 = _string_index + 1 | 0;
          const _p$2 = _bind$3;
          _decoded_next_string_index = _tmp$3;
          _decoded_char = _p$2;
          break _L;
        }
      }
      length = length + 1 | 0;
      if (length > 1024) {
        return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("WitnessLimit", "Witness exceeds 1024 characters", 0, 0));
      }
      if (!(_decoded_char >= 48 && _decoded_char <= 51 || (_decoded_char === 116 || (_decoded_char === 102 || (_decoded_char === 32 || (_decoded_char === 9 || (_decoded_char === 13 || _decoded_char === 10))))))) {
        return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("WitnessSyntax", "Witness uses only t0..t3 / f0..f3 separated by whitespace", 0, length));
      }
      _tmp$2 = _decoded_next_string_index;
      continue;
    } else {
      break;
    }
  }
  let s = _M0FP39litmuslab6engine4core14initial__state(p);
  const trace = [_M0FP39litmuslab6engine4core14snapshot__json(p, s, 0, _M0DTPB4Json4Null__, "initial")];
  const canonical = [];
  const tso = model === "TSO";
  let step = 0;
  const _it = _M0MPC16string6String5split(witness, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core6replayN7_2abindS1039, 0, _M0FP39litmuslab6engine4core6replayN7_2abindS1039.length));
  while (true) {
    const _bind$3 = _M0MPB4Iter4nextGRPC16string10StringViewE(_it);
    if (_bind$3 === undefined) {
      break;
    } else {
      const _Some = _bind$3;
      const _line = _Some;
      const _bind$4 = _M0FP39litmuslab6engine4core8tokenize(_M0MPC16string10StringView9to__owned(_line));
      const _bind$5 = _bind$4.length;
      let _tmp$3 = 0;
      while (true) {
        const _ = _tmp$3;
        if (_ < _bind$5) {
          const token = _bind$4[_];
          step = step + 1 | 0;
          if (step > 128) {
            return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("WitnessLimit", "Witness exceeds 128 steps", 0, step));
          }
          const actions = _M0FP39litmuslab6engine4core7enabled(p, s, tso);
          let selected = undefined;
          const _bind$6 = actions.length;
          let _tmp$4 = 0;
          while (true) {
            const _$2 = _tmp$4;
            if (_$2 < _bind$6) {
              const a = actions[_$2];
              if (_M0FP39litmuslab6engine4core12action__text(a) === token.text) {
                selected = a;
              }
              _tmp$4 = _$2 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const _bind$7 = selected;
          let a;
          if (_bind$7 === undefined) {
            const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(25);
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "Action ");
            _M0MPB13StringBuilder13write__objectGiE(_string_builder, step);
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, " (");
            _M0MPB13StringBuilder13write__objectGsE(_string_builder, token.text);
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ") is not enabled");
            return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("IllegalAction", _string_builder.val, 0, step));
          } else {
            const _Some$2 = _bind$7;
            a = _Some$2;
          }
          const t = a.thread;
          let description;
          if (a.flush) {
            const w = _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(_M0MPC15array5Array2atGRPB5ArrayGRP39litmuslab6engine4core5WriteEE(s.buffers, t), 0);
            const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(9);
            _M0MPB13StringBuilder13write__objectGsE(_string_builder, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).name);
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ": flush ");
            _M0MPB13StringBuilder13write__objectGsE(_string_builder, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.addresses, w.address));
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "=");
            _M0MPB13StringBuilder13write__objectGiE(_string_builder, w.value);
            description = _string_builder.val;
          } else {
            const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(2);
            _M0MPB13StringBuilder13write__objectGsE(_string_builder, _M0MPC15array5Array2atGRP39litmuslab6engine4core4NodeE(p.threads, t).name);
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ": ");
            description = `${_string_builder.val}${_M0FP39litmuslab6engine4core17instruction__text(p, t, _M0MPC15array5Array2atGiE(s.pcs, t))}`;
          }
          s = _M0FP39litmuslab6engine4core10transition(p, s, tso, a);
          _M0MPC15array5Array4pushGRPB4JsonE(canonical, token.text);
          const _tmp$5 = s;
          const _tmp$6 = step;
          const _p$2 = token.text;
          _M0MPC15array5Array4pushGRPB4JsonE(trace, _M0FP39litmuslab6engine4core14snapshot__json(p, _tmp$5, _tmp$6, new _M0DTPB4Json6String(_p$2), description));
          _tmp$3 = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      continue;
    }
  }
  if (!_M0FP39litmuslab6engine4core8terminal(p, s)) {
    return _M0FP39litmuslab6engine4core16diagnostic__json(_M0FP39litmuslab6engine4core7problem("NonterminalWitness", "Witness ends before all instructions and pending stores finish", 0, step));
  }
  const _p$2 = "ok";
  return _M0MPC14json4Json17stringify_2einner(_M0FP39litmuslab6engine4core7jobject([{ _0: "status", _1: new _M0DTPB4Json6String(_p$2) }, { _0: "exitCode", _1: _M0FP39litmuslab6engine4core4jnum(0) }, { _0: "model", _1: new _M0DTPB4Json6String(model) }, { _0: "program", _1: _M0FP39litmuslab6engine4core13program__json(p) }, { _0: "trace", _1: new _M0DTPB4Json5Array(trace) }, { _0: "outcome", _1: _M0FP39litmuslab6engine4core13outcome__json(p, s, _M0MPC15array5Array4joinGsE(canonical, new _M0TPC16string10StringView(_M0FP39litmuslab6engine4core6replayN7_2abindS1040, 0, _M0FP39litmuslab6engine4core6replayN7_2abindS1040.length))) }]), false, 0, undefined);
}
export { _M0FP39litmuslab6engine4core7analyze as analyze, _M0FP39litmuslab6engine4core6replay as replay }
