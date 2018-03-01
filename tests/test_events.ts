
import 'mocha';
import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import { EventCollector, Event } from './lib/collectors';

const commentFileDir = path.join(__dirname, 'fixtures/events');
const fileNames = fs.readdirSync(commentFileDir).filter(name => name.endsWith('.ts'));

describe("parsing for events", () => {

    fileNames.forEach(baseFileName => {

        const fileName = path.join(commentFileDir, baseFileName);
        it(`parses ${baseFileName}`, (done) => {

            const resultFileName = fileName.substr(0, fileName.length - '.ts'.length) + '.json';
            try {        
                const sourceText = fs.readFileSync(fileName).toString();
                const collector = new EventCollector(sourceText);
                const events = collector.getEvents();
                const expectedResults = require(resultFileName);
                compareEvents(events, expectedResults, baseFileName, sourceText);
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

function compareEvents(
    actualResults: Event[],
    expectedResults: any,
    baseFileName: string,
    sourceText: string
) {
    const actualEvents = actualResults; // clearer name
    const expectedEvents = <Event[]>expectedResults.events;
    assert.strictEqual(actualEvents.length, expectedEvents.length,
            `differing number of events in ${baseFileName}`);

    for (let i = 0; i < actualEvents.length; ++i) {
        assert.deepEqual(actualEvents[i], expectedEvents[i],
                `events[${i}] differs in ${baseFileName}`);
    }
}
