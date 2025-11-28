## tree-sitter-openai-harmony

A tree-sitter parser for OpenAI's [harmony response format](https://github.com/openai/harmony)

## TODOs

- Message format: `<|start|>{header}<|message|>{content}<|end|>`
- Concepts to include in grammar
  - `message.content`
  - `message.header`
  - `message.role`: system, developer, user, assistant, tool (functions.\_\_\_)
  - assistant `channel`: final, analysis, commentary
  - commentary has `recipient`:
    - look for `to=_recipient_`:
    - `<|start|>assistant<|channel|>commentary to=functions.get_current_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>`
        - also `<|constrain|>` for tool's input format
    - `<|start|>{toolname} to=assistant<|channel|>commentary<|message|>{output}<|end|>`


- Stop on `<|call|>` and `<|return|>` too (assistant messages, for tool calls and final messages respectively)
- System and Developer messages => recognize nested markdown? both seem to use that for headers? (can I mark that as a nested language?)
- TODO ensure examples are all operational
- TODO examples of malformed - i.e. where I am doing FIM on my harmony parsing code and I have extraneous tokens: <|start|> etc
  - can I capture something out of the ambiguity?
  - i.e. can I parse bottom up and emphasize messages based on last to first?
  - I assume final messages are more likely to be intact (even if earlier messages are ambiguous)

## Links

- https://github.com/openai/harmony
- https://cookbook.openai.com/articles/openai-harmony


## tree-sitter CLI
```fish
# completion
npx tree-sitter-cli complete --shell fish > ~/.config/fish/completions/tree-sitter.fish

# developing grammar
tree-sitter generate
tree-sitter build

# test parsing:
tree-sitter parse test.harmony

# test queries!
tree-sitter query queries/highlights.scm test.harmony
```



### tree-sitter highlight

Docs: https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html

First, create user level config:
```fish
tree-sitter init-config 
# creates ~/.config/tree-sitter/config.json
```
```

# parser-directories must be a _PARENT_ directory of your grammar repo:
```json
{
    "parser-directories": [
        "~/repos/github/g0t4"
    ],
    "theme": { ... }
}
```

```fish
# test it recognizes grammar(s)
tree-sitter dump-languages
# empty == BAD

# grammar repo needs language config:
cat tree-sitter.json
# https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#language-configuration

# 
mkdir queries
echo "(start_token) @type" > queries/highlights.scm
# use a builtin 


tree-sitter highlight test.harmony
```


