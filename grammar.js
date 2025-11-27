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
    // TODO ... explore more testing w.r.t. observation: 
    //   observation? seems like the first entry must match the full file? w/o this I get errors?
    messages: $ => repeat(choice(
      $.message_system,
      $.message_developer,
      $.message_user,
      $.message_tool_result,
      // assistant:
      $.message_assistant_final,
      $.message_assistant_analysis,
      $.message_assistant_commentary_tool_call,
    )),

    // TODO header => split out header types instead of top level message types? would allow for more flexible parsing later... wouldn't require full message AIO
    header: $ => choice($.header_user, $.header_system, $.header_developer, $.header_tool_result, $.header_assistant),
    //  i.e. $.header_assistant (subdivided), $.header_tool_result
    header_user: $ => $.role_user,
    header_system: $ => $.role_system,
    header_developer: $ => $.role_developer,
    header_tool_result: $ => seq($.role_tool, " ", $.recipient_assistant, $.channel_token, "commentary"),
    //
    // assistant headers:
    header_assistant: $ => choice(
      $.header_assistant_analysis, $.header_assistant_final, $.header_assistant_commentary_tool_call
    ),
    header_assistant_analysis: $ => seq($.role_assistant, $.channel_token, "analysis"),
    header_assistant_final: $ => seq($.role_assistant, $.channel_token, "final"),
    header_assistant_commentary_tool_call: $ => seq(
      $.role_assistant, $.channel_token, $.assistant_commentary, optional($.assistant_commentary),
    ),

    // source_file: $ => seq($.start_token, $.end_token),
    message_user: $ => seq($.start_token, $.header_user, $.message_content_tail),
    message_system: $ => seq($.start_token, $.header_system, $.message_content_tail),
    message_developer: $ => seq($.start_token, $.header_developer, $.message_content_tail),

    // <|start|>functions.get_current_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>
    message_tool_result: $ => seq($.start_token, $.header_tool_result, $.message_content_tail),

    role_tool: $ => seq("functions.", RegExp("[^\s]+")), // ? add?


    // assistant_channel: $ => choice("analysis", "final", $.assistant_commentary), 
    message_assistant_analysis: $ => seq(
      $.start_token,
      $.header_assistant_analysis,
      $.message_content_tail
    ),
    message_assistant_final: $ => seq(
      $.start_token,
      $.header_assistant_final,
      $.message_content_tail
    ),
    // - `<|start|>assistant<|channel|>commentary to=functions.get_current_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>`
    message_assistant_commentary_tool_call: $ => seq(
      $.start_token,
      $.header_assistant_commentary_tool_call,
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

    // header: $ => RegExp(".*"),

  },
});
