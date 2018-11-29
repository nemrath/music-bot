let Meaning = require("./Meanings");

class TextParser {
    static async parse(message) {
        let meanings = [];
        let input = message.content;
        if (!input) {
            return [];
        }
        let textMap = TextParser.getTexts();

        Object.keys(textMap).forEach(type => {
            let commands = textMap[type];
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

    static getTexts() {
        return {
            [Meaning.NUMBER_ENTERED]: [{regex: /^(?<number>\d+)$/}],
        };
    }
}

module.exports = TextParser;
