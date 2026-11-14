# lunar-navigetor

## Run the application in a browser

The application loads its components (including the timeline) with `fetch()`.
Serve the project over HTTP; opening `index.html` directly as a `file://` URL
does not allow the browser to load those component files.

1. Install Node.js if it is not already available.
2. From the project root, run:

   ```sh
   node scripts/serve.js
   ```

3. Keep the terminal open and visit <http://127.0.0.1:8000/> in the integrated
   or external browser on the same computer.
4. Stop the server with Ctrl+C when finished.

The server binds to the local computer only and uses no additional packages.
