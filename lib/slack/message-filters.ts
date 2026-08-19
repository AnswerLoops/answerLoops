// Slack sets `subtype` on a message event for two very different reasons:
// (1) genuine noise — an edit, a deletion, a channel-join announcement,
// a bot post — that was never a real community question, and (2) a
// perfectly normal user message that happens to carry an attachment
// (`file_share`) or get broadcast into the channel from a thread
// (`thread_broadcast`). Blanket-rejecting "any subtype" silently dropped
// every message with an attached file or image — found live: a user
// attached a screenshot to a real question and no ticket was ever created,
// with no error anywhere, because `file_share` matched the same check
// meant to filter out message edits.
const IGNORED_SLACK_SUBTYPES = new Set([
  'message_changed',
  'message_deleted',
  'message_replied',
  'channel_join',
  'channel_leave',
  'channel_topic',
  'channel_purpose',
  'channel_name',
  'channel_archive',
  'channel_unarchive',
  'bot_message',
  'bot_add',
  'bot_remove',
  'pinned_item',
  'unpinned_item',
  'file_comment',
])

export function isIgnoredSlackSubtype(subtype: string | undefined): boolean {
  return !!subtype && IGNORED_SLACK_SUBTYPES.has(subtype)
}
