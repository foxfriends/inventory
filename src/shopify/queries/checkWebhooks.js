const graphql = require('./tag');

module.exports = graphql`
  query CheckWebhooks {
    webhookSubscriptions(first: 2, topics: [ORDERS_CREATE, ORDERS_CANCELLED]) {
      edges { node { id } }
    }
  }
`;
