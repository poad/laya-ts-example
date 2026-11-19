import { useLocation } from '@solidjs/router';
import { Loading, type Component, type Element } from 'solid-js';

const App: Component<{ children?: Element }> = (props) => {
  const location = useLocation();

  return (
    <>
      <nav class="bg-gray-900 text-white px-4">
        <ul class="flex items-center">
          <li class="py-2 px-4 font-bold">
            <a href="/" class="no-underline hover:underline">
              Laya Playground
            </a>
          </li>
          <li class="py-2 px-4">
            <a href="/about" class="no-underline hover:underline">
              About
            </a>
          </li>

          <li class="text-sm flex items-center space-x-1 ml-auto">
            <span>URL:</span>
            <input
              class="w-75px p-1 bg-white text-sm rounded-lg"
              type="text"
              readonly
              value={location.pathname}
            />
          </li>
        </ul>
      </nav>

      <main>
        <Loading fallback={<p>Loading...</p>}>{props.children}</Loading>
      </main>
    </>
  );
};

export default App;
