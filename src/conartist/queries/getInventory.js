const graphql = require('./tag');

module.exports = graphql`
  query GetInventory {
    user {
      products {
        id
        name
        sku
        quantity
      }
    }
  }
`;
