import * as prismic from '@prismicio/client';

const endpoint = prismic.getEndpoint('yogifm');

export const client = prismic.createClient(endpoint);
