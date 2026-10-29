import { createApp, lakebase, server } from '@databricks/appkit';
import { bootstrap } from './app/bootstrap';

createApp({
  plugins: [
    lakebase(),
    server(),
  ],
  async onPluginsReady(appkit) {
    await bootstrap(appkit);
  },
}).catch(console.error);
