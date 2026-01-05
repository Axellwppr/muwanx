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
        import socket
        import socketserver
        import webbrowser
        from functools import partial

        directory = str(self._app_dir)
        handler = partial(http.server.SimpleHTTPRequestHandler, directory=directory)

        def _find_available_port(
            bind_host: str, start_port: int, max_tries: int = 1000
        ) -> int:
            port_try = start_port
            tries = 0
            while tries < max_tries and port_try <= 65535:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    try:
                        s.bind((bind_host, port_try))
                        return port_try
                    except OSError:
                        port_try += 1
                        tries += 1
            raise RuntimeError(f"No available port found starting at {start_port}")

        chosen_port = _find_available_port(host, port)
        if chosen_port != port:
            print(f"Port {port} unavailable — using port {chosen_port} instead.")
        port = chosen_port

        print(f"Starting server at http://{host}:{port}")
        if open_browser:
            webbrowser.open(f"http://{host}:{port}")

        class _ReusableTCPServer(socketserver.TCPServer):
            allow_reuse_address = True

        try:
            with _ReusableTCPServer((host, port), handler) as httpd:
                httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


__all__ = ["MuwanxApp"]
