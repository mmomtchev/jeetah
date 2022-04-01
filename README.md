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
* Front-end parsing by `acorn`
* `jeetah` compiling to `MIR` - *Medium Intermediate Representation*
* Back-end register allocation and machine code assembly by `MIR`

# Status

Not usable
Very early stage
Very small subset of the JS language functional

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

# Performance

The preliminary results are very encouraging:

**[The Great C++ Mathematical Expression Parser Benchmark (with 1 argument)](https://github.com/ArashPartow/math-parser-benchmark-project)**

*by Arash Partow (author of ExprTk)*

## Results

[1024 elements](https://mmomtchev.github.io/jeetah/bench/1024)

[16K elements](https://mmomtchev.github.io/jeetah/bench/16384)

[1M elements](https://mmomtchev.github.io/jeetah/bench/1048576)

## V8 inlining

V8 inlining can produce very surprising results. `jeetah` outperforms V8 on a single operation starting from about 100 elements.
However when V8 is allowed to inline its inner loops, this limit goes up to about `size>2000` elements.

Also check this very important piece of information: https://bugs.chromium.org/p/v8/issues/detail?id=12756

Ie, this `jeetah` call is faster starting from `size>100` elements
```
fn.map(array, 'x', r);
```
than this V8 code:
```
for (let j = 0; j < size; j++)
	r[j] = fn(array[j]);
```

However in this case `jeetah` will still require a function call through `node-addon-napi` at every iteration, raising the break-even limit to 2000 elements:
```
for (let i = 0; i < many; i++>)
	fn.map(array, 'x', r);
```
while in this case V8 will inline its loop:
```
for (let i = 0; i < many; i++>)
	for (let j = 0; j < size; j++)
		r[j] = fn(array[j]);
```

Even if this could be addressed by using an assembly function prologue, it will greatly degrade the code maintainability, and is of no use, since `jeetah` is oriented towards parallelization - which will never have any benefit on small arrays anyways.

## Constant expression optimization

`jeetah` lacks any constant expression optimization - `Math.cos(2.41)` is orders of magnitude slower and also the division by `0.5` which can be a multiplication by `2` is slower.

## Math functions

The `jeetah` performance gain is mostly because of the more efficient C++ call convention.

## Smaller margins on simple functions and 1M elements

This test is mostly a cache bandwidth competition and very hardware dependent.
