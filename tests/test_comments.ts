
import 'mocha';
import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import { CommentCollector, CommentBlock } from './lib/collector';

const commentFileDir = path.join(__dirname, 'fixtures');
const fileNames = fs.readdirSync(commentFileDir).filter(name => name.endsWith('.ts'));

describe("comment parser", () => {

    fileNames.forEach(baseFileName => {

        const fileName = path.join(commentFileDir, baseFileName);
        it(`parses ${baseFileName}`, (done) => {

            const resultFileName = fileName.substr(0, fileName.length - '.ts'.length) + '.json';
            try {        
                const sourceText = fs.readFileSync(fileName).toString();
                const collector = new CommentCollector(sourceText);
                const blocksOrError = collector.getBlocksOrError();
                const expectedResults = require(resultFileName);
                compareComments(blocksOrError, expectedResults, baseFileName, sourceText);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
                assert(false, err.message);
            }
            done();
        });
    });
});

function compareComments(
    actualResults: CommentBlock[] | string,
    expectedResults: any,
    baseFileName: string,
    sourceText: string
) {
    if (typeof actualResults === 'string') {
        assert.strictEqual(actualResults, expectedResults.fatalError,
                `unexpected fatal parse error in ${baseFileName}`);
    }
    else {
        assert.isUndefined(expectedResults.fatalError,
                `didn't get expected fatal error in ${baseFileName}`);

        const actualBlocks = actualResults; // clearer name
        const expectedBlocks = <CommentBlock[]>expectedResults.blocks;
        assert.strictEqual(actualBlocks.length, expectedBlocks.length,
                `differing number of comment blocks in ${baseFileName}`);

        for (let i = 0; i < actualBlocks.length; ++i) {
            const actualBlock = actualBlocks[i];
            const expectedBlock = expectedBlocks[i];

            assert.strictEqual(actualBlock.targetLineNum, expectedBlock.targetLineNum,
                    `block[${i}] targetLineNum differs in ${baseFileName}`);

            assert.strictEqual(actualBlock.comments.length, expectedBlock.comments.length,
                    `block[${i}] comment count differs in ${baseFileName}`);
            for (let j = 0; j < actualBlock.comments.length; ++j) {
                assert.deepEqual(actualBlock.comments[j], expectedBlock.comments[j],
                        `block[${i}] comment[${j}] differs in ${baseFileName}`);
            }

            const actualOffsetStr = toOffsetString(sourceText, actualBlock.targetLineOffset);
            const expectedOffsetStr = toOffsetString(sourceText, expectedBlock.targetLineOffset);
            assert.strictEqual(actualOffsetStr, expectedOffsetStr,
                    `block[${i}] targetLineOffset differs in ${baseFileName}`);
        }
    }
}

function toOffsetString(text: string, offset: number) {
    const excerptLength = 30;
    let excerpt = text.substr(offset, excerptLength);
    if (text.length > offset + excerptLength) {
        excerpt += '...';
    }
    return `offset ${offset}: [${excerpt}]`;
}
