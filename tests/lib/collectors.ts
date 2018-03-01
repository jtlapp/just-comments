
import { CommentParser, CommentListener } from '../../src/';

export interface CommentBlock {
    targetLineOffset: number;
    targetLineNum: number;
    comments: Comment[];
}

export interface Comment {
    startOffset: number;
    startLine: number;
    startChar: number;
    endLine: number;
    text: string;
}

export interface ScopeChar {
    opening: boolean;
    char: string;
    offset: number;
    lineNum: number;
    charNum: number;
}

export interface FatalError {
    message: string;
    offset: number;
    lineNum: number;
    charNum: number;
}

export type Event = Comment | ScopeChar | FatalError;

export class BlockCollector implements CommentListener {

    logging = false;
    sourceText: string;
    blocks = <CommentBlock[]>[];
    startOffset?: number;
    startLineNum?: number;
    startCharNum?: number;
    commentSeries = <Comment[]>[];
    errorMessage?: string;

    constructor(sourceText: string, logging = false) {
        this.sourceText = sourceText;
        this.logging = logging;
    }

    getBlocksOrError(): CommentBlock[] | string {
        const parser = new CommentParser(this.sourceText, this);
        parser.parse();
        if (this.errorMessage) {
            return this.errorMessage;
        }
        return this.blocks;
    }

    openScope(charCode: number, offset: number, lineNum: number, charNum: number) {
        // ignore
    }

    closeScope(charCode: number, offset: number, lineNum: number, charNum: number) {
        // ignore
    }

    beginComment(startOffset: number, lineNum: number, charNum: number) {
        if (this.logging) {
            console.log(`beginComment(${startOffset}, ${lineNum}, ${charNum})`);
        }
        this.startOffset = startOffset;
        this.startLineNum = lineNum;
        this.startCharNum = charNum;
    }

    endComment(nextOffset: number, lineNum: number) {
        if (this.logging) {
            console.log(`endComment(${nextOffset}, ${lineNum})`);
        }
        if (this.startOffset === undefined || this.startLineNum === undefined ||
                this.startCharNum === undefined)
        {
            throw new Error(`Missing beginComment() for comment ending at `+
                    `offset ${nextOffset} (line ${lineNum})`);
        }

        this.commentSeries.push({
            startOffset: this.startOffset,
            startLine: this.startLineNum,
            startChar: this.startCharNum,
            endLine: lineNum,
            text: this.sourceText.substring(this.startOffset, nextOffset)
        });

        this.startOffset = undefined; // make sure the new starts get set
        this.startLineNum = undefined;
        this.startCharNum = undefined;
    }

    endCommentBlock(targetLineOffset: number, targetLineNum: number) {
        if (this.logging) {
            console.log(`endCommentBlock(${targetLineOffset}, ${targetLineNum})`);
        }
        this.blocks.push({
            targetLineOffset,
            targetLineNum,
            comments: this.commentSeries
        });
        this.commentSeries = [];
    }

    endOfComments() {
        if (this.logging) {
            console.log(`endOfComments()`);
        }
        if (this.commentSeries.length > 0) {
            throw new Error(`endOfComments() before endCommentBlock()`);
        }
    }

    fatalError(message: string, offset: number, lineNum: number, charNum: number) {
        if (this.logging) {
            console.log(`fatalError("${message}", ${offset}, ${lineNum}, ${charNum})`);
        }
        this.errorMessage = `${message} at offset ${offset} (${lineNum}:${charNum})`;
    }
}

export class EventCollector implements CommentListener {

    sourceText: string;
    events = <Event[]>[];
    startOffset?: number;
    startLineNum?: number;
    startCharNum?: number;

    constructor(sourceText: string) {
        this.sourceText = sourceText;
    }

    getEvents(): Event[] {
        const parser = new CommentParser(this.sourceText, this);
        parser.parse();
        return this.events;
    }

    openScope(charCode: number, offset: number, lineNum: number, charNum: number) {
        this.events.push({
            opening: true,
            char: String.fromCharCode(charCode),
            offset,
            lineNum,
            charNum
        });
    }

    closeScope(charCode: number, offset: number, lineNum: number, charNum: number) {
        this.events.push({
            opening: false,
            char: String.fromCharCode(charCode),
            offset,
            lineNum,
            charNum
        });
    }

    beginComment(startOffset: number, lineNum: number, charNum: number) {
        this.startOffset = startOffset;
        this.startLineNum = lineNum;
        this.startCharNum = charNum;
    }

    endComment(nextOffset: number, lineNum: number) {
        if (this.startOffset === undefined || this.startLineNum === undefined ||
                this.startCharNum === undefined)
        {
            throw new Error(`Missing beginComment() for comment ending at `+
                    `offset ${nextOffset} (line ${lineNum})`);
        }

        this.events.push({
            startOffset: this.startOffset,
            startLine: this.startLineNum,
            startChar: this.startCharNum,
            endLine: lineNum,
            text: this.sourceText.substring(this.startOffset, nextOffset)
        });

        this.startOffset = undefined; // make sure the new starts get set
        this.startLineNum = undefined;
        this.startCharNum = undefined;
    }

    endCommentBlock(targetLineOffset: number, targetLineNum: number) {
        // ignore
    }

    endOfComments() {
        // ignore
    }

    fatalError(message: string, offset: number, lineNum: number, charNum: number) {
        this.events.push({
            message,
            offset,
            lineNum,
            charNum
        });
    }
}
