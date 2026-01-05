"""Utility functions for muwanx."""


def name2id(name: str) -> str:
    """Convert a name to a URL-friendly identifier.

    This function normalizes names by converting them to lowercase
    and replacing spaces and hyphens with underscores, making them
    suitable for use in URLs, file paths, and identifiers.

    Args:
        name: The name to sanitize.

    Returns:
        A URL-friendly identifier string with lowercase letters,
        underscores instead of spaces and hyphens.

    Examples:
        >>> name2id("My Project")
        'my_project'
        >>> name2id("Test-Scene")
        'test_scene'
        >>> name2id("Complex Name-With Spaces")
        'complex_name_with_spaces'
    """
    return name.lower().replace(" ", "_").replace("-", "_")
