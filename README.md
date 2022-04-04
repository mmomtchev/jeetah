# jeetah

`jeetah` is an experimental compiler for mathematical expressions in JavaScript with MP support

Depending on the outcome, it (might) replace (one day) partially (or fully) the current `ExprTk` backend in `ExprTk.js`

# Project Goals

`jeetah` aims to solve the following goals:
* True compiler, producing machine code from mathematical expressions
* Always faster than V8, for any expression, even in mono-threaded sync mode
* True JavaScript syntax replacing the `ExprTk` syntax, working from V8 representation
* Support a subset of the JavaScript language with a single variable type per function as the current `ExprTk` syntax
* Support only `TypedArray`s
* Support array traversal with fusing of the expression logic into the array logic and zero subroutine calls
* *(stretch goal)* Add SSE to MIR (probably as manual custom instructions) and support SSE operations

# Implementation
* Front-end parsing by [`acorn`](https://github.com/acornjs/acorn)
* `jeetah` compiling to `MIR` - *Medium Internal Representation*
* Back-end register allocation and machine code assembly by [`MIR`](https://github.com/vnmakarov/mir)

# Status

Not usable
Project is to be merged into `ExprTk.js` 3.0 if it is deemed viable

# Example

```
$ ts-node bin/js2m.ts \
'(temp, height) => {
	const g = 9.81;
	const c = 1005;
	const Gamma = g / c;
	return temp - height * Gamma;
}'

m__jeetah_fn_0:	module
export	_f__jeetah_fn_0
_f__jeetah_fn_0:	func d, d:temp, d:height
	local	d:g, d:c, d:Gamma, d:_expr_0, d:_expr_1, d:_expr_2
		dmov	g, 9.8100000000000005
		dmov	c, 1005.0000000000000000
		dmov	_expr_0, g
		ddiv	_expr_0, g, c
		dmov	Gamma, _expr_0
		dmov	_expr_1, temp
		dmov	_expr_2, height
		dmul	_expr_2, height, Gamma
		dsub	_expr_1, temp, _expr_2
		ret	_expr_1
	endfunc
endmodule
```

```
$ ts-node bin/js2m.ts '(x) => Math.pow(Math.sqrt(x), 2)'

m__jeetah_fn_0:	module
_p_sqrt:	proto d, d:arg0
import	sqrt
_p_pow:	proto d, d:arg0, d:arg1
import	pow
export	_f__jeetah_fn_0
_f__jeetah_fn_0:	func d, d:x
	local	d:_callret_0, d:_callret_1
		call	_p_sqrt, sqrt, _callret_0, x
		call	_p_pow, pow, _callret_1, _callret_0, 2.0000000000000000
		ret	_callret_1
	endfunc
endmodule
```

Produce code for executing a `map()` over an array

```
$ ts-node bin/js2m.ts '(x) => x >= 0 && x < 5 ? Math.sqrt(x + 2) : -x' map x

m__jeetah_fn_0:	module
_p_sqrt:	proto d, d:arg0
import	sqrt
export	_f__jeetah_fn_0
_f__jeetah_fn_0:	func d, p:_map_data, p:_result, i64:_map_data_length
	local	d:_constant_0, d:_constant_1, d:_constant_2
	local	d:_cond_0, d:_expr_1, i64:_expr_i64_2, d:_expr_2, d:_expr_3, i64:_expr_i64_4, d:_expr_4, d:_expr_5, d:_expr_6, d:_expr_7, d:_callret_0, d:_expr_8, d:_expr_9, d:_return_value, d:x, i64:_iter, i64:_iter_inc
		mov	_iter, 0
_func_start:
		dmov	x, d:(_map_data, _iter, 8)
		dmov	_constant_2, 2.0000000000000000
		dmov	_constant_1, 5.0000000000000000
		dmov	_constant_0, 0.0000000000000000
		dmov	_expr_3, x
		dge	_expr_i64_2, _expr_3, _constant_0
		i2d	_expr_2, _expr_i64_2
		dmov	_expr_1, _expr_2
		dbeq	_expr_1_end, _expr_1, _constant_0
		dmov	_expr_5, x
		dlt	_expr_i64_4, _expr_5, _constant_1
		i2d	_expr_4, _expr_i64_4
		dmov	_expr_1, _expr_4
_expr_1_end:
		dbeq	_cond_0_else, _expr_1, _constant_0
		dmov	_expr_7, x
		dadd	_expr_6, _expr_7, _constant_2
		call	_p_sqrt, sqrt, _callret_0, _expr_6
		dmov	_cond_0, _callret_0
		jmp	_cond_0_end
_cond_0_else:
		dmov	_expr_9, x
		dneg	_expr_8, _expr_9
		dmov	_cond_0, _expr_8
_cond_0_end:
		dmov	_return_value, _cond_0
_func_end:
		dmov	d:(_result, _iter, 8), _return_value
		add	_iter, _iter, 1
		ublt	_func_start, _iter, _map_data_length
		ret	_return_value
	endfunc
endmodule
```

# Performance

The preliminary results are very encouraging:

**[The Great C++ Mathematical Expression Parser Benchmark (with 1 argument)](https://github.com/ArashPartow/math-parser-benchmark-project)**

*by Arash Partow (author of ExprTk)*

## Results

* [16 elements](https://mmomtchev.github.io/jeetah/bench/16)
With 16 elements V8 is almost always faster unless the expression contains lots of builtins, in this case V8 code inlining is the determining factor

* [1024 elements](https://mmomtchev.github.io/jeetah/bench/1024)
With 1024 elements, `jeetah` sometimes outperforms V8, inlining is much less important

* [16K elements](https://mmomtchev.github.io/jeetah/bench/16384)
With 16K or more elements, `jeetah` always outperforms V8 except in tests involving constant expressions

* [1M elements](https://mmomtchev.github.io/jeetah/bench/1048576)

## V8 inlining

V8 inlining can produce very surprising results. `jeetah` outperforms V8 on a single operation starting from about 100 elements.
However when V8 is allowed to inline its inner loops, this limit goes up to about `size>2000` elements.

Also check this very important piece of information: https://bugs.chromium.org/p/v8/issues/detail?id=12756

Ie, this `jeetah` call is faster starting from `size>100` elements
```js
fn.map(array, 'x', r);
```
than this V8 code:
```js
for (let j = 0; j < size; j++)
	r[j] = fn(array[j]);
```

However in this case `jeetah` will still require a function call through `node-addon-napi` at every iteration, raising the break-even limit to 2000 elements:
```js
for (let i = 0; i < many; i++>)
	fn.map(array, 'x', r);
```
while in this case V8 will inline its loop:
```js
for (let i = 0; i < many; i++>)
	for (let j = 0; j < size; j++)
		r[j] = fn(array[j]);
```

Even if this could be addressed by using an assembly function prologue, it will greatly degrade the code maintainability, and is of no use, since `jeetah` is oriented towards parallelization - which will never have any benefit on small arrays anyways.

## Constant propagation

`jeetah` lacks any constant propagation - `Math.cos(2.41)` is orders of magnitude slower and also the division by `0.5` which can be a multiplication by `2` is slower.

## Math functions

The `jeetah` performance gain is mostly because of the more efficient C++ call convention.

## Smaller margins on simple functions and 1M elements

This test is mostly a cache bandwidth competition and very hardware dependent.
