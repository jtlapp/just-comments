
let x = 1 /2/ 3; // not regex 1
let y = x /x/ 2; // not regex 2
let z = (x + x) /x/ y; // not regex 3

let a = [1, 2, 3, 4 /x/ 5]; // not regex 4
let v1 = a[0] /z/ (y + y); // not regex 5
let v2 = 1 /x/*middle*//2;

if (/abc/.test('123')) { /* regex A */ }
let b = [/q/, /r[/*]/]; // regex B

function f1(nu: number | undefined) {
    a[nu!/*not regex 6*/] = x;
}

if (false || /abc\/*def*/.test('foo')) { } // regex C
if (true && /abc\/*def*/.test('foo')) { } // regex D
let v3 = x > 2 ? /[//]/ : /[/*][*/]/; // regex E
let v4 = /[/*]abc[*/]/; // regex F
