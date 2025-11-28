/**
 * @file OpenAI's Harmony Response Format (gptoss)
 * @author Wes Higbee
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "harmony",

  // - markdown? in system/developer message contents
  // - more robust json constraints to injection queries
  // docs: https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#language-injection

  inline: $ => [
    $.anything_without_hoovering_tags,
  ],

  rules: {
    //   observation? seems like the first entry must match the full file? w/o this I get errors?
    source_file: $ => seq(
      optional($.model_response_to_start_assistant_prefill),
      repeat($.message)),

    model_response_to_start_assistant_prefill: $ => seq(
      choice($.channel_analysis, $.channel_final, $.channel_commentary_tool_call),
      $.message_and_content,
      $.final_token
    ),

    // compositional messages:
    message: $ => seq($.start_token, $.header, $.message_and_content, $.final_token),
    final_token: $ => choice($.end_token, $.return_token, $.call_token), // looser definition too b/c not limiting return/call tokens on end of specific messages

    // * HEADERS
    header: $ => choice($.header_system, $.header_developer, $.header_user, $.header_assistant, $.header_tool_result),
    header_user: $ => "user",
    header_system: $ => "system",
    header_developer: $ => "developer",

    // assistant
    header_assistant: $ => choice(
      $.header_assistant_analysis, $.header_assistant_final, $.header_assistant_commentary
    ),
    header_assistant_analysis: $ => seq("assistant", $.channel_token, "analysis"),
    header_assistant_final: $ => seq("assistant", $.channel_token, "final"),
    header_assistant_commentary: $ => seq(
      "assistant", $.channel_token, $.assistant_commentary, optional($.assistant_commentary),
      // ? does this work for preamble which is assistant_commentary w/o the to=functions.___ and instead just a regular message ending
      // - `<|start|>assistant<|channel|>commentary to=functions.get_current_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>`
    ),
    // plausible model responses to typical prefill: <|start|>assistant
    channel_analysis: $ => seq($.channel_token, "analysis"),
    channel_final: $ => seq($.channel_token, "final"),
    channel_commentary_tool_call: $ => seq($.channel_token, $.assistant_commentary, optional($.assistant_commentary)),

    // tool results
    header_tool_result: $ => seq($.role_tool, " ", $.recipient_assistant, $.channel_token, "commentary"),
    recipient_assistant: $ => "to=assistant",
    // <|start|>functions.get_current_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>


    role_tool: $ => seq("functions.", /[^\s]+/), // ? add?


    call_tail: $ => seq($.message_and_content, $.call_token), // FYI <|call|> is mapped to <|end|> when sending next user request turn
    //
    assistant_commentary: $ => seq(
      "commentary",
      optional(seq(/\s+/, $.recipient_functions, optional($.constrain_format)))
    ),
    recipient_functions: $ => seq("to=functions.", /[^\s<]+/), // TODO make a consistent, inline rule, for function names
    constrain_format: $ => seq(
      $.constrain_token,
      $.anything_without_hoovering_tags
    ),
    anything_without_hoovering_tags: $ => repeat1(choice(
      /[^<]+/, // be greedy with any other char (not <)
      /</ // force decision on single < which means it is allowed too just only one char at a time
    )),

    // super common - high level concepts
    message_and_content: $ => seq($.message_token, $.message_content), // could happen if <|end|> is frequently missing which probably will happen due to model forgetting... or stop token extraction with llama-server (will result in mostly not seeing end/call/return actually!)
    content_tail: $ => seq($.message_and_content, $.end_token),
    //
    return_tail: $ => seq($.message_and_content, $.return_token),

    // * special tokens
    start_token: $ => "<|start|>",
    end_token: $ => "<|end|>",
    message_token: $ => "<|message|>",
    channel_token: $ => "<|channel|>", // assistant & tool results only
    constrain_token: $ => "<|constrain|>", // assistant & tool results only
    // decode time only (not input)
    return_token: $ => "<|return|>", // instead of <|end|> on a final message
    call_token: $ => "<|call|>", // assistant commentary channel => tool request only

    // TODO what is up with whitespace allowed between tokens normally? ... I don't want to do that b/c then I might trim critical spacing before/after in content?
    //    seems like spacing is allowed, i.e. assistant_commentary => the to=functions.name<SPACE><|message|> works even though I didn't define that in my grammar
    //   use it on content_char below

    message_content: $ => prec(-9, $.anything_without_hoovering_tags),
  },
});
