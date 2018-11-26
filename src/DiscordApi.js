const config = require("../config");
const sleep = require("util").promisify(setTimeout);
const fetch = require("node-fetch");
const NetworkService = require("./NetworkService");
const FormData = require("form-data");
class DiscordApi {
  static getMessages(channelId, limit, positionObject, apiKey = config.apiKey) {
    let url =
      config.discordApiUrl +
      "/channels/" +
      channelId +
      "/messages?limit=" +
      (limit ? limit : 100);
    if (positionObject && positionObject.type && positionObject.message_id) {
      url += "&" + positionObject.type + "=" + positionObject.message_id;
    }
    return NetworkService.callApi(null, url, "GET", apiKey);
  }

  static async joinGuild(inviteId, apiKey = config.apiKey) {
    let url = config.discordApiUrl + "/invite/" + inviteId;
    return NetworkService.callApi(null, url, "POST", apiKey);
  }

  static async leaveGuild(guildId, apiKey) {
    let url = config.discordApiUrl + "/users/@me/guilds/" + guildId;
    return NetworkService.callApi(null, url, "DELETE", apiKey);
  }

  static async getGuilds(apiKey = config.apiKey) {
    let url = config.discordApiUrl + "/users/@me/guilds";
    return NetworkService.callApi(null, url, "GET", apiKey);
  }

  static async getChannels(guildId, apiKey = config.apiKey) {
    return NetworkService.callApi(
      null,
      config.discordApiUrl + "/guilds/" + guildId + "/channels",
      "GET",
      apiKey
    );
  }

  static async getGuildMembers(guildId, apiKey = config.apiKey) {
    return NetworkService.callApi(
      null,
      config.discordApiUrl + "/guilds/" + guildId + "/members?limit=1000",
      "GET",
      apiKey
    );
  }

  static async getChannel(channelId, apiKey = config.apiKey) {
    return NetworkService.callApi(
      null,
      config.discordApiUrl + "/channels/" + channelId,
      "GET",
      apiKey
    );
  }

  static async patchSettings(settings, apiKey = config.apiKey) {
    return NetworkService.callApi(
      settings,
      config.discordApiUrl + "/users/@me/settings",
      "PATCH",
      apiKey
    );
  }

  static getUserWithKey(key) {
    let url = config.discordApiUrl + "/users/@me";
    return fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: key
      }
    }).then(response => response.json(), response => response.json());
  }

  static async changeProfile(
    username,
    email,
    base64Image,
    apiKey = config.apiKey,
    password = "re1re2reee3xx"
  ) {
    let data = {
      username: username,
      email: email,
      password: password,
      avatar: "data:image/png;base64," + base64Image,
      discriminator: null,
      new_password: null
    };
    return NetworkService.callApi(
      data,
      config.discordApiUrl + "/users/@me",
      "PATCH",
      apiKey
    );
  }

  static async getProfile(apiKey = config.apiKey) {
    return NetworkService.callApi(
      null,
      config.discordApiUrl + "/users/@me",
      "GET",
      apiKey
    );
  }

  static async getDmChannel(userId, apiKey = config.apiKey) {
    return NetworkService.callApi(
      { recipient_id: userId },
      config.discordApiUrl + "/users/@me/channels",
      "POST",
      apiKey
    );
  }

  static deleteMessage(message, apiKey = config.apiKey) {
    let url =
      config.discordApiUrl +
      "/channels/" +
      message.channel_id +
      "/messages/" +
      message.id;
    return NetworkService.callApi(null, url, "DELETE", apiKey);
  }

  static getGuildRoles(guildId, apiKey = config.apiKey) {
    let url = config.discordApiUrl + "/guilds/" + guildId + "/roles";
    return NetworkService.callApi(null, url, "GET", apiKey);
  }

  static deleteRole(guildId, roleId, apiKey = config.apiKey) {
    let url = config.discordApiUrl + "/guilds/" + guildId + "/roles/" + roleId;
    return NetworkService.callApi(null, url, "DELETE", apiKey);
  }

  static grantRole(guildId, userId, roleId, apiKey = config.apiKey) {
    let url =
      config.discordApiUrl +
      "/guilds/" +
      guildId +
      "/members/" +
      userId +
      "/roles/" +
      roleId;
    return NetworkService.callApi(null, url, "PUT", apiKey);
  }

  static removeMemberRole(guildId, userId, roleId, apiKey = config.apiKey) {
    let url =
      config.discordApiUrl +
      "/guilds/" +
      guildId +
      "/members/" +
      userId +
      "/roles/" +
      roleId;
    return NetworkService.callApi(null, url, "DELETE", apiKey);
  }

  static sendMessage(body, channelId, apiKey = config.apiKey) {
    let url = config.discordApiUrl + "/channels/" + channelId + "/messages";
    return NetworkService.callApi(body, url, "POST", apiKey);
  }

  static editMessage(body, channelId, messageId, apiKey = config.apiKey) {
    let url =
      config.discordApiUrl +
      "/channels/" +
      channelId +
      "/messages/" +
      messageId;
    return NetworkService.callApi(body, url, "PATCH", apiKey);
  }

  static createReaction(channelId, messageId, emoji, apiKey = config.apiKey) {
    let url =
      config.discordApiUrl +
      "/channels/" +
      channelId +
      "/messages/" +
      messageId +
      "/reactions/" +
      emoji +
      "/@me";
    return NetworkService.callApi(null, url, "PUT", apiKey);
  }

  static deleteUserReaction(
    channelId,
    messageId,
    emoji,
    userId,
    apiKey = config.apiKey
  ) {
    let url =
      config.discordApiUrl +
      "/channels/" +
      channelId +
      "/messages/" +
      messageId +
      "/reactions/" +
      emoji +
      "/" +
      userId;
    return NetworkService.callApi(null, url, "DELETE", apiKey);
  }

  static deleteOwnReaction(
    channelId,
    messageId,
    emoji,
    apiKey = config.apiKey
  ) {
    let url =
      config.discordApiUrl +
      "/channels/" +
      channelId +
      "/messages/" +
      messageId +
      "/reactions/" +
      emoji +
      "/@me";
    return NetworkService.callApi(null, url, "DELETE", apiKey);
  }

  static getInvites(channelId, apiKey = config.apiKey) {
    let url = config.discordApiUrl + "/channels/" + channelId + "/invites";
    return NetworkService.callApi(
      {
        validate: null,
        max_age: 86400,
        max_uses: 0,
        temporary: false
      },
      url,
      "POST",
      apiKey
    );
  }

  static sendImage(channelId, blob, payloadJson, apiKey = config.apiKey) {
    let form = new FormData();
    form.append("file", blob, { filename: "image.png" });
    form.append("tts", "false");
    form.append("content", "");

    if (payloadJson) {
      form.append("payload_json", payloadJson);
    }

    return NetworkService.callApiRaw(
      form,
      config.discordApiUrl + "/channels/" + channelId + "/messages",
      apiKey,
      false
    );
  }

  static setUserGuildSettings(guildId, settings, apiKey = config.apiKey) {
    return NetworkService.callApi(
      settings,
      config.discordApiUrl + "/users/@me/guilds/" + guildId + "/settings",
      "PATCH",
      apiKey,
      false
    );
  }

  static createChannel(guildId, channelObject, apiKey = config.apiKey) {
    return NetworkService.callApi(
      channelObject,
      config.discordApiUrl + "/guilds/" + guildId + "/channels",
      "POST",
      apiKey
    );
  }

  static deleteChannel(id, apiKey = config.apiKey) {
    return NetworkService.callApi(
      null,
      config.discordApiUrl + "/channels/" + id,
      "DELETE",
      apiKey
    );
  }

  static async getGuild(guildId, apiKey = config.apiKey) {
    return NetworkService.callApi(
      null,
      config.discordApiUrl + "/guilds/" + guildId,
      "GET",
      apiKey
    );
  }
}

module.exports = DiscordApi;
