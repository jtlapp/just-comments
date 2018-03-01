
/some regular expression/; // some comment

/[//]/; // comment
/[/*]/; // comment
/[/*]/.test('abc') || /[*/]/.test('def');

/\/*/.test('xyz') || /\*/.test('pdq');

/\//.test('no comment');

/"/.test(''); // end with "
/'/.test(""); // end with '

'hello'.match(/\[foo\\baz/); // ends with ]
'hello'.match(/\\foo\(baz/); // ends with )
'hello'.match(/good/imu); // 1
'hello'.match(/good/g); // 2
'hello'.match(/\[also\/good/); // 3
'hello'.match(/\[also\/good/); // 4
'hello'.match(/[abc\]def]xyz/); // 5
'hello'.match(/[abc\]def]xyz/); // 6
'hello'.match(/abc[^def]/); // 7
'hello'.match(/abc[^def]/); // 8

// EOF at end of regex:
const re = /\/*not a comment*/