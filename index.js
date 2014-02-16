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

function preprocess(schematic) {
    var rungs = [];
    var rung = [];
    var lines = schematic.toString().trim().split("\n");

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.substr(0, 2) == "||" && line.substr(-2) == "||") {
            line = line.substr(2, line.length - 4);
            
            if (line[0] == "-") {
                if (rung.length > 0) {
                    rungs.push(rung);
                }

                rung = [line];
            }
            else {
                rung.push(line);
            }
        }
    };

    if (rung.length > 0) {
        rungs.push(rung);
    }

    return rungs;
}

function scanInNot(rung, instructions, row, column, count, not) {
    var end = rung[row].indexOf("]", column);
    var name = rung[row].substr(column, end - column);

    instructions.push([ "in", name ]);

    if (not) {
        instructions.push([ "not" ]);
    }

    scanAnd(rung, instructions, row, end + 1, count + 1);
}

function scanIn(rung, instructions, row, column, count) {
    if (rung[row][column] == "/") {
        scanInNot(rung, instructions, row, column + 1, count, true);
    }
    else {
        scanInNot(rung, instructions, row, column, count, false);
    }
}

function scanOutNot(rung, instructions, row, column, count, not) {
    var end = rung[row].indexOf(")", column);
    var name = rung[row].substr(column, end - column);

    if (not) {
        instructions.push([ "not" ]);
    }

    instructions.push([ "out", name ]);
    scan(rung, instructions, row, end + 1);
}

function scanOut(rung, instructions, row, column, count) {
    if (rung[row][column] == "/") {
        scanOutNot(rung, instructions, row, column + 1, count, true);
    }
    else {
        scanOutNot(rung, instructions, row, column, count, false);
    }
}

function scanSystem(rung, instructions, row, column, count) {
    var end = rung[row].indexOf("}", column);
    var name = rung[row].substr(column, end - column);

    instructions.push(name.split(" "));
    scanAnd(rung, instructions, row, end + 1, count + 1);
}

function scanOrBlock(rung, instructions, row, column, end, count) {
    if (rung[row][column] == "+") {
        var line = rung[row].substr(column + 1, end - column - 1);
        scan([line], instructions, 0, 0, 0);
        
        if (count > 0) {
            instructions.push([ "or" ]);
        }

        scanOrBlock(rung, instructions, row + 1, column, end, count + 1);
    }
    else if (rung[row][column] == "|") {
        scanOrBlock(rung, instructions, row + 1, column, end, count);
    }
}

function scanOr(rung, instructions, row, column, count) {
    var end = rung[row].indexOf("+", column + 1);
    scanOrBlock(rung, instructions, row, column, end, 0);
    scanAnd(rung, instructions, row, end + 1, count + 1);
}

function scanAnd(rung, instructions, row, column, count) {
    if (count > 1) {
        instructions.push([ "and" ]);
    }

    scan(rung, instructions, row, column, count);
}

function scan(rung, instructions, row, column, count) {
    while (rung[row][column] == "-") {
        column++;
    }

    if (column == rung[row].length) {
        /* end of rung */
    }
    else if (rung[row][column] == "[") {
        scanIn(rung, instructions, row, column + 1, count);
    }
    else if (rung[row][column] == "(") {
        scanOut(rung, instructions, row, column + 1, count);
    }
    else if (rung[row][column] == "{") {
        scanSystem(rung, instructions, row, column + 1, count);
    }
    else if (rung[row][column] == "+") {
        scanOr(rung, instructions, row, column, count);
    }
    else {
        throw new Error(rung[row].substr(column));
    }
}

function compile(schematic) {
    var instructions = [];
    var rungs = preprocess(schematic);

    for (var r = 0; r < rungs.length; r++) {
        scan(rungs[r], instructions, 0, 0, 0);
    }

    instructions.visit = function(visitor) {
        for (var i = 0; i < instructions.length; i++) {
            visitor.visit(instructions[i]);
        }
    };

    return instructions;
}

if (typeof exports === "undefined") {
    this["ll"] = compile;
}
else {
    module.exports = compile;
}

