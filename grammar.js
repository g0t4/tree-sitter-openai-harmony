/**
 * @file OpenAI's Harmony Response Format (gptoss)
 * @author Wes Higbee
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "harmony",

  // TODO language injection
  // - for markdown in system/developer message contents
  // - JSON in tool calls / results? (especially if <|constrain|>json!)
  // docs: https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#language-injection

  rules: {
    // TODO ... explore more testing w.r.t. observation: 
    //   observation? seems like the first entry must match the full file? w/o this I get errors?
    source_file: $ => seq(
      optional($.model_response_to_prefill),
      repeat($.message)),

    model_response_to_prefill: $ => seq(
      choice($.channel_analysis, $.channel_final, $.channel_commentary_tool_call),
      $.message_and_content,
      $.final_token
    ),

    // TODO? which $.message definition? emphasize message types (strict) or header types (loose)?
    // TODO message types (strict):
    // message: $ => choice(
    //   $.message_system,
    //   $.message_developer,
    //   $.message_user,
    //   $.message_tool_result,
    //   // assistant:
    //   $.message_assistant_final,
    //   $.message_assistant_analysis,
    //   $.message_assistant_commentary_tool_call_end,
    //   // decode only:
    //   $.message_assistant_commentary_tool_call_call,
    //   $.message_assistant_return,
    //   // BTW I can keep top level message types PLUS have header types! that way I keep top level useful message grouping... unless I don't have a full message in which case I think get header grouping (if available)!
    // ),
    // TODO or, generic message + header types (loose):
    message: $ => seq($.start_token, $.header, $.message_and_content, $.final_token),
    final_token: $ => choice($.end_token, $.return_token, $.call_token), // looser definition too b/c not limiting return/call tokens on end of specific messages

    header: $ => choice($.header_user, $.header_system, $.header_developer, $.header_tool_result, $.header_assistant),
    //  i.e. $.header_assistant (subdivided), $.header_tool_result
    header_user: $ => $.role_user,
    header_system: $ => $.role_system,
    header_developer: $ => $.role_developer,
    header_tool_result: $ => seq($.role_tool, " ", $.recipient_assistant, $.channel_token, "commentary"),
    //
    // assistant headers:
    header_assistant: $ => choice(
      $.header_assistant_analysis, $.header_assistant_final, $.header_assistant_commentary
    ),
    header_assistant_analysis: $ => seq($.role_assistant, $.channel_token, "analysis"),
    header_assistant_final: $ => seq($.role_assistant, $.channel_token, "final"),
    header_assistant_commentary: $ => seq(
      $.role_assistant, $.channel_token, $.assistant_commentary, optional($.assistant_commentary),
      // ? does this work for preamble which is assistant_commentary w/o the to=functions.___ and instead just a regular message ending
    ),
    // plausible model responses to typical prefill: <|start|>assistant
    channel_analysis: $ => seq($.channel_token, "analysis"),
    channel_final: $ => seq($.channel_token, "final"),
    channel_commentary_tool_call: $ => seq($.channel_token, $.assistant_commentary, optional($.assistant_commentary)),

    message_user: $ => seq($.start_token, $.header_user, $.content_tail),
    message_system: $ => seq($.start_token, $.header_system, $.content_tail),
    message_developer: $ => seq($.start_token, $.header_developer, $.content_tail),

    // <|start|>functions.get_current_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>
    message_tool_result: $ => seq($.start_token, $.header_tool_result, $.content_tail),

    role_tool: $ => seq("functions.", RegExp("[^\s]+")), // ? add?

    // assistant_channel: $ => choice("analysis", "final", $.assistant_commentary), 
    message_assistant_analysis: $ => seq($.start_token, $.header_assistant_analysis, $.content_tail),
    message_assistant_final: $ => seq($.start_token, $.header_assistant_final, $.content_tail),
    //
    // - `<|start|>assistant<|channel|>commentary to=functions.get_current_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>`
    message_assistant_commentary_tool_call_end: $ => seq(
      $.start_token, $.header_assistant_commentary, $.content_tail),
    message_assistant_commentary_tool_call_call: $ => seq(
      $.start_token, $.header_assistant_commentary, $.call_tail),
    call_tail: $ => seq($.message_and_content, $.call_token), // FYI <|call|> is mapped to <|end|> when sending next user request turn
    //
    assistant_commentary: $ => seq(
      "commentary",
      optional(seq(" ", $.recipient_functions,
        optional(seq($.constrain_token, "json"))
      ))
    ),
    constrain_format: $ => seq($.constrain_token, "json"),

    // super common - high level concepts
    message_and_content: $ => seq($.message_token, $.message_content), // could happen if <|end|> is frequently missing which probably will happen due to model forgetting... or stop token extraction with llama-server (will result in mostly not seeing end/call/return actually!)
    content_tail: $ => seq($.message_and_content, $.end_token),
    //
    return_tail: $ => seq($.message_and_content, $.return_token), // PRN collapse into message_assistant_return?
    message_assistant_return: $ => seq(
      $.start_token,
      $.header_assistant_final,
      $.return_tail
    ),



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
    //   use it on content_char below

    // message_content: $ => /[a-zA-Z0-9,#:\-\.\?\s\{\}]*/, // or? until <|end|>/<|return|>? or (or maybe <|start|>?
    // FYI if you have issues, you can go back to a nested rule like content_char (old name)... where you take token(...) out of the message_content's repeat and put into own rule
    message_content: $ => repeat1(token(prec(-9,
      choice(
        // /[a-zA-Z0-9,#:\-\.\?\s\{\}\_\|>]+/, // todo does * (0+) vs + (1+) ? is there an "empty" match? not sure that would matter
        /[^<]+/, // litearlly allow anything else (not <)
        /[<]/, // treat as single token to trigger a decision between continuing contents and the end/return/call tags... IIUC how tree-sitter works :)... I am still very new to this!!
      )
    ))),
    // OLD split approach (below)... nuke if things work out with inlined above...
    //   token() IIUC still triggers a "decision point" when inlined (like with split apart into separate rule)
    //   ALSO FYI I found this pattern in lua's grammar for strings which is what I suspected might be like my scenario! 
    //   https://github.com/tree-sitter-grammars/tree-sitter-lua/blob/d760230/grammar.js#L391-L417
    // message_content: $ => repeat1($.content_char),
    // content_char: $ => token(prec(-9,
    //   choice(
    //     // /[a-zA-Z0-9,#:\-\.\?\s\{\}\_\|>]+/, // todo does * (0+) vs + (1+) ? is there an "empty" match? not sure that would matter
    //     /[^<]+/, // litearlly allow anything else (not <)
    //     /[<]/, // treat as single token to trigger a decision between continuing contents and the end/return/call tags... IIUC how tree-sitter works :)... I am still very new to this!!
    //   )
    // )),
    // FYI to test nested non-end tags:
    //   tree-sitter generate && time tree-sitter parse examples/fleshing/content_has_tag.harmony



    // * recipients
    recipient_assistant: $ => "to=assistant",
    // function_name: $ => "" ,
    recipient_functions: $ => seq("to=functions.", RegExp("[^\s<]+")),


    // roles
    role_system: $ => "system",
    role_developer: $ => "developer",
    role_user: $ => "user",
    role_assistant: $ => "assistant",

    // header: $ => RegExp(".*"),

  },
});
