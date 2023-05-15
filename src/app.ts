import { AutoIncrement, entity, Postgres, PrimaryKey } from '@deepkit/type';
import { Database } from '@deepkit/orm';
import { App, onAppExecute, onAppShutdown } from '@deepkit/app';
import { PostgresDatabaseAdapter } from '@deepkit/postgres';
import { PythonController } from "./python";
import { sql } from "@deepkit/sql";

@entity.collection('sentences')
export class Sentence {
    id: number & PrimaryKey & AutoIncrement = 0;
    sentence: string = '';
    embedding?: number[] & Postgres<{ type: 'vector(384)' }>;
}

const adapter = new PostgresDatabaseAdapter({
    host: 'localhost', database: 'postgres',
    user: 'postgres', password: 'postgres',
});

const sentences = [
    'A bird is singing in the tree.',
    'The boy is riding a bicycle.',
    'A woman is painting a picture.',
    'A cat is chasing a mouse.',
    'A group of friends are playing soccer.',
    'Two children are building sandcastles on the beach.',
    'A dog is barking loudly in the park.',
    'A chef is preparing a delicious meal.',
    'A dolphin is jumping out of the water.',
    'The sun is setting over the mountains.'
];

async function bootstrap(event: any, database: Database, python: PythonController) {
    //make sure all tables are created
    await database.migrate();

    const count = await database.query(Sentence).count();
    if (count === 0) {
        // seed database with some sentences
        for (const sentence of sentences) {
            await storeSentence(sentence, database, python);
        }
    }


    const query = 'Human riding a bicycle';
    const similarSentences = await searchSimilar(query, database, python);
    console.log('Similar sentences for', query);
    for (const sentence of similarSentences) {
        console.log(`  ${sentence.score}: ${sentence.sentence}`);
    }
}

async function cleanDatabase(database: Database) {
    await database.query(Sentence).deleteMany();
}

async function closeConnections(event: any, database: Database, python: PythonController) {
    await database.disconnect();
    python.close();
}

async function storeSentence(text: string, database: Database, python: PythonController) {
    const prepared = await python.api.prepare(text);
    const embedding = await python.api.embed(prepared);

    const sentences: Sentence[] = [];
    for (let i = 0; i < prepared.length; i++) {
        const sentence = new Sentence();
        sentence.sentence = prepared[i];
        sentence.embedding = embedding[i];
        sentences.push(sentence);
    }

    await database.persist(...sentences);
    for (const sentence of sentences) {
        console.log(`Inserted ${sentence.sentence}.`);
    }
}

async function query(query: string, database: Database, python: PythonController) {
    const sentences = await searchSimilar(query, database, python);
    console.log(`Query: ${query}`)
    for (const sentence of sentences) {
        console.log(`  ${sentence.score}: ${sentence.sentence}`);
    }
}

async function searchSimilar(query: string, database: Database, python: PythonController) {
    const prepared = await python.api.prepare(query);
    const embedding = await python.api.embed(prepared);

    const similar: { id: number, sentence: string, score: number }[] = [];
    for (let i = 0; i < prepared.length; i++) {
        const query = prepared[i];
        const query_embedding = embedding[i];
        const vector = JSON.stringify(query_embedding);

        // note that pgvector <=> uses cosine distance with range [0-2],
        // we convert it back to a similarity score [-1, 1] by doing `1 - (a <=> b)`
        const sentences = await database.raw(sql`
            SELECT id, sentence, 1 - (embedding <=> ${vector}::vector) as score
            FROM sentences
            ORDER BY embedding <=> ${vector}::vector
                LIMIT 5
        `).find();
        similar.push(...sentences);
    }

    return similar;
}

async function listSentences(database: Database) {
    const sentences = await database.query(Sentence).find();
    for (const sentence of sentences) {
        console.log(`#${sentence.id}: ${sentence.sentence}`);
    }
}

new App({
    providers: [
        { provide: Database, useValue: new Database<PostgresDatabaseAdapter>(adapter, [Sentence]) },
        PythonController
    ]
})
    .listen(onAppExecute, bootstrap)
    .listen(onAppShutdown, closeConnections)
    .command('clean', cleanDatabase)
    .command('add', storeSentence)
    .command('list', listSentences)
    .command('query', query)
    .run();
