const JustComments = require('../build/src');
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

const sourcePath = path.join(__dirname, '../build/src/index.js');
const sourceText = fs.readFileSync(sourcePath).toString();
const parser = new JustComments.CommentParser(sourceText, new MyListener());
parser.parse();
