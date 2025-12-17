"""MuwanxApp class for exporting and running applications.

This module defines the MuwanxApp class which represents a built application
that can be saved to disk or launched in a web browser.
"""

from __future__ import annotations

from pathlib import Path


class MuwanxApp:
    """A built muwanx application ready to be launched.

    This class encapsulates the built application and provides methods
    for launching it in a web browser.
    """

    def __init__(self, app_dir: Path) -> None:
        self._app_dir = app_dir

    def launch(
        self,
        *,
        host: str = "localhost",
        port: int = 8080,
        open_browser: bool = True,
    ) -> None:
        """Launch the application in a local web server.

        Args:
            host: Host to bind the server to.
            port: Port to run the server on.
            open_browser: Whether to automatically open a browser.
        """
        if not self._app_dir.exists():
            raise RuntimeError(f"Application directory {self._app_dir} does not exist.")

        import http.server
        import socketserver
        import webbrowser
        from functools import partial

        directory = str(self._app_dir)
        handler = partial(http.server.SimpleHTTPRequestHandler, directory=directory)

        print(f"Starting server at http://{host}:{port}")
        if open_browser:
            webbrowser.open(f"http://{host}:{port}")

        try:
            with socketserver.TCPServer((host, port), handler) as httpd:
                httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


__all__ = ["MuwanxApp"]
