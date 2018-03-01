
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
const RIGHT_PAREN = ')'.charCodeAt(0);
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
        parser.escaped = !parser.escaped && (charCode === BACKSLASH);
    }

    newLine(parser: CommentParser, nextOffset: number) {
        parser.lineStartOffset = nextOffset;
        parser.offset = nextOffset;
        ++parser.lineNum;
        parser.charNum = 1;
        parser.escaped = false;
    }

    endOfSource(parser: CommentParser) {
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


    protected _closeScope(parser: CommentParser, charCode: number) {
        if (parser.openTemplateBraces.length === 0) {
            parser.listener.closeScope(charCode, parser.offset, parser.lineNum, parser.charNum);
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
            this._openScope(parser, charCode);
            parser.state = CommentParser.state_TemplateLiteral;
            break;

            case DOUBLE_QUOTE:
            case SINGLE_QUOTE:
            parser.openQuote = charCode;
            parser.state = CommentParser.state_StringLiteral;
            break;

            case LEFT_BRACE:
            this._openScope(parser, charCode);
            if (parser.openTemplateBraces.length > 0) {
                ++parser.openTemplateBraces[parser.openTemplateBraces.length - 1];
            }
            break;

            case LEFT_PAREN:
            this._openScope(parser, charCode);
            break;

            case RIGHT_BRACE:
            this._closeScope(parser, charCode);
            if (parser.openTemplateBraces.length > 0) {
                if (--parser.openTemplateBraces[parser.openTemplateBraces.length - 1] === 0) {
                    parser.openTemplateBraces.pop();
                    parser.state = CommentParser.state_TemplateLiteral;
                }
            }
            break;

            case RIGHT_PAREN:
            this._closeScope(parser, charCode);
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

    protected _openScope(parser: CommentParser, charCode: number) {
        if (parser.openTemplateBraces.length === 0) {
            parser.listener.openScope(charCode, parser.offset, parser.lineNum, parser.charNum);
        }
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

    endOfSource(parser: CommentParser) {
        this._endComment(parser);
        super.endOfSource(parser);
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

    endOfSource(parser: CommentParser) {
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
            this._closeScope(parser, charCode);
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

/**
 * Parse a string of Javascript or Typescript source for comments, emitting events that describe the comments as the comments are found. After constructing an instance, run `parse()` to parse the source text for comments. `parse()` can only be called once.
 */

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

    /**
     * Construct an instance of CommentParser.
     * 
     * @param sourceText Javascript or Typescript source to parse
     * @param listener Object that is to receive parse events
     */

    constructor(sourceText: string, listener: CommentListener) {
        this.text = sourceText;
        this.listener = listener;
        this.state = CommentParser.state_Expression;
    }

    /**
     * Parse the Javascript or Typescript source text for comments. Emits events to the CommentListener that was handed to the constructor. Can only be called once on an instance.
     */

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
            this.state.endOfSource(this);
        }
    }

    /**
     * Report an error that prevents parsing and abort the parse.
     * 
     * @param message Brief description of the error.
     */

    fatalError(message: string) {
        this.listener.fatalError(message, this.offset, this.lineNum, this.charNum);
        this.aborted = true;
    }
}

/**
 * Interface for listening to the comment parse events that CommentParser emits.
 * 
 * Each comment is assumed to pertain to a portion of code, except for comments that end the source text. The first line of code that a comment characterizes is the called the "target line". Multiple comments may each pertain to the same target line. Each group of comments that pertains to the same target line is called a "comment block". No two comment blocks pertain to the same target line.
 * 
 * This interface properly reports the relative occurrences of comment starts, comment ends, scope starts, and scope ends, but it may report comment blocks ends outside the scopes of the blocks' containing comments.
 * 
 * This interface reports line numbers and character numbers. The first line of a source text is line number 1, and the first character of a line of source is character number 1.
 */

export interface CommentListener {

    /**
     * Report the occurrence of a character that can open a scope. These are occurrences of any of the characters {, (, and ` not appearing within comments, quotes, template literals, or regular expressions. Scopes within template literal expressions are not reported.
     * 
     * @param charCode Character code of the character that opens the scope.
     * @param offset Offset into source text of the opening character.
     * @param lineNum Line number of the source text on which the character occurs.
     * @param charNum Character number of the line at which the character occurs.
     */
    openScope(charCode: number, offset: number, lineNum: number, charNum: number): void;

    /**
     * Report the occurrence of a character that can close a scope. These are occurrences of any of the characters }, ), and ` not appearing within comments, quotes, template literals, or regular expressions. Scopes within template literal expressions are not reported.
     * 
     * @param charCode Character code of the character that closes the scope.
     * @param offset Offset into source text of the closing character.
     * @param lineNum Line number of the source text on which the character occurs.
     * @param charNum Character number of the line at which the character occurs.
     */
    closeScope(charCode: number, offset: number, lineNum: number, charNum: number): void;

    /**
     * Report the start of a new comment. The first call to this method within a comment block initiates the comment block; there is no separate event for initiating a comment block.
     * 
     * @param startOffset Offset into source text of character that begins the comment. This character will be the slash of the slash-slash slash-star that began the comment.
     * @param lineNum Line number of the source text on which the comment begins. 
     * @param charNum Character number of the line at which the comment begins.
     */
    beginComment(startOffset: number, lineNum: number, charNum: number): void;

    /**
     * Report the end of a comment. More comments may follow within the same comment block.
     * 
     * @param nextOffset Offset into the source text of the first character that follows the comment. This will be the first character after star-slash in a multi-line comment, and it will be the CR or LF that ends the line in a single-line slash-slash comment.
     * @param lineNum Line number containing the last character of the comment.
     */
    endComment(nextOffset: number, lineNum: number): void;

    /**
     * Report the end of a comment block. At least one comment will have been previously reported for the comment block. All comments in the block are presumed to characterize the block of code that begins with the indicated target line.
     * 
     * This method may be called from a brace scope that differs from the scopes of its containing comments.
     * 
     * @param targetLineOffset Offset into the source text of the first character of the target line. This character need not be non-comment source code, as this code may appear later in the line, possibly even after a comment that begins the line.
     * @param targetLineNum Line number of the source text of the target line.
     */
    endCommentBlock(targetLineOffset: number, targetLineNum: number): void;

    /**
     * Report that the parser has completed parsing the source text and no more comments follow.
     */
    endOfComments(): void;

    /**
     * Report that the parser encountered an error that prevents it from parsing the source text. The parser has aborted and no more events follow.
     * 
     * @param message Brief description of the problem.
     * @param offset Offset into the source text at which the problem was detected.
     * @param lineNum Line number of the source text at which the problem was detected.
     * @param charNum Character number within the line at which the problem was detected.
     */
    fatalError(message: string, offset: number, lineNum: number, charNum: number): void;
}
