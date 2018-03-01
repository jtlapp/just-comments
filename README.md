# just-comments

Lightweight JS/TS comment parser that points to the targeted code

## Overview

Use this tiny parser to extract comments from Javascript or Typescript source code without having to load a full-fledged Javascript or Typescript parser. The parser reports comment events via a listener interface, so that the client app can build structures or process data on the fly as needed.

The parser also reports the location of the code that each comment appears to be characterizing, as well as the locations of each possible change in code scope.

Includes support for comments nested within ES6 template literals.

## Installation

```
npm install just-comments
```

or

```
yarn add just-comments
```

## Usage


Example usage in Javascript, parsing a Javascript file ([see the JS demo]()):

```js
const JustComments = require('just-comments');
const path = require('path');
const fs = require('fs');

class MyListener {

    openScope(charCode, offset, lineNum, charNum) {
        // ignore
    }

    closeScope(charCode, offset, lineNum, charNum) {
        // ignore
    }

    beginComment(startOffset, lineNum, charNum) {
        this.startOffset = startOffset;
    }

    endComment(nextOffset, lineNum) {
        console.log("COMMENT:");
        console.log(sourceText.substring(this.startOffset, nextOffset));
    }

    endCommentBlock(targetLineOffset, targetLineNum) {
        console.log(`** last series of comments targets code line ${targetLineNum}\n`);
    }

    endOfComments() {
        console.log("ALL DONE");
    }

    fatalError(message, offset, lineNum, charNum) {
        console.log(`FATAL ERROR: ${message} at line ${lineNum}`);
    }
}

const sourcePath = path.join(process.cwd(), "some_source.js");
const sourceText = fs.readFileSync(sourcePath).toString();
const parser = new JustComments.CommentParser(sourceText, new MyListener());
parser.parse();
```

Example usage in Typescript, parsing a Typescript file ([see the TS demo]()):

```typescript
import { CommentParser, CommentListener } from 'just-comments';
import * as path from 'path';
import * as fs from 'fs';

class MyListener implements CommentListener {

    startOffset?: number;

    openScope(charCode: number, offset: number, lineNum: number, charNum: number) {
        // ignore
    }

    closeScope(charCode: number, offset: number, lineNum: number, charNum: number) {
        // ignore
    }

    beginComment(startOffset: number, lineNum: number, charNum: number) {
        this.startOffset = startOffset;
    }

    endComment(nextOffset: number, lineNum: number) {
        console.log("COMMENT:");
        console.log(sourceText.substring(this.startOffset!, nextOffset));
    }

    endCommentBlock(targetLineOffset: number, targetLineNum: number) {
        console.log(`** last series of comments targets code line ${targetLineNum}\n`);
    }

    endOfComments() {
        console.log("ALL DONE");
    }

    fatalError(message: string, offset: number, lineNum: number, charNum: number) {
        console.log(`FATAL ERROR: ${message} at line ${lineNum}`);
    }
}

const sourcePath = path.join(process.cwd(), "some_source.ts");
const sourceText = fs.readFileSync(sourcePath).toString();
const parser = new CommentParser(sourceText, new MyListener());
parser.parse();
```

## API

See the [API page]().

## Notes

* Multiple comments may each target the same source code line. `endCommentBlock()` reports the line that each comment of a preceding series targets. After `endCommentBlock()`  is called, the next series of comments is guaranteed to target a subsequent source line.
* Comments that occur on the same line as non-comment source code all target that line of source code.
* When preceding comments all target a line of source that itself contains comments, the preceding comments and the comments on that line together form a series that targets the line.
* A multi-line comment that begins on a line containing non-comment source code extends the series of comments that targets the line, so that comments occurring after the multi-line comment but on the same line as the end of the multi-line comment target the same line of code as the preceding multi-line comment.
* The parser reports characters that may begin or end code scopes to facilitate client apps that may subsequently parse non-comment source code. This helps keep clients from having to determine whether these characters occur within quotes, template literals, or regular expressions.