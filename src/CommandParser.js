let Meaning = require("./Meanings");
const config = require("../config");

class CommandParser {
  static async parse(message) {
    let meanings = [];
    let content = message.content;
    if (!content || !content.startsWith(config.commandPrefix)) {
      return [];
    }
    let input = content.replace(config.commandPrefix, "");
    let commandMap = CommandParser.getCommands();

    Object.keys(commandMap).forEach(type => {
      let commands = commandMap[type];
      let meaningData = {};
      let meaning = null;
      commands.forEach(({ regex, data }) => {
        let match = input.match(regex);
        if (match) {
          meaning = { type: type };
          if (data) {
            meaningData = { ...data };
          }
          if (match.groups) {
            Object.keys(match.groups).forEach(groupkey => {
              if (match.groups[groupkey]) {
                meaningData[groupkey] = match.groups[groupkey];
              }
            });
          }
        }
      });
      if (meaning) {
        meanings.push({
          ...meaning,
          ...meaningData,
          channelId: message.channel_id
        });
      }
    });

    return meanings;
  }

  static getCommands() {
    return {
      [Meaning.SHOW_PROFILE]: [{ regex: /^profile$/ }],
        [Meaning.JOIN_VOICE_CHANNEL]: [{ regex: /^join$/ }],
        [Meaning.LEAVE_VOICE_CHANNEL]: [{ regex: /^leave$/ }],
        [Meaning.PAUSE_MUSIC]: [{ regex: /^pause$/ }],
        [Meaning.RESUME_MUSIC]: [{ regex: /^resume$/ }],
        [Meaning.END_MUSIC]: [{ regex: /^stop$/ }],
        [Meaning.PLAY_MUSIC]: [{ regex: /^play\s+(?<input>.+)$/ }],
        [Meaning.SHOW_QUEUE]: [{ regex: /^(q|queue)$/ }],
        [Meaning.CLEAR_QUEUE]: [{ regex: /^(clear)$/ }],
        [Meaning.NEXT_SONG]: [{ regex: /^(n|next)$/ }],
        [Meaning.PREVIOUS_SONG]: [{ regex: /^(prev|previous)$/ }]
    };
  }
}

module.exports = CommandParser;
