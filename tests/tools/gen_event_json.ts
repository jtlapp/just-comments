
import * as Minimist from 'minimist';
import * as path from 'path';
import * as fs from 'fs';
import { EventCollector } from '../lib/collectors';

const help = `
Parses the indicated Javascript or Typescript files for comment events and
outputs them as .json files of the same name in the same directory.

Syntax: ts-node gen_event_json.ts <fileName>+

CAUTION: This tool does not necessarily generate valid files. The generated
files must be manually verified before being included in the test suite.
`.trimLeft();

const args = Minimist(process.argv.slice(2));

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

    const collector = new EventCollector(sourceText);
    const pojo = { events: collector.getEvents() };

    const fileMinusExt = fileName.substr(0, fileName.length - '.ts'.length);
    const jsonFileName = `${fileMinusExt}.json`
    fs.writeFileSync(jsonFileName, JSON.stringify(pojo, null, 2));
    console.log(`wrote ${jsonFileName}`);
});
