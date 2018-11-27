let Meaning = require("./Meanings");
const config = require("../config");

class CommandParser {
  static async parse(msg) {
    let meanings = [];

    if (!["MESSAGE_CREATE"].includes(msg.t) || msg.portalled) {
      return meanings;
    }
    let content = msg.d.content;
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
          channelId: msg.d.channel_id
        });
      }
    });

    return meanings;
  }

  static getCommands() {
    return {
      [Meaning.SHOW_PROFILE]: [{ regex: /^profile/ }]
    };
  }
}

module.exports = CommandParser;
