# Inventory

Simple inventory synchronizing app for Etsy and Shopify, using a Google Sheet as the data source.

This app is only capable of serving a single user. Multi-user support could be added in future if
there is enough demand.

## Setup

This is a basic [NodeJS][] (14) app. Install that, then you can run it as follows:

[NodeJS]: https://nodejs.org

```sh
npm install
npm start
```

This app must be hosted on some public webserver. The URL of that server is referred to below as `<base_url>` and should look something like `https://example.com`.

Create the following files:

*   `src/google/credentials.json`: Get this file from [Google Developer Console quickstart][Google Developer]. Configure the redirect URI to be `<base_url>/google/oauth`.
*   `src/etsy/credentials.json`: Create an app in the [Etsy Developers][] portal and create this file with the following information:

    ```json
    {
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
        "redirect_uri": "<base_url>/shopify/oauth"
    }
    ```

[Google Developer]: https://developers.google.com/sheets/api/quickstart/nodejs
[Etsy Developer]: https://www.etsy.com/developers/
[Shopify Partner]: https://partners.shopify.com/

## Usage

Once the server is running, the single supported user can provide access to the required resources on each service by visiting the following URLs:
*   `<base_url>/google/setup`: This will trigger the Google authorization. Google may warn you that the developer is untrusted, but just go past that anyway. You are the developer.
*   `<base_url>/etsy/setup`: This will trigger the Etsy authorization.
*   In the Shopify Partners Dashboard, generate the Merchant Install Link and open it. This will trigger the Shopify authorization.

In all 3 cases, once complete you should be presented with the text `<app> setup complete`, indicating that the setup was successful.
