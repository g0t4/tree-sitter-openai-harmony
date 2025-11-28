/**
 * @file OpenAI's Harmony Response Format (gptoss)
 * @author Wes Higbee
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "harmony",

  inline: $ => [
    $.anything_without_hoovering_tags,
    $.header_assistant, // not an actual node, just use child header node types directly
    $.header,
  ],

  // FYI extras: [\s] is default... allows for whitespace around tokens unless clear it to force exact matches below...
  //    extra space between special tokens is NBD.. can ignore it... so leave extras as-is
  //    then any space sensitive areas should make clear in their regex to capture that and not leave it (i.e. message_contents)

  rules: {
    //   observation? seems like the first entry must match the full file? w/o this I get errors?
    source_file: $ => seq(
      optional($.model_response_to_start_assistant_prefill),
      repeat($.message)),

    model_response_to_start_assistant_prefill: $ => seq(
      choice($.prefill_channel_analysis, $.prefill_channel_final, $.prefill_channel_commentary_tool_call),
      $.message_token, $.message_content, $.final_token,
    ),

    // compositional messages:
    message: $ => seq($.start_token, $.header, $.message_token, $.message_content, $.final_token),
    final_token: $ => choice($.end_token, $.return_token, $.call_token), // looser definition too b/c not limiting return/call tokens on end of specific messages

    header: $ => field("header", choice($.header_system, $.header_developer, $.header_user, $.header_assistant, $.header_tool_result)),
    header_user: $ => "user",
    header_system: $ => "system",
    header_developer: $ => "developer",

    header_assistant: $ => choice($.header_assistant_analysis, $.header_assistant_final, $.header_assistant_commentary),
    header_assistant_analysis: $ => seq("assistant", $.channel_token, "analysis"),
    header_assistant_final: $ => seq("assistant", $.channel_token, "final"),
    header_assistant_commentary: $ => seq(
      // TODO fix double assistant_commentary: one is a mistake clearly, what was this supposed to be?
      "assistant", $.channel_token, $.assistant_commentary, optional($.assistant_commentary),
      // ? does this work for preamble which is assistant_commentary w/o the to=functions.___ and instead just a regular message ending
      // - `<|start|>assistant<|channel|>commentary to=functions.get_current_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>`
    ),

    prefill_channel_analysis: $ => seq($.channel_token, "analysis"),
    prefill_channel_final: $ => seq($.channel_token, "final"),
    prefill_channel_commentary_tool_call: $ => seq($.channel_token, $.assistant_commentary, optional($.assistant_commentary)),

    // * tool results
    // <|start|>functions.get_current_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>
    header_tool_result: $ => seq($.role_tool, " ", $.recipient_assistant, $.channel_token, "commentary"),
    recipient_assistant: $ => "to=assistant",
    role_tool: $ => seq("functions.", field("function_name", $.function_name)),
    function_name: $ => /[^\s<]+/,

    assistant_commentary: $ => seq(
      "commentary",
      optional(seq(/\s+/, $.recipient_functions, optional($.constrain_format)))
    ),
    recipient_functions: $ => seq("to=functions.", field("function_name", $.function_name)),
    constrain_format: $ => seq(
      $.constrain_token,
      $.anything_without_hoovering_tags
    ),
    anything_without_hoovering_tags: $ => repeat1(choice(
      /[^<]+/, // be greedy with any other char (not <)
      /</ // force decision on single < which means it is allowed too just only one char at a time
    )),


    // * special tokens
    // FYI might want these to be lower priority than many of the message structures above so if there are extraneous instances in message contents that won't take precedence?
    //   or at least keep start/message/channel/constrain lower as they should not terminate message_contents
    //   TODO add some test cases for extraneous special tokens like start_token in message_contents to verify what it does and if I prefer that then to cement that behavior
    start_token: $ => "<|start|>",
    end_token: $ => "<|end|>",
    message_token: $ => "<|message|>",
    channel_token: $ => "<|channel|>", // assistant & tool results only
    constrain_token: $ => "<|constrain|>", // assistant & tool results only
    // decode time only (not input)
    return_token: $ => "<|return|>", // instead of <|end|> on a final message
    call_token: $ => "<|call|>", // assistant commentary channel => tool request only

    message_content: $ => prec(-9, $.anything_without_hoovering_tags),
  },
});

// Injection:
// - PRN markdown in system/developer message contents
// - TODO more robust json constraints to injection queries
// docs: https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#language-injection


