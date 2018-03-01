let multi = 1; /* Starts on same line,
but continues onto next line */

let multi2 = 2 /* Starts on first line.
Continues on 2nd. */ + 2;

let multi2 = 3 /* Starts on first line.
Continues on 2nd. */ + 3 /* and then
on to the third */ + 3; // end it here

// Target next multiline
let multi3 = 4 /* First line.
Second line. */ + 4;

// Target next, EOF at end of line
let multi4 = 5 /* First line.
Last line of file. */ + 5;