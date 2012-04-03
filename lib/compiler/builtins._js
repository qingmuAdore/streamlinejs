/**
 * Copyright (c) 2012 Bruno Jouhier <bruno.jouhier@sage.com>
 * MIT License
 */
/// !doc
/// 
/// # streamline built-ins
///  
(function(exports) {
	"use strict";

	var future = function(fn, args, i) {
			var err, result, done, q = [],
				self = this;
			args = Array.prototype.slice.call(args);
			args[i] = function(e, r) {
				err = e, result = r, done = true;
				q && q.forEach(function(f) {
					f.call(self, e, r);
				});
				q = null;
			};
			fn.apply(this, args);
			return function F(cb) {
				if (!cb) return F;
				if (done) cb.call(self, err, result);
				else q.push(cb);
			}
		};

	// Do not use this one directly, require it through the flows module.
	exports.funnel = function(max) {
		max = max == null ? -1 : max;
		if (max === 0) max = funnel.defaultSize;
		if (typeof max !== "number") throw new Error("bad max number: " + max);
		var queue = [],
			active = 0,
			closed = false;

		var fun = function(callback, fn) {
				if (callback == null) return future(fun, arguments, 0);
				//console.log("FUNNEL: active=" + active + ", queued=" + queue.length);
				if (max < 0 || max == Infinity) return fn(callback);

				queue.push({
					fn: fn,
					cb: callback
				});

				function _doOne() {
					var current = queue.splice(0, 1)[0];
					if (!current.cb) return current.fn();
					active++;
					current.fn(function(err, result) {
						active--;
						if (!closed) {
							current.cb(err, result);
							while (active < max && queue.length > 0) _doOne();
						}
					});
				}

				while (active < max && queue.length > 0) _doOne();
			};
		fun.close = function() {
			queue = [], closed = true;
		}
		return fun;
	}
	var funnel = exports.funnel;
	funnel.defaultSize = 4;

	function _parallel(options) {
		if (typeof options === "number") return options;
		if (typeof options.parallel === "number") return options.parallel;
		return options.parallel ? -1 : 1;
	}
	/// ## Asychronous versions of ES5 Array functions.  
	/// 
	/// Common Rules: 
	/// 
	/// These variants are postfixed by an underscore.  
	/// They take the `_` callback as first parameter.  
	/// They pass the `_` callback as first arguement to their `fn` callback.  
	/// They have an optional `options` second parameter which controls the level of 
	/// parallelism. This `options` parameter may be specified as `{ parallel: par }` 
	/// where par is an integer, or directly as a `par` integer value.  
	/// The `par` values are interpreted as follows:
	/// 
	/// * If absent or equal to 1, execution is sequential.
	/// * If > 1, at most `par` operations are parallelized.
	/// * if 0, a default number of operations are parallelized. 
	///   This default can be read and set with funnel.defaultSize (4 by default)
	/// * If < 0 or Infinity, operations are fully parallelized (no limit).
	/// 
	/// API:
	/// 
	/// * `array.forEach_(_[, options], fn[, thisObj])`  
	///   `fn` is called as `fn(_, elt, i)`.
	Array.prototype.forEach_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var len = this.length;
		if (par === 1 || len <= 1) {
			for (var i = 0; i < len; i++)
			fn.call(thisObj, _, this[i], i);
		} else {
			this.map_(_, par, fn, thisObj);
		}
		return this;
	}
	/// * `result = array.map_(_[, options], fn[, thisObj])`  
	///   `fn` is called as `fn(_, elt, i)`.
	Array.prototype.map_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var len = this.length;
		var result;
		if (par === 1 || len <= 1) {
			result = [];
			for (var i = 0; i < len; i++)
			result[i] = fn.call(thisObj, _, this[i], i);
		} else {
			var fun = funnel(par);
			result = this.map(function(elt, i) {
				return fun(null, function(_) {
					return fn.call(thisObj, _, elt, i);
				});
			});
			for (var i = 0; i < len; i++) result[i] = result[i](_);
		}
		return result;
	}
	/// * `result = array.filter_(_[, options], fn[, thisObj])`  
	///   `fn` is called as `fn(_, elt)`.
	Array.prototype.filter_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var result = [];
		var len = this.length;
		if (par === 1 || len <= 1) {
			for (var i = 0; i < len; i++) {
				var elt = this[i];
				if (fn.call(thisObj, _, elt)) result.push(elt)
			}
		} else {
			this.map_(_, par, function(_, elt) {
				if (fn.call(thisObj, _, elt)) result.push(elt)
			}, thisObj);
		}
		return result;
	}
	/// * `bool = array.every_(_[, options], fn[, thisObj])`  
	///   `fn` is called as `fn(_, elt)`.
	Array.prototype.every_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var len = this.length;
		if (par === 1 || len <= 1) {
			for (var i = 0; i < len; i++) {
				if (!fn.call(thisObj, _, this[i])) return false;
			}
		} else {
			var fun = funnel(par);
			var futures = this.map(function(elt) {
				return fun(null, function(_) {
					return fn.call(thisObj, _, elt);
				});
			});
			for (var i = 0; i < len; i++) {
				if (!futures[i](_)) {
					fun.close();
					return false;
				}
			}
		}
		return true;
	}
	/// * `bool = array.some_(_[, options], fn[, thisObj])`  
	///   `fn` is called as `fn(_, elt)`.
	Array.prototype.some_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var len = this.length;
		if (par === 1 || len <= 1) {
			for (var i = 0; i < len; i++) {
				if (fn.call(thisObj, _, this[i])) return true;
			}
		} else {
			var fun = funnel(par);
			var futures = this.map(function(elt) {
				return fun(null, function(_) {
					return fn.call(thisObj, _, elt);
				});
			});
			for (var i = 0; i < len; i++) {
				if (futures[i](_)) {
					fun.close();
					return true;
				}
			}
		}
		return false;
	}
	/// * `result = array.reduce_(_, array, fn, val)`  
	///   `fn` is called as `val = fn(_, val, elt, i, array)`.
	Array.prototype.reduce_ = function(_, fn, v, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var len = this.length;
		for (var i = 0; i < len; i++) {
			v = fn.call(thisObj, _, v, this[i], i, this);
		}
		return v;
	}
	/// * `result = flows.reduceRight(_, array, fn, val, [thisObj])`  
	///   reduces from end to start by applying `fn` to each element.  
	///   `fn` is called as `val = fn(_, val, elt, i, array)`.
	Array.prototype.reduceRight_ = function(_, fn, v, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var len = this.length;
		for (var i = len - 1; i >= 0; i--) {
			v = fn.call(thisObj, _, v, this[i], i, this);
		}
		return v;
	}

	/// * `array = flows.sort(_, array, compare, [beg], [end])`  
	///   `compare` is called as `cmp = compare(_, elt1, elt2)`
	///   Note: this function _changes_ the original array (and returns it)
	Array.prototype.sort_ = function(_, compare, beg, end) {
		var array = this;
		beg = beg || 0;
		end = end == null ? array.length - 1 : end;

		function _qsort(_, beg, end) {
			if (beg >= end) return;

			if (end == beg + 1) {
				if (compare(_, array[beg], array[end]) > 0) {
					var tmp = array[beg];
					array[beg] = array[end];
					array[end] = tmp;
				}
				return;
			}

			var mid = Math.floor((beg + end) / 2);
			var o = array[mid];
			var nbeg = beg;
			var nend = end;

			while (nbeg <= nend) {
				while (nbeg < end && compare(_, array[nbeg], o) < 0) nbeg++;
				while (beg < nend && compare(_, o, array[nend]) < 0) nend--;

				if (nbeg <= nend) {
					var tmp = array[nbeg];
					array[nbeg] = array[nend];
					array[nend] = tmp;
					nbeg++;
					nend--;
				}
			}

			if (nbeg < end) _qsort(_, nbeg, end);
			if (beg < nend) _qsort(_, beg, nend);
		}
		_qsort(_, beg, end);
		return array;
	}

	/// * `result = fn.apply_(_, thisObj, args, [index])`  
	///   Helper to apply `Function.apply` to streamline functions.  
	///   Equivalent to `result = fn.apply(thisObj, argsWith_)` where `argsWith_` is 
	///   a modified argument list in which the callback has been inserted at `index` 
	///   (at the end of the argument list if `index` is not specified).
	Function.prototype.apply_ = function(callback, thisObj, args, index) {
		Array.prototype.splice.call(args, index != null ? index : args.length, 0, callback);
		return this.apply(thisObj, args);
	}
})(typeof exports !== 'undefined' ? exports : (window.StreamlineBuiltins = window.StreamlineBuiltins || {}));