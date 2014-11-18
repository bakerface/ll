# Ladder Logic Compiler

This node.js package provides methods for compiling and decompiling ladder logic programs.

## Table of Contents

- [Installation](#installation)
- [ll.compile](#llcompile)
- [ll.decompile](#lldecompile)

## Installation
To install this application using the node.js package manager, issue the following commands:

```
npm install ladder-logic
```

## *ll.compile*
Below is an example of how to use the compiler.

``` javascript
var ll = require("ladder-logic");

var program = ll.compile(
    "!! this is an example of a latch with an emergency stop !!\n" +
    "||--[/ESTOP]----[/STOP]----+--[START]--+------(RUN)-----||\n" +
    "||                         |           |                ||\n" +
    "||                         +---[RUN]---+                ||\n" +
    "||                                                      ||\n" +
    "||--[RUN]-------------------------------------(MOTOR)---||");

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
  [ 'out', 'MOTOR' ] ]
*/
```

## *ll.decompile*
Below is an example of how to use the decompiler.

``` javascript
var ll = require("ladder-logic");

var program = [
    [ 'in', 'ESTOP' ],
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
    [ 'out', 'MOTOR' ]
];

console.log(ll.decompile(program));

/*
||                                                 ||
||--[/ESTOP]----[/STOP]----+--[START]--+----(RUN)--||
||                         |           |           ||
||                         +--[RUN]----+           ||
||                                                 ||
||--[RUN]----(MOTOR)-------------------------------||
||                                                 ||
*/
```

