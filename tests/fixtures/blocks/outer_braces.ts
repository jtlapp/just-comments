
// Comment 1

abstract class ParserState {

    // Comment 1.1

    lineChar(parser: any, charCode: any) {

        // Comment 1.1.1
        parser.escaped = (charCode === 'BACKSLASH');
    }
}

// Comment 2

class TemplateLiteralState extends ParserState {

    // Comment 2.1

    lineChar(parser: any, charCode: any) {

        /* Comment 2.1.1 */
        if (!parser.escaped && charCode === 'DOLLAR') {
            parser.state = 'CommentParser.state_PotentialTemplateExpression';
        }

        /* Comment 2.1.2 */
        else if (!parser.escaped && charCode === 'BACKTICK') {
            parser.openTemplateBraces.pop();
            parser.state = 'CommentParser.state_Expression';
        }

        /* Comment 2.1.3 */
        else {
            super.lineChar(parser, charCode);
        }
    }
}
