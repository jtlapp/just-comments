
import * as Minimist from 'minimist';
import * as path from 'path';
import * as fs from 'fs';
import { CommentCollector } from '../lib/collector';

const help = `
Parses the indicated Javascript or Typescript files for comments and outputs
the comments as .json files of the same name in the same directory.

Syntax: ts-node gen_comment_json.ts <fileName>+ [--log]

--log - Logs each CommentListener event to stdout

CAUTION: This tool does not necessarily generate valid files. The generated
files must be manually verified before being included in the test suite.
`.trimLeft();

const args = Minimist(process.argv.slice(2), {
    boolean: [ 'log' ],
    default: { log: false }
});

if (args.help) {
    console.log(help);
    process.exit(0);
}

const fileNames = args._;

if (fileNames.length === 0) {
    console.log("You must specify at least one Javascript/Typescript source file.");
    process.exit(1);
}

fileNames.forEach(fileName => {

    if (args.log) {
        console.log(`\nFILE ${fileName}:`);
    }

    fileName = path.join(process.cwd(), fileName);
    const sourceText = fs.readFileSync(fileName).toString();

    const collector = new CommentCollector(sourceText, args.log);
    const blocksOrError = collector.getBlocksOrError();
    let pojo: any;
    if (typeof blocksOrError === 'string') {
        pojo = { fatalError: blocksOrError };
    }
    else {
        pojo = { blocks: blocksOrError };
    }

    const fileMinusExt = fileName.substr(0, fileName.length - '.ts'.length);
    const jsonFileName = `${fileMinusExt}.json`
    fs.writeFileSync(jsonFileName, JSON.stringify(pojo, null, 2));
    console.log(`wrote ${jsonFileName}`);
});

if (args.log) {
    console.log();
}
