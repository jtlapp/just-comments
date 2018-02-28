
const REGEX_REGEX = /^\/((?:[^[\/\\]+|\[\^?(?:[^\]\\]|\\.)*\]|\\.)+)\/([a-zA-Z]+)?/;

const AMPERSAND = '&'.charCodeAt(0);
const ASTERISK = '*'.charCodeAt(0);
const BACKSLASH = '\\'.charCodeAt(0);
const BACKTICK = '`'.charCodeAt(0);
const BANG = '!'.charCodeAt(0);
const COLON = ':'.charCodeAt(0);
const COMMA = ','.charCodeAt(0);
const CR = "\r".charCodeAt(0);
const DOLLAR = '$'.charCodeAt(0);
const DOUBLE_QUOTE = '"'.charCodeAt(0);
const EQUALS = '='.charCodeAt(0);
const LEFT_BRACE = '{'.charCodeAt(0);
const LEFT_BRACKET = '['.charCodeAt(0);
const LEFT_PAREN = '('.charCodeAt(0);
const LF = "\n".charCodeAt(0);
const QUESTION_MARK = '?'.charCodeAt(0);
const RIGHT_BRACE = '}'.charCodeAt(0);
const SEMICOLON = ';'.charCodeAt(0);
const SPACE = ' '.charCodeAt(0);
const SLASH = '/'.charCodeAt(0);
const SINGLE_QUOTE = "'".charCodeAt(0);
const TAB = '\t'.charCodeAt(0);
const VERTICAL_BAR = '|'.charCodeAt(0);

// In order to distinguish division operators from the opening slash of a
// regular expression, identify slashes following these characters as possibly
// starting regular expressions but never being division operators.

const NEW_REGEX_CONTEXT_CHARS = [
    AMPERSAND,
    COLON,
    COMMA,
    EQUALS,
    LEFT_BRACE,
    LEFT_BRACKET,
    LEFT_PAREN,
    QUESTION_MARK,
    SEMICOLON,
    VERTICAL_BAR
];

// These characters don't change the context of code leading up to a token that
// begins with slash. This includes the context in which regular expressions can
// occur and the context in which a comment block continues without code.

const SAME_CONTEXT_CHARS = [
    CR,
    LF,
    SPACE,
    SLASH, // so that context doesn't change at start of regex or comment
    TAB
];

abstract class ParserState {

    lineChar(parser: CommentParser, charCode: number) {
        parser.escaped = (charCode === BACKSLASH);
    }

    newLine(parser: CommentParser, nextOffset: number) {
        parser.lineStartOffset = nextOffset;
        parser.offset = nextOffset;
        ++parser.lineNum;
        parser.charNum = 1;
        parser.escaped = false;
    }

    endOfFile(parser: CommentParser) {
        if (parser.inCommentBlock) {
            if (parser.lastCodeLineNum < parser.blockStartLineNum) {
                parser.targetLineOffset = parser.offset;
                parser.targetLineNum = parser.lineNum + 1;
            }
            else if (parser.targetLineNum < parser.blockStartLineNum) {
                this._advanceTargetLine(parser);
            }
            this._endCommentBlock(parser);
        }
        parser.listener.endOfComments();
    }

    protected _advanceTargetLine(parser: CommentParser) {
        if (parser.lastCodeLineNum === parser.lineNum) {
            parser.targetLineOffset = parser.lineStartOffset;
            parser.targetLineNum = parser.lineNum;
        }
    }

    protected _endCommentBlock(parser: CommentParser) {
        parser.listener.endCommentBlock(parser.targetLineOffset, parser.targetLineNum);
        parser.inCommentBlock = false;
    }
}

class ExpressionState extends ParserState {

    lineChar(parser: CommentParser, charCode: number) {
        switch (charCode) {
            case BACKTICK:
            parser.state = CommentParser.state_TemplateLiteral;
            break;

            case DOUBLE_QUOTE:
            case SINGLE_QUOTE:
            parser.openQuote = charCode;
            parser.state = CommentParser.state_StringLiteral;
            break;

            case LEFT_BRACE:
            if (parser.openTemplateBraces.length > 0) {
                ++parser.openTemplateBraces[parser.openTemplateBraces.length - 1];
            }
            break;

            case RIGHT_BRACE:
            if (parser.openTemplateBraces.length > 0) {
                if (--parser.openTemplateBraces[parser.openTemplateBraces.length - 1] === 0) {
                    parser.openTemplateBraces.pop();
                    parser.state = CommentParser.state_TemplateLiteral;
                }
            }
            break;

            case SLASH:
            parser.priorState = parser.state;
            parser.state = CommentParser.state_InitialSlash;
            break;

            default:
            super.lineChar(parser, charCode);
        }

        if (SAME_CONTEXT_CHARS.indexOf(charCode) === -1) {
            if (charCode !== BANG) { // e.g. bang in "x = y! / 2" doesn't start regex
                parser.inRegexContext = (NEW_REGEX_CONTEXT_CHARS.indexOf(charCode) >= 0);
            }
            parser.lastCodeLineNum = parser.lineNum;
        }
    }

    newLine(parser: CommentParser, nextOffset: number) {
        if (parser.inCommentBlock) {
            if (parser.targetLineNum < parser.blockStartLineNum) {
                this._advanceTargetLine(parser);
            }
            if (parser.targetLineNum >= parser.blockStartLineNum) {
                this._endCommentBlock(parser);
            }
        }
        super.newLine(parser, nextOffset);
    }
}

class InitialSlashState extends ParserState {

    lineChar(parser: CommentParser, charCode: number) {
        switch (charCode) {
            case ASTERISK:
            this._beginComment(parser);
            parser.state = CommentParser.state_SlashStarComment;
            break;

            case SLASH:
            this._beginComment(parser);
            parser.state = CommentParser.state_SlashSlashComment;
            break;

            default:
            parser.lastCodeLineNum = parser.lineNum; // prior slash was code
            if (parser.inRegexContext) {

                // Match regular expressions with a regular expression, in order
                // to reduce the complexity of this state machine. Typescript
                // does not allow regular expressions to span multiple lines,
                // minimizing the lookahead and making this approach reasonable.

                let seekOffset = parser.offset + 1;
                while (seekOffset < parser.text.length &&
                        parser.text.charCodeAt(seekOffset) !== LF)
                {
                    ++seekOffset;
                }
                const restOfLine = parser.text.substring(parser.offset - 1, seekOffset);
                const matches = restOfLine.match(REGEX_REGEX);
                if (matches === null) {
                    return parser.fatalError("Invalid regular expression");
                }
                const regexLength = matches[0].length;
                parser.offset += regexLength; // skip past the regex
                parser.charNum += regexLength;
                parser.state = parser.priorState!;
            }
            else {

                // Assume the prior slash is a division operator.

                parser.state = parser.priorState!;
                super.lineChar(parser, charCode);
            }
        }
    }

    protected _beginComment(parser: CommentParser) {
        if (!parser.inCommentBlock) {
            parser.blockStartLineNum = parser.lineNum;
            parser.inCommentBlock = true;
        }
        if (parser.targetLineNum < parser.blockStartLineNum) {
            this._advanceTargetLine(parser);
        }
        parser.listener.beginComment(parser.offset - 1, parser.lineNum, parser.charNum - 1);
    }
}

abstract class CommentState extends ParserState {

    lineChar(parser: CommentParser, charCode: number) {
        // no escapes inside a comment
    }

    protected _endComment(parser: CommentParser, offsetDelta = 0) {
        parser.listener.endComment(parser.offset + offsetDelta, parser.lineNum);
    }
}

class SlashSlashCommentState extends CommentState {

    newLine(parser: CommentParser, nextOffset: number) {
        this._endComment(parser);
        if (parser.targetLineNum >= parser.blockStartLineNum) {
            super._endCommentBlock(parser);
        }
        super.newLine(parser, nextOffset);
        parser.state = CommentParser.state_Expression;
    }

    endOfFile(parser: CommentParser) {
        this._endComment(parser);
        super.endOfFile(parser);
    }
}

class SlashStarCommentState extends CommentState {

    lineChar(parser: CommentParser, charCode: number) {
        if (charCode === ASTERISK) {
            parser.state = CommentParser.state_PotentialEndOfComment;
        }
        else {
            super.lineChar(parser, charCode);
        }
    }

    endOfFile(parser: CommentParser) {
        parser.fatalError("Missing */ at end of comment");
    }
}

class PotentialEndOfCommentState extends SlashStarCommentState {

    lineChar(parser: CommentParser, charCode: number) {
        if (charCode === SLASH) {
            this._endComment(parser, 1);
            parser.state = CommentParser.state_Expression;
        }
        else {
            parser.state = CommentParser.state_SlashStarComment;
            super.lineChar(parser, charCode); // might change the state
        }
    }
}

class StringLiteralState extends ParserState {

    lineChar(parser: CommentParser, charCode: number) {
        if (!parser.escaped && charCode === parser.openQuote) {
            parser.state = CommentParser.state_Expression;
        }
        super.lineChar(parser, charCode);
    }
}

class TemplateLiteralState extends ParserState {

    lineChar(parser: CommentParser, charCode: number) {
        if (!parser.escaped && charCode === DOLLAR) {
            parser.state = CommentParser.state_PotentialTemplateExpression;
        }
        else if (!parser.escaped && charCode === BACKTICK) {
            parser.state = CommentParser.state_Expression;
        }
        else {
            super.lineChar(parser, charCode);
        }
    }
}

class PotentialTemplateExpressionState extends TemplateLiteralState {

    lineChar(parser: CommentParser, charCode: number) {
        if (charCode === LEFT_BRACE) {
            parser.openTemplateBraces.push(1);
            parser.state = CommentParser.state_Expression;
        }
        else {
            parser.state = CommentParser.state_TemplateLiteral;
            super.lineChar(parser, charCode); // might change the state
        }
    }
}

export class CommentParser {

    static state_Expression = new ExpressionState();
    static state_InitialSlash = new InitialSlashState();
    static state_PotentialEndOfComment = new PotentialEndOfCommentState();
    static state_SlashSlashComment = new SlashSlashCommentState();
    static state_SlashStarComment = new SlashStarCommentState();
    static state_StringLiteral = new StringLiteralState();
    static state_TemplateLiteral = new TemplateLiteralState();
    static state_PotentialTemplateExpression = new PotentialTemplateExpressionState();

    readonly text: string; // full text of Typescript to parse
    readonly listener: CommentListener; // receiver of parser events

    state: ParserState; // current state of parser, a stateless object

    aborted = false; // whether aborted due to fatal error
    blockStartLineNum = 0; // line number at which current block started
    charNum = 1; // current character in current line
    commentStartLine = 0; // line on which the current comment started
    escaped = false; // whether preceding char is an escaping backslash
    inCommentBlock = false; // whether a comment block is currently open
    inRegexContext = true; // whether a regular expression is currently possible
    lastCodeLineNum = 0; // number of most recent line having non-comment code
    lineStartOffset = 0; // offset at which current line starts
    lineNum = 1; // current line number
    offset = 0; // offset into text of next character to process
    openTemplateBraces = <number[]>[]; // open braces per nested template literal
    openQuote = 0; // SINGLE_QUOTE or DOUBLE_QUOTE in string literals
    priorState?: ParserState; // state prior to examining char after slash
    targetLineNum = 0; // number of next target line
    targetLineOffset = 0; // offset to start of current next target line

    constructor(sourceText: string, listener: CommentListener) {
        this.text = sourceText;
        this.listener = listener;
        this.state = CommentParser.state_Expression;
    }

    parse() {
        const textLength = this.text.length;
        while (!this.aborted && this.offset < textLength) {

            const offset = this.offset;
            const charCode = this.text.charCodeAt(offset);

            if (charCode === CR) {
                if (offset + 1 === textLength || this.text.charCodeAt(offset + 1) === LF) {
                    this.state.newLine(this, offset + 2);
                }
                else {
                    this.state.newLine(this, offset + 1);
                }
            }
            else if (charCode === LF) {
                this.state.newLine(this, offset + 1);
            }
            else {
                this.state.lineChar(this, charCode);
                if (this.offset === offset) {
                    ++this.offset;
                    ++this.charNum;
                }
            }
        }

        if (!this.aborted) {
            this.state.endOfFile(this);
        }
    }

    fatalError(message: string) {
        this.listener.fatalError(message, this.offset, this.lineNum, this.charNum);
        this.aborted = true;
    }
}

export interface CommentListener {
    beginComment(startOffset: number, lineNum: number, charNum: number): void;
    endComment(nextOffset: number, lineNum: number): void;
    endCommentBlock(targetLineOffset: number, targetLineNum: number): void;
    endOfComments(): void;
    fatalError(message: string, offset: number, lineNum: number, charNum: number): void;
}
