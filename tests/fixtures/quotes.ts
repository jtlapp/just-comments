// First of two comments

"Can include other ' ` quotes";

'Can include other " ` quotes';

`Can include other ' " quotes`;

"D-quote can escape \" \' \` quotes";

'S-quote can escape \' \" \` quotes';

`Backtick can escape \' \" \` quotes`;

"D-quote can escape EOL \
second line.";

'S-quote can escape EOL \
second line.';

`Backtick can escape EOL \
second line.`;

"D-quotes escape \n lines, \t tabs, and backslash \\.";

'D-quotes escape \n lines, \t tabs, and backslash \\.';

`D-quotes escape \n lines, \t tabs, and backslash \\.`;

"D-quotes hide regex /abc/*too*/";

'D-quotes hide regex /abc/*too*/';

`D-quotes hide regex /abc/*too*/`;

"D-quotes hide // comments";

"D-quotes hide /* comments";

'S-quotes hide // comments';

'S-quotes hide /* comments';

`Backtick quotes hide // comments`;

`Backtick qutoes hide /* comments`;

// Last of two comments