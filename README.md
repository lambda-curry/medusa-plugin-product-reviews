## Compatibility

This is compatible with versions >= 1.11.0 of `@medusajs/medusa`.

## Features

- Create product reviews with images.
- Create product review requests.
- Import product reviews from csv through batch job.

## How to Install

1\. Run the following command in the directory of the Medusa backend:

```bash
npm install medusa-plugin-reviews
```

2\. In `medusa-config.js` add the following at the end of the `plugins` array:

```js
const plugins = [
  // ...,
  {
    resolve: `medusa-plugin-reviews`,
  },
];
```

## Additional Tasks

If you wish to send notification emails using this plugin then you will need to extend the product-review-request service to work with your mailing service.
