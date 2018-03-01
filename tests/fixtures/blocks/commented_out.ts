// "hello"
// 'there'
/*Shouldn't register "quotes" of any kind.*/
//Not even backquotes `.

"target";

/* "end of the comment 1:*/
"";

/* 'end of the comment 2:*/
'';

/* `end of the comment 3:*/
``;

// Also not /regex/
/* /comment ends here:*/
not here/;

// Backslash-LF doesn't continue single-line comments \
"not in the comment";

/* Backslash-* doesn't prevent ending comment \*/
"not in the comment*/";

// ( doesn't extend comment
/* ( doesn't extend comment */
// { doesn't extend comment
/* { doesn't extend comment */
// [ doesn't extend comment
/* [ doesn't extend comment */

"xyz";

// Can comment out a /* comment */ and continue
/* Can comment out a // comment
and continue */

"pdq";