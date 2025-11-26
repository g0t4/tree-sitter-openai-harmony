## tree-sitter-openai-harmony


A tree-sitter parser for OpenAI's [harmony response format](https://github.com/openai/harmony)

## Constraints

- Message format: `<|start|>{header}<|message|>{content}<|end|>` 
- Stop on `<|call|>` and `<|return|>` too (assistant messages, for tool calls and final messages respectively)

## Links

- https://github.com/openai/harmony
- https://cookbook.openai.com/articles/openai-harmony
