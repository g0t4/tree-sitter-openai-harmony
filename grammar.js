/**
 * @file OpenAI's Harmony Response Format (gptoss)
 * @author Wes Higbee
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "harmony",

  rules: {
    messages: $ => choice($.user_message, $.assistant_final),
    // source_file: $ => seq($.start_token, $.end_token),
    user_message: $ => seq(
      $.start_token, $.role_user,
      $.message_content_tail
    ),

    tool_call_result_message: $ => seq(
      $.start_token, $.role_tool, " ", $.recipient_assistant,
      $.channel_token, "commentary",
      $.message_content_tail
    ),
    // <|start|>functions.get_current_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>

    // assistant_channel: $ => choice("analysis", "final", $.assistant_commentary), 
    assistant_analysis: $ => seq(
      $.start_token, $.role_assistant,
      $.channel_token, "analysis",
      $.message_content_tail
    ),
    assistant_final: $ => seq(
      $.start_token, $.role_assistant,
      $.channel_token, "final",
      $.message_content_tail
    ),
    // - `<|start|>assistant<|channel|>commentary to=functions.get_current_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>`
    assistant_commentary_tool_call: $ => seq(
      $.start_token, $.role_assistant,
      $.channel_token, $.assistant_commentary,
      optional($.assistant_commentary),
      $.message_content_tail
    ),
    assistant_commentary: $ => seq("commentary ", $.recipient_functions),
    constrain_format: $ => seq($.constrain_token, "json"),



    // super common - high level concepts
    message_content_tail: $ => seq($.message_token, $.message_content, $.end_token),
    // TODO header? any utility in this as a node?


    // * special tokens
    start_token: $ => "<|start|>",
    end_token: $ => "<|end|>",
    message_token: $ => "<|message|>",
    channel_token: $ => "<|channel|>", // assistant & tool results only
    constrain_token: $ => "<|constrain|>", // assistant & tool results only
    // decode time only (not input)
    return_token: $ => "<|return|>", // instead of <|end|> on a final message
    call_token: $ => "<|call|>", // assistant commentary channel => tool request only

    // TODO could break out commentary into own rule that has recipient


    // full messages:
    //   <|start|>{header}<|message|>{content}<|end|>
    //   TODO redo with $.header
    // full_message: $ => seq($.start_token, $.header, $.message_token, $.message_content $.end_token)
    message_content: $ => RegExp("[a-zA-Z\?\s]*"), // until <|end|>/<|return|>? or (or maybe <|start|>?

    // * recipients
    recipient_assistant: $ => "to=assistant",
    // function_name: $ => "" ,
    recipient_functions: $ => seq("to=functions.", RegExp("[^\s]+")),


    // roles
    role_system: $ => "system",
    role_developer: $ => "developer",
    role_user: $ => "user",
    role_assistant: $ => "assistant",
    role_tool: $ => seq("functions.", RegExp("[^\s]+")), // ? add?

    // header: $ => RegExp(".*"),

  },
});
