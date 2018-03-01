import { CommentParser, CommentListener } from '../src';
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

const sourcePath = path.join(__dirname, '../src/index.ts');
const sourceText = fs.readFileSync(sourcePath).toString();
const parser = new CommentParser(sourceText, new MyListener());
parser.parse();
