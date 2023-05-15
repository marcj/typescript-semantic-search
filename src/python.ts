import { PyBridge } from 'pybridge';

const code = `
from sentence_transformers import SentenceTransformer
import nltk
nltk.download('punkt')
from nltk.tokenize import sent_tokenize

embedder = SentenceTransformer('all-MiniLM-L6-v2')

def embed(texts):
    return embedder.encode(texts).tolist()

def prepare(text):
    sentences = sent_tokenize(text)
    # strip all white-space from the sentences and remove empty sentences
    return [s.strip() for s in sentences if len(s) > 0]
`;

export interface PythonAPI {
    embed(text: string[]): number[][];

    prepare(text: string): string[];
}

export class PythonController {
    // this uses per default `cwd`/venv/bin/python
    bridge = new PyBridge({ python: 'python', cwd: process.cwd() });

    api = this.bridge.controller<PythonAPI>(code);

    close() {
        this.bridge.close();
    }
}
