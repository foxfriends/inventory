const graphql = require('./tag');

module.exports = graphql`
  query CheckWebhooks {
    user {
      webhooks {
        newRecord { id url }
        deleteRecord { id url }
      }
    }
  }
`;
