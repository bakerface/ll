/*
 * Copyright (c) 2014 Christopher M. Baker
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 */

var ll = require("./index.js");

function assert(evaluated, expected) {
    expected = JSON.stringify(expected, null, " ");
    evaluated = JSON.stringify(evaluated, null, " ");

    if (expected != evaluated) {
        throw new Error("Assertion failed:\n" +
            "Expected:  " + expected + "\n" +
            "Evaluated: " + evaluated);
    }
}

function compiler(schematic, expected) {
    var evaluated = ll(schematic.join("\n"));
    return assert(evaluated, expected);
}

function visitor(program, machine, expected) {
    program.visit(machine);
    return assert(machine, expected);
}

compiler([
    "!! this is an example of calling a system function      !!",
    "||--{socket tcp FD}--------------------------(CLIENT)---||" ], [

    ["socket", "tcp", "FD"],
    ["out", "CLIENT"]
]);

compiler([
    "!! this is an example of a latch with an emergency stop !!",
    "||--[/ESTOP]----[/STOP]----+--[START]--+------(RUN)-----||",
    "||                         |           |                ||",
    "||                         +---[RUN]---+                ||",
    "||                                                      ||",
    "||--[RUN]-------------------------------------(MOTOR)---||" ], [

    ["in", "ESTOP"],
    ["not"],
    ["in", "STOP"],
    ["not"],
    ["and"],
    ["in", "START"],
    ["in", "RUN"],
    ["or"],
    ["and"],
    ["out", "RUN"],
    ["in", "RUN"],
    ["out", "MOTOR"]
]);

function Inputs(estop, stop, start, run) {
    return {
        stack: [],
        ESTOP: estop,
        STOP:  stop,
        START: start,
        RUN:   run,
        "visit": function(instruction) {
            this[instruction[0]].apply(this, instruction.slice(1));
        },
        "in": function(name) {
            this.stack.push(this[name])
        },
        "out": function(name) {
            this[name] = this.stack.pop()
        },
        "not": function() {
            this.stack.push(!this.stack.pop());
        },
        "or": function(name) {
            this.stack.push(this.stack.pop() | this.stack.pop());
        },
        "and": function(name) {
            this.stack.push(this.stack.pop() & this.stack.pop());
        }
    };
}

function Outputs(estop, stop, start, run, motor) {
    return {
        stack: [],
        ESTOP: estop,
        STOP:  stop,
        START: start,
        RUN:   run,
        MOTOR: motor
    };
}

var program = ll([
    "!! this is an example of a latch with an emergency stop !!",
    "||--[/ESTOP]----[/STOP]----+--[START]--+------(RUN)-----||",
    "||                         |           |                ||",
    "||                         +---[RUN]---+                ||",
    "||                                                      ||",
    "||--[RUN]-------------------------------------(MOTOR)---||" ].join("\n"));



visitor(program, Inputs(0, 0, 0, 0), Outputs(0, 0, 0, 0, 0));
visitor(program, Inputs(0, 0, 1, 0), Outputs(0, 0, 1, 1, 1));
visitor(program, Inputs(1, 0, 0, 1), Outputs(1, 0, 0, 0, 0));
visitor(program, Inputs(1, 0, 1, 1), Outputs(1, 0, 1, 0, 0));
