# just-comments API

## *class* CommentParser
Parse a string of Javascript or Typescript source for comments, emitting events that describe the comments as the comments are found. After constructing an instance, run `parse()` to parse the source text for comments. `parse()` can only be called once.

### *constructor*
```typescript
constructor(sourceText: string, listener: CommentListener)
```

Construct an instance of CommentParser.

Parameter | Description
--- | ---
sourceText|Javascript or Typescript source to parse
listener|Object that is to receive parse events

### *method* parse()
```typescript
parse(): void
```

Parse the Javascript or Typescript source text for comments. Emits events to the CommentListener that was handed to the constructor. Can only be called once on an instance.

## *interface* CommentListener

Interface for listening to the comment parse events that CommentParser emits.

Each comment is assumed to pertain to a portion of code, except for comments that end the source text. The first line of code that a comment characterizes is the called the "target line". Multiple comments may each pertain to the same target line. Each group of comments that pertains to the same target line is called a "comment block". No two comment blocks pertain to the same target line.

This interface properly reports the relative occurrences of comment starts, comment ends, scope starts, and scope ends, but it may report comment blocks ends outside the scopes of the blocks' containing comments.

This interface reports line numbers and character numbers. The first line of a source text is line number 1, and the first character of a line of source is character number 1.

### *method* openScope()
```typescript
openScope(charCode: number, offset: number, lineNum: number, charNum: number): void
```

Report the occurrence of a character that can open a scope. These are occurrences of any of the characters {, (, and ` not appearing within comments, quotes, template literals, or regular expressions. Scopes within template literal expressions are not reported.

Parameter | Description
--- | ---
charCode | Character code of the character that opens the scope.
offset | Offset into source text of the opening character.
lineNum | Line number of the source text on which the character occurs.
charNum | Character number of the line at which the character occurs.

### *method* closeScope()
```typescript
closeScope(charCode: number, offset: number, lineNum: number, charNum: number): void
```

Report the occurrence of a character that can close a scope. These are occurrences of any of the characters }, ), and ` not appearing within comments, quotes, template literals, or regular expressions. Scopes within template literal expressions are not reported.

Parameter | Description
--- | ---
charCode | Character code of the character that closes the scope.
offset | Offset into source text of the closing character.
lineNum | Line number of the source text on which the ocharacter occurs.
charNum | Character number of the line at which the character occurs.

### *method* beginComment()
```typescript
beginComment(startOffset: number, lineNum: number, charNum: number): void
```

Report the start of a new comment. The first call to this method within a comment block initiates the comment block; there is no separate event for initiating a comment block.

Parameter | Description
--- | ---
startOffset | Offset into source text of character that begins the comment. This character will be the slash of the slash-slash slash-star that began the comment.
lineNum | Line number of the source text on which the comment begins. 
charNum | Character number of the line at which the comment begins.

### *method* endComment()
```typescript
endComment(nextOffset: number, lineNum: number): void
```

Report the end of a comment. More comments may follow within the same comment block.

Parameter | Description
--- | ---
nextOffset | Offset into the source text of the first character that follows the comment. This will be the first character after star-slash in a multi-line comment, and it will be the CR or LF that ends the line in a single-line slash-slash comment.
lineNum | Line number containing the last character of the comment.

### *method* endCommentBlock()
```typescript
endCommentBlock(targetLineOffset: number, targetLineNum: number): void
```

Report the end of a comment block. At least one comment will have been previously reported for the comment block. All comments in the block are presumed to characterize the block of code that begins with the indicated target line.

This method may be called from a brace scope that differs from the scopes of its containing comments.

Parameter | Description
--- | ---
targetLineOffset | Offset into the source text of the first character of the target line. This character need not be non-comment source code, as this code may appear later in the line, possibly even after a comment that begins the line.
targetLineNum | Line number of the source text of the target line.

### *method* endOfComments()
```typescript
endOfComments(): void
```

Report that the parser has completed parsing the source text and no more comments follow.

### *method* fatalError()
```typescript
fatalError(message: string, offset: number, lineNum: number, charNum: number): void
```

Report that the parser encountered an error that prevents it from parsing the source text. The parser has aborted and no more events follow.

Parameter | Description
--- | ---
message | Brief description of the problem.
offset | Offset into the source text at which the problem was detected.
lineNum | Line number of the source text at which the problem was detected.
charNum | Character number within the line at which the problem was detected.
