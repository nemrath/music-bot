const Joi = require('joi');

class MessageFormatter {

    static createMessage(properties, pageNr = 0) {

        let messages = MessageFormatter.createMessages(properties);
        return messages[pageNr];
    }

    static calculateEmbedSize(embed) {
        let totalSize = 0;

        totalSize += embed.author && embed.author.name ? embed.author.name.length : 0;
        totalSize += embed.author && embed.author.url ? embed.author.url.length : 0;
        totalSize += embed.author && embed.author.icon_url ? embed.author.icon_url.length : 0;
        totalSize += embed.author && embed.author.proxy_icon_url ? embed.author.proxy_icon_url.length : 0;
        // color: Joi.number().integer(),
        totalSize += embed.description ? embed.description.length : 0;
        totalSize += embed.fields ? MessageFormatter.getTotalFieldsLength(embed.fields) : 0;
        totalSize += embed.footer && embed.footer.text ? embed.footer.text.length : 0;
        totalSize += embed.footer && embed.footer.icon_url ? embed.footer.icon_url.length : 0;
        totalSize += embed.footer && embed.footer.proxy_icon_url ? embed.footer.proxy_icon_url.length : 0;
        totalSize += embed.image && embed.image.url ? embed.image.url.length : 0;
        totalSize += embed.image && embed.image.proxy_url ? embed.image.proxy_url.length : 0;
        // height: Joi.number().integer(),
        // width: Joi.number().integer(),
        totalSize += embed.thumbnail && embed.thumbnail.url ? embed.thumbnail.url.length : 0;
        totalSize += embed.thumbnail && embed.thumbnail.proxy_url ? embed.thumbnail.proxy_url.length : 0;
        // height: Joi.number().integer(),
        // width: Joi.number().integer(),
        totalSize += embed.timestamp ? embed.timestamp.length : 0;
        totalSize += embed.title ? embed.title.length : 0;
        totalSize += embed.url ? embed.url.length : 0;

        return totalSize;
    }

    static calculateLengthRecursively(val) {
        if (typeof val === 'object') {
            return Object.keys(val).map(key => MessageFormatter.calculateLengthRecursively(val[key])).reduce((a, b) => a + b, 0)
        } else if (Array.isArray(val)) {
            return val.map(v => MessageFormatter.calculateLengthRecursively(v)).reduce((a, b) => a + b, 0);
        } else if (typeof  val === 'string') {
            return val.length;
        }
    }

    static isValidEmbed(embed) {
        return MessageFormatter.validate(embed).error === null && MessageFormatter.calculateLengthRecursively(embed) < MessageFormatter.MAX_EMBED_LENGTH;
    }

    static validate(embed) {
        const schema = Joi.object().keys({
            author: Joi.object().keys({
                name: Joi.string().max(MessageFormatter.MAX_AUTHOR_NAME_LENGTH),
                url: Joi.string(),
                icon_url: Joi.string(),
                proxy_icon_url: Joi.string(),
            }),
            color: Joi.number().integer(),
            description: Joi.string().max(MessageFormatter.MAX_DESCRIPTION_LENGTH),
            fields: Joi.array().items(Joi.object().keys({
                name: Joi.string().max(MessageFormatter.MAX_FIELD_NAME_LENGTH),
                value: Joi.string().max(MessageFormatter.MAX_FIELD_VALUE_LENGTH),
                inline: Joi.boolean(),
            })).max(20),
            footer: Joi.object().keys({
                text: Joi.string().max(MessageFormatter.MAX_FOOTER_TEXT_LENGTH),
                icon_url: Joi.string(),
                proxy_icon_url: Joi.string(),
            }),
            image: Joi.object().keys({
                url: Joi.string(),
                proxy_url: Joi.string(),
                height: Joi.number().integer(),
                width: Joi.number().integer(),
            }),
            thumbnail: Joi.object().keys({
                url: Joi.string(),
                proxy_url: Joi.string(),
                height: Joi.number().integer(),
                width: Joi.number().integer(),
            }),
            timestamp: Joi.date().iso(),
            title: Joi.string().max(MessageFormatter.MAX_TITLE_LENGTH),
            url: Joi.string(),
        });

        return Joi.validate(embed, schema);
    }

    static formatFields(fields) {
        let resultingFields = [];

        for (let {name, value, ...rest} of fields) {
            name = name.slice(0, MessageFormatter.MAX_FIELD_NAME_LENGTH);

            if (Array.isArray(value)) {
                value = value.map(val => val.slice(0, MessageFormatter.MAX_FIELD_VALUE_LENGTH));

                let [head, ...tail] = value;
                let resultingField = {name, value: head};
                resultingFields.push(resultingField);

                for (let line of tail) {
                    if (resultingField.value.length + line.length > MessageFormatter.MAX_FIELD_VALUE_LENGTH) {
                        resultingField = {...rest, name: '\u200B', value: line};
                        resultingFields.push(resultingField);
                    } else {
                        resultingField.value = resultingField.value + "\n" + line;
                    }
                }

            } else if (typeof value === 'string') {
                let result = value.match(new RegExp('.{1,' + MessageFormatter.MAX_FIELD_VALUE_LENGTH + '}', 'g'));
                for (let resultingValue of result) {
                    resultingFields.push({...rest, name, value: resultingValue});
                    name = '\u200B';
                }
            } else if (typeof  value !== 'string' && !Array.isArray(value)) {
                throw Error("MessageFormatter: field value in embed is neither string nor array.");
            }

        }

        return resultingFields;
    }

    static getTotalFieldsLength(fields) {
        return fields.map(({name, value}) => name.length + value.length).reduce((a, b) => a + b, 0);
    }

    static createMessages(properties) {
        let {
            author,
            // color,
            description,
            fields,
            // file,
            // files,
            footer,
            // image,
            // thumbnail,
            // timestamp,
            title,
            // url,
            footerFields,
            headerFields,
            ...otherProperties
        } = properties;
        let preprocessedEmbed = {...otherProperties};

        let totalLengthWithoutRegularFields = 0;

        if (title) {
            title = title.slice(0, MessageFormatter.MAX_TITLE_LENGTH);
            preprocessedEmbed.title = title;
            totalLengthWithoutRegularFields += title.length;
        }

        if (author && author.name) {
            let name = name.slice(0, MessageFormatter.MAX_AUTHOR_NAME_LENGTH);
            preprocessedEmbed.author = {...author, name};
            totalLengthWithoutRegularFields += name.length;
        }

        if (description) {
            description = description.slice(0, MessageFormatter.MAX_DESCRIPTION_LENGTH);
            preprocessedEmbed.description = description;
            totalLengthWithoutRegularFields += description.length;
        }

        if (footer && footer.text) {
            let footerText = footer.text.slice(0, MessageFormatter.MAX_FOOTER_TEXT_LENGTH);
            preprocessedEmbed.footer = {...footer, text: footerText};
            totalLengthWithoutRegularFields += footerText.length;
        }


        let messages = [];
        fields = fields ? MessageFormatter.formatFields(fields) : [];

        footerFields = footerFields ? MessageFormatter.formatFields(footerFields) : [];
        headerFields = headerFields ? MessageFormatter.formatFields(headerFields) : [];
        totalLengthWithoutRegularFields += MessageFormatter.getTotalFieldsLength([...footerFields, ...headerFields]);

        if (totalLengthWithoutRegularFields > MessageFormatter.MAX_EMBED_LENGTH - (MessageFormatter.MAX_FIELD_NAME_LENGTH + MessageFormatter.MAX_FIELD_VALUE_LENGTH)) {
            throw Error(MessageFormatter.TOO_LARGE_NON_REGULAR_FIELDS_TOTAL_SIZE);
        }


        let nonRegularFieldsAmount = footerFields.length + headerFields.length;

        if (nonRegularFieldsAmount.length > MessageFormatter.MAX_FIELDS) {
            throw Error("MessageFormatter: the amount of header and footer fields is more than the max amount of fields");
        }

        if (fields.length > 0 && (footerFields.length + headerFields.length > MessageFormatter.MAX_FIELDS - 1)) {
            throw Error("MessageFormatter: the amount of header and footer fields is too much to allow displaying regular fields");
        }

        const RESULTING_MAX_FIELDS = MessageFormatter.MAX_FIELDS - nonRegularFieldsAmount;
        let fieldsLength = 0;
        let message = {...preprocessedEmbed, fields: [...headerFields]};

        for (let {name, value, ...rest} of fields) {
            if (
                totalLengthWithoutRegularFields + fieldsLength + name.length + value.length <= MessageFormatter.MAX_EMBED_LENGTH
                && message.fields.length < RESULTING_MAX_FIELDS
            ) {
                fieldsLength += name.length + value.length;
                message.fields.push({...rest, name, value});
            } else {
                message.fields.push(...footerFields);
                messages.push(message);
                message = {...preprocessedEmbed, fields: [...headerFields, {...rest, name, value}]};
                fieldsLength = name.length + value.length;
            }
        }

        message.fields.push(...footerFields);
        messages.push(message);
        return messages;
    }

    static areValidEmbeds(messages) {
        return messages.every(MessageFormatter.isValidEmbed);
    }
}

MessageFormatter.MAX_TITLE_LENGTH = 256;
MessageFormatter.MAX_DESCRIPTION_LENGTH = 2048;
MessageFormatter.MAX_FOOTER_TEXT_LENGTH = 2048;
MessageFormatter.MAX_AUTHOR_NAME_LENGTH = 256;
MessageFormatter.MAX_EMBED_LENGTH = 2000;
MessageFormatter.MAX_FIELD_NAME_LENGTH = 256;
MessageFormatter.MAX_FIELD_VALUE_LENGTH = 1024;
MessageFormatter.MAX_FIELDS = 25;
MessageFormatter.TOO_LARGE_NON_REGULAR_FIELDS_TOTAL_SIZE = "MessageFormatter: the total length of embed elements that are " +
    "not regular fields added to a maxed size regular field exceeds the max embed length.";
module.exports = MessageFormatter;
