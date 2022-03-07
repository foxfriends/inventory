# Inventory

Simple inventory synchronizing app for Etsy, Shopify, and ConArtist, using a Google Sheet as the data source.

This app is only capable of serving a single user. Multi-user support could be added in future if
there is enough demand.

## Setup

This is a basic [NodeJS][] (14) app. Install that, then you can run it as follows:

[NodeJS]: https://nodejs.org

```sh
npm install
npm start
```

This app must be hosted on some public webserver. The URL of that server is referred to below as
`<base_url>` and should look something like `https://example.com`.

Create the following files:

*   `src/google/credentials.json`: Get this file from [Google Developer Console quickstart][Google Developer]. Configure the redirect URI to be `<base_url>/google/oauth`.
*   `src/etsy/credentials.json`: Create an app in the [Etsy Developers][] portal and create this file with the following information:

    ```json
    {
        "shop": "<shop_id_or_name>",
        "app_name": "<app_name>",
        "keystring": "<keystring>",
        "shared_secret": "<shared_secret>",
        "redirect_uri": "<base_url>/etsy/oauth"
    }
    ```
*   `src/shopify/credentials.json`: Become a [Shopify Partner][] and create a custom app. Configure the App URL to be `<base_url>/shopify/setup` and the redirection URL to be `<base_url>/shopify/oauth`, then create this file with the following information:

    ```json
    {
        "shop": "<shop_name>",
        "api_key": "<api_key>",
        "secret_key": "<secret_key>",
        "redirect_uri": "<base_url>/shopify/oauth",
        "orders_created_url": "<base_url>/shopify/hook/orders/create",
        "orders_cancelled_url": "<base_url>/shopify/hook/orders/cancelled"
    }
    ```
*   `src/conartist/credentials.json`: Sign up for ConArtist, and then fill in your credentials here.

    ```json
    {
        "username": "<email>",
        "password": "<password>",
        "orders_created_url": "<base_url>/conartist/hook/orders/create",
        "orders_cancelled_url": "<base_url>/conartist/hook/orders/cancelled"
    }
    ```

[Google Developer]: https://developers.google.com/sheets/api/quickstart/nodejs
[Etsy Developer]: https://www.etsy.com/developers/
[Shopify Partner]: https://partners.shopify.com/

## Usage

Visit the server at `<base_url>` and you will be presented with the dashboard. Authorize each
service by clicking the Authorize buttons, triggering their standard OAuth flows. Once all are
authorized, also provide the URLs of the inventory and orders spreadsheets from your Google
Drive in the boxes under the Google settings. This spreadsheets must be owned by the Google
account you authorized in the previous step.

Once all services are set up, you can use the buttons on the dashboard to control the app. The
functions are as follows:
1.  Pull: Download all inventory data from the service and store it in a new page in the spreadsheet.
    Use this to gather all your information in one place so you can compare and ensure everything is
    correct.
2.  Sync: Download all inventory data from the service and use it to overwrite the data in the front
    page of the spreadsheet. Ensure that the quantities from that service are correct (e.g. by using
    Pull) before using this, as it will overwrite any existing quantities. This feature is not
    likely to be used often, especially once inventory is being updated automatically.
3.  Push: Push inventory data from the spreadsheet to the service. Use this after making manual
    changes to the spreadsheet, such as when you have restocked some items.
4.  Watch orders: Start watching for new orders. When a new order comes in inventory will be
    decreased automatically and updated on all shops.
5.  Stop watching orders: Stop watching for new orders. Orders will no longer decrease inventory and
    update shops automatically, until started again.

## Data format

### Inventory

Ensure your products have the same SKUs across all your shops as it is by SKU that the inventory
will be synchronized. The spreadsheet provided above must have, in the first page, columns with
headers `SKU` and `Quantity`. The columns may be in any order, and other columns may exist, but
the headers must be on the first row. For example, the following sheet would be acceptable:

| Name   | SKU     | Quantity | Notes                               |
| :-     | :-      |       -: | :-                                  |
| Apple  | SKU-123 | 10       |                                     |
| Orange | SKU-234 | 15       |                                     |
| Banana | SKU-345 | 20       | Not going to make any more of these |

Ensure that all quantities are numbers. Any quantity that is not a number will be ignored. Any SKU that cannot be
found will also be silently ignored.

### Orders

The orders spreadsheet is not really intended to be interacted with. It is just kept as a way of
auditing the changes made to your inventory. Leave it blank, and don't worry too much about the 
contents unless something goes wrong.
