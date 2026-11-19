import './index.css';
import App from './app';

import { createRouter } from '@solidjs/router';
import { render } from '@solidjs/web';
import { lazy, Loading } from 'solid-js';

const Router = createRouter({
  routes: [
    { path: '/', component: lazy(() => import('./pages/index')) },
    { path: '/about', component: lazy(() => import('./pages/about')) },
  ],
});

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

if (root) {
  render(
    () => (
      <Loading fallback={<p>Loading...</p>}>
        <Router>{(props) => <App>{props.children}</App>}</Router>
      </Loading>
    ),
    root,
  );
}
