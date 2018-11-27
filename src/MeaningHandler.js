const Meaning = require("./Meanings");
const config = require("../config");
const sleep = require("util").promisify(setTimeout);
const DiscordApi = require("./DiscordApi");

class MeaningHandler {
  static async handleMeanings(meanings, msg) {
    let results = [];
    for (let meaning of meanings) {
      results.push(await MeaningHandler.handleMeaning(meaning, msg));
    }
    return results;
  }

  static async handleMeaning(meaning, msg) {
    switch (meaning.type) {
      case Meaning.SHOW_PROFILE: {
        let content = JSON.stringify(await DiscordApi.getProfile());
        let result = await DiscordApi.sendMessage(
          {
            content
          },
          msg.d.channel_id
        );
        return result;
      }
      case Meaning.BOT_STARTED: {
        return await DiscordApi.sendMessage(
          {
            content: "I am awake"
          },
          config.logChannelId
        );
      }
    }
  }
}

module.exports = MeaningHandler;
