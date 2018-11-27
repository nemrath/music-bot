let CommandParser = require("./CommandParser");

class MeaningExtractor {
  static async extractMeanings(msg) {
    let parsers = [CommandParser];
    let result = [];
    for (let parser of parsers) {
      let meanings = await parser.parse(msg);
      result.push(...meanings);
    }
    return result;
  }
}

module.exports = MeaningExtractor;
