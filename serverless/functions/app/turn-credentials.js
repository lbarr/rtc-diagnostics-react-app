exports.handler = function (context, event, callback) {
  const client = context.getTwilioClient();
  client.tokens.create({ ttl: 120 }).then((token) => callback(null, token));
};
