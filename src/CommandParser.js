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
            commands.forEach(({regex, data}) => {
                let match = input.match(regex);
                if (match) {
                    meaning = {type: type};
                    if (data) {
                        meaningData = {...data};
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
            [Meaning.SHOW_PROFILE]: [{regex: /^profile$/}],
            [Meaning.JOIN_VOICE_CHANNEL]: [{regex: /^join$/}],
            [Meaning.LEAVE_VOICE_CHANNEL]: [{regex: /^leave$/}],
            [Meaning.PAUSE_MUSIC]: [{regex: /^pause$/}],
            [Meaning.RESUME_MUSIC]: [{regex: /^resume$/}],
            [Meaning.END_MUSIC]: [{regex: /^stop$/}],
            [Meaning.PLAY_MUSIC]: [{regex: /^play\s+(?<input>.+)$/}],
            [Meaning.PLAY_CURRENT_TRACK]: [{regex: /^play$/}],
            [Meaning.SHOW_QUEUE]: [{regex: /^(q|queue)(\s+(?<pageNr>\d+))?$/}],
            [Meaning.CLEAR_QUEUE]: [{regex: /^(clear)$/}],
            [Meaning.NEXT_TRACK]: [{regex: /^(n|next)$/}],
            [Meaning.PREVIOUS_TRACK]: [{regex: /^(prev|previous)$/}],
            [Meaning.SHOW_NOW_PLAYING]: [{regex: /^(np)$/}],
            [Meaning.SEARCH_TRACK]: [{regex: /^(search\s+(?<query>.+))$/}],
            [Meaning.CANCEL]: [{regex: /^cancel$/}],
            [Meaning.JUMP_TO_TRACK]: [{regex: /^jump\s+(?<trackNumber>\d+)$/}],
            [Meaning.STATUS]: [{regex: /^status$/}],
        };
    }
}

module.exports = CommandParser;
