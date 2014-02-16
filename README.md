# Ladder Logic Compiler

This node.js package provides methods for compiling and executing ladder logic programs.

## Table of Contents

- [Installation](#installation)
- [Compiler](#compiler)
- [Visitor](#visitor)

## Installation
To install this application using the node.js package manager, issue the following commands:

```
npm install git+https://github.com/bakerface/ll.git
```

## Compiler
Below is an example of how to use the compiler.

``` javascript
var compile = require("ll");

var program = compile([
    "!! this is an example of a latch with an emergency stop !!",
    "||--[/ESTOP]----[/STOP]----+--[START]--+------(RUN)-----||",
    "||                         |           |                ||",
    "||                         +---[RUN]---+                ||",
    "||                                                      ||",
    "||--[RUN]-------------------------------------(MOTOR)---||" ].join("\n"));

console.log(program);

/*
[ [ 'in', 'ESTOP' ],
  [ 'not' ],
  [ 'in', 'STOP' ],
  [ 'not' ],
  [ 'and' ],
  [ 'in', 'START' ],
  [ 'in', 'RUN' ],
  [ 'or' ],
  [ 'and' ],
  [ 'out', 'RUN' ],
  [ 'in', 'RUN' ],
  [ 'out', 'MOTOR' ],
  visit: [Function] ]
*/
```

## Visitor
Below is an example of how to use a visitor to execute the compiled program.

``` javascript
var compile = require("ll");

function Visitor(relays) {
    var stack = [];

    this["visit"] = function(instruction) {
        this[instruction[0]].apply(this, instruction.slice(1));
    };

    this["in"] = function(name) {
        stack.push(relays[name]);
    };

    this["out"] = function(name) {
        relays[name] = stack.pop();
    };

    this["not"] = function() {
        stack.push(!stack.pop());
    };

    this["or"] = function(name) {
        stack.push(stack.pop() | stack.pop());
    };

    this["and"] = function(name) {
        stack.push(stack.pop() & stack.pop());
    };
}

var program = compile([
    "!! this is an example of a latch with an emergency stop !!",
    "||--[/ESTOP]----[/STOP]----+--[START]--+------(RUN)-----||",
    "||                         |           |                ||",
    "||                         +---[RUN]---+                ||",
    "||                                                      ||",
    "||--[RUN]-------------------------------------(MOTOR)---||" ].join("\n"));



var relays = {
    ESTOP: 0,
    STOP:  0,
    START: 1,
    RUN:   0,
    MOTOR: 0
};

program.visit(new Visitor(relays));
console.log(relays); // { ESTOP: 0, STOP: 0, START: 1, RUN: 1, MOTOR: 1 }
```
