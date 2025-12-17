# Muwanx Tests

This directory contains the test suite for the muwanx package.

## Test Structure

### `test_muwanx_builder.py`

Comprehensive pytest suite for the Builder API:

- **test_builder_creation**: Verifies Builder instance creation
- **test_add_project**: Tests adding projects to the builder
- **test_get_projects**: Tests retrieving project configurations
- **test_multiple_projects**: Tests adding and managing multiple projects
- **test_build_app**: Tests building a MuwanxApp from the builder
- **test_build_empty_app_warning**: Verifies warning when building without projects
- **test_project_metadata**: Tests setting metadata during project creation
- **test_project_set_metadata**: Tests the set_metadata method and chaining
- **test_project_with_id**: Tests creating a project with URL routing ID
- **test_project_without_id**: Tests creating a project without ID (main route)
- **test_multiple_projects_with_different_ids**: Tests multiple projects with various IDs
- **test_app_save_includes_project_id**: Verifies project IDs are saved in config

## Running Tests

### Run all tests
```bash
pytest tests/
```

### Run specific test file
```bash
pytest tests/test_muwanx_builder.py
```

### Run with verbose output
```bash
pytest tests/test_muwanx_builder.py -v
```

### Run specific test
```bash
pytest tests/test_muwanx_builder.py::test_builder_creation -v
```

## Test Coverage

The test suite covers:
- ✓ Builder instantiation
- ✓ Project management (add, retrieve)
- ✓ Project URL routing with IDs
- ✓ Metadata configuration
- ✓ Application building
- ✓ Config export with project IDs
- ✓ Warning/error handling
- ✓ Method chaining

## Future Test Areas

Additional tests to consider:
- Scene addition and configuration
- Policy addition to scenes
- App saving (web format with file output)
- Full integration tests with MuJoCo models and ONNX policies
- Error handling for invalid inputs
- Duplicate project ID detection
