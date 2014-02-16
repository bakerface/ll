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

(function(exports) {
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
        else if (rung[row][column] == " ") {
            /* an empty rung used as a separation */
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

        return instructions;
    }

    function NotVisitor(parent) {
        var pending;

        this.visit = function(instruction) {
            if (instruction[0] == "not" && pending[0] == "in") {
                parent.visit([ "in", "/" + pending[1] ]);
                pending = null;
            }
            else if (instruction[0] == "out" && pending) {
                if (pending[0] == "not") {
                    parent.visit([ "out", "/" + instruction[1] ]);
                    pending = null;
                }
                else {
                    parent.visit(pending);
                    parent.visit(instruction);
                    pending = null;
                }
            }
            else {
                if (pending) {
                    parent.visit(pending);
                }

                pending = instruction;
            }
        };
    }

    function TreeVisitor(parent) {
        var stack = [];

        this.visit = function(instruction) {
            this[instruction[0]].apply(this, instruction.slice(1));
        };

        this.not = function() {
            stack.push([ "not", stack.pop() ]);
        };

        this.or = function() {
            var a = stack.pop();
            var b = stack.pop();

            stack.push([ "or", b, a ]);
        };

        this.and = function() {
            var a = stack.pop();
            var b = stack.pop();

            stack.push([ "and", b, a ]);
        };

        this.in = function(name) {
            stack.push([ "in", name ]);
        };

        this.out = function(name) {
            parent.visit([ "out", name, stack.pop() ]);
        };
    }

    function Canvas() {
        var row;
        var column;
        var lines;

        this.left = function() {
            if (column-- == 0) throw new Error();
        }

        this.right = function() {
            if (++column == lines[0].length) {
                for (var i = 0; i < lines.length; i++) {
                    lines[i] += lines[i].substr(-1);
                }
            }
        }

        this.up = function() {
            if (row-- == 0) throw new Error();
        }

        this.down = function() {
            if (++row == lines.length) {
                lines.push(new Array(lines[0].length + 1).join(" "));
            }
        }

        this.draw = function(text) {
            lines[row] = lines[row].substr(0, column) + text[0] +
                lines[row].substr(column + 1);

            for (var i = 1; i < text.length; i++) {
                this.right();

                lines[row] = lines[row].substr(0, column) + text[i] +
                    lines[row].substr(column + 1);
            }
        }

        this.getMarker = function() {
            return [row, column];
        };

        this.setMarker = function(marker) {
            row = marker[0];
            column = marker[1];
        };

        this.fill = function(c) {
            var text = new Array(lines[row].length - column + 1).join(c);
            lines[row] = lines[row].substr(0, column) + text;
            column = lines[row].length - 1;
        };

        this.bottom = function() {
            row = lines.length - 1;
        };

        this.end = function() {
            column = lines[row].length - 1;
        };

        this.replaceUp = function(marker, replacements) {
            while (row > marker[0]) {
                var start = this.getMarker();
                this.draw(replacements[lines[row][column]]);
                this.setMarker(start);
                this.up();
            }
        };

        this.crlf = function() {
            column = 0;
            this.down();
        };

        this.clear = function() {
            row = 0;
            column = 0;
            lines = [""];
        };

        this.getLines = function() {
            return lines.slice(-1).concat(lines.slice(0, lines.length - 1));
        };

        this.clear();
    }

    function Schematic(program) {
        var self = this;
        var canvas = new Canvas();

        this.visit = function(instruction) {
            this[instruction[0]].apply(this, instruction.slice(1));
        };

        function orRecursive(a, b) {
            if (a[0] == "or") {
                orRecursive(a[1], a[2]);
            }
            else {
                var topLeft = canvas.getMarker();
                canvas.draw("+");
                canvas.right();
                self.visit(a);
                canvas.setMarker(topLeft);
            }

            canvas.down();
            canvas.draw("| ");
            canvas.left();
            canvas.down();

            var bottomLeft = canvas.getMarker(); 
            canvas.draw("+");
            canvas.right();
            self.visit(b);
            canvas.fill("-");
            canvas.setMarker(bottomLeft);
        }

        this.or = function(a, b) {
            canvas.draw("--");
            canvas.right();

            var topLeft = canvas.getMarker();
            orRecursive(a, b);
            canvas.end();
            canvas.replaceUp(topLeft, { " ": "| ", "-": "+ " });
            canvas.draw("+--");
            canvas.right();
        };

        this.and = function(a, b) {
            this.visit(a);
            this.visit(b);
        };

        this.in = function(name) {
            canvas.draw("--[" + name + "]--");
            canvas.right();
        };

        this.out = function(name, value) {
            var marker = canvas.getMarker();
            canvas.fill("-");
            canvas.setMarker(marker);

            this.visit(value);
            canvas.draw("--(" + name + ")--");
            canvas.bottom();
            canvas.down();
            canvas.crlf();
        };

        this.toString = function() {
            canvas.clear();
            program.visit(new NotVisitor(new TreeVisitor(this)));
            return "||" + canvas.getLines().join("||\n||") + "||";
        };
    }

    function decompile(program) {
        program.visit = function(visitor) {
            for (var i = 0; i < program.length; i++) {
                visitor.visit(program[i]);
            }
        };

        return new Schematic(program).toString();
    }

    exports.compile = compile;
    exports.decompile = decompile;
})((typeof exports === "undefined") ? (this.ll = { }) : module.exports);

