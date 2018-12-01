const MessageFormatter = require("./MessageFormatter");
let smallString = "a".repeat(100);
let normalString = "a".repeat(1000);
let giantString = "BEGINNINGOFSTRING" + "a".repeat(MessageFormatter.MAX_EMBED_LENGTH * 3) + "ENDOFSTRING";

function createSmallArrayFields(fieldAmount, fieldValueArraySize) {
    let fields = new Array(fieldAmount);
    let fieldValueArray = new Array(fieldValueArraySize);
    return fields.fill({name: smallString, value: fieldValueArray.fill(smallString)});
}

function createSmallStringFields(fieldAmount) {
    let fields = new Array(fieldAmount);
    return fields.fill({name: smallString, value: smallString});
}

function createNormalArrayFields(fieldAmount, fieldValueArraySize) {
    let fields = new Array(fieldAmount);
    let fieldValueArray = new Array(fieldValueArraySize);
    return fields.fill({name: normalString, value: fieldValueArray.fill(normalString)});
}

function createNormalStringFields(fieldAmount) {
    let fields = new Array(fieldAmount);
    return fields.fill({name: normalString, value: normalString});
}

function createGiantArrayFields(fieldAmount, fieldValueArraySize) {
    let fields = new Array(fieldAmount);
    let fieldValueArray = new Array(fieldValueArraySize);
    return fields.fill({name: giantString, value: fieldValueArray.fill(giantString)});
}

function createGiantStringFields(fieldAmount) {
    let fields = new Array(fieldAmount);
    return fields.fill({name: giantString, value: giantString});
}


function createTooLargeNonRegularFieldsEmbed() {
    return {
        title: giantString,
        desciption: giantString,
        headerFields: createGiantArrayFields(4, 3),
        fields: createGiantArrayFields(10, 100),
        footerFields: createGiantStringFields(4),
        footer: {
            text: giantString
        }
    };
}

function createGiantValidEmbed() {
    return {
        title: smallString,
        description: smallString,
        headerFields: createSmallArrayFields(1, 1),
        fields: createGiantArrayFields(100, 100),
        footerFields: createSmallStringFields(1),
        footer: {
            text: smallString
        }
    };
}

test('checks if create message throws the right error when the total size of the non regular fields is too large', () => {
    expect(() => {
        MessageFormatter.createMessage(createTooLargeNonRegularFieldsEmbed());
    }).toThrow(MessageFormatter.TOO_LARGE_NON_REGULAR_FIELDS_TOTAL_SIZE);
});

test('checks if giant valid embed is valid', () => {
    expect(MessageFormatter.validate(MessageFormatter.createMessage(createGiantValidEmbed())).error).toBe(null);
});
test('checks if giant valid embed produces an expected total non regular field size', () => {
    let giantValidEmbed = createGiantValidEmbed();
    let messages = MessageFormatter.createMessages(giantValidEmbed);
    let nonRegularFields = messages.map(
        ({fields, ...rest}) =>
            ({...rest, fields: fields.length > 2 ? [fields[0], fields[fields.length - 1]] : [fields[0]]})
    );
    let expectedNonRegularFieldsSize = (smallString.length +
        smallString.length +
        smallString.length +
        smallString.length * 2 +
        smallString.length * 2) * messages.length
    ;

    let actualNonRegularFieldsSize = MessageFormatter.calculateLengthRecursively(nonRegularFields);
    expect(expectedNonRegularFieldsSize).toBe(actualNonRegularFieldsSize);
});

test('checks if giant valid embed produces discord embeds with expected regular field sizes', () => {
    let giantValidEmbed = createGiantValidEmbed();
    let messages = MessageFormatter.createMessages(giantValidEmbed);
    let regularFields = messages.map(
        ({fields}) => fields.slice(1, fields.length - 1)
    );
    let expectedRegularFieldsSize = 99 * 100 * '\u200B'.length + 100 * MessageFormatter.MAX_FIELD_NAME_LENGTH + 100 * 100 * MessageFormatter.MAX_FIELD_VALUE_LENGTH;

    let actualSize = MessageFormatter.calculateLengthRecursively(regularFields);
    expect(expectedRegularFieldsSize).toBe(actualSize);
});

test('checks if giant valid embed produces the expected amount of discord embeds', () => {


    let messages = MessageFormatter.createMessages(createGiantValidEmbed());
    let nonRegularFields = messages.map(
        ({fields, ...rest}) =>
            ({...rest, fields: [fields[0], fields[fields.length - 1]]})
    )[0];
    let regularFields = messages.map(
        ({fields}) => fields.slice(1, fields.length - 1)
    );
    let actualFieldSize = MessageFormatter.calculateLengthRecursively(regularFields[0]);
    let nonRegularFieldSize = MessageFormatter.calculateLengthRecursively(nonRegularFields);
    let fieldSize = MessageFormatter.MAX_FIELD_VALUE_LENGTH + MessageFormatter.MAX_FIELD_NAME_LENGTH;
    let overflowFieldSize = MessageFormatter.MAX_FIELD_VALUE_LENGTH + '\u200B'.length;
    let spaceForRegularFields = MessageFormatter.MAX_EMBED_LENGTH - nonRegularFieldSize;
    let amountOfResultingNormalFields = 100;
    let amountOfResultingOverflowFields = 100 * 99;
    let expectedAmount = (amountOfResultingNormalFields / (Math.floor(spaceForRegularFields / fieldSize))) +
        (amountOfResultingOverflowFields / (Math.floor(spaceForRegularFields / overflowFieldSize)));

    expect(messages.length).toBe(expectedAmount);
});


test('checks if giant valid embed produces valid discord embeds', () => {
    let giantValidEmbed = createGiantValidEmbed();
    expect(MessageFormatter.areValidEmbeds(MessageFormatter.createMessages(giantValidEmbed))).toBe(true);
});

