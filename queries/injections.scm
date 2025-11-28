; TODO write proper injection queries... and then does nvim pick these up too or only use its own queries dir + files?  
(((message_content) @injection.content (#match? @injection.content "^\\{"))
 (#set! injection.language "json"))
