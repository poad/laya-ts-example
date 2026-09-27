import { A, useLocation } from '@solidjs/router';
import { Suspense, type Component, type JSX } from 'solid-js';

const App: Component<{ children?: JSX.Element }> = (props) => {
  const location = useLocation();

  return (
    <>
      <nav class="bg-gray-900 text-white px-4">
        <ul class="flex items-center">
          <li class="py-2 px-4 font-bold">
            <A href="/" class="no-underline hover:underline">
              Laya Playground
            </A>
          </li>
          <li class="py-2 px-4">
            <A href="/about" class="no-underline hover:underline">
              About
            </A>
          </li>

          <li class="text-sm flex items-center space-x-1 ml-auto">
            <span>URL:</span>
            <input
              class="w-75px p-1 bg-white text-sm rounded-lg"
              type="text"
              readOnly
              value={location.pathname}
            />
          </li>
        </ul>
      </nav>

      <main>
        <Suspense>{props.children}</Suspense>
      </main>
    </>
  );
};

export default App;
