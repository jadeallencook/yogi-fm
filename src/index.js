import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { PrismicProvider } from '@prismicio/react';
import { client } from './prismic';

ReactDOM.render(
  <React.StrictMode>
    <PrismicProvider client={client}>
      <App />
    </PrismicProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

serviceWorker.unregister();
