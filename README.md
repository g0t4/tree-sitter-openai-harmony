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
tree-sitter generate && tree-sitter parse examples/individual/system_message.harmony
tree-sitter generate && tree-sitter parse examples/individual/developer_message.harmony
# review output, it shows line/col of failures! i.e. ERROR nodes

# interactive web 'app'
# run docker to target wasm:
tree-sitter build --wasm # FYI --docker might work too
tree-sitter playground  # as you type it updates the tree!
# check "query" box ... and it will match/color the nodes in your queries!
# can use queries below
```

query examples, made up classes (@start/@end)
```highlights.scm
(start_token) @start
(end_token) @end
```

```fish
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


## ts_query_ls setup

```fish
# careful with .tsqueryrc.json file, if you have a single trailing comma, NOPE...
# when having issues, run CLI directly and it will say "Could not parse the provided configuration"
ts_query_ls check

# no language object for xyz... check parser_install_directories and language_retrieval_patterns
#  also aliases... in my case it seems to insist on the current repo name as the language (for queries dir)...
#  so I have to map openai-harmony to just harmony (config)

# FYI LS + coc.nvim:
# completions based on built parser/language!!
# * format! also avail via CLI:
ts_query_ls format
# * linter (diagnostics), also available in CLI:
ts_query_ls lint

```

