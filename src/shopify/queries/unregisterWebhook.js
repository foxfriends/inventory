const graphql = require('./tag');

module.exports = graphql`
  mutation UnregisterWebhook($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      userErrors { message }
    }
  }
`;
