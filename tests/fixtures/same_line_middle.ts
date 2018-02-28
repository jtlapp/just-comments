
let s = "mid"+ /*midline 1*/ +"line 1";
let t = "mid"+ /*midline 1*//*midline 2*/ +"line 2";
let u = /*mid1*/ "mid"+ /*mid2*/ +"line" /*mid3*/;

// Applies to next line
`abc${/*mid*/123}def`;

`abc${/*mid*/123}def`; //end
