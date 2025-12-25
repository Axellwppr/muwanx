"""Test suite for the muwanx Builder class."""

import pytest

import muwanx as mwx


def test_builder_creation():
    """Test that a Builder instance can be created."""
    builder = mwx.Builder()
    assert builder is not None
    assert isinstance(builder, mwx.Builder)


def test_add_project():
    """Test adding a project to the builder."""
    builder = mwx.Builder()
    project = builder.add_project(name="Test Project")

    assert project is not None
    assert isinstance(project, mwx.ProjectHandle)
    assert project.name == "Test Project"


def test_get_projects():
    """Test retrieving projects from the builder."""
    builder = mwx.Builder()

    # Initially should be empty
    assert len(builder.get_projects()) == 0

    # Add a project
    builder.add_project(name="Test Project")
    projects = builder.get_projects()

    assert len(projects) == 1
    assert projects[0].name == "Test Project"


def test_multiple_projects():
    """Test adding multiple projects."""
    builder = mwx.Builder()

    builder.add_project(name="Project 1")
    builder.add_project(name="Project 2")

    projects = builder.get_projects()
    assert len(projects) == 2
    assert projects[0].name == "Project 1"
    assert projects[1].name == "Project 2"


def test_build_app():
    """Test building an application."""
    import tempfile

    builder = mwx.Builder()
    builder.add_project(name="Test Project")

    with tempfile.TemporaryDirectory() as tmpdir:
        app = builder.build(tmpdir)
        assert app is not None
        assert isinstance(app, mwx.MuwanxApp)


def test_build_empty_app_warning():
    """Test that building an empty app raises a ValueError."""
    import tempfile

    builder = mwx.Builder()

    with tempfile.TemporaryDirectory() as tmpdir:
        with pytest.raises(
            ValueError,
            match="Cannot build an empty application",
        ):
            builder.build(tmpdir)


def test_project_metadata():
    """Test setting project metadata."""
    builder = mwx.Builder()
    builder.add_project(name="Test Project", metadata={"key": "value"})

    # Get the config to check metadata
    projects = builder.get_projects()
    assert projects[0].metadata["key"] == "value"


def test_project_set_metadata():
    """Test setting metadata via set_metadata method."""
    builder = mwx.Builder()
    project = builder.add_project(name="Test Project")

    # Chain metadata setting
    result = project.set_metadata("key1", "value1")
    assert result is project  # Check method chaining

    project.set_metadata("key2", "value2")

    projects = builder.get_projects()
    assert projects[0].metadata["key1"] == "value1"
    assert projects[0].metadata["key2"] == "value2"


def test_project_with_id():
    """Test creating a project with an ID for URL routing."""
    builder = mwx.Builder()
    project = builder.add_project(name="MuJoCo Menagerie", id="menagerie")

    assert project.name == "MuJoCo Menagerie"
    assert project.id == "menagerie"

    projects = builder.get_projects()
    assert projects[0].id == "menagerie"


def test_project_without_id():
    """Test creating a project without an ID (main route)."""
    builder = mwx.Builder()
    project = builder.add_project(name="Main Demo")

    assert project.name == "Main Demo"
    assert project.id is None

    projects = builder.get_projects()
    assert projects[0].id is None


def test_multiple_projects_with_different_ids():
    """Test creating multiple projects with different IDs."""
    builder = mwx.Builder()

    builder.add_project(name="Main Demo")
    builder.add_project(name="MuJoCo Menagerie", id="menagerie")
    builder.add_project(name="MuJoCo Playground", id="playground")
    builder.add_project(name="MyoSuite", id="myosuite")

    projects = builder.get_projects()
    assert len(projects) == 4
    assert projects[0].id is None
    assert projects[1].id == "menagerie"
    assert projects[2].id == "playground"
    assert projects[3].id == "myosuite"


def test_app_save_includes_project_id():
    """Test that saved config includes project IDs."""
    import json
    import tempfile
    from pathlib import Path

    builder = mwx.Builder()
    builder.add_project(name="Main Demo")
    builder.add_project(name="MuJoCo Menagerie", id="menagerie")

    with tempfile.TemporaryDirectory() as tmpdir:
        builder.build(tmpdir)
        config_file = Path(tmpdir) / "assets" / "config.json"

        with open(config_file) as f:
            config = json.load(f)

        assert len(config["projects"]) == 2
        assert config["projects"][0]["id"] is None
        assert config["projects"][1]["id"] == "menagerie"


if __name__ == "__main__":
    # Allow running with python directly for quick testing
    pytest.main([__file__, "-v"])
