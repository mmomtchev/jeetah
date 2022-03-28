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

Input
```js
compile(function lapseRate(temp, height) {
    const g = 9.81;
    const c = 1005;
    const Gamma = g / c;
    return temp - height * Gamma;
});
```

Output
```
m_lapseRate:	module
export	lapseRate
lapseRate:	func d, d:temp, d:height
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
		ret     _expr_1
	endfunc
endmodule
```

# Performance

Preliminary results show performance very close to `clang -O3` with an inline loop.
