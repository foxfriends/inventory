const graphql = require('./tag');

module.exports = graphql`
  query GetInventory($after: String) {
    locations(first: 1) {
      pageInfo { hasNextPage }
      edges {
        cursor
        node {
          id
          inventoryLevels(first: 50, after: $after) {
            pageInfo { hasNextPage }
            edges {
              cursor
              node {
                id
                available
                item {
                  sku
                  variant { displayName }
                }
              }
            }
          }
        }
      }
    }
  }
`;
