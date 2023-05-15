# TypeScript Semantic Search

This is the code for the article about [Semantic Search with Machine Learning, TypeScript, and Postgres](https://marcjschmidt.de/semantic-search).

## Install

```shell
# clone repository

# install dependencies
npm ci

# create virtual environment
python -m venv venv

# install python dependencies
venv/bin/pip install -r requirements.txt
```

## Use

The first use will take a while, since `nltk.download('punkt')` will download the punkt tokenizer first.

```shell
npm run app list

npm run app query "Human riding a bicycle"


npm run app add "A cat is chasing a mouse.A cat is chasing a dog. My meal tomorrow will be delicious."
npm run app query "cat eats mouse"
```
