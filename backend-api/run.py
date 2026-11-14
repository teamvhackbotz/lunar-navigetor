"""Start the Lunar Navigator backend API server."""

import os
import sys
import uvicorn

# Ensure 'src' is in Python module search path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "src")))

if __name__ == "__main__":
    uvicorn.run("backend_api:app", host="0.0.0.0", port=8000, reload=True)
