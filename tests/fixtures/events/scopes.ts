
// Non-functioning, non-compiling excerpt of code for test purposes.

import { CommentParser, CommentListener } from '../../src/';

export interface DummyComment {
    /* in interface */
    startOffset: number;
    text: string;
}

/**
 * Before DummyCollector
 */

export class DummyCollector implements CommentListener {

    // before properties

    logging: boolean;
    sourceText: string;
    blocks = <CommentBlock[]>[];
    commentSeries = <DummyComment[]>[];
    startOffset?: number;

    /** before constructor */

    constructor(sourceText: string, logging = false /*in params*/) {
        this.sourceText = sourceText;
        this.logging = logging;
    }

    /** before getBlocksOrError() */

    getBlocksOrError(): CommentBlock[] | string {
        const parser = new CommentParser(this.sourceText, this);
        parser.parse();
        return this.blocks;
    }

    /** before beginComment() */

    beginComment(startOffset: number, lineNum: number, charNum: number) {
        if (this.logging) {
            console.log(`beginComment(${startOffset}, ${lineNum}, ${charNum})`);
        }
        this.startOffset = startOffset;
    }

    /** before endComment() */

    endComment(nextOffset: number, lineNum: number) {
        // at start of method
        if (this.logging) {
            console.log(`endComment(${(nextOffset /*nested*/)}, ${{lineNum: 1}.lineNum})`);
        }
        if (this.startOffset === undefined)
        {
            throw new Error(`Missing beginComment() for comment ending at `+
                    `offset ${nextOffset} (line ${lineNum})`);
        }

        this.commentSeries.push({
            /* in nested object */
            startOffset: this.startOffset,
            text: this.sourceText.substring(this.startOffset, nextOffset)
        });

        this.startOffset = undefined; // make sure the new starts get set
    }
}

// after code
